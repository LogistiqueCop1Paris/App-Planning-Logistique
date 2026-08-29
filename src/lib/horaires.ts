// Parsing tolérant des plages horaires saisies en texte libre :
//   « 8h-11h », « 11h30-14h », « 9h-12h », « 17h », « 8:00 - 11:30 », « 8h – 11h »
// Renvoie [minutesDébut, minutesFin] ou null si non interprétable.
// Une saisie type « 17h » seule est traitée comme un instant (début === fin).

function parseHeure(txt: string): number | null {
  const m = txt.trim().match(/^(\d{1,2})\s*(?:h|:|H)?\s*(\d{1,2})?$/)
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function parsePlageHoraire(
  raw: string | null | undefined
): [number, number] | null {
  if (!raw) return null
  // Sépare sur - – — / ou « à »
  const parts = raw
    .split(/\s*-\s*|\s*–\s*|\s*—\s*|\s*\/\s*|\s+à\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 1) {
    const t = parseHeure(parts[0])
    return t == null ? null : [t, t]
  }
  if (parts.length >= 2) {
    const a = parseHeure(parts[0])
    const b = parseHeure(parts[1])
    if (a == null || b == null) return null
    return a <= b ? [a, b] : [b, a]
  }
  return null
}

/** Deux plages [d1,f1] et [d2,f2] se chevauchent-elles (strictement) ? */
export function plagesSeChevauchent(
  p1: [number, number],
  p2: [number, number]
): boolean {
  const [d1, f1] = p1
  const [d2, f2] = p2
  // Chevauchement réel : on ignore le simple contact (fin === début).
  return d1 < f2 && d2 < f1
}
