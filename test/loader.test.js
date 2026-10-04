// Runs loader.js against the Scriptable mock: update, cache, offline, and
// the fallback when importModule can't resolve the cached file.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createScriptable } from "./scriptable-mock.js";

const loaderSrc = fs.readFileSync(new URL("../loader.js", import.meta.url), "utf8");
const fakeApp = 'module.exports = { run: async (o) => { globalThis.ran = o; } };';

async function runLoader(s, { importModule } = {}) {
  const scripts = path.join(s.shared, "..", "Scriptable");
  fs.mkdirSync(scripts, { recursive: true });
  s.context.module = { filename: path.join(scripts, "Meal Planner.js") };
  s.context.importModule = importModule ?? (() => { throw new Error("Module not found"); });
  s.context.ran = null;
  await vm.runInContext(`(async () => {\n${loaderSrc}\n})()`, s.context);
  return { scripts, ran: s.context.ran };
}

test("loader downloads the app at the current commit and runs it", async () => {
  let online = true;
  const s = createScriptable({
    fetch: (req) => {
      if (!online) throw new Error("offline");
      if (req.url.startsWith("https://api.github.com/")) return { status: 200, body: "abc1234def\n" };
      if (req.url === "https://raw.githubusercontent.com/EVWorth/meal-planner/abc1234def/dist/app.js") return { status: 200, body: fakeApp };
      return { status: 404, body: "" };
    },
  });
  let r = await runLoader(s);
  assert.equal(r.ran.version, "abc1234");
  assert.equal(fs.readFileSync(path.join(r.scripts, "meal-planner-lib", "app.js"), "utf8"), fakeApp);

  // Same commit: no second download.
  const before = s.log.requests.length;
  r = await runLoader(s);
  assert.equal(s.log.requests.length - before, 1);
  assert.equal(r.ran.version, "abc1234");

  // Offline: runs the cached copy.
  online = false;
  r = await runLoader(s);
  assert.equal(r.ran.version, "abc1234 (offline)");
  s.cleanup();
});

test("loader reports a failed first download", async () => {
  const s = createScriptable({ fetch: () => ({ status: 500, body: "" }), steps: [{ alert: "OK" }] });
  const r = await runLoader(s);
  assert.equal(r.ran, null);
  assert.equal(s.log.alerts[0].title, "Couldn't download Meal Planner");
  s.cleanup();
});
