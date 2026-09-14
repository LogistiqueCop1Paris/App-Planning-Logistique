export type Role = 'admin' | 'gestionnaire'

export interface Profile {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  role: Role
}

export type StatutPlanning = 'actif' | 'archive'

export interface Planning {
  id: string
  semaine_debut: string // 'YYYY-MM-DD', lundi
  titre: string | null
  statut: StatutPlanning
  token_public: string
  verrouille: boolean
  created_at: string
}

export type Vehicule =
  | 'Ducato (Manuel)'
  | 'Jumpy (auto)'
  | 'Europcar (auto)'
  | 'Sans véhicule'

export interface Activite {
  id: string
  planning_id: string
  jour: string // 'YYYY-MM-DD'
  ordre: number
  horaires: string | null
  lieu_depart: string | null
  vehicule: Vehicule | null
  intitule: string | null
  notes: string | null
  places_benevoles: number
  created_at: string
}

/** Couleur libre d'un lieu, au format hex (ex. `#E08A3C`). */
export type CouleurLieu = string

export interface Lieu {
  id: string
  nom: string
  adresse: string | null
  couleur: CouleurLieu
  created_at: string
}

export type RolePerso = 'referent' | 'benevole'
export type OrigineAffectation = 'gestionnaire' | 'public'

export interface Affectation {
  id: string
  activite_id: string
  role_perso: RolePerso
  profile_id: string | null
  nom: string
  telephone: string | null
  ordre: number
  origine: OrigineAffectation
  created_at: string
}

export interface LigneHistorique {
  id: string
  planning_id: string
  date_heure: string
  utilisateur_nom: string | null
  action: string
  details: string | null
}

/** Créneau avec ses affectations résolues (référents + bénévoles). */
export type ActiviteAvecAffectations = Activite & { affectations: Affectation[] }

/** Forme renvoyée par la fonction SQL `planning_public(token)`. */
export interface PlanningPublic {
  planning: Pick<
    Planning,
    'id' | 'semaine_debut' | 'titre' | 'statut' | 'verrouille'
  > & { token_public: string }
  activites: ActiviteAvecAffectations[]
  lieux: Pick<Lieu, 'nom' | 'adresse' | 'couleur'>[]
}
