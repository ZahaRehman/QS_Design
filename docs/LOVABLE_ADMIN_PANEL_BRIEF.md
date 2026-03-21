# QS Admin Panel — Design & build brief (for Lovable)

Use this document so the redesigned admin UI covers **every current screen, flow, and data field** without gaps. The app is a **React + Vite** SPA (`apps/admin`) backed by **Supabase Edge Functions** (auth, catalog, orders).

---

## Global shell (logged-in)

- **Left sidebar**
  - Brand: QS logo image + “QS” title.
  - **Primary navigation** (exact items and order):
    1. Dashboard  
    2. Categories  
    3. Products *(labeled “Products” in nav; page title is “Create Product”)*  
    4. All Products  
    5. Orders  
    6. Customers  
  - Active nav state must be visible.

- **Top bar**
  - Label: “Authenticated Admin”
  - Shows **admin email**
  - **Logout** button

- **Main content area**
  - **Section title** (h2) changes per nav item (see pages below).
  - A short **intro paragraph** appears under the title on every section *(today it mentions future API integration; design can replace copy but keep a sensible intro slot).*

- **Global feedback**
  - **Global error** banner (API/auth failures).
  - **Full-screen loading overlay** during catalog saves: spinner + “Saving changes…” (blocks interaction while categories/products are mutating).

---

## Pre-auth: login screen

- Full-page **Admin Login** (not inside sidebar layout).
- Fields: **Email**, **Password** (required; standard autocomplete hints).
- Submit: **Login**
- Inline error message on failure.
- Initial load: **“Checking authentication…”** while validating stored session.

**Session behavior (design implications)**

- Successful login persists session (local storage).
- Return visit: auto-restore session; invalid/expired session returns user to login.

---

## Page: Dashboard

**Status today:** **Placeholder only** (no live metrics).

- Same placeholder content is shown for **Dashboard** and **Customers** when those sections are selected.
- **Three placeholder cards** in a grid:
  1. **Overview** — “Track business metrics and KPIs here.”
  2. **Recent Activity** — “Show latest orders, updates, and alerts.”
  3. **System Status** — “Display deployment, auth, and integration health.”

**Design ask:** Plan real dashboard widgets later, but **reserve layout** for at least these three conceptual zones (or merge into one rich dashboard—product decision).

---

## Page: Customers

**Status today:** **Not implemented** — uses the **same placeholder grid as Dashboard** (no customer list, no detail, no APIs).

**Design ask:** Either hide until built, or design a **dedicated Customers** view (list, profile, order history) as **future scope** and mark clearly as Phase 2.

---

## Page: Categories

**Layout:** Two-column grid.

### Block A — Create Category

- **Category name** (required, text)
- **Category description** (optional, multiline)
- **Add Category** (disabled while global catalog save overlay is active)

### Block B — Existing Categories

- **Active categories** list  
  - Each row: name, description (or “No description”), **Delete** (destructive; **browser confirm** before delete)
- **Inactive categories** subsection  
  - Each row: name, description, **Reactivate**
- Section-level **error** text for validation/API errors.

**Business rules**

- Categories support **soft lifecycle**: active vs inactive; delete moves out of active; reactivate restores.

---

## Page: Products (Create Product)

**Layout:** Single-column form card.

### Fields

1. **Product name** (required)  
2. **Product description** (multiline)  
3. **Currency** (required; 3-letter code, e.g. USD; UI uppercases input)  
4. **Canvas sizes — required**
   - Help text concept: at least one size + price; **first row = default listing price on the storefront**; customers choose a size at checkout.
   - **Dynamic rows**, each row:
     - **Size label** (e.g. `12×16"`)
     - **Price** for that size (number ≥ 0, step 0.01)
     - **Remove** row (disabled if only one row remains)
   - **Add canvas size** adds another row  
   - Validation: at least one row with non-empty label + valid price; rows with empty label are skipped when building payload.
   - **Backend limit:** up to **20** canvas sizes per product (enforce or show error in UI).
5. **Categories** — `<select multiple>`; helper: “Hold Command/Ctrl to select multiple categories.”
6. **Images** — file input, `accept="image/*"`, **multiple**
   - Help: up to **10 images** per product.
   - Show count of selected files when &gt; 0.

### Actions

- **Create Product** (submit; disabled during save overlay)

