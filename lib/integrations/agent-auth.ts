import crypto from "node:crypto";
import type { NextRequest } from "next/server";

import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export class AgentAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AgentAuthError";
    this.status = status;
  }
}

export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function createAgentToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const trimmedToken = token.trim();

  return trimmedToken.length > 0 ? trimmedToken : null;
}

export function assertSetupToken(request: NextRequest, bodyToken?: string): void {
  const configuredToken = process.env.SHAMAR_AGENT_SETUP_TOKEN;

  if (!configuredToken) {
    throw new AgentAuthError("SHAMAR_AGENT_SETUP_TOKEN não configurado.", 500);
  }

  const bearerToken = getBearerToken(request);
  const receivedToken = bearerToken || bodyToken;

  if (!receivedToken || receivedToken !== configuredToken) {
    throw new AgentAuthError("Token técnico inválido.", 401);
  }
}

export async function getAuthenticatedAgent(request: NextRequest) {
  const agentToken = getBearerToken(request);

  if (!agentToken) {
    throw new AgentAuthError("Token do agente não informado.", 401);
  }

  const supabase = createSupabaseWriteClient();
  const agentTokenHash = hashSecret(agentToken);

  const { data: agent, error: agentError } = await supabase
    .from("integration_agents")
    .select("*")
    .eq("agent_token_hash", agentTokenHash)
    .in("status", ["pending", "active"])
    .limit(1)
    .maybeSingle();

  if (agentError) {
    throw new Error("Erro ao autenticar o agente.");
  }

  if (!agent) {
    throw new AgentAuthError("Agente não autorizado.", 401);
  }

  const sourceId = (agent as any).integration_source_id || (agent as any).source_id;

  if (!sourceId) {
    throw new AgentAuthError("Origem de integração não vinculada ao agente.", 401);
  }

  const { data: source, error: sourceError } = await supabase
    .from("integration_sources")
    .select("*")
    .eq("id", sourceId)
    .limit(1)
    .maybeSingle();

  if (sourceError) {
    throw new Error("Erro ao carregar a origem de integração do agente.");
  }

  if (!source) {
    throw new AgentAuthError("Origem de integração não encontrada.", 401);
  }

  return {
    agent: agent as any,
    source: source as any,
    agentTokenHash,
  };
}

export function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

export async function touchAgentSeen(
  agentId: string,
  request: NextRequest,
  values?: Record<string, any>,
): Promise<void> {
  const supabase = createSupabaseWriteClient();

  await supabase
    .from("integration_agents")
    .update({
      last_seen_at: new Date().toISOString(),
      last_ip: getRequestIp(request),
      ...(values || {}),
    })
    .eq("id", agentId);
}
