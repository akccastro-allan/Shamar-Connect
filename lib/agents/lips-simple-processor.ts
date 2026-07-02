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

// ============================================================================
// Types
// ============================================================================

export type ProcessMessageResult = {
  response: string;
  shouldSend: boolean;
  autoSendAllowed: boolean; // ← pode enviar automático (sem handoff)
  requiresHandoff: boolean;
  department?: 'Balcão' | 'Oficina'; // ← onde encaminhar se handoff
  handoffReason?: string; // ← motivo do handoff (purchase_intent, service_request, etc)
  confidence: number; // ← 0.0 a 1.0
  intent: string; // ← saudacao | consulta_preco | consulta_estoque | quote | compra | servico | nao_encontrado
};

// ============================================================================
// FAQ Simples — perguntas genéricas
// ============================================================================

const FAQ_RESPONSES: Record<string, string> = {
  horario: `⏰ **Horário de funcionamento:**
📅 Segunda a Sexta: 8h às 18h
📅 Sábado: 8h às 15h
📅 Domingo: Fechado

Nos envie a dúvida que responderemos assim que abrir! 😊`,

  endereco:
    `📍 **Endereço:**
Rua [...], nº [...]
Rio de Janeiro - RJ

Quer agendar uma visita ou precisa de algo? 😊`,

  pagamento: `💳 **Formas de pagamento:**
✅ Dinheiro
✅ Débito
✅ Crédito (até 12x)
✅ PIX
✅ Boleto

Qual você prefere? 😊`,

  compra: `🛒 **Como comprar:**
1️⃣ Me envia a foto, código ou nome da peça
2️⃣ Eu confirmo o valor e disponibilidade
3️⃣ Você escolhe a forma de pagamento
4️⃣ Agendamos a retirada ou entrega

Qual peça você procura? 😊`,

  entrega: `🚗 **Informações de entrega:**
Temos opções de:
✅ Retirada na loja
✅ Entrega em Rio de Janeiro
✅ Entrega para outras cidades

Confirma a peça que você quer? 😊`,
};

// ============================================================================
// Banco de peças (com sinônimos e variações)
// ============================================================================

const PIECE_KEYWORDS: Record<string, string[]> = {
  freio: ['freio', 'disco', 'pastilha', 'tambor'],
  oleo: ['óleo', 'oleo', 'lubrificante'],
  filtro: ['filtro', 'ar', 'óleo', 'combustivel'],
  bateria: ['bateria', 'bateria'],
  pneu: ['pneu', 'pneus', 'pneu'],
  amortecedor: ['amortecedor', 'amort', 'mola'],
  vela: ['vela', 'velas'],
  alternador: ['alternador'],
  radiador: ['radiador', 'radiador'],
  termostato: ['termostato', 'termostato'],
  bomba: ['bomba', 'agua'],
  bucha: ['bucha', 'buchas'],
  corrente: ['corrente', 'correia'],
  sensor: ['sensor', 'sensores'],
  correia: ['correia', 'correia'],
};

// ============================================================================
// Funções de detecção
// ============================================================================

function detectFaqTopic(text: string): string | null {
  const lower = text.toLowerCase();

  if (/horá|abre|funciona|qual horá/.test(lower)) return 'horario';
  if (/onde fica|endereço|localização|aonde|morada/.test(lower)) return 'endereco';
  if (/pagamento|pago|parcel|crédito|dinheiro|pix|débito/.test(lower)) return 'pagamento';
  if (/como compra|como faço|como funciona|como pedir/.test(lower)) return 'compra';
  if (/entrega|retirada|frete|quanto tempo|quando chega/.test(lower)) return 'entrega';

  return null;
}

/**
 * Detecta intenção de compra/fechamento (handoff obrigatório)
 */
function detectPurchaseIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const purchasePatterns = [
    /quero comprar|vou querer|separa|reserva|pode separar|vou buscar|fecha|fechar/,
    /pagamento|pix|cartão|boleto|manda link|entrega|retirar/,
  ];
  return purchasePatterns.some(pattern => pattern.test(lower));
}

/**
 * Detecta intenção de serviço (handoff para Oficina)
 */
function detectServiceIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const servicePatterns = [
    /troca de óleo|revisão|alinhamento|balanceamento|diagnóstico|instalar|manutenção|agendar/,
  ];
  return servicePatterns.some(pattern => pattern.test(lower));
}

/**
 * Detecta peças solicitadas (suporta múltiplas)
 * Retorna lista de nomes de peças encontradas
 */
function detectPiecesRequested(text: string): string[] {
  const lower = text.toLowerCase();
  const foundPieces = new Set<string>();

  // Padrão de pergunta sobre peça
  const isPieceQuery =
    /qual.*valor|quanto custa|preço|tem.*estoque|disponível|peça.*modelo|orçamento|quanto (fica|dá|sai)/i.test(
      text
    );

  if (!isPieceQuery) {
    return [];
  }

  // Procurar todas as peças mencionadas
  Object.entries(PIECE_KEYWORDS).forEach(([pieceType, keywords]) => {
    keywords.forEach(kw => {
      if (lower.includes(kw)) {
        foundPieces.add(pieceType);
      }
    });
  });

  return Array.from(foundPieces);
}

/**
 * Extrai veículo da mensagem (marca + modelo + ano)
 */