**Note:** There is **no single product-level price** anymore—pricing is entirely via **canvas sizes** (first size drives listing “from” price on store).

---

## Page: All Products

### Header / filter

- **Category** dropdown: “All categories” or a specific category (filters both active and inactive lists).

### Active products

- Card/list per product:
  - Name, description
  - **“From {price} {currency}”** using **first canvas size** price (or em dash if missing)
  - **Categories** line (comma-separated names or “None”)
  - **Image grid** (all product images; “No images” if empty)
  - Actions:
    - **Edit Product**
    - **Soft Delete Product** (sets inactive; not a hard delete)

### Inactive products

- Compact rows: name, “From …” price line
- Actions: **Edit Product**, **Reactivate**

---

## Modal: Edit Product

- Overlay + modal; click-outside on backdrop closes.
- Header: **Edit Product** + **Close**

### Section — Product details

- Name, description (required name)
- **Currency** (3 chars)
- **Categories** (multi-select, same as create)

### Section — Canvas sizes (required)

- Same row pattern as create: label, price, remove row, **Add canvas size**
- At least one valid size row required on save
- First row remains the **listing “from”** price semantics

### Section — Images

- Explain: remove existing and/or upload new
- **Existing images:** each with checkbox **“Marked to remove”** vs **Keep** + thumbnail
- **Add new images** (multi file)
- Note: **max 10 images total** after removals + additions

### Footer

- **Save changes**
- Modal-level error text

---

## Page: Orders

### Header

- Title **Orders**
- **Status filter** dropdown: **Pending** (default), **Shipped**, **Completed**, **All**  
  *(Client-side filter on already-loaded orders.)*

### Loading / empty

- “Loading orders…” when fetching
- If no orders for filter: “No orders for this status.”
- List-level error (when modal closed)

### Order row (each order)

- **Order id** (truncated display, first 8 chars of UUID)
- **Status pill** (pending / shipped / completed — distinct styling per status)
- Meta: **customer name** (or “Customer”) • **shipping city** (or —)
- **Total** (formatted money, order currency)
- **Created** timestamp (localized)
- Actions:
  - **View** (opens detail modal)
  - **Mark shipped** — only if status is `pending` (confirm dialog)
  - **Mark completed** — if status is `pending` or `shipped` (confirm dialog)
- Per-order **busy** state while status update in flight (disable buttons for that order)

---

## Modal: Order details

- **Order** full id  
- **Status**, **Payment** (defaults copy to COD if blank)  
- **Customer** name  
- **Contact** — phone, else email, else —  
- **Address** — line1 + line2, city, state, postal  
- **Notes** (if present)

### Line items

- For each item: **image** (snapshot URL), **name** (snapshot), qty, **unit price**, **line total**
- If the line has a **canvas size label** (print size chosen at checkout), show **“Size: {label}”** in the meta line

### Modal actions (same rules as list)

- From **pending:** Mark shipped, Mark completed  
- From **shipped:** Mark completed  
- From **completed:** no transitions in UI

---

## Order status workflow (must stay consistent in UI)

```text
pending → shipped → completed
pending → completed (shortcut)
```

---

## Image pipeline (design note)

- Admin uploads go to **Cloudinary** using a **server-signed upload**; URLs are stored on the product. Design should allow **multiple images**, reorder is **not** implemented in admin today (display order follows API).

---

## Accessibility / UX touches to preserve

- Orders filter and meaningful **aria** on status pills / modals where present (`role="dialog"`, `aria-modal`, labels).
- Confirm dialogs for destructive or irreversible-feeling actions (category delete, order status changes).

---

## Summary checklist for designers

| Area            | Implemented now | Must design |
|-----------------|-----------------|------------|
| Login           | Yes             | Yes        |
| Session restore | Yes             | Loading state |
| Sidebar + topbar| Yes             | Yes        |
| Dashboard       | Placeholder     | Placeholder or future widgets |
| Customers       | Placeholder     | Future or hide |
| Categories      | Full CRUD + soft delete/reactivate | Yes |
| Create Product  | Full + canvas sizes + images + categories | Yes |
| All Products    | Filter, list, edit modal, soft delete, reactivate | Yes |
| Orders          | Filter, list, detail modal, status actions | Yes |
| Global errors   | Yes             | Yes        |
| Save overlay    | Yes             | Yes        |

---

*Generated from the current `apps/admin` codebase. Update this file when features change.*
