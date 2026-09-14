import type { CSSProperties } from 'react'
import type { ActiviteAvecAffectations, CouleurLieu } from '../types'
import { nuanceLieu } from '../lib/couleurs'
import { classeBadgeVehicule, vehiculeCourt } from '../lib/vehicules'

interface Props {
  activite: ActiviteAvecAffectations
  couleur: CouleurLieu
  enConflit?: boolean
  style?: CSSProperties
  /** position absolue dans le rail horaire (sinon bloc statique dans la bande « heure ? ») */
  positionne?: boolean
  /** clic sur le bloc → ouvre l'éditeur du créneau (côté gestionnaire) */
  onEditer?: () => void
  /** clic sur le bloc → ouvre le détail (lecture seule, côté public) */
  onDetail?: () => void
  /** lien public : auto-inscription / désinscription des bénévoles */
  onInscrire?: () => void
  onDesinscrire?: (affectationId: string) => void
  desinscriptiblesIds?: Set<string>
}

export default function CreneauBloc({
  activite,
  couleur,
  enConflit,
  style,
  positionne,
  onEditer,
  onDetail,
  onInscrire,
  onDesinscrire,
  desinscriptiblesIds,
}: Props) {
  const ouvrir = onEditer ?? onDetail
  const referents = activite.affectations
    .filter((a) => a.role_perso === 'referent')
    .sort((a, b) => a.ordre - b.ordre)
  const benevoles = activite.affectations
    .filter((a) => a.role_perso === 'benevole')
    .sort((a, b) => a.ordre - b.ordre)
  const placesLibres = Math.max(0, activite.places_benevoles - benevoles.length)

  const refsTxt = referents.map((r) => r.nom).join(', ')
  const bensTxt = benevoles.map((b) => b.nom).join(', ')
  const placesTxt =
    activite.places_benevoles > 0 ? `${benevoles.length}/${activite.places_benevoles}` : ''

  // Infobulle : tout le détail du créneau, sans agrandir le bloc.
  const infobulle = [
    activite.intitule || 'Créneau',
    activite.horaires && `Horaires : ${activite.horaires}`,
    activite.lieu_depart && `Départ : ${activite.lieu_depart}`,
    activite.vehicule && activite.vehicule !== 'Sans véhicule' && `Véhicule : ${activite.vehicule}`,
    refsTxt && `Référent(s) : ${refsTxt}`,
    `Bénévoles : ${bensTxt || '—'}${placesTxt ? ` (${placesTxt})` : ''}`,
    activite.notes && `Notes : ${activite.notes}`,
  ]
    .filter(Boolean)
    .join('\n')

  const nuance = nuanceLieu(couleur)

  const className =
    'sem-bloc' +
    (positionne ? ' is-positionne' : ' is-statique') +
    (enConflit ? ' is-conflit' : '') +
    (ouvrir ? ' is-editable' : '')

  const styleCouleur: CSSProperties = {
    background: nuance.bg,
    borderColor: nuance.bord,
    color: nuance.texte,
    ...style,
  }

  const contenu = (
    <>
      <div className="sem-bloc-tete">
        <span className="sem-bloc-horaire">{activite.horaires || 'Heure ?'}</span>
        {activite.vehicule && activite.vehicule !== 'Sans véhicule' && (
          <span className={'veh-badge ' + classeBadgeVehicule(activite.vehicule)}>
            {vehiculeCourt(activite.vehicule)}
          </span>
        )}
      </div>
      <div className="sem-bloc-titre">{activite.intitule || 'Créneau'}</div>
      {refsTxt && (
        <div className="sem-bloc-ligne">
          <span className="k">Réf</span> {refsTxt}
        </div>
      )}
      <div className="sem-bloc-ligne sem-bloc-qui">
        <span className="k">Bén</span> {bensTxt || '—'}
        {placesTxt && <span className="sem-bloc-compte"> ({placesTxt})</span>}
      </div>
      {activite.notes && (
        <div className="sem-bloc-ligne sem-bloc-note">
          <span className="k">Note</span> {activite.notes}
        </div>
      )}
    </>
  )

  return (
    <div className={className} style={styleCouleur} title={infobulle}>
      {ouvrir ? (
        <button type="button" className="sem-bloc-ouvrir" onClick={ouvrir}>
          {contenu}
        </button>
      ) : (
        <div className="sem-bloc-ouvrir">{contenu}</div>
      )}

      {onDesinscrire &&
        benevoles
          .filter((b) => desinscriptiblesIds?.has(b.id))
          .map((b) => (
            <button
              key={b.id}
              className="link-button sem-bloc-action"
              onClick={() => onDesinscrire(b.id)}
            >
              Retirer {b.nom}
            </button>
          ))}

      {onInscrire && placesLibres > 0 && (
        <div className="sem-bloc-actions">
          <button className="small-button" onClick={onInscrire}>
            + M'inscrire
          </button>
        </div>
      )}
    </div>
  )
}
