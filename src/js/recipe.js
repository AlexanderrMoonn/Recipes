(function () {
  const container = document.getElementById("recipe-container");

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
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function renderRecipe(recipe) {
    document.title = `${recipe.name} — Family Recipes`;

    const photoHtml = recipe.photo
      ? `<img class="photo" src="/photos/${encodeURIComponent(recipe.photo)}" alt="${escapeHtml(recipe.name)}" />`
      : "";

    const notesHtml = recipe.notes
      ? `
        <div class="recipe-section notes">
          <h2>Notes</h2>
          <p class="body-text">${escapeHtml(recipe.notes)}</p>
        </div>`
      : "";

    container.innerHTML = `
      <article class="recipe-sheet">
        ${photoHtml}
        <h1>${escapeHtml(recipe.name)}</h1>
        <p class="meta">Filed ${formatDate(recipe.createdAt)}</p>

        <div class="recipe-section">
          <h2>Ingredients</h2>
          <p class="body-text">${escapeHtml(recipe.ingredients)}</p>
        </div>

        <div class="recipe-section">
          <h2>Instructions</h2>
          <p class="body-text">${escapeHtml(recipe.instructions)}</p>
        </div>

        ${notesHtml}
      </article>
    `;
  }

  function renderNotFound() {
    container.innerHTML = `
      <div class="state-message">
        <div class="state-title">Couldn't find that recipe</div>
        <p>It may have been removed. <a href="/">Back to the box</a></p>
      </div>`;
  }

  function renderLoadError() {
    container.innerHTML = `
      <div class="state-message">
        <div class="state-title">Couldn't load recipes</div>
        <p>Try refreshing the page.</p>
      </div>`;
  }

  (async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return renderNotFound();

    try {
      const recipes = await window.RecipeData.loadRecipes();
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return renderNotFound();
      renderRecipe(recipe);
    } catch (err) {
      renderLoadError();
    }
  })();
})();
