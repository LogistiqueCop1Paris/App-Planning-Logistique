import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Affectation } from '../types'
import Modal from './Modal'
import PersonnesFields from './PersonnesFields'
import { ligneDepuisAffectation, synchroniserGroupe, type LigneLocale } from '../lib/personnes'

interface Props {
  activiteId: string
  onClose: () => void
  onSaved: () => void
}

/** Gestion des BÉNÉVOLES d'un créneau (les référents se saisissent dans l'éditeur de créneau). */
export default function AffectationsEditor({ activiteId, onClose, onSaved }: Props) {
  const [lignes, setLignes] = useState<LigneLocale[]>([])
  const [initiales, setInitiales] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('affectations')
        .select('id, activite_id, role_perso, profile_id, nom, telephone, ordre, origine, created_at')
        .eq('activite_id', activiteId)
        .eq('role_perso', 'benevole')
        .order('ordre')
      const rows = (data as Affectation[]) ?? []
      setInitiales(rows)
      setLignes(rows.map(ligneDepuisAffectation))
      setLoading(false)
    }
    load()
  }, [activiteId])

  async function enregistrer() {
    setError(null)
    setSaving(true)
    try {
      await synchroniserGroupe(activiteId, 'benevole', lignes, initiales)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Impossible d'enregistrer : ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Bénévoles du créneau" onClose={onClose}>
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <>
          <PersonnesFields
            titre="Bénévoles"
            role="benevole"
            comptes={[]}
            lignes={lignes}
            onChange={setLignes}
            hint="Les bénévoles peuvent aussi s'inscrire seuls via le lien public."
          />
          {error && <p className="error">{error}</p>}
          <button type="button" onClick={enregistrer} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      )}
    </Modal>
  )
}
