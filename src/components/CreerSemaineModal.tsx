import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ajouterJours, aujourdhuiParis, libelleSemaine, lundiDeLaSemaine } from '../lib/dates'
import Modal from './Modal'

interface Props {
  onClose: () => void
}

/** Quelques raccourcis pratiques en plus du champ date libre. */
const RACCOURCIS = [
  { label: '+ 1 mois', jours: 30 },
  { label: '+ 2 mois', jours: 60 },
  { label: '+ 3 mois', jours: 90 },
  { label: '+ 6 mois', jours: 180 },
]

export default function CreerSemaineModal({ onClose }: Props) {
  const [prises, setPrises] = useState<Set<string>>(new Set())
  const [cible, setCible] = useState(() => ajouterJours(lundiDeLaSemaine(aujourdhuiParis()), 14))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('plannings')
      .select('semaine_debut')
      .then(({ data }) => {
        setPrises(new Set((data ?? []).map((p: { semaine_debut: string }) => p.semaine_debut)))
      })
  }, [])

  const lundiCible = useMemo(() => lundiDeLaSemaine(cible), [cible])
  const dejaPrise = prises.has(lundiCible)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (dejaPrise) {
      setError('Une semaine existe déjà pour cette date — choisis une autre date.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('plannings')
      .insert({ semaine_debut: lundiCible })
      .select('id')
      .single()
    setSaving(false)
    if (error) {
      setError(`Impossible de créer la semaine : ${error.message}`)
      return
    }
    navigate(`/planning/${(data as { id: string }).id}`)
  }

  return (
    <Modal title="Créer une semaine" onClose={onClose}>
      <p className="modal-subtitle">
        Choisis n'importe quelle date — la semaine du lundi correspondant sera créée, même
        très loin dans le futur ou le passé.
      </p>
      <form onSubmit={handleSubmit} className="modal-form">
        <label>
          Date (ramenée au lundi de sa semaine)
          <input type="date" value={cible} onChange={(e) => setCible(e.target.value)} required />
        </label>

        <div className="dupli-suggestions">
          {RACCOURCIS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="small-button"
              onClick={() => setCible(ajouterJours(aujourdhuiParis(), r.jours))}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className={'field-hint' + (dejaPrise ? ' is-warn' : '')}>
          {dejaPrise
            ? `⚠ Une semaine existe déjà : ${libelleSemaine(lundiCible)}`
            : `Nouvelle semaine : ${libelleSemaine(lundiCible)}`}
        </p>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving || dejaPrise}>
          {saving ? 'Création…' : 'Créer la semaine'}
        </button>
      </form>
    </Modal>
  )
}
