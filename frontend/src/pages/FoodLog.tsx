import { useEffect, useState } from 'react'
import {
  getMealLogs,
  createMealLog,
  addMealLogEntry,
  getActivities,
  type MealLog,
  type FoodItem,
  type Activity,
} from '../api'
import FoodSearch from '../components/FoodSearch'
import MealLogCard from '../components/MealLogCard'

type MealType = MealLog['meal_type']

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function FoodLog() {
  const [date, setDate] = useState(todayStr())
  const [logs, setLogs] = useState<MealLog[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add meal form state
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState<string>('100')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const [data, activityData] = await Promise.all([
        getMealLogs(date),
        getActivities(date),
      ])
      setLogs(data)
      setActivities(activityData)
    } catch {
      setError('Failed to load meal logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [date])

  function handleFoodSelect(item: FoodItem) {
    setSelectedFood(item)
    setAddError(null)
  }

  async function handleAddEntry() {
    if (!selectedFood) {
      setAddError('Please search and select a food item.')
      return
    }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      setAddError('Enter a valid quantity greater than 0.')
      return
    }

    setAdding(true)
    setAddError(null)

    try {
      // Find or create a meal log for this date + meal type
      let targetLog = logs.find((l) => l.meal_type === mealType)

      if (!targetLog) {
        targetLog = await createMealLog({ date, meal_type: mealType })
      }

      await addMealLogEntry(targetLog.id, {
        food_item: selectedFood.id,
        amount_grams: qty,
      })

      setSelectedFood(null)
      setQuantity('100')
      await loadLogs()
    } catch {
      setAddError('Failed to add food entry. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const totalBurned = activities.reduce((sum, a) => sum + Number(a.calories_burned), 0)

  const totals = logs.reduce(
    (acc, l) => {
      const logTotals = l.entries.reduce(
        (eAcc, e) => ({
          calories: eAcc.calories + Number(e.calories),
          protein: eAcc.protein + Number(e.protein),
          carbs: eAcc.carbs + Number(e.carbs),
          fat: eAcc.fat + Number(e.fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      return {
        calories: acc.calories + logTotals.calories,
        protein: acc.protein + logTotals.protein,
        carbs: acc.carbs + logTotals.carbs,
        fat: acc.fat + logTotals.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1>Food Log</h1>
      </div>

      {/* Add Meal Form */}
      <div className="card">
        <h2>Log a Meal</h2>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Meal Type</label>
            <select
              className="select"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
            >
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Search Food</label>
          <FoodSearch onSelect={handleFoodSelect} />
        </div>

        {selectedFood && (
          <div className="selected-food-preview">
            <strong>{selectedFood.name}</strong>
            {selectedFood.brand && <span> ({selectedFood.brand})</span>}
            <span className="food-meta">
              &nbsp;— {selectedFood.calories_per_100g} kcal / 100g &nbsp;|&nbsp;
              P: {selectedFood.protein_per_100g}g &nbsp;
              C: {selectedFood.carbs_per_100g}g &nbsp;
              F: {selectedFood.fat_per_100g}g
            </span>
          </div>
        )}

        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="label">Quantity (g)</label>
            <input
              type="number"
              className="input"
              value={quantity}
              min="1"
              step="1"
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddEntry}
            disabled={adding || !selectedFood}
          >
            {adding ? 'Adding...' : 'Add to Log'}
          </button>
        </div>

        {addError && <div className="error-banner">{addError}</div>}
      </div>

      {/* Daily totals */}
      {logs.length > 0 && (
        <div className="card">
          <h2>Day Totals — {date}</h2>
          <div className="totals-row">
            <div className="total-item">
              <span className="total-value">{Math.round(totals.calories)}</span>
              <span className="total-label">Consumed (kcal)</span>
            </div>
            {totalBurned > 0 && (
              <>
                <div className="total-item">
                  <span className="total-value" style={{ color: '#4caf50' }}>−{Math.round(totalBurned)}</span>
                  <span className="total-label">Burned (kcal)</span>
                </div>
                <div className="total-item">
                  <span className="total-value">{Math.round(totals.calories - totalBurned)}</span>
                  <span className="total-label">Net (kcal)</span>
                </div>
              </>
            )}
            {totalBurned === 0 && (
              <div className="total-item">
                <span className="total-value">{Math.round(totals.calories)}</span>
                <span className="total-label">kcal</span>
              </div>
            )}
            <div className="total-item">
              <span className="total-value">{Math.round(totals.protein)}g</span>
              <span className="total-label">Protein</span>
            </div>
            <div className="total-item">
              <span className="total-value">{Math.round(totals.carbs)}g</span>
              <span className="total-label">Carbs</span>
            </div>
            <div className="total-item">
              <span className="total-value">{Math.round(totals.fat)}g</span>
              <span className="total-label">Fat</span>
            </div>
          </div>
        </div>
      )}

      {/* Meal log cards */}
      <div style={{ marginTop: '24px' }}>
        {loading && <div className="page-loading">Loading logs...</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && logs.length === 0 && (
          <div className="empty-state card">No meals logged for {date}.</div>
        )}
        {logs.map((log) => (
          <MealLogCard key={log.id} log={log} onUpdate={loadLogs} />
        ))}
      </div>
    </div>
  )
}
