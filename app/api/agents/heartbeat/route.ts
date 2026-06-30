/**
 * POST /api/agents/heartbeat
 * Alias público para /api/integrations/agent/health.
 */
export const dynamic = "force-dynamic";
export { POST } from "@/app/api/integrations/agent/health/route";
