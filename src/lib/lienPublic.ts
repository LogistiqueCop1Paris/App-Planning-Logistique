/** Lien public d'une semaine précise (code court), à partir de son token. */
export function lienPublic(token: string): string {
  return `${window.location.origin}/p/${token}`
}

/**
 * Lien public PERMANENT : montre toujours la semaine en cours, se met à jour
 * tout seul chaque lundi. C'est celui à partager une fois pour toutes / à mettre
 * en QR code sur un mur.
 */
export function lienSemaineCourante(): string {
  return `${window.location.origin}/semaine`
}
