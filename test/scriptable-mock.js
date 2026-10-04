// A small fake of the Scriptable APIs the app uses, so the bundled
// dist/app.js can be driven end to end in Node. It checks wiring (imports,
// call shapes, flows), not iOS behaviour: iCloud, Reminders and the real
// UI still need an on-device test.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

const flush = async () => {
  for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r));
};

/**
 * Build a sandbox. `steps` is the scripted user: each presented Alert or
 * UITable takes the next step in order.
 *   { alert: (a) => index }            answer an Alert (sheet or alert)
 *   { table: async (t) => {...} }      interact with a UITable, then close it
 */
export function createScriptable({ steps = [], fetch = () => ({ status: 404, body: "" }), pasteboard = "", reminderLists = ["Groceries"] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "meal-planner-"));
  const shared = path.join(root, "icloud", "MealPlanner");
  const local = path.join(root, "local");
  fs.mkdirSync(shared, { recursive: true });
  fs.mkdirSync(local, { recursive: true });
  const log = { alerts: [], tables: [], reminders: [], requests: [], unhandled: [] };
  const queue = [...steps];

  function next(kind, what) {
    const step = queue.shift();
    if (!step || !(kind in step)) {
      throw new Error(`Unscripted ${kind}: ${what}. Next step: ${step ? Object.keys(step) : "none"}`);
    }
    return step[kind];
  }

  class FileManager {
    static iCloud() { return new FileManager(); }
    static local() { return new FileManager(); }
    bookmarkExists(name) { return name === "MealPlanner"; }
    bookmarkedPath() { return shared; }
    documentsDirectory() { return local; }
    joinPath(a, b) { return path.join(a, b); }
    fileExists(p) { return fs.existsSync(p); }
    isFileDownloaded(p) { return fs.existsSync(p); }
    createDirectory(p) { fs.mkdirSync(p, { recursive: true }); }
    listContents(p) { return fs.readdirSync(p); }
    readString(p) { return fs.readFileSync(p, "utf8"); }
    writeString(p, s) { fs.writeFileSync(p, s); }
    remove(p) { fs.rmSync(p, { recursive: true }); }
    async downloadFileFromiCloud(p) {
      // Simulate an offloaded file: ".name.icloud" placeholder becomes the real file.
      const placeholder = path.join(path.dirname(p), `.${path.basename(p)}.icloud`);
      if (fs.existsSync(placeholder)) fs.renameSync(placeholder, p);
    }
  }

  const keychain = new Map();
  const Keychain = {
    contains: (k) => keychain.has(k),
    get: (k) => keychain.get(k),
    set: (k, v) => keychain.set(k, v),
    remove: (k) => keychain.delete(k),
  };

  class Request {
    constructor(url) { this.url = url; this.method = "GET"; this.headers = {}; this.body = null; }
    async #send() {
      log.requests.push({ url: this.url, method: this.method, headers: this.headers, body: this.body });
      const r = await fetch(this);
      this.response = { statusCode: r.status };
      return r.body;
    }
    async loadString() { const b = await this.#send(); return typeof b === "string" ? b : JSON.stringify(b); }
    async loadJSON() { const b = await this.#send(); return typeof b === "string" ? JSON.parse(b) : b; }
  }

  class Alert {
    constructor() { this.actions = []; this.fields = []; this.values = []; }
    addAction(t) { this.actions.push(t); }
    addDestructiveAction(t) { this.actions.push(t); }
    addCancelAction() {}
    addTextField(placeholder, value) { this.fields.push({ placeholder, value }); }
    textFieldValue(i) { return this.values[i] ?? this.fields[i].value; }
    async #present() {
      log.alerts.push({ title: this.title, message: this.message, actions: this.actions });
      const answer = next("alert", `${this.title} [${this.actions.join(" | ")}]`);
      const r = typeof answer === "function" ? await answer(this) : answer;
      if (typeof r === "string") {
        const i = this.actions.indexOf(r);
        if (i < 0) throw new Error(`No action "${r}" in alert "${this.title}": ${this.actions.join(" | ")}`);
        return i;
      }
      return r;
    }
    presentAlert() { return this.#present(); }
    presentSheet() { return this.#present(); }
  }

  class UITableRow {
    constructor() { this.cells = []; this.dismissOnSelect = true; }
    addText(title, subtitle) { const c = { title, subtitle, rightAligned() {}, leftAligned() {} }; this.cells.push(c); return c; }
    addButton(title) { return this.addText(title); }
    get text() { return this.cells.map((c) => [c.title, c.subtitle].filter(Boolean).join(" / ")).join(" | "); }
  }

  class UITable {
    constructor() { this.rows = []; }
    addRow(r) { this.rows.push(r); }
    removeAllRows() { this.rows = []; }
    reload() {}
    find(text) {
      const r = this.rows.find((row) => row.text.includes(text));
      if (!r) throw new Error(`No row containing "${text}". Rows:\n${this.rows.map((x) => "  " + x.text).join("\n")}`);
      return r;
    }
    async present() {
      log.tables.push(this.rows.map((r) => r.text));
      const fn = next("table", this.rows[0]?.text ?? "(empty)");
      let dismissed = false;
      const tap = async (text) => {
        if (dismissed) throw new Error(`Table already dismissed; can't tap "${text}"`);
        const row = this.find(text);
        if (row.dismissOnSelect) dismissed = true;
        await row.onSelect?.(this.rows.indexOf(row));
        await flush();
      };
      await fn({ table: this, tap, rows: () => this.rows.map((r) => r.text) });
    }
  }

  class WebView {
    async loadHTML(html) { this.html = html; }
    async loadURL(url) { this.url = url; }
    async getHTML() { return (await fetch({ url: this.url, webview: true })).body; }
    async present() { log.webviews = (log.webviews ?? 0) + 1; }
  }

  const calendars = reminderLists.map((title) => ({ title }));
  const Calendar = {
    forReminders: async () => calendars,
    forRemindersByTitle: async (t) => {
      const c = calendars.find((x) => x.title === t);
      if (!c) throw new Error("no calendar");
      return c;
    },
  };
  class Reminder {
    static async allIncomplete(cals) { return log.reminders.filter((r) => cals.includes(r.calendar)); }
    save() { log.reminders.push(this); }
  }

  let clip = pasteboard;
  const Pasteboard = { paste: () => clip, pasteString: () => clip, copy: (s) => { clip = s; }, copyString: (s) => { clip = s; } };
  const Color = { blue: () => "blue", gray: () => "gray" };

  const context = {
    FileManager, Keychain, Request, Alert, UITable, UITableRow, WebView, Calendar, Reminder, Pasteboard, Color,
    Size: class { constructor(w, h) { this.width = w; this.height = h; } },
    Rect: class { constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); } },
    Script: { complete() {} },
    Photos: { fromLibrary: async () => { throw new Error("cancelled"); }, fromCamera: async () => { throw new Error("cancelled"); } },
    console, setTimeout, Promise, URL,
    args: { urls: [], plainTexts: [], images: [] },
  };
  context.globalThis = context;
  vm.createContext(context);

  function loadApp(file = new URL("../dist/app.js", import.meta.url)) {
    const module = { exports: {} };
    const code = fs.readFileSync(file, "utf8");
    vm.runInContext(`(function (module, exports) {\n${code}\n})`, context)(module, module.exports);
    return module.exports;
  }

  return {
    context,
    log,
    shared,
    loadApp,
    remaining: () => queue.length,
    get clipboard() { return clip; },
    setClipboard(s) { clip = s; },
    readShared: (rel) => JSON.parse(fs.readFileSync(path.join(shared, rel), "utf8")),
    writeShared: (rel, data) => {
      fs.mkdirSync(path.dirname(path.join(shared, rel)), { recursive: true });
      fs.writeFileSync(path.join(shared, rel), JSON.stringify(data));
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}
