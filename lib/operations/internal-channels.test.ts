import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInternalChannelMetadata,
  isInternalBusinessOrganization,
  isValidInternalWhatsappSessionId,
  makeInternalChannelSlug,
  resolveInternalBusinessKey,
  resolveProviderForInternalChannel,
} from "./internal-channels.ts";

test("internal business resolver allows only Allan/Moriah operations", () => {
  assert.equal(resolveInternalBusinessKey({ id: "1", name: "Viciados em Trilhas", slug: "viciados" }), "viciados");
  assert.equal(resolveInternalBusinessKey({ id: "2", name: "Shamar Kids", slug: "shamarkids" }), "shamar-kids");
  assert.equal(isInternalBusinessOrganization({ id: "3", name: "Moriah Systems", slug: "moriah" }), true);
});

test("client organizations are never treated as internal command center businesses", () => {
  assert.equal(resolveInternalBusinessKey({ id: "1", name: "Lips", slug: "lips" }), null);
  assert.equal(resolveInternalBusinessKey({ id: "2", name: "Hall Donous", slug: "hall-donous" }), null);
  assert.equal(resolveInternalBusinessKey({ id: "3", name: "NutriFlow", slug: "nutriflow" }), null);
});

test("internal channel metadata stores routing context without secrets", () => {
  const metadata = buildInternalChannelMetadata({
    businessKey: "shamar-kids",
    channelType: "whatsapp_web",
    accountLabel: "Pais",
    externalAccountId: "external-1",
    purpose: "parents",
    featureStage: "internal_alpha",
  });

  assert.equal(metadata.commandCenterInternal, true);
  assert.equal(metadata.businessKey, "shamar-kids");
  assert.equal(Object.hasOwn(metadata, "accessToken"), false);
  assert.equal(Object.hasOwn(metadata, "secret"), false);
});

test("provider mapping keeps WhatsApp Web on gateway and Facebook on Messenger", () => {
  assert.deepEqual(resolveProviderForInternalChannel("whatsapp_web"), { provider: "openwa", providerType: "web_gateway" });
  assert.deepEqual(resolveProviderForInternalChannel("facebook"), { provider: "messenger", providerType: "official_api" });
});

test("channel slug includes business and account context", () => {
  assert.equal(makeInternalChannelSlug({ businessKey: "shamar-kids", channelType: "whatsapp_web", accountLabel: "Pais e responsáveis" }), "shamar-kids-whatsapp-web-pais-e-responsaveis");
});

test("internal WhatsApp session ids use business dash number from 01 to 09", () => {
  assert.equal(isValidInternalWhatsappSessionId("viciados-01", "viciados"), true);
  assert.equal(isValidInternalWhatsappSessionId("shamar-kids-09", "shamar-kids"), true);
  assert.equal(isValidInternalWhatsappSessionId("viciados-00", "viciados"), false);
  assert.equal(isValidInternalWhatsappSessionId("viciados-10", "viciados"), false);
  assert.equal(isValidInternalWhatsappSessionId("viciados-main", "viciados"), false);
  assert.equal(isValidInternalWhatsappSessionId("Viciados-01", "viciados"), false);
  assert.equal(isValidInternalWhatsappSessionId("viciados_01", "viciados"), false);
});
