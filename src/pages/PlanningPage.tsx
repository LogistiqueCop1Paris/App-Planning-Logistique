import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { peutSupprimerPlanning } from '../roles'
import type {
  Activite,
  ActiviteAvecAffectations,
  Affectation,
  LigneHistorique,
  Lieu,
  Planning,
} from '../types'
import { aujourdhuiParis, joursDeLaSemaine, libelleSemaine } from '../lib/dates'
import { activitesEnConflit, detecterConflitsVehicule } from '../lib/conflitsVehicule'
import Semainier from '../components/Semainier'
import ActiviteEditor from '../components/ActiviteEditor'
import AffectationsEditor from '../components/AffectationsEditor'
import type { CompteMin } from '../lib/personnes'
import LienPublicModal from '../components/LienPublicModal'
import { lienPublic } from '../lib/lienPublic'
import DupliquerModal from '../components/DupliquerModal'
import RenommerSemaineModal from '../components/RenommerSemaineModal'
import logo from '../assets/logo.png'

type ActiviteRow = Activite & { affectations: Affectation[] | null }

export default function PlanningPage() {
  const { planningId } = useParams<{ planningId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [planning, setPlanning] = useState<Planning | null>(null)
  const [activites, setActivites] = useState<ActiviteAvecAffectations[]>([])
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [comptes, setComptes] = useState<CompteMin[]>([])
  const [historique, setHistorique] = useState<LigneHistorique[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editeur, setEditeur] = useState<{ activite?: Activite; jour?: string } | null>(null)
  const [personnesDe, setPersonnesDe] = useState<string | null>(null)
  const [lienOuvert, setLienOuvert] = useState(false)
  const [dupliquer, setDupliquer] = useState(false)
  const [renommer, setRenommer] = useState(false)
  const [largeurCol, setLargeurColState] = useState(
    () => Number(localStorage.getItem('planning-largeur-col')) || 150
  )
  function setLargeurCol(v: number) {
    const clamp = Math.max(120, Math.min(320, v))
    setLargeurColState(clamp)
    localStorage.setItem('planning-largeur-col', String(clamp))
  }

  const load = useCallback(async () => {
    if (!planningId) return
    setLoading(true)
    const { data: p, error: pErr } = await supabase
      .from('plannings')
      .select('id, semaine_debut, titre, statut, token_public, verrouille, created_at')
      .eq('id', planningId)
      .single()
    if (pErr || !p) {
      setError('Planning introuvable.')
      setLoading(false)
      return
    }
    setPlanning(p as Planning)

    const { data: acts } = await supabase
      .from('activites')
      .select(
        'id, planning_id, jour, ordre, horaires, lieu_depart, vehicule, intitule, notes, places_benevoles, created_at, affectations(id, activite_id, role_perso, profile_id, nom, telephone, ordre, origine, created_at)'
      )
      .eq('planning_id', planningId)
      .order('jour')
      .order('ordre')
    setActivites(
      ((acts as ActiviteRow[]) ?? []).map((a) => ({ ...a, affectations: a.affectations ?? [] }))
    )

    const { data: hist } = await supabase
      .from('historique')
      .select('id, planning_id, date_heure, utilisateur_nom, action, details')
      .eq('planning_id', planningId)
      .order('date_heure', { ascending: false })
      .limit(100)
    setHistorique((hist as LigneHistorique[]) ?? [])

    const [{ data: lx }, { data: cpt }] = await Promise.all([
      supabase.from('lieux').select('id, nom, adresse, couleur, created_at').order('nom'),
      supabase.from('profiles').select('id, nom, prenom, telephone').order('nom'),
    ])
    setLieux((lx as Lieu[]) ?? [])
    setComptes((cpt as CompteMin[]) ?? [])

    setLoading(false)
  }, [planningId])

  useEffect(() => {
    load()
  }, [load])

  const conflits = useMemo(() => detecterConflitsVehicule(activites), [activites])
  const conflitIds = useMemo(() => activitesEnConflit(conflits), [conflits])

  if (loading) return <p className="page-loading">Chargement…</p>
  if (error || !planning) return <p className="empty-state">{error ?? 'Planning introuvable.'}</p>

  const jours = joursDeLaSemaine(planning.semaine_debut)
  const aujourdhui = aujourdhuiParis()
  const archive = planning.statut === 'archive'

  async function supprimerActivite(id: string) {
    if (!window.confirm('Supprimer ce créneau et ses affectations ?')) return
    const { data, error } = await supabase.from('activites').delete().eq('id', id).select('id')
    if (error) setError(`Suppression impossible : ${error.message}`)
    else if (!data || data.length === 0)
      setError("Le créneau n'a pas été supprimé (droits insuffisants ou schéma SQL à mettre à jour).")
    else load()
  }

  async function exporterPdf() {
    if (!planning) return
    setBusy(true)
    try {
      const { exporterUneSemaine } = await import('../lib/exportPdf')
      await exporterUneSemaine(planning, activites, lieux, {
        qrUrl: archive ? undefined : lienPublic(planning.token_public),
      })
    } catch (err) {
      setError(`Export impossible : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function majPlanning(patch: Partial<Planning>) {
    if (!planning) return
    setBusy(true)
    const { error } = await supabase.from('plannings').update(patch).eq('id', planning.id)
    setBusy(false)
    if (error) setError(error.message)
    else load()
  }

  async function supprimerPlanning() {
    if (!planning) return
    if (
      !window.confirm(
        `Supprimer DÉFINITIVEMENT la semaine ${libelleSemaine(planning.semaine_debut)} ? Cette action est irréversible.`
      )
    )
      return
    // On demande les lignes réellement supprimées : si RLS refuse (compte non
    // admin, ou schéma SQL pas à jour), delete() ne renvoie pas d'erreur mais
    // n'affecte aucune ligne — il faut le détecter sinon la semaine « revient ».
    const { data, error } = await supabase
      .from('plannings')
      .delete()
      .eq('id', planning.id)
      .select('id')
    if (error) {
      setError(`Suppression impossible : ${error.message}`)
      return
    }
    if (!data || data.length === 0) {
      setError(
        "La semaine n'a pas été supprimée : action réservée aux comptes admin (vérifie aussi que le schéma SQL est à jour)."
      )
      return
    }
    navigate('/')
  }

  return (
    <div>
      <Link to={archive ? '/archives' : '/'} className="back-link">
        ← {archive ? 'Archives' : 'Semaines'}
      </Link>

      <div className="page-header">
        <h1>
          Semaine {libelleSemaine(planning.semaine_debut)}
          {planning.titre && <span className="surnom">« {planning.titre} »</span>}
          {!archive && (
            <button
              className="rename-button"
              onClick={() => setRenommer(true)}
              title="Surnom de la semaine"
            >
              ✎ surnom
            </button>
          )}
          {archive && <span className="tag is-archive">Archivée</span>}
          {planning.verrouille && <span className="tag is-verrou">Verrouillé</span>}
        </h1>
        <div className="page-header-actions">
          <span className="col-stepper">
            Colonnes
            <button
              className="small-button"
              onClick={() => setLargeurCol(largeurCol - 20)}
              aria-label="Colonnes plus étroites"
            >
              −
            </button>
            <button
              className="small-button"
              onClick={() => setLargeurCol(largeurCol + 20)}
              aria-label="Colonnes plus larges"
            >
              +
            </button>
          </span>
          <button className="small-button" disabled={busy} onClick={exporterPdf}>
            🖨 Exporter en PDF
          </button>
          <button className="small-button" onClick={() => setLienOuvert(true)}>
            🔗 Lien public
          </button>
          <button className="small-button" onClick={() => setDupliquer(true)}>
            ⧉ Dupliquer
          </button>
          {!archive && (
            <button
              className="small-button"
              disabled={busy}
              onClick={() => majPlanning({ verrouille: !planning.verrouille })}
            >
              {planning.verrouille ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
            </button>
          )}
          <button
            className="small-button"
            disabled={busy}
            onClick={() => majPlanning({ statut: archive ? 'actif' : 'archive' })}
          >
            {archive ? '↩ Réactiver' : '📦 Archiver'}
          </button>
          {peutSupprimerPlanning(profile?.role) && (
            <button className="small-button" onClick={supprimerPlanning}>
              🗑 Supprimer
            </button>
          )}
        </div>
      </div>

      {/* En-tête affiché uniquement à l'impression */}
      <div className="print-only">
        <div className="print-head-row">
          <div>
            <img src={logo} alt="CO-P1" style={{ height: 28 }} />
            <div className="print-title">
              Planning — semaine {libelleSemaine(planning.semaine_debut)}
              {planning.titre && ` — « ${planning.titre} »`}
            </div>
          </div>
          <QRCodeSVG value={lienPublic(planning.token_public)} size={72} />
        </div>
      </div>

      {conflits.length > 0 && (
        <div className="banner is-warn">
          ⚠ {conflits.length} conflit{conflits.length > 1 ? 's' : ''} de véhicule cette semaine :
          <ul>
            {conflits.map((c, i) => (
              <li key={i}>
                <strong>{c.vehicule}</strong> — {c.a.intitule || 'créneau'} ({c.a.horaires || '?'}) et{' '}
                {c.b.intitule || 'créneau'} ({c.b.horaires || '?'})
              </li>
            ))}
          </ul>
        </div>
      )}

      {archive && (
        <div className="banner is-info">
          Cette semaine est <strong>archivée</strong> : lecture seule. Elle reste consultable et
          ré-exportable. Clique sur <strong>« ↩ Réactiver »</strong> pour pouvoir la modifier.
        </div>
      )}

      <Semainier
        jours={jours}
        aujourdhui={aujourdhui}
        lieux={lieux}
        activites={activites}
        conflitIds={conflitIds}
        largeurColonne={largeurCol}
        actionsPour={
          archive ? undefined : (a) => ({ onEditer: () => setEditeur({ activite: a }) })
        }
        actionJour={
          archive
            ? undefined
            : (jour) => (
                <button className="small-button" onClick={() => setEditeur({ jour })}>
                  + Créneau
                </button>
              )
        }
      />

      <details className="historique" open={historique.length > 0 && historique.length <= 8}>
        <summary>Historique des modifications ({historique.length})</summary>
        {historique.length === 0 ? (
          <p className="empty-state">Aucune modification enregistrée pour l'instant.</p>
        ) : (
          <ul className="historique-list">
            {historique.map((h) => (
              <li key={h.id}>
                <span className="quand">
                  {new Date(h.date_heure).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                <span className="qui">{h.utilisateur_nom ?? '—'}</span>
                <span>
                  {h.action}
                  {h.details ? ` — ${h.details}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {editeur && (
        <ActiviteEditor
          planningId={planning.id}
          jours={jours}
          lieux={lieux}
          comptes={comptes}
          activite={editeur.activite}
          jourInitial={editeur.jour}
          onClose={() => setEditeur(null)}
          onSaved={() => {
            setEditeur(null)
            load()
          }}
          onGererBenevoles={
            editeur.activite
              ? () => {
                  const id = editeur.activite!.id
                  setEditeur(null)
                  setPersonnesDe(id)
                }
              : undefined
          }
          onSupprimer={
            editeur.activite
              ? () => {
                  const id = editeur.activite!.id
                  setEditeur(null)
                  supprimerActivite(id)
                }
              : undefined
          }
        />
      )}

      {personnesDe && (
        <AffectationsEditor
          activiteId={personnesDe}
          onClose={() => setPersonnesDe(null)}
          onSaved={() => {
            setPersonnesDe(null)
            load()
          }}
        />
      )}

      {lienOuvert && (
        <LienPublicModal token={planning.token_public} onClose={() => setLienOuvert(false)} />
      )}

      {dupliquer && <DupliquerModal source={planning} onClose={() => setDupliquer(false)} />}

      {renommer && (
        <RenommerSemaineModal
          planning={planning}
          onClose={() => setRenommer(false)}
          onSaved={() => {
            setRenommer(false)
            load()
          }}
        />
      )}
    </div>
  )
}
