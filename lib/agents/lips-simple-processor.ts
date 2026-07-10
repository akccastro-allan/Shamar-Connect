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
import {
  CatalogQueryClassification,
  PART_FAMILY_RULES,
  classifyCatalogQuery,
  queryNeedsPositionFromCandidates,
  queryNeedsSideFromCandidates,
  queryNeedsVerticalPositionFromCandidates,
  scoreCatalogCandidate,
} from '@/lib/catalog/lips-classifier';

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

function hasCatalogQueryIntent(text: string): boolean {
  const classification = classifyCatalogQuery(text);
  return Boolean(classification.family) || classification.missingRequiredFields.length > 0;
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

function isCatalogDetailOnly(text: string): boolean {
  const normalized = normalizeText(text);
  return /^(direito|direita|lado direito|ld|esquerdo|esquerda|lado esquerdo|le|superior|sup|inferior|inf|oleo|ar|combustivel|cabine|dentada|alternador|capa|protetor|agua|oleo)$/.test(normalized);
}

function isVehicleApplicationReply(text: string): boolean {
  const classification = classifyCatalogQuery(text);
  return Boolean(classification.vehicle || classification.year);
}

async function expandContextualQuoteReply(
  db: SupabaseClient,
  conversationId: string,
  messageBody: string
): Promise<string> {
  const year = normalizeYearReply(messageBody);
  const positionOnly = isBrakePositionOnly(messageBody);
  const catalogDetailOnly = isCatalogDetailOnly(messageBody);
  const vehicleApplicationReply = isVehicleApplicationReply(messageBody) && !hasCatalogQueryIntent(messageBody);

  if (!year && !positionOnly && !catalogDetailOnly && !vehicleApplicationReply) return messageBody;

  const { data } = await db
    .from('whatsapp_messages')
    .select('body')
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .not('body', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8);

  const previousMessages = (data || [])
    .map(row => (row.body || '').trim())
    .filter(body => body && body !== messageBody);

  const previousQuoteIndex = previousMessages.findIndex(hasCatalogQueryIntent);
  const previousQuote = previousQuoteIndex >= 0 ? previousMessages[previousQuoteIndex] : null;

  if (!previousQuote) return messageBody;

  if (year) {
    const previousVehicleReply = previousMessages
      .slice(0, previousQuoteIndex)
      .find(body => !hasCatalogQueryIntent(body) && Boolean(classifyCatalogQuery(body).vehicle));

    if (previousVehicleReply) return `${previousQuote} ${previousVehicleReply} ${year}`;
  }

  if (year) return `${previousQuote} ${year}`;
  if (vehicleApplicationReply) return `${previousQuote} ${messageBody}`;
  return `${previousQuote} ${messageBody}`;
}

// ============================================================================
// Buscar peças no catálogo (suporta múltiplas)
// ============================================================================

async function findClassifiedCatalogItems(
  db: SupabaseClient,
  organizationId: string,
  classification: CatalogQueryClassification,
): Promise<any[]> {
  if (!classification.family) return [];

  try {
    const rule = PART_FAMILY_RULES[classification.family];
    const searchTerms = Array.from(new Set([
      ...rule.positiveTerms,
      classification.vehicle,
    ].filter(Boolean) as string[])).slice(0, 8);
    const results: any[] = [];

    for (const term of searchTerms) {
      const { data } = await db
        .from('catalog_items')
        .select('id, name, sku, price, stock_quantity, brand')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .ilike('name', `%${term}%`)
        .limit(100);

      if (data) results.push(...data);
    }

    const byId = new Map<string, any>();
    results.forEach(item => {
      if (item?.id) byId.set(item.id, item);
    });

    return Array.from(byId.values())
      .map(item => {
        const candidateScore = scoreCatalogCandidate(item, classification);
        return {
          ...item,
          matchScore: candidateScore.score,
          confidence: candidateScore.confidence,
          candidateScore,
        };
      })
      .filter(item => item.candidateScore.familyMatch && item.price && item.price > 0)
      .sort((a, b) => b.confidence - a.confidence || b.matchScore - a.matchScore)
      .slice(0, 8);
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao buscar catálogo classificado:', error);
    return [];
  }
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
    responseText.includes('Encontrei algumas opções no catálogo da Lips:') ||
    responseText.includes('Encontrei algumas opções parecidas no catálogo da Lips:')
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
  responseText: string,
  options?: { allowWithinCooldown?: boolean }
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

      if (timeSinceLastReply < cooldownMs && options?.allowWithinCooldown) {
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

Quer falar com o balcão para confirmar aplicação e disponibilidade?`;
}

function formatQuoteStockLine(qty: number | null | undefined): string {
  if (typeof qty !== 'number') return '📊 Disponibilidade: precisa ser confirmada pelo balcão. Vou direcionar para confirmação.';
  if (qty > 0) return `📊 Estoque na última sincronização: ${Math.floor(qty)} unidade(s)`;
  return '📊 O sistema não mostra saldo disponível na última sincronização. Vou direcionar para o balcão confirmar.';
}

function formatOptionAvailability(qty: number | null | undefined): string {
  if (typeof qty !== 'number') return 'disponibilidade a confirmar';
  if (qty > 0) return `estoque: ${Math.floor(qty)} un.`;
  return 'saldo precisa ser confirmado pelo balcão';
}

/**
 * Formata resposta consultiva de preço único (quoteOnly)
 * Segue padrão: nome, preço, estoque na sincronização
 */
function formatSinglePieceQuote(item: any): string {
  const price = formatPrice(item.price);

  return `Encontrei no catálogo da Lips:

📦 Produto: ${item.name}
💰 Valor: R$ ${price}
${formatQuoteStockLine(item.stock_quantity)}

⚠️ Esses dados são da última atualização do sistema. O balcão confirma aplicação e disponibilidade certinha antes de finalizar.

Lhe ajudo em algo mais?`;
}

function formatCatalogOptions(items: any[]): string {
  const options = items
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.name} — R$ ${formatPrice(item.price)} — ${formatOptionAvailability(item.stock_quantity)}`)
    .join('\n');

  return `Encontrei algumas opções parecidas no catálogo da Lips:

${options}

Para confirmar a aplicação correta, preciso da posição/lado quando aplicável, código ou foto da peça.

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
  if (qty <= 0) return '⚠️ Saldo precisa ser confirmado pelo balcão';
  if (qty === 1) return '⚠️ Última unidade';
  if (qty < 5) return `✅ ${Math.floor(qty)} unidades`;
  return `✅ Disponível (${Math.floor(qty)}+ un)`;
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

function requiresStockConfirmation(item: any): boolean {
  return typeof item.stock_quantity !== 'number' || item.stock_quantity <= 0;
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

function getNeedVehicleApplicationResponse(): string {
  return 'Para localizar a peça certa, me informe o modelo do veículo, por favor.';
}

function getNeedBrakePositionResponse(): string {
  return `Você precisa da peça dianteira ou traseira?`;
}

function getNeedSideResponse(): string {
  return 'Você precisa do lado direito ou esquerdo?';
}

function getNeedVerticalPositionResponse(): string {
  return 'Você precisa da peça superior ou inferior?';
}

function getNeedCatalogTypeResponse(field: string): string {
  if (field === 'tipo do filtro') return 'Você precisa de filtro de óleo, filtro de ar, filtro de combustível ou filtro de cabine?';
  if (field === 'tipo da bomba') return 'Você precisa de bomba d\'água ou bomba de óleo?';
  if (field === 'tipo da correia') return 'Você precisa de correia dentada, correia do alternador, capa ou protetor da correia?';
  return 'Para localizar a peça certa, me informe mais detalhes da peça, por favor.';
}

function getClassificationMissingFieldResponse(classification: CatalogQueryClassification): string {
  if (classification.missingRequiredFields.includes('tipo do filtro')) return getNeedCatalogTypeResponse('tipo do filtro');
  if (classification.missingRequiredFields.includes('tipo da bomba')) return getNeedCatalogTypeResponse('tipo da bomba');
  if (classification.missingRequiredFields.includes('tipo da correia')) return getNeedCatalogTypeResponse('tipo da correia');
  if (classification.missingRequiredFields.includes('modelo do veículo')) return getNeedVehicleApplicationResponse();
  if (classification.missingRequiredFields.includes('ano do veículo')) return 'Qual é o ano do veículo?';
  return getNeedMoreInfoResponse('');
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
    const catalogClassification = classifyCatalogQuery(effectiveMessageBody);
    const hasCatalogIntent = hasCatalogQueryIntent(effectiveMessageBody);

    if (config.catalogEnabled && hasCatalogIntent) {
      if (catalogClassification.missingRequiredFields.length > 0) {
        return {
          response: getClassificationMissingFieldResponse(catalogClassification),
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: false,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.85,
          intent: 'need_catalog_application',
        };
      }

      const found = await findClassifiedCatalogItems(db, organizationId, catalogClassification);

      if (found.length > 0 && queryNeedsPositionFromCandidates(catalogClassification, found)) {
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

      if (found.length > 0 && queryNeedsSideFromCandidates(catalogClassification, found)) {
        return {
          response: getNeedSideResponse(),
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: false,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.85,
          intent: 'need_side',
        };
      }

      if (found.length > 0 && queryNeedsVerticalPositionFromCandidates(catalogClassification, found)) {
        return {
          response: getNeedVerticalPositionResponse(),
          shouldSend: true,
          autoSendAllowed: true,
          requiresHandoff: false,
          quoteOnly: false,
          idleCloseAfterMinutes: 10,
          nextStatusSuggestion: 'open',
          confidence: 0.85,
          intent: 'need_vertical_position',
        };
      }

      const confidentMatches = found.filter(item => item.confidence >= 0.75).slice(0, 3);

      // Caso A: confiança alta em um produto com preço seguro.
      if (
        confidentMatches[0]?.confidence >= 0.90 &&
        (!confidentMatches[1] || confidentMatches[0].confidence >= confidentMatches[1].confidence + 0.08)
      ) {
        const quoteSingleResponse = formatSinglePieceQuote(confidentMatches[0]);
        const stockConfirmationNeeded = requiresStockConfirmation(confidentMatches[0]);
        return {
          response: quoteSingleResponse,
          shouldSend: true,
          autoSendAllowed: true, // Consulta simples: autoenvio OK
          requiresHandoff: stockConfirmationNeeded,
          department: stockConfirmationNeeded ? 'Balcão' : undefined,
          handoffReason: stockConfirmationNeeded ? 'stock_confirmation_needed' : undefined,
          slaMinutes: stockConfirmationNeeded ? SLA_MINUTES.Balcão : undefined,
          quoteOnly: true, // É apenas uma cotação consultiva
          idleCloseAfterMinutes: 10, // Marcar como idle se não responder em 10min
          nextStatusSuggestion: 'open',
          confidence: 0.90,
          intent: 'quote',
        };
      }

      // Caso B: encontrou opções parecidas; listar até 3 sem escolher aplicação.
      if (confidentMatches.length > 1) {
        const response = formatCatalogOptions(confidentMatches);
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
