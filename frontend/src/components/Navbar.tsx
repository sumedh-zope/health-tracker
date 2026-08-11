import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Food Log' },
  { to: '/activity', label: 'Activity' },
  { to: '/metrics', label: 'Body Metrics' },
  { to: '/goals', label: 'Goals' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/history', label: 'History' },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">HealthTracker</span>
      <ul className="navbar-links">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={to === '/'}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