function extractVehicleInfo(text: string): {
  brand?: string;
  model?: string;
  year?: number;
} {
  const lower = text.toLowerCase();
  const result: any = {};

  // Modelos comuns
  const models = [
    'gol',
    'corolla',
    'civic',
    'uno',
    'prisma',
    'onix',
    'hb20',
    'i30',
    'cerato',
    'tucson',
    'sportage',
    'creta',
    'kwid',
    'sandero',
  ];

  models.forEach(model => {
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
  partName: string
): Promise<any | null> {
  try {
    const { data } = await db
      .from('catalog_items')
      .select('id, name, sku, price, stock_quantity, brand')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .ilike('name', `%${partName}%`)
      .limit(1);

    if (!data || data.length === 0) {
      return null;
    }

    const item = data[0];

    // Preço NUNCA pode ser null ou 0
    if (!item.price || item.price <= 0) {
      return null;
    }

    return item;
  } catch (error) {
    console.error('[lips-simple-processor] Erro ao buscar peça:', error);
    return null;
  }
}

/**
 * Buscar múltiplas peças no catálogo
 */
async function findMultipleParts(
  db: SupabaseClient,
  organizationId: string,
  partNames: string[]
): Promise<{ found: any[]; notFound: string[] }> {
  const found: any[] = [];
  const notFound: string[] = [];

  for (const partName of partNames) {
    const item = await findPartInCatalog(db, organizationId, partName);
    if (item) {
      found.push(item);
    } else {
      notFound.push(partName);
    }
  }

  return { found, notFound };
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
  return `Entendi que você quer saber sobre uma peça! 🔍

Para eu passar o valor certo, me envia:
1️⃣ **Foto da peça** (melhor!)
2️⃣ **Código ou referência**
3️⃣ **Marca e modelo do carro**
4️⃣ **Nome completo da peça**
5️⃣ **Quantidade**

Assim consigo localizar com certeza! 😊`;
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
    // ========================================================================
    // FASE 1: Detectar intenções críticas (handoff obrigatório)
    // ========================================================================

    // Se cliente quer comprar → handoff imediato para Balcão
    if (detectPurchaseIntent(messageBody)) {
      return {
        response: "Perfeito. Vou encaminhar para o balcão confirmar aplicação, disponibilidade e forma de pagamento certinha antes de finalizar.",
        shouldSend: true,
        autoSendAllowed: true, // Pode autoenviar encaminhamento
        requiresHandoff: true,
        department: 'Balcão',
        handoffReason: 'purchase_intent',
        confidence: 0.95,
        intent: 'compra',
      };
    }

    // Se cliente quer serviço → handoff para Oficina
    if (detectServiceIntent(messageBody)) {
      return {
        response: "Entendi. Vou encaminhar para a oficina verificar o melhor horário e confirmar os detalhes do serviço.",
        shouldSend: true,
        autoSendAllowed: true, // Pode autoenviar encaminhamento
        requiresHandoff: true,
        department: 'Oficina',
        handoffReason: 'service_request',
        confidence: 0.95,
        intent: 'servico',
      };
    }

    // ========================================================================
    // FASE 2: Saudações e FAQ simples (autoenvio permitido)
    // ========================================================================
    const faqTopic = detectFaqTopic(messageBody);
    if (faqTopic && FAQ_RESPONSES[faqTopic]) {
      return {
        response: FAQ_RESPONSES[faqTopic],
        shouldSend: true,
        autoSendAllowed: true, // Saudações e FAQ simples: autoenvio OK
        requiresHandoff: false,
        confidence: 0.95,
        intent: 'saudacao',
      };
    }

    // ========================================================================
    // FASE 3: Consultas de peças/preço/estoque (com orçamento inicial)
    // ========================================================================
    const requestedPieces = detectPiecesRequested(messageBody);
    if (requestedPieces.length > 0) {
      const vehicleInfo = extractVehicleInfo(messageBody);
      const { found, notFound } = await findMultipleParts(db, organizationId, requestedPieces);

      // Caso A: Encontrou todas as peças
      if (found.length > 0 && notFound.length === 0) {
        return {
          response: formatQuoteResponse(found, vehicleInfo),
          shouldSend: true,
          autoSendAllowed: true, // Orçamento inicial: autoenvio OK
          requiresHandoff: true, // Mas marca handoff para balcão fechar
          department: 'Balcão',
          handoffReason: 'quote_generated',
          confidence: 0.90,
          intent: 'quote',
        };
      }

      // Caso B: Encontrou algumas peças
      if (found.length > 0 && notFound.length > 0) {
        const partialQuote = found
          .map(item => `📦 ${item.name}: R$ ${formatPrice(item.price)}`)
          .join('\n');

        const missingList = notFound.map(p => `• ${p}`).join('\n');

        const response = `Encontrei algumas peças! 📋

${partialQuote}

Mas não consegui localizar com segurança:
${missingList}

Pode me enviar:
1️⃣ Foto da peça
2️⃣ Código ou referência
3️⃣ Marca completa

Assim monto o orçamento completo! 😊`;

        return {
          response,
          shouldSend: true,
          autoSendAllowed: true, // Orçamento parcial: autoenvio OK
          requiresHandoff: true,
          department: 'Balcão',
          handoffReason: 'partial_quote',
          confidence: 0.80,
          intent: 'quote',
        };
      }

      // Caso C: Não encontrou nenhuma
      return {
        response: getNeedMoreInfoResponse(messageBody),
        shouldSend: true,
        autoSendAllowed: true, // Pedido de dados: autoenvio OK
        requiresHandoff: false,
        confidence: 0.70,
        intent: 'nao_encontrado',
      };
    }

    // ========================================================================
    // FASE 4: Mensagem não classificada
    // ========================================================================
    return {
      response: '',
      shouldSend: false,
      autoSendAllowed: false,
      requiresHandoff: false,
      confidence: 0.0,
      intent: 'unknown',
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
  department?: 'Balcão' | 'Oficina'
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

    // 2. Salvar no histórico da Central
    const { data: saved } = await db
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        body: responseText,
        message_type: 'text',
        provider: 'evolution',
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
