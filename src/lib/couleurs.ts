import type { CouleurLieu } from '../types'

/**
 * Palette des lieux : teintes pâles lisibles sur blanc, sur le fond crème `--bg`
 * ET à l'impression (fond clair + texte foncé). `key` = valeur stockée en base.
 */
export const COULEURS_LIEU: Record<
  CouleurLieu,
  { label: string; bg: string; bord: string; texte: string }
> = {
  orange: { label: 'Orange', bg: '#FBE7D4', bord: '#E08A3C', texte: '#8A4A12' },
  vert: { label: 'Vert', bg: '#DDEEDF', bord: '#4E9E63', texte: '#2E6B3C' },
  bleu: { label: 'Bleu', bg: '#DCE8F5', bord: '#4C86C6', texte: '#244E7A' },
  rouge: { label: 'Rouge', bg: '#F7DFDC', bord: '#C9503E', texte: '#8A2E22' },
  violet: { label: 'Violet', bg: '#E8E0F2', bord: '#8A6BB8', texte: '#4C3A6E' },
  turquoise: { label: 'Turquoise', bg: '#D8EEEC', bord: '#3FA69B', texte: '#1F5E58' },
  jaune: { label: 'Jaune', bg: '#F7EFCF', bord: '#C9A93C', texte: '#6E5A12' },
  rose: { label: 'Rose', bg: '#F7E0EC', bord: '#C96EA0', texte: '#8A3A66' },
  gris: { label: 'Gris', bg: '#ECE6DA', bord: '#A99F8C', texte: '#4A4438' },
}

export const COULEURS_KEYS = Object.keys(COULEURS_LIEU) as CouleurLieu[]

export function couleurLieu(key: CouleurLieu | null | undefined) {
  return COULEURS_LIEU[key ?? 'gris'] ?? COULEURS_LIEU.gris
}
