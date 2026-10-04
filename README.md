# Meal Planner

A [Scriptable](https://scriptable.app) app for iPhone. It keeps a shared recipe library, plans the week's dinners, and sends the merged grocery list to Apple Reminders.

- **Recipes**: import from a web link (share sheet or paste) or from JSON made by any AI chat app, or type one in. Each recipe is one JSON file in a shared iCloud Drive folder.
- **Week**: 7 nights. Fill them at random from the library, lock the ones you want to keep, mark nights as eating out, and swap single nights. You can set a recipe to *always include* or *never pick*.
- **Groceries**: ingredients are merged across the week (`1 cup` + `4 tbsp` → `1 1/4 cup`) and listed alphabetically. You review the list before anything is added, one reminder per item. Items already on the list and pantry staples start unticked.

## How it fits together

```
iPhone (each)                               GitHub (this repo, public)
┌─────────────────────────┐   each run      ┌──────────────────────┐
│ Scriptable              │ ──────────────▶ │ dist/app.js on main  │
│  "Meal Planner" script  │  latest commit  └──────────────────────┘
│   = loader.js           │
│  meal-planner-lib/      │   cached copy, used when offline
│   app.js                │
└───────────┬─────────────┘
            │ file bookmark "MealPlanner"
            ▼
iCloud Drive: Meal Planner/  (one person's folder, shared with edit access)
  recipes/<id>.json   plan.json   config.json
```

- **No code is copied to the phones after setup.** The loader looks up the latest commit on `main` and downloads `dist/app.js` when it has changed. Pushing to `main` updates both phones the next time they run it.
- **No secrets, no AI calls.** The app talks only to recipe sites and GitHub. The Reminders list is a per-phone setting; everything else is shared through `config.json`.
- **Sync is iCloud's.** It isn't instant. If both phones edit the same file at once, the last write wins. Each recipe has its own file so recipe edits rarely collide. Plan changes re-read `plan.json` just before writing.

## Phone setup

### 1. Shared folder (folder owner's phone, once)

1. Open **Files** → **iCloud Drive** and create a folder named **Meal Planner**.
2. Long-press it → **Share** → **Collaborate**. Under share options choose *Only invited people* and *Can make changes*. Invite the other people who will use it.

### 2. Accept the folder (each other person's phone, once)

Open the invite. **Meal Planner** then shows up in their iCloud Drive in the Files app.

### 3. On each phone

1. Install **Scriptable** from the App Store.
2. **Bookmark the folder**: Scriptable → ⚙️ Settings → **File Bookmarks** → **+** → **Pick Folder** → choose **Meal Planner**. Name the bookmark exactly **`MealPlanner`** (no space).
3. **Add the loader**: in Safari, open <https://raw.githubusercontent.com/EVWorth/meal-planner/main/loader.js>, select all and copy. In Scriptable tap **+**, paste, and rename the script **Meal Planner** (tap the title at the top).
4. **Allow sharing to it**: in the script editor, tap the settings icon (sliders, bottom of the screen) → **Share Sheet Inputs** → turn on **URLs** and **Text**. Optional: **Add to Home Screen** from the same menu.
5. **Run it.** The first run downloads the app. Allow Reminders access when iOS asks (the first grocery send triggers it).
6. In the app's **⚙️ Settings**:
   - **Reminders list for groceries**: pick your grocery list. It defaults to *Groceries*.

## Using it

- **Save a recipe from Safari or another app**: Share → **Run Script** → **Meal Planner** → check the recipe → **💾 Save recipe**.
- **Plan the week**: **🎲 Fill empty and unlocked nights**. Tap a night to view, swap, choose, lock, or mark it as eating out. **🗓 Start next week** clears the nights and fills a fresh week.
- **Shop**: **🛒 Send grocery list to Reminders**. Untick anything you already have, then tap **Add N items**.
- **Recipes the app can't read** (sites without recipe data, cookbook photos, typed notes): **＋ Add a recipe** → **Copy prompt for AI**. Paste the prompt into any AI chat app and add the recipe (link, text or photo). Copy the JSON it replies with, then **＋ Add a recipe** → **Paste recipe JSON**. You can also share the reply straight to the Meal Planner script.

## Data files

`recipes/<id>.json`:

```json
{
  "id": "chicken-tacos",
  "name": "Chicken Tacos",
  "servings": 4,
  "tags": ["mexican", "chicken"],
  "ingredients": [
    { "qty": 1.5, "unit": "lb", "item": "chicken thighs", "note": "boneless" }
  ],
  "steps": ["Season the chicken.", "Grill 6 minutes per side."],
  "sourceUrl": "https://…",
  "notes": "",
  "createdAt": "2026-10-04T12:00:00.000Z",
  "updatedAt": "2026-10-04T12:00:00.000Z"
}
```

`plan.json` holds the week (`days[]`, each `recipe`/`out`/`empty`, optionally `locked`) and the `include`/`ignore` recipe lists. `config.json` holds the shared settings: `nights`, `startDay`, and `pantry`. Everything is plain JSON, so it stays readable even if Scriptable stops working.

## Development

```sh
npm install
npm test          # core unit tests + the app driven through a Scriptable mock
npm run build     # bundle src/ into dist/app.js
npm run check     # test + build + fail if dist/app.js wasn't rebuilt (what CI runs)
```

- `src/core/`: pure JS (parsing, units, merging, plan selection, the prompt for AI). No Scriptable globals.
- `src/app/`: the Scriptable layer: storage, Reminders, network, UITable screens.
- `loader.js`: the per-phone bootstrap. Changes to it don't reach the phones on their own; each phone has to paste the new version.
- `test/scriptable-mock.js`: a fake of the Scriptable APIs, used to drive `dist/app.js` end to end in Node. It catches wiring mistakes, not iOS behaviour.

**Always commit `dist/app.js` together with the source change.** Phones run whatever `dist/app.js` is on `main`, and CI fails if it's stale.

### On-device checks still needed

The mock can't cover these:

- [ ] Loader: `importModule("meal-planner-lib/app")` loads the cached file. The `new Function` fallback covers it if not.
- [ ] A second phone reads and writes the shared folder through its own bookmark.
- [ ] Offloaded recipe files download before they're read.
- [ ] Reminders: the list picker, adding items, and duplicate skipping.
- [ ] Share sheet from Safari, and recipe JSON shared from an AI chat app.
- [ ] Recipe sites that block plain requests fall back to the WebView.

## Risk: Scriptable maintenance

Scriptable's last release was 1.7.19 (2024-09-30). If a future iOS breaks it, the data is plain JSON and the logic in `src/core/` has no Scriptable dependencies. That makes it easy to port to Shortcuts or a small web page.
