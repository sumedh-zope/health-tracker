"""
Health Tracker MCP Server

Exposes health tracking tools to Claude via the Model Context Protocol (MCP)
using Streamable HTTP transport. Authenticates to the Django backend with a
shared SERVICE_API_KEY and validates incoming Claude requests with MCP_API_KEY.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Any

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from mcp.server.mcpserver.server import MCPServer

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DJANGO_API_URL = os.environ.get("DJANGO_API_URL", "http://backend:8000/api").rstrip("/")
SERVICE_API_KEY = os.environ.get("SERVICE_API_KEY", "")
MCP_API_KEY = os.environ.get("MCP_API_KEY", "")

if not SERVICE_API_KEY:
    raise RuntimeError("SERVICE_API_KEY environment variable is required")
if not MCP_API_KEY:
    raise RuntimeError("MCP_API_KEY environment variable is required")

# ---------------------------------------------------------------------------
# Django API client helpers
# ---------------------------------------------------------------------------

def _django_headers() -> dict[str, str]:
    """Return headers for authenticating to the Django backend."""
    return {
        "Authorization": f"Bearer {SERVICE_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def django_get(path: str, params: dict[str, Any] | None = None) -> dict | list:
    """Perform an authenticated GET request to the Django API."""
    url = f"{DJANGO_API_URL}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=_django_headers(), params=params)
        response.raise_for_status()
        return response.json()


async def django_post(path: str, body: dict) -> dict | list:
    """Perform an authenticated POST request to the Django API."""
    url = f"{DJANGO_API_URL}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=_django_headers(), json=body)
        response.raise_for_status()
        return response.json()


def _fmt_error(exc: httpx.HTTPStatusError) -> str:
    """Format an HTTP error into a human-readable string."""
    try:
        detail = exc.response.json()
    except Exception:
        detail = exc.response.text
    return f"Error {exc.response.status_code}: {json.dumps(detail) if isinstance(detail, dict) else detail}"


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

mcp = MCPServer("health-tracker")


# ── Food & Meals ─────────────────────────────────────────────────────────────

@mcp.tool()
async def search_food(query: str) -> str:
    """Search the food database for items matching a query string.

    Returns a list of matching food items including their calories, protein,
    carbohydrates, fat, and fiber values per 100 g.

    Args:
        query: A food name or partial name to search for (e.g. "chicken breast").
    """
    try:
        results = await django_get("/food/items/", params={"search": query})
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    if not results:
        return f"No food items found matching '{query}'."

    items = results if isinstance(results, list) else results.get("results", [])
    lines = [f"Found {len(items)} item(s) matching '{query}':\n"]
    for item in items:
        lines.append(
            f"  • [{item['id']}] {item['name']} — "
            f"{item['calories_per_100g']} kcal | "
            f"P: {item['protein_per_100g']}g | "
            f"C: {item['carbs_per_100g']}g | "
            f"F: {item['fat_per_100g']}g | "
            f"Fiber: {item.get('fiber_per_100g', 0)}g  (per 100 g)"
        )
    return "\n".join(lines)


@mcp.tool()
async def log_meal(
    date: str,
    meal_type: str,
    entries: list[dict],
) -> str:
    """Create a meal log entry for a specific date and meal type.

    Args:
        date: The date of the meal in YYYY-MM-DD format (e.g. "2026-08-05").
        meal_type: One of "breakfast", "lunch", "dinner", or "snack".
        entries: A list of dicts, each with keys:
                   - food_item_id (int): ID of the food item.
                   - amount_grams (float): Quantity consumed in grams.
                 Example: [{"food_item_id": 3, "amount_grams": 150}]
    """
    # Step 1: create the meal log
    try:
        result = await django_post("/food/logs/", {"date": date, "meal_type": meal_type})
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    meal_id = result.get("id")

    # Step 2: add each entry — remap food_item_id → food_item for the serializer
    failed: list[str] = []
    for entry in entries:
        payload = {"amount_grams": entry["amount_grams"]}
        if "food_item_id" in entry:
            payload["food_item"] = entry["food_item_id"]
        elif "food_item" in entry:
            payload["food_item"] = entry["food_item"]
        if "recipe_id" in entry:
            payload["recipe"] = entry["recipe_id"]
        try:
            await django_post(f"/food/logs/{meal_id}/entries/", payload)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            failed.append(str(exc))

    msg = (
        f"Meal logged successfully (ID {meal_id}).\n"
        f"Date: {date} | Type: {meal_type}\n"
        f"Entries added: {len(entries) - len(failed)}/{len(entries)}."
    )
    if failed:
        msg += "\nFailed entries:\n" + "\n".join(f"  • {f}" for f in failed)
    return msg


@mcp.tool()
async def get_daily_summary(date: str) -> str:
    """Get a nutritional summary for a specific date.

    Returns total calories, protein, carbohydrates, and fat consumed, along
    with a breakdown by meal type (breakfast, lunch, dinner, snack).

    Args:
        date: The date to summarise in YYYY-MM-DD format (e.g. "2026-08-05").
    """
    try:
        data = await django_get("/food/daily-summary/", params={"date": date})
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    meals = data.get("meals", [])

    lines = [
        f"Daily nutritional summary for {date}",
        "─" * 40,
        f"  Calories : {float(data.get('total_calories', 0)):.1f} kcal",
        f"  Protein  : {float(data.get('total_protein', 0)):.1f} g",
        f"  Carbs    : {float(data.get('total_carbs', 0)):.1f} g",
        f"  Fat      : {float(data.get('total_fat', 0)):.1f} g",
        "",
    ]

    if meals:
        lines.append("Meal breakdown:")
        for meal in meals:
            meal_kcal = sum(float(e.get("calories", 0)) for e in meal.get("entries", []))
            meal_p = sum(float(e.get("protein", 0)) for e in meal.get("entries", []))
            meal_c = sum(float(e.get("carbs", 0)) for e in meal.get("entries", []))
            meal_f = sum(float(e.get("fat", 0)) for e in meal.get("entries", []))
            lines.append(
                f"  {meal.get('meal_type', '?').capitalize():10s} — "
                f"{meal_kcal:.0f} kcal  "
                f"(P: {meal_p:.1f}g  C: {meal_c:.1f}g  F: {meal_f:.1f}g)"
            )
    else:
        lines.append("No meals logged for this date.")

    return "\n".join(lines)


@mcp.tool()
async def add_food_item(
    name: str,
    calories_per_100g: float,
    protein_per_100g: float,
    carbs_per_100g: float,
    fat_per_100g: float,
    fiber_per_100g: float = 0.0,
) -> str:
    """Add a new food item to the database.

    Use this when a food is not found via search_food and you want to create it
    so it can be referenced in future meal logs.

    Args:
        name: The name of the food item (e.g. "Oat bran").
        calories_per_100g: Kilocalories per 100 g.
        protein_per_100g: Grams of protein per 100 g.
        carbs_per_100g: Grams of carbohydrates per 100 g.
        fat_per_100g: Grams of fat per 100 g.
        fiber_per_100g: Grams of dietary fiber per 100 g (default 0).
    """
    body = {
        "name": name,
        "calories_per_100g": calories_per_100g,
        "protein_per_100g": protein_per_100g,
        "carbs_per_100g": carbs_per_100g,
        "fat_per_100g": fat_per_100g,
        "fiber_per_100g": fiber_per_100g,
    }
    try:
        result = await django_post("/food/items/", body)
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    return (
        f"Food item created successfully.\n"
        f"  ID      : {result.get('id')}\n"
        f"  Name    : {result.get('name')}\n"
        f"  Calories: {result.get('calories_per_100g')} kcal/100g\n"
        f"  Protein : {result.get('protein_per_100g')} g/100g\n"
        f"  Carbs   : {result.get('carbs_per_100g')} g/100g\n"
        f"  Fat     : {result.get('fat_per_100g')} g/100g\n"
        f"  Fiber   : {result.get('fiber_per_100g', 0)} g/100g"
    )


@mcp.tool()
async def add_recipe(
    name: str,
    description: str,
    ingredients: list[dict],
) -> str:
    """Create a new recipe with a list of ingredients.

    First creates the recipe, then attaches each ingredient. The recipe can
    later be referenced when logging meals.

    Args:
        name: The recipe name (e.g. "Chicken stir-fry").
        description: A short description of the recipe.
        ingredients: A list of dicts, each with:
                       - food_item_id (int): ID of the food item.
                       - amount_grams (float): Amount used in the recipe.
                     Example: [{"food_item_id": 5, "amount_grams": 200}]
    """
    # Step 1: create the recipe
    try:
        recipe = await django_post(
            "/food/recipes/",
            {"name": name, "description": description},
        )
    except httpx.HTTPStatusError as exc:
        return f"Failed to create recipe: {_fmt_error(exc)}"
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    recipe_id = recipe.get("id")

    # Step 2: add each ingredient
    failed: list[str] = []
    for ing in ingredients:
        try:
            await django_post(
                f"/food/recipes/{recipe_id}/ingredients/",
                {
                    "food_item_id": ing["food_item_id"],
                    "amount_grams": ing["amount_grams"],
                },
            )
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            failed.append(f"food_item_id={ing['food_item_id']}: {exc}")

    msg = (
        f"Recipe '{name}' created successfully (ID {recipe_id}).\n"
        f"Ingredients added: {len(ingredients) - len(failed)}/{len(ingredients)}."
    )
    if failed:
        msg += "\nFailed ingredients:\n" + "\n".join(f"  • {f}" for f in failed)
    return msg


@mcp.tool()
async def list_recipes() -> str:
    """List all available recipes stored in the database.

    Returns the recipe name, ID, and a short description for each entry.
    """
    try:
        results = await django_get("/food/recipes/")
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    items = results if isinstance(results, list) else results.get("results", [])
    if not items:
        return "No recipes found in the database."

    lines = [f"Available recipes ({len(items)} total):\n"]
    for r in items:
        lines.append(f"  [{r['id']}] {r['name']} — {r.get('description', '').strip()}")
    return "\n".join(lines)


# ── Body Metrics ──────────────────────────────────────────────────────────────

@mcp.tool()
async def log_body_metric(
    date: str,
    weight_kg: float,
    body_fat_percentage: float | None = None,
    notes: str | None = None,
) -> str:
    """Log a body weight (and optional body fat percentage) measurement.

    Args:
        date: The date of the measurement in YYYY-MM-DD format.
        weight_kg: Body weight in kilograms.
        body_fat_percentage: Optional body fat as a percentage (e.g. 18.5).
        notes: Optional free-text notes about the measurement.
    """
    body: dict[str, Any] = {"date": date, "weight_kg": weight_kg}
    if body_fat_percentage is not None:
        body["body_fat_percentage"] = body_fat_percentage
    if notes:
        body["notes"] = notes

    try:
        result = await django_post("/metrics/", body)
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    parts = [
        f"Body metric logged (ID {result.get('id')}).",
        f"  Date   : {date}",
        f"  Weight : {weight_kg} kg",
    ]
    if body_fat_percentage is not None:
        parts.append(f"  Body fat: {body_fat_percentage}%")
    if notes:
        parts.append(f"  Notes  : {notes}")
    return "\n".join(parts)


@mcp.tool()
async def get_body_metrics(days: int = 30) -> str:
    """Retrieve body weight and body fat measurements for the last N days.

    Args:
        days: Number of past days to include (default 30, max recommended 365).
    """
    since = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
    try:
        results = await django_get("/metrics/", params={"date_after": since})
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    items = results if isinstance(results, list) else results.get("results", [])
    if not items:
        return f"No body metrics recorded in the last {days} day(s)."

    lines = [f"Body metrics — last {days} day(s) ({len(items)} entries):\n"]
    for m in items:
        bf = f"  Body fat: {m['body_fat_percentage']}%" if m.get("body_fat_percentage") else ""
        lines.append(f"  {m['date']}  Weight: {m['weight_kg']} kg{bf}")
    return "\n".join(lines)


@mcp.tool()
async def get_latest_metric() -> str:
    """Retrieve the most recent body metric entry (weight and body fat).

    Useful for quickly checking the user's current weight without scrolling
    through historical data.
    """
    try:
        data = await django_get("/metrics/latest/")
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    if not data:
        return "No body metrics have been recorded yet."

    lines = [
        "Latest body metric:",
        f"  Date   : {data.get('date')}",
        f"  Weight : {data.get('weight_kg')} kg",
    ]
    if data.get("body_fat_percentage") is not None:
        lines.append(f"  Body fat: {data['body_fat_percentage']}%")
    if data.get("notes"):
        lines.append(f"  Notes  : {data['notes']}")
    return "\n".join(lines)


# ── Goals ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def set_goal(
    goal_type: str,
    target_value: float,
    unit: str,
    notes: str | None = None,
) -> str:
    """Create or update a health goal.

    Args:
        goal_type: The type of goal. One of: "calories", "protein", "carbs",
                   "fat", or "weight".
        target_value: The numeric target for the goal (e.g. 2000 for calories).
        unit: The unit of measure (e.g. "kcal", "g", "kg").
        notes: Optional notes or context about the goal.
    """
    body: dict[str, Any] = {
        "goal_type": goal_type,
        "target_value": target_value,
        "unit": unit,
        "start_date": datetime.utcnow().date().isoformat(),
    }
    if notes:
        body["notes"] = notes

    try:
        result = await django_post("/goals/", body)
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    return (
        f"Goal set successfully (ID {result.get('id')}).\n"
        f"  Type   : {goal_type}\n"
        f"  Target : {target_value} {unit}\n"
        + (f"  Notes  : {notes}" if notes else "")
    ).rstrip()


@mcp.tool()
async def get_active_goals() -> str:
    """List all currently active health goals.

    Returns each goal's type, target value, unit, and any notes.
    """
    try:
        results = await django_get("/goals/active/")
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    items = results if isinstance(results, list) else results.get("results", [])
    if not items:
        return "No active goals found. Use set_goal to create one."

    lines = [f"Active goals ({len(items)} total):\n"]
    for g in items:
        note_part = f"  — {g['notes']}" if g.get("notes") else ""
        lines.append(
            f"  [{g['id']}] {g['goal_type'].capitalize()}: "
            f"{g['target_value']} {g['unit']}{note_part}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_progress_vs_goals(date: str | None = None) -> str:
    """Compare actual nutrition intake against active goals for a given date.

    Fetches active goals and the daily nutrition summary for the date, then
    shows how much of each goal has been achieved.

    Args:
        date: The date to evaluate in YYYY-MM-DD format. Defaults to today.
    """
    if date is None:
        date = datetime.utcnow().date().isoformat()

    # Fetch goals and daily summary in parallel
    try:
        goals_raw, summary = await _fetch_goals_and_summary(date)
    except httpx.HTTPStatusError as exc:
        return _fmt_error(exc)
    except httpx.RequestError as exc:
        return f"Network error contacting Django API: {exc}"

    goals = goals_raw if isinstance(goals_raw, list) else goals_raw.get("results", [])
    totals = summary.get("totals", {})

    if not goals:
        return "No active goals to compare against. Use set_goal to create one."

    # Map goal_type -> actual value from daily summary
    actual_map: dict[str, float] = {
        "calories": totals.get("calories", 0),
        "protein": totals.get("protein", 0),
        "carbs": totals.get("carbs", 0),
        "fat": totals.get("fat", 0),
    }

    lines = [f"Progress vs. goals for {date}:", "─" * 44]
    for g in goals:
        gtype = g["goal_type"]
        target = g["target_value"]
        unit = g["unit"]
        actual = actual_map.get(gtype)

        if actual is not None:
            pct = (actual / target * 100) if target else 0
            status = "OK" if actual <= target else "OVER"
            lines.append(
                f"  {gtype.capitalize():10s}  {actual:7.1f} / {target:7.1f} {unit}  "
                f"({pct:.0f}%)  [{status}]"
            )
        else:
            # e.g. weight goal — no intra-day value
            lines.append(
                f"  {gtype.capitalize():10s}  target: {target} {unit}  "
                f"(no same-day measurement to compare)"
            )

    return "\n".join(lines)


async def _fetch_goals_and_summary(date: str) -> tuple[Any, Any]:
    """Fetch active goals and the daily summary concurrently."""
    import asyncio

    goals_task = asyncio.create_task(django_get("/goals/active/"))
    summary_task = asyncio.create_task(
        django_get("/food/daily-summary/", params={"date": date})
    )
    goals = await goals_task
    summary = await summary_task
    return goals, summary


# ---------------------------------------------------------------------------
# Starlette auth middleware + app assembly
# ---------------------------------------------------------------------------

class BearerAuthMiddleware(BaseHTTPMiddleware):
    """Reject requests that do not carry a valid MCP_API_KEY Bearer token."""

    async def dispatch(self, request: Request, call_next):
        # Allow health-check probes without auth
        if request.url.path in ("/health", "/healthz"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response(
                content='{"detail": "Missing Authorization header"}',
                status_code=401,
                media_type="application/json",
            )
        token = auth_header.removeprefix("Bearer ").strip()
        if token != MCP_API_KEY:
            return Response(
                content='{"detail": "Invalid API key"}',
                status_code=403,
                media_type="application/json",
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    # streamable_http_app() returns a Starlette app with the proper lifespan
    # already wired up. Add auth middleware directly to it.
    app = mcp.streamable_http_app(host="0.0.0.0")
    app.add_middleware(BearerAuthMiddleware)

    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
