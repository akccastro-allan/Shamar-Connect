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
  processLipsMessage,
  sendAndSaveResponse,
  checkCooldown,
  recordAutoReply,
} from "@/lib/agents/lips-simple-processor";

export const dynamic = "force-dynamic";

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
        // Marca como processing
        await db
          .from("agent_automation_jobs")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
          })
          .eq("id", job.id);

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

        // Autoenvio SEGURO: sem handoff obrigatório + permitido + dentro do cooldown
        const canAutoSend =
          processResult.shouldSend &&
          processResult.autoSendAllowed &&
          !processResult.requiresHandoff;

        if (canAutoSend) {
          // ========================================================================
          // Verificar cooldown antes de autoenviar
          // ========================================================================
          const cooldownCheck = await checkCooldown(
            db,
            job.conversation_id,
            processResult.response
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
              inboundMsg.from_id,
              processResult.response,
              false, // Não é handoff obrigatório
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

            // Atualizar status da conversa baseado no tipo de resposta
            const nextStatus = processResult.quoteOnly ? 'awaiting_customer' : 'open';
            await db
              .from("whatsapp_conversations")
              .update({
                status: nextStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.conversation_id);

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
              conversationStatus: nextStatus,
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
