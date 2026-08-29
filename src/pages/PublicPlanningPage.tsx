import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { ActiviteAvecAffectations, PlanningPublic } from '../types'
import { aujourdhuiParis, joursDeLaSemaine, libelleSemaine } from '../lib/dates'
import Semainier from '../components/Semainier'
import SemainierListe from '../components/SemainierListe'
import CreneauDetailModal from '../components/CreneauDetailModal'
import BenevoleSignupModal from '../components/BenevoleSignupModal'
import logo from '../assets/logo.png'

function cleStockage(token: string) {
  return `planning-benevole-${token}`
}
function lireMesInscriptions(token: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(cleStockage(token)) || '[]')
  } catch {
    return []
  }
}
function ecrireMesInscriptions(token: string, ids: string[]) {
  localStorage.setItem(cleStockage(token), JSON.stringify(ids))
}

export default function PublicPlanningPage() {
  const { token } = useParams<{ token?: string }>()
  const [data, setData] = useState<PlanningPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [statut, setStatut] = useState<'ok' | 'introuvable' | 'pas-de-semaine'>('ok')
  const [mesIds, setMesIds] = useState<string[]>([])
  const [detailActivite, setDetailActivite] = useState<ActiviteAvecAffectations | null>(null)
  const [inscriptionActivite, setInscriptionActivite] = useState<ActiviteAvecAffectations | null>(null)

  // Vue : choix mémorisé ; sinon liste sur petit écran (usage mobile), grille sinon.
  const [vue, setVueState] = useState<'grille' | 'liste'>(() => {
    const stocke = localStorage.getItem('planning-vue-public')
    if (stocke === 'grille' || stocke === 'liste') return stocke
    return typeof window !== 'undefined' && window.innerWidth < 760 ? 'liste' : 'grille'
  })
  function setVue(v: 'grille' | 'liste') {
    setVueState(v)
    localStorage.setItem('planning-vue-public', v)
  }
  const [largeurCol, setLargeurColState] = useState(
    () => Number(localStorage.getItem('planning-largeur-col')) || 150
  )
  function setLargeurCol(v: number) {
    const c = Math.max(120, Math.min(320, v))
    setLargeurColState(c)
    localStorage.setItem('planning-largeur-col', String(c))
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: res, error } = token
      ? await supabase.rpc('planning_public', { p_token: token })
      : await supabase.rpc('planning_public_courant')
    if (error || !res) {
      setStatut(token ? 'introuvable' : 'pas-de-semaine')
      setData(null)
      setLoading(false)
      return
    }
    const planningPublic = res as PlanningPublic
    setData(planningPublic)
    setStatut('ok')
    setMesIds(lireMesInscriptions(planningPublic.planning.token_public))
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const mesIdsSet = useMemo(() => new Set(mesIds), [mesIds])

  if (loading) return <p className="page-loading">Chargement…</p>
  if (statut !== 'ok' || !data) {
    return (
      <div className="public-page">
        <div className="public-head">
          <img src={logo} alt="Solidarités Étudiantes CO-P1" />
          <h1>Planning</h1>
        </div>
        <p className="empty-state">
          {statut === 'pas-de-semaine'
            ? "Le planning de la semaine en cours n'est pas encore publié. Reviens un peu plus tard."
            : "Ce planning est introuvable ou le lien n'est plus valide."}
        </p>
      </div>
    )
  }

  const { planning, activites } = data
  const lieux = data.lieux ?? []
  const jeton = planning.token_public
  const jours = joursDeLaSemaine(planning.semaine_debut)
  const aujourdhui = aujourdhuiParis()
  const verrouille = planning.verrouille || planning.statut === 'archive'

  async function desinscrire(affectationId: string) {
    const { error } = await supabase.rpc('desinscrire_benevole', {
      p_token: jeton,
      p_affectation_id: affectationId,
    })
    if (!error) {
      const restants = mesIds.filter((id) => id !== affectationId)
      setMesIds(restants)
      ecrireMesInscriptions(jeton, restants)
      setDetailActivite(null)
      load()
    }
  }

  const actionsPour = (a: ActiviteAvecAffectations) => ({
    onDetail: () => setDetailActivite(a),
    onInscrire: verrouille ? undefined : () => setInscriptionActivite(a),
    onDesinscrire: desinscrire,
    desinscriptiblesIds: mesIdsSet,
  })

  return (
    <div className="public-page">
      <div className="public-head">
        <img src={logo} alt="Solidarités Étudiantes CO-P1" />
        <div>
          <h1>
            Planning {libelleSemaine(planning.semaine_debut)}
            {planning.titre && <span className="surnom">« {planning.titre} »</span>}
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            {verrouille
              ? 'Inscriptions fermées pour cette semaine — consultation seule.'
              : "Touche un créneau pour voir le détail et t'inscrire."}
          </p>
        </div>
      </div>

      <div className="week-toolbar">
        <div className="vue-toggle" role="group" aria-label="Affichage">
          <button
            className={'small-button' + (vue === 'liste' ? ' is-actif' : '')}
            onClick={() => setVue('liste')}
          >
            ☰ Liste
          </button>
          <button
            className={'small-button' + (vue === 'grille' ? ' is-actif' : '')}
            onClick={() => setVue('grille')}
          >
            ▦ Grille
          </button>
        </div>
        {vue === 'grille' && (
          <span className="col-stepper">
            Colonnes
            <button className="small-button" onClick={() => setLargeurCol(largeurCol - 20)} aria-label="Colonnes plus étroites">
              −
            </button>
            <button className="small-button" onClick={() => setLargeurCol(largeurCol + 20)} aria-label="Colonnes plus larges">
              +
            </button>
          </span>
        )}
      </div>

      {vue === 'liste' ? (
        <SemainierListe
          jours={jours}
          aujourdhui={aujourdhui}
          lieux={lieux}
          activites={activites}
          actionsPour={actionsPour}
        />
      ) : (
        <Semainier
          jours={jours}
          aujourdhui={aujourdhui}
          lieux={lieux}
          activites={activites}
          largeurColonne={largeurCol}
          actionsPour={actionsPour}
        />
      )}

      {detailActivite && (
        <CreneauDetailModal
          activite={detailActivite}
          lieux={lieux}
          verrouille={verrouille}
          onClose={() => setDetailActivite(null)}
          onInscrire={() => {
            const a = detailActivite
            setDetailActivite(null)
            setInscriptionActivite(a)
          }}
          onDesinscrire={desinscrire}
          desinscriptiblesIds={mesIdsSet}
        />
      )}

      {inscriptionActivite && (
        <BenevoleSignupModal
          token={jeton}
          activiteId={inscriptionActivite.id}
          activiteLabel={`${inscriptionActivite.intitule || 'Créneau'} — ${inscriptionActivite.horaires || ''}`}
          onClose={() => setInscriptionActivite(null)}
          onDone={(nouvelId) => {
            const maj = [...mesIds, nouvelId]
            setMesIds(maj)
            ecrireMesInscriptions(jeton, maj)
            setInscriptionActivite(null)
            load()
          }}
        />
      )}
    </div>
  )
}
