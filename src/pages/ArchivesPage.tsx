import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Activite, ActiviteAvecAffectations, Affectation, Lieu, Planning } from '../types'
import { libelleSemaine } from '../lib/dates'

type ActiviteRow = Activite & { affectations: Affectation[] | null }

export default function ArchivesPage() {
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [exportEnCours, setExportEnCours] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('plannings')
        .select('id, semaine_debut, titre, statut, token_public, verrouille, created_at')
        .eq('statut', 'archive')
        .order('semaine_debut', { ascending: false })
      if (error) setError(error.message)
      else setPlannings((data as Planning[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const toutSelectionne = useMemo(
    () => plannings.length > 0 && selection.size === plannings.length,
    [plannings, selection]
  )

  function toggle(id: string) {
    setSelection((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleTout() {
    setSelection(toutSelectionne ? new Set() : new Set(plannings.map((p) => p.id)))
  }

  async function exporter() {
    setError(null)
    setExportEnCours(true)
    try {
      const ids = plannings.filter((p) => selection.has(p.id)).map((p) => p.id)

      const [{ data: acts }, { data: lx }] = await Promise.all([
        supabase
          .from('activites')
          .select(
            'id, planning_id, jour, ordre, horaires, lieu_depart, vehicule, intitule, notes, places_benevoles, created_at, affectations(id, activite_id, role_perso, profile_id, nom, telephone, ordre, origine, created_at)'
          )
          .in('planning_id', ids)
          .order('jour')
          .order('ordre'),
        supabase.from('lieux').select('nom, adresse, couleur'),
      ])

      const parPlanning = new Map<string, ActiviteAvecAffectations[]>()
      for (const raw of (acts as ActiviteRow[]) ?? []) {
        const a: ActiviteAvecAffectations = { ...raw, affectations: raw.affectations ?? [] }
        const liste = parPlanning.get(a.planning_id) ?? []
        liste.push(a)
        parPlanning.set(a.planning_id, liste)
      }

      const items = plannings
        .filter((p) => selection.has(p.id))
        .map((p) => ({ planning: p, activites: parPlanning.get(p.id) ?? [] }))

      const { exporterSemainesZip } = await import('../lib/exportPdf')
      await exporterSemainesZip(items, (lx as Lieu[]) ?? [])
    } catch (err) {
      setError(`Export impossible : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExportEnCours(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Semaines archivées</h1>
        {plannings.length > 0 && (
          <div className="page-header-actions">
            <button className="small-button" onClick={toggleTout}>
              {toutSelectionne ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <button
              onClick={exporter}
              disabled={selection.size === 0 || exportEnCours}
            >
              {exportEnCours
                ? 'Export…'
                : `⬇ Exporter la sélection (${selection.size})`}
            </button>
          </div>
        )}
      </div>

      <p className="subtitle">
        Sélectionne une ou plusieurs semaines : l'export crée <strong>un PDF par semaine</strong>
        {' '}(regroupés dans un fichier <code>.zip</code> à partir de deux semaines).
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="page-loading">Chargement…</p>
      ) : plannings.length === 0 ? (
        <p className="empty-state">Aucune semaine archivée.</p>
      ) : (
        <div className="card-grid">
          {plannings.map((p) => (
            <div
              key={p.id}
              className={'planning-card' + (selection.has(p.id) ? ' is-courante' : '')}
            >
              <label className="archive-check">
                <input
                  type="checkbox"
                  checked={selection.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                à exporter
              </label>
              <Link
                to={`/planning/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3>
                  Semaine {libelleSemaine(p.semaine_debut)}
                  <span className="tag is-archive">Archivée</span>
                </h3>
                {p.titre && <p className="planning-card-meta">« {p.titre} »</p>}
              </Link>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/">← Semaines actives</Link>
      </p>
    </div>
  )
}
