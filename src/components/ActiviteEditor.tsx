import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Activite, Affectation, Lieu, Vehicule } from '../types'
import { VEHICULES } from '../lib/vehicules'
import { formatJourCourt } from '../lib/dates'
import { trouverLieu } from '../lib/lieux'
import Modal from './Modal'
import PersonnesFields from './PersonnesFields'
import {
  ligneDepuisAffectation,
  ligneVide,
  synchroniserGroupe,
  type CompteMin,
  type LigneLocale,
} from '../lib/personnes'

interface Props {
  planningId: string
  jours: string[]
  lieux: Lieu[]
  comptes: CompteMin[]
  activite?: Activite
  jourInitial?: string
  onClose: () => void
  onSaved: () => void
  /** édition seulement : gérer les bénévoles / supprimer le créneau */
  onGererBenevoles?: () => void
  onSupprimer?: () => void
}

export default function ActiviteEditor({
  planningId,
  jours,
  lieux,
  comptes,
  activite,
  jourInitial,
  onClose,
  onSaved,
  onGererBenevoles,
  onSupprimer,
}: Props) {
  const [jour, setJour] = useState(activite?.jour ?? jourInitial ?? jours[0])
  const [horaires, setHoraires] = useState(activite?.horaires ?? '')
  const [lieuDepart, setLieuDepart] = useState(activite?.lieu_depart ?? '')
  const [vehicule, setVehicule] = useState<Vehicule>(activite?.vehicule ?? 'Sans véhicule')
  const [intitule, setIntitule] = useState(activite?.intitule ?? '')
  const [places, setPlaces] = useState(activite?.places_benevoles ?? 2)
  const [notes, setNotes] = useState(activite?.notes ?? '')
  const [referents, setReferents] = useState<LigneLocale[]>([ligneVide()])
  const [referentsInit, setReferentsInit] = useState<Affectation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activite) return
    supabase
      .from('affectations')
      .select('id, activite_id, role_perso, profile_id, nom, telephone, ordre, origine, created_at')
      .eq('activite_id', activite.id)
      .eq('role_perso', 'referent')
      .order('ordre')
      .then(({ data }) => {
        const rows = (data as Affectation[]) ?? []
        setReferentsInit(rows)
        setReferents(rows.length ? rows.map(ligneDepuisAffectation) : [ligneVide()])
      })
  }, [activite])

  const adresseDepart = trouverLieu(lieuDepart, lieux)?.adresse
  const adresseDestination = trouverLieu(intitule, lieux)?.adresse

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!referents.some((r) => r.nom.trim())) {
      setError('Au moins un référent est obligatoire.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        planning_id: planningId,
        jour,
        horaires: horaires.trim() || null,
        lieu_depart: lieuDepart.trim() || null,
        vehicule,
        intitule: intitule.trim() || null,
        places_benevoles: Math.max(0, Math.min(20, Math.round(places))),
        notes: notes.trim() || null,
      }

      let activiteId = activite?.id
      if (activiteId) {
        const { error } = await supabase.from('activites').update(payload).eq('id', activiteId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('activites')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        activiteId = (data as { id: string }).id
      }

      await synchroniserGroupe(activiteId, 'referent', referents, referentsInit)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Impossible d'enregistrer : ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={activite ? 'Éditer le créneau' : 'Nouveau créneau'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <datalist id="liste-lieux">
          {lieux.map((l) => (
            <option key={l.id} value={l.nom} />
          ))}
        </datalist>

        <label>
          Jour
          <select value={jour} onChange={(e) => setJour(e.target.value)}>
            {jours.map((j) => (
              <option key={j} value={j}>
                {formatJourCourt(j)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trajet / destination
          <input
            list="liste-lieux"
            value={intitule}
            onChange={(e) => setIntitule(e.target.value)}
            placeholder="Rungis, BAPIF Saclay…"
            autoFocus
          />
        </label>
        {adresseDestination && <p className="field-hint">Adresse : {adresseDestination}</p>}
        <label>
          Horaires
          <input
            value={horaires}
            onChange={(e) => setHoraires(e.target.value)}
            placeholder="8h-11h, 11h30-14h…"
          />
        </label>
        <label>
          Lieu de départ
          <input
            list="liste-lieux"
            value={lieuDepart}
            onChange={(e) => setLieuDepart(e.target.value)}
            placeholder="Censier, BAPIF Arcueil…"
          />
        </label>
        {adresseDepart && <p className="field-hint">Adresse : {adresseDepart}</p>}
        <label>
          Véhicule
          <select value={vehicule} onChange={(e) => setVehicule(e.target.value as Vehicule)}>
            {VEHICULES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <PersonnesFields
          titre="Référent(s) — obligatoire"
          role="referent"
          comptes={comptes}
          lignes={referents}
          onChange={setReferents}
        />

        <label>
          Nombre de places bénévoles
          <input
            type="number"
            min={0}
            max={20}
            value={places}
            onChange={(e) => setPlaces(Number(e.target.value))}
          />
        </label>
        <label>
          Notes (facultatif)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>

        {activite && (onGererBenevoles || onSupprimer) && (
          <div className="modal-actions-secondaires">
            {onGererBenevoles && (
              <button type="button" className="small-button" onClick={onGererBenevoles}>
                👥 Gérer les bénévoles
              </button>
            )}
            {onSupprimer && (
              <button type="button" className="small-button" onClick={onSupprimer}>
                🗑 Supprimer le créneau
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
