# Lips Agent — Implementation Guide

**Target:** Developers, Prompts, Future Maintainers  
**Updated:** 2026-07-02  
**Status:** MVP Ready

---

## Quick Start

### **What does it do?**

Quando cliente manda mensagem no WhatsApp da Lips:

```
Cliente: "Qual o preço do disco para Gol 2010?"

Sistema:
1. Webhook recebe mensagem
2. Salva em BD
3. Cria job na fila
4. Processor lê job
5. Agente identifica "disco" + "Gol"
6. Busca no catálogo
7. Encontra R$ 10,01
8. Envia resposta automática
9. Marca conversa como "pending" (humano valida depois)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ EVOLUTION API WEBHOOK (Gateway WhatsApp Web)                │
├─────────────────────────────────────────────────────────────┤
│ POST /api/webhooks/evolution                                │
│ event='messages.upsert', instance='lips'                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ ingestInboundMessage() │ (lib/inbox/persist-inbound.ts)
        │ ✅ Valida channel      │
        │ ✅ Salva conversa      │
        │ ✅ Salva mensagem      │
        └────────────┬───────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │ agent_automation_jobs.insert()  │
        │ status='pending'                │
        └────────┬────────────────────────┘
                 │
          (fila de tarefas)
                 │
                 ▼
    ┌───────────────────────────────────┐
    │ POST /api/agents/lips/process-jobs│ (rodado por cron)
    │ - Fetch jobs where status='pending'
    │ - Mark as 'processing'
    └───────────┬───────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │ processLipsMessage()         │ (lib/agents/lips-simple-processor.ts)
    │ 1. Detect FAQ topic         │
    │ 2. Detect piece keywords    │
    │ 3. Find in catalog          │
    │ 4. Generate response        │
    │ 5. Mark for handoff?        │
    └────────┬──────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ sendAndSaveResponse()     │
    │ 1. Send via Evolution API │
    │ 2. Save to whatsapp_msgs  │
    │ 3. Mark conv pending      │
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Update job to 'done'     │
    │ Save response_text       │
    │ Save messageId           │
    └──────────────────────────┘
```

---

## File Structure

### **Core Agent Logic**

**`lib/agents/lips-simple-processor.ts`** (475 lines)

