import type { Activite, CouleurLieu, Lieu } from '../types'

type LieuMin = Pick<Lieu, 'nom' | 'adresse' | 'couleur'>

function cle(nom: string | null | undefined): string {
  return (nom ?? '').trim().toLowerCase()
}

/** Retrouve un lieu enregistré par correspondance EXACTE (casse / espaces ignorés). */
export function trouverLieu(
  nom: string | null | undefined,
  lieux: LieuMin[] | null | undefined
): LieuMin | undefined {
  const k = cle(nom)
  if (!k || !lieux) return undefined
  return lieux.find((l) => cle(l.nom) === k)
}

/**
 * Couleur d'un créneau : celle du lieu de destination (intitulé du trajet) s'il
 * correspond à un lieu enregistré, sinon celle du lieu de départ, sinon gris.
 */
export function couleurActivite(
  act: Pick<Activite, 'intitule' | 'lieu_depart'>,
  lieux: LieuMin[] | null | undefined
): CouleurLieu {
  return (
    trouverLieu(act.intitule, lieux)?.couleur ??
    trouverLieu(act.lieu_depart, lieux)?.couleur ??
    'gris'
  )
}

export function adresseDepart(
  act: Pick<Activite, 'lieu_depart'>,
  lieux: LieuMin[]
): string | null {
  return trouverLieu(act.lieu_depart, lieux)?.adresse ?? null
}

export function adresseDestination(
  act: Pick<Activite, 'intitule'>,
  lieux: LieuMin[]
): string | null {
  return trouverLieu(act.intitule, lieux)?.adresse ?? null
}
