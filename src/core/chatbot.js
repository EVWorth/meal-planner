// Prompt for turning a recipe into importable JSON with any chatbot
// (e.g. ChatGPT). The app never calls an AI itself; the user pastes the
// chatbot's reply back in with "Paste recipe JSON".
import { DEFAULT_AISLES } from "./aisles.js";

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
