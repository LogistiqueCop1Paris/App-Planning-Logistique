import type { Activite } from '../types'
import { estVehiculeReel } from './vehicules'
import { parsePlageHoraire, plagesSeChevauchent } from './horaires'

export interface ConflitVehicule {
  vehicule: string
  jour: string
  a: Activite
  b: Activite
}

/**
 * Détecte les cas où un même véhicule (réel, hors « Sans véhicule ») est
 * affecté à deux créneaux du même jour dont les horaires se chevauchent.
 * Si l'un des deux horaires n'est pas interprétable, on ne signale rien
 * (mieux vaut rater un conflit que crier au loup à tort).
 */
export function detecterConflitsVehicule(activites: Activite[]): ConflitVehicule[] {
  const conflits: ConflitVehicule[] = []
  const parVehiculeJour = new Map<string, Activite[]>()

  for (const act of activites) {
    if (!estVehiculeReel(act.vehicule)) continue
    const cle = `${act.vehicule}__${act.jour}`
    const liste = parVehiculeJour.get(cle) ?? []
    liste.push(act)
    parVehiculeJour.set(cle, liste)
  }

  for (const [cle, liste] of parVehiculeJour) {
    if (liste.length < 2) continue
    const [vehicule, jour] = cle.split('__')
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const p1 = parsePlageHoraire(liste[i].horaires)
        const p2 = parsePlageHoraire(liste[j].horaires)
        if (!p1 || !p2) continue
        if (plagesSeChevauchent(p1, p2)) {
          conflits.push({ vehicule, jour, a: liste[i], b: liste[j] })
        }
      }
    }
  }
  return conflits
}

/** Ids des activités impliquées dans au moins un conflit. */
export function activitesEnConflit(conflits: ConflitVehicule[]): Set<string> {
  const s = new Set<string>()
  for (const c of conflits) {
    s.add(c.a.id)
    s.add(c.b.id)
  }
  return s
}
