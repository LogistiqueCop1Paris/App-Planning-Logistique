import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal'

interface Props {
  token: string
  activiteId: string
  activiteLabel: string
  onClose: () => void
  onDone: (nouvelleAffectationId: string) => void
}

export default function BenevoleSignupModal({
  token,
  activiteId,
  activiteLabel,
  onClose,
  onDone,
}: Props) {
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nom.trim()) {
      setError('Merci d’indiquer ton nom.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.rpc('inscrire_benevole', {
      p_token: token,
      p_activite_id: activiteId,
      p_nom: nom.trim(),
      p_telephone: telephone.trim() || null,
    })
    setSaving(false)
    if (error) {
      setError(traduireErreur(error.message))
      return
    }
    onDone(data as string)
  }

  return (
    <Modal title="S'inscrire sur ce créneau" onClose={onClose}>
      <p className="modal-subtitle">{activiteLabel}</p>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Nom / prénom
          <input value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
        </label>
        <label>
          Téléphone
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </label>
        <p className="field-hint">
          Le téléphone est facultatif mais <strong>vivement recommandé</strong> : il permet au
          référent de te joindre en cas de changement.
        </p>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Inscription…' : "Je m'inscris"}
        </button>
      </form>
    </Modal>
  )
}

function traduireErreur(msg: string): string {
  if (msg.includes('verrouille') || msg.includes('verrouillé')) {
    return 'Les inscriptions sont fermées pour cette semaine.'
  }
  if (msg.includes('complet') || msg.includes('places')) {
    return 'Ce créneau est déjà complet.'
  }
  if (msg.includes('doublon') || msg.includes('déjà')) {
    return 'Ce nom est déjà inscrit sur ce créneau.'
  }
  return `Inscription impossible : ${msg}`
}
