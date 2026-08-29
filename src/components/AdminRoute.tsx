import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { peutGererUtilisateurs } from '../roles'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) return <div className="page-loading">Chargement…</div>
  if (!peutGererUtilisateurs(profile?.role)) {
    return <p className="empty-state">Cette page est réservée aux admins.</p>
  }
  return <>{children}</>
}
