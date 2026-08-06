interface MacroBarProps {
  label: string
  current: number
  goal: number
  unit?: string
  color?: string
}

export default function MacroBar({
  label,
  current,
  goal,
  unit = 'g',
  color = '#4a9eff',
}: MacroBarProps) {
  const cur = Number(current)
  const tgt = Number(goal)
  const pct = tgt > 0 ? Math.min((cur / tgt) * 100, 100) : 0
  const over = tgt > 0 && cur > tgt

  return (
    <div className="macro-bar">
      <div className="macro-bar-header">
        <span className="macro-bar-label">{label}</span>
        <span className={`macro-bar-values ${over ? 'over' : ''}`}>
          {Math.round(cur)}{unit} / {Math.round(tgt)}{unit}
        </span>
      </div>
      <div className="macro-bar-track">
        <div
          className="macro-bar-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: over ? '#e05252' : color,
          }}
        />
      </div>
      {over && (
        <span className="macro-bar-over-label">
          +{Math.round(cur - tgt)}{unit} over goal
        </span>
      )}
    </div>
  )
}
