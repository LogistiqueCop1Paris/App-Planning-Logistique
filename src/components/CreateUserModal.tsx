import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Role } from '../types'
import { ROLES, ROLE_LABELS } from '../roles'
import Modal from './Modal'
import { genererMotDePasse } from '../lib/motDePasse'

export default function CreateUserModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [role, setRole] = useState<Role>('gestionnaire')
  const [password, setPassword] = useState(genererMotDePasse)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setError('Nom, prénom et email sont obligatoires.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setSaving(true)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: email.trim(),
        password,
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim() || null,
        role,
      },
    })
    setSaving(false)
    if (invokeError || data?.error) {
      setError(`Impossible de créer le compte : ${data?.error ?? invokeError?.message}`)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <Modal title="Compte créé" onClose={onClose}>
        <p className="modal-subtitle">
          Transmets ces identifiants à {prenom} par le canal habituel de l'asso (aucun email n'est
          envoyé) :
        </p>
        <p className="password-display">
          {email}
          <br />
          {password}
        </p>
        <button
          type="button"
          onClick={() => {
            onDone()
            onClose()
          }}
        >
          Fermer
        </button>
      </Modal>
    )
  }

  return (
    <Modal title="Nouveau compte" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Nom
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required autoFocus />
        </label>
        <label>
          Prénom
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Téléphone (facultatif)
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </label>
        <label>
          Rôle
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mot de passe initial
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <button
          type="button"
          className="small-button"
          onClick={() => setPassword(genererMotDePasse())}
        >
          🎲 Regénérer
        </button>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Création…' : 'Créer le compte'}
        </button>
      </form>
    </Modal>
  )
}
