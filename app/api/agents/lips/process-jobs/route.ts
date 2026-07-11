/**
 * POST /api/agents/lips/process-jobs
 * Processa jobs pendentes da fila de automação
 *
 * Pode ser chamado por:
 * - Cron externo (GitHub Actions, Vercel Cron no futuro)
 * - Shamar Agent local
 * - Manual (debug)
 *
 * Body (opcional):
 * { "limit": 10, "token": "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import {
  applyLipsConversationState,
  processLipsMessage,
  sendAndSaveResponse,
  checkCooldown,
  recordAutoReply,
} from "@/lib/agents/lips-simple-processor";

export const dynamic = "force-dynamic";

function hasPriceInResponse(response: string) {
  const normalized = response
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return /\bValor:\s*R\$/i.test(normalized);
}

function isOfficialAutoReply(result: Awaited<ReturnType<typeof processLipsMessage>>) {
  if (!result.shouldSend || !result.autoSendAllowed) return false;

  const isSafeHandoff = Boolean(
    result.requiresHandoff &&
      result.department &&
      ["Balcão", "Oficina", "Supervisor"].includes(result.department) &&
      result.handoffReason,
  );

  if (result.quoteOnly) {
    return (
      (
        (result.intent === "quote" && hasPriceInResponse(result.response)) ||
        (result.intent === "quote_options" && /R\$\s*\d/i.test(result.response))
      ) &&
      (!result.requiresHandoff || isSafeHandoff)
    );
  }

  if (result.intent === "menu") {
    return !result.requiresHandoff;
  }

  if (result.intent === "quote_context") {
    return !result.requiresHandoff;
  }

  if (result.intent === "nao_encontrado") {
    return !result.requiresHandoff && result.response.includes("Não encontrei essa peça com segurança");
  }

  if (["need_vehicle_year", "need_brake_position", "need_catalog_application", "need_side", "need_vertical_position"].includes(result.intent)) {
    return !result.requiresHandoff;
  }

  return isSafeHandoff;
}

function isCatalogContinuation(result: Awaited<ReturnType<typeof processLipsMessage>>) {
  return [
    "need_catalog_application",
    "need_brake_position",
    "need_side",
    "need_vertical_position",
    "quote_context",
    "quote",
    "quote_options",
    "nao_encontrado",
  ].includes(result.intent);
}

async function countConsecutiveInboundMessages(
  db: ReturnType<typeof createSupabaseWriteClient>,
  conversationId: string,
  currentMessageCreatedAt?: string | null,
) {
  let query = db
    .from("whatsapp_messages")
    .select("id, direction, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (currentMessageCreatedAt) {
    query = query.lte("created_at", currentMessageCreatedAt);
  }

  const { data, error } = await query;
  if (error) throw error;

  let count = 0;
  for (const message of data || []) {
    if (message.direction !== "inbound") break;
    count += 1;
  }

  return count;
}

export async function POST(request: NextRequest) {
  try {
    const db = createSupabaseWriteClient();

    // ========================================================================
    // SEGURANÇA: Validar token de processamento
    // ========================================================================

    const isProduction = process.env.NODE_ENV === "production";
    const token = request.headers.get("x-processor-token");
    const expectedToken = process.env.LIPS_PROCESSOR_TOKEN;

    // Em produção, token é OBRIGATÓRIO
    if (isProduction && !expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Token não configurado em produção" },
        { status: 403 }
      );
    }

    // Se token estiver configurado, validar
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Token inválido ou faltando" },
        { status: 401 }
      );
    }

    // Em dev, aviso se não houver token
    if (!isProduction && !expectedToken) {
      console.warn("[lips-processor] AVISO: LIPS_PROCESSOR_TOKEN não configurado (dev mode)");
    }

    // Parâmetros
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(body.limit || 10, 100); // Max 100 por request

    // ========================================================================
    // 1. Buscar jobs pendentes
    // ========================================================================
    const { data: jobs, error: fetchError } = await db
      .from("agent_automation_jobs")
      .select("*")
      .eq("status", "pending")
      .eq("agent_type", "lips-auto")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: `Erro ao buscar jobs: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "Nenhum job pendente",
      });
    }

    // ========================================================================
    // 2. Processar cada job
    // ========================================================================
    const results: any[] = [];

    for (const job of jobs) {
      try {
        // Claim idempotente: se outro worker já pegou, não processa de novo.
        const { data: claimed } = await db
          .from("agent_automation_jobs")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
          })
          .eq("id", job.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();

        if (!claimed?.id) {
          results.push({ jobId: job.id, status: "skipped", reason: "already_claimed" });
          continue;
        }

        // Fetch da mensagem inbound
        const { data: inboundMsg } = await db
          .from("whatsapp_messages")
          .select("*")
          .eq("id", job.message_id)
          .single();

        if (!inboundMsg) {
          throw new Error("Mensagem inbound não encontrada");
        }

        // Fetch da conversa
        const { data: conversation } = await db
          .from("whatsapp_conversations")
          .select("*")
          .eq("id", job.conversation_id)
          .single();

        if (!conversation) {
          throw new Error("Conversa não encontrada");
        }

        const inboundMessageType = inboundMsg.message_type || "text";
        const isTextInbound = ["text", "chat"].includes(inboundMessageType);

        if (inboundMsg.direction !== "inbound" || conversation.is_group || !isTextInbound || !inboundMsg.body) {
          const responseType = conversation.is_group
            ? "group_skipped"
            : inboundMsg.direction !== "inbound"
              ? "non_inbound_skipped"
              : `${inboundMessageType}_requires_human`;

          if (!conversation.is_group && inboundMsg.direction === "inbound" && !isTextInbound) {
            await db
              .from("whatsapp_conversations")
              .update({
                status: "pending",
                requires_human: true,
                pending_reason: `${inboundMessageType}_requires_human`,
                sla_status: "pending",
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.conversation_id);
          }

          await db
            .from("agent_automation_jobs")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
              response_type: responseType,
              sent_to_evolution: false,
              outbound_message_id: null,
            })
            .eq("id", job.id);

          results.push({ jobId: job.id, status: "done", responded: false, responseType });
          continue;
        }

        const consecutiveInboundCount = await countConsecutiveInboundMessages(
          db,
          job.conversation_id,
          inboundMsg.created_at,
        );

        if (consecutiveInboundCount >= 2) {
          const handoffResult = {
            response: "Recebi suas mensagens. Vou chamar um atendente do balcão para continuar seu atendimento.",
            shouldSend: true,
            autoSendAllowed: true,
            requiresHandoff: true,
            department: "Balcão" as const,
            handoffReason: "multiple_unanswered_inbounds",
            slaMinutes: 15,
            confidence: 0.95,
            intent: "balcao",
          };

          await applyLipsConversationState(db, job.organization_id, job.conversation_id, handoffResult);

          const sendResult = await sendAndSaveResponse(
            db,
            job.organization_id,
            job.conversation_id,
            conversation.external_chat_id || inboundMsg.from_id,
            handoffResult.response,
            true,
            "Balcão",
          );

          if (!sendResult.success) {
            throw new Error(sendResult.error || "Falha ao enviar handoff para atendente");
          }

          await db
            .from("agent_automation_jobs")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
              response_type: "multiple_unanswered_inbounds_handoff",
              response_text: handoffResult.response,
              sent_to_evolution: true,
              outbound_message_id: sendResult.messageId,
            })
            .eq("id", job.id);

          results.push({
            jobId: job.id,
            status: "done",
            responded: true,
            responseType: "multiple_unanswered_inbounds_handoff",
            conversationStatus: "pending",
          });
          continue;
        }

        // Processar mensagem com lógica de autoenvio controlado
        const processResult = await processLipsMessage(
          db,
          job.organization_id,
          inboundMsg.body,
          inboundMsg.from_id,
          job.conversation_id
        );

        // ========================================================================
        // Decidir se autoenviar ou requerer handoff humano
        // ========================================================================

        // Autoenvio oficial: menu, cotação segura ou direcionamento humano seguro.
        const autoReplyAllowedPendingReasons = new Set(["new_inbound_message", "auto_quote_idle", "quote_context"]);
        const isAwaitingHuman = Boolean(
          conversation.requires_human &&
            (!conversation.pending_reason || !autoReplyAllowedPendingReasons.has(conversation.pending_reason)),
        );

        const canAutoSend =
          !isAwaitingHuman &&
          isTextInbound &&
          isOfficialAutoReply(processResult);

        if (canAutoSend) {
          if (processResult.requiresHandoff) {
            await applyLipsConversationState(db, job.organization_id, job.conversation_id, processResult);
          }

          // ========================================================================
          // Verificar cooldown antes de autoenviar
          // ========================================================================
          const cooldownCheck = await checkCooldown(
            db,
            job.conversation_id,
            processResult.response,
            { allowWithinCooldown: processResult.requiresHandoff || isCatalogContinuation(processResult) }
          );

          if (!cooldownCheck.allowed) {
            // ❌ Bloqueado por cooldown: salvar sugestão para humano
            console.log(
              `[lips-processor] Job ${job.id} bloqueado por cooldown: ${cooldownCheck.reason}`
            );

            await db
              .from("agent_automation_jobs")
              .update({
                status: "done",
                completed_at: new Date().toISOString(),
                response_type: `${processResult.intent}_blocked_cooldown`,
                response_text: processResult.response,
                sent_to_evolution: false,
                outbound_message_id: null,
              })
              .eq("id", job.id);

            results.push({
              jobId: job.id,
              status: "done",
              responded: false,
              blockedBy: cooldownCheck.reason,
              suggestion: processResult.response,
              confidence: processResult.confidence,
            });
          } else {
            // ✅ AUTOENVIO PERMITIDO: enviar direto via Evolution
            const sendResult = await sendAndSaveResponse(
              db,
              job.organization_id,
              job.conversation_id,
              conversation.external_chat_id || inboundMsg.from_id,
              processResult.response,
              processResult.requiresHandoff,
              processResult.department
            );

            if (!sendResult.success) {
              throw new Error(sendResult.error || "Falha ao enviar resposta");
            }

            // Registrar no cooldown
            await recordAutoReply(
              db,
              job.organization_id,
              job.conversation_id,
              processResult.response
            );

            if (!processResult.requiresHandoff) {
              await applyLipsConversationState(db, job.organization_id, job.conversation_id, processResult);
            }

            // Marca job como done
            await db
              .from("agent_automation_jobs")
              .update({
                status: "done",
                completed_at: new Date().toISOString(),
                response_type: processResult.intent,
                response_text: processResult.response,
                sent_to_evolution: true,
                outbound_message_id: sendResult.messageId,
              })
              .eq("id", job.id);

            results.push({
              jobId: job.id,
              status: "done",
              responded: true, // ← Resposta enviada automaticamente
              quoteOnly: processResult.quoteOnly,
              conversationStatus: processResult.requiresHandoff ? "pending" : "open",
              confidence: processResult.confidence,
            });
          }
        } else if (processResult.shouldSend) {
          // ⚠️ SUGESTÃO (não autoenvio): salvar para humano revisar
          await db
            .from("agent_automation_jobs")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
              response_type: `${processResult.intent}_suggestion`,
              response_text: processResult.response,
              sent_to_evolution: false,
              outbound_message_id: null,
            })
            .eq("id", job.id);

          // Marcar conversa para human review se necessário
          if (processResult.requiresHandoff) {
            await db
              .from("whatsapp_conversations")
              .update({
                status: "pending",
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.conversation_id);
          }

          results.push({
            jobId: job.id,
            status: "done",
            responded: false,
            suggestion: processResult.response,
            requiresHandoff: processResult.requiresHandoff,
            department: processResult.department,
          });
        } else {
          // Não precisa de resposta ou sugestão
          await db
            .from("agent_automation_jobs")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({
            jobId: job.id,
            status: "done",
            responded: false,
          });
        }
      } catch (jobError) {
        const errorMsg = jobError instanceof Error ? jobError.message : String(jobError);
        console.error(`[lips-processor] Job ${job.id} falhou:`, errorMsg);

        // Marca job como error
        await db
          .from("agent_automation_jobs")
          .update({
            status: "error",
            completed_at: new Date().toISOString(),
            error_message: errorMsg,
            error_code: "PROCESSING_FAILED",
          })
          .eq("id", job.id);

        results.push({
          jobId: job.id,
          status: "error",
          error: errorMsg,
        });
      }
    }

    // ========================================================================
    // 3. Retornar resultado
    // ========================================================================
    const completed = results.filter(r => r.status === "done").length;
    const failed = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      ok: true,
      processed: results.length,
      completed,
      failed,
      details: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[lips-processor] Erro geral:", msg);

    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
