import { useEffect, useState } from 'react'
import {
  getActivities,
  logActivity,
  deleteActivity,
  type Activity,
} from '../api'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Activities() {
  const [date, setDate] = useState(todayStr())
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function loadActivities() {
    setLoading(true)
    setError(null)
    try {
      const data = await getActivities(date)
      setActivities(data)
    } catch {
      setError('Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [date])

  async function handleAdd() {
    if (!name.trim()) {
      setAddError('Please enter an activity name.')
      return
    }
    const kcal = parseInt(caloriesBurned, 10)
    if (isNaN(kcal) || kcal <= 0) {
      setAddError('Enter a valid calories burned value greater than 0.')
      return
    }

    setAdding(true)
    setAddError(null)
    try {
      const payload: Parameters<typeof logActivity>[0] = {
        date,
        name: name.trim(),
        calories_burned: kcal,
      }
      const dur = parseInt(durationMinutes, 10)
      if (!isNaN(dur) && dur > 0) {
        payload.duration_minutes = dur
      }
      if (notes.trim()) {
        payload.notes = notes.trim()
      }
      await logActivity(payload)
      setName('')
      setCaloriesBurned('')
      setDurationMinutes('')
      setNotes('')
      await loadActivities()
    } catch {
      setAddError('Failed to log activity. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteActivity(id)
      await loadActivities()
    } catch {
      setError('Failed to delete activity.')
    }
  }

  const totalBurned = activities.reduce((sum, a) => sum + Number(a.calories_burned), 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Log</h1>
      </div>

      {/* Log Activity Form */}
      <div className="card">
        <h2>Log an Activity</h2>
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
            <label className="label">Activity Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Morning Run"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Calories Burned</label>
            <input
              type="number"
              className="input"
              placeholder="kcal"
              min="1"
              step="1"
              value={caloriesBurned}
              onChange={(e) => setCaloriesBurned(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Duration (minutes, optional)</label>
            <input
              type="number"
              className="input"
              placeholder="min"
              min="1"
              step="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Notes (optional)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={adding}
        >
          {adding ? 'Logging...' : 'Log Activity'}
        </button>

        {addError && <div className="error-banner" style={{ marginTop: 8 }}>{addError}</div>}
      </div>

      {/* Day Total */}
      {activities.length > 0 && (
        <div className="card">
          <h2>Day Total — {date}</h2>
          <div className="totals-row">
            <div className="total-item">
              <span className="total-value" style={{ color: '#4caf50' }}>{Math.round(totalBurned)}</span>
              <span className="total-label">kcal burned</span>
            </div>
            <div className="total-item">
              <span className="total-value">{activities.length}</span>
              <span className="total-label">activit{activities.length !== 1 ? 'ies' : 'y'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div style={{ marginTop: '24px' }}>
        {loading && <div className="page-loading">Loading activities...</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && activities.length === 0 && (
          <div className="empty-state card">No activities logged for {date}.</div>
        )}
        {activities.map((activity) => (
          <div key={activity.id} className="card" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>{activity.name}</strong>
              <div style={{ color: 'var(--text-muted, #888)', fontSize: '0.85rem', marginTop: 4 }}>
                <span style={{ color: '#4caf50', fontWeight: 600 }}>{activity.calories_burned} kcal burned</span>
                {activity.duration_minutes && (
                  <span> &nbsp;·&nbsp; {activity.duration_minutes} min</span>
                )}
              </div>
              {activity.notes && (
                <div style={{ fontSize: '0.82rem', marginTop: 4, color: 'var(--text-muted, #888)' }}>
                  {activity.notes}
                </div>
              )}
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#e05252' }}
              onClick={() => handleDelete(activity.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
