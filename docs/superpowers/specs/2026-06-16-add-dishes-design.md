# Add More Dishes Design

## Goal
Add a household-shared "add dish" feature to the existing GitHub Pages meal planner without replacing the current static hosting model. The site should let household members add and edit dishes, keep the shared library persistent, and avoid a full multi-user permission system.

## Current State
This repository is a single-page app in [`index.html`](../../../index.html) with hardcoded recipe cards, grocery items, and simple client-side navigation. There is no backend, no database, and no build step.

## User Flow
1. User opens the `Recipes` tab.
2. User clicks `Add Dish`.
3. A form collects dish name, category/tags, servings, ingredients, steps, and optional notes.
4. User enters the household edit passcode when making a write action.
5. The backend unlocks a short-lived write session.
6. The dish is saved directly to the shared database.
7. Published dishes appear in Recipes, Week Plan, and Grocery List.

## Architecture
- Frontend stays on GitHub Pages.
- Backend runs on a Cloudflare Worker.
- Persistent storage uses Cloudflare D1.
- The Worker exposes public read endpoints and protected write endpoints.
- A single household edit passcode is used instead of per-user accounts or moderator roles.
- Unlocking returns a short-lived session cookie or token; the passcode itself is never stored in the browser.
- The Worker must allow CORS from the GitHub Pages origin.

## Data Model
- `dishes`: published recipes.
- `dish_ingredients`: normalized ingredient rows for shopping lists and scaling.
- `dish_steps`: ordered cooking instructions.
- `dish_tags`: filters such as `veg`, `quick`, `paneer`, `chicken`.
- `audit_log`: edit history and write actions.

## API Contract
- `GET /dishes`
- `GET /dishes/:id`
- `POST /dishes`
- `PATCH /dishes/:id`
- `DELETE /dishes/:id`
- `POST /auth/unlock`

## Frontend Changes
- Replace hardcoded recipe markup with API-driven rendering.
- Add an `Add Dish` entry point in Recipes.
- Add loading, empty, and error states.
- Add a simple unlock modal for household edits.
- Keep the API base URL configurable in the frontend.
- Keep the existing visual style and mobile-first layout.
- Keep the grocery list derived from the dish ingredient data so it stays in sync with new recipes.

## Rollout Plan
1. Migrate the existing 12 dishes into D1.
2. Read published dishes from the Worker.
3. Add a household unlock flow for writes.
4. Add dish creation and edit actions.
5. Wire the Week Plan and Grocery List to dynamic dish data.

## Non-Goals
- User accounts for every contributor.
- Peer voting or moderation queues.
- Replacing GitHub Pages with a full app host.
