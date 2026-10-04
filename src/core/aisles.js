// Default aisle list and a keyword-based guesser for ingredients that
// arrive without an aisle (JSON-LD imports, manual entry).
import { itemKey } from "./ingredients.js";

export const DEFAULT_AISLES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Spices",
  "Canned & Jarred",
  "Frozen",
  "Beverages",
  "Household",
  "Other",
];

// Checked in order; first match wins, so specific phrases come before
// generic words ("tomato paste" before "tomato", "coconut milk" before "milk").
const RULES = [
  ["Pantry", ["peanut butter", "almond butter", "cream of tartar", "cream of mushroom", "fish sauce", "soy sauce", "oyster sauce"]],
  ["Produce", ["green bean"]],
  ["Canned & Jarred", ["tomato paste", "tomato sauce", "diced tomato", "crushed tomato", "canned", "coconut milk", "broth", "stock", "salsa", "pesto", "olives", "pickle", "capers", "chickpea", "black bean", "kidney bean", "pinto bean", "beans"]],
  ["Frozen", ["frozen", "ice cream"]],
  ["Spices", ["salt", "pepper flakes", "black pepper", "peppercorn", "cumin", "paprika", "oregano", "thyme", "rosemary", "cinnamon", "nutmeg", "chili powder", "chilli powder", "curry powder", "garam masala", "turmeric", "bay leaf", "cayenne", "garlic powder", "onion powder", "seasoning", "vanilla", "dried", "ground ginger", "ground coriander", "ground cloves", "allspice"]],
  ["Meat & Seafood", ["chicken", "beef", "pork", "bacon", "sausage", "turkey", "lamb", "ham", "steak", "salmon", "shrimp", "prawn", "tuna", "cod", "fish", "chorizo", "prosciutto"]],
  ["Dairy & Eggs", ["milk", "butter", "cheese", "parmesan", "mozzarella", "cheddar", "feta", "cream", "yogurt", "yoghurt", "egg", "sour cream", "creme fraiche"]],
  ["Bakery", ["bread", "bun", "baguette", "tortilla", "pita", "naan", "roll", "bagel"]],
  ["Produce", ["onion", "garlic", "shallot", "scallion", "green onion", "tomato", "potato", "carrot", "celery", "lettuce", "spinach", "kale", "cabbage", "broccoli", "cauliflower", "zucchini", "squash", "cucumber", "bell pepper", "jalapeno", "jalapeño", "chili", "chile", "mushroom", "avocado", "lemon", "lime", "orange", "apple", "banana", "berry", "berries", "ginger", "cilantro", "parsley", "basil", "mint", "dill", "chive", "herb", "corn", "pea", "green bean", "asparagus", "eggplant", "leek", "radish", "arugula", "sweet potato", "fruit", "vegetable"]],
  ["Beverages", ["wine", "beer", "juice", "soda", "coffee", "tea"]],
  ["Pantry", ["flour", "sugar", "oil", "vinegar", "rice", "pasta", "noodle", "spaghetti", "oat", "honey", "maple", "soy sauce", "fish sauce", "sauce", "mustard", "ketchup", "mayo", "mayonnaise", "baking", "yeast", "cornstarch", "breadcrumb", "panko", "lentil", "quinoa", "nut", "almond", "peanut", "sesame", "syrup", "chocolate", "cocoa", "cracker", "cereal", "water"]],
  ["Household", ["foil", "parchment", "paper towel", "plastic wrap", "zip"]],
];

const COMPILED = RULES.map(([aisle, words]) => [
  aisle,
  words.map((w) => new RegExp(`(^|[^\\p{L}])${w}(s|es)?($|[^\\p{L}])`, "u")),
]);

/** Best-guess aisle for an item name, restricted to the configured aisles. */
export function guessAisle(item, aisles = DEFAULT_AISLES) {
  const name = String(item ?? "").toLowerCase();
  const key = itemKey(item);
  for (const [aisle, patterns] of COMPILED) {
    if (!aisles.includes(aisle)) continue;
    if (patterns.some((re) => re.test(name) || re.test(key))) return aisle;
  }
  return aisles.includes("Other") ? "Other" : aisles[aisles.length - 1];
}
