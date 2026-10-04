// Small wrappers over Scriptable's Alert and UITable.

/** Show an error without letting it escape a UITable callback. */
export async function showError(e) {
  const a = new Alert();
  a.title = "Something went wrong";
  a.message = e?.message ?? String(e);
  a.addAction("OK");
  await a.presentAlert();
}

/**
 * Wrap an async UITable callback so failures show up instead of vanishing.
 * Scriptable ignores the returned promise; tests await it.
 */
export function safe(fn) {
  return () => Promise.resolve().then(fn).catch(showError);
}

export async function message(title, text = "") {
  const a = new Alert();
  a.title = title;
  a.message = text;
  a.addAction("OK");
  await a.presentAlert();
}

export async function confirm(title, text = "", action = "OK", destructive = false) {
  const a = new Alert();
  a.title = title;
  a.message = text;
  if (destructive) a.addDestructiveAction(action);
  else a.addAction(action);
  a.addCancelAction("Cancel");
  return (await a.presentAlert()) === 0;
}

/** Action sheet. Returns the chosen option's index, or -1 for cancel. */
export async function choose(title, options, { message: text = "", destructive = [] } = {}) {
  const a = new Alert();
  a.title = title;
  if (text) a.message = text;
  options.forEach((o, i) => (destructive.includes(i) ? a.addDestructiveAction(o) : a.addAction(o)));
  a.addCancelAction("Cancel");
  return a.presentSheet();
}

/**
 * Alert with text fields. fields: [{ label, value, placeholder }].
 * Returns the values, or null on cancel.
 */
export async function prompt(title, fields, { message: text = "", ok = "Save" } = {}) {
  const a = new Alert();
  a.title = title;
  if (text) a.message = text;
  for (const f of fields) a.addTextField(f.placeholder ?? f.label ?? "", f.value ?? "");
  a.addAction(ok);
  a.addCancelAction("Cancel");
  if ((await a.presentAlert()) === -1) return null;
  return fields.map((_, i) => a.textFieldValue(i));
}

export async function promptOne(title, value = "", opts = {}) {
  const r = await prompt(title, [{ value, placeholder: opts.placeholder ?? "" }], opts);
  return r ? r[0] : null;
}

/**
 * Present a table whose rows are rebuilt by build(table, refresh).
 * build may be async; refresh() re-runs it and reloads the table.
 */
export async function liveTable(build) {
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

export function header(table, text) {
  const row = new UITableRow();
  row.isHeader = true;
  row.addText(text);
  table.addRow(row);
  return row;
}

export function row(table, title, subtitle, onSelect, { right = "" } = {}) {
  const r = new UITableRow();
  r.dismissOnSelect = false;
  r.height = subtitle ? 60 : 44;
  const main = r.addText(title, subtitle || undefined);
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

export function button(table, title, onSelect) {
  const r = new UITableRow();
  r.dismissOnSelect = false;
  const cell = r.addText(title);
  cell.titleColor = Color.blue();
  r.onSelect = safe(onSelect);
  table.addRow(r);
  return r;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
