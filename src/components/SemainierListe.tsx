import type { ActiviteAvecAffectations, Lieu } from '../types'
import { formatJourCourt, nomJour } from '../lib/dates'
import { parsePlageHoraire } from '../lib/horaires'
import { couleurActivite } from '../lib/lieux'
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

const MOMENTS = [
  { cle: 'matin', label: 'Matin', debut: 0, fin: 12 * 60 },
  { cle: 'apresmidi', label: 'Après-midi', debut: 12 * 60, fin: 18 * 60 },
  { cle: 'soir', label: 'Soir', debut: 18 * 60, fin: 24 * 60 },
] as const

/** Vue liste jour par jour — pensée pour le mobile (pas de grille horaire).
 * Chaque jour est repliable : aujourd'hui est ouvert par défaut, les autres
 * jours sont repliés pour réduire le scroll. Les créneaux sont regroupés par
 * moment de la journée pour un repérage plus rapide. */
export default function SemainierListe({
  jours,
  aujourdhui,
  lieux,
  activites,
  conflitIds,
  actionsPour,
  actionJour,
}: Props) {
  const rang = (a: ActiviteAvecAffectations) => parsePlageHoraire(a.horaires)?.[0] ?? null

  return (
    <div className="sem-liste">
      {jours.map((j) => {
        const duJour = activites.filter((a) => a.jour === j)
        if (duJour.length === 0 && !actionJour) return null

        const groupes = MOMENTS.map((m) => ({
          ...m,
          items: duJour
            .filter((a) => {
              const r = rang(a)
              return r !== null && r >= m.debut && r < m.fin
            })
            .sort((x, y) => (rang(x) ?? 0) - (rang(y) ?? 0)),
        })).filter((g) => g.items.length > 0)
        const sansHeure = duJour.filter((a) => rang(a) === null)

        return (
          <details
            key={j}
            id={'jour-' + j}
            open={j === aujourdhui}
            className={'sem-liste-jour' + (j === aujourdhui ? ' is-today' : '')}
          >
            <summary className="sem-liste-titre">
              {nomJour(j)} <span>{formatJourCourt(j)}</span>
              {duJour.length > 0 && <span className="sem-liste-compte">({duJour.length})</span>}
              <span className="sem-liste-chevron" aria-hidden="true">
                ▸
              </span>
            </summary>
            <div className="sem-liste-contenu">
              {actionJour && <div className="sem-liste-actionjour">{actionJour(j)}</div>}
              {groupes.map((g) => (
                <div key={g.cle} className="sem-liste-moment">
                  <h4 className="sem-liste-souscat">{g.label}</h4>
                  {g.items.map((a) => (
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
              {sansHeure.length > 0 && (
                <div className="sem-liste-moment">
                  <h4 className="sem-liste-souscat">Heure à préciser</h4>
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
              )}
            </div>
          </details>
        )
      })}
      {!actionJour && jours.every((j) => activites.filter((a) => a.jour === j).length === 0) && (
        <p className="empty-state">Aucun créneau cette semaine.</p>
      )}
    </div>
  )
}
