import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { lienPublic, lienSemaineCourante } from '../lib/lienPublic'
import Modal from './Modal'

interface Props {
  token: string
  onClose: () => void
}

function LigneLien({ url }: { url: string }) {
  const [copie, setCopie] = useState(false)
  async function copier() {
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      setCopie(false)
    }
  }
  return (
    <div className="lien-public-box">
      <input readOnly value={url} onFocus={(e) => e.target.select()} />
      <button type="button" className="small-button" onClick={copier}>
        {copie ? '✓ Copié' : 'Copier'}
      </button>
    </div>
  )
}

export default function LienPublicModal({ token, onClose }: Props) {
  const permanent = lienSemaineCourante()
  const semaine = lienPublic(token)

  return (
    <Modal title="Lien public du planning" onClose={onClose}>
      <p className="modal-subtitle">
        À partager aux bénévoles : ils consultent le planning et s'inscrivent sur les créneaux,
        sans compte.
      </p>

      <h3 style={{ margin: '0 0 4px' }}>Lien permanent (recommandé)</h3>
      <p className="field-hint">
        Montre toujours la semaine en cours et se met à jour tout seul chaque lundi. C'est celui
        à partager une fois pour toutes / à afficher en QR code.
      </p>
      <LigneLien url={permanent} />
      <div className="qr-wrap">
        <QRCodeSVG value={permanent} size={180} />
      </div>

      <h3 style={{ margin: '20px 0 4px' }}>Lien de cette semaine précise</h3>
      <p className="field-hint">
        Pointe uniquement sur la semaine {semaine.split('/p/')[1]} — utile pour partager une
        semaine à l'avance.
      </p>
      <LigneLien url={semaine} />
    </Modal>
  )
}
