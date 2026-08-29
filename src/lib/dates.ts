// Helpers de dates calées sur l'heure de Paris (Europe/Paris).
// On raisonne en chaînes 'YYYY-MM-DD' pour éviter les décalages de fuseau :
// une date de planning n'a pas d'heure, seulement un jour.

const TZ = 'Europe/Paris'

/** Date du jour à Paris, au format 'YYYY-MM-DD'. */
export function aujourdhuiParis(): string {
  // 'en-CA' formate en YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Ajoute `n` jours à une date 'YYYY-MM-DD' (n peut être négatif). */
export function ajouterJours(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** Jour de la semaine (0 = lundi … 6 = dimanche) d'une date 'YYYY-MM-DD'. */
export function jourSemaineLundi0(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = dimanche
  return (js + 6) % 7
}

/** Lundi de la semaine contenant `iso` (défaut : aujourd'hui à Paris). */
export function lundiDeLaSemaine(iso: string = aujourdhuiParis()): string {
  return ajouterJours(iso, -jourSemaineLundi0(iso))
}

/** Les 7 dates (lundi → dimanche) de la semaine commençant à `lundiIso`. */
export function joursDeLaSemaine(lundiIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundiIso, i))
}

const JOURS_FR = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]
const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

export function nomJour(iso: string): string {
  return JOURS_FR[jourSemaineLundi0(iso)]
}

/** Ex. « lun. 4 mai ». */
export function formatJourCourt(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${JOURS_FR[jourSemaineLundi0(iso)].slice(0, 3).toLowerCase()}. ${d} ${MOIS_FR[m - 1]}`
}

/** Ex. « 4 mai 2026 ». */
export function formatJourLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MOIS_FR[m - 1]} ${y}`
}

/** Ex. « du 4 au 10 mai 2026 » pour une semaine. */
export function libelleSemaine(lundiIso: string): string {
  const dimIso = ajouterJours(lundiIso, 6)
  const [ly, lm, ld] = lundiIso.split('-').map(Number)
  const [dy, dm, dd] = dimIso.split('-').map(Number)
  if (lm === dm && ly === dy) {
    return `du ${ld} au ${dd} ${MOIS_FR[dm - 1]} ${dy}`
  }
  if (ly === dy) {
    return `du ${ld} ${MOIS_FR[lm - 1]} au ${dd} ${MOIS_FR[dm - 1]} ${dy}`
  }
  return `du ${ld} ${MOIS_FR[lm - 1]} ${ly} au ${dd} ${MOIS_FR[dm - 1]} ${dy}`
}
