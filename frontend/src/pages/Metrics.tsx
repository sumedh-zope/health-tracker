import { useEffect, useState } from 'react'
import { getBodyWeights, logBodyWeight, deleteBodyWeight, type BodyWeight } from '../api'
import WeightChart from '../components/WeightChart'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Metrics() {
  const [weights, setWeights] = useState<BodyWeight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [date, setDate] = useState(todayStr())
  const [weightKg, setWeightKg] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  async function loadWeights() {
    setLoading(true)
    setError(null)
    try {
      const data = await getBodyWeights(30)
      // Sort descending for table
      setWeights([...data].sort((a, b) => b.date.localeCompare(a.date)))
    } catch {
      setError('Failed to load weight data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeights()
  }, [])

  async function handleLog() {
    const kg = parseFloat(weightKg)
    if (isNaN(kg) || kg <= 0) {
      setSaveError('Enter a valid weight in kg.')
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await logBodyWeight({ date, weight_kg: kg, notes: notes || undefined })
      setWeightKg('')
      setNotes('')
      setSaveSuccess(true)
      await loadWeights()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save weight. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this weight entry?')) return
    try {
      await deleteBodyWeight(id)
      await loadWeights()
    } catch {
      alert('Failed to delete entry.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Body Metrics</h1>
      </div>

      {/* Log form */}
      <div className="card">
        <h2>Log Weight</h2>
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
            <label className="label">Weight (kg)</label>
            <input
              type="number"
              className="input"
              value={weightKg}
              placeholder="e.g. 75.5"
              min="20"
              max="300"
              step="0.1"
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              className="input"
              value={notes}
              placeholder="e.g. after workout"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleLog}
            disabled={saving}
            style={{ alignSelf: 'flex-end' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {saveError && <div className="error-banner">{saveError}</div>}
        {saveSuccess && <div className="success-banner">Weight logged successfully!</div>}
      </div>

      {/* Chart */}
      <div className="card">
        <h2>Weight Trend (Last 30 Days)</h2>
        {loading ? (
          <div className="page-loading">Loading chart...</div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : (
          <WeightChart data={weights} />
        )}
      </div>

      {/* History table */}
      {!loading && !error && weights.length > 0 && (
        <div className="card">
          <h2>Recent Entries</h2>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight (kg)</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {weights.map((w) => (
                <tr key={w.id}>
                  <td>{w.date}</td>
                  <td>{w.weight_kg}</td>
                  <td>{w.notes || '—'}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(w.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
