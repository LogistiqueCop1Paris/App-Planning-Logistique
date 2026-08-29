import { supabase } from './supabaseClient'
import type { Affectation, Profile, RolePerso } from '../types'

export interface LigneLocale {
  id: string | null // null = nouvelle ligne
  profile_id: string | null
  nom: string
  telephone: string
}

export type CompteMin = Pick<Profile, 'id' | 'nom' | 'prenom' | 'telephone'>

export function ligneDepuisAffectation(a: Affectation): LigneLocale {
  return { id: a.id, profile_id: a.profile_id, nom: a.nom, telephone: a.telephone ?? '' }
}

export function ligneVide(): LigneLocale {
  return { id: null, profile_id: null, nom: '', telephone: '' }
}

/**
 * Applique le diff d'un groupe (référents OU bénévoles) d'un créneau :
 * supprime les lignes retirées, insère les nouvelles, met à jour les existantes.
 * `initiales` = les affectations de ce rôle chargées au départ.
 */
export async function synchroniserGroupe(
  activiteId: string,
  role: RolePerso,
  lignes: LigneLocale[],
  initiales: Affectation[]
): Promise<void> {
  const gardees = lignes.filter((l) => l.nom.trim())
  const idsGardes = new Set(gardees.filter((l) => l.id).map((l) => l.id as string))

  const aSupprimer = initiales.filter((a) => !idsGardes.has(a.id)).map((a) => a.id)
  if (aSupprimer.length) {
    const { error } = await supabase.from('affectations').delete().in('id', aSupprimer)
    if (error) throw error
  }

  let ordre = 0
  for (const l of gardees) {
    const payload = {
      activite_id: activiteId,
      role_perso: role,
      profile_id: l.profile_id,
      nom: l.nom.trim(),
      telephone: l.telephone.trim() || null,
      ordre: ordre++,
      origine: 'gestionnaire' as const,
    }
    const { error } = l.id
      ? await supabase.from('affectations').update(payload).eq('id', l.id)
      : await supabase.from('affectations').insert(payload)
    if (error) throw error
  }
}
