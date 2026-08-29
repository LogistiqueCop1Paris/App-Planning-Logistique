import { useMemo } from 'react'
import type { ActiviteAvecAffectations, Lieu } from '../types'
import { formatJourCourt, nomJour } from '../lib/dates'
import { couleurActivite } from '../lib/lieux'
import { calculerSemainier, placerJour } from '../lib/semainier'
import CreneauBloc from './CreneauBloc'

type LieuMin = Pick<Lieu, 'nom' | 'adresse' | 'couleur'>

export interface BlocActions {
  onEditer?: () => void
  onDetail?: () => void
  onInscrire?: () => void
  onDesinscrire?: (affectationId: string) => void
  desinscriptiblesIds?: Set<string>
}

interface Props {
  jours: string[]
  aujourdhui: string
  lieux: LieuMin[]
  activites: ActiviteAvecAffectations[]
  conflitIds?: Set<string>
  actionsPour?: (a: ActiviteAvecAffectations) => BlocActions
  /** contenu ajouté en HAUT de chaque colonne-jour (ex. bouton « + Créneau ») */
  actionJour?: (jour: string) => React.ReactNode
  /** largeur mini d'une colonne-jour en px (défaut 150) */
  largeurColonne?: number
}

const LARGEUR_RAIL = 48

export default function Semainier({
  jours,
  aujourdhui,
  lieux = [],
  activites = [],
  conflitIds,
  actionsPour,
  actionJour,
  largeurColonne = 150,
}: Props) {
  const { h0, h1, heures, timedParJour, sansHeureParJour, aSansHeure } = useMemo(
    () => calculerSemainier(jours, activites),
    [jours, activites]
  )

  const totalMin = (h1 - h0) * 60
  const hauteurRail = `calc(var(--sem-row-h) * ${h1 - h0})`

  return (
    <div className="semainier">
      <div
        className="sem-grid"
        style={{
          gridTemplateColumns: `${LARGEUR_RAIL}px repeat(7, minmax(${largeurColonne}px, 1fr))`,
          minWidth: LARGEUR_RAIL + 7 * largeurColonne,
        }}
      >
        <div className="sem-corner" />
        {jours.map((j) => (
          <div key={j} className={'sem-dayhead' + (j === aujourdhui ? ' is-today' : '')}>
            <span className="sem-dayhead-nom">{nomJour(j)}</span>
            <span className="sem-dayhead-date">{formatJourCourt(j)}</span>
          </div>
        ))}

        {aSansHeure && (
          <>
            <div className="sem-rowlabel">heure&nbsp;?</div>
            {jours.map((j) => (
              <div key={j} className="sem-sansheure">
                {sansHeureParJour[j].map((a) => (
                  <CreneauBloc
                    key={a.id}
                    activite={a}
                    couleur={couleurActivite(a, lieux)}
                    enConflit={conflitIds?.has(a.id)}
                    {...(actionsPour ? actionsPour(a) : {})}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        <div className="sem-hourrail" style={{ height: hauteurRail }}>
          {heures.map((h) => (
            <div key={h} className="sem-hourline">
              {h}h
            </div>
          ))}
        </div>

        {jours.map((j) => (
          <div key={j} className={'sem-daycol' + (j === aujourdhui ? ' is-today' : '')}>
            {actionJour && <div className="sem-daycol-tete">{actionJour(j)}</div>}
            <div className="sem-rail" style={{ height: hauteurRail }}>
              {placerJour(timedParJour[j]).map(({ a, debut, fin, col, ncol }) => {
                const top = ((debut - h0 * 60) / totalMin) * 100
                const height = ((fin - debut) / totalMin) * 100
                return (
                  <CreneauBloc
                    key={a.id}
                    activite={a}
                    couleur={couleurActivite(a, lieux)}
                    enConflit={conflitIds?.has(a.id)}
                    positionne
                    style={{
                      top: `${Math.max(0, top)}%`,
                      height: `${height}%`,
                      left: `calc(${(col / ncol) * 100}% + 2px)`,
                      width: `calc(${100 / ncol}% - 4px)`,
                    }}
                    {...(actionsPour ? actionsPour(a) : {})}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