```typescript
// 1. FAQ detection
const FAQ_RESPONSES: Record<string, string> = {
  horario: "⏰ Segunda a Sexta: 8h às 18h...",
  endereco: "📍 Rua [...], nº...",
  pagamento: "💳 Dinheiro, débito, crédito...",
  compra: "🛒 Me envia foto/código...",
  entrega: "🚗 Temos opções de retirada/entrega..."
}

function detectFaqTopic(text: string): string | null {
  // Regex: /horá|abre|funciona/ → 'horario'
  // Regex: /onde fica|endereço/ → 'endereco'
  // etc.
}

// 2. Piece detection (sinônimos)
const PIECE_KEYWORDS: Record<string, string[]> = {
  freio: ['freio', 'disco', 'pastilha', 'tambor'],
  oleo: ['óleo', 'oleo', 'lubrificante'],
  filtro: ['filtro', 'ar', 'óleo', 'combustivel'],
  // ... 12 mais
}

function detectPiecesRequested(text: string): string[] {
  // Se message tem "disco" OU "pastilha"
  // E tem "qual valor" OU "quanto custa" OU "tem estoque"
  // Retorna: ['freio'] (porque disco→freio)
}

// 3. Vehicle extraction
function extractVehicleInfo(text: string): { model?, year? } {
  // Extrai "Gol 2010" → { model: "gol", year: 2010 }
}

// 4. Catalog lookup
async function findPartInCatalog(
  db,
  organizationId,
  partName
): Promise<CatalogItem | null> {
  // SELECT * FROM catalog_items
  // WHERE organization_id = '...'
  //   AND status = 'active'
  //   AND name ILIKE '%disco%'
  //   AND price > 0
  // LIMIT 1
  
  // Retorna: { id, name, price: 10.01, stock: 5, brand }
}

// 5. Main orchestrator
export async function processLipsMessage(
  db,
  organizationId,
  messageBody,
  senderId,
  conversationId
): Promise<{ response: string; shouldSend: boolean; requiresHandoff?: boolean }> {
  
  // Passo 1: Check FAQ
  const faqTopic = detectFaqTopic(messageBody)
  if (faqTopic) return {
    response: FAQ_RESPONSES[faqTopic],
    shouldSend: true,
    requiresHandoff: false
  }
  
  // Passo 2: Detect pieces
  const pieces = detectPiecesRequested(messageBody)
  if (pieces.length > 0) {
    const { found, notFound } = await findMultipleParts(db, orgId, pieces)
    
    // Caso A: Encontrou todas
    if (found.length > 0 && notFound.length === 0) {
      return {
        response: formatQuoteResponse(found, vehicleInfo),
        shouldSend: true,
        requiresHandoff: true // ← IMPORTANTE: marca pra humano validar
      }
    }
    
    // Caso B: Encontrou algumas
    if (found.length > 0 && notFound.length > 0) {
      return {
        response: `Encontrei... Mas não consegui localizar: ${notFound.join(', ')}...`,
        shouldSend: true,
        requiresHandoff: true
      }
    }
    
    // Caso C: Não encontrou nenhuma
    return {
      response: "Entendi que você quer... Me envia foto/código...",
      shouldSend: true,
      requiresHandoff: false
    }
  }
  
  // Passo 3: Nada matched
  return {
    response: '',
    shouldSend: false
  }
}

// 6. Send & save
export async function sendAndSaveResponse(
  db,
  organizationId,
  conversationId,
  senderId,
  responseText,
  requiresHandoff?: boolean
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  // STEP 1: Send via Evolution
  const resolved = resolveSessionClient('lips-main')
  const sendResult = await resolved.client.sendMessage({
    to: senderId,
    body: responseText
  })
  
  if (sendResult.status !== 'sent' && sendResult.status !== 'queued') {
    return { success: false, error: `Falha ao enviar: ${sendResult.status}` }
  }
  
  // STEP 2: Save to whatsapp_messages (outbound)
  const { data: saved } = await db
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      body: responseText,
      external_message_id: sendResult.id,
      to_id: senderId,
      raw_payload: { sentByAgent: true, agentType: 'lips-auto-simple' }
    })
    .select('id')
    .single()
  
  // STEP 3: Mark conversation for handoff
  if (requiresHandoff) {
    await db
      .from('whatsapp_conversations')
      .update({ status: 'pending', updated_at: now() })
      .eq('id', conversationId)
  }
  
  return { success: true, messageId: saved?.id }
}
```

---

### **Job Processor**

**`app/api/agents/lips/process-jobs/route.ts`** (207 lines)

```typescript
export async function POST(request: NextRequest) {
  const db = createSupabaseWriteClient()
  
  // Validate optional token
  const token = request.headers.get('x-processor-token')
  const expectedToken = process.env.LIPS_PROCESSOR_TOKEN
  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
  }
  
  // Get parameters
  const body = await request.json().catch(() => ({}))
  const limit = Math.min(body.limit || 10, 100)
  
  // ========================================================================
  // 1. FETCH PENDING JOBS
  // ========================================================================
  const { data: jobs, error: fetchError } = await db
    .from('agent_automation_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (fetchError) {
    return NextResponse.json({
      ok: false,
      error: `Failed to fetch jobs: ${fetchError.message}`
    }, { status: 500 })
  }
  
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'No pending jobs'
    })
  }
  
  // ========================================================================
  // 2. PROCESS EACH JOB
  // ========================================================================
  const results: any[] = []
  
  for (const job of jobs) {
    try {
      // Mark as processing
      await db
        .from('agent_automation_jobs')
        .update({ status: 'processing', started_at: now() })
        .eq('id', job.id)
      
      // Fetch inbound message
      const { data: inboundMsg } = await db
        .from('whatsapp_messages')
        .select('*')
        .eq('id', job.message_id)
        .single()
      
      if (!inboundMsg) throw new Error('Inbound message not found')
      
      // Process message
      const processResult = await processLipsMessage(
        db,
        job.organization_id,
        inboundMsg.body,
        inboundMsg.from_id,
        job.conversation_id
      )
      
      // Send if needed
      if (processResult.shouldSend) {
        const sendResult = await sendAndSaveResponse(
          db,
          job.organization_id,
          job.conversation_id,
          inboundMsg.from_id,
          processResult.response,
          processResult.requiresHandoff
        )
        
        // ⚠️ KEY: Validate success BEFORE marking done
        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Failed to send')
        }
        
        // Mark job as done
        await db
          .from('agent_automation_jobs')
          .update({
            status: 'done',
            completed_at: now(),
            response_type: 'text',
            response_text: processResult.response,
            sent_to_evolution: true,
            outbound_message_id: sendResult.messageId
          })
          .eq('id', job.id)
        
        results.push({ jobId: job.id, status: 'done', responded: true })
      } else {
        // No response needed, just mark done
        await db
          .from('agent_automation_jobs')
          .update({
            status: 'done',
            completed_at: now()
          })
          .eq('id', job.id)
        
        results.push({ jobId: job.id, status: 'done', responded: false })
      }
    } catch (jobError) {
      const errorMsg = jobError instanceof Error ? jobError.message : String(jobError)
      console.error(`[lips-processor] Job ${job.id} failed:`, errorMsg)
      
      // Mark as error
      await db
        .from('agent_automation_jobs')
        .update({
          status: 'error',
          completed_at: now(),
          error_message: errorMsg,
          error_code: 'PROCESSING_FAILED'
        })
        .eq('id', job.id)
      
      results.push({ jobId: job.id, status: 'error', error: errorMsg })
    }
  }
  
  // ========================================================================
  // 3. RETURN METRICS
  // ========================================================================
  const completed = results.filter(r => r.status === 'done').length
  const failed = results.filter(r => r.status === 'error').length
  
  return NextResponse.json({
    ok: true,
    processed: results.length,
    completed,
    failed,
    details: results
  })
}
```

