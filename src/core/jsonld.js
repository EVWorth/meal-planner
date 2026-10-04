// Extract a schema.org Recipe from a web page's JSON-LD, and turn HTML into
// plain text for the Claude fallback.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", frac12: "½", frac14: "¼", frac34: "¾", deg: "°", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(s) {
  return String(s ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function clean(s) {
  return decodeEntities(String(s ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
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

/** JSON-LD blocks in a page, parsed. Bad blocks are skipped. */
export function jsonLdBlocks(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html ?? "")))) {
    const body = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    try {
      out.push(JSON.parse(body));
    } catch {
      try {
        // Some sites put raw newlines/tabs inside strings.
        out.push(JSON.parse(body.replace(/[\u0000-\u001f]+/g, " ")));
      } catch {
        // skip
      }
    }
  }
  return out;
}

/**
 * Recipe input (for normalizeRecipe) from a page's JSON-LD, or null if the
 * page has no usable Recipe.
 */
export function recipeFromHtml(html, url = "") {
  const node = findRecipe(jsonLdBlocks(html));
  if (!node) return null;
  const ingredients = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : node.ingredients ?? [])
    .map(clean)
    .filter(Boolean);
  if (!ingredients.length) return null;
  return {
    name: clean(node.name),
    servings: servings(node.recipeYield),
    tags: tags(node),
    ingredients,
    steps: instructions(node.recipeInstructions),
    sourceUrl: url || (typeof node.url === "string" ? node.url : ""),
    notes: "",
  };
}

/** Readable text of a page, for sending to Claude when there is no JSON-LD. */
export function htmlToText(html) {
  return decodeEntities(
    String(html ?? "")
      .replace(/<(script|style|noscript|svg|iframe|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\r]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
