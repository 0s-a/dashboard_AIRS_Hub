// ─────────────────────────────────────────────────────────────
// DEPRECATED: pricing-client.tsx has been split into modular components.
// This file is kept for backward compatibility only.
// Use '@/components/inventory/pricing' instead.
//
// New structure:
//   components/inventory/pricing/
//   ├── index.ts              ← barrel re-export
//   ├── pricing-section.tsx   ← main orchestrator
//   ├── units-panel.tsx       ← units management
//   ├── price-list-panel.tsx  ← prices management
//   ├── smart-pricing-wizard.tsx
//   ├── single-price-form.tsx
//   ├── comparison-table.tsx
//   └── copy-price-dialog.tsx
// ─────────────────────────────────────────────────────────────

export * from './pricing/index'
