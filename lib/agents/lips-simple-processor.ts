/**
 * Processador inteligente para agente Lips
 * MVP: Autoenvio controlado com regras de segurança
 *
 * Fluxo:
 * 1. Mensagem → webhook salva
 * 2. Agente processa:
 *    - Classifica intenção (saudação, consulta, compra, serviço)
 *    - Consulta catálogo se peça solicitada
 *    - Gera sugestão com confidence score
 * 3. Decide se autoenviar ou requerer handoff humano
 * 4. Se autoSendAllowed: envia direto
 * 5. Se requiresHandoff: marca para humano na Central
 *
 * Regras:
 * - Autoenviar: saudações, consultas, orçamentos iniciais
 * - Nunca autoenviar: venda fechada, pagamento, reserva
 * - Handoff obrigatório: cliente com intenção de compra/serviço
 * - Cooldown: máximo 1 resposta automática por conversa em 5min
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { resolveSessionClient } from '@/lib/providers/resolve-session';
import { getAutoReplyConfig, LIPS_AUTO_REPLY_CONFIG } from '@/lib/agents/auto-reply-config';

// ============================================================================
// Types
// ============================================================================

export type ProcessMessageResult = {
  response: string;
  shouldSend: boolean;
  autoSendAllowed: boolean; // ← pode enviar automático (sem handoff)
  requiresHandoff: boolean;
  department?: 'Balcão' | 'Oficina' | 'Supervisor'; // ← onde encaminhar se handoff
  handoffReason?: string; // ← motivo do handoff (purchase_intent, service_request, etc)
  slaMinutes?: number;
  confidence: number; // ← 0.0 a 1.0
  intent: string; // ← saudacao | consulta_preco | consulta_estoque | quote | compra | servico | nao_encontrado
  quoteOnly?: boolean; // ← true para consulta simples (não é compra)
  idleCloseAfterMinutes?: number; // ← 10 para consultas simples (idle timeout)
  nextStatusSuggestion?: string; // ← "awaiting_customer" ou "auto_quote_idle"
};

// ============================================================================
// Fluxo oficial Lips — Gabi
// ============================================================================

const GABI_MENU = `Olá! Sou a Gabi, atendente virtual da Lips. Como posso te ajudar?

1. Cotação de peças
2. Oficina / serviços
3. Compras / pagamento / reserva
4. Outros assuntos`;

const BALCAO_HANDOFF_RESPONSE =
  'Perfeito. Vou direcionar seu atendimento para o balcão confirmar aplicação, disponibilidade e forma de pagamento certinha antes de finalizar.';

const OFICINA_HANDOFF_RESPONSE =
  'Entendi. Vou direcionar seu atendimento para a oficina verificar o melhor horário e confirmar os detalhes do serviço.';

const SUPERVISOR_PURCHASE_RESPONSE =
  'Perfeito. Vou direcionar para o responsável confirmar disponibilidade, aplicação e forma de pagamento antes de finalizar.';

const SUPERVISOR_GENERAL_RESPONSE =
  'Entendi. Vou direcionar sua mensagem para o responsável da Lips te atender certinho.';

const SLA_MINUTES = {
  Balcão: LIPS_AUTO_REPLY_CONFIG.quoteSlaMinutes,
  Oficina: LIPS_AUTO_REPLY_CONFIG.serviceSlaMinutes,
  Supervisor: 0,
} as const;

// ============================================================================
// Banco de peças (com sinônimos e variações)
// ============================================================================

const PIECE_KEYWORDS: Record<string, string[]> = {
  pastilha: ['pastilha', 'pastilhas', 'past', 'past freio', 'pastilha freio', 'pastilha de freio', 'plaqueta', 'plaquetas', 'kit pastilha', 'freio'],
  disco_freio: ['disco freio', 'disco de freio', 'discos de freio', 'disco'],
  oleo: ['oleo', 'óleo', 'lubrificante'],
  filtro_oleo: ['filtro oleo', 'filtro de oleo', 'filtro óleo', 'filtro de óleo', 'filtro lubrificante'],
  filtro: ['filtro', 'filtros', 'filtro ar', 'filtro de ar', 'filtro combustivel', 'filtro combustível'],
  bateria: ['bateria', 'baterias', 'bat'],
  pneu: ['pneu', 'pneus'],
  amortecedor: ['amortecedor', 'amortecedores', 'amort', 'amort diant', 'amort dianteiro', 'amort tras', 'amort traseiro'],
  vela: ['vela', 'velas'],
  alternador: ['alternador'],
  radiador: ['radiador'],
  termostato: ['termostato'],
  bomba: ['bomba', 'bomba agua', 'bomba d agua', 'bomba de agua'],
  bucha: ['bucha', 'buchas'],
  corrente: ['corrente'],
  correia: ['correia', 'correia dentada', 'correia alternador'],
  sensor: ['sensor', 'sensores'],
};

const VEHICLE_MODELS = [
  'gol', 'corolla', 'civic', 'uno', 'prisma', 'onix', 'hb20', 'i30', 'cerato',
  'tucson', 'sportage', 'creta', 'kwid', 'sandero', 'fox', 'palio', 'fiesta',
  'ka', 'sentra', 'hilux', 'ranger', 's10', 'saveiro', 'strada', 'voyage',
];

// ============================================================================
// Funções de detecção
// ============================================================================

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenVariants(value: string): string[] {
  const normalized = normalizeText(value);
  const tokens = normalized.split(' ').filter(Boolean);
  const singular = tokens.map(token => token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token);
  return Array.from(new Set([normalized, singular.join(' ')]));
}

function detectGreeting(text: string): boolean {
  const lower = normalizeText(text);
  return /^(bom dia|boa tarde|boa noite|olá|ola|oi|e aí|e ai|tudo bem)\b/.test(lower.trim());
}

/**
 * Detecta intenção de compra/fechamento (handoff obrigatório)
 */
