import assert from "node:assert/strict";
import test from "node:test";
import { resolveChannelFromWebhook } from "./resolve-channel.ts";

type ChannelRow = {
  id: string;
  tenant_id: string | null;
  organization_id: string | null;
  provider?: string | null;
  session_id?: string | null;
  external_instance?: string | null;
};

function createDb(channels: ChannelRow[]) {
  class Query {
    private filters: Array<(row: ChannelRow) => boolean> = [];
    private limitValue: number | null = null;

    select() { return this; }
    eq(column: keyof ChannelRow, value: string) {
      this.filters.push((row) => row[column] === value);
      return this;
    }
    limit(value: number) {
      this.limitValue = value;
      return this;
    }
    then(resolve: (value: { data: ChannelRow[] }) => void) {
      const rows = channels.filter((row) => this.filters.every((filter) => filter(row)));
      resolve({ data: this.limitValue === null ? rows : rows.slice(0, this.limitValue) });
    }
  }

  return {
    from(table: string) {
      assert.equal(table, "channels");
      return new Query();
    },
  } as any;
}

test("resolveChannelFromWebhook resolves OpenWA legacy session aliases from external_instance", async () => {
  const result = await resolveChannelFromWebhook(createDb([
    {
      id: "channel-1",
      tenant_id: "tenant-1",
      organization_id: "org-1",
      provider: "openwa",
      session_id: "lips-main",
      external_instance: "3bbeabde-1f13-411c-97d8-28900ab1fea1",
    },
  ]), "openwa", { sessionId: "3bbeabde-1f13-411c-97d8-28900ab1fea1" });

  assert.deepEqual(result, {
    channelId: "channel-1",
    tenantId: "tenant-1",
    organizationId: "org-1",
    provider: "whatsapp_web_legacy",
  });
});

test("resolveChannelFromWebhook does not resolve ambiguous OpenWA external_instance aliases", async () => {
  const result = await resolveChannelFromWebhook(createDb([
    {
      id: "channel-1",
      tenant_id: "tenant-1",
      organization_id: "org-1",
      provider: "openwa",
      session_id: "lips-main",
      external_instance: "shared-session",
    },
    {
      id: "channel-2",
      tenant_id: "tenant-2",
      organization_id: "org-2",
      provider: "whatsapp_web",
      session_id: "hall-main",
      external_instance: "shared-session",
    },
  ]), "openwa", { sessionId: "shared-session" });

  assert.equal(result, null);
});
