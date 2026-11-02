import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createApi, loginAdmin } from "../../scripts/lib/seed-api.mjs";

// Explicit development seed. Writes through service APIs, never browser fixtures.
export async function seedCatalog(api, token) {
  const catalog = JSON.parse(
    fs.readFileSync(
      new URL("../src/lib/demo-catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const categories = await api("categories");
  const categoryIds = {};
  for (const category of catalog.categories) {
    const saved =
      categories.find((c) => c.slug === category.slug) ||
      (await api(
        "categories",
        "POST",
        {
          name: category.name,
          slug: category.slug,
          parentId: null,
          active: true,
        },
        token,
      ));
    categoryIds[category.id] = saved.id;
  }
  const existing = [];
  for (let page = 0; ; page++) {
    const result = await api(`products?size=100&page=${page}`);
    existing.push(...result.content);
    if (existing.length >= result.totalElements || result.content.length < 100)
      break;
  }
  const products = [];
  let productsCreated = 0,
    stockCreated = 0;
  for (const product of catalog.products) {
    let saved = existing.find((p) => p.slug === product.slug);
    if (!saved) {
      saved = await api(
        "products",
        "POST",
        {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: categoryIds[product.categoryId],
          brand: product.brand,
          images: product.images,
          attributes: product.attributes,
          variants: product.variants,
        },
        token,
      );
      productsCreated++;
    }
    products.push(saved);
    for (const variant of saved.variants) {
      const path = `inventory/${encodeURIComponent(variant.sku)}`;
      try {
        await api(path, "GET", undefined, token);
      } catch (error) {
        if (error.status !== 404) throw error;
        await api(path, "PUT", { onHand: 30 }, token);
        stockCreated++;
      }
    }
  }
  return {
    products,
    categories: Object.keys(categoryIds).length,
    productsCreated,
    stockCreated,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    const api = createApi(),
      token = await loginAdmin(api);
    const result = await seedCatalog(api, token);
    console.log(
      `Catalog: ${result.products.length} products, ${result.categories} categories; created ${result.productsCreated} products and ${result.stockCreated} stock rows. Existing stock was preserved.`,
    );
  } catch (error) {
    console.error(`Catalog seed failed: ${error.message}`);
    process.exitCode = 1;
  }
}
