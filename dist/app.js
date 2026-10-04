// Meal Planner — built from src/ by `npm run build`. Do not edit.
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app/main.js
var main_exports = {};
__export(main_exports, {
  run: () => run
});
module.exports = __toCommonJS(main_exports);

// src/core/units.js
var UNITS = {
  tsp: { family: "volume", factor: 4.92892, system: "us" },
  tbsp: { family: "volume", factor: 14.7868, system: "us" },
  cup: { family: "volume", factor: 236.588, system: "us" },
  "fl oz": { family: "volume", factor: 29.5735, system: "us" },
  pint: { family: "volume", factor: 473.176, system: "us" },
  quart: { family: "volume", factor: 946.353, system: "us" },
  gallon: { family: "volume", factor: 3785.41, system: "us" },
  ml: { family: "volume", factor: 1, system: "metric" },
  l: { family: "volume", factor: 1e3, system: "metric" },
  g: { family: "weight", factor: 1, system: "metric" },
  kg: { family: "weight", factor: 1e3, system: "metric" },
  oz: { family: "weight", factor: 28.3495, system: "us" },
  lb: { family: "weight", factor: 453.592, system: "us" }
};
var COUNT_UNITS = [
  "clove",
  "can",
  "jar",
  "package",
  "bunch",
  "head",
  "slice",
  "piece",
  "stick",
  "sprig",
  "pinch",
  "dash",
  "handful",
  "bag",
  "box",
  "bottle",
  "container",
  "stalk",
  "fillet",
  "sheet",
  "loaf"
];
var ALIASES = {
  t: "tsp",
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  T: "tbsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  c: "cup",
  cup: "cup",
  cups: "cup",
  "fl oz": "fl oz",
  "fl. oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  floz: "fl oz",
  pt: "pint",
  pint: "pint",
  pints: "pint",
  qt: "quart",
  quart: "quart",
  quarts: "quart",
  gal: "gallon",
  gallon: "gallon",
  gallons: "gallon",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  g: "g",
  gr: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb"
};
for (const u of COUNT_UNITS) {
  ALIASES[u] = u;
  ALIASES[u + "s"] = u;
  ALIASES[u + "es"] = u;
}
ALIASES.loaves = "loaf";
function canonicalUnit(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\.$/, "");
  if (!s) return null;
  if (s === "T" || s === "t") return ALIASES[s];
  const lower = s.toLowerCase();
  return ALIASES[lower] ?? null;
}
function sumAmounts(amounts) {
  const groups = /* @__PURE__ */ new Map();
  for (const a of amounts) {
    const unit = a.unit || "";
    const info = UNITS[unit];
    const key = info ? info.family : "u:" + unit;
    let g = groups.get(key);
    if (!g) {
      g = { info: info ? info.family : null, units: /* @__PURE__ */ new Set(), total: 0, hasQty: false, unit };
      groups.set(key, g);
    }
    if (a.qty == null || Number.isNaN(a.qty)) continue;
    g.units.add(unit);
    g.hasQty = true;
    g.total += info ? a.qty * info.factor : a.qty;
  }
  const out = [];
  for (const g of groups.values()) {
    if (!g.hasQty) {
      out.push({ qty: null, unit: g.unit });
      continue;
    }
    if (!g.info) {
      out.push({ qty: g.total, unit: g.unit });
      continue;
    }
    const units = [...g.units];
    if (units.length === 1) {
      out.push({ qty: g.total / UNITS[units[0]].factor, unit: units[0] });
      continue;
    }
    const unit = pickDisplayUnit(g.info, g.total, units);
    out.push({ qty: g.total / UNITS[unit].factor, unit });
  }
  return out;
}
function pickDisplayUnit(family, base, units) {
  const us = units.some((u) => UNITS[u].system === "us");
  if (family === "volume") {
    if (!us) return base >= 1e3 ? "l" : "ml";
    if (base >= UNITS.cup.factor / 4) return "cup";
    if (base >= UNITS.tbsp.factor) return "tbsp";
    return "tsp";
  }
  if (!us) return base >= 1e3 ? "kg" : "g";
  return base >= UNITS.lb.factor ? "lb" : "oz";
}
var FRACTIONS = [
  [1 / 8, "1/8"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [3 / 8, "3/8"],
  [1 / 2, "1/2"],
  [5 / 8, "5/8"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
  [7 / 8, "7/8"]
];
function formatQty(qty, unit = "") {
  if (qty == null) return "";
  const info = UNITS[unit];
  if (info && info.system === "metric") {
    const r = qty >= 10 ? Math.round(qty) : Math.round(qty * 10) / 10;
    return String(r);
  }
  const whole = Math.floor(qty);
  const frac = qty - whole;
  if (frac < 0.06) return String(whole || (qty > 0 ? "1/8" : "0"));
  if (frac > 0.94) return String(whole + 1);
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  return whole ? `${whole} ${best[1]}` : best[1];
}
function formatAmount({ qty, unit }) {
  if (qty == null) return unit ? `some ${plural(unit)}` : "";
  const q = formatQty(qty, unit);
  if (!unit) return q;
  const many = qty > 1.0001;
  const u = many && (COUNT_UNITS.includes(unit) || unit === "cup" || unit === "pint" || unit === "quart" || unit === "gallon") ? plural(unit) : unit;
  return `${q} ${u}`;
}
function plural(unit) {
  if (unit === "loaf") return "loaves";
  if (/(sh|ch|x|s)$/.test(unit)) return unit + "es";
  return unit + "s";
}

// src/core/ingredients.js
var UNICODE_FRACTIONS = {
  "\xBD": 0.5,
  "\u2153": 1 / 3,
  "\u2154": 2 / 3,
  "\xBC": 0.25,
  "\xBE": 0.75,
  "\u2155": 0.2,
  "\u2156": 0.4,
  "\u2157": 0.6,
  "\u2158": 0.8,
  "\u2159": 1 / 6,
  "\u215A": 5 / 6,
  "\u215B": 0.125,
  "\u215C": 0.375,
  "\u215D": 0.625,
  "\u215E": 0.875
};
var NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\s*[${Object.keys(UNICODE_FRACTIONS).join("")}]|\d+\/\d+|\d*\.\d+|\d+(?:[${Object.keys(UNICODE_FRACTIONS).join("")}])?|[${Object.keys(UNICODE_FRACTIONS).join("")}])`;
var LEADING_QTY = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|—|to)\s*(${NUM}))?\s*`);
function parseNumber(token) {
  if (token == null) return null;
  let s = String(token).trim();
  if (!s) return null;
  let total = 0;
  for (const [ch, v] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(ch)) {
      total += v;
      s = s.replace(ch, "").trim();
    }
  }
  if (!s) return total;
  const parts = s.split(/\s+/);
  for (const p of parts) {
    if (p.includes("/")) {
      const [n, d] = p.split("/").map(Number);
      if (!d) return null;
      total += n / d;
    } else {
      const n = Number(p);
      if (Number.isNaN(n)) return null;
      total += n;
    }
  }
  return total;
}
function parseIngredientLine(line) {
  let s = String(line ?? "").replace(/\s+/g, " ").replace(/^[-•*▢□]\s*/, "").trim();
  const result = { qty: null, unit: "", item: "", note: "" };
  if (!s) return result;
  const m = s.match(LEADING_QTY);
  if (m) {
    result.qty = parseNumber(m[2] ?? m[1]);
    s = s.slice(m[0].length);
  }
  const notes = [];
  const paren = s.match(/^\(([^)]*)\)\s*/);
  if (paren) {
    notes.push(paren[1].trim());
    s = s.slice(paren[0].length);
  }
  if (result.qty != null) {
    const unitMatch = s.match(/^(fl\.? oz|fluid ounces?|[A-Za-z]+\.?)(?=\s|$)/);
    if (unitMatch) {
      const unit = canonicalUnit(unitMatch[1]);
      if (unit) {
        result.unit = unit;
        s = s.slice(unitMatch[0].length).trim();
        if (s.startsWith("of ")) s = s.slice(3);
      }
    }
  }
  s = s.replace(/\(([^)]*)\)/g, (_, inner) => {
    notes.push(inner.trim());
    return "";
  });
  const comma = s.indexOf(",");
  if (comma >= 0) {
    const rest = s.slice(comma + 1).trim();
    if (rest) notes.push(rest);
    s = s.slice(0, comma);
  }
  result.item = s.replace(/\s+/g, " ").trim();
  result.note = notes.filter(Boolean).join("; ");
  return result;
}
var SIZE_WORDS = /* @__PURE__ */ new Set(["large", "medium", "small", "fresh", "extra-large", "jumbo"]);
function itemKey(name) {
  const words = String(name ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w && !SIZE_WORDS.has(w));
  if (!words.length) return "";
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(" ");
}
var IRREGULAR = { leaves: "leaf", loaves: "loaf", halves: "half", knives: "knife" };
function singular(word) {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word in IRREGULAR) return IRREGULAR[word];
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

