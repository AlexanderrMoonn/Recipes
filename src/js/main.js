(function () {
  const catalog = document.getElementById("catalog");
  const searchInput = document.getElementById("search-input");
  const searchMeta = document.getElementById("search-meta");

  let allRecipes = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function initials(name) {
    return (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
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

  function ingredientsPreview(recipe) {
    return (recipe.ingredients || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);
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

  function renderCard(recipe) {
    const thumb = recipe.photo
      ? `<img class="thumb" src="/photos/${encodeURIComponent(recipe.photo)}" alt="${escapeHtml(recipe.name)}" loading="lazy" />`
      : `<div class="thumb placeholder" aria-hidden="true">${escapeHtml(initials(recipe.name))}</div>`;

    const previewItems = ingredientsPreview(recipe)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");

    return `
      <a class="recipe-card" href="/recipe.html?id=${encodeURIComponent(recipe.id)}">
        <span class="pin" aria-hidden="true"></span>
        ${thumb}
        <h3>${escapeHtml(recipe.name)}</h3>
        <ul class="preview">${previewItems}</ul>
        <span class="date">Filed ${formatDate(recipe.createdAt)}</span>
      </a>
    `;
  }

  function renderEmpty(query) {
    if (query) {
      catalog.innerHTML = `
        <div class="state-message" style="grid-column: 1 / -1;">
          <div class="state-title">No recipes match "${escapeHtml(query)}"</div>
          <p>Try a different search term.</p>
        </div>`;
    } else {
      catalog.innerHTML = `
        <div class="state-message" style="grid-column: 1 / -1;">
          <div class="state-title">The box is empty</div>
          <p>Add a recipe file to the backend's <code>data/recipes/</code> folder to get started.</p>
        </div>`;
    }
  }

  function render(query) {
    const filtered = allRecipes.filter((r) => matchesQuery(r, query));

    if (!filtered.length) {
      renderEmpty(query);
    } else {
      catalog.innerHTML = filtered.map(renderCard).join("");
    }

    searchMeta.textContent = query
      ? `${filtered.length} recipe${filtered.length === 1 ? "" : "s"} found`
      : `${filtered.length} recipe${filtered.length === 1 ? "" : "s"} in the box`;
  }

  let debounceTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(searchInput.value.trim()), 150);
  });

  (async function init() {
    catalog.setAttribute("aria-busy", "true");
    try {
      allRecipes = await window.RecipeData.loadRecipes();

      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("q") || "";
      if (initialQuery) searchInput.value = initialQuery;

      render(initialQuery);
    } catch (err) {
      catalog.innerHTML = `
        <div class="state-message" style="grid-column: 1 / -1;">
          <div class="state-title">Couldn't load recipes</div>
          <p>Try refreshing the page.</p>
        </div>`;
      searchMeta.textContent = "";
    } finally {
      catalog.removeAttribute("aria-busy");
    }
  })();
})();
