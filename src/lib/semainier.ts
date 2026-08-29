import type { ActiviteAvecAffectations } from '../types'
import { parsePlageHoraire } from './horaires'

export interface BlocTime {
  a: ActiviteAvecAffectations
  debut: number // minutes depuis minuit
  fin: number
}

export interface PlaceBloc extends BlocTime {
  col: number
  ncol: number
}

/** Répartit les créneaux d'un jour en colonnes pour gérer les chevauchements. */
export function placerJour(timed: BlocTime[]): PlaceBloc[] {
  const tries = [...timed].sort((x, y) => x.debut - y.debut || x.fin - y.fin)
  const out: PlaceBloc[] = []
  let cluster: PlaceBloc[] = []
  let clusterFin = -1

  const cloreCluster = () => {
    const ncol = cluster.reduce((m, p) => Math.max(m, p.col + 1), 0)
    for (const p of cluster) p.ncol = ncol
    out.push(...cluster)
    cluster = []
    clusterFin = -1
  }

  for (const t of tries) {
    if (cluster.length && t.debut >= clusterFin) cloreCluster()
    const finsParCol: number[] = []
    for (const p of cluster) finsParCol[p.col] = Math.max(finsParCol[p.col] ?? -1, p.fin)
    let col = finsParCol.findIndex((f) => f <= t.debut)
    if (col === -1) col = cluster.length ? finsParCol.length : 0
    cluster.push({ ...t, col, ncol: 1 })
    clusterFin = Math.max(clusterFin, t.fin)
  }
  if (cluster.length) cloreCluster()
  return out
}

export interface DispositionSemainier {
  h0: number
  h1: number
  heures: number[]
  timedParJour: Record<string, BlocTime[]>
  sansHeureParJour: Record<string, ActiviteAvecAffectations[]>
  aSansHeure: boolean
}

/**
 * Calcule la plage horaire de la semaine et répartit les créneaux par jour
 * (timés vs « heure à préciser »). Partagé par l'affichage et l'export PDF.
 */
export function calculerSemainier(
  jours: string[],
  activites: ActiviteAvecAffectations[]
): DispositionSemainier {
  const timed: Record<string, BlocTime[]> = {}
  const sans: Record<string, ActiviteAvecAffectations[]> = {}
  for (const j of jours) {
    timed[j] = []
    sans[j] = []
  }
  let minD = Infinity
  let maxF = -Infinity
  for (const a of activites) {
    if (!timed[a.jour]) continue
    const p = parsePlageHoraire(a.horaires)
    if (!p) {
      sans[a.jour].push(a)
      continue
    }
    const debut = p[0]
    const fin = p[0] === p[1] ? p[0] + 30 : p[1]
    timed[a.jour].push({ a, debut, fin })
    minD = Math.min(minD, debut)
    maxF = Math.max(maxF, fin)
  }
  let start = Number.isFinite(minD) ? Math.floor(minD / 60) : 8
  let end = Number.isFinite(maxF) ? Math.ceil(maxF / 60) : 18
  start = Math.min(Math.max(start, 5), 22)
  end = Math.min(Math.max(end, start + 1), 23)
  const heures = Array.from({ length: end - start }, (_, i) => start + i)
  return {
    h0: start,
    h1: end,
    heures,
    timedParJour: timed,
    sansHeureParJour: sans,
    aSansHeure: jours.some((j) => sans[j].length > 0),
  }
}
