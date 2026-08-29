import type { Vehicule } from '../types'

export const VEHICULES: Vehicule[] = [
  'Ducato (Manuel)',
  'Jumpy (auto)',
  'Europcar (auto)',
  'Sans véhicule',
]

/** Le Ducato est en boîte manuelle : utile pour signaler « permis manuelle requis ». */
export function estBoiteManuelle(v: Vehicule | null): boolean {
  return v === 'Ducato (Manuel)'
}

/** « Sans véhicule » n'entre jamais en conflit avec un autre créneau. */
export function estVehiculeReel(v: Vehicule | null): boolean {
  return v != null && v !== 'Sans véhicule'
}

/** Classe CSS du badge véhicule (couleur). Europcar en vert, Ducato = manuelle. */
export function classeBadgeVehicule(v: Vehicule | null): string {
  switch (v) {
    case 'Ducato (Manuel)':
      return 'is-manuelle'
    case 'Europcar (auto)':
      return 'is-europcar'
    default:
      return ''
  }
}

/** Trigramme court pour l'affichage compact / impression. */
export function vehiculeCourt(v: Vehicule | null): string {
  switch (v) {
    case 'Ducato (Manuel)':
      return 'Ducato'
    case 'Jumpy (auto)':
      return 'Jumpy'
    case 'Europcar (auto)':
      return 'Europcar'
    case 'Sans véhicule':
      return 'Sans véh.'
    default:
      return '—'
  }
}
