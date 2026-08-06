import { useEffect, useState } from 'react'
import { getGoals, createGoal, updateGoal, deleteGoal, type Goal } from '../api'

type GoalType = Goal['goal_type']

const GOAL_TYPES: { type: GoalType; label: string; unit: string }[] = [
  { type: 'calories', label: 'Calories', unit: 'kcal' },
  { type: 'protein', label: 'Protein', unit: 'g' },
  { type: 'carbs', label: 'Carbs', unit: 'g' },
  { type: 'fat', label: 'Fat', unit: 'g' },
  { type: 'weight', label: 'Target Weight', unit: 'kg' },
]

const GOAL_COLORS: Record<GoalType, string> = {
  calories: '#f5a623',
  protein: '#4caf50',
  carbs: '#2196f3',
  fat: '#ff9800',
  weight: '#9c27b0',
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [goalType, setGoalType] = useState<GoalType>('calories')
  const [targetValue, setTargetValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function loadGoals() {
    setLoading(true)
    setError(null)
    try {
      const data = await getGoals()
      setGoals(data)
    } catch {
      setError('Failed to load goals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  async function handleCreate() {
    const val = parseFloat(targetValue)
    if (isNaN(val) || val <= 0) {
      setSaveError('Enter a valid positive target value.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const meta = GOAL_TYPES.find((g) => g.type === goalType)!
      await createGoal({ goal_type: goalType, target_value: val, unit: meta.unit, start_date: new Date().toISOString().slice(0, 10) })
      setTargetValue('')
      await loadGoals()
    } catch {
      setSaveError('Failed to create goal.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(goal: Goal) {
    try {
      await updateGoal(goal.id, { active: !goal.active })
      await loadGoals()
    } catch {
      alert('Failed to update goal.')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this goal?')) return
    try {
      await deleteGoal(id)
      await loadGoals()
    } catch {
      alert('Failed to delete goal.')
    }
  }

  const activeGoals = goals.filter((g) => g.active)
  const inactiveGoals = goals.filter((g) => !g.active)

  const selectedMeta = GOAL_TYPES.find((g) => g.type === goalType)!

  return (
    <div className="page">
      <div className="page-header">
        <h1>Goals</h1>
      </div>

      {/* Active goals */}
      <div className="card">
        <h2>Active Goals</h2>
        {loading && <div className="page-loading">Loading goals...</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && activeGoals.length === 0 && (
          <p className="empty-state">No active goals. Set one below.</p>
        )}
        {activeGoals.length > 0 && (
          <div className="goals-grid">
            {activeGoals.map((goal) => {
              const meta = GOAL_TYPES.find((g) => g.type === goal.goal_type)
              return (
                <div
                  key={goal.id}
                  className="goal-card"
                  style={{ borderLeftColor: GOAL_COLORS[goal.goal_type] }}
                >
                  <div className="goal-card-header">
                    <span className="goal-type">{meta?.label ?? goal.goal_type}</span>
                    <div className="goal-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleActive(goal)}
                      >
                        Deactivate
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="goal-value">
                    {goal.target_value} {goal.unit}
                  </div>
                  <div className="goal-meta">Started {goal.start_date}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create goal form */}
      <div className="card">
        <h2>Set New Goal</h2>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Goal Type</label>
            <select
              className="select"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
            >
              {GOAL_TYPES.map((g) => (
                <option key={g.type} value={g.type}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Target ({selectedMeta.unit})</label>
            <input
              type="number"
              className="input"
              value={targetValue}
              min="0"
              step="0.1"
              placeholder={`e.g. ${goalType === 'calories' ? '2000' : goalType === 'weight' ? '75' : '150'}`}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={saving}
            style={{ alignSelf: 'flex-end' }}
          >
            {saving ? 'Saving...' : 'Set Goal'}
          </button>
        </div>
        {saveError && <div className="error-banner">{saveError}</div>}
      </div>

      {/* Inactive goals */}
      {inactiveGoals.length > 0 && (
        <div className="card">
          <h2>Inactive Goals</h2>
          <div className="goals-grid">
            {inactiveGoals.map((goal) => {
              const meta = GOAL_TYPES.find((g) => g.type === goal.goal_type)
              return (
                <div
                  key={goal.id}
                  className="goal-card inactive"
                  style={{ borderLeftColor: '#ccc' }}
                >
                  <div className="goal-card-header">
                    <span className="goal-type">{meta?.label ?? goal.goal_type}</span>
                    <div className="goal-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleActive(goal)}
                      >
                        Activate
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="goal-value">
                    {goal.target_value} {goal.unit}
                  </div>
                  <div className="goal-meta">Started {goal.start_date}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