// src/core/aisles.js
var DEFAULT_AISLES = [
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
  "Other"
];
var RULES = [
  ["Pantry", ["peanut butter", "almond butter", "cream of tartar", "cream of mushroom", "fish sauce", "soy sauce", "oyster sauce"]],
  ["Produce", ["green bean"]],
  ["Canned & Jarred", ["tomato paste", "tomato sauce", "diced tomato", "crushed tomato", "canned", "coconut milk", "broth", "stock", "salsa", "pesto", "olives", "pickle", "capers", "chickpea", "black bean", "kidney bean", "pinto bean", "beans"]],
  ["Frozen", ["frozen", "ice cream"]],
  ["Spices", ["salt", "pepper flakes", "black pepper", "peppercorn", "cumin", "paprika", "oregano", "thyme", "rosemary", "cinnamon", "nutmeg", "chili powder", "chilli powder", "curry powder", "garam masala", "turmeric", "bay leaf", "cayenne", "garlic powder", "onion powder", "seasoning", "vanilla", "dried", "ground ginger", "ground coriander", "ground cloves", "allspice"]],
  ["Meat & Seafood", ["chicken", "beef", "pork", "bacon", "sausage", "turkey", "lamb", "ham", "steak", "salmon", "shrimp", "prawn", "tuna", "cod", "fish", "chorizo", "prosciutto"]],
  ["Dairy & Eggs", ["milk", "butter", "cheese", "parmesan", "mozzarella", "cheddar", "feta", "cream", "yogurt", "yoghurt", "egg", "sour cream", "creme fraiche"]],
  ["Bakery", ["bread", "bun", "baguette", "tortilla", "pita", "naan", "roll", "bagel"]],
  ["Produce", ["onion", "garlic", "shallot", "scallion", "green onion", "tomato", "potato", "carrot", "celery", "lettuce", "spinach", "kale", "cabbage", "broccoli", "cauliflower", "zucchini", "squash", "cucumber", "bell pepper", "jalapeno", "jalape\xF1o", "chili", "chile", "mushroom", "avocado", "lemon", "lime", "orange", "apple", "banana", "berry", "berries", "ginger", "cilantro", "parsley", "basil", "mint", "dill", "chive", "herb", "corn", "pea", "green bean", "asparagus", "eggplant", "leek", "radish", "arugula", "sweet potato", "fruit", "vegetable"]],
  ["Beverages", ["wine", "beer", "juice", "soda", "coffee", "tea"]],
  ["Pantry", ["flour", "sugar", "oil", "vinegar", "rice", "pasta", "noodle", "spaghetti", "oat", "honey", "maple", "soy sauce", "fish sauce", "sauce", "mustard", "ketchup", "mayo", "mayonnaise", "baking", "yeast", "cornstarch", "breadcrumb", "panko", "lentil", "quinoa", "nut", "almond", "peanut", "sesame", "syrup", "chocolate", "cocoa", "cracker", "cereal", "water"]],
  ["Household", ["foil", "parchment", "paper towel", "plastic wrap", "zip"]]
];
var COMPILED = RULES.map(([aisle, words]) => [
  aisle,
  words.map((w) => new RegExp(`(^|[^\\p{L}])${w}(s|es)?($|[^\\p{L}])`, "u"))
]);
function guessAisle(item, aisles = DEFAULT_AISLES) {
  const name = String(item ?? "").toLowerCase();
  const key = itemKey(item);
  for (const [aisle, patterns] of COMPILED) {
    if (!aisles.includes(aisle)) continue;
    if (patterns.some((re) => re.test(name) || re.test(key))) return aisle;
  }
  return aisles.includes("Other") ? "Other" : aisles[aisles.length - 1];
}

// src/core/recipe.js
function slugify(name) {
  const s = String(name ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return s || "recipe";
}
function uniqueId(name, existingIds) {
  const taken = new Set(existingIds);
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
function toText(v) {
  return v == null ? "" : String(v).trim();
}
function toQty(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  const n = parseNumber(v);
  return n != null && n > 0 ? n : null;
}
function normalizeIngredient(input, aisles = DEFAULT_AISLES) {
  let ing;
  if (typeof input === "string") {
    ing = parseIngredientLine(input);
  } else if (input && typeof input === "object") {
    ing = {
      qty: toQty(input.qty ?? input.quantity ?? input.amount),
      unit: toText(input.unit),
      item: toText(input.item ?? input.name ?? input.ingredient),
      note: toText(input.note ?? input.notes ?? input.preparation),
      aisle: toText(input.aisle)
    };
    if (!ing.item && typeof input.text === "string") ing = { ...parseIngredientLine(input.text), aisle: ing.aisle };
  } else {
    return null;
  }
  if (!ing.item) return null;
  const unit = ing.unit ? canonicalUnit(ing.unit) ?? ing.unit.toLowerCase() : "";
  const aisle = aisles.includes(ing.aisle) ? ing.aisle : guessAisle(ing.item, aisles);
  return { qty: ing.qty ?? null, unit, item: ing.item, aisle, note: ing.note ?? "" };
}
function toList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(/\n+/);
  return [v];
}
function normalizeRecipe(input, { aisles = DEFAULT_AISLES, now = /* @__PURE__ */ new Date(), existing = null, existingIds = [] } = {}) {
  if (!input || typeof input !== "object") throw new Error("Recipe must be a JSON object.");
  const name = toText(input.name ?? input.title);
  if (!name) throw new Error("Recipe needs a name.");
  const ingredients = toList(input.ingredients).map((i) => normalizeIngredient(i, aisles)).filter(Boolean);
  if (!ingredients.length) throw new Error(`"${name}" has no ingredients.`);
  const steps = toList(input.steps ?? input.instructions).map((s) => typeof s === "object" && s ? toText(s.text) : toText(s)).map((s) => s.replace(/^\d+[.)]\s*/, "")).filter(Boolean);
  const tags2 = [...new Set(toList(typeof input.tags === "string" ? input.tags.split(",") : input.tags).map((t) => toText(t).toLowerCase()).filter(Boolean))];
  const servings2 = toQty(input.servings ?? input.yield);
  const stamp = now.toISOString();
  return {
    id: existing?.id ?? input.id ?? uniqueId(name, existingIds),
    name,
    servings: servings2 == null ? null : Math.round(servings2),
    tags: tags2,
    ingredients,
    steps,
    sourceUrl: toText(input.sourceUrl ?? input.url ?? input.source),
    notes: toText(input.notes),
    createdAt: existing?.createdAt ?? input.createdAt ?? stamp,
    updatedAt: stamp
  };
}
function parseRecipeJson(text) {
  const raw = String(text ?? "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : raw;
  if (!fenced) {
    const start = body.search(/[[{]/);
    const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
    if (start >= 0 && end > start) body = body.slice(start, end + 1);
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw new Error("That isn't valid JSON: " + e.message);
  }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.recipes)) return data.recipes;
  return [data];
}
function ingredientText(ing) {
  const parts = [];
  if (ing.qty != null) parts.push(formatQty(ing.qty, ing.unit));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item);
  let s = parts.join(" ");
  if (ing.note) s += `, ${ing.note}`;
  return s;
}

