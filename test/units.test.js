import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalUnit, sumAmounts, formatQty, formatAmount } from "../src/core/units.js";

test("canonicalUnit maps aliases and keeps T/t distinct", () => {
  assert.equal(canonicalUnit("Tablespoons"), "tbsp");
  assert.equal(canonicalUnit("T"), "tbsp");
  assert.equal(canonicalUnit("t"), "tsp");
  assert.equal(canonicalUnit("lbs."), "lb");
  assert.equal(canonicalUnit("cloves"), "clove");
  assert.equal(canonicalUnit("onion"), null);
});

test("sumAmounts adds same units", () => {
  assert.deepEqual(sumAmounts([{ qty: 1, unit: "cup" }, { qty: 0.5, unit: "cup" }]), [{ qty: 1.5, unit: "cup" }]);
});

test("sumAmounts converts within a family", () => {
  const [r] = sumAmounts([{ qty: 1, unit: "cup" }, { qty: 4, unit: "tbsp" }]);
  assert.equal(r.unit, "cup");
  assert.ok(Math.abs(r.qty - 1.25) < 0.001);
  const [w] = sumAmounts([{ qty: 8, unit: "oz" }, { qty: 1, unit: "lb" }]);
  assert.equal(w.unit, "lb");
  assert.ok(Math.abs(w.qty - 1.5) < 0.001);
  const [m] = sumAmounts([{ qty: 500, unit: "g" }, { qty: 1, unit: "kg" }]);
  assert.deepEqual([m.unit, Math.round(m.qty * 10) / 10], ["kg", 1.5]);
});

test("sumAmounts keeps incompatible units separate", () => {
  const r = sumAmounts([{ qty: 2, unit: "" }, { qty: 1, unit: "cup" }, { qty: null, unit: "" }]);
  assert.deepEqual(r, [{ qty: 2, unit: "" }, { qty: 1, unit: "cup" }]);
  assert.deepEqual(sumAmounts([{ qty: null, unit: "" }]), [{ qty: null, unit: "" }]);
});

test("formatQty uses fractions for US units and decimals for metric", () => {
  assert.equal(formatQty(1.5, "cup"), "1 1/2");
  assert.equal(formatQty(0.333, "cup"), "1/3");
  assert.equal(formatQty(2, ""), "2");
  assert.equal(formatQty(1.98, ""), "2");
  assert.equal(formatQty(250, "g"), "250");
  assert.equal(formatQty(1.25, "kg"), "1.3");
});

test("formatAmount pluralizes", () => {
  assert.equal(formatAmount({ qty: 2, unit: "can" }), "2 cans");
  assert.equal(formatAmount({ qty: 1, unit: "cup" }), "1 cup");
  assert.equal(formatAmount({ qty: 3, unit: "bunch" }), "3 bunches");
  assert.equal(formatAmount({ qty: 2, unit: "tbsp" }), "2 tbsp");
});
