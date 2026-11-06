# SNS Collection — Frontend Design Plan

**Project:** SNS Collection — owner-managed product portal
**Reference analyzed:** https://techlumer.com/all-products/ (WooCommerce storefront)
**Date:** 2026-11-04
**Status:** Plan — awaiting stack / order-flow decisions

> **Implemented stack (current):** the shipped implementation uses **Next.js 15
> (App Router)** with React 19 and Tailwind CSS 4, **MongoDB Atlas via Mongoose**
> for data, and **Cloudinary** for uploaded images. The design guidance below is
> still the reference; the original open decisions about a different stack and
> SQLite/Turso no longer apply.

---

## 0. Context

SNS Collection is an **owner-facing management portal**. The owner can:

- create **categories**
- create **subcategories** under them
- create and edit **products**
- manage **stock**

Those products feed a **customer-facing storefront**. Techlumer is the reference for the
*customer* side only. Its admin is stock WooCommerce and is **not** a reference.

Two surfaces, one design system:

| | Storefront | Admin |
|---|---|---|
| User's goal | Browse, desire, buy | Find, edit, verify |
| Density | Airy, image-led | Compact, data-led |
| Layout | Header + grid, full-bleed | Sidebar + topbar + tables |
| Type | Display headings, 16px body | UI only, 13–14px body |
| Motion | Product/image transitions | Near zero, state feedback only |
| Error tolerance | Low — must feel effortless | High — must be explicit |

**Colors are a placeholder.** The owner will replace the palette manually, so the
architecture must make that a one-file edit. See §2.

---

## 1. Architecture

One codebase, two route groups:

```
/            → storefront
/admin       → admin application
/tokens      → single source of truth for colour, type, spacing, radius
```

Shared: tokens, primitives (`Button`, `Input`, `Badge`, `Modal`, `Toast`, `Table`),
and the data model. Divergent: layout shells and density mode.

Density is a **mode**, not a second design:

```
data-density="compact"   → admin   (40px rows, 13–14px text)
(default)                → storefront (48px rows, 16px text)
```

---

## 2. Colour system — built to be replaced

Three tiers. **Only tier 1 is ever edited.**

```
Tier 1  primitives   --teal-700, --amber-500, --gray-050 …
Tier 2  semantics    --brand, --surface, --line, --text …
Tier 3  components   use var(--brand) only — never a hex literal
```

Rule: if a component contains a hex value, it is a bug.

### Editable block

```css
/* ---- EDIT ONLY THIS BLOCK ---- */
--brand:        #0F766E;   /* deep teal  */
--brand-hover:  #115E59;
--brand-soft:   #CCFBF1;
--accent:       #D97706;   /* amber      */
--ink:          #0E1116;   /* near-black */
/* ------------------------------ */
```

Rationale for a muted starting palette: product photography is colourful, and a loud
brand colour competes with it.

### Derived tokens

| Role | Value |
|---|---|
| Text primary | `#0E1116` |
| Text secondary | `#3A4049` |
| Text muted | `#6B7280` |
| Surface / raised / sunken | `#FFFFFF` / `#F8FAFB` / `#F2F4F6` |
| Border / strong border | `#E4E7EB` / `#D1D5DB` |
| Success | `#15803D` on `#DCFCE7` |
| Warning / low stock | `#B45309` on `#FEF3C7` |
| Danger / out of stock | `#B91C1C` on `#FEE2E2` |
| Focus ring | `--brand` at 40% |

### Stock semantics (own tokens)

```
--stock-in    (green)
--stock-low   (amber)
--stock-out   (red)
```

Used in three places — table cell, product form, storefront PDP — and must never drift.

**Rebrand test:** swapping three lines must re-skin the entire app. If it doesn't, the
token layering was violated.

---

## 3. Typography and shape

### Families — strict roles

- **Inter** — all functional UI: admin, tables, forms, buttons, storefront body.
- **Fraunces** (or `Sora` for a geometric feel) — **storefront display headings only**.
  Never in admin.

### Scale

| Token | Size / Line-height / Weight |
|---|---|
| Display (storefront H1) | 40 / 48 / 700 |
| H2 section | 28 / 36 / 600 |
| H3 card title | 18 / 28 / 600 |
| Body | 14 / 22 admin · 16 / 26 storefront |
| Label / meta | 13 / 20 / 500 |
| Eyebrow / table header | 11 / 16 / 600 / uppercase / `.06em` tracking |

Uppercase survives in exactly one place: the eyebrow / table-header style. Techlumer
uppercases everything (nav, buttons, titles), which reads as a discount catalog. Use
uppercase as structure, not as voice.

