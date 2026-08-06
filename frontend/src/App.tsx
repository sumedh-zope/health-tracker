import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import FoodLog from './pages/FoodLog'
import Metrics from './pages/Metrics'
import Goals from './pages/Goals'
import Recipes from './pages/Recipes'
import Login from './pages/Login'

function isAuthenticated() {
  return !!localStorage.getItem('auth_token')
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            isAuthenticated() ? (
              <>
                <Navbar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/log" element={<FoodLog />} />
                    <Route path="/metrics" element={<Metrics />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/recipes" element={<Recipes />} />
                  </Routes>
                </main>
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
