// Meal Planner loader for Scriptable.
// Copy this file into Scriptable once per phone. Each run it fetches the
// latest app from GitHub (falling back to the last copy it downloaded when
// offline) and runs it. The app's code lives in the repo, not here.

const REPO = "EVWorth/meal-planner";
const BRANCH = "main";

const fm = module.filename.includes("/Mobile Documents/") ? FileManager.iCloud() : FileManager.local();
const dir = fm.joinPath(module.filename.slice(0, module.filename.lastIndexOf("/")), "meal-planner-lib");
const appPath = fm.joinPath(dir, "app.js");
const versionPath = fm.joinPath(dir, "version.txt");

async function fetchText(url, headers = {}) {
  const req = new Request(url);
  req.headers = headers;
  req.timeoutInterval = 20;
  const text = await req.loadString();
  if (req.response.statusCode !== 200) throw new Error(`HTTP ${req.response.statusCode} for ${url}`);
  return text;
}

async function update() {
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const have = fm.fileExists(versionPath) ? fm.readString(versionPath).trim() : "";
  // Resolve main to a commit so raw.githubusercontent.com's cache can't serve a stale file.
  const sha = (await fetchText(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, { Accept: "application/vnd.github.sha" })).trim();
  if (sha && sha === have && fm.fileExists(appPath)) return sha;
  const code = await fetchText(`https://raw.githubusercontent.com/${REPO}/${sha}/dist/app.js`);
  fm.writeString(appPath, code);
  fm.writeString(versionPath, sha);
  return sha;
}

function cachedVersion() {
  return fm.fileExists(versionPath) ? fm.readString(versionPath).trim() : "";
}

function load() {
  try {
    return importModule("meal-planner-lib/app");
  } catch (e) {
    // Fallback if importModule can't resolve the path on this setup.
    const module = { exports: {} };
    new Function("module", "exports", fm.readString(appPath))(module, module.exports);
    return module.exports;
  }
}

let version;
try {
  version = (await update()).slice(0, 7);
} catch (e) {
  if (!fm.fileExists(appPath)) {
    const a = new Alert();
    a.title = "Couldn't download Meal Planner";
    a.message = `${e.message}\n\nConnect to the internet and run it again.`;
    a.addAction("OK");
    await a.presentAlert();
    Script.complete();
    return;
  }
  version = `${cachedVersion().slice(0, 7)} (offline)`;
}

if (fm.isFileStoredIniCloud?.(appPath)) await fm.downloadFileFromiCloud(appPath);
const app = load();
await app.run({ version, input: args });
Script.complete();
