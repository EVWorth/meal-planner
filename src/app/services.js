// Network and Reminders: fetching recipe pages, calling Claude, exporting
// the grocery list. No UI here, so these can be exercised with mocks.
import {
  API_URL,
  buildImportRequest,
  htmlToText,
  parseImportResponse,
  recipeFromHtml,
  requestHeaders,
} from "../core/index.js";

const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export class NeedsApiKey extends Error {}

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
 * Recipe input from a URL. Tries the page's schema.org JSON-LD (plain
 * request, then a rendered WebView for sites that block scripts or build
 * the page in JS), then Claude on the page text.
 */
export async function importFromUrl(url, { key, model, aisles }) {
  let html = await loadHtml(url);
  let recipe = html && recipeFromHtml(html, url);
  if (recipe) return recipe;
  try {
    const rendered = await loadRenderedHtml(url);
    if (rendered) {
      html = rendered;
      recipe = recipeFromHtml(html, url);
      if (recipe) return recipe;
    }
  } catch {
    // fall through to Claude with whatever we have
  }
  if (!html) throw new Error("Couldn't load that page.");
  if (!key) throw new NeedsApiKey("That page has no recipe data I can read on my own. Add a Claude API key in Settings, or use the chatbot prompt and paste the JSON.");
  const input = await callClaude({ key, model, aisles, text: htmlToText(html), sourceUrl: url });
  return { ...input, sourceUrl: url };
}

export async function importFromText(text, { key, model, aisles }) {
  if (!key) throw new NeedsApiKey("Reading pasted text needs a Claude API key. Add one in Settings, or use the chatbot prompt and paste the JSON.");
  return callClaude({ key, model, aisles, text });
}

export async function importFromImage(image, { key, model, aisles }) {
  if (!key) throw new NeedsApiKey("Reading a photo needs a Claude API key. Add one in Settings, or use the chatbot prompt and paste the JSON.");
  const imageBase64 = Data.fromJPEG(shrink(image, 1568)).toBase64String();
  return callClaude({ key, model, aisles, imageBase64 });
}

/** Scale an image so its longest side is at most `max` px. */
function shrink(image, max) {
  const { width, height } = image.size;
  const scale = Math.min(1, max / Math.max(width, height));
  if (scale === 1) return image;
  const size = new Size(Math.round(width * scale), Math.round(height * scale));
  const ctx = new DrawContext();
  ctx.size = size;
  ctx.respectScreenScale = false;
  ctx.drawImageInRect(image, new Rect(0, 0, size.width, size.height));
  return ctx.getImage();
}

export async function callClaude({ key, model, aisles, text, sourceUrl, imageBase64 }) {
  const req = new Request(API_URL);
  req.method = "POST";
  req.headers = requestHeaders(key);
  req.body = JSON.stringify(buildImportRequest({ model, aisles, text, sourceUrl, imageBase64 }));
  req.timeoutInterval = 300;
  let body;
  try {
    body = await req.loadJSON();
  } catch (e) {
    throw new Error("Couldn't reach the Claude API: " + e.message);
  }
  return parseImportResponse(body, req.response?.statusCode ?? 200);
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
