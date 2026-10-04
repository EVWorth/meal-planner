import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPlan, fillPlan, rerollDay, setDay, toggleLock, setPreference, preferenceOf, plannedRecipes, prunePlan, weekStart, ymd, isPastWeek } from "../src/core/plan.js";

const recipes = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) => ({ id, name: id.toUpperCase() }));
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const today = new Date(2026, 9, 4); // Sunday 4 Oct 2026

test("weekStart picks the next start day on or after today", () => {
  assert.equal(ymd(weekStart(today, 1)), "2026-10-05");
  assert.equal(ymd(weekStart(today, 0)), "2026-10-04");
});

test("emptyPlan has 7 labelled nights and carries preferences", () => {
  const p = emptyPlan({ today, startDay: 1, previous: { include: ["a"], ignore: ["b"] } });
  assert.equal(p.weekOf, "2026-10-05");
  assert.deepEqual(p.days.map((d) => d.label), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  assert.deepEqual([p.include, p.ignore], [["a"], ["b"]]);
});

test("fillPlan fills every night with distinct recipes, honoring include/ignore", () => {
  let p = emptyPlan({ today });
  p = setPreference(p, "a", "include");
  p = setPreference(p, "b", "ignore");
  p = fillPlan(p, recipes, seeded());
  const ids = p.days.map((d) => d.recipeId);
  assert.equal(new Set(ids).size, 7);
  assert.ok(ids.includes("a"));
  assert.ok(!ids.includes("b"));
});

test("fillPlan keeps locked and eating-out nights", () => {
  let p = fillPlan(emptyPlan({ today }), recipes, seeded(2));
  const locked = p.days[0].recipeId;
  p = toggleLock(p, 0);
  p = setDay(p, 4, { kind: "out" });
  const p2 = fillPlan(p, recipes, seeded(3));
  assert.equal(p2.days[0].recipeId, locked);
  assert.equal(p2.days[0].locked, true);
  assert.equal(p2.days[4].kind, "out");
  assert.equal(p2.days[4].recipeId, null);
  const ids = p2.days.filter((d) => d.kind === "recipe").map((d) => d.recipeId);
  assert.equal(new Set(ids).size, 6);
});

test("fillPlan leaves nights empty when the library runs out", () => {
  const p = fillPlan(emptyPlan({ today }), recipes.slice(0, 3), seeded());
  assert.equal(p.days.filter((d) => d.kind === "recipe").length, 3);
  assert.equal(p.days.filter((d) => d.kind === "empty").length, 4);
});

test("rerollDay picks a recipe not already planned", () => {
  const p = fillPlan(emptyPlan({ today }), recipes, seeded());
  const before = new Set(p.days.map((d) => d.recipeId));
  const p2 = rerollDay(p, 2, recipes, seeded(9));
  assert.ok(!before.has(p2.days[2].recipeId));
  const full = fillPlan(emptyPlan({ today }), recipes.slice(0, 7), seeded());
  assert.equal(rerollDay(full, 2, recipes.slice(0, 7), seeded()), full, "no change when nothing is left");
});

test("preferences, pruning, and planned recipes", () => {
  let p = setPreference(emptyPlan({ today }), "a", "ignore");
  assert.equal(preferenceOf(p, "a"), "ignore");
  p = setPreference(p, "a", "normal");
  assert.equal(preferenceOf(p, "a"), "normal");
  p = setDay(p, 0, { kind: "recipe", recipeId: "zzz" });
  p = setDay(p, 1, { kind: "recipe", recipeId: "c" });
  p = prunePlan(p, recipes);
  assert.equal(p.days[0].kind, "empty");
  assert.deepEqual(plannedRecipes(p, recipes).map((r) => r.id), ["c"]);
});

test("isPastWeek", () => {
  const p = emptyPlan({ today });
  assert.equal(isPastWeek(p, new Date(2026, 9, 11)), false);
  assert.equal(isPastWeek(p, new Date(2026, 9, 12)), true);
});
