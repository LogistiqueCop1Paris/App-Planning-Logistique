import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Page volontairement NON reliée depuis l'interface : elle ne sert qu'au tout
// premier compte (bootstrap de l'admin). Une fois ce compte créé et promu
// « admin », désactive l'inscription dans Supabase (Authentication →
// « Allow new users to sign up » = OFF). Ensuite, tous les comptes se créent
// depuis la page Utilisateurs. Voir README.
export default function SignupPage() {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nom.trim() || !prenom.trim()) {
      setError('Nom et prénom sont obligatoires.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom, prenom, telephone } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      navigate('/')
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Compte créé</h1>
          <p>Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.</p>
          <Link to="/connexion">Retour à la connexion</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Planning hebdo</h1>
        <p className="subtitle">Créer le premier compte</p>
        <label>
          Nom
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required />
        </label>
        <label>
          Prénom
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Téléphone (facultatif)
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Création…' : 'Créer le compte'}
        </button>
        <p className="switch-link">
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  )
}
