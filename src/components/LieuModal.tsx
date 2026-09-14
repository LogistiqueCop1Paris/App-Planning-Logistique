import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CouleurLieu, Lieu } from '../types'
import { COULEUR_DEFAUT, SUGGESTIONS_COULEUR, normaliserHex, nuanceLieu } from '../lib/couleurs'
import Modal from './Modal'

interface Props {
  lieu?: Lieu
  onClose: () => void
  onSaved: () => void
}

export default function LieuModal({ lieu, onClose, onSaved }: Props) {
  const [nom, setNom] = useState(lieu?.nom ?? '')
  const [adresse, setAdresse] = useState(lieu?.adresse ?? '')
  const [couleur, setCouleur] = useState<CouleurLieu>(
    () => normaliserHex(lieu?.couleur) ?? COULEUR_DEFAUT
  )
  const [hexDraft, setHexDraft] = useState(couleur)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function choisirCouleur(hex: string) {
    setCouleur(hex)
    setHexDraft(hex)
  }
  const apercu = nuanceLieu(couleur)

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
        <div className="couleur-picker">
          <input
            type="color"
            value={couleur}
            onChange={(e) => choisirCouleur(e.target.value)}
            aria-label="Choisir une couleur"
          />
          <input
            className="couleur-hex"
            value={hexDraft}
            onChange={(e) => {
              setHexDraft(e.target.value)
              const v = normaliserHex(e.target.value)
              if (v) setCouleur(v)
            }}
            onBlur={() => setHexDraft(couleur)}
            maxLength={7}
            spellCheck={false}
          />
          <span
            className="couleur-apercu"
            style={{ background: apercu.bg, borderColor: apercu.bord, color: apercu.texte }}
          >
            Aperçu
          </span>
        </div>
        <div className="couleur-choix">
          {SUGGESTIONS_COULEUR.map((hex) => (
            <button
              type="button"
              key={hex}
              className={'couleur-pastille' + (couleur === hex ? ' is-actif' : '')}
              style={{ background: hex }}
              onClick={() => choisirCouleur(hex)}
              title={hex}
              aria-label={hex}
            />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  )
}
