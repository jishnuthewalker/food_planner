const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Meal-Auth",
      "Access-Control-Max-Age": "86400",
    };

    const withCors = (response) => {
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    };

    const json = (data, status = 200) =>
      withCors(
        new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
      );

    const parseJson = async () => {
      try {
        return await request.json();
      } catch {
        return null;
      }
    };

    const sendError = (message, status = 400) => json({ error: message }, status);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      if (request.method === "GET" && segments.length === 0) {
        return json({ ok: true });
      }

      if (request.method === "GET" && segments[0] === "dishes" && segments.length === 1) {
        return json({ dishes: await listDishes(env) });
      }

      if (request.method === "GET" && segments[0] === "dishes" && segments.length === 2) {
        const dish = await getDish(env, segments[1]);
        if (!dish) {
          return sendError("Dish not found", 404);
        }
        return json({ dish });
      }

      if (request.method === "POST" && segments[0] === "auth" && segments[1] === "unlock") {
        const body = await parseJson();
        if (!body?.passcode) {
          return sendError("Passcode is required", 400);
        }
        if (!env.HOUSEHOLD_PASSCODE_HASH) {
          return sendError("Household passcode is not configured", 500);
        }

        const passcodeHash = await sha256Hex(String(body.passcode));
        if (passcodeHash !== env.HOUSEHOLD_PASSCODE_HASH) {
          return sendError("Invalid passcode", 401);
        }

        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        const tokenHash = await sha256Hex(token);
        const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

        await env.DB.prepare(
          "INSERT INTO write_sessions (id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)",
        )
          .bind(crypto.randomUUID(), tokenHash, nowIso, expiresAt)
          .run();

        return json({ token, expiresAt });
      }

      if (segments[0] === "dishes" && request.method === "POST" && segments.length === 1) {
        await requireWriteSession(request, env, nowIso);
        const body = await parseJson();
        const created = await saveDish(env, body, nowIso);
        await recordAudit(env, "create", "dish", created.id, body, nowIso);
        return json({ dish: created }, 201);
      }

      if (segments[0] === "dishes" && request.method === "PATCH" && segments.length === 2) {
        await requireWriteSession(request, env, nowIso);
        const body = await parseJson();
        const updated = await saveDish(env, body, nowIso, segments[1]);
        if (!updated) {
          return sendError("Dish not found", 404);
        }
        await recordAudit(env, "update", "dish", updated.id, body, nowIso);
        return json({ dish: updated });
      }

      if (segments[0] === "dishes" && request.method === "DELETE" && segments.length === 2) {
        await requireWriteSession(request, env, nowIso);
        const deleted = await softDeleteDish(env, segments[1], nowIso);
        if (!deleted) {
          return sendError("Dish not found", 404);
        }
        await recordAudit(env, "delete", "dish", segments[1], {}, nowIso);
        return json({ ok: true });
      }

      return sendError("Not found", 404);
    } catch (error) {
      return sendError(error?.message || "Unexpected error", 500);
    }
  },
};

async function requireWriteSession(request, env, nowIso) {
  const header = request.headers.get("Authorization") || request.headers.get("X-Meal-Auth") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : header.trim();
  if (!token) {
    throw new Error("Missing write token");
  }

  const tokenHash = await sha256Hex(token);
  const session = await env.DB.prepare(
    "SELECT id FROM write_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1",
  )
    .bind(tokenHash, nowIso)
    .first();

  if (!session) {
    throw new Error("Invalid or expired write token");
  }
}

async function listDishes(env) {
  const dishRows = await env.DB.prepare(
    "SELECT * FROM dishes WHERE published = 1 ORDER BY created_at DESC",
  )
    .all()
    .then((result) => result.results || []);

  if (dishRows.length === 0) {
    return [];
  }

  const ids = dishRows.map((dish) => dish.id);
  const ingredientRows = await selectByDishIds(env, "dish_ingredients", ids);
  const stepRows = await selectByDishIds(env, "dish_steps", ids);
  const tagRows = await selectByDishIds(env, "dish_tags", ids);

  return dishRows.map((dish) =>
    hydrateDish(
      dish,
      ingredientRows.filter((row) => row.dish_id === dish.id),
      stepRows.filter((row) => row.dish_id === dish.id),
      tagRows.filter((row) => row.dish_id === dish.id),
    ),
  );
}

async function getDish(env, id) {
  const dish = await env.DB.prepare("SELECT * FROM dishes WHERE id = ? AND published = 1 LIMIT 1")
    .bind(id)
    .first();

  if (!dish) {
    return null;
  }

  const [ingredients, steps, tags] = await Promise.all([
    env.DB.prepare("SELECT * FROM dish_ingredients WHERE dish_id = ? ORDER BY sort_order")
      .bind(id)
      .all()
      .then((result) => result.results || []),
    env.DB.prepare("SELECT * FROM dish_steps WHERE dish_id = ? ORDER BY sort_order")
      .bind(id)
      .all()
      .then((result) => result.results || []),
    env.DB.prepare("SELECT * FROM dish_tags WHERE dish_id = ? ORDER BY tag")
      .bind(id)
      .all()
      .then((result) => result.results || []),
  ]);

  return hydrateDish(dish, ingredients, steps, tags);
}

