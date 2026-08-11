import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDailySummary, getBodyWeights, getGoals, type DailySummary, type BodyWeight, type Goal } from '../api'
import MacroBar from '../components/MacroBar'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function findGoalTarget(goals: Goal[], type: Goal['goal_type']): number | undefined {
  return goals.find((g) => g.goal_type === type && g.active)?.target_value
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [latestWeight, setLatestWeight] = useState<BodyWeight | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sum, weights, activeGoals] = await Promise.all([
          getDailySummary(todayStr()),
          getBodyWeights(7),
          getGoals(true),
        ])
        setSummary(sum)
        setGoals(activeGoals)
        if (weights.length > 0) {
          const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date))
          setLatestWeight(sorted[0])
        }
      } catch {
        setError('Failed to load dashboard data. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="page-loading">Loading dashboard...</div>
  if (error) return <div className="error-banner">{error}</div>

  const s = summary!
  const calorieGoal = findGoalTarget(goals, 'calories')
  const proteinGoal = findGoalTarget(goals, 'protein')
  const carbsGoal = findGoalTarget(goals, 'carbs')
  const fatGoal = findGoalTarget(goals, 'fat')

  const consumed = Number(s.total_calories)
  const burned = Number(s.calories_burned)
  const netCalories = consumed - burned

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <span className="page-subtitle">{todayStr()}</span>
      </div>

      <div className="dashboard-grid">
        {/* Calories card */}
        <div className="card">
          <h2>Calories Today</h2>
          {burned > 0 ? (
            <div className="calorie-breakdown">
              <div className="calorie-breakdown-row">
                <span className="calorie-breakdown-label">Consumed</span>
                <span className="calorie-breakdown-value">{Math.round(consumed)} kcal</span>
              </div>
              <div className="calorie-breakdown-row calorie-breakdown-burned">
                <span className="calorie-breakdown-label">Burned</span>
                <span className="calorie-breakdown-value">−{Math.round(burned)} kcal</span>
              </div>
              <div className="calorie-breakdown-divider" />
              <div className="calorie-breakdown-row calorie-breakdown-net">
                <span className="calorie-breakdown-label">Net</span>
                <span className="calorie-breakdown-value">{Math.round(netCalories)} kcal</span>
              </div>
              {calorieGoal !== undefined && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #888)', marginTop: 4 }}>
                  Goal: {Math.round(calorieGoal)} kcal
                </div>
              )}
            </div>
          ) : (
            <div className="calorie-display">
              <span className="calorie-current">{Math.round(consumed)}</span>
              {calorieGoal !== undefined && (
                <>
                  <span className="calorie-sep"> / </span>
                  <span className="calorie-goal">{Math.round(calorieGoal)} kcal</span>
                </>
              )}
            </div>
          )}
          <MacroBar
            label="Calories"
            current={netCalories}
            goal={calorieGoal ?? 0}
            unit=" kcal"
            color="#f5a623"
          />
        </div>

        {/* Macros card */}
        <div className="card">
          <h2>Macros</h2>
          <MacroBar
            label="Protein"
            current={s.total_protein}
            goal={proteinGoal ?? 0}
            color="#4caf50"
          />
          <MacroBar
            label="Carbs"
            current={s.total_carbs}
            goal={carbsGoal ?? 0}
            color="#2196f3"
          />
          <MacroBar
            label="Fat"
            current={s.total_fat}
            goal={fatGoal ?? 0}
            color="#ff9800"
          />
        </div>

        {/* Body weight card */}
        <div className="card">
          <h2>Body Weight</h2>
          {latestWeight ? (
            <div className="weight-display">
              <span className="weight-value">{latestWeight.weight_kg} kg</span>
              <span className="weight-date">as of {latestWeight.date}</span>
            </div>
          ) : (
            <p className="empty-state">No weight logged yet.</p>
          )}
          <Link to="/metrics" className="btn btn-secondary" style={{ marginTop: '12px', display: 'inline-block' }}>
            Log Weight
          </Link>
        </div>

        {/* Quick actions card */}
        <div className="card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/log" className="btn btn-primary">
              + Add Meal
            </Link>
            <Link to="/activity" className="btn btn-primary">
              + Log Activity
            </Link>
            <Link to="/metrics" className="btn btn-secondary">
              + Log Weight
            </Link>
            <Link to="/goals" className="btn btn-secondary">
              View Goals
            </Link>
          </div>
        </div>
      </div>

      {/* Today's meals */}
      {s.meals.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2>Today's Meals</h2>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Meal</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {s.meals.map((m) => (
                <tr key={m.id}>
                  <td style={{ textTransform: 'capitalize' }}>{m.meal_type}</td>
                  <td>{m.entries.length} item{m.entries.length !== 1 ? 's' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
