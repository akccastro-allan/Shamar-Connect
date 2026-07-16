import { resolveSessionClient } from "../../providers/resolve-session";
import { createOpenWaSyncProvider } from "./openwa-sync-provider";

export function createDefaultOpenWaSyncProvider(sessionId: string) {
  return createOpenWaSyncProvider(sessionId, resolveSessionClient);
}
