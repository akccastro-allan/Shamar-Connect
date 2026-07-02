# Lips Agent — Decisions & Trade-offs

**Purpose:** Explain why each choice was made, what was rejected, and what we'll do later.

**Audience:** Developers, future maintainers, AI prompts.

---

## Decision Matrix

### **1. Job Queue vs Fire-and-Forget**

| Aspect | Fire-and-Forget | Job Queue | Winner |
|--------|---|---|---|
| **Reliability** | ❌ Silent failures | ✅ Retry on error | Job Queue |
| **Auditability** | ❌ No trace | ✅ Logged in DB | Job Queue |
| **Complexity** | ✅ Simple | ⚠️ 2 more endpoints | Fire-and-Forget |
| **Latency** | ✅ Instant | ⚠️ Cron delay (30s) | Fire-and-Forget |
| **Production-ready** | ❌ Too risky | ✅ Enterprise pattern | Job Queue |

**Decision:** **Job Queue** (trade latency for reliability)

**Why:** Production code must be auditable. If response fails to send, we need to know and retry. Fire-and-forget means messaging in the dark — unacceptable.

**Consequence:** Response arrives ~30s later (not instant), but **guaranteed** or **error logged**.

**When to revisit:** If latency becomes critical (SLA < 5s), switch to Job Queue + Redis for faster processing.

---

### **2. Regex + Catalog vs LLM**

| Aspect | Regex + Catalog | LLM (Claude/OpenAI) | Winner |
|--------|---|---|---|
| **Cost/month** | R$ 0 | R$ 300+ | Regex |
| **Latency** | 50ms | 500ms-2s | Regex |
| **Accuracy** | 80% (FAQ, simple parts) | 95%+ | LLM |
| **Vendor dependency** | None | OpenAI/Anthropic | Regex |
| **Setup complexity** | Simple | Need API key + config | Regex |
| **Customization** | Via DB config | Via prompt tuning | Regex |

**Decision:** **Regex + Catalog** for MVP (LLM is future enhancement)

**Why:** 
1. Lips gets ~50 FAQs + ~200 parts per day. **80% match with simple regex.**
2. R$ 300/month is 3% of Lips subscription. **Not worth it for MVP.**
3. Response latency < 100ms is better for UX. **LLM is 5-10x slower.**
4. We have full control. **No vendor API keys in code.**

**Trade-off:** Can't handle nuanced questions like "I have a 2010 Gol but it's the older model, what discount?". But **human always validates**, so it's safe.

**When to add LLM:** 
- Lips asks for intelligent responses ("Can you understand my accent?")
- High error rate with regex (> 20%)
- Budget increases (LLM becomes marginal cost)

---

### **3. Handoff (Pending) vs Direct Response**

| Aspect | Direct Response | Handoff (Pending) | Winner |
|--------|---|---|---|
| **Response time** | Instant | ~1-2 min (human pickup) | Direct |
| **Accuracy** | Risky (agent wrong) | Safe (human checks) | Handoff |
| **Customer satisfaction** | No human contact | Feels like real support | Handoff |
| **Scalability** | No human load | Requires staff | Direct |
| **Error recovery** | Agent stuck in loop | Human can correct | Handoff |

**Decision:** **Handoff (Pending)** for quotes, **Direct** for FAQ only

**Why:**
- FAQ (horário, endereço) = agent knows for sure → direct response
- Quotes (preço disco) = agent could be wrong → human validates → handoff

**Trade-off:** Customer waits 1-2 min for quote confirmation instead of instant. But **100% accurate** and **builds trust** (real person checking).

**When to revisit:** If Lips gets enough data, train agent on success/error rates. If "disco para Gol 2010" is 99% accurate, mark as direct.

---

### **4. Single Agent vs Multi-Agent**

| Aspect | Single (Lips) | Multi (All companies) | Winner |
|--------|---|---|---|
| **Scope** | One company | 8 companies | Single |
| **Complexity** | Simple (15 keyword) | Complex (100+ keywords per company) | Single |
| **Reusability** | None | Full reuse later | Multi |
| **Time to market** | Faster (1 week) | Slower (3 weeks) | Single |
| **Learning** | Lips only | All companies learn together | Multi |

