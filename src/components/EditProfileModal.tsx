import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types'
import Modal from './Modal'

export default function EditProfileModal({
  profile,
  onClose,
  onDone,
}: {
  profile: Profile
  onClose: () => void
  onDone: () => void
}) {
  const [nom, setNom] = useState(profile.nom)
  const [prenom, setPrenom] = useState(profile.prenom)
  const [email, setEmail] = useState(profile.email ?? '')
  const [telephone, setTelephone] = useState(profile.telephone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nom.trim() || !prenom.trim()) {
      setError('Nom et prénom sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const patch: Record<string, string | null> = {}
      if (nom.trim() !== profile.nom) patch.nom = nom.trim()
      if (prenom.trim() !== profile.prenom) patch.prenom = prenom.trim()
      if ((telephone.trim() || null) !== (profile.telephone ?? null)) {
        patch.telephone = telephone.trim() || null
      }
      if (Object.keys(patch).length) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', profile.id)
        if (profileError) throw profileError
      }

      if (email.trim() && email.trim() !== profile.email) {
        const { data, error: invokeError } = await supabase.functions.invoke('admin-update-email', {
          body: { userId: profile.id, newEmail: email.trim() },
        })
        if (invokeError || data?.error) throw new Error(data?.error ?? invokeError?.message)
      }

      onDone()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Impossible d'enregistrer : ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Éditer — ${profile.prenom} ${profile.nom}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Nom
          <input value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
        </label>
        <label>
          Prénom
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Téléphone
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </label>
        <p className="field-hint">
          ⚠️ Changer l'email change aussi l'adresse utilisée pour se connecter — aucun email de
          confirmation n'est envoyé, préviens la personne concernée directement.
        </p>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  )
}
