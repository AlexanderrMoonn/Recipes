// Build script for Family Recipes (static site version).
//
// What this does:
//   1. Reads every recipe file in data/recipes/*.json
//   2. Combines them into one dist/data/recipes.json index
//   3. Copies any photos from data/photos/ into dist/photos/
//   4. Copies the site itself (src/) into dist/
//
// Cloudflare Pages runs this automatically on every push if you set:
//   Build command:   npm run build
//   Output directory: dist
//
// To add a recipe: drop a new .json file into data/recipes/ (and a photo
// into data/photos/ if you have one), commit, and push. No app, no login,
// no server — Cloudflare rebuilds the static site with the new recipe in it.
//
// Recipe file format (data/recipes/some-name.json):
// {
//   "name": "Grandma's Sunday Sauce",
//   "ingredients": "2 lbs ground beef\n1 onion, diced\n...",
//   "instructions": "1. Brown the beef...\n2. ...",
//   "notes": "Freezes well.",
//   "photo": "sunday-sauce.jpg",       <- optional, filename in data/photos/
//   "createdAt": "2026-08-25"          <- optional, defaults to today
// }
// The "id" used in URLs is taken from the filename (without .json) if you
// don't set one yourself.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const RECIPES_DIR = path.join(ROOT, "data", "recipes");
const PHOTOS_DIR = path.join(ROOT, "data", "photos");
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");

function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// ---------- reset dist ----------
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

// ---------- copy the static site itself ----------
if (!fs.existsSync(SRC_DIR)) {
  console.error(`Missing src/ directory at ${SRC_DIR}`);
  process.exit(1);
}
fs.cpSync(SRC_DIR, DIST_DIR, { recursive: true });

// ---------- build the recipe index ----------
fs.mkdirSync(RECIPES_DIR, { recursive: true });
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const files = fs.readdirSync(RECIPES_DIR).filter((f) => f.endsWith(".json"));
const usedIds = new Set();
const recipes = [];

for (const file of files) {
  const filePath = path.join(RECIPES_DIR, file);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const recipe = JSON.parse(raw);

    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      console.warn(`Skipping ${file}: needs at least "name", "ingredients", and "instructions".`);
      continue;
    }

    let id = recipe.id ? slugify(recipe.id) : slugify(file.replace(/\.json$/, ""));
    if (!id) id = slugify(recipe.name) || "recipe";
    if (usedIds.has(id)) {
      console.warn(`Duplicate id "${id}" from ${file} — appending a suffix to keep it unique.`);
      let n = 2;
      while (usedIds.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    usedIds.add(id);

    recipes.push({
      id,
      name: String(recipe.name).trim(),
      ingredients: String(recipe.ingredients).trim(),
      instructions: String(recipe.instructions).trim(),
      notes: recipe.notes ? String(recipe.notes).trim() : "",
      photo: recipe.photo || null,
      createdAt: recipe.createdAt || fs.statSync(filePath).birthtime.toISOString(),
    });
  } catch (err) {
    console.warn(`Skipping ${file}: ${err.message}`);
  }
}

recipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const dataDir = path.join(DIST_DIR, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "recipes.json"), JSON.stringify(recipes, null, 2));

// ---------- copy photos ----------
const photosDistDir = path.join(DIST_DIR, "photos");
fs.mkdirSync(photosDistDir, { recursive: true });
for (const photo of fs.readdirSync(PHOTOS_DIR)) {
  if (photo.startsWith(".")) continue;
  fs.copyFileSync(path.join(PHOTOS_DIR, photo), path.join(photosDistDir, photo));
}

console.log(`Built ${recipes.length} recipe(s) into dist/`);
