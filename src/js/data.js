// Tiny shared helper for loading the static recipe index.
// Every page fetches /data/recipes.json (generated at build time) once.
window.RecipeData = (function () {
  let cache = null;

  async function loadRecipes() {
    if (cache) return cache;
    const res = await fetch("/data/recipes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load recipes.json");
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
      // Some static hosts don't set content-type perfectly for .json;
      // fall back to trying to parse it anyway rather than failing here.
    }
    cache = await res.json();
    return cache;
  }

  return { loadRecipes };
})();
