// Weekly plan: one slot per night. Pure functions that return new plans.
//
// plan.json:
// {
//   weekOf: "YYYY-MM-DD",
//   days: [{ date, label, kind: "recipe"|"out"|"empty", recipeId, locked }],
//   include: [recipeId],   // always pick these when generating
//   ignore: [recipeId]     // never pick these when generating
// }
// include/ignore carry over from week to week until changed.

const LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ymd(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The first day of the week on or after `today` (0 = Sunday ... 6 = Saturday). */
export function weekStart(today, startDay) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() + ((startDay - d.getDay() + 7) % 7));
  return d;
}

export function emptyPlan({ today = new Date(), startDay = 1, nights = 7, previous = null } = {}) {
  const start = weekStart(today, startDay);
  const days = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date: ymd(d), label: LABELS[d.getDay()], kind: "empty", recipeId: null, locked: false });
  }
  return { weekOf: ymd(start), days, include: [...(previous?.include ?? [])], ignore: [...(previous?.ignore ?? [])] };
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Drop references to recipes that no longer exist. */
export function prunePlan(plan, recipes) {
  const ids = new Set(recipes.map((r) => r.id));
  return {
    ...plan,
    days: plan.days.map((d) => (d.kind === "recipe" && !ids.has(d.recipeId) ? { ...d, kind: "empty", recipeId: null, locked: false } : d)),
    include: plan.include.filter((id) => ids.has(id)),
    ignore: plan.ignore.filter((id) => ids.has(id)),
  };
}

/**
 * Fill every unlocked recipe/empty night. Locked nights and "eating out"
 * nights are kept. Included recipes are placed first, then random picks;
 * no recipe appears twice. Nights stay "empty" when the library runs out.
 */
export function fillPlan(plan, recipes, rng = Math.random) {
  const ignore = new Set(plan.ignore);
  const keep = (d) => d.kind === "out" || (d.kind === "recipe" && d.locked);
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

/** Swap one night for a different recipe not already in the plan. */
export function rerollDay(plan, index, recipes, rng = Math.random) {
  const ignore = new Set(plan.ignore);
  const used = new Set(plan.days.filter((d) => d.kind === "recipe").map((d) => d.recipeId));
  const pool = recipes.filter((r) => !ignore.has(r.id) && !used.has(r.id));
  if (!pool.length) return plan;
  const pick = pool[Math.floor(rng() * pool.length)];
  return setDay(plan, index, { kind: "recipe", recipeId: pick.id });
}

export function setDay(plan, index, patch) {
  const days = plan.days.map((d, i) => (i === index ? { ...d, ...patch } : d));
  const d = days[index];
  if (d.kind !== "recipe") days[index] = { ...d, recipeId: null, locked: false };
  return { ...plan, days };
}

export function toggleLock(plan, index) {
  const d = plan.days[index];
  if (d.kind !== "recipe") return plan;
  return setDay(plan, index, { locked: !d.locked });
}

/** Set a recipe's generation preference: "include", "ignore" or "normal". */
export function setPreference(plan, recipeId, pref) {
  const include = plan.include.filter((id) => id !== recipeId);
  const ignore = plan.ignore.filter((id) => id !== recipeId);
  if (pref === "include") include.push(recipeId);
  if (pref === "ignore") ignore.push(recipeId);
  return { ...plan, include, ignore };
}

export function preferenceOf(plan, recipeId) {
  if (plan?.include?.includes(recipeId)) return "include";
  if (plan?.ignore?.includes(recipeId)) return "ignore";
  return "normal";
}

/** Recipes cooked this week, in night order. */
export function plannedRecipes(plan, recipes) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return plan.days
    .filter((d) => d.kind === "recipe")
    .map((d) => byId.get(d.recipeId))
    .filter(Boolean);
}

/** True when the plan's week has fully passed. */
export function isPastWeek(plan, today = new Date()) {
  if (!plan?.days?.length) return true;
  return parseYmd(plan.days[plan.days.length - 1].date) < parseYmd(ymd(today));
}