function detectPurchaseIntent(text: string): boolean {
  const lower = normalizeText(text);
  const purchasePatterns = [
    /quero comprar|vou querer|separa|reserva|pode separar|vou buscar|fecha|fechar|fecha pra mim/,
    /pagamento|pix|cartão|cartao|boleto|manda link|entrega|retirar|vou pagar/,
  ];
  return purchasePatterns.some(pattern => pattern.test(lower));
}

function detectProductHandoffIntent(text: string): boolean {
  const lower = normalizeText(text);
  return /^(quero|quero sim|eu quero|pode ser)$/.test(lower) ||
    /quero esse produto|quero essa peça|quero essa peca|tenho interesse nesse produto/.test(lower);
}

/**
 * Detecta intenção de serviço (handoff para Oficina)
 */
function detectServiceIntent(text: string): boolean {
  const lower = normalizeText(text);
  const servicePatterns = [
    /oficina|troca de óleo|troca de oleo|revisão|revisao|alinhamento|balanceamento|diagnóstico|diagnostico/,
    /instalação|instalacao|instalar|manutenção|manutencao|agendar|marcar horário|marcar horario|serviço|servico/,
  ];
  return servicePatterns.some(pattern => pattern.test(lower));
}

function detectGeneralSupervisorIntent(text: string): boolean {
  const lower = normalizeText(text);
  return /responsavel|reclamacao|parceria|fornecedor|administrativo|gerente|dono|falar com/.test(lower);
}

/**
 * Detecta peças solicitadas (suporta múltiplas)
 * Retorna lista de nomes de peças encontradas
 */
