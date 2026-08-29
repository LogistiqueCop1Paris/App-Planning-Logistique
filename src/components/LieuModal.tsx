import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CouleurLieu, Lieu } from '../types'
import { COULEURS_KEYS, COULEURS_LIEU } from '../lib/couleurs'
import Modal from './Modal'

interface Props {
  lieu?: Lieu
  onClose: () => void
  onSaved: () => void
}

export default function LieuModal({ lieu, onClose, onSaved }: Props) {
  const [nom, setNom] = useState(lieu?.nom ?? '')
  const [adresse, setAdresse] = useState(lieu?.adresse ?? '')
  const [couleur, setCouleur] = useState<CouleurLieu>(lieu?.couleur ?? 'gris')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setSaving(true)
    const payload = { nom: nom.trim(), adresse: adresse.trim() || null, couleur }
    const { error } = lieu
      ? await supabase.from('lieux').update(payload).eq('id', lieu.id)
      : await supabase.from('lieux').insert(payload)
    setSaving(false)
    if (error) {
      setError(
        error.message.includes('duplicate') || error.message.includes('unique')
          ? 'Un lieu porte déjà ce nom.'
          : `Impossible d'enregistrer : ${error.message}`
      )
      return
    }
    onSaved()
  }

  return (
    <Modal title={lieu ? 'Éditer le lieu' : 'Nouveau lieu'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Nom
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="BAPIF Arcueil"
            required
            autoFocus
          />
        </label>
        <label>
          Adresse (facultatif)
          <textarea
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="12 rue… 94110 Arcueil"
          />
        </label>
        <span className="label-comme">Couleur</span>
        <div className="couleur-choix">
          {COULEURS_KEYS.map((k) => {
            const c = COULEURS_LIEU[k]
            return (
              <button
                type="button"
                key={k}
                className={'couleur-pastille' + (couleur === k ? ' is-actif' : '')}
                style={{ background: c.bg, borderColor: c.bord, color: c.texte }}
                onClick={() => setCouleur(k)}
                title={c.label}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  )
}
