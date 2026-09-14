import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { peutGererUtilisateurs, ROLE_LABELS } from '../roles'
import logo from '../assets/logo.png'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)

  // Referme le menu mobile à chaque changement de page — sinon il reste
  // ouvert par-dessus la page suivante après avoir cliqué un lien.
  useEffect(() => {
    setMenuOuvert(false)
  }, [location.pathname])

  // Bloque le défilement de la page derrière le tiroir pendant qu'il est ouvert.
  useEffect(() => {
    document.body.style.overflow = menuOuvert ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOuvert])

  async function handleSignOut() {
    await signOut()
    navigate('/connexion')
  }

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <span className="brand">
          <img src={logo} alt="Solidarités Étudiantes CO-P1" className="brand-logo" />
          Planning hebdo
        </span>
        <button
          className="navbar-burger"
          onClick={() => setMenuOuvert((v) => !v)}
          aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOuvert}
        >
          {menuOuvert ? '✕' : '☰'}
        </button>
      </div>

      <div
        className={`navbar-backdrop${menuOuvert ? ' is-ouvert' : ''}`}
        onClick={() => setMenuOuvert(false)}
      />

      <div className={`navbar-menu${menuOuvert ? ' is-ouvert' : ''}`}>
        <button className="navbar-menu-close" onClick={() => setMenuOuvert(false)} aria-label="Fermer le menu">
          ✕
        </button>
        <div className="navbar-left">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Semaines
          </NavLink>
          <NavLink to="/archives" className={({ isActive }) => (isActive ? 'active' : '')}>
            Archives
          </NavLink>
          <NavLink to="/lieux" className={({ isActive }) => (isActive ? 'active' : '')}>
            Lieux
          </NavLink>
          {peutGererUtilisateurs(profile?.role) && (
            <NavLink to="/utilisateurs" className={({ isActive }) => (isActive ? 'active' : '')}>
              Utilisateurs
            </NavLink>
          )}
        </div>
        <div className="navbar-right">
          {profile && (
            <span className="user-pill">
              {profile.prenom} {profile.nom} · {ROLE_LABELS[profile.role]}
            </span>
          )}
          <button className="link-button" onClick={handleSignOut}>
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}
