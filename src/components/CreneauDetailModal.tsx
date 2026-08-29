import type { ActiviteAvecAffectations, Lieu } from '../types'
import { formatJourCourt, nomJour } from '../lib/dates'
import { adresseDepart, adresseDestination } from '../lib/lieux'
import { estBoiteManuelle } from '../lib/vehicules'
import Modal from './Modal'

type LieuMin = Pick<Lieu, 'nom' | 'adresse' | 'couleur'>

interface Props {
  activite: ActiviteAvecAffectations
  lieux: LieuMin[]
  verrouille?: boolean
  onClose: () => void
  onInscrire?: () => void
  onDesinscrire?: (affectationId: string) => void
  desinscriptiblesIds?: Set<string>
}

function Tel({ num }: { num: string | null }) {
  if (!num) return null
  return (
    <>
      {' — '}
      <a href={`tel:${num.replace(/\s/g, '')}`}>{num}</a>
    </>
  )
}

export default function CreneauDetailModal({
  activite,
  lieux,
  verrouille,
  onClose,
  onInscrire,
  onDesinscrire,
  desinscriptiblesIds,
}: Props) {
  const referents = activite.affectations
    .filter((a) => a.role_perso === 'referent')
    .sort((a, b) => a.ordre - b.ordre)
  const benevoles = activite.affectations
    .filter((a) => a.role_perso === 'benevole')
    .sort((a, b) => a.ordre - b.ordre)
  const placesLibres = Math.max(0, activite.places_benevoles - benevoles.length)

  const adrDep = adresseDepart(activite, lieux)
  const adrDest = adresseDestination(activite, lieux)

  return (
    <Modal title={activite.intitule || 'Créneau'} onClose={onClose}>
      <dl className="detail-list">
        <dt>Jour</dt>
        <dd>
          {nomJour(activite.jour)} {formatJourCourt(activite.jour)}
        </dd>

        {activite.horaires && (
          <>
            <dt>Horaires</dt>
            <dd>{activite.horaires}</dd>
          </>
        )}

        {activite.lieu_depart && (
          <>
            <dt>Départ</dt>
            <dd>
              {activite.lieu_depart}
              {adrDep && <span className="detail-adresse">{adrDep}</span>}
            </dd>
          </>
        )}

        {activite.intitule && (
          <>
            <dt>Destination</dt>
            <dd>
              {activite.intitule}
              {adrDest && <span className="detail-adresse">{adrDest}</span>}
            </dd>
          </>
        )}

        <dt>Véhicule</dt>
        <dd>
          {activite.vehicule ?? '—'}
          {estBoiteManuelle(activite.vehicule) && ' (permis manuelle)'}
        </dd>

        <dt>Référent(s)</dt>
        <dd>
          {referents.length === 0
            ? '—'
            : referents.map((r) => (
                <div key={r.id}>
                  {r.nom}
                  <Tel num={r.telephone} />
                </div>
              ))}
        </dd>

        <dt>Bénévoles</dt>
        <dd>
          {benevoles.length === 0 && placesLibres === 0 && '—'}
          {benevoles.map((b) => (
            <div key={b.id}>
              {b.nom}
              <Tel num={b.telephone} />
              {onDesinscrire && desinscriptiblesIds?.has(b.id) && (
                <button
                  className="link-button"
                  style={{ marginLeft: 6 }}
                  onClick={() => onDesinscrire(b.id)}
                >
                  ✕ me retirer
                </button>
              )}
            </div>
          ))}
          {placesLibres > 0 && (
            <div className="detail-libre">
              {placesLibres} place{placesLibres > 1 ? 's' : ''} libre
              {placesLibres > 1 ? 's' : ''} sur {activite.places_benevoles}
            </div>
          )}
        </dd>

        {activite.notes && (
          <>
            <dt>Notes</dt>
            <dd>{activite.notes}</dd>
          </>
        )}
      </dl>

      {onInscrire && !verrouille && placesLibres > 0 && (
        <button type="button" style={{ width: '100%' }} onClick={onInscrire}>
          + M'inscrire sur ce créneau
        </button>
      )}
    </Modal>
  )
}
