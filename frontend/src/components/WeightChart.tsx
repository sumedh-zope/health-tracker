import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BodyWeight } from '../api'

interface WeightChartProps {
  data: BodyWeight[]
}

export default function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return <p className="empty-state">No weight data yet. Log your first entry above.</p>
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))

  const chartData = sorted.map((w) => ({
    date: w.date.slice(5), // MM-DD
    weight: w.weight_kg,
  }))

  const weights = sorted.map((w) => w.weight_kg)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const padding = 1
  const domain: [number, number] = [
    Math.floor(minW - padding),
    Math.ceil(maxW + padding),
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={domain} tick={{ fontSize: 12 }} unit=" kg" width={56} />
        <Tooltip
          formatter={(value: number) => [`${value} kg`, 'Weight']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#4a9eff"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
