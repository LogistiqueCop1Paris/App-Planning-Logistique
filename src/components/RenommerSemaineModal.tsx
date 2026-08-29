import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Planning } from '../types'
import { libelleSemaine } from '../lib/dates'
import Modal from './Modal'

interface Props {
  planning: Pick<Planning, 'id' | 'semaine_debut' | 'titre'>
  onClose: () => void
  onSaved: () => void
}

export default function RenommerSemaineModal({ planning, onClose, onSaved }: Props) {
  const [titre, setTitre] = useState(planning.titre ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase
      .from('plannings')
      .update({ titre: titre.trim() || null })
      .eq('id', planning.id)
    setSaving(false)
    if (error) {
      setError(`Impossible d'enregistrer : ${error.message}`)
      return
    }
    onSaved()
  }

  return (
    <Modal title="Surnom de la semaine" onClose={onClose}>
      <p className="modal-subtitle">
        Un surnom facultatif qui s'affiche <strong>en plus</strong> des dates (semaine{' '}
        {libelleSemaine(planning.semaine_debut)}).
      </p>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Surnom
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Semaine de la rentrée, Vacances de Noël…"
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  )
}
