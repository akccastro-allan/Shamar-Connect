/**
 * POST /api/agents/lips/test-cooldown
 * Testa cooldown com múltiplas mensagens na mesma conversa
 *
 * Body: { "conversationId": "uuid" }
 * Response: array com resultados de cada teste
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import {
  checkCooldown,
  recordAutoReply,
} from "@/lib/agents/lips-simple-processor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "conversationId obrigatório" },
        { status: 400 }
      );
    }

    const db = createSupabaseWriteClient();
    const results: any[] = [];

    // ========================================================================
    // TESTE 1: Primeira resposta automática "Bom dia" → deve permitir
    // ========================================================================
    console.log("[test-cooldown] Teste 1: Primeira resposta (Bom dia)");
    const response1 = "⏰ **Horário de funcionamento:**...";
    const cooldown1 = await checkCooldown(db, conversationId, response1);
    results.push({
      test: 1,
      message: "Primeira resposta (Bom dia)",
      allowed: cooldown1.allowed,
      reason: cooldown1.reason,
      expected: true,
      passed: cooldown1.allowed === true,
    });

    if (cooldown1.allowed) {
      // Registrar resposta
      await recordAutoReply(db, "8f074193-bf58-4537-9842-720619a9f259", conversationId, response1);
    }

    // ========================================================================
    // TESTE 2: Mesma resposta em menos de 5 min → deve bloquear (duplicate)
    // ========================================================================
    console.log("[test-cooldown] Teste 2: Resposta duplicada dentro do cooldown");
    const cooldown2 = await checkCooldown(db, conversationId, response1);
    results.push({
      test: 2,
      message: "Resposta duplicada (mesma resposta em menos de 5 min)",
      allowed: cooldown2.allowed,
      reason: cooldown2.reason,
      expected: false,
      passed: cooldown2.allowed === false && cooldown2.reason?.includes("cooldown_active"),
    });

    // ========================================================================
    // TESTE 3: Resposta diferente em menos de 5 min → deve bloquear (cooldown)
    // ========================================================================
    console.log("[test-cooldown] Teste 3: Resposta diferente dentro do cooldown");
    const response3 = "Encontrei algumas peças! 📋...";
    const cooldown3 = await checkCooldown(db, conversationId, response3);
    results.push({
      test: 3,
      message: "Resposta diferente (dentro do cooldown)",
      allowed: cooldown3.allowed,
      reason: cooldown3.reason,
      expected: false,
      passed: cooldown3.allowed === false && cooldown3.reason?.includes("cooldown_active"),
    });

    // ========================================================================
    // TESTE 4: Simular passagem de tempo (clearar cooldown)
    // ========================================================================
    console.log("[test-cooldown] Teste 4: Limpar cooldown manualmente");
    await db
      .from("agent_automation_cooldown")
      .delete()
      .eq("conversation_id", conversationId);

    const cooldown4 = await checkCooldown(db, conversationId, response3);
    results.push({
      test: 4,
      message: "Resposta após limpar cooldown (novo período)",
      allowed: cooldown4.allowed,
      reason: cooldown4.reason,
      expected: true,
      passed: cooldown4.allowed === true,
    });

    // ========================================================================
    // RESUMO
    // ========================================================================
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    return NextResponse.json({
      ok: true,
      conversationId,
      summary: {
        total,
        passed,
        failed: total - passed,
      },
      details: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[test-cooldown]", msg);

    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
