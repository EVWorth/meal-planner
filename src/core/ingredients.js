// Ingredient line parsing and item-name normalization.
import { canonicalUnit } from "./units.js";

const UNICODE_FRACTIONS = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅖": 0.4,
  "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// A number token: "1", "1.5", "1/2", "1 1/2", "1½", "½"
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\s*[${Object.keys(UNICODE_FRACTIONS).join("")}]|\d+\/\d+|\d*\.\d+|\d+(?:[${Object.keys(UNICODE_FRACTIONS).join("")}])?|[${Object.keys(UNICODE_FRACTIONS).join("")}])`;
const LEADING_QTY = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|—|to)\s*(${NUM}))?\s*`);

export function parseNumber(token) {
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

/**
 * Parse a free-text ingredient line into {qty, unit, item, note}.
 * "1 1/2 cups all-purpose flour, sifted" -> {qty:1.5, unit:"cup", item:"all-purpose flour", note:"sifted"}
 * "2 (14 oz) cans diced tomatoes" -> {qty:2, unit:"can", item:"diced tomatoes", note:"14 oz"}
 * Ranges ("2-3 cloves") take the upper bound, since this feeds a shopping list.
 */
export function parseIngredientLine(line) {
  let s = String(line ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[-•*▢□]\s*/, "")
    .trim();
  const result = { qty: null, unit: "", item: "", note: "" };
  if (!s) return result;

  const m = s.match(LEADING_QTY);
  if (m) {
    result.qty = parseNumber(m[2] ?? m[1]);
    s = s.slice(m[0].length);
  }

  const notes = [];
  // Parenthetical size right after the quantity: "(14 oz)"
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

  // Trailing notes: ", sifted" or "(optional)"
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
  // "salt to taste", "parsley for serving"
  const trailing = s.match(/\s+((?:to taste|as needed|for serving|for garnish|optional)\.?)\s*$/i);
  if (trailing) {
    notes.unshift(trailing[1].replace(/\.$/, ""));
    s = s.slice(0, trailing.index);
  }
  result.item = s.replace(/\s+/g, " ").trim();
  result.note = notes.filter(Boolean).join("; ");
  return result;
}

const SIZE_WORDS = new Set(["large", "medium", "small", "fresh", "extra-large", "jumbo"]);

/** Key used to merge the same item across recipes: lowercase, singular, no size words. */
export function itemKey(name) {
  const words = String(name ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !SIZE_WORDS.has(w));
  if (!words.length) return "";
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(" ");
}

const IRREGULAR = { leaves: "leaf", loaves: "loaf", halves: "half", knives: "knife" };

export function singular(word) {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word in IRREGULAR) return IRREGULAR[word];
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}
