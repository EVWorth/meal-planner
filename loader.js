// Meal Planner loader for Scriptable.
// Copy this file into Scriptable once per phone. Each run it fetches the
// latest app from GitHub (falling back to the last copy it downloaded when
// offline) and runs it. The app's code lives in the repo, not here.
// Every step is written to the log (bottom-left icon in the editor), and
// any failure is shown in an alert.

const REPO = "EVWorth/meal-planner";
const BRANCH = "main";
const LOADER_VERSION = 2;

const started = Date.now();
function log(message) {
  console.log(`[loader ${((Date.now() - started) / 1000).toFixed(1)}s] ${message}`);
}

async function fail(title, error) {
  console.error(`[loader] ${title}: ${error?.stack ?? error}`);
  const a = new Alert();
  a.title = title;
  a.message = String(error?.message ?? error);
  a.addAction("OK");
  await a.presentAlert();
}

async function fetchText(url, headers = {}) {
  log(`GET ${url}`);
  const req = new Request(url);
  req.headers = headers;
  req.timeoutInterval = 20;
  const text = await req.loadString();
  const status = req.response?.statusCode;
  log(`  -> HTTP ${status}, ${text?.length ?? 0} chars`);
  if (status !== 200) throw new Error(`HTTP ${status} for ${url}`);
  return text;
}

async function main() {
  log(`loader v${LOADER_VERSION}, script at ${module.filename}`);
  const fm = module.filename.includes("/Mobile Documents/") ? FileManager.iCloud() : FileManager.local();
  const dir = fm.joinPath(module.filename.slice(0, module.filename.lastIndexOf("/")), "meal-planner-lib");
  const appPath = fm.joinPath(dir, "app.js");
  const versionPath = fm.joinPath(dir, "version.txt");
  log(`cache folder ${dir}`);

  async function ensureLocal(path) {
    if (fm.fileExists(path) && !fm.isFileDownloaded(path)) {
      log(`downloading ${path.split("/").pop()} from iCloud`);
      await fm.downloadFileFromiCloud(path);
    }
  }

  async function update() {
    if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
    await ensureLocal(versionPath);
    const have = fm.fileExists(versionPath) ? fm.readString(versionPath).trim() : "";
    log(`cached version ${have.slice(0, 7) || "(none)"}`);
    // Resolve main to a commit so raw.githubusercontent.com's cache can't serve a stale file.
    const sha = (await fetchText(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, { Accept: "application/vnd.github.sha" })).trim();
    log(`latest version ${sha.slice(0, 7)}`);
    if (sha && sha === have && fm.fileExists(appPath)) return sha;
    const code = await fetchText(`https://raw.githubusercontent.com/${REPO}/${sha}/dist/app.js`);
    fm.writeString(appPath, code);
    fm.writeString(versionPath, sha);
    log("saved new app.js");
    return sha;
  }

  let version;
  try {
    version = (await update()).slice(0, 7);
  } catch (e) {
    log(`update failed: ${e.message}`);
    if (!fm.fileExists(appPath)) {
      await fail("Couldn't download Meal Planner", `${e.message}\n\nConnect to the internet and run it again.`);
      return;
    }
    version = `${fm.readString(versionPath).trim().slice(0, 7)} (offline)`;
  }

  await ensureLocal(appPath);
  let app;
  try {
    app = importModule("meal-planner-lib/app");
    log("importModule ok");
  } catch (e) {
    log(`importModule failed (${e.message}); evaluating app.js directly`);
    const mod = { exports: {} };
    new Function("module", "exports", fm.readString(appPath))(mod, mod.exports);
    app = mod.exports;
  }
  const exportsList = app ? Object.keys(app).join(", ") : "(nothing)";
  log(`app exports: ${exportsList || "(none)"}`);
  if (typeof app?.run !== "function") throw new Error(`app.js loaded but has no run() (exports: ${exportsList})`);

  log(`running app ${version}`);
  await app.run({ version, input: args });
  log("app finished");
}

try {
  await main();
} catch (e) {
  await fail("Meal Planner couldn't start", e);
}
Script.complete();
