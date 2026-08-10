import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface FoodItem {
  id: number
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  serving_size_g?: number
}

export interface MealLogEntry {
  id: number
  meal_log: number
  food_item: number
  food_item_name: string
  recipe?: number
  recipe_name?: string
  amount_grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealLog {
  id: number
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  created_at: string
  entries: MealLogEntry[]
}

export interface DailySummary {
  date: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  meals: MealLog[]
}

export interface BodyWeight {
  id: number
  date: string
  weight_kg: number
  body_fat_percentage?: number
  notes?: string
  created_at: string
}

export interface Goal {
  id: number
  goal_type: 'calories' | 'protein' | 'carbs' | 'fat' | 'weight'
  target_value: number
  unit: string
  active: boolean
  start_date: string
  end_date?: string
  notes?: string
}

export interface RecipeIngredient {
  id: number
  food_item: FoodItem
  quantity_g: number
}

export interface Recipe {
  id: number
  name: string
  description?: string
  servings: number
  ingredients: RecipeIngredient[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  calories_per_serving: number
  protein_per_serving: number
  carbs_per_serving: number
  fat_per_serving: number
}

export interface CreateMealLogPayload {
  date: string
  meal_type: MealLog['meal_type']
}

export interface AddMealLogEntryPayload {
  food_item: number
  amount_grams: number
}

export interface CreateBodyWeightPayload {
  date: string
  weight_kg: number
  notes?: string
}

export interface CreateGoalPayload {
  goal_type: Goal['goal_type']
  target_value: number
  unit: string
  start_date: string
}

// ── Food Items ─────────────────────────────────────────────────────────────

export async function searchFoodItems(query: string): Promise<FoodItem[]> {
  const res = await client.get<FoodItem[]>('/food/items/', {
    params: { search: query },
  })
  return res.data
}

export async function getFoodItem(id: number): Promise<FoodItem> {
  const res = await client.get<FoodItem>(`/food/items/${id}/`)
  return res.data
}

// ── Meal Logs ──────────────────────────────────────────────────────────────

export async function getMealLogs(date?: string): Promise<MealLog[]> {
  const res = await client.get<MealLog[]>('/food/logs/', {
    params: date ? { date } : undefined,
  })
  return res.data
}

export async function createMealLog(payload: CreateMealLogPayload): Promise<MealLog> {
  const res = await client.post<MealLog>('/food/logs/', payload)
  return res.data
}

export async function addMealLogEntry(
  logId: number,
  payload: AddMealLogEntryPayload
): Promise<MealLogEntry> {
  const res = await client.post<MealLogEntry>(`/food/logs/${logId}/entries/`, payload)
  return res.data
}

export async function deleteMealLogEntry(logId: number, entryId: number): Promise<void> {
  await client.delete(`/food/logs/${logId}/entries/${entryId}/`)
}

export async function deleteMealLog(logId: number): Promise<void> {
  await client.delete(`/food/logs/${logId}/`)
}

// ── Daily Summary ──────────────────────────────────────────────────────────

export async function getDailySummary(date?: string): Promise<DailySummary> {
  const res = await client.get<DailySummary>('/food/daily-summary/', {
    params: date ? { date } : undefined,
  })
  return res.data
}

// ── Body Weight ────────────────────────────────────────────────────────────

export async function getBodyWeights(days?: number): Promise<BodyWeight[]> {
  const params: Record<string, string> = {}
  if (days) {
    params.date_after = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  }
  const res = await client.get<BodyWeight[]>('/metrics/', { params })
  return res.data
}

export async function logBodyWeight(payload: CreateBodyWeightPayload): Promise<BodyWeight> {
  const res = await client.post<BodyWeight>('/metrics/', payload)
  return res.data
}

export async function deleteBodyWeight(id: number): Promise<void> {
  await client.delete(`/metrics/${id}/`)
}

// ── Goals ──────────────────────────────────────────────────────────────────

export async function getGoals(activeOnly?: boolean): Promise<Goal[]> {
  const res = await client.get<Goal[]>('/goals/', {
    params: activeOnly ? { active: true } : undefined,
  })
  return res.data
}

export async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
  const res = await client.post<Goal>('/goals/', payload)
  return res.data
}

export async function updateGoal(id: number, payload: Partial<CreateGoalPayload & { active: boolean }>): Promise<Goal> {
  const res = await client.patch<Goal>(`/goals/${id}/`, payload)
  return res.data
}

export async function deleteGoal(id: number): Promise<void> {
  await client.delete(`/goals/${id}/`)
}

// ── Recipes ────────────────────────────────────────────────────────────────

export async function getRecipes(): Promise<Recipe[]> {
  const res = await client.get<Recipe[]>('/food/recipes/')
  return res.data
}

export async function getRecipe(id: number): Promise<Recipe> {
  const res = await client.get<Recipe>(`/food/recipes/${id}/`)
  return res.data
}