**Decision:** **Single agent for MVP** (architect for multi-agent scaling)

**Why:**
- Lips is proving ground. One client = one set of requirements.
- If multi-agent from start, code bloats with `if org_id == hall ...` checks.
- Better to ship fast, learn, then generalize.

**Architecture note:** Code is already generic:
- `processLipsMessage(organizationId, messageBody, ...)`
- Job processor loops through all jobs regardless of org
- FAQ/piece keywords live in DB (not hardcoded) — can be per-organization later

**When to add:** Once Hall Donous or Viciados signs up, refactor to:
```typescript
const FAQ = await db.from('faq_responses').select('*').eq('org_id', orgId)
const KEYWORDS = await db.from('piece_keywords').select('*').eq('org_id', orgId)
```

---

### **5. Stateless Agent vs Stateful (Memory)**

| Aspect | Stateless | Stateful Memory | Winner |
|--------|---|---|---|
| **Complexity** | Simple | Complex (store state) | Stateless |
| **Conversation context** | ❌ No memory | ✅ Remembers | Stateful |
| **Scalability** | ✅ Infinite | ⚠️ Storage cost | Stateless |
| **Debugging** | ✅ Each msg independent | ⚠️ State mutations hard | Stateless |
| **Use case** | FAQ + catalog lookup | Multi-turn dialogue | Stateless |

**Decision:** **Stateless** for MVP

**Why:** 
- Customer: "Qual o preço?" → Agent: "Qual peça?" → Customer: "disco" → Agent: "R$ 10"
- This is simple Q&A. **No need to remember "customer asked about preço"** — context is in message thread.
- Stateful adds Redis/cache complexity. Not worth it for MVP.

**When to add:** If Lips wants multi-step flows like:
```
Customer: "Qual o preço?"
Agent: "Qual veículo?"
Customer: "Gol"
Agent: "Qual modelo: A, B, C?"
Customer: "B"
Agent: "Disco de freio modelo B = R$ 15"
```
Then add conversation state.

---

### **6. Webhook Async Job vs Sync Processing**

| Aspect | Async (now) | Sync (old) | Winner |
|--------|---|---|---|
| **Webhook response time** | 100ms | 5s (processing included) | Async |
| **Scalability** | ✅ N requests = N jobs queued | ❌ N requests = N processed | Async |
| **Failure handling** | ✅ Retry on error | ❌ Lost on error | Async |
| **Operational load** | ✅ Spread over time | ❌ Spike handling needed | Async |
| **Code flow** | ⚠️ Harder to follow | ✅ Linear | Sync |

**Decision:** **Async job creation** (webhook fast, processor separate)

**Why:** 
- If Evolution sends 100 msgs in 1 second, webhook must handle instantly.
- Webhook only creates job (~50ms), doesn't process (~1s).
- Processor runs on schedule, handles backlog gracefully.

---

## Rejected Alternatives

### **Rejected: Playwright Automation (WhatsApp Web)**

```
Driver: automated browser → WhatsApp Web → click send button
```

**Pros:**
- ✅ Uses existing WhatsApp Web setup (no new provider)
- ✅ No API credentials needed

**Cons:**
- ❌ **Fragile:** WhatsApp changes UI → script breaks
- ❌ **Slow:** Browser startup = 2-3s per message
- ❌ **Expensive:** 100 msgs/day = 5-10 browser instances = $500/month
- ❌ **Not scalable:** Can't handle spikes

**Why rejected:** Evolution API is cleaner, cheaper, faster. Automation is last resort.

---

### **Rejected: Firebase Cloud Functions**

```
Evolution webhook → Firebase Functions → auto-response
```

**Pros:**
- ✅ Simple to deploy
- ✅ Vendor manages scaling

**Cons:**
- ❌ **Vendor lock-in:** Can't port to other cloud
- ❌ **Blind spot:** No retry mechanism, no audit trail
- ❌ **Expensive:** Pays per invocation
- ❌ **Overkill:** Our job queue is simpler

**Why rejected:** We're on Vercel + Supabase. Job queue fits our stack better.

---