### Radius

```
--radius-sm   6px    inputs, buttons, small badges
--radius-md  10px    cards, panels, dropdowns
--radius-lg  14px    storefront cards, modals
--radius-full        status pills only
```

### Controls

- Height: 36px admin / 44px storefront
- 1px border, always visible focus ring
- Native inputs, real checkboxes and radios — never `display:none`
- Buttons: solid primary, outlined secondary, ghost tertiary, destructive

---

## 4. Admin information architecture

Fixed 240px sidebar:

```
Dashboard
Catalog
  ├ Categories        (tree)
  └ Products          (table)
Inventory
  └ Stock             (levels + adjustments)
─────────────
Settings              (store, currency, low-stock threshold, staff)
```

### 4.1 Dashboard

- Four stat cards: Products, Categories, Low stock, Out of stock
- Low-stock table (what needs attention now)
- Recent stock adjustments
- Empty state for a brand-new portal

### 4.2 Categories — tree, not table

Depth capped at **2 levels** (category → subcategory).

```
▾ Watches            (24)  ⠿  ⋯
   ├ Men's Watches    (12)  ⠿  ⋯
   └ Women's Watches  (12)  ⠿  ⋯
▸ Galaxy Lights       (8)  ⠿  ⋯
```

Behaviour:

- Drag handle (⠿) for manual ordering — this order drives storefront navigation
- Inline rename on double-click
- Row menu: Add subcategory / Edit / Deactivate / Delete
- **Guarded delete:** if products or children exist, offer *reassign to…* rather than cascade
- Slug auto-generated from name, editable, with a change warning
- Counts are live product counts
- Empty state: "No categories yet — create your first one"

### 4.3 Products — table, not cards

Cards are for browsing; 500 SKUs need columns, sorting and bulk actions.

| ☐ | Product | SKU | Category | Price | Stock | Status | ⋯ |
|---|---|---|---|---|---|---|---|

- Filters: category, subcategory, stock status, status, price range
- Sort: name, price, stock, updated
- Bulk bar on selection: set status, adjust stock, move category, delete
- **Numbered pagination + rows-per-page + CSV export** — no infinite scroll
- Debounced search across name **and** SKU

### 4.4 Product editor

Two-column layout:

- **Main:** name, description, images, price, compare-at price
- **Side:** category, subcategory, status, SKU, stock

Details:

- **Dependent select:** choosing a parent filters the subcategory list to its children
- Compare-at price drives the strikethrough and the computed `-41%` badge
- Image upload with drag reorder; first image = thumbnail; max size shown
- Stock: quantity + low-stock threshold, with a live In stock / Low / Out preview
- Unsaved-changes guard on navigation

### 4.5 Stock — dedicated screen

- Table: Product, SKU, On hand, Threshold, Status, Updated
- **Inline edit** quantity → confirm → writes a `StockMove`
- Adjustment history drawer per product (date, delta, reason, actor)
- Reasons: received, sold, damaged, correction, return

Why separate from the product form: stock edits are the most frequent and most
error-prone action, and they require an **audit trail** that a product form cannot produce.

---

## 5. Storefront information architecture

| Page | Notes |
|---|---|
| Home | Section rhythm, image-led category tiles, featured products |
| All products | Sidebar (2-level category tree + counts), 4-up grid, toolbar |
| Category / subcategory | Same listing, scoped, with breadcrumb |
| Product detail | Gallery thumbnails, variant selectors, price block, stock line |
| Search results | Reuse listing |
| Cart / checkout | Depends on decision D2 |

### Borrowed from Techlumer (verified in their DOM/CSS)

- **Title band + toolbar split:** H1 in a light gray band; breadcrumb + result count +
  sort controls live inside the content column
- **4-up grid, 1:1 images, 20px gap** (4 md / 2 mobile)
- **Hover image swap** (second image cross-fades)
- **Hover-reveal CTA** over the image ("Add to cart" / "Select options")
- **Rectangular discount badge**, computed from `compare_at_price` (`-41%`)
- **Strikethrough original price** in muted gray beside current price in brand colour
- **2-up mobile grid** — dense enough to work
- **Off-canvas sidebar on tablet/mobile**, never stacked above products
- Result count exposed as `role="status"` for live filtering
- Two-tier header: brand row + category row

### Changed, deliberately