// src/core/jsonld.js
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "\u2013", mdash: "\u2014", frac12: "\xBD", frac14: "\xBC", frac34: "\xBE", deg: "\xB0", hellip: "\u2026", rsquo: "\u2019", lsquo: "\u2018", rdquo: "\u201D", ldquo: "\u201C" };
function decodeEntities(s) {
  return String(s ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}
function clean(s) {
  return decodeEntities(String(s ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function hasType(node, type) {
  const t = node?.["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}
function findRecipe(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (hasType(node, "Recipe")) return node;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const r = findRecipe(node[key], depth + 1);
    if (r) return r;
  }
  return null;
}
function instructions(v) {
  if (v == null) return [];
  if (typeof v === "string") return v.split(/\n+/).map(clean).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(instructions);
  if (typeof v === "object") {
    if (hasType(v, "HowToSection")) {
      const steps = instructions(v.itemListElement);
      return v.name ? [`${clean(v.name)}:`, ...steps] : steps;
    }
    return [clean(v.text ?? v.name ?? "")].filter(Boolean);
  }
  return [];
}
function servings(v) {
  const list = Array.isArray(v) ? v : [v];
  for (const item of list) {
    const m = String(item ?? "").match(/\d+/);
    if (m) return Number(m[0]);
  }
  return null;
}
function tags(r) {
  const out = [];
  for (const key of ["recipeCategory", "recipeCuisine", "keywords"]) {
    const v = r[key];
    const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
    for (const t of list) {
      const s = clean(t).toLowerCase();
      if (s && s.length <= 30) out.push(s);
    }
  }
  return [...new Set(out)].slice(0, 8);
}
function jsonLdBlocks(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while (m = re.exec(String(html ?? ""))) {
    const body = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    try {
      out.push(JSON.parse(body));
    } catch {
      try {
        out.push(JSON.parse(body.replace(/[\u0000-\u001f]+/g, " ")));
      } catch {
      }
    }
  }
  return out;
}
function recipeFromHtml(html, url = "") {
  const node = findRecipe(jsonLdBlocks(html));
  if (!node) return null;
  const ingredients = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : node.ingredients ?? []).map(clean).filter(Boolean);
  if (!ingredients.length) return null;
  return {
    name: clean(node.name),
    servings: servings(node.recipeYield),
    tags: tags(node),
    ingredients,
    steps: instructions(node.recipeInstructions),
    sourceUrl: url || (typeof node.url === "string" ? node.url : ""),
    notes: ""
  };
}

// src/core/grocery.js
function buildGroceryList(recipes, { aisles = DEFAULT_AISLES } = {}) {
  const byKey = /* @__PURE__ */ new Map();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients ?? []) {
      const key = itemKey(ing.item);
      if (!key) continue;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { key, name: capitalize(ing.item.trim()), aisle: ing.aisle || "Other", raw: [], recipes: [] };
        byKey.set(key, entry);
      }
      entry.raw.push({ qty: ing.qty, unit: ing.unit || "" });
      if (!entry.recipes.includes(recipe.name)) entry.recipes.push(recipe.name);
    }
  }
  const order = (a) => {
    const i = aisles.indexOf(a);
    return i < 0 ? aisles.length : i;
  };
  return [...byKey.values()].map(({ raw, ...e }) => {
    const amounts = sumAmounts(raw);
    return { ...e, amounts, title: groceryTitle(e.name, amounts), notes: e.recipes.join(", ") };
  }).sort((a, b) => order(a.aisle) - order(b.aisle) || a.name.localeCompare(b.name));
}
function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function groceryTitle(name, amounts) {
  const parts = amounts.filter((a) => a.qty != null).map(formatAmount).filter(Boolean);
  return parts.length ? `${name} (${parts.join(" + ")})` : name;
}
function keyFromTitle(title) {
  return itemKey(String(title ?? "").replace(/\s*\([^)]*\)\s*$/, ""));
}
function planExport(items, existingTitles, { pantry = [] } = {}) {
  const existing = new Set(existingTitles.map(keyFromTitle));
  const pantryKeys = new Set(pantry.map(itemKey));
  return items.map((item) => ({
    ...item,
    status: existing.has(item.key) ? "duplicate" : pantryKeys.has(item.key) ? "pantry" : "add"
  }));
}
function groupByAisle(items) {
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.aisle === item.aisle) last.items.push(item);
    else groups.push({ aisle: item.aisle, items: [item] });
  }
  return groups;
}