async function saveDish(env, body, nowIso, existingId) {
  if (!body || typeof body !== "object") {
    throw new Error("Dish payload is required");
  }

  const name = String(body.name || "").trim();
  if (!name) {
    throw new Error("Dish name is required");
  }

  const id = existingId || body.id || crypto.randomUUID();
  const slug = String(body.slug || slugify(name) || id).trim();
  const category = String(body.category || body.tag || "Household").trim();
  const servings = String(body.servings || "").trim() || "Serves 4";
  const notes = body.notes ? String(body.notes).trim() : "";
  const published = body.published === false ? 0 : 1;
  const ingredients = normalizeIngredients(body.ingredients);
  const steps = normalizeSteps(body.steps);
  const tags = normalizeTags(body.tags);

  const existing = existingId
    ? await env.DB.prepare("SELECT id FROM dishes WHERE id = ? LIMIT 1").bind(existingId).first()
    : null;

  if (existingId && !existing) {
    return null;
  }

  const createdAt = existing ? existing.created_at || nowIso : nowIso;
  const statements = [
    env.DB.prepare(
      "INSERT OR REPLACE INTO dishes (id, slug, name, category, servings, notes, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, slug, name, category, servings, notes || null, published, createdAt, nowIso),
    env.DB.prepare("DELETE FROM dish_ingredients WHERE dish_id = ?").bind(id),
    env.DB.prepare("DELETE FROM dish_steps WHERE dish_id = ?").bind(id),
    env.DB.prepare("DELETE FROM dish_tags WHERE dish_id = ?").bind(id),
  ];

  ingredients.forEach((ingredient) => {
    statements.push(
      env.DB.prepare(
        "INSERT INTO dish_ingredients (id, dish_id, section, item, quantity, note, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        id,
        ingredient.section || "",
        ingredient.item,
        ingredient.quantity || "",
        ingredient.note || "",
        ingredient.sortOrder,
      ),
    );
  });

  steps.forEach((step) => {
    statements.push(
      env.DB.prepare("INSERT INTO dish_steps (id, dish_id, sort_order, body) VALUES (?, ?, ?, ?)").bind(
        crypto.randomUUID(),
        id,
        step.sortOrder,
        step.body,
      ),
    );
  });

  tags.forEach((tag) => {
    statements.push(
      env.DB.prepare("INSERT INTO dish_tags (id, dish_id, tag) VALUES (?, ?, ?)").bind(
        crypto.randomUUID(),
        id,
        tag,
      ),
    );
  });

  await env.DB.batch(statements);
  return getDish(env, id);
}

async function softDeleteDish(env, id, nowIso) {
  const existing = await env.DB.prepare("SELECT id FROM dishes WHERE id = ? LIMIT 1").bind(id).first();
  if (!existing) {
    return false;
  }

  await env.DB.prepare("UPDATE dishes SET published = 0, updated_at = ? WHERE id = ?")
    .bind(nowIso, id)
    .run();
  return true;
}

async function recordAudit(env, action, targetType, targetId, details, nowIso) {
  await env.DB.prepare(
    "INSERT INTO audit_log (id, action, target_type, target_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), action, targetType, targetId, JSON.stringify(details || {}), nowIso)
    .run();
}

async function selectByDishIds(env, table, ids) {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(",");
  return env.DB.prepare(`SELECT * FROM ${table} WHERE dish_id IN (${placeholders}) ORDER BY dish_id, sort_order`)
    .bind(...ids)
    .all()
    .then((result) => result.results || []);
}

function hydrateDish(dish, ingredients, steps, tags) {
  return {
    id: dish.id,
    slug: dish.slug,
    name: dish.name,
    category: dish.category,
    servings: dish.servings,
    notes: dish.notes || "",
    published: Boolean(dish.published),
    createdAt: dish.created_at,
    updatedAt: dish.updated_at,
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.id,
      section: ingredient.section || "",
      item: ingredient.item,
      quantity: ingredient.quantity || "",
      note: ingredient.note || "",
      sortOrder: ingredient.sort_order || 0,
    })),
    steps: steps.map((step) => ({
      id: step.id,
      body: step.body,
      sortOrder: step.sort_order || 0,
    })),
    tags: tags.map((tag) => tag.tag),
  };
}

function normalizeIngredients(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      if (typeof entry === "string") {
        const [item, quantity = "", note = ""] = entry.split("|").map((part) => part.trim());
        return {
          section: "",
          item: item || entry.trim(),
          quantity,
          note,
          sortOrder: index + 1,
        };
      }

      return {
        section: String(entry.section || "").trim(),
        item: String(entry.item || entry.name || "").trim(),
        quantity: String(entry.quantity || "").trim(),
        note: String(entry.note || "").trim(),
        sortOrder: Number(entry.sortOrder || index + 1),
      };
    })
    .filter((entry) => entry.item);
}

function normalizeSteps(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      const body = typeof entry === "string" ? entry.trim() : String(entry.body || entry.text || "").trim();
      return body ? { body, sortOrder: Number(entry.sortOrder || index + 1) } : null;
    })
    .filter(Boolean);
}

function normalizeTags(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [...new Set(
    input
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean),
  )];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
