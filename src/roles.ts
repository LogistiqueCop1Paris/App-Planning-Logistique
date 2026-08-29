import type { Role } from './types'

export const ROLES: Role[] = ['admin', 'gestionnaire']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  gestionnaire: 'Gestionnaire',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:
    "Peut tout faire : créer/éditer/archiver les plannings, gérer les comptes (NOM, prénom, email, rôle, mot de passe) et supprimer définitivement un planning.",
  gestionnaire:
    "Peut créer, éditer et archiver les plannings, gérer les créneaux et les affectations. Ne peut pas gérer les comptes ni supprimer définitivement un planning.",
}

export function estAdmin(role: Role | undefined): boolean {
  return role === 'admin'
}

/** Tout compte connecté peut éditer les plannings. */
export function peutEditerPlanning(role: Role | undefined): boolean {
  return role === 'admin' || role === 'gestionnaire'
}

export function peutGererUtilisateurs(role: Role | undefined): boolean {
  return role === 'admin'
}

export function peutSupprimerPlanning(role: Role | undefined): boolean {
  return role === 'admin'
}
