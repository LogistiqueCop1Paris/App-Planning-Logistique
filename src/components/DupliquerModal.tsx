import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Planning } from '../types'
import { ajouterJours, libelleSemaine, lundiDeLaSemaine } from '../lib/dates'
import Modal from './Modal'

interface Props {
  source: Planning
  onClose: () => void
}

export default function DupliquerModal({ source, onClose }: Props) {
  const [prises, setPrises] = useState<Set<string>>(new Set())
  const [cible, setCible] = useState(() => ajouterJours(source.semaine_debut, 7))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const lundiCible = lundiDeLaSemaine(cible)
  const dejaPrise = prises.has(lundiCible)

  // Charge les semaines déjà existantes puis propose la 1re semaine libre après la source.
  useEffect(() => {
    supabase
      .from('plannings')
      .select('semaine_debut')
      .then(({ data }) => {
        const set = new Set((data ?? []).map((p: { semaine_debut: string }) => p.semaine_debut))
        setPrises(set)
        let lundi = ajouterJours(source.semaine_debut, 7)
        for (let i = 0; i < 60 && set.has(lundi); i++) lundi = ajouterJours(lundi, 7)
        setCible(lundi)
      })
  }, [source.semaine_debut])

  const listeLibres = useMemo(() => {
    const out: string[] = []
    let lundi = ajouterJours(source.semaine_debut, 7)
    for (let i = 0; i < 16 && out.length < 8; i++) {
      if (!prises.has(lundi)) out.push(lundi)
      lundi = ajouterJours(lundi, 7)
    }
    return out
  }, [source.semaine_debut, prises])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (dejaPrise) {
      setError('Une semaine existe déjà pour cette date — choisis une autre semaine cible.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.rpc('dupliquer_planning', {
      p_source_id: source.id,
      p_semaine_debut: lundiCible,
    })
    setSaving(false)
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('duplicate') || m.includes('unique')) {
        setError('Une semaine existe déjà pour cette date — choisis une autre semaine cible.')
      } else {
        setError(`Impossible de dupliquer. Détail exact à transmettre : ${error.message}`)
      }
      return
    }
    if (!data) {
      setError('Duplication refusée : vérifie que tu es connecté (et que le schéma SQL est à jour).')
      return
    }
    navigate(`/planning/${data as string}`)
  }

  return (
    <Modal title="Dupliquer cette semaine" onClose={onClose}>
      <p className="modal-subtitle">
        Copie tous les créneaux et les référents de la semaine {libelleSemaine(source.semaine_debut)}.
        Les bénévoles ne sont pas copiés.
      </p>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Semaine cible (une date, ramenée au lundi)
          <input type="date" value={cible} onChange={(e) => setCible(e.target.value)} required />
        </label>

        {listeLibres.length > 0 && (
          <div className="dupli-suggestions">
            {listeLibres.map((l) => (
              <button
                key={l}
                type="button"
                className={'small-button' + (l === lundiCible ? ' is-actif' : '')}
                onClick={() => setCible(l)}
              >
                {libelleSemaine(l)}
              </button>
            ))}
          </div>
        )}

        <p className={'field-hint' + (dejaPrise ? ' is-warn' : '')}>
          {dejaPrise
            ? `⚠ Une semaine existe déjà : ${libelleSemaine(lundiCible)}`
            : `Nouvelle semaine : ${libelleSemaine(lundiCible)}`}
        </p>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving || dejaPrise}>
          {saving ? 'Duplication…' : 'Dupliquer'}
        </button>
      </form>
    </Modal>
  )
}
