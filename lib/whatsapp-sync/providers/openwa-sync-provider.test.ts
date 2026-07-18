import assert from "node:assert/strict";
import test from "node:test";
import { createOpenWaSyncProvider, isOpenWaConnected } from "./openwa-sync-provider.ts";

test("OpenWA sync adapter reuses the existing session client", async () => {
  const calls: string[] = [];
  const resolver = (sessionId: string) => ({
    sessionId,
    client: {
      async getStatus() {
        calls.push("getStatus");
        return { provider: "whatsapp_web" as const, status: "ready" as const };
      },
      async listChats(options?: { limit?: number; offset?: number }) {
        calls.push("listChats");
        assert.deepEqual(options, { limit: 5, offset: 10 });
        return [{ id: "5511999999999@c.us", name: "Cliente", isGroup: false }];
      },
      async listChatMessages(chatId: string, limit?: number) {
        calls.push(`listChatMessages:${chatId}:${limit}`);
        return [{ id: "m1", chatId, direction: "inbound" as const, body: "oi", timestamp: 1 }];
      },
      connect: async () => ({ provider: "whatsapp_web" as const, status: "ready" as const }),
      getQr: async () => ({ provider: "whatsapp_web" as const, status: "qr" as const }),
      sendMessage: async () => ({ id: "sent", status: "sent" as const }),
      listGroups: async () => [],
      listGroupParticipants: async () => [],
      logout: async () => ({ provider: "whatsapp_web" as const, status: "disconnected" as const }),
    },
  });

  const provider = createOpenWaSyncProvider("lips-main", resolver);

  assert.equal(await provider.getConnectionStatus(), "ready");
  assert.deepEqual(await provider.listChats({ limit: 5, offset: 10 }), [{ id: "5511999999999@c.us", name: "Cliente", isGroup: false }]);
  assert.equal((await provider.listChatMessages("5511999999999@c.us", 50))[0]?.id, "m1");
  assert.deepEqual(calls, ["getStatus", "listChats", "listChatMessages:5511999999999@c.us:50"]);
});

test("OpenWA connected status accepts ready and authenticated only", () => {
  assert.equal(isOpenWaConnected("ready"), true);
  assert.equal(isOpenWaConnected("authenticated"), true);
  assert.equal(isOpenWaConnected("disconnected"), false);
  assert.equal(isOpenWaConnected("qr"), false);
});
