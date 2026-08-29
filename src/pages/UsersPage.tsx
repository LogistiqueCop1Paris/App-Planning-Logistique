import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import type { Profile, Role } from '../types'
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../roles'
import SetPasswordModal from '../components/SetPasswordModal'
import EditProfileModal from '../components/EditProfileModal'
import CreateUserModal from '../components/CreateUserModal'

export default function UsersPage() {
  const { profile: monProfil, refreshProfile } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<Profile | null>(null)
  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nom, prenom, email, telephone, role')
      .order('nom')
    if (error) setError(error.message)
    else setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRoleChange(id: string, role: Role) {
    setError(null)
    const previous = profiles.find((p) => p.id === id)?.role
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)))
    setSavingId(id)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    setSavingId(null)
    if (error) {
      setError(`Impossible de changer ce rôle : ${error.message}`)
      if (previous) {
        setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role: previous } : p)))
      }
    } else if (id === monProfil?.id) {
      refreshProfile()
    }
  }

  async function handleDelete(p: Profile) {
    if (
      !window.confirm(
        `Supprimer définitivement le compte de ${p.prenom} ${p.nom} ? Cette action est irréversible.`
      )
    ) {
      return
    }
    setError(null)
    setDeletingId(p.id)
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: p.id },
    })
    setDeletingId(null)
    if (error || data?.error) {
      setError(`Impossible de supprimer ce compte : ${data?.error ?? error?.message}`)
      return
    }
    setProfiles((prev) => prev.filter((profile) => profile.id !== p.id))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Comptes utilisateurs</h1>
        <div className="page-header-actions">
          <button onClick={() => setCreating(true)}>+ Nouveau compte</button>
        </div>
      </div>

      <section className="roles-legend">
        <h2>Pouvoirs de chaque rôle</h2>
        {ROLES.map((r) => (
          <div className="roles-legend-item" key={r}>
            <strong>{ROLE_LABELS[r]}</strong>
            <span>{ROLE_DESCRIPTIONS[r]}</span>
          </div>
        ))}
        <p className="role-current-description" style={{ maxWidth: 'none' }}>
          Les comptes ne peuvent pas être créés librement : seule cette page en crée. Pense à
          désactiver l'inscription publique dans Supabase (voir README).
        </p>
      </section>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.nom}</td>
                  <td>
                    {p.prenom}
                    {p.id === monProfil?.id && <span className="user-pill"> toi</span>}
                  </td>
                  <td>{p.email ?? '—'}</td>
                  <td>{p.telephone ?? '—'}</td>
                  <td>
                    <select
                      value={p.role}
                      disabled={savingId === p.id}
                      onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button className="small-button" onClick={() => setEditTarget(p)}>
                      ✎ Éditer
                    </button>
                    <button className="small-button" onClick={() => setPasswordTarget(p)}>
                      🔑 Mot de passe
                    </button>
                    {p.id !== monProfil?.id && (
                      <button
                        className="small-button"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        {deletingId === p.id ? 'Suppression…' : 'Supprimer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {passwordTarget && (
        <SetPasswordModal profile={passwordTarget} onClose={() => setPasswordTarget(null)} />
      )}

      {editTarget && (
        <EditProfileModal
          profile={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => {
            setEditTarget(null)
            load()
          }}
        />
      )}

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false)
            load()
          }}
        />
      )}
    </div>
  )
}