// src/core/plan.js
var LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function ymd(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function weekStart(today, startDay) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() + (startDay - d.getDay() + 7) % 7);
  return d;
}
function emptyPlan({ today = /* @__PURE__ */ new Date(), startDay = 1, nights = 7, previous = null } = {}) {
  const start = weekStart(today, startDay);
  const days = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date: ymd(d), label: LABELS[d.getDay()], kind: "empty", recipeId: null, locked: false });
  }
  return { weekOf: ymd(start), days, include: [...previous?.include ?? []], ignore: [...previous?.ignore ?? []] };
}
function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function prunePlan(plan, recipes) {
  const ids = new Set(recipes.map((r) => r.id));
  return {
    ...plan,
    days: plan.days.map((d) => d.kind === "recipe" && !ids.has(d.recipeId) ? { ...d, kind: "empty", recipeId: null, locked: false } : d),
    include: plan.include.filter((id) => ids.has(id)),
    ignore: plan.ignore.filter((id) => ids.has(id))
  };
}
function fillPlan(plan, recipes, rng = Math.random) {
  const ignore = new Set(plan.ignore);
  const keep = (d) => d.kind === "out" || d.kind === "recipe" && d.locked;
  const used = new Set(plan.days.filter((d) => keep(d) && d.kind === "recipe").map((d) => d.recipeId));
  const pool = recipes.filter((r) => !ignore.has(r.id) && !used.has(r.id)).map((r) => r.id);
  const included = shuffle(pool.filter((id) => plan.include.includes(id)), rng);
  const rest = shuffle(pool.filter((id) => !plan.include.includes(id)), rng);
  const queue = [...included, ...rest];
  const slots = shuffle(plan.days.map((d, i) => i).filter((i) => !keep(plan.days[i])), rng);
  const days = plan.days.map((d) => ({ ...d }));
  for (const i of slots) {
    const id = queue.shift();
    days[i] = id ? { ...days[i], kind: "recipe", recipeId: id } : { ...days[i], kind: "empty", recipeId: null };
  }
  return { ...plan, days };
}
function rerollDay(plan, index, recipes, rng = Math.random) {
  const ignore = new Set(plan.ignore);
  const used = new Set(plan.days.filter((d) => d.kind === "recipe").map((d) => d.recipeId));
  const pool = recipes.filter((r) => !ignore.has(r.id) && !used.has(r.id));
  if (!pool.length) return plan;
  const pick = pool[Math.floor(rng() * pool.length)];
  return setDay(plan, index, { kind: "recipe", recipeId: pick.id });
}
function setDay(plan, index, patch) {
  const days = plan.days.map((d2, i) => i === index ? { ...d2, ...patch } : d2);
  const d = days[index];
  if (d.kind !== "recipe") days[index] = { ...d, recipeId: null, locked: false };
  return { ...plan, days };
}
function toggleLock(plan, index) {
  const d = plan.days[index];
  if (d.kind !== "recipe") return plan;
  return setDay(plan, index, { locked: !d.locked });
}
function setPreference(plan, recipeId, pref) {
  const include = plan.include.filter((id) => id !== recipeId);
  const ignore = plan.ignore.filter((id) => id !== recipeId);
  if (pref === "include") include.push(recipeId);
  if (pref === "ignore") ignore.push(recipeId);
  return { ...plan, include, ignore };
}
function preferenceOf(plan, recipeId) {
  if (plan?.include?.includes(recipeId)) return "include";
  if (plan?.ignore?.includes(recipeId)) return "ignore";
  return "normal";
}
function plannedRecipes(plan, recipes) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return plan.days.filter((d) => d.kind === "recipe").map((d) => byId.get(d.recipeId)).filter(Boolean);
}
function isPastWeek(plan, today = /* @__PURE__ */ new Date()) {
  if (!plan?.days?.length) return true;
  return parseYmd(plan.days[plan.days.length - 1].date) < parseYmd(ymd(today));
}

// src/core/chatbot.js
function chatbotPrompt(aisles = DEFAULT_AISLES) {
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

// src/app/storage.js
var BOOKMARK = "MealPlanner";
var DEFAULT_CONFIG = {
  nights: 7,
  startDay: 1,
  // 0 = Sunday, 1 = Monday
  aisles: DEFAULT_AISLES,
  pantry: ["salt", "black pepper", "water"]
};
var DEFAULT_DEVICE = {
  remindersList: "Groceries"
};
var SetupError = class extends Error {
};
function defaultFileManager() {
  try {
    return FileManager.iCloud();
  } catch {
    return FileManager.local();
  }
}
var Store = class _Store {
  /** @param fm a Scriptable FileManager; @param root folder path */
  constructor(fm, root) {
    this.fm = fm;
    this.root = root;
    this.recipesDir = fm.joinPath(root, "recipes");
  }
  static open(fm = defaultFileManager(), bookmark = BOOKMARK) {
    if (!fm.bookmarkExists(bookmark)) {
      throw new SetupError(
        `No file bookmark named "${bookmark}". In Scriptable, open Settings \u2192 File Bookmarks, add the shared Meal Planner folder from iCloud Drive, and name it ${bookmark}.`
      );
    }
    const store = new _Store(fm, fm.bookmarkedPath(bookmark));
    if (!fm.fileExists(store.recipesDir)) fm.createDirectory(store.recipesDir, true);
    return store;
  }
  path(...parts) {
    return this.fm.joinPath(this.root, parts.join("/"));
  }
  async readJson(path, fallback = null) {
    const fm = this.fm;
    if (!this.exists(path)) return fallback;
    await fm.downloadFileFromiCloud(path);
    const text = fm.readString(path);
    if (text == null || text.trim() === "") return fallback;
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`${path.split("/").pop()} is not valid JSON (${e.message}).`);
    }
  }
  /** True for a file on disk or one iCloud has offloaded to a ".name.icloud" placeholder. */
  exists(path) {
    if (this.fm.fileExists(path)) return true;
    const slash = path.lastIndexOf("/");
    return this.fm.fileExists(`${path.slice(0, slash)}/.${path.slice(slash + 1)}.icloud`);
  }
  writeJson(path, data) {
    this.fm.writeString(path, JSON.stringify(data, null, 2) + "\n");
  }
  // Recipes
  recipePath(id) {
    return this.fm.joinPath(this.recipesDir, `${id}.json`);
  }
  /** Recipe file names, including ones iCloud has offloaded (".x.json.icloud"). */
  recipeFiles() {
    const names = /* @__PURE__ */ new Set();
    for (const name of this.fm.listContents(this.recipesDir)) {
      const offloaded = name.match(/^\.(.+\.json)\.icloud$/);
      if (offloaded) names.add(offloaded[1]);
      else if (name.endsWith(".json") && !name.startsWith(".")) names.add(name);
    }
    return [...names];
  }
  async listRecipes() {
    const recipes = await Promise.all(
      this.recipeFiles().map(async (name) => {
        const path = this.fm.joinPath(this.recipesDir, name);
        try {
          const r = await this.readJson(path);
          return r && r.id && r.name ? r : null;
        } catch {
          return null;
        }
      })
    );
    return recipes.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }
  async getRecipe(id) {
    return this.readJson(this.recipePath(id));
  }
  saveRecipe(recipe) {
    this.writeJson(this.recipePath(recipe.id), recipe);
  }
  deleteRecipe(id) {
    const path = this.recipePath(id);
    if (this.exists(path)) this.fm.remove(path);
  }
  existingIds() {
    return this.recipeFiles().map((n) => n.replace(/\.json$/, ""));
  }
  // Config
  async config() {
    const saved = await this.readJson(this.path("config.json"), {});
    return { ...DEFAULT_CONFIG, ...saved };
  }
  async updateConfig(patch) {
    const saved = await this.readJson(this.path("config.json"), {});
    const next = { ...saved, ...patch };
    this.writeJson(this.path("config.json"), next);
    return { ...DEFAULT_CONFIG, ...next };
  }
  // Plan
  async plan(config) {
    const saved = await this.readJson(this.path("plan.json"));
    if (saved && Array.isArray(saved.days)) return { include: [], ignore: [], ...saved };
    return emptyPlan({ startDay: config.startDay, nights: config.nights });
  }
  /** Re-read the plan, apply fn, write it back. Returns the new plan. */
  async updatePlan(config, fn) {
    const current = await this.plan(config);
    const next = await fn(current);
    this.writeJson(this.path("plan.json"), next);
    return next;
  }
};
var DeviceSettings = class {
  constructor(fm = FileManager.local()) {
    this.fm = fm;
    this.path = fm.joinPath(fm.documentsDirectory(), "meal-planner-device.json");
  }
  get() {
    if (!this.fm.fileExists(this.path)) return { ...DEFAULT_DEVICE };
    try {
      return { ...DEFAULT_DEVICE, ...JSON.parse(this.fm.readString(this.path)) };
    } catch {
      return { ...DEFAULT_DEVICE };
    }
  }
  set(patch) {
    const next = { ...this.get(), ...patch };
    this.fm.writeString(this.path, JSON.stringify(next, null, 2));
    return next;
  }
};

