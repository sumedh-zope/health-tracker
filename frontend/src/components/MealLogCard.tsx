import { useState } from 'react'
import { deleteMealLogEntry, deleteMealLog, type MealLog } from '../api'

interface MealLogCardProps {
  log: MealLog
  onUpdate: () => void
}

const MEAL_LABELS: Record<MealLog['meal_type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function MealLogCard({ log, onUpdate }: MealLogCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const totalCalories = log.entries.reduce((sum, e) => sum + Number(e.calories), 0)
  const totalProtein = log.entries.reduce((sum, e) => sum + Number(e.protein), 0)
  const totalCarbs = log.entries.reduce((sum, e) => sum + Number(e.carbs), 0)
  const totalFat = log.entries.reduce((sum, e) => sum + Number(e.fat), 0)

  async function handleDeleteEntry(entryId: number) {
    try {
      await deleteMealLogEntry(log.id, entryId)
      onUpdate()
    } catch {
      alert('Failed to delete entry.')
    }
  }

  async function handleDeleteLog() {
    if (!confirm(`Delete the entire ${MEAL_LABELS[log.meal_type]} log?`)) return
    setDeleting(true)
    try {
      await deleteMealLog(log.id)
      onUpdate()
    } catch {
      alert('Failed to delete meal log.')
      setDeleting(false)
    }
  }

  return (
    <div className="meal-log-card">
      <div className="meal-log-card-header" onClick={() => setExpanded((v) => !v)}>
        <div>
          <span className="meal-type-badge">{MEAL_LABELS[log.meal_type]}</span>
          <span className="meal-log-calories">{Math.round(totalCalories)} kcal</span>
        </div>
        <div className="meal-log-header-right">
          <span className="meal-log-macros">
            P: {Math.round(totalProtein)}g &nbsp;
            C: {Math.round(totalCarbs)}g &nbsp;
            F: {Math.round(totalFat)}g
          </span>
          <button
            className="btn btn-danger btn-sm"
            onClick={(e) => { e.stopPropagation(); handleDeleteLog() }}
            disabled={deleting}
          >
            {deleting ? '...' : 'Delete'}
          </button>
          <span className="expand-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <ul className="meal-log-entries">
          {log.entries.length === 0 && (
            <li className="meal-log-entry empty-entry">No items in this meal.</li>
          )}
          {log.entries.map((entry) => (
            <li key={entry.id} className="meal-log-entry">
              <div className="entry-info">
                <span className="entry-name">{entry.food_item_name}</span>
                <span className="entry-qty">{entry.amount_grams}g</span>
              </div>
              <div className="entry-nutrition">
                <span>{Math.round(entry.calories)} kcal</span>
                <span>P: {Math.round(entry.protein)}g</span>
                <span>C: {Math.round(entry.carbs)}g</span>
                <span>F: {Math.round(entry.fat)}g</span>
                <button
                  className="btn-icon"
                  title="Remove entry"
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
