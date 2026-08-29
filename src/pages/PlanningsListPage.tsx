import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Planning } from '../types'
import { aujourdhuiParis, ajouterJours, libelleSemaine, lundiDeLaSemaine } from '../lib/dates'
import DupliquerModal from '../components/DupliquerModal'

export default function PlanningsListPage() {
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [dupliquer, setDupliquer] = useState<Planning | null>(null)
  const navigate = useNavigate()

  const lundiCourant = lundiDeLaSemaine(aujourdhuiParis())
  const lundiSuivant = ajouterJours(lundiCourant, 7)

  async function load() {
    setLoading(true)
    // Best-effort : archive les semaines écoulées avant d'afficher la liste.
    try {
      await supabase.rpc('archiver_semaines_ecoulees')
    } catch {
      /* pas bloquant */
    }
    const { data, error } = await supabase
      .from('plannings')
      .select('id, semaine_debut, titre, statut, token_public, verrouille, created_at')
      .eq('statut', 'actif')
      .order('semaine_debut')
    if (error) setError(error.message)
    else setPlannings((data as Planning[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function creerSemaine(lundi: string) {
    setError(null)
    setCreating(true)
    const { data, error } = await supabase
      .from('plannings')
      .insert({ semaine_debut: lundi })
      .select('id')
      .single()
    setCreating(false)
    if (error) {
      setError(`Impossible de créer la semaine : ${error.message}`)
      return
    }
    navigate(`/planning/${(data as { id: string }).id}`)
  }

  const existe = (lundi: string) => plannings.some((p) => p.semaine_debut === lundi)

  return (
    <div>
      <div className="page-header">
        <h1>Semaines de planning</h1>
        <div className="page-header-actions">
          {!existe(lundiCourant) && (
            <button disabled={creating} onClick={() => creerSemaine(lundiCourant)}>
              + Semaine courante ({libelleSemaine(lundiCourant)})
            </button>
          )}
          {!existe(lundiSuivant) && (
            <button
              className="secondary-button"
              disabled={creating}
              onClick={() => creerSemaine(lundiSuivant)}
            >
              + Semaine suivante
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="page-loading">Chargement…</p>
      ) : plannings.length === 0 ? (
        <p className="empty-state">
          Aucune semaine active. Crée la semaine courante avec le bouton ci-dessus.
        </p>
      ) : (
        <div className="card-grid">
          {plannings.map((p) => {
            const courante = p.semaine_debut === lundiCourant
            return (
              <div key={p.id} className={'planning-card' + (courante ? ' is-courante' : '')}>
                <Link to={`/planning/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3>
                    Semaine {libelleSemaine(p.semaine_debut)}
                    {courante && <span className="tag">En cours</span>}
                    {p.verrouille && <span className="tag is-verrou">Verrouillé</span>}
                  </h3>
                  {p.titre && <p className="planning-card-meta">« {p.titre} »</p>}
                </Link>
                <div className="card-actions">
                  <button className="small-button" onClick={() => setDupliquer(p)}>
                    ⧉ Dupliquer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/archives">Voir les semaines archivées →</Link>
      </p>

      {dupliquer && <DupliquerModal source={dupliquer} onClose={() => setDupliquer(null)} />}
    </div>
  )
}