// src/app/context.js
var Ctx = class {
  constructor({ store = Store.open(), device = new DeviceSettings(), version = "dev" } = {}) {
    this.store = store;
    this.device = device;
    this.version = version;
    this.config = null;
    this.recipes = [];
    this.plan = null;
  }
  async load() {
    this.config = await this.store.config();
    await this.reloadRecipes();
    return this;
  }
  async reloadRecipes() {
    this.recipes = await this.store.listRecipes();
    this.plan = prunePlan(await this.store.plan(this.config), this.recipes);
  }
  recipe(id) {
    return this.recipes.find((r) => r.id === id) ?? null;
  }
  /** Apply fn to the latest plan on disk and save it. */
  async updatePlan(fn) {
    this.plan = await this.store.updatePlan(this.config, (p) => fn(prunePlan(p, this.recipes)));
    return this.plan;
  }
  async updateConfig(patch) {
    this.config = await this.store.updateConfig(patch);
    return this.config;
  }
  saveRecipe(recipe) {
    this.store.saveRecipe(recipe);
    const i = this.recipes.findIndex((r) => r.id === recipe.id);
    if (i >= 0) this.recipes[i] = recipe;
    else this.recipes.push(recipe);
    this.recipes.sort((a, b) => a.name.localeCompare(b.name));
  }
  async deleteRecipe(id) {
    this.store.deleteRecipe(id);
    this.recipes = this.recipes.filter((r) => r.id !== id);
    await this.updatePlan((p) => p);
  }
};