- Category sidebar becomes a **2-level tree** (theirs is flat)
- **Numbered pagination** instead of infinite scroll
- PDP gains an explicit **stock line** (`In stock` / `Only 3 left` / `Out of stock`)
- No uppercase-everything; one uppercase style only
- No hidden form inputs; real accessible controls

---

## 6. Data model

Design before UI; every screen is downstream.

```
Category    id, name, slug, parent_id (null = top), image, position, is_active
Product     id, name, slug, sku, description, price, compare_at_price,
            category_id, images[], status, low_stock_threshold, created_at
StockLevel  product_id, on_hand
StockMove   id, product_id, delta, reason, note, actor_id, created_at
User        id, name, email, role (owner | staff)
```

Two rules:

1. **`on_hand` is never typed directly.** Every change goes through `StockMove`;
   `on_hand` is the sum. Otherwise the history and the number disagree within a week.
2. **A subcategory is just a `Category` with non-null `parent_id`.** Do not add a second
   table — it duplicates every query and every piece of UI.

Enforce depth ≤ 2 in the application layer, not by convention.

---

## 7. Component inventory

**Foundation**
`ThemeProvider`, `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Combobox`,
`Checkbox`, `Radio`, `Switch`, `Badge`, `StatusPill`, `Modal`, `ConfirmDialog`,
`DropdownMenu`, `Toast`, `Tooltip`, `Tabs`, `Pagination`, `EmptyState`, `Skeleton`,
`Breadcrumbs`, `Avatar`

**Layout**
`AppShell` (admin), `SidebarNav`, `TopBar`, `PageHeader` (title + breadcrumb + actions),
`StoreHeader`, `StoreFooter`

**Domain**
`CategoryTree`, `CategoryNode`, `ReorderHandle`, `ProductTable`, `BulkActionBar`,
`ProductForm`, `CategoryPicker` (dependent), `PriceCell`, `StockBadge`,
`StockAdjustPopover`, `StockHistoryDrawer`, `ImageUploader`, `ProductCard`,
`ProductGallery`, `FilterPanel`

---

## 8. Build order

| Phase | Deliverable |
|---|---|
| 0 | Tokens, type scale, primitives, admin shell |
| 1 | Categories tree — CRUD, reorder, dependent-select plumbing |
| 2 | Product table + product editor |
| 3 | Stock screen + adjustment log |
| 4 | Storefront: listing, category tree, PDP |
| 5 | Cart / checkout *or* inquiry flow (pending D2) |

Phases 1–3 are the real product. The storefront is largely assembly once tokens and
card components exist.

---

## 9. Quality rules (non-negotiable)

- No hex literals outside the token file
- No `display:none` on form controls
- Keyboard reachable: every action, every modal, every row
- Visible focus ring on all interactive elements
- `prefers-reduced-motion` respected
- Empty, loading, error and success states for every data view
- Destructive actions always confirmed
- Contrast ≥ 4.5:1 for text, 3:1 for UI boundaries

---

## 10. What not to inherit from the reference

Verified problems on techlumer.com — do not reproduce:

- **15+ render-blocking CSS files injected inline in `<body>`**
- Images served up to 1254px into a 430px slot (`sizes="100vw"`)
- **Broken custom CSS:** unclosed `.woocommerce-shipping-fields>h3>label{` rule;
  orphaned `.wd-widget-collapse .widget-title{` block
- **Globally hidden inputs:** `input[type="radio"], input[type="checkbox"] {display:none}`
  — breaks keyboard accessibility and hides working filters
- Infinite scroll with no pagination fallback
- Style conflict: neo-brutalist yellow logo block over a flat red/white system

---

## 11. Open decisions

| # | Decision | Impact |
|---|---|---|
| D1 | **Stack:** Next.js + Tailwind (recommended) vs plain HTML/CSS/JS | Component reuse, shared tokens, build tooling |
| D2 | **Does the storefront take orders?** Full checkout + payments, or cart → WhatsApp/call inquiry (cheaper, common locally) | Scope of phase 5; data model for orders |
| D3 | **Stock locations:** single, or warehouse + shop floor | Data model, stock screen complexity |
| D4 | **Variants:** does one product have sizes/colours, or 1 SKU = 1 product? | Product editor: simple form vs variant matrix |

---

## 12. Admin references to analyze next (optional)

Techlumer cannot inform the admin. Suggested, publicly viewable alternatives:

- **Medusa / Saleor dashboard demos** — closest to categories → products → inventory; patterns transfer 1:1
- **Linear** — best-in-class density and keyboard flow
- **Stripe Dashboard** — best-in-class tables, filters, empty states

Recommendation: **Medusa**, because the domain matches.
