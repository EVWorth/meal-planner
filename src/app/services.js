// Network and Reminders: fetching recipe pages and exporting the grocery
// list. No UI here, so these can be exercised with mocks.
import { recipeFromHtml } from "../core/index.js";

const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** The page has no schema.org recipe data, so it can't be imported automatically. */
export class NoRecipeData extends Error {}

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

/**
 * Recipe input from a URL, read from the page's schema.org JSON-LD: first a
 * plain request, then a rendered WebView for sites that block scripts or
 * build the page in JS.
 */
export async function importFromUrl(url) {
  const html = await loadHtml(url);
  const recipe = html && recipeFromHtml(html, url);
  if (recipe) return recipe;
  let rendered = null;
  try {
    rendered = await loadRenderedHtml(url);
  } catch {
    // reported below
  }
  const fromRendered = rendered && recipeFromHtml(rendered, url);
  if (fromRendered) return fromRendered;
  if (!html && !rendered) throw new Error("Couldn't load that page.");
  throw new NoRecipeData("That page doesn't include recipe data the app can read.");
}

// Reminders

export async function reminderLists() {
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

/** Titles of incomplete reminders on the list, for duplicate detection. */
export async function openReminderTitles(listTitle) {
  const cal = await reminderList(listTitle);
  const reminders = await Reminder.allIncomplete([cal]);
  return reminders.map((r) => r.title);
}

/** Add one reminder per grocery item, in list order. Returns the count. */
export async function addReminders(listTitle, items) {
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