---

### **Webhook Integration**

**`app/api/webhooks/evolution/route.ts`** (changes only)

```typescript
// After ingestInboundMessage succeeds:
if (result === 'processed') {
  processed += 1
  
  // Create job in queue for Lips agent
  if (channel.provider === 'evolution' && !m.isGroup && channel.organizationId) {
    const msgQuery = await db
      .from('whatsapp_messages')
      .select('id, conversation_id')
      .eq('external_message_id', m.messageId)
      .maybeSingle()
    
    if (msgQuery.data?.id && msgQuery.data?.conversation_id) {
      // Async job creation — doesn't block webhook
      await db
        .from('agent_automation_jobs')
        .insert({
          tenant_id: channel.tenantId,
          organization_id: channel.organizationId,
          channel_id: channel.id,
          conversation_id: msgQuery.data.conversation_id,
          message_id: msgQuery.data.id,
          status: 'pending',
          agent_type: 'lips-auto'
        })
        .catch((err) => {
          console.error('[lips-webhook] Error creating job:', err)
          // ⚠️ Note: Message already saved, so not critical
        })
    }
  }
}
```

---

### **Testing**

**`app/api/agents/lips/test-simple/route.ts`**

```typescript
// Test agent WITHOUT database or Evolution API
POST /api/agents/lips/test-simple
Body: { "message": "Qual o preço do disco para Gol 2010?" }

Response:
{
  "ok": true,
  "message": "Qual o preço do disco para Gol 2010?",
  "response": "Encontrei essas peças para você!...",
  "willAutoRespond": true,
  "requiresHandoff": true
}
```

---

### **Database Schema**

**`supabase/migrations/0030_agent_automation_jobs.sql`**

```sql
CREATE TABLE agent_automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  channel_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  message_id uuid NOT NULL,
  
  status text NOT NULL DEFAULT 'pending',  -- pending|processing|done|error
  agent_type text,  -- lips-auto, hall-auto, etc.
  
  response_type text,  -- text, media, suggestion
  response_text text,  -- full text of response sent
  sent_to_evolution boolean,
  outbound_message_id uuid,
  
  error_code text,
  error_message text,
  
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE agent_automation_cooldown (
  conversation_id uuid PRIMARY KEY,
  last_automated_response_at timestamptz,
  last_response_type text
);
```

---

## How to Use

### **1. Test Offline (no DB needed)**

```bash
curl -X POST http://localhost:3000/api/agents/lips/test-simple \
  -H "Content-Type: application/json" \
  -d '{"message":"Qual o horário?"}'

# Response: FAQ answer with requiresHandoff=false
```

### **2. Simulate Webhook**