// src/app/ui.js
async function showError(e) {
  const a = new Alert();
  a.title = "Something went wrong";
  a.message = e?.message ?? String(e);
  a.addAction("OK");
  await a.presentAlert();
}
function safe(fn) {
  return () => Promise.resolve().then(fn).catch(showError);
}
async function message(title, text = "") {
  const a = new Alert();
  a.title = title;
  a.message = text;
  a.addAction("OK");
  await a.presentAlert();
}
async function confirm(title, text = "", action = "OK", destructive = false) {
  const a = new Alert();
  a.title = title;
  a.message = text;
  if (destructive) a.addDestructiveAction(action);
  else a.addAction(action);
  a.addCancelAction("Cancel");
  return await a.presentAlert() === 0;
}
async function choose(title, options, { message: text = "", destructive = [] } = {}) {
  const a = new Alert();
  a.title = title;
  if (text) a.message = text;
  options.forEach((o, i) => destructive.includes(i) ? a.addDestructiveAction(o) : a.addAction(o));
  a.addCancelAction("Cancel");
  return a.presentSheet();
}
async function prompt(title, fields, { message: text = "", ok = "Save" } = {}) {
  const a = new Alert();
  a.title = title;
  if (text) a.message = text;
  for (const f of fields) a.addTextField(f.placeholder ?? f.label ?? "", f.value ?? "");
  a.addAction(ok);
  a.addCancelAction("Cancel");
  if (await a.presentAlert() === -1) return null;
  return fields.map((_, i) => a.textFieldValue(i));
}
async function promptOne(title, value = "", opts = {}) {
  const r = await prompt(title, [{ value, placeholder: opts.placeholder ?? "" }], opts);
  return r ? r[0] : null;
}
async function liveTable(build) {
  const table = new UITable();
  table.showSeparators = true;
  const refresh = async () => {
    table.removeAllRows();
    await build(table, refresh);
    table.reload();
  };
  await refresh();
  await table.present();
}
function header(table, text) {
  const row2 = new UITableRow();
  row2.isHeader = true;
  row2.addText(text);
  table.addRow(row2);
  return row2;
}
function row(table, title, subtitle, onSelect, { right = "" } = {}) {
  const r = new UITableRow();
  r.dismissOnSelect = false;
  r.height = subtitle ? 60 : 44;
  const main = r.addText(title, subtitle || void 0);
  main.widthWeight = right ? 80 : 100;
  if (subtitle) main.subtitleColor = Color.gray();
  if (right) {
    const cell = r.addText(right);
    cell.widthWeight = 20;
    cell.rightAligned();
  }
  if (onSelect) r.onSelect = safe(onSelect);
  table.addRow(r);
  return r;
}
function button(table, title, onSelect) {
  const r = new UITableRow();
  r.dismissOnSelect = false;
  const cell = r.addText(title);
  cell.titleColor = Color.blue();
  r.onSelect = safe(onSelect);
  table.addRow(r);
  return r;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// src/app/editor.js
function toDraft(input, aisles) {
  return {
    id: input.id,
    createdAt: input.createdAt,
    name: String(input.name ?? input.title ?? ""),
    servings: input.servings ?? null,
    tags: Array.isArray(input.tags) ? input.tags : String(input.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    ingredients: (Array.isArray(input.ingredients) ? input.ingredients : []).map((i) => normalizeIngredient(i, aisles)).filter(Boolean),
    steps: (Array.isArray(input.steps) ? input.steps : []).map(String),
    sourceUrl: String(input.sourceUrl ?? ""),
    notes: String(input.notes ?? "")
  };
}
function move(list, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}
async function editRecipe(ctx, input, { existing = null, title = "Edit recipe" } = {}) {
  const aisles = ctx.config.aisles;
  const draft = toDraft(input, aisles);
  for (; ; ) {
    let save = false;
    await liveTable(async (t, refresh) => {
      header(t, title);
      const saveRow = row(t, "\u{1F4BE} Save recipe", "Or tap Close to discard changes", () => {
      });
      saveRow.dismissOnSelect = true;
      saveRow.onSelect = () => {
        save = true;
      };
      header(t, "Details");
      row(t, draft.name || "(no name)", "Name", async () => {
        const v = await promptOne("Name", draft.name);
        if (v != null) draft.name = v.trim();
        await refresh();
      });
      row(t, draft.servings ? String(draft.servings) : "\u2014", "Servings", async () => {
        const v = await promptOne("Servings", draft.servings ? String(draft.servings) : "", { placeholder: "4" });
        if (v != null) draft.servings = Number.parseInt(v, 10) || null;
        await refresh();
      });
      row(t, draft.tags.join(", ") || "\u2014", "Tags", async () => {
        const v = await promptOne("Tags", draft.tags.join(", "), { message: "Comma separated", placeholder: "chicken, quick" });
        if (v != null) draft.tags = v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        await refresh();
      });
      row(t, draft.sourceUrl || "\u2014", "Source link", async () => {
        const v = await promptOne("Source link", draft.sourceUrl, { placeholder: "https://" });
        if (v != null) draft.sourceUrl = v.trim();
        await refresh();
      });
      row(t, draft.notes || "\u2014", "Notes", async () => {
        const v = await promptOne("Notes", draft.notes);
        if (v != null) draft.notes = v.trim();
        await refresh();
      });
      header(t, `Ingredients (${draft.ingredients.length})`);
      draft.ingredients.forEach((ing, i) => {
        row(t, ingredientText(ing), ing.aisle, async () => {
          const pick = await choose(ingredientText(ing), ["Edit", `Aisle: ${ing.aisle}`, "Move up", "Delete"], { destructive: [3] });
          if (pick === 0) {
            const v = await promptOne("Ingredient", ingredientText(ing), { message: 'Like "1 1/2 cup flour, sifted"' });
            if (v != null && v.trim()) {
              const parsed = parseIngredientLine(v);
              const aisle = parsed.item.toLowerCase() === ing.item.toLowerCase() ? ing.aisle : guessAisle(parsed.item, aisles);
              draft.ingredients[i] = { ...parsed, aisle };
            }
          } else if (pick === 1) {
            const a = await choose("Aisle", aisles);
            if (a >= 0) ing.aisle = aisles[a];
          } else if (pick === 2) {
            move(draft.ingredients, i, -1);
          } else if (pick === 3) {
            draft.ingredients.splice(i, 1);
          }
          await refresh();
        });
      });
      button(t, "\uFF0B Add ingredient", async () => {
        const v = await promptOne("Add ingredient", "", { message: 'Like "2 cloves garlic, minced"', ok: "Add" });
        if (v && v.trim()) draft.ingredients.push(normalizeIngredient(v, aisles));
        await refresh();
      });
      button(t, "\u{1F4CB} Add ingredients from clipboard (one per line)", async () => {
        const lines = String(Pasteboard.paste() ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
        draft.ingredients.push(...lines.map((l) => normalizeIngredient(l, aisles)).filter(Boolean));
        await refresh();
      });
      header(t, `Steps (${draft.steps.length})`);
      draft.steps.forEach((step, i) => {
        row(t, `${i + 1}. ${step}`, "", async () => {
          const pick = await choose(`Step ${i + 1}`, ["Edit", "Move up", "Delete"], { destructive: [2] });
          if (pick === 0) {
            const v = await promptOne(`Step ${i + 1}`, step);
            if (v != null && v.trim()) draft.steps[i] = v.trim();
          } else if (pick === 1) {
            move(draft.steps, i, -1);
          } else if (pick === 2) {
            draft.steps.splice(i, 1);
          }
          await refresh();
        });
      });
      button(t, "\uFF0B Add step", async () => {
        const v = await promptOne("Add step", "", { ok: "Add" });
        if (v && v.trim()) draft.steps.push(v.trim());
        await refresh();
      });
      button(t, "\u{1F4CB} Add steps from clipboard (one per line)", async () => {
        const lines = String(Pasteboard.paste() ?? "").split(/\n+/).map((l) => l.trim().replace(/^\d+[.)]\s*/, "")).filter(Boolean);
        draft.steps.push(...lines);
        await refresh();
      });
    });
    if (!save) return null;
    try {
      const recipe = normalizeRecipe(draft, {
        aisles,
        existing,
        existingIds: ctx.recipes.map((r) => r.id)
      });
      ctx.saveRecipe(recipe);
      return recipe;
    } catch (e) {
      await showError(e);
    }
  }
}
function recipeHtml(recipe) {
  const ings = recipe.ingredients.map((i) => {
    const amount = i.qty != null ? formatAmount({ qty: i.qty, unit: i.unit }) : i.unit;
    return `<li>${amount ? `<b>${escapeHtml(amount)}</b> ` : ""}${escapeHtml(i.item)}${i.note ? `, <span class="note">${escapeHtml(i.note)}</span>` : ""}</li>`;
  }).join("");
  const steps = recipe.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const meta = [recipe.servings ? `Serves ${recipe.servings}` : "", recipe.tags.join(" \xB7 ")].filter(Boolean).join(" \u2014 ");
  const source = recipe.sourceUrl ? `<p class="meta"><a href="${escapeHtml(recipe.sourceUrl)}">Original recipe</a></p>` : "";
  const notes = recipe.notes ? `<h2>Notes</h2><p>${escapeHtml(recipe.notes)}</p>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { color-scheme: light dark; --muted: #6b6b6b; --accent: #b4532a; }
@media (prefers-color-scheme: dark) { :root { --muted: #a0a0a0; --accent: #e8875c; } }
body { font: 17px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 20px 16px 48px; max-width: 680px; }
h1 { font-size: 26px; line-height: 1.2; margin: 0 0 4px; }
h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); margin: 28px 0 8px; }
.meta { color: var(--muted); margin: 0; font-size: 15px; }
ul, ol { padding-left: 22px; } li { margin: 6px 0; }
ol li { margin: 12px 0; } .note { color: var(--muted); }
a { color: var(--accent); }
</style></head><body>
<h1>${escapeHtml(recipe.name)}</h1>
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}${source}
<h2>Ingredients</h2><ul>${ings}</ul>
${steps ? `<h2>Method</h2><ol>${steps}</ol>` : ""}
${notes}
</body></html>`;
}
async function viewRecipe(recipe) {
  const wv = new WebView();
  await wv.loadHTML(recipeHtml(recipe));
  await wv.present();
}

// src/app/services.js
var SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
var NoRecipeData = class extends Error {
};
async function loadHtml(url) {
  const req = new Request(url);
  req.headers = { "User-Agent": SAFARI_UA, Accept: "text/html,application/xhtml+xml" };
  req.timeoutInterval = 30;
  try {
    const html = await req.loadString();
    const status = req.response?.statusCode ?? 200;
    return status < 400 ? html : null;
  } catch {
    return null;
  }
}
async function loadRenderedHtml(url) {
  const wv = new WebView();
  await wv.loadURL(url);
  return wv.getHTML();
}
async function importFromUrl(url) {
  const html = await loadHtml(url);
  const recipe = html && recipeFromHtml(html, url);
  if (recipe) return recipe;
  let rendered = null;
  try {
    rendered = await loadRenderedHtml(url);
  } catch {
  }
  const fromRendered = rendered && recipeFromHtml(rendered, url);
  if (fromRendered) return fromRendered;
  if (!html && !rendered) throw new Error("Couldn't load that page.");
  throw new NoRecipeData("That page doesn't include recipe data the app can read.");
}
async function reminderLists() {
  const cals = await Calendar.forReminders();
  return cals.map((c) => c.title).sort((a, b) => a.localeCompare(b));
}
async function reminderList(title) {
  try {
    return await Calendar.forRemindersByTitle(title);
  } catch {
    throw new Error(`There's no Reminders list named "${title}" on this phone. Pick one in Settings.`);
  }
}
async function openReminderTitles(listTitle) {
  const cal = await reminderList(listTitle);
  const reminders = await Reminder.allIncomplete([cal]);
  return reminders.map((r) => r.title);
}
async function addReminders(listTitle, items) {
  const cal = await reminderList(listTitle);
  for (const item of items) {
    const r = new Reminder();
    r.title = item.title;
    if (item.notes) r.notes = item.notes;
    r.calendar = cal;
    r.save();
  }
  return items.length;
}

// src/app/importer.js
var URL_RE = /^https?:\/\/\S+$/i;
var PROMPT_HELP = "Paste it into any AI chat app, add the recipe's link, text or photo after it, and send. Copy the JSON it replies with, then come back and choose \u201CPaste recipe JSON\u201D. You can also share the reply straight to this script.";
async function addRecipeMenu(ctx) {
  const options = ["From a web link", "Paste recipe JSON", "Copy prompt for AI", "Type it in"];
  const pick = await choose("Add a recipe", options);
  switch (pick) {
    case 0: {
      const clip = String(Pasteboard.paste() ?? "").trim();
      const url = await promptOne("Recipe link", URL_RE.test(clip) ? clip : "", { placeholder: "https://", ok: "Import" });
      if (url && url.trim()) return importAndEdit(ctx, url.trim());
      return null;
    }
    case 1:
      return pasteJson(ctx);
    case 2:
      Pasteboard.copy(chatbotPrompt(ctx.config.aisles));
      return message("Prompt copied", PROMPT_HELP);
    case 3:
      return editRecipe(ctx, { name: "" }, { title: "New recipe" });
    default:
      return null;
  }
}
async function importAndEdit(ctx, url) {
  const dup = ctx.recipes.find((r) => r.sourceUrl && r.sourceUrl === url);
  if (dup && !await confirm("Already saved", `\u201C${dup.name}\u201D came from this link. Import it again?`, "Import")) return null;
  let input;
  try {
    input = await importFromUrl(url);
  } catch (e) {
    if (e instanceof NoRecipeData) return offerPrompt(ctx, e.message);
    throw e;
  }
  return editRecipe(ctx, input, { title: "Check and save" });
}
async function offerPrompt(ctx, why) {
  const pick = await choose("Can't read this recipe", ["Copy prompt for AI", "Type it in"], { message: why });
  if (pick === 0) {
    Pasteboard.copy(chatbotPrompt(ctx.config.aisles));
    await message("Prompt copied", PROMPT_HELP);
  } else if (pick === 1) {
    return editRecipe(ctx, { name: "" }, { title: "New recipe" });
  }
  return null;
}
async function pasteJson(ctx) {
  const text = String(Pasteboard.paste() ?? "");
  if (!text.trim()) return message("Clipboard is empty", "Copy the AI's JSON reply first.");
  const items = parseRecipeJson(text);
  if (items.length === 1) return editRecipe(ctx, items[0], { title: "Check and save" });
  const saved = [];
  const failed = [];
  for (const item of items) {
    try {
      const recipe = normalizeRecipe(item, { aisles: ctx.config.aisles, existingIds: ctx.recipes.map((r) => r.id) });
      ctx.saveRecipe(recipe);
      saved.push(recipe.name);
    } catch (e) {
      failed.push(e.message);
    }
  }
  await message(`Saved ${saved.length} recipes`, [saved.join("\n"), failed.length ? `
Skipped:
${failed.join("\n")}` : ""].join(""));
  return null;
}
async function importShared(ctx, input) {
  const url = input.urls?.[0];
  const text = input.plainTexts?.[0]?.trim();
  let saved;
  if (url) saved = await importAndEdit(ctx, url);
  else if (text && URL_RE.test(text)) saved = await importAndEdit(ctx, text);
  else if (text && /^\s*(```|\{|\[)/.test(text)) {
    const items = parseRecipeJson(text);
    saved = await editRecipe(ctx, items[0], { title: "Check and save" });
  } else {
    return offerPrompt(ctx, "Share a recipe link, or the recipe JSON from an AI chat app. For text or photos, copy the prompt for AI and use any AI chat app.");
  }
  if (saved) await message("Saved", `\u201C${saved.name}\u201D is in your recipes.`);
  return saved;
}

// src/app/screens.js
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var PREF_ICON = { include: "\u2B50\uFE0F", ignore: "\u{1F6AB}", normal: "" };
function shortDate(ymd2) {
  const [, m, d] = ymd2.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
async function home(ctx) {
  await liveTable(async (t, refresh) => {
    const plan = ctx.plan;
    header(t, `\u{1F37D} Week of ${shortDate(plan.weekOf)}`);
    if (isPastWeek(plan)) {
      button(t, "This week is over \u2014 start next week", async () => {
        await startNextWeek(ctx);
        await refresh();
      });
    }
    plan.days.forEach((d, i) => {
      const recipe = d.kind === "recipe" ? ctx.recipe(d.recipeId) : null;
      const title = recipe ? recipe.name : d.kind === "out" ? "\u{1F374} Eating out" : "\u2014";
      row(t, title, `${d.label} ${shortDate(d.date)}`, async () => {
        await nightMenu(ctx, i);
        await refresh();
      }, { right: d.locked ? "\u{1F512}" : "" });
    });
    header(t, "Plan");
    button(t, "\u{1F3B2} Fill empty and unlocked nights", async () => {
      if (!ctx.recipes.length) return message("No recipes yet", "Add some recipes first.");
      await ctx.updatePlan((p) => fillPlan(p, ctx.recipes));
      await refresh();
    });
    button(t, "\u{1F5D3} Start next week", async () => {
      if (await confirm("Start next week?", "Clears this week's nights. Always-include and never-pick choices carry over.", "Start")) {
        await startNextWeek(ctx);
        await refresh();
      }
    });
    button(t, "\u{1F6D2} Send grocery list to Reminders", () => groceries(ctx));
    header(t, "Recipes");
    button(t, `\u{1F4D6} Recipe library (${ctx.recipes.length})`, async () => {
      await library(ctx);
      await refresh();
    });
    button(t, "\uFF0B Add a recipe", async () => {
      await addRecipeMenu(ctx);
      await refresh();
    });
    button(t, "\u2699\uFE0F Settings", async () => {
      await settings(ctx);
      await refresh();
    });
    button(t, "\u{1F504} Reload from iCloud", async () => {
      await ctx.load();
      await refresh();
    });
  });
}
async function startNextWeek(ctx) {
  await ctx.updatePlan((p) => {
    const next = emptyPlan({ startDay: ctx.config.startDay, nights: ctx.config.nights, previous: p });
    return ctx.recipes.length ? fillPlan(next, ctx.recipes) : next;
  });
}
async function nightMenu(ctx, i) {
  const d = ctx.plan.days[i];
  const recipe = d.kind === "recipe" ? ctx.recipe(d.recipeId) : null;
  const title = `${d.label} ${shortDate(d.date)}`;
  const actions = [];
  if (recipe) {
    actions.push(["View recipe", () => viewRecipe(recipe)]);
    actions.push(["Swap for another random recipe", () => ctx.updatePlan((p) => rerollDay(p, i, ctx.recipes))]);
  } else {
    actions.push(["Pick a random recipe", () => ctx.updatePlan((p) => rerollDay(p, i, ctx.recipes))]);
  }
  actions.push(["Choose a recipe\u2026", async () => {
    const id = await pickRecipe(ctx, `Recipe for ${title}`);
    if (id) await ctx.updatePlan((p) => setDay(p, i, { kind: "recipe", recipeId: id }));
  }]);
  if (recipe) actions.push([d.locked ? "Unlock (allow rerolls)" : "Lock (keep when rerolling)", () => ctx.updatePlan((p) => toggleLock(p, i))]);
  if (d.kind !== "out") actions.push(["Eating out", () => ctx.updatePlan((p) => setDay(p, i, { kind: "out" }))]);
  if (d.kind !== "empty") actions.push(["Clear night", () => ctx.updatePlan((p) => setDay(p, i, { kind: "empty" }))]);
  const pick = await choose(title, actions.map((a) => a[0]), { message: recipe ? recipe.name : "" });
  if (pick >= 0) await actions[pick][1]();
}
async function pickRecipe(ctx, title) {
  let chosen = null;
  let filter = "";
  await liveTable(async (t, refresh) => {
    header(t, title);
    button(t, filter ? `\u{1F50D} \u201C${filter}\u201D (tap to change)` : "\u{1F50D} Search", async () => {
      const v = await promptOne("Search", filter, { placeholder: "name or tag", ok: "Search" });
      if (v != null) filter = v.trim();
      await refresh();
    });
    for (const r of filtered(ctx.recipes, filter)) {
      const rr = row(t, r.name, r.tags.join(", "), null, { right: PREF_ICON[preferenceOf(ctx.plan, r.id)] });
      rr.dismissOnSelect = true;
      rr.onSelect = () => {
        chosen = r.id;
      };
    }
  });
  return chosen;
}
function filtered(recipes, filter) {
  const q = filter.toLowerCase();
  if (!q) return recipes;
  return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)));
}
async function library(ctx) {
  let filter = "";
  await liveTable(async (t, refresh) => {
    header(t, `Recipes (${ctx.recipes.length})`);
    button(t, "\uFF0B Add a recipe", async () => {
      await addRecipeMenu(ctx);
      await refresh();
    });
    button(t, filter ? `\u{1F50D} \u201C${filter}\u201D (tap to change)` : "\u{1F50D} Search", async () => {
      const v = await promptOne("Search", filter, { placeholder: "name or tag", ok: "Search" });
      if (v != null) filter = v.trim();
      await refresh();
    });
    row(t, "\u2B50\uFE0F always include   \u{1F6AB} never pick", "", null);
    for (const r of filtered(ctx.recipes, filter)) {
      row(t, r.name, r.tags.join(", "), async () => {
        await recipeMenu(ctx, r);
        await refresh();
      }, { right: PREF_ICON[preferenceOf(ctx.plan, r.id)] });
    }
  });
}
async function recipeMenu(ctx, recipe) {
  const pref = preferenceOf(ctx.plan, recipe.id);
  const actions = [
    ["View", () => viewRecipe(recipe)],
    ["Edit", () => editRecipe(ctx, recipe, { existing: recipe })]
  ];
  if (pref !== "include") actions.push(["\u2B50\uFE0F Always include when filling the week", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "include"))]);
  if (pref !== "ignore") actions.push(["\u{1F6AB} Never pick when filling the week", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "ignore"))]);
  if (pref !== "normal") actions.push(["Normal (pick at random)", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "normal"))]);
  actions.push(["Put on a night\u2026", async () => {
    const nights = ctx.plan.days.map((d) => `${d.label} ${shortDate(d.date)}`);
    const n = await choose(`Cook ${recipe.name} on`, nights);
    if (n >= 0) await ctx.updatePlan((p) => setDay(p, n, { kind: "recipe", recipeId: recipe.id }));
  }]);
  actions.push(["Delete", async () => {
    if (await confirm(`Delete ${recipe.name}?`, "This removes it for both phones.", "Delete", true)) await ctx.deleteRecipe(recipe.id);
  }]);
  const pick = await choose(recipe.name, actions.map((a) => a[0]), { destructive: [actions.length - 1] });
  if (pick >= 0) await actions[pick][1]();
}
async function groceries(ctx) {
  const recipes = plannedRecipes(ctx.plan, ctx.recipes);
  if (!recipes.length) return message("Nothing planned", "Add some recipes to this week first.");
  const listName = ctx.device.get().remindersList;
  const items = planExport(
    buildGroceryList(recipes, { aisles: ctx.config.aisles }),
    await openReminderTitles(listName),
    { pantry: ctx.config.pantry }
  );
  const selected = new Set(items.filter((i) => i.status === "add").map((i) => i.key));
  let send = false;
  await liveTable(async (t, refresh) => {
    header(t, `\u{1F6D2} ${recipes.length} meals \u2192 \u201C${listName}\u201D`);
    const go = row(t, `Add ${selected.size} items to Reminders`, "Tap items below to include or skip them", null);
    go.dismissOnSelect = true;
    go.onSelect = () => {
      send = true;
    };
    for (const group of groupByAisle(items)) {
      header(t, group.aisle);
      for (const item of group.items) {
        const on = selected.has(item.key);
        const why = item.status === "duplicate" ? "Already on the list" : item.status === "pantry" ? "Usually in the pantry" : item.notes;
        row(t, `${on ? "\u2705" : "\u2B1C\uFE0F"} ${item.title}`, why, async () => {
          if (on) selected.delete(item.key);
          else selected.add(item.key);
          await refresh();
        });
      }
    }
  });
  if (!send || !selected.size) return;
  const n = await addReminders(listName, items.filter((i) => selected.has(i.key)));
  await message("Grocery list updated", `Added ${n} items to \u201C${listName}\u201D.`);
}
async function settings(ctx) {
  await liveTable(async (t, refresh) => {
    const device = ctx.device.get();
    const cfg = ctx.config;
    header(t, "This phone");
    row(t, device.remindersList, "Reminders list for groceries", async () => {
      const lists = await reminderLists();
      if (!lists.length) return message("No Reminders lists", "Create a list in Reminders first.");
      const i = await choose("Grocery list", lists, { message: "Items are added to this list on this phone." });
      if (i >= 0) ctx.device.set({ remindersList: lists[i] });
      await refresh();
    });
    header(t, "Shared with both phones");
    row(t, DAY_NAMES[cfg.startDay], "Week starts on", async () => {
      const i = await choose("Week starts on", DAY_NAMES);
      if (i >= 0) await ctx.updateConfig({ startDay: i });
      await refresh();
    });
    row(t, String(cfg.nights), "Nights per week", async () => {
      const i = await choose("Nights per week", ["1", "2", "3", "4", "5", "6", "7"]);
      if (i >= 0) await ctx.updateConfig({ nights: i + 1 });
      await refresh();
    });
    row(t, cfg.pantry.join(", ") || "\u2014", "Pantry items (unticked by default on the grocery list)", async () => {
      const v = await promptOne("Pantry items", cfg.pantry.join(", "), { message: "Comma separated" });
      if (v != null) await ctx.updateConfig({ pantry: v.split(",").map((s) => s.trim()).filter(Boolean) });
      await refresh();
    });
    row(t, cfg.aisles.join(", "), "Aisles, in shopping order", async () => {
      const v = await promptOne("Aisles", cfg.aisles.join(", "), { message: "Comma separated, in the order you walk the store. Keep \u201COther\u201D last." });
      if (v != null) {
        const aisles = v.split(",").map((s) => s.trim()).filter(Boolean);
        if (aisles.length) await ctx.updateConfig({ aisles: aisles.includes("Other") ? aisles : [...aisles, "Other"] });
      }
      await refresh();
    });
    button(t, "\u{1F4CB} Copy prompt for AI", async () => {
      Pasteboard.copy(chatbotPrompt(cfg.aisles));
      await message("Prompt copied", "Paste it into any AI chat app with a recipe, then use \u201CPaste recipe JSON\u201D.");
    });
    header(t, "About");
    row(t, `Version ${ctx.version}`, "Updates load automatically from GitHub", null);
  });
}

// src/app/main.js
async function run({ version = "dev", input = globalThis.args } = {}) {
  console.log(`Meal Planner ${version} starting`);
  try {
    const ctx = new Ctx({ version });
    console.log(`Shared folder: ${ctx.store.root}`);
    await ctx.load();
    console.log(`Loaded ${ctx.recipes.length} recipes, week of ${ctx.plan.weekOf}`);
    const shared = input && (input.urls?.length || input.plainTexts?.length || input.images?.length);
    if (shared) await importShared(ctx, input);
    else await home(ctx);
    console.log("Closed");
  } catch (e) {
    console.error(`Meal Planner error: ${e?.stack ?? e}`);
    if (e instanceof SetupError) await message("Set up the shared folder", e.message);
    else await showError(e);
  }
}
