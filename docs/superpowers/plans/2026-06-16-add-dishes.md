# Add More Dishes Implementation Plan

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a household-shared dish editor to the GitHub Pages meal planner with persistent storage, a simple unlock flow, and API-driven recipe rendering.

**Architecture:** Keep `index.html` as the GitHub Pages frontend, but move dish data into a Cloudflare Worker backed by D1. The frontend fetches published dishes from the Worker and uses a short-lived unlock session for write actions. This keeps the UI simple while making dish changes persistent across devices.

**Tech Stack:** Static HTML/CSS/JS, Cloudflare Workers, Cloudflare D1, fetch API, GitHub Pages.

---

### Task 1: Define the backend contract

**Files:**
- Create: `cloudflare/worker/wrangler.toml`
- Create: `cloudflare/worker/migrations/0001_init.sql`
- Create: `cloudflare/worker/src/index.ts`
- Test: `cloudflare/worker/src/index.ts` route handlers

- [ ] **Step 1: Write the D1 schema**

```sql
CREATE TABLE dishes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  servings TEXT NOT NULL,
  notes TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Add ingredient, step, tag, and audit tables**

Include normalized tables for ingredients, steps, tags, and a simple audit log.

- [ ] **Step 3: Add Worker routes**

Implement `GET /dishes`, `GET /dishes/:id`, `POST /auth/unlock`, `POST /dishes`, `PATCH /dishes/:id`, and `DELETE /dishes/:id`.

- [ ] **Step 4: Run a local route check**

Run: `wrangler dev`
Expected: Worker starts and serves the routes without schema errors.

- [ ] **Step 5: Commit**

```bash
git add cloudflare/worker
git commit -m "feat: add dish backend contract"
```

### Task 2: Implement unlock-based write access

**Files:**
- Modify: `cloudflare/worker/src/index.ts`
- Modify: `cloudflare/worker/migrations/0001_init.sql`
- Test: `cloudflare/worker/src/index.ts`

- [ ] **Step 1: Write an unlock session test**

Verify that a correct household passcode returns a short-lived session cookie or token and that an invalid passcode is rejected.

- [ ] **Step 2: Implement session issuance**

Store only a hashed passcode on the backend and mint a short-lived write session after unlock.

- [ ] **Step 3: Gate write endpoints**

Require the unlock session for dish create, update, and delete operations.

- [ ] **Step 4: Run route tests**

Run: `wrangler dev`
Expected: public reads work, writes fail without unlock, writes succeed after unlock.

- [ ] **Step 5: Commit**

```bash
git add cloudflare/worker/src/index.ts cloudflare/worker/migrations/0001_init.sql
git commit -m "feat: add household unlock flow"
```

### Task 3: Convert the frontend to API-driven dishes

**Files:**
- Modify: `index.html`
- Test: browser manual check in GitHub Pages preview

- [ ] **Step 1: Extract the static dish data into a JS data layer**

Replace hardcoded recipe card markup with a render function that consumes dish data from `GET /dishes`.

- [ ] **Step 2: Add a configurable API base URL**

Read the Worker URL from a single constant near the top of the script so the same HTML can run in local preview and production.

- [ ] **Step 3: Render loading, empty, and error states**

Show a lightweight placeholder while dishes load and a clear fallback if the API is unavailable.

- [ ] **Step 4: Keep existing navigation working**

Preserve the Week Plan, Recipes, and Grocery tab behavior while swapping only the dish source.

- [ ] **Step 5: Check the page manually**

Open the GitHub Pages site and verify the existing meal plan still renders correctly.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: load recipes from api"
```

### Task 4: Add dish creation and editing UI

**Files:**
- Modify: `index.html`
- Modify: `cloudflare/worker/src/index.ts`
- Test: browser manual check and Worker route checks

- [ ] **Step 1: Add an Add Dish entry point**

Place the button in the Recipes tab, near the recipe chips.

- [ ] **Step 2: Build the dish form**

Collect name, category/tags, servings, ingredients, steps, and notes in a simple modal or inline panel.

- [ ] **Step 3: Add the unlock modal**

Ask for the household passcode only when the user submits a write action.

- [ ] **Step 4: Wire create/update/delete actions**

Submit to the Worker and refresh the rendered dish list after each successful write.

- [ ] **Step 5: Verify persistence**

Reload the page and confirm the new dish still appears after a fresh fetch.

- [ ] **Step 6: Commit**

```bash
git add index.html cloudflare/worker/src/index.ts
git commit -m "feat: add household dish editor"
```

### Task 5: Keep grocery planning in sync

**Files:**
- Modify: `index.html`
- Modify: `cloudflare/worker/src/index.ts`

- [ ] **Step 1: Derive grocery items from dish ingredients**

Generate the grocery list from the current published dish data instead of relying only on hardcoded quantities.

- [ ] **Step 2: Preserve manual checkboxes**

Keep the current check-off behavior in the browser; only the source data becomes dynamic.

- [ ] **Step 3: Verify the grocery list after adding a dish**

Add a dish with new ingredients and confirm the grocery list reflects the new items after reload.

- [ ] **Step 4: Commit**

```bash
git add index.html cloudflare/worker/src/index.ts
git commit -m "feat: sync grocery list with dishes"
```

### Task 6: Final validation and deployment notes

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-16-add-dishes-design.md`

- [ ] **Step 1: Document the deployment setup**

Explain GitHub Pages for the frontend, Worker deployment for the API, and D1 migration steps.

- [ ] **Step 2: Note the shared passcode workflow**

Document how household members unlock write access and how to rotate the passcode if needed.

- [ ] **Step 3: Run a full manual smoke test**

Verify the recipes, add-dish flow, reload persistence, and grocery list rendering.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-06-16-add-dishes-design.md
git commit -m "docs: add dish feature deployment notes"
```
