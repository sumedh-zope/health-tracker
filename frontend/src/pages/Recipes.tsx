import { useEffect, useState } from 'react'
import { getRecipes, getRecipe, type Recipe } from '../api'

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getRecipes()
        setRecipes(data)
      } catch {
        setError('Failed to load recipes.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSelect(recipe: Recipe) {
    if (selected?.id === recipe.id) {
      setSelected(null)
      return
    }
    setDetailLoading(true)
    try {
      const detail = await getRecipe(recipe.id)
      setSelected(detail)
    } catch {
      setSelected(recipe)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Recipes</h1>
      </div>

      {loading && <div className="page-loading">Loading recipes...</div>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && recipes.length === 0 && (
        <div className="card">
          <p className="empty-state">No recipes found. Add recipes via the backend admin.</p>
        </div>
      )}

      {recipes.length > 0 && <div className="recipes-layout">
        {/* Recipe list */}
        <div className="recipe-list">
          {recipes.map((r) => (
            <div
              key={r.id}
              className={`recipe-list-item ${selected?.id === r.id ? 'selected' : ''}`}
              onClick={() => handleSelect(r)}
            >
              <div className="recipe-list-name">{r.name}</div>
              <div className="recipe-list-meta">
                {Math.round(r.calories_per_serving)} kcal/serving &middot; {r.servings} servings
              </div>
            </div>
          ))}
        </div>

        {/* Recipe detail */}
        <div className="recipe-detail-panel">
          {detailLoading && <div className="page-loading">Loading recipe...</div>}
          {!detailLoading && !selected && (
            <div className="empty-state" style={{ padding: '32px' }}>
              Select a recipe to view details.
            </div>
          )}
          {!detailLoading && selected && (
            <div className="recipe-detail">
              <div className="recipe-detail-header">
                <h2>{selected.name}</h2>
                {selected.description && (
                  <p className="recipe-description">{selected.description}</p>
                )}
              </div>

              {/* Nutrition summary */}
              <div className="recipe-nutrition">
                <h3>Nutrition per Serving ({selected.servings} servings)</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.calories_per_serving)}</span>
                    <span className="nutrition-label">kcal</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.protein_per_serving)}g</span>
                    <span className="nutrition-label">Protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.carbs_per_serving)}g</span>
                    <span className="nutrition-label">Carbs</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.fat_per_serving)}g</span>
                    <span className="nutrition-label">Fat</span>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="recipe-totals">
                <h3>Total (whole recipe)</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.total_calories)}</span>
                    <span className="nutrition-label">kcal</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.total_protein)}g</span>
                    <span className="nutrition-label">Protein</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.total_carbs)}g</span>
                    <span className="nutrition-label">Carbs</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(selected.total_fat)}g</span>
                    <span className="nutrition-label">Fat</span>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              {selected.ingredients.length > 0 && (
                <div className="recipe-ingredients">
                  <h3>Ingredients</h3>
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Food</th>
                        <th>Amount</th>
                        <th>Calories</th>
                        <th>Protein</th>
                        <th>Carbs</th>
                        <th>Fat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.ingredients.map((ing) => {
                        const factor = ing.quantity_g / 100
                        return (
                          <tr key={ing.id}>
                            <td>{ing.food_item.name}</td>
                            <td>{ing.quantity_g}g</td>
                            <td>{Math.round(ing.food_item.calories_per_100g * factor)} kcal</td>
                            <td>{Math.round(ing.food_item.protein_per_100g * factor)}g</td>
                            <td>{Math.round(ing.food_item.carbs_per_100g * factor)}g</td>
                            <td>{Math.round(ing.food_item.fat_per_100g * factor)}g</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>}
    </div>
  )
}