```bash
curl -X POST http://localhost:3000/api/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "lips",
    "data": [{
      "key": {
        "remoteJid": "5521998141499@s.whatsapp.net",
        "id": "wamid.test.123",
        "fromMe": false
      },
      "message": {
        "conversation": "Qual o preço do disco?"
      },
      "messageTimestamp": 1751234567,
      "pushName": "Test User"
    }]
  }'

# Response: {"ok":true,"processed":1,...}
# This creates a job in agent_automation_jobs with status='pending'
```

### **3. Process Jobs**

```bash
curl -X POST http://localhost:3000/api/agents/lips/process-jobs \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'

# Response: {
#   "ok": true,
#   "processed": 1,
#   "completed": 1,
#   "failed": 0,
#   "details": [
#     { "jobId": "...", "status": "done", "responded": true }
#   ]
# }
```

### **4. In Production (Automated Cron)**

```bash
# GitHub Actions or external scheduler calls:
curl -X POST https://shamarconnect.com.br/api/agents/lips/process-jobs \
  -H "Content-Type: application/json" \
  -H "x-processor-token: YOUR_SECRET_TOKEN" \
  -d '{"limit":50}'

# Runs every 30 seconds (or whatever you set)
# Processes up to 50 pending jobs
```

---

## Key Design Decisions

### **1. Why Job Queue?**

**Problem:** Fire-and-forget responses can fail silently.

**Solution:** Webhook only creates job, processor runs separately.

**Benefit:**
- ✅ Idempotent: retry automatically if processor fails
- ✅ Auditable: every attempt logged in `agent_automation_jobs`
- ✅ Desacoplado: webhook fast, processor can run on schedule

---

### **2. Why Regex + Catalog?**

**Problem:** LLM is expensive (R$ 300/month) and slow (500ms+).

**Solution:** Simple regex for FAQ, ILike for catalog.

**Benefit:**
- ✅ Cost: R$ 0 (just DB queries)
- ✅ Speed: ~50ms vs 500ms+
- ✅ Control: no vendor dependency

---

### **3. Why "Pending" = Handoff?**

**Problem:** Automated response can be wrong (wrong price, wrong part).

**Solution:** Mark conversation `status='pending'`, human validates.

**Benefit:**
- ✅ Safety: human always double-checks
- ✅ Learning: agent learns what works
- ✅ Trust: customer feels real support

---

### **4. Why Separate Test Endpoint?**

**Problem:** Want to test agent without DB/Evolution.

**Solution:** `/api/agents/lips/test-simple` takes message, returns response.

**Benefit:**
- ✅ Fast debug: no setup needed
- ✅ CI/CD friendly: can unit test
- ✅ Transparency: see what agent would do

---

## Monitoring & Troubleshooting

### **Check queue status**

```sql
-- Jobs still pending
SELECT COUNT(*) as pending 
FROM agent_automation_jobs 
WHERE status='pending'

-- Successfully processed
SELECT COUNT(*) as done 
FROM agent_automation_jobs 
WHERE status='done'

-- Errors
SELECT error_code, COUNT(*) 
FROM agent_automation_jobs 
WHERE status='error' 
GROUP BY error_code
```

### **Debug a failed job**

```sql
SELECT * 
FROM agent_automation_jobs 
WHERE status='error' 
ORDER BY completed_at DESC 
LIMIT 1

-- Then check related message:
SELECT * 
FROM whatsapp_messages 
WHERE id = :message_id

-- Then check conversation:
SELECT * 
FROM whatsapp_conversations 
WHERE id = :conversation_id
```

### **Common errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `Provider não configurado` | `resolveSessionClient('lips-main')` failed | Check `lib/providers/resolve-session.ts` |
| `Falha ao enviar: ...` | Evolution API returned error | Check EVOLUTION_API_URL, EVOLUTION_API_KEY |
| `Mensagem inbound não encontrada` | Job references deleted message | Check message retention policy |
| `Conversa não encontrada` | Job references deleted conversation | Check conversation retention policy |

---

## Next Steps (Post-MVP)

- [ ] Add FAQ management UI (`/settings/faq-responses`)
- [ ] Add fuzzy matching for catalog (not just ILike)
- [ ] Add external cron scheduler (GitHub Actions, Cloud Scheduler)
- [ ] Add metrics dashboard (response rate, latency, errors)
- [ ] Add cooldown between responses (don't spam same user)
- [ ] Port agent to Hall Donous, Viciados, other clients
- [ ] Add LLM layer for complex questions (not MVP)

