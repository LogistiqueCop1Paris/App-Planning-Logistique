import { useMemo } from 'react'
import type { RolePerso } from '../types'
import { ligneVide, type CompteMin, type LigneLocale } from '../lib/personnes'

interface Props {
  titre: string
  role: RolePerso
  comptes: CompteMin[]
  lignes: LigneLocale[]
  onChange: (lignes: LigneLocale[]) => void
  hint?: string
}

/** Liste éditable de personnes (nom / téléphone / compte optionnel pour les référents). */
export default function PersonnesFields({
  titre,
  role,
  comptes,
  lignes,
  onChange,
  hint,
}: Props) {
  const comptesParId = useMemo(() => {
    const m = new Map<string, CompteMin>()
    for (const c of comptes) m.set(c.id, c)
    return m
  }, [comptes])

  function maj(i: number, patch: Partial<LigneLocale>) {
    onChange(lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function ajouter() {
    onChange([...lignes, ligneVide()])
  }
  function retirer(i: number) {
    onChange(lignes.filter((_, idx) => idx !== i))
  }
  function choisirCompte(i: number, profileId: string) {
    if (!profileId) {
      maj(i, { profile_id: null })
      return
    }
    const c = comptesParId.get(profileId)
    if (!c) return
    maj(i, { profile_id: profileId, nom: `${c.prenom} ${c.nom}`.trim(), telephone: c.telephone ?? '' })
  }

  return (
    <fieldset className="aff-group">
      <legend>{titre}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      {lignes.map((l, i) => (
        <div className="aff-edit-row" key={i}>
          <input
            placeholder="Nom / prénom"
            value={l.nom}
            onChange={(e) => maj(i, { nom: e.target.value })}
          />
          <input
            placeholder="Téléphone"
            value={l.telephone}
            onChange={(e) => maj(i, { telephone: e.target.value })}
          />
          <button
            type="button"
            className="link-button"
            onClick={() => retirer(i)}
            aria-label="Retirer"
          >
            ✕
          </button>
          {role === 'referent' && comptes.length > 0 && (
            <select
              style={{ gridColumn: '1 / -1' }}
              value={l.profile_id ?? ''}
              onChange={(e) => choisirCompte(i, e.target.value)}
            >
              <option value="">— saisie libre —</option>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom} (compte)
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <button type="button" className="small-button" onClick={ajouter}>
        + Ajouter
      </button>
    </fieldset>
  )
}
