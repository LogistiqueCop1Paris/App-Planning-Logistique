/** Mot de passe initial lisible (sans caractères ambigus). */
export function genererMotDePasse(longueur = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let mdp = ''
  for (let i = 0; i < longueur; i++) {
    mdp += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return mdp
}
