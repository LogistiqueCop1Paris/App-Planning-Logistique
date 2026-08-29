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
}

/** Vue liste jour par jour — pensée pour le mobile (pas de grille horaire). */
export default function SemainierListe({
  jours,
  aujourdhui,
  lieux,
  activites,
  conflitIds,
  actionsPour,
}: Props) {
  const rang = (a: ActiviteAvecAffectations) => parsePlageHoraire(a.horaires)?.[0] ?? 99999

  return (
    <div className="sem-liste">
      {jours.map((j) => {
        const duJour = activites
          .filter((a) => a.jour === j)
          .sort((x, y) => rang(x) - rang(y))
        if (duJour.length === 0) return null
        return (
          <section key={j} className={'sem-liste-jour' + (j === aujourdhui ? ' is-today' : '')}>
            <h3 className="sem-liste-titre">
              {nomJour(j)} <span>{formatJourCourt(j)}</span>
            </h3>
            {duJour.map((a) => (
              <CreneauBloc
                key={a.id}
                activite={a}
                couleur={couleurActivite(a, lieux)}
                enConflit={conflitIds?.has(a.id)}
                {...(actionsPour ? actionsPour(a) : {})}
              />
            ))}
          </section>
        )
      })}
      {jours.every((j) => activites.filter((a) => a.jour === j).length === 0) && (
        <p className="empty-state">Aucun créneau cette semaine.</p>
      )}
    </div>
  )
}
