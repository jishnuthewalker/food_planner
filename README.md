# Bangalore Kitchen — Weekly Meal Plan

A single-page meal planner with three tabs: **Week Plan**, **Recipes**, and a checkable **Grocery List**. The static UI still lives in `index.html`, but household-added dishes now come from a Cloudflare Worker + D1 backend.

## Structure

- `index.html` - the GitHub Pages frontend
- `cloudflare/worker/src/index.js` - dish API, unlock flow, and CRUD handlers
- `cloudflare/worker/migrations/0001_init.sql` - D1 schema
- `docs/superpowers/specs/` - feature spec
- `docs/superpowers/plans/` - implementation plan

## How It Works

- Public users can browse the built-in meal plan and any household dishes stored in D1.
- Housemates can unlock writes with the shared passcode, then add, edit, or delete dishes.
- The frontend stores the API base URL and write token in `localStorage`.

## Deploying the Backend

1. Create the D1 database and apply `cloudflare/worker/migrations/0001_init.sql`.
2. Set `HOUSEHOLD_PASSCODE_HASH` as a Worker secret.
3. Update `cloudflare/worker/wrangler.toml` with your D1 database ID.
4. Deploy the Worker and copy the Worker URL into the site using the **API URL** button.

## GitHub Pages

Keep `index.html` on GitHub Pages. The page is static and only needs the Worker URL to fetch household dishes.

## Editing

Open `index.html` in any editor. The built-in dishes are still hardcoded for now, while added household dishes are stored in the backend.
