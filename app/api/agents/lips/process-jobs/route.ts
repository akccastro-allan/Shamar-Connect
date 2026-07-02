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
import { processLipsMessage, sendAndSaveResponse } from "@/lib/agents/lips-simple-processor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const db = createSupabaseWriteClient();

    // Opcional: token simples de segurança
    const token = request.headers.get("x-processor-token");
    const expectedToken = process.env.LIPS_PROCESSOR_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: "Token inválido ou faltando" },
        { status: 401 }
      );
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

        // Processar mensagem
        const processResult = await processLipsMessage(
          db,
          job.organization_id,
          inboundMsg.body,
          inboundMsg.from_id,
          job.conversation_id
        );

        // Se deve responder, envia
        if (processResult.shouldSend) {
          const sendResult = await sendAndSaveResponse(
            db,
            job.organization_id,
            job.conversation_id,
            inboundMsg.from_id,
            processResult.response,
            processResult.requiresHandoff
          );

          if (!sendResult.success) {
            throw new Error(sendResult.error || "Falha ao enviar resposta");
          }

          // Atualiza job como done
          await db
            .from("agent_automation_jobs")
            .update({
              status: "done",
              completed_at: new Date().toISOString(),
              response_type: processResult.response?.type,
              response_text: processResult.response?.text,
              sent_to_evolution: true,
              outbound_message_id: sendResult.messageId,
            })
            .eq("id", job.id);

          results.push({
            jobId: job.id,
            status: "done",
            responded: true,
          });
        } else {
          // Não precisa responder (FAQ não matched, etc)
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
