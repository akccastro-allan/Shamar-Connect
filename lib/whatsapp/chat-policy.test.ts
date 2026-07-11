import assert from "node:assert/strict";
import test from "node:test";
import { isWhatsappGroupChat } from "./chat-policy.ts";

test("WhatsApp group chat ids are blocked", () => {
  assert.equal(isWhatsappGroupChat("120363000000000000@g.us"), true);
});

test("WhatsApp group flag is blocked even when id is not a group jid", () => {
  assert.equal(isWhatsappGroupChat("5511999999999@c.us", true), true);
});

test("WhatsApp individual chat ids are allowed", () => {
  assert.equal(isWhatsappGroupChat("5511999999999@c.us"), false);
});
