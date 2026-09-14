/**
 * Couleur d'un lieu = une couleur libre (hex), choisie via une palette (input color).
 * On dérive automatiquement un fond pâle, une bordure et un texte foncé lisibles à
 * l'écran comme à l'impression, à partir de cette seule teinte (HSL).
 */

export const COULEUR_DEFAUT = '#A99F8C'

/** Quelques teintes de départ proposées en raccourci dans le sélecteur. */
export const SUGGESTIONS_COULEUR: string[] = [
  '#E08A3C', // orange
  '#4E9E63', // vert
  '#4C86C6', // bleu
  '#C9503E', // rouge
  '#8A6BB8', // violet
  '#3FA69B', // turquoise
  '#C9A93C', // jaune
  '#C96EA0', // rose
  COULEUR_DEFAUT, // gris
]

// D'anciens lieux peuvent encore porter un nom de couleur (avant le passage à la
// palette libre) — on les fait correspondre à leur équivalent hex le temps que la
// migration SQL soit passée sur la base.
const NOMS_HERITES: Record<string, string> = {
  orange: '#E08A3C',
  vert: '#4E9E63',
  bleu: '#4C86C6',
  rouge: '#C9503E',
  violet: '#8A6BB8',
  turquoise: '#3FA69B',
  jaune: '#C9A93C',
  rose: '#C96EA0',
  gris: COULEUR_DEFAUT,
}

export function normaliserHex(v: string | null | undefined): string | null {
  if (!v) return null
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^[0-9a-fA-F]{6}$/.test(v)) return '#' + v
  return NOMS_HERITES[v.trim().toLowerCase()] ?? null
}

function hexVersRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbVersHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function rgbVersHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  return [h * 60, s * 100, l * 100]
}

function hslVersRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h / 360 + 1 / 3) * 255, hue2rgb(p, q, h / 360) * 255, hue2rgb(p, q, h / 360 - 1 / 3) * 255]
}

export interface NuanceLieu {
  bg: string
  bord: string
  texte: string
}

/** Dérive {fond pâle, bordure, texte foncé} à partir d'une seule couleur hex. */
export function nuanceLieu(hex: string | null | undefined): NuanceLieu {
  const base = normaliserHex(hex) ?? COULEUR_DEFAUT
  const [h, s] = rgbVersHsl(...hexVersRgb(base))
  const bg = rgbVersHex(...hslVersRgb(h, Math.min(s, 45), 91))
  const texte = rgbVersHex(...hslVersRgb(h, Math.min(s + 10, 70), 26))
  return { bg, bord: base, texte }
}