function detectPiecesRequested(text: string): string[] {
  const lower = normalizeText(text);
  const foundPieces = new Set<string>();

  // Padrão de pergunta sobre peça
  const isPieceQuery =
    /qual.*valor|quanto custa|preco|valor|tem|estoque|disponivel|peca|produto|modelo|orcamento|quanto (fica|da|sai)|preciso de/i.test(lower);

  if (!isPieceQuery) {
    return [];
  }

  // Procurar todas as peças mencionadas
  Object.entries(PIECE_KEYWORDS).forEach(([pieceType, keywords]) => {
    keywords.forEach(kw => {
      if (tokenVariants(kw).some(variant => lower.includes(variant))) {
        foundPieces.add(pieceType);
      }
    });
  });

  return Array.from(foundPieces);
}

function requestedBrakePosition(text: string): 'dianteiro' | 'traseiro' | null {
  const lower = normalizeText(text);
  if (/diant|dianteir|frente/.test(lower)) return 'dianteiro';
  if (/tras|traseir|traz|trazeir/.test(lower)) return 'traseiro';
  return null;
}

function itemBrakePosition(item: any): 'dianteiro' | 'traseiro' | null {
  const name = normalizeText(item.name || '');
  if (/diant|dianteir/.test(name)) return 'dianteiro';
  if (/tras|traseir/.test(name)) return 'traseiro';
  return null;
}

function needsVehicleYear(partNames: string[], vehicleInfo: { model?: string; year?: number }): boolean {
  return Boolean(vehicleInfo.model && !vehicleInfo.year && partNames.length > 0);
}

function needsBrakePosition(partNames: string[], items: any[], messageBody: string): boolean {
  if (!partNames.some(part => ['pastilha', 'disco_freio'].includes(part))) return false;
  if (requestedBrakePosition(messageBody)) return false;

  const positions = new Set(items.map(itemBrakePosition).filter(Boolean));
  return positions.size > 1;
}

function normalizeYearReply(text: string): string | null {
  const normalized = normalizeText(text);
  const match = normalized.match(/^\d{2}$|^\d{4}$/);
  if (!match) return null;

  if (normalized.length === 4) return normalized;

  const value = Number(normalized);
  const currentYear = new Date().getFullYear() % 100;
  return String(value <= currentYear + 1 ? 2000 + value : 1900 + value);
}

function isBrakePositionOnly(text: string): boolean {
  const normalized = normalizeText(text);
  return /^(dianteira|dianteiro|diant|frente|traseira|traseiro|tras|traz|trazeira|trazeiro)$/.test(normalized);
}

async function expandContextualQuoteReply(
  db: SupabaseClient,
  conversationId: string,
  messageBody: string
): Promise<string> {
  const year = normalizeYearReply(messageBody);
  const positionOnly = isBrakePositionOnly(messageBody);

  if (!year && !positionOnly) return messageBody;

  const { data } = await db
    .from('whatsapp_messages')
    .select('body')
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .not('body', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8);

  const previousQuote = (data || [])
    .map(row => (row.body || '').trim())
    .find(body => body && body !== messageBody && detectPiecesRequested(body).length > 0);

  if (!previousQuote) return messageBody;
  if (year) return `${previousQuote} ${year}`;
  return `${previousQuote} ${messageBody}`;
}

/**
 * Extrai veículo da mensagem (marca + modelo + ano)
 */
function extractVehicleInfo(text: string): {
  brand?: string;
  model?: string;
  year?: number;
} {
  const lower = normalizeText(text);
  const result: any = {};

  VEHICLE_MODELS.forEach(model => {
    if (lower.includes(model)) {
      result.model = model;
    }
  });

  // Ano (ex: 2010, 2015)
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0]);
  }

  return result;
}

// ============================================================================
// Buscar peças no catálogo (suporta múltiplas)
// ============================================================================

