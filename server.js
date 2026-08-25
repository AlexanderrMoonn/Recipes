// Recipe Box server
// A tiny, dependency-light Express app.
//
// Storage model (by design, per the project spec):
//   data/recipes/<id>.json   -- one file per recipe, human-editable
//   data/photos/<id>.<ext>   -- optional photo for that recipe
//
// There is deliberately NO edit/delete API. Once a recipe is submitted it
// is permanent from the website's point of view. To change or remove a
// recipe, edit or delete its file in data/recipes (and data/photos) directly
// on the server.

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const APP_DIR = __dirname;
const DATA_DIR = path.join(APP_DIR, "data");
const RECIPES_DIR = path.join(DATA_DIR, "recipes");
const PHOTOS_DIR = path.join(DATA_DIR, "photos");
const PUBLIC_DIR = path.join(APP_DIR, "public");

for (const dir of [DATA_DIR, RECIPES_DIR, PHOTOS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const PORT = process.env.PORT || 3000;

const app = express();
app.disable("x-powered-by");

// ---------- static files ----------
app.use(express.static(PUBLIC_DIR));
app.use("/photos", express.static(PHOTOS_DIR, { maxAge: "7d" }));

// ---------- upload handling ----------
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new Error("Photo must be a JPEG, PNG, WEBP, or GIF image."));
  },
});

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// ---------- helpers ----------
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function makeId(name) {
  const base = slugify(name) || "recipe";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

function loadAllRecipes() {
  const files = fs.readdirSync(RECIPES_DIR).filter((f) => f.endsWith(".json"));
  const recipes = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(RECIPES_DIR, file), "utf8");
      const recipe = JSON.parse(raw);
      recipes.push(recipe);
    } catch (err) {
      console.error(`Skipping unreadable recipe file ${file}:`, err.message);
    }
  }
  recipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return recipes;
}

function toSummary(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    photo: recipe.photo || null,
    notes: recipe.notes || "",
    createdAt: recipe.createdAt,
    // a short preview of ingredients for the card
    ingredientsPreview: (recipe.ingredients || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
}

function matchesQuery(recipe, q) {
  if (!q) return true;
  const haystack = [recipe.name, recipe.ingredients, recipe.instructions, recipe.notes]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

// ---------- API ----------

// List / search recipes
app.get("/api/recipes", (req, res) => {
  const q = (req.query.q || "").toString();
  const recipes = loadAllRecipes().filter((r) => matchesQuery(r, q));
  res.json(recipes.map(toSummary));
});

// Get a single recipe (full detail)
app.get("/api/recipes/:id", (req, res) => {
  const filePath = path.join(RECIPES_DIR, `${req.params.id}.json`);
  if (!filePath.startsWith(RECIPES_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Recipe not found." });
  }
  try {
    const recipe = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: "Could not read that recipe." });
  }
});

// Create a new recipe (no auth, but no update/delete route exists on purpose)
app.post("/api/recipes", upload.single("photo"), (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const ingredients = (req.body.ingredients || "").trim();
    const instructions = (req.body.instructions || "").trim();
    const notes = (req.body.notes || "").trim();

    if (!name || !ingredients || !instructions) {
      return res.status(400).json({
        error: "A recipe needs at least a name, ingredients, and instructions.",
      });
    }

    const id = makeId(name);
    let photoFilename = null;

    if (req.file) {
      const ext = EXT_BY_MIME[req.file.mimetype] || "";
      photoFilename = `${id}${ext}`;
      fs.writeFileSync(path.join(PHOTOS_DIR, photoFilename), req.file.buffer);
    }

    const recipe = {
      id,
      name,
      ingredients,
      instructions,
      notes,
      photo: photoFilename,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(RECIPES_DIR, `${id}.json`),
      JSON.stringify(recipe, null, 2),
      "utf8"
    );

    res.status(201).json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save that recipe." });
  }
});

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Something went wrong." });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Recipe Box listening on http://localhost:${PORT}`);
  console.log(`Recipes stored in: ${RECIPES_DIR}`);
  console.log(`Photos stored in:  ${PHOTOS_DIR}`);
});
