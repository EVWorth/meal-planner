import { test } from "node:test";
import assert from "node:assert/strict";
import { buildImportRequest, parseImportResponse, requestHeaders, recipeSchema, chatbotPrompt, DEFAULT_AISLES } from "../src/core/index.js";

test("buildImportRequest: text import with structured output and fallbacks", () => {
  const body = buildImportRequest({ text: "Tacos...", sourceUrl: "https://x.test/t" });
  assert.equal(body.model, "claude-opus-5");
  assert.equal(body.fallbacks, "default");
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.messages[0].content.length, 1);
  assert.match(body.messages[0].content[0].text, /https:\/\/x\.test\/t[\s\S]*<recipe_source>\nTacos/);
});

test("buildImportRequest: image goes before the text block", () => {
  const body = buildImportRequest({ imageBase64: "AAAA" });
  assert.equal(body.messages[0].content[0].type, "image");
  assert.equal(body.messages[0].content[0].source.data, "AAAA");
  assert.equal(body.messages[0].content[1].type, "text");
});

test("schema restricts aisles to the configured list", () => {
  const s = recipeSchema(["A", "B"]);
  assert.deepEqual(s.properties.ingredients.items.properties.aisle.enum, ["A", "B"]);
  assert.equal(s.additionalProperties, false);
});

test("headers carry the key and the fallback beta", () => {
  const h = requestHeaders("sk-test");
  assert.equal(h["x-api-key"], "sk-test");
  assert.equal(h["anthropic-beta"], "server-side-fallback-2026-07-01");
});

const ok = (data, extra = {}) => ({ type: "message", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(data) }], ...extra });

test("parseImportResponse returns the recipe without the found flag", () => {
  const r = parseImportResponse(ok({ found: true, name: "Tacos", servings: 4, tags: [], ingredients: [], steps: [], notes: "" }));
  assert.equal(r.name, "Tacos");
  assert.ok(!("found" in r));
});

test("parseImportResponse reads the last text block after a fallback switch", () => {
  const body = ok({ found: true, name: "B" });
  body.content.unshift({ type: "fallback", from: { model: "a" }, to: { model: "b" } });
  assert.equal(parseImportResponse(body).name, "B");
});

test("parseImportResponse errors", () => {
  assert.throws(() => parseImportResponse(ok({ found: false })), /No recipe/);
  assert.throws(() => parseImportResponse({ stop_reason: "refusal", content: [] }), /declined/);
  assert.throws(() => parseImportResponse({ stop_reason: "max_tokens", content: [] }), /too long/);
  assert.throws(() => parseImportResponse({ type: "error", error: { message: "bad key" } }, 401), /key was rejected/);
  assert.throws(() => parseImportResponse({ type: "error", error: { message: "x" } }, 400), /Claude API error: x/);
  assert.throws(() => parseImportResponse({ content: [{ type: "text", text: "{oops" }] }), /valid JSON/);
});

test("chatbotPrompt lists the aisles", () => {
  assert.ok(chatbotPrompt().includes(DEFAULT_AISLES.join(", ")));
});
