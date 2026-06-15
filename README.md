# Bangalore Kitchen — Weekly Meal Plan

A single-page site with three tabs: **Week Plan**, **Recipes** (all 12 dishes), and a checkable **Grocery List**. Everything is in one `index.html` file — no build step, no dependencies.

## Host it on GitHub Pages

1. Create a new repository on GitHub (e.g. `meal-plan`).
2. Upload `index.html` (and optionally this `README.md`) to the repo. Either drag-and-drop in the GitHub web UI, or:
   ```bash
   git init
   git add index.html README.md
   git commit -m "Add meal plan site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/meal-plan.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, pick **Deploy from a branch**.
5. Select branch **main** and folder **/ (root)**, then **Save**.
6. Wait ~1 minute. Your site will be live at:
   `https://<your-username>.github.io/meal-plan/`

## Editing

Open `index.html` in any text editor. Recipes, ingredients and quantities are plain HTML — search for a dish name and edit in place. No tooling required.

## Notes

- Checkboxes on the grocery list reset on refresh (no data is stored). Use **Print List** for a paper copy to hand off.
- Built mobile-first; works fine on a phone in the kitchen.