async function findPartInCatalog(
  db: SupabaseClient,
  organizationId: string,
  partName: string,
  vehicleInfo?: { model?: string; year?: number }
): Promise<any[]> {
  try {
    const synonyms = PIECE_KEYWORDS[partName] ?? [partName];
    const searchTerms = Array.from(new Set([partName, ...synonyms].flatMap(tokenVariants))).slice(0, 8);
    const results: any[] = [];

    for (const term of searchTerms) {
      const { data } = await db
        .from('catalog_items')
        .select('id, name, sku, price, stock_quantity, brand')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .ilike('name', `%${term}%`)
        .limit(8);

      if (data) results.push(...data);
    }

    const byId = new Map<string, any>();
    results.forEach(item => {
      if (item?.id) byId.set(item.id, item);
    });

    return Array.from(byId.values())
      .map(item => ({ ...item, matchScore: scoreCatalogItem(item, partName, vehicleInfo) }))
      .filter(item => item.price && item.price > 0 && item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao buscar peça:', error);
    return [];
  }
}

function scoreCatalogItem(item: any, partName: string, vehicleInfo?: { model?: string; year?: number }): number {
  const name = normalizeText(item.name || '');
  const sku = normalizeText(item.sku || '');
  const brand = normalizeText(item.brand || '');
  const haystack = `${name} ${sku} ${brand}`;
  const synonyms = PIECE_KEYWORDS[partName] ?? [partName];
  let score = 0;

  if (name === normalizeText(partName)) score += 80;
  if (haystack.includes(normalizeText(partName))) score += 40;

  for (const synonym of synonyms) {
    const normalizedSynonym = normalizeText(synonym);
    if (!normalizedSynonym) continue;
    if (haystack.includes(normalizedSynonym)) score += normalizedSynonym.includes(' ') ? 28 : 18;
  }

  if (vehicleInfo?.model && haystack.includes(normalizeText(vehicleInfo.model))) score += 25;
  if (vehicleInfo?.year && haystack.includes(String(vehicleInfo.year))) score += 12;
  if (item.price && item.price > 0) score += 20;
  if (typeof item.stock_quantity === 'number' && item.stock_quantity > 0) score += 8;
  if (typeof item.stock_quantity === 'number' && item.stock_quantity < 0) score -= 6;

  return score;
}

/**
 * Buscar múltiplas peças no catálogo
 */
async function findMultipleParts(
  db: SupabaseClient,
  organizationId: string,
  partNames: string[],
  vehicleInfo?: { model?: string; year?: number }
): Promise<{ found: any[]; notFound: string[] }> {
  const found: any[] = [];
  const notFound: string[] = [];

  for (const partName of partNames) {
    const items = await findPartInCatalog(db, organizationId, partName, vehicleInfo);
    if (items.length > 0) {
      found.push(...items);
    } else {
      notFound.push(partName);
    }
  }

  const byId = new Map<string, any>();
  found.forEach(item => {
    if (item?.id) byId.set(item.id, item);
  });

  return {
    found: filterRankedCatalogResults(
      Array.from(byId.values()).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)),
      vehicleInfo,
    ).slice(0, 3),
    notFound,
  };
}

function filterRankedCatalogResults(items: any[], vehicleInfo?: { model?: string; year?: number }): any[] {
  if (!vehicleInfo?.model) return items;

  const model = normalizeText(vehicleInfo.model);
  const modelMatches = items.filter(item => normalizeText(item.name || '').includes(model));

  return modelMatches.length > 0 ? modelMatches : items;
}

// ============================================================================
// Cooldown para autoenvio
// ============================================================================

export type CooldownCheckResult = {
  allowed: boolean;
  reason?: string;
  lastAutoReplyAt?: Date;
};

function isCatalogQuoteResponse(responseText: string): boolean {
  return (
    responseText.includes('Encontrei no catálogo da Lips:') ||
    responseText.includes('Encontrei algumas opções no catálogo da Lips:')
  );
}

/**
 * Verifica se é permitido enviar resposta automática
 * Regras:
 * 1. Máximo 1 resposta automática por conversa em 5 minutos
 * 2. Não repetir mesma resposta automática em sequência
 * 3. Não autoenviar se última mensagem foi outbound do sistema
 */
