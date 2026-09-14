import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Lieu } from '../types'
import { nuanceLieu } from '../lib/couleurs'
import LieuModal from '../components/LieuModal'

export default function LieuxPage() {
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ lieu?: Lieu } | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('lieux')
      .select('id, nom, adresse, couleur, created_at')
      .order('nom')
    if (error) setError(error.message)
    else setLieux((data as Lieu[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function supprimer(l: Lieu) {
    if (!window.confirm(`Supprimer le lieu « ${l.nom} » ? Les créneaux qui l'utilisent ne seront plus colorés.`))
      return
    const { error } = await supabase.from('lieux').delete().eq('id', l.id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lieux enregistrés</h1>
        <div className="page-header-actions">
          <button onClick={() => setModal({})}>+ Nouveau lieu</button>
        </div>
      </div>

      <p className="subtitle">
        Chaque lieu porte une <strong>adresse</strong> (proposée à la saisie d'un créneau) et une
        <strong> couleur</strong> (fond des créneaux dont le trajet ou le départ correspond
        exactement à ce nom).
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="page-loading">Chargement…</p>
      ) : lieux.length === 0 ? (
        <p className="empty-state">Aucun lieu enregistré.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Couleur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lieux.map((l) => {
                const c = nuanceLieu(l.couleur)
                return (
                  <tr key={l.id}>
                    <td>{l.nom}</td>
                    <td>{l.adresse ?? '—'}</td>
                    <td>
                      <span className="couleur-badge">
                        <span className="couleur-pastille" style={{ background: c.bord }} />
                        <code>{c.bord}</code>
                      </span>
                    </td>
                    <td className="row-actions">
                      <button className="small-button" onClick={() => setModal({ lieu: l })}>
                        ✎ Éditer
                      </button>
                      <button className="small-button" onClick={() => supprimer(l)}>
                        🗑 Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LieuModal
          lieu={modal.lieu}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}
