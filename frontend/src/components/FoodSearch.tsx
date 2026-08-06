import { useState, useEffect, useRef } from 'react'
import { searchFoodItems, type FoodItem } from '../api'

interface FoodSearchProps {
  onSelect: (item: FoodItem) => void
  placeholder?: string
}

export default function FoodSearch({
  onSelect,
  placeholder = 'Search food items...',
}: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const items = await searchFoodItems(query.trim())
        setResults(items)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item: FoodItem) {
    onSelect(item)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="food-search" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      {loading && <div className="food-search-loading">Searching...</div>}
      {open && results.length > 0 && (
        <ul className="food-search-results">
          {results.map((item) => (
            <li key={item.id} className="food-search-result" onClick={() => handleSelect(item)}>
              <span className="food-search-name">{item.name}</span>
              {item.brand && <span className="food-search-brand">{item.brand}</span>}
              <span className="food-search-meta">
                {item.calories_per_100g} kcal / 100g
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="food-search-empty">No results found for "{query}"</div>
      )}
    </div>
  )
}
