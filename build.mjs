// Bundle src/app/main.js and core/ into dist/app.js for Scriptable.
// Scriptable loads it with importModule(), which expects CommonJS exports.
import { build } from "esbuild";

await build({
  entryPoints: ["src/app/main.js"],
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: "es2020",
  outfile: "dist/app.js",
  legalComments: "none",
  banner: { js: "// Meal Planner — built from src/ by `npm run build`. Do not edit." },
});
