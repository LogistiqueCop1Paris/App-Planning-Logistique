import { useMemo } from 'react'
import type { ActiviteAvecAffectations, Lieu } from '../types'
import { formatJourCourt, nomJour } from '../lib/dates'
import { couleurActivite } from '../lib/lieux'
import { calculerSemainier, placerJour } from '../lib/semainier'
import type { BlocActions } from './Semainier'
import CreneauBloc from './CreneauBloc'

type LieuMin = Pick<Lieu, 'nom' | 'adresse' | 'couleur'>

interface Props {
  jours: string[]
  aujourdhui: string
  lieux: LieuMin[]
  activites: ActiviteAvecAffectations[]
  conflitIds?: Set<string>
  actionsPour?: (a: ActiviteAvecAffectations) => BlocActions
  /** contenu ajouté sous l'en-tête de chaque jour (ex. bouton « + Créneau ») */
  actionJour?: (jour: string) => React.ReactNode
}

/**
 * Grille verticale : un mini-semainier (rail d'heures + une colonne) par jour,
 * empilés les uns sous les autres. Contrairement à la grille classique (7 jours
 * côte à côte, illisible sur téléphone), l'axe horaire reste vertical mais chaque
 * jour a toute la largeur de l'écran — donc les blocs restent lisibles en portrait.
 */
export default function SemainierVertical({
  jours,
  aujourdhui,
  lieux = [],
  activites = [],
  conflitIds,
  actionsPour,
  actionJour,
}: Props) {
  const { h0, h1, heures, timedParJour, sansHeureParJour } = useMemo(
    () => calculerSemainier(jours, activites),
    [jours, activites]
  )
  const totalMin = (h1 - h0) * 60
  const hauteurRail = `calc(var(--semv-row-h) * ${h1 - h0})`

  return (
    <div className="semv">
      {jours.map((j) => {
        const placed = placerJour(timedParJour[j])
        const sansHeure = sansHeureParJour[j]
        if (placed.length === 0 && sansHeure.length === 0 && !actionJour) return null
        const total = placed.length + sansHeure.length
        return (
          <details
            key={j}
            id={'jour-' + j}
            open={j === aujourdhui}
            className={'semv-jour' + (j === aujourdhui ? ' is-today' : '')}
          >
            <summary className="semv-titre">
              {nomJour(j)} <span>{formatJourCourt(j)}</span>
              {total > 0 && <span className="semv-compte">({total})</span>}
              <span className="semv-chevron" aria-hidden="true">
                ▸
              </span>
            </summary>
            {actionJour && <div className="semv-actionjour">{actionJour(j)}</div>}
            {sansHeure.length > 0 && (
              <div className="semv-grid">
                <div className="sem-rowlabel">heure&nbsp;?</div>
                <div className="sem-sansheure">
                  {sansHeure.map((a) => (
                    <CreneauBloc
                      key={a.id}
                      activite={a}
                      couleur={couleurActivite(a, lieux)}
                      enConflit={conflitIds?.has(a.id)}
                      {...(actionsPour ? actionsPour(a) : {})}
                    />
                  ))}
                </div>
              </div>
            )}
            {placed.length > 0 && (
              <div className="semv-grid">
                <div className="sem-hourrail" style={{ height: hauteurRail }}>
                  {heures.map((h) => (
                    <div key={h} className="sem-hourline">
                      {h}h
                    </div>
                  ))}
                </div>
                <div className="sem-daycol">
                  <div className="sem-rail" style={{ height: hauteurRail }}>
                    {placed.map(({ a, debut, fin, col, ncol }) => {
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
              </div>
            )}
          </details>
        )
      })}
      {!actionJour &&
        jours.every((j) => timedParJour[j].length === 0 && sansHeureParJour[j].length === 0) && (
          <p className="empty-state">Aucun créneau cette semaine.</p>
        )}
    </div>
  )
}
