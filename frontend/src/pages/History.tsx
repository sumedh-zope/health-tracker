import { useEffect, useState } from 'react'
import { client } from '../api'

interface DayGoal {
  goal_type: 'calories' | 'protein' | 'carbs' | 'fat'
  target_value: number
  unit: string
}

interface DayEntry {
  date: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_burned: number
  goals: DayGoal[]
}

const GOAL_LABELS: Record<DayGoal['goal_type'], string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
}

const ACTUAL_KEY: Record<DayGoal['goal_type'], keyof DayEntry> = {
  calories: 'total_calories',
  protein: 'total_protein',
  carbs: 'total_carbs',
  fat: 'total_fat',
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90]

function ProgressBar({ actual, target, color }: { actual: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const over = target > 0 && actual > target
  return (
    <div className="macro-bar-track" style={{ marginTop: 4 }}>
      <div
        className="macro-bar-fill"
        style={{ width: `${pct}%`, backgroundColor: over ? '#e05252' : color }}
      />
    </div>
  )
}

export default function History() {
  const [days, setDays] = useState(30)
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    client
      .get<DayEntry[]>('/food/logs/history/', { params: { days } })
      .then((r) => setEntries(r.data))
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="page">
      <div className="page-header">
        <h1>History</h1>
        <select
          className="select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ width: 'auto' }}
        >
          {DAYS_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="page-loading">Loading history...</div>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="empty-state card">No meal data in the last {days} days.</div>
      )}

      {entries.map((entry) => {
        const goalsMap = Object.fromEntries(entry.goals.map((g) => [g.goal_type, g]))

        return (
          <div key={entry.date} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <strong style={{ fontSize: '1rem' }}>{entry.date}</strong>
              <span style={{ color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>
                {entry.total_burned > 0 ? (
                  <>
                    Net: {Math.round(entry.total_calories - entry.total_burned)} kcal
                    {' '}
                    <span style={{ fontSize: '0.78rem' }}>
                      (consumed {Math.round(entry.total_calories)} − burned {Math.round(entry.total_burned)})
                    </span>
                  </>
                ) : (
                  <>
                    {Math.round(entry.total_calories)} kcal
                    {goalsMap.calories && ` / ${Math.round(goalsMap.calories.target_value)} kcal`}
                  </>
                )}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {(['calories', 'protein', 'carbs', 'fat'] as DayGoal['goal_type'][]).map((type) => {
                const raw = entry[ACTUAL_KEY[type]] as number
                const actual = type === 'calories' ? raw - entry.total_burned : raw
                const goal = goalsMap[type]
                const colors = { calories: '#f5a623', protein: '#4caf50', carbs: '#2196f3', fat: '#ff9800' }
                return (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span>{GOAL_LABELS[type]}</span>
                      <span>
                        <strong>{Math.round(actual)}</strong>
                        {goal ? ` / ${Math.round(goal.target_value)} ${goal.unit}` : ` ${type === 'calories' ? 'kcal' : 'g'}`}
                      </span>
                    </div>
                    {goal && (
                      <ProgressBar actual={actual} target={goal.target_value} color={colors[type]} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