export async function checkCooldown(
  db: SupabaseClient,
  conversationId: string,
  responseText: string
): Promise<CooldownCheckResult> {
  try {
    // Configuração do cooldown (padrão 5 minutos)
    const cooldownMinutes = parseInt(process.env.AUTO_REPLY_COOLDOWN_MINUTES || String(LIPS_AUTO_REPLY_CONFIG.cooldownMinutes), 10);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = new Date();

    // 1. Verificar último autoenvio desta conversa
    const { data: lastReply } = await db
      .from('agent_automation_cooldown')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (lastReply) {
      const lastReplyTime = new Date(lastReply.last_automated_response_at);
      const timeSinceLastReply = now.getTime() - lastReplyTime.getTime();

      // Regra 1: nunca repetir a mesma resposta automática em sequência.
      if (lastReply.last_response_text === responseText) {
        return {
          allowed: false,
          reason: 'duplicate_response',
          lastAutoReplyAt: lastReplyTime,
        };
      }

      // Autopeças: mecânicos podem cotar várias peças em sequência.
      // Permitir nova cotação diferente mesmo dentro da janela de cooldown.
      if (timeSinceLastReply < cooldownMs && isCatalogQuoteResponse(responseText)) {
        return { allowed: true, lastAutoReplyAt: lastReplyTime };
      }

      // Regra 2: cooldown para menu, não encontrado e direcionamentos.
      if (timeSinceLastReply < cooldownMs) {
        return {
          allowed: false,
          reason: `cooldown_active (${Math.ceil((cooldownMs - timeSinceLastReply) / 1000)}s restantes)`,
          lastAutoReplyAt: lastReplyTime,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao verificar cooldown:', error);
    // Em caso de erro, permitir (fail-open, mas log o erro)
    return { allowed: true };
  }
}

/**
 * Registra um autoenvio no cooldown
 */
export async function recordAutoReply(
  db: SupabaseClient,
  organizationId: string,
  conversationId: string,
  responseText: string
): Promise<void> {
  try {
    // Upsert: se existe, atualiza; caso contrário, cria
    const { error } = await db
      .from('agent_automation_cooldown')
      .upsert(
        {
          organization_id: organizationId,
          conversation_id: conversationId,
          last_automated_response_at: new Date().toISOString(),
          last_response_text: responseText,
          response_hash: Buffer.from(responseText).toString('base64').substring(0, 32),
        },
        { onConflict: 'conversation_id' }
      );

    if (error) {
      console.error('[lips-simple-processor] Erro ao registrar autoenvio:', error);
    }
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao registrar autoenvio:', error);
  }
}

async function findDepartmentId(
  db: SupabaseClient,
  organizationId: string,
  department: 'Balcão' | 'Oficina' | 'Supervisor'
): Promise<string | null> {
  if (department === 'Supervisor') return null;

  const { data } = await db
    .from('departments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('name', department)
    .eq('is_active', true)
    .maybeSingle();

  return data?.id ?? null;
}

export async function applyLipsConversationState(
  db: SupabaseClient,
  organizationId: string,
  conversationId: string,
  result: ProcessMessageResult
): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();

  if (result.requiresHandoff && result.department) {
    const departmentId = await findDepartmentId(db, organizationId, result.department);
    const slaMinutes = result.slaMinutes ?? SLA_MINUTES[result.department];
    const slaDueAt = slaMinutes > 0 ? new Date(now.getTime() + slaMinutes * 60_000).toISOString() : nowIso;
    const supervisor = result.department === 'Supervisor';

    await db
      .from('whatsapp_conversations')
      .update({
        status: 'pending',
        department_id: departmentId,
        requires_human: true,
        pending_reason: result.handoffReason || result.intent,
        sla_due_at: slaDueAt,
        sla_status: supervisor ? 'breached' : 'pending',
        updated_at: nowIso,
      })
      .eq('id', conversationId);
    return;
  }

  await db
    .from('whatsapp_conversations')
    .update({
      status: 'open',
      requires_human: false,
      pending_reason: null,
      sla_due_at: null,
      sla_status: 'ok',
      updated_at: nowIso,
    })
    .eq('id', conversationId);
}

// ============================================================================
// Gerar respostas
// ============================================================================

function formatPieceFoundResponse(item: any): string {
  const stock = formatStock(item.stock_quantity);
  const price = formatPrice(item.price);

  return `Encontrei a peça! 🎉

📦 **${item.name}**
${item.sku ? `🔢 Código: ${item.sku}` : ''}
${item.brand ? `🏭 Marca: ${item.brand}` : ''}
💰 **Valor: R$ ${price}**
📍 **${stock}**

Quer reservar ou falar com alguém? 😊`;
}

/**
 * Formata resposta consultiva de preço único (quoteOnly)
 * Segue padrão: nome, preço, estoque na sincronização
 */
function formatSinglePieceQuote(item: any): string {
  const price = formatPrice(item.price);
  const stock = item.stock_quantity >= 0 ? item.stock_quantity : 0;

  return `Encontrei no catálogo da Lips:

📦 Produto: ${item.name}
💰 Valor: R$ ${price}
📊 Estoque na última sincronização: ${Math.max(stock, 0)} unidade(s)

⚠️ Esses dados são da última atualização do sistema. O balcão confirma aplicação e disponibilidade certinha antes de finalizar.

Lhe ajudo em algo mais?`;
}

function formatCatalogOptions(items: any[]): string {
  const options = items
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.name} — R$ ${formatPrice(item.price)}`)
    .join('\n');

  return `Encontrei algumas opções no catálogo da Lips:

${options}

Para confirmar a aplicação certinha, me envie o modelo completo, ano ou uma foto/código da peça.

Lhe ajudo em algo mais?`;
}

/**
 * Formata pré-orçamento com múltiplas peças
 */
function formatQuoteResponse(items: any[], vehicleInfo: any): string {
  const vehicleLabel = vehicleInfo.model
    ? `${vehicleInfo.model.charAt(0).toUpperCase() + vehicleInfo.model.slice(1)} ${vehicleInfo.year || ''}`
    : '';

  const itemsList = items
    .map(item => {
      const price = formatPrice(item.price);
      return `📦 ${item.name}: R$ ${price}`;
    })
    .join('\n');

  const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalFormatted = formatPrice(total);

  return `Encontrei essas peças para você! 🎉
${vehicleLabel ? `**${vehicleLabel}**\n` : ''}
${itemsList}

💰 **Total: R$ ${totalFormatted}**

⚠️ *Pré-orçamento indicativo*

Vou direcionar seu atendimento para a equipe confirmar:
✅ Disponibilidade exata
✅ Aplicação correta
✅ Condições de entrega

Aguarde, vamos confirmar tudo com você! 😊`;
}

function formatStock(qty: number): string {
  if (qty === 0) return '❌ Sem estoque agora (podemos reservar)';
  if (qty < 0) return '⏳ Em pedido (retorna em breve)';
  if (qty === 1) return '⚠️ Última unidade';
  if (qty < 5) return `✅ ${Math.floor(qty)} unidades`;
  return `✅ Disponível (${Math.floor(qty)}+ un)`;
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

function getNeedMoreInfoResponse(text: string): string {
  return `Não encontrei essa peça com segurança no catálogo agora.

Para localizar certinho, me envie uma dessas informações:
1. Foto da peça
2. Código ou referência
3. Modelo e ano do veículo
4. Nome completo da peça

Assim o balcão consegue confirmar para você.`;
}

function getNeedYearResponse(vehicleModel: string): string {
  return `Para localizar a peça certa para ${vehicleModel.toUpperCase()}, me informe o ano do veículo, por favor.`;
}

function getNeedBrakePositionResponse(): string {
  return `Você precisa da peça dianteira ou traseira?`;
}

// ============================================================================
// Processador principal com lógica de segurança
// ============================================================================

export async function processLipsMessage(
  db: SupabaseClient,
  organizationId: string,
  messageBody: string,
  senderId: string,
  conversationId: string
): Promise<ProcessMessageResult> {
  try {
    const effectiveMessageBody = await expandContextualQuoteReply(db, conversationId, messageBody);
    const config = getAutoReplyConfig(organizationId);
    if (!config?.enabled || !config.safeAutoReply) {
      return {
        response: '',
        shouldSend: false,
        autoSendAllowed: false,
        requiresHandoff: false,
        confidence: 0.0,
        intent: 'disabled',
      };
    }

    // ========================================================================
    // FASE 1: Detectar intenções críticas (handoff obrigatório)
    // ========================================================================

    // Se cliente quer avançar depois de uma cotação → balcão confirma antes de finalizar.
    if (detectProductHandoffIntent(effectiveMessageBody)) {
      return {
        response: BALCAO_HANDOFF_RESPONSE,
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: true,
        department: 'Balcão',
        handoffReason: 'quote_followup_product_interest',
        slaMinutes: SLA_MINUTES.Balcão,
        confidence: 0.95,
        intent: 'balcao',
      };
    }

    // Se cliente quer comprar/pagar/reservar → supervisor imediato.
    if (detectPurchaseIntent(effectiveMessageBody)) {
      return {
        response: SUPERVISOR_PURCHASE_RESPONSE,
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: true,
        department: 'Supervisor',
        handoffReason: 'purchase_or_payment_intent',
        slaMinutes: SLA_MINUTES.Supervisor,
        confidence: 0.95,
        intent: 'compra',
      };
    }

    // Se cliente quer serviço → handoff para Oficina
    if (detectServiceIntent(effectiveMessageBody)) {
      return {
        response: OFICINA_HANDOFF_RESPONSE,
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: true,
        department: 'Oficina',
        handoffReason: 'service_request',
        slaMinutes: SLA_MINUTES.Oficina,
        confidence: 0.95,
        intent: 'servico',
      };
    }

    // ========================================================================
    // FASE 2: Saudação/menu oficial da Gabi.
    // ========================================================================
    if (detectGreeting(effectiveMessageBody)) {
      return {
        response: GABI_MENU,
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: false,
        confidence: 0.95,
        intent: 'menu',
      };
    }

    // ========================================================================
    // FASE 3: Consultas de peças/preço/estoque (com orçamento inicial)
    // ========================================================================
    const requestedPieces = detectPiecesRequested(effectiveMessageBody);
    if (config.catalogEnabled && requestedPieces.length > 0) {
      const vehicleInfo = extractVehicleInfo(effectiveMessageBody);

      if (needsVehicleYear(requestedPieces, vehicleInfo)) {
        return {
          response: getNeedYearResponse(vehicleInfo.model || 'o veículo'),
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: false,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.85,
          intent: 'need_vehicle_year',
        };
      }

      const { found, notFound } = await findMultipleParts(db, organizationId, requestedPieces, vehicleInfo);

      if (found.length > 0 && needsBrakePosition(requestedPieces, found, effectiveMessageBody)) {
        return {
          response: getNeedBrakePositionResponse(),
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: false,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.85,
          intent: 'need_brake_position',
        };
      }

      // Caso A: confiança alta em um produto com preço seguro.
      if (found.length === 1 || (found.length > 1 && (found[0].matchScore ?? 0) >= ((found[1].matchScore ?? 0) + 25))) {
        const quoteSingleResponse = formatSinglePieceQuote(found[0]);
        return {
          response: quoteSingleResponse,
          shouldSend: true,
          autoSendAllowed: true, // Consulta simples: autoenvio OK
          requiresHandoff: false, // Consulta simples NÃO escala
          quoteOnly: true, // É apenas uma cotação consultiva
          idleCloseAfterMinutes: 10, // Marcar como idle se não responder em 10min
          nextStatusSuggestion: 'open',
          confidence: 0.90,
          intent: 'quote',
        };
      }

      // Caso B: encontrou opções parecidas; listar até 3 sem escolher aplicação.
      if (found.length > 1) {
        const response = formatCatalogOptions(found);
        return {
          response,
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: true,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.80,
          intent: 'quote_options',
        };
      }

      // Caso C: Não encontrou nenhuma. Resposta segura, sem inventar.
      return {
        response: getNeedMoreInfoResponse(effectiveMessageBody),
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: false,
        quoteOnly: false,
        idleCloseAfterMinutes: 10,
        nextStatusSuggestion: 'open',
        confidence: 0.70,
        intent: 'nao_encontrado',
      };
    }

    if (detectGeneralSupervisorIntent(effectiveMessageBody)) {
      return {
        response: SUPERVISOR_GENERAL_RESPONSE,
        shouldSend: true,
        autoSendAllowed: true,
        requiresHandoff: true,
        department: 'Supervisor',
        handoffReason: 'general_or_unknown',
        slaMinutes: SLA_MINUTES.Supervisor,
        confidence: 0.85,
        intent: 'general_or_unknown',
      };
    }

    // ========================================================================
    // FASE 4: Mensagem não classificada
    // ========================================================================
    return {
      response: SUPERVISOR_GENERAL_RESPONSE,
      shouldSend: true,
      autoSendAllowed: true,
      requiresHandoff: true,
      department: 'Supervisor',
      handoffReason: 'general_or_unknown',
      slaMinutes: SLA_MINUTES.Supervisor,
      confidence: 0.70,
      intent: 'general_or_unknown',
    };
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao processar:', error);
    return {
      response: '',
      shouldSend: false,
      autoSendAllowed: false,
      requiresHandoff: false,
      confidence: 0.0,
      intent: 'error',
    };
  }
}

// ============================================================================
// Enviar resposta e salvar histórico
// ============================================================================

export async function sendAndSaveResponse(
  db: SupabaseClient,
  organizationId: string,
  conversationId: string,
  senderId: string,
  responseText: string,
  requiresHandoff?: boolean,
  department?: 'Balcão' | 'Oficina' | 'Supervisor'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 1. Enviar via Evolution API
    const resolved = resolveSessionClient('lips-main');
    if (!resolved || !resolved.client) {
      return { success: false, error: 'Provider não configurado' };
    }

    const sendResult = await resolved.client.sendMessage({
      to: senderId,
      body: responseText,
    });

    if (sendResult.status !== 'sent' && sendResult.status !== 'queued') {
      return { success: false, error: `Falha ao enviar: ${sendResult.status}` };
    }

    const { data: conversation } = await db
      .from('whatsapp_conversations')
      .select('tenant_id, organization_id, channel_id, provider')
      .eq('id', conversationId)
      .single();

    // 2. Salvar no histórico da Central
    const { data: saved } = await db
      .from('whatsapp_messages')
      .insert({
        tenant_id: conversation?.tenant_id,
        organization_id: conversation?.organization_id || organizationId,
        channel_id: conversation?.channel_id,
        conversation_id: conversationId,
        direction: 'outbound',
        body: responseText,
        message_type: 'text',
        provider: conversation?.provider || 'whatsapp_web_legacy',
        delivery_status: sendResult.status,
        external_message_id: sendResult.id,
        to_id: senderId,
        raw_payload: {
          sentByAgent: true,
          agentType: 'lips-auto-intelligent',
        },
      })
      .select('id')
      .single();

    // 3. Marcar conversa para handoff humano (se necessário)
    if (requiresHandoff) {
      await db
        .from('whatsapp_conversations')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return {
      success: true,
      messageId: saved?.id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[lips-simple-processor] Erro ao enviar:', msg);
    return { success: false, error: msg };
  }
}
