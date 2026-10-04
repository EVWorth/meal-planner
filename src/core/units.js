// Unit normalization and conversion. Pure JS, no Scriptable globals.

// Canonical unit -> { family, factor to family base, system }
// Volume base is ml, weight base is g. Count-like units have no family and
// only merge with themselves.
const UNITS = {
  tsp: { family: "volume", factor: 4.92892, system: "us" },
  tbsp: { family: "volume", factor: 14.7868, system: "us" },
  cup: { family: "volume", factor: 236.588, system: "us" },
  "fl oz": { family: "volume", factor: 29.5735, system: "us" },
  pint: { family: "volume", factor: 473.176, system: "us" },
  quart: { family: "volume", factor: 946.353, system: "us" },
  gallon: { family: "volume", factor: 3785.41, system: "us" },
  ml: { family: "volume", factor: 1, system: "metric" },
  l: { family: "volume", factor: 1000, system: "metric" },
  g: { family: "weight", factor: 1, system: "metric" },
  kg: { family: "weight", factor: 1000, system: "metric" },
  oz: { family: "weight", factor: 28.3495, system: "us" },
  lb: { family: "weight", factor: 453.592, system: "us" },
};

const COUNT_UNITS = [
  "clove", "can", "jar", "package", "bunch", "head", "slice", "piece",
  "stick", "sprig", "pinch", "dash", "handful", "bag", "box", "bottle",
  "container", "stalk", "fillet", "sheet", "loaf",
];

const ALIASES = {
  t: "tsp", tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  T: "tbsp", tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  c: "cup", cup: "cup", cups: "cup",
  "fl oz": "fl oz", "fl. oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz", floz: "fl oz",
  pt: "pint", pint: "pint", pints: "pint",
  qt: "quart", quart: "quart", quarts: "quart",
  gal: "gallon", gallon: "gallon", gallons: "gallon",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  g: "g", gr: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
};
for (const u of COUNT_UNITS) {
  ALIASES[u] = u;
  ALIASES[u + "s"] = u;
  ALIASES[u + "es"] = u;
}
ALIASES.loaves = "loaf";

/** Canonical unit for a raw unit string, or null if it isn't a known unit. */
export function canonicalUnit(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\.$/, "");
  if (!s) return null;
  // "T" (tablespoon) vs "t" (teaspoon) is the one case-sensitive alias.
  if (s === "T" || s === "t") return ALIASES[s];
  const lower = s.toLowerCase();
  return ALIASES[lower] ?? null;
}

export function unitInfo(unit) {
  return UNITS[unit] ?? null;
}

export function isKnownUnit(unit) {
  return unit in UNITS || COUNT_UNITS.includes(unit);
}

/**
 * Sum a list of {qty, unit} amounts (unit already canonical or "").
 * Returns a list of {qty, unit}: one per incompatible group.
 * Entries with qty null are kept as a single {qty: null, unit} marker so the
 * caller knows "some amount" was requested.
 */
export function sumAmounts(amounts) {
  const groups = new Map(); // key -> {family?, units:Set, base, unit, unknownQty}
  for (const a of amounts) {
    const unit = a.unit || "";
    const info = UNITS[unit];
    const key = info ? info.family : "u:" + unit;
    let g = groups.get(key);
    if (!g) {
      g = { info: info ? info.family : null, units: new Set(), total: 0, hasQty: false, unit };
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
    if (!us) return base >= 1000 ? "l" : "ml";
    if (base >= UNITS.cup.factor / 4) return "cup";
    if (base >= UNITS.tbsp.factor) return "tbsp";
    return "tsp";
  }
  if (!us) return base >= 1000 ? "kg" : "g";
  return base >= UNITS.lb.factor ? "lb" : "oz";
}

const FRACTIONS = [
  [1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [3 / 8, "3/8"], [1 / 2, "1/2"],
  [5 / 8, "5/8"], [2 / 3, "2/3"], [3 / 4, "3/4"], [7 / 8, "7/8"],
];

/** Human-friendly quantity: fractions for US units and counts, decimals for metric. */
export function formatQty(qty, unit = "") {
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

/** "2 cups", "1 can", "3" — pluralizes count units and cup. */
export function formatAmount({ qty, unit }) {
  if (qty == null) return unit ? `some ${plural(unit)}` : "";
  const q = formatQty(qty, unit);
  if (!unit) return q;
  const many = qty > 1.0001;
  const u = many && (COUNT_UNITS.includes(unit) || unit === "cup" || unit === "pint" || unit === "quart" || unit === "gallon")
    ? plural(unit)
    : unit;
  return `${q} ${u}`;
}

function plural(unit) {
  if (unit === "loaf") return "loaves";
  if (/(sh|ch|x|s)$/.test(unit)) return unit + "es";
  return unit + "s";
}
