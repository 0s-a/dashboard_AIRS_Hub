// ─────────────────────────────────────────────────────────────
// DEPRECATED: This file has been split into modular files.
// It now re-exports everything from the new inventory/ directory
// to maintain full backward compatibility.
//
// New structure:
//   lib/actions/inventory/
//   ├── index.ts           ← barrel re-export (public API)
//   ├── _shared.ts         ← internal helpers (PRODUCT_INCLUDE, serializeProduct…)
//   ├── product.queries.ts ← getProducts, getProductsPaginated, getProductById…
//   ├── product.actions.ts ← createProduct, updateProduct, deleteProduct…
//   ├── price.actions.ts   ← addProductPrice, copyPriceLabelPrices…
//   ├── unit.actions.ts    ← setProductUnits
//   └── metadata.actions.ts← addTagToProduct, addAlternativeNameToProduct…
// ─────────────────────────────────────────────────────────────

export * from './inventory/index'