### **Rejected: Botpress / Dialogflow / Rasa**

```
Commercial chatbot platform → pre-built conversation flows
```

**Pros:**
- ✅ Pretty UI for building flows
- ✅ Multi-channel support (WhatsApp, FB, etc.)

**Cons:**
- ❌ **Vendor lock-in:** Hard to migrate data out
- ❌ **Cost:** R$ 500-2000/month
- ❌ **Overkill:** Lips only needs 5 FAQs
- ❌ **No integration:** Doesn't talk to our CRM/catalog

**Why rejected:** Our custom agent is simpler, cheaper, and integrates seamlessly.

---

### **Rejected: Claude API for Everything**

```
Every message → Claude → intelligent response
```

**Pros:**
- ✅ Smarter responses
- ✅ Can handle unexpected questions

**Cons:**
- ❌ **Cost:** R$ 300-500/month (unaffordable for MVP)
- ❌ **Latency:** 500ms-2s per response (bad UX)
- ❌ **Rate limits:** 100+ msg/day = hitting limits
- ❌ **Unreliable:** API can be slow/down

**Why rejected:** Save LLM for future intelligent features. MVP doesn't need it.

---

## Future Enhancements (Roadmap)

### **V1.1 — Reliability**
- [ ] Add cooldown (don't respond twice to same person in 5 min)
- [ ] Add retry with exponential backoff
- [ ] Add metrics (success rate, avg response time)
- [ ] Add alerting (Slack notification on errors)

### **V1.2 — Flexibility**
- [ ] Move FAQ to DB (admin can edit without redeploy)
- [ ] Add fuzzy matching for catalog (not just ILike)
- [ ] Add per-organization keywords/FAQ
- [ ] Add conversation context memory (stateful agent)

### **V2.0 — Intelligence**
- [ ] Add LLM layer for complex questions
- [ ] Add sentiment analysis (angry customer? escalate)
- [ ] Add handoff suggestion (agent confidence < 50%? offer human)
- [ ] Add multi-turn flows (step-by-step guide)

### **V2.1 — Scale**
- [ ] Port agent to Hall Donous (same architecture, different keywords)
- [ ] Port agent to Viciados, MK Shalom, etc.
- [ ] Add shared agent registry (one keyword = multiple companies)
- [ ] Add A/B testing (which FAQ response converts better?)

### **V3.0 — Autonomy**
- [ ] Autonomous booking (agent can schedule appointments directly)
- [ ] Autonomous payment (agent can invoice via Asaas)
- [ ] Autonomous follow-up (agent can send reminder messages)

---

## Review Checklist

Before merging to production:

- [ ] **Reliability:** Job queue tested with error scenarios
- [ ] **Safety:** Handoff always marks conversation as pending
- [ ] **Auditability:** All jobs logged in agent_automation_jobs
- [ ] **Performance:** Response time < 100ms (agents), < 30s (handoff)
- [ ] **Security:** No API keys in code, no secrets in logs
- [ ] **Documentation:** ADR + implementation guide updated
- [ ] **Monitoring:** Alert on error_code patterns
- [ ] **Rollback:** Can disable agent by setting processor limit=0

---

## Questions for Future Maintainers

**Q: Why is FAQ hardcoded and not in DB?**  
A: MVP trade-off. Hardcoding = deploy faster. As FAQ grows, move to DB.

**Q: Why not use LLM?**  
A: Cost (R$ 300/month) + latency (500ms) + overkill for simple FAQ. Use later when needed.

**Q: Why is handoff so slow (30s)?**  
A: Processor runs every 30s. For real-time, use Redis queue instead of DB.

**Q: Can we run multiple processors?**  
A: Yes! Processor is stateless. Run 3 instances, each processes 10 jobs/min. Just guard with `SELECT FOR UPDATE`.

**Q: What if agent generates wrong price?**  
A: Customer sees agent response, but conversation marked pending. Humano validates before customer pays. Safe.

**Q: Why not block groups?**  
A: We already check `isGroup=true` in webhook. Groups = zero jobs created.

**Q: Can we autorespond in groups?**  
A: NO. Against Lips policy. `is_group = true` → skip forever.

