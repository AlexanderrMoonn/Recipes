(function () {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  (async function loadLastRecipe() {
    try {
      // recipes.json is already sorted newest-first at build time.
      const recipes = await window.RecipeData.loadRecipes();
      if (!Array.isArray(recipes) || recipes.length === 0) {
        footer.textContent = "No recipes added yet";
        return;
      }
      const last = recipes[0];
      footer.innerHTML = `Last recipe added, ${formatDate(last.createdAt)} &ndash; <a class="last-recipe-link" href="/recipe.html?id=${encodeURIComponent(last.id)}">${escapeHtml(last.name)}</a>`;
    } catch (err) {
      footer.textContent = "";
    }
  })();
})();
