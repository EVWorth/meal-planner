// Prompt for turning a recipe into importable JSON with any AI chat app.
// The app never calls an AI itself; the user pastes the reply back in with
// "Paste recipe JSON" or shares it to the script.

/** Prompt asking for schema.org Recipe JSON-LD, in the form the app stores. */
export function chatbotPrompt() {
  return `Convert the recipe below into schema.org Recipe JSON-LD for my meal planner. Reply with only the JSON, in a code block, shaped like this:

{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chicken Tacos",
  "recipeYield": "4",
  "keywords": "mexican, chicken",
  "recipeIngredient": [
    "1 1/2 lb chicken thighs, boneless",
    "8 small corn tortillas",
    "salt, to taste"
  ],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Season the chicken." },
    { "@type": "HowToStep", "text": "Grill 6 minutes per side." }
  ],
  "url": ""
}

Rules: one ingredient per line, starting with the amount and unit when there is one (tsp, tbsp, cup, fl oz, ml, l, g, kg, oz, lb, or a count word like clove, can, bunch), then what you buy; put preparation after a comma. recipeYield is the number of servings. url is the recipe's web link if there is one.

Recipe:
`;
}
