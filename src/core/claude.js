// Anthropic Messages API request/response shapes for recipe import.
// Building and parsing are pure; the Scriptable layer does the HTTP call.
import { DEFAULT_AISLES } from "./aisles.js";

export const API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-opus-5";

export function recipeSchema(aisles = DEFAULT_AISLES) {
  const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
  return {
    type: "object",
    additionalProperties: false,
    required: ["found", "name", "servings", "tags", "ingredients", "steps", "notes"],
    properties: {
      found: { type: "boolean", description: "false if the input contains no recipe" },
      name: { type: "string" },
      servings: { anyOf: [{ type: "integer" }, { type: "null" }] },
      tags: { type: "array", items: { type: "string" } },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["qty", "unit", "item", "note", "aisle"],
          properties: {
            qty: nullableNumber,
            unit: { type: "string" },
            item: { type: "string" },
            note: { type: "string" },
            aisle: { type: "string", enum: aisles },
          },
        },
      },
      steps: { type: "array", items: { type: "string" } },
      notes: { type: "string" },
    },
  };
}

const SYSTEM = `You turn recipes into structured data for a household meal planner and grocery list.

Ingredients:
- qty is a number (convert fractions: "1 1/2" -> 1.5); use the upper bound of a range; null when no amount is given ("salt to taste").
- unit is a short standard unit when there is one: tsp, tbsp, cup, fl oz, pint, quart, ml, l, g, kg, oz, lb, or a count word like clove, can, bunch, slice. Use "" for plain counts ("2 onions").
- item is the thing you buy, without preparation ("onion", not "onion, diced"). Put preparation and size details in note.
- aisle is where the item is found in a grocery store.

Steps are the method, one string per step, without numbering. Tags are a few short lowercase words (cuisine, main protein, meal type).
Keep the recipe's own wording and amounts; don't invent ingredients. If the input holds no recipe, set found to false and leave the other fields empty.`;

/**
 * Request body for importing a recipe from text and/or an image.
 * @param {{model?:string, aisles?:string[], text?:string, sourceUrl?:string, imageBase64?:string, mediaType?:string}} o
 */
export function buildImportRequest({ model = DEFAULT_MODEL, aisles = DEFAULT_AISLES, text = "", sourceUrl = "", imageBase64 = "", mediaType = "image/jpeg" } = {}) {
  const content = [];
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } });
  }
  let prompt = imageBase64 ? "Extract the recipe in this photo." : "Extract the recipe from this text.";
  if (sourceUrl) prompt += `\nSource page: ${sourceUrl}`;
  if (text) prompt += `\n\n<recipe_source>\n${text}\n</recipe_source>`;
  content.push({ type: "text", text: prompt });
  return {
    model,
    max_tokens: 16000,
    fallbacks: "default",
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: recipeSchema(aisles) } },
    messages: [{ role: "user", content }],
  };
}

export function requestHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "server-side-fallback-2026-07-01",
    "content-type": "application/json",
  };
}

/**
 * Recipe input (for normalizeRecipe) from an API response body.
 * Throws a readable Error for API errors, refusals, truncation, or "no recipe".
 */
export function parseImportResponse(body, statusCode = 200) {
  if (!body || typeof body !== "object") throw new Error("Empty response from the Claude API.");
  if (body.type === "error" || statusCode >= 400) {
    const msg = body.error?.message ?? `HTTP ${statusCode}`;
    if (statusCode === 401) throw new Error("The Claude API key was rejected. Check it in Settings.");
    if (statusCode === 429) throw new Error("Claude API rate limit hit. Try again in a minute.");
    if (statusCode === 529 || statusCode >= 500) throw new Error("The Claude API is busy. Try again shortly.");
    throw new Error("Claude API error: " + msg);
  }
  if (body.stop_reason === "refusal") throw new Error("Claude declined to read this recipe.");
  if (body.stop_reason === "max_tokens") throw new Error("The recipe was too long to finish reading.");
  const texts = (body.content ?? []).filter((b) => b.type === "text");
  const last = texts[texts.length - 1];
  if (!last) throw new Error("Claude returned no recipe.");
  let data;
  try {
    data = JSON.parse(last.text);
  } catch {
    throw new Error("Claude's reply wasn't valid JSON.");
  }
  if (!data.found) throw new Error("No recipe found in that input.");
  const { found, ...recipe } = data;
  return recipe;
}

/** Prompt to paste into any chatbot (e.g. ChatGPT) to get importable JSON. */
export function chatbotPrompt(aisles = DEFAULT_AISLES) {
  return `Convert the recipe below into JSON for my meal planner. Reply with only the JSON, in a code block, shaped like this:

{
  "name": "Chicken Tacos",
  "servings": 4,
  "tags": ["mexican", "chicken"],
  "ingredients": [
    { "qty": 1.5, "unit": "lb", "item": "chicken thighs", "note": "boneless", "aisle": "Meat & Seafood" },
    { "qty": null, "unit": "", "item": "salt", "note": "to taste", "aisle": "Spices" }
  ],
  "steps": ["Season the chicken.", "Grill 6 minutes per side."],
  "sourceUrl": "",
  "notes": ""
}

Rules: qty is a number or null. unit is tsp, tbsp, cup, fl oz, ml, l, g, kg, oz, lb, a count word (clove, can, bunch), or "". item is what you buy, without preparation; put preparation in note. aisle is one of: ${aisles.join(", ")}.

Recipe:
`;
}
