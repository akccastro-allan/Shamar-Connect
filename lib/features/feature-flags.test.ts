import assert from "node:assert/strict";
import { test } from "node:test";
import type { AppContext } from "../auth/app-context.ts";
import { canAccessCommandCenter, canAccessInternalFeature, canAccessMetaChannels, canAccessPlatformAdmin, canUseFeature, hasTenantFeature, toFeatureContext } from "./feature-flags.ts";

function context(overrides: Partial<AppContext> = {}): AppContext {
  return {
    tenantId: "tenant-1",
    organizationId: "org-1",
    appUserId: "user-1",
    tenantUserId: "tenant-user-1",
    role: "owner",
    email: "admin@example.com",
    name: "Admin",
    isPlatformTenant: false,
    ...overrides,
  };
}

test("tenant feature flag only returns true for explicit true", () => {
  assert.equal(hasTenantFeature({ features: { command_center: true } }, "command_center"), true);
  assert.equal(hasTenantFeature({ features: { command_center: false } }, "command_center"), false);
  assert.equal(hasTenantFeature({ features: { command_center: "true" } }, "command_center"), false);
  assert.equal(hasTenantFeature(null, "command_center"), false);
});

test("platform admin requires platform tenant and owner/admin role", () => {
  assert.equal(canAccessPlatformAdmin(context({ isPlatformTenant: true, role: "owner" })), true);
  assert.equal(canAccessPlatformAdmin(context({ isPlatformTenant: true, role: "admin" })), true);
  assert.equal(canAccessPlatformAdmin(context({ isPlatformTenant: true, role: "attendant" })), false);
  assert.equal(canAccessPlatformAdmin(context({ isPlatformTenant: false, role: "owner" })), false);
});

test("command center requires platform admin and explicit command_center flag", () => {
  const metadata = { features: { command_center: true } };

  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: true, role: "owner" }), metadata), true);
  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: true, role: "admin" }), metadata), true);
  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: true, role: "attendant" }), metadata), false);
  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: true, role: "viewer" }), metadata), false);
  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: false, role: "owner" }), metadata), false);
  assert.equal(canAccessCommandCenter(context({ isPlatformTenant: true, role: "owner" }), { features: {} }), false);
});

test("internal channel flags require command center access", () => {
  const metadata = { features: { command_center: true, whatsapp_groups_internal: true, social_channels_internal: true } };

  assert.equal(canAccessInternalFeature("whatsapp_groups_internal", context({ isPlatformTenant: true, role: "owner" }), metadata), true);
  assert.equal(canAccessInternalFeature("social_channels_internal", context({ isPlatformTenant: true, role: "admin" }), metadata), true);
  assert.equal(canAccessInternalFeature("whatsapp_communities_internal", context({ isPlatformTenant: true, role: "owner" }), metadata), false);
  assert.equal(canAccessInternalFeature("whatsapp_groups_internal", context({ isPlatformTenant: false, role: "owner" }), metadata), false);
});

test("meta channels remain hidden during WhatsApp-only commercial release", () => {
  assert.equal(canAccessMetaChannels(context({ isPlatformTenant: true }), null), false);
  assert.equal(canAccessMetaChannels(context(), { features: { meta_channels: true } }), false);
  assert.equal(canAccessMetaChannels(context(), { features: { meta_channels: false } }), false);
});

test("client tenants never access internal or future features", () => {
  const client = toFeatureContext(context(), { features: { catalog: true, command_center: true } });

  assert.equal(canUseFeature("whatsapp", client), true);
  assert.equal(canUseFeature("inbox", client), true);
  assert.equal(canUseFeature("catalog", client), true);
  assert.equal(canUseFeature("command_center", client), false);
  assert.equal(canUseFeature("platform_admin", client), false);
  assert.equal(canUseFeature("meta_readiness", client), false);
  assert.equal(canUseFeature("instagram", client), false);
  assert.equal(canUseFeature("ai_assistant", client), false);
  assert.equal(canUseFeature("omnichannel", client), false);
});

test("platform owner can use current platform features but not future channels", () => {
  const platform = toFeatureContext(context({ isPlatformTenant: true, role: "owner" }), null);

  assert.equal(canUseFeature("platform_admin", platform), true);
  assert.equal(canUseFeature("command_center", platform), true);
  assert.equal(canUseFeature("meta_readiness", platform), true);
  assert.equal(canUseFeature("instagram", platform), false);
  assert.equal(canUseFeature("facebook", platform), false);
  assert.equal(canUseFeature("tiktok", platform), false);
  assert.equal(canUseFeature("email", platform), false);
  assert.equal(canUseFeature("experimental", platform), false);
});
