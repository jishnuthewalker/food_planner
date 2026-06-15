# Add More Dishes Design

## Goal
Add a global “add dish” feature to the existing GitHub Pages meal planner without replacing the current static hosting model. The site should let users submit new dishes, keep the shared library persistent, and ensure only approved dishes become public.

## Current State
This repository is a single-page app in [`index.html`](../../../index.html) with hardcoded recipe cards, grocery items, and simple client-side navigation. There is no backend, no database, and no build step.

## User Flow
1. User opens the `Recipes` tab.
2. User clicks `Add Dish`.
3. A form collects dish name, category/tags, servings, ingredients, steps, and optional notes.
4. Submission is saved as `pending_review`.
5. Admin reviews the submission in a protected moderation view.
6. Admin approves, edits, or rejects the dish.
7. Approved dishes appear in Recipes, Week Plan, and Grocery List.

## Architecture
- Frontend stays on GitHub Pages.
- Backend runs on a Cloudflare Worker.
- Persistent storage uses Cloudflare D1.
- The Worker exposes public read endpoints and protected admin endpoints.
- Admin access is secret-based for the first version; no public account system is required.

## Data Model
- `dishes`: published recipes.
- `dish_submissions`: incoming user submissions and review status.
- `dish_ingredients`: normalized ingredient rows for shopping lists and scaling.
- `dish_steps`: ordered cooking instructions.
- `dish_tags`: filters such as `veg`, `quick`, `paneer`, `chicken`.
- `audit_log`: moderation actions and edits.

## API Contract
- `GET /dishes`
- `GET /dishes/:id`
- `POST /dish-submissions`
- `GET /admin/submissions`
- `POST /admin/submissions/:id/approve`
- `POST /admin/submissions/:id/reject`

## Frontend Changes
- Replace hardcoded recipe markup with API-driven rendering.
- Add an `Add Dish` entry point in Recipes.
- Add loading, empty, and error states.
- Add a small admin review screen or route.
- Keep the existing visual style and mobile-first layout.

## Rollout Plan
1. Migrate the existing 12 dishes into D1.
2. Read published dishes from the Worker.
3. Add dish submission.
4. Add moderation actions.
5. Wire the Week Plan and Grocery List to dynamic dish data.

## Non-Goals
- User accounts for every contributor.
- Real-time collaboration.
- Replacing GitHub Pages with a full app host.
