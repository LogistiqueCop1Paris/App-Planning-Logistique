import { jsPDF } from 'jspdf'
import type { ActiviteAvecAffectations, Lieu, Planning } from '../types'
import { formatJourCourt, joursDeLaSemaine, libelleSemaine, nomJour } from './dates'
import { calculerSemainier, placerJour } from './semainier'
import { couleurActivite } from './lieux'
import { nuanceLieu } from './couleurs'
import { vehiculeCourt } from './vehicules'
import logoUrl from '../assets/logo.png'

type LieuMin = Pick<Lieu, 'nom' | 'adresse' | 'couleur'>
type PlanningMin = Pick<Planning, 'id' | 'semaine_debut' | 'titre'>

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Palette de l'appli (pour un rendu cohérent avec l'écran).
const ACCENT = hexRgb('#DF5F4D')
const ACCENT_DARK = hexRgb('#C94E3D')
const INK = hexRgb('#221D17')
const MUTED = hexRgb('#8A7F6F')
const BORDER = hexRgb('#ECDFC4')
const GRID_LINE: [number, number, number] = [214, 205, 182]

function lignesBloc(a: ActiviteAvecAffectations): string[] {
  const refs = a.affectations
    .filter((x) => x.role_perso === 'referent')
    .map((x) => x.nom)
    .join(', ')
  const bens = a.affectations.filter((x) => x.role_perso === 'benevole')
  const bn = bens.map((x) => x.nom).join(', ')
  const pl = a.places_benevoles > 0 ? `${bens.length}/${a.places_benevoles}` : ''
  const veh =
    a.vehicule && a.vehicule !== 'Sans véhicule' ? `  [${vehiculeCourt(a.vehicule)}]` : ''
  const L = [a.intitule || 'Créneau']
  if (a.horaires) L.push(a.horaires + veh)
  if (refs) L.push('Réf : ' + refs)
  L.push('Bén : ' + (bn || '—') + (pl ? ` (${pl})` : ''))
  if (a.notes) L.push('Note : ' + a.notes)
  return L
}

function ecrireContenuBloc(
  doc: jsPDF,
  a: ActiviteAvecAffectations,
  couleurTexte: [number, number, number],
  x: number,
  y: number,
  w: number,
  h: number
) {
  doc.setTextColor(...couleurTexte)
  const lh = 7.5
  const maxLignes = Math.max(1, Math.floor((h - 3) / lh))
  const raw = lignesBloc(a)
  let ln = 0
  for (let i = 0; i < raw.length && ln < maxLignes; i++) {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
    doc.setFontSize(i === 0 ? 6.8 : 6)
    for (const part of doc.splitTextToSize(raw[i], w)) {
      if (ln >= maxLignes) break
      doc.text(part, x, y + 7 + ln * lh)
      ln++
    }
  }
}

interface OptionsPdf {
  /** data-URL PNG d'un QR code, dessiné en haut à droite (semaines actives seulement) */
  qrDataUrl?: string
  /** data-URL du logo de l'asso */
  logoDataUrl?: string
  /** largeur / hauteur du logo (pour garder les proportions) */
  logoRatio?: number
}

/** Un PDF A4 paysage, une page, pour une semaine. Format IDENTIQUE pour toutes les semaines. */
export function genererPdfSemaine(
  planning: PlanningMin,
  activites: ActiviteAvecAffectations[],
  lieux: LieuMin[],
  opts: OptionsPdf = {}
): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()
  const M = 28

  // ---------- En-tête ----------
  const QR = opts.qrDataUrl ? 54 : 0
  if (opts.qrDataUrl) {
    doc.addImage(opts.qrDataUrl, 'PNG', PW - M - QR, M - 4, QR, QR)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MUTED)
    doc.text('Lien public', PW - M - QR / 2, M - 4 + QR + 7, { align: 'center' })
  }

  let texteX = M
  if (opts.logoDataUrl) {
    const logoH = 30
    const logoW = logoH * (opts.logoRatio || 3)
    doc.addImage(opts.logoDataUrl, 'PNG', M, M - 2, logoW, logoH)
    texteX = M + logoW + 16
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...ACCENT_DARK)
  doc.text('PLANNING HEBDOMADAIRE', texteX, M + 6)

  doc.setFontSize(15)
  doc.setTextColor(...INK)
  const titreY = M + 22
  doc.text(`Semaine ${libelleSemaine(planning.semaine_debut)}`, texteX, titreY)
  if (planning.titre) {
    const w = doc.getTextWidth(`Semaine ${libelleSemaine(planning.semaine_debut)}`)
    doc.setFontSize(12)
    doc.setTextColor(...ACCENT)
    doc.text(`« ${planning.titre} »`, texteX + w + 12, titreY)
  }

  const ruleY = M + 34
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(1.4)
  doc.line(M, ruleY, PW - M, ruleY)

  const jours = joursDeLaSemaine(planning.semaine_debut)
  const { h0, h1, heures, timedParJour, sansHeureParJour, aSansHeure } = calculerSemainier(
    jours,
    activites
  )

  const gridTop = ruleY + 12
  const gutter = 28
  const gridLeft = M + gutter
  const colW = (PW - M - gridLeft) / 7
  const headH = 20
  const sansH = aSansHeure
    ? Math.min(80, 12 + Math.max(...jours.map((j) => sansHeureParJour[j].length)) * 9)
    : 0
  const railTop = gridTop + headH + sansH
  const railH = PH - M - railTop
  const hourPx = railH / (h1 - h0)

  // Fond de l'en-tête de jour
  doc.setFillColor(...hexRgb('#FBF6EA'))
  doc.rect(gridLeft, gridTop, 7 * colW, headH, 'F')

  // Colonnes + en-têtes de jour
  doc.setDrawColor(...GRID_LINE)
  doc.setLineWidth(0.5)
  jours.forEach((j, i) => {
    const x = gridLeft + i * colW
    doc.line(x, gridTop, x, PH - M)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(nomJour(j), x + 4, gridTop + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(formatJourCourt(j), x + 4, gridTop + 17)
  })
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.8)
  doc.rect(gridLeft, gridTop, 7 * colW, PH - M - gridTop)
  doc.setDrawColor(...GRID_LINE)
  doc.setLineWidth(0.5)
  doc.line(gridLeft, gridTop + headH, PW - M, gridTop + headH)
  doc.line(gridLeft, railTop, PW - M, railTop)

  // Lignes d'heures
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  heures.forEach((h, i) => {
    const y = railTop + i * hourPx
    doc.setDrawColor(...GRID_LINE)
    doc.line(gridLeft, y, PW - M, y)
    doc.setTextColor(...MUTED)
    doc.text(`${h}h`, gridLeft - 4, y + 7, { align: 'right' })
  })

  // Bande « heure ? »
  if (aSansHeure) {
    doc.setFontSize(6)
    doc.setTextColor(...MUTED)
    doc.text('heure ?', gridLeft - 4, gridTop + headH + 9, { align: 'right' })
    jours.forEach((j, i) => {
      const x = gridLeft + i * colW
      let yy = gridTop + headH + 4
      for (const a of sansHeureParJour[j]) {
        const c = nuanceLieu(couleurActivite(a, lieux))
        doc.setFillColor(...hexRgb(c.bg))
        doc.setDrawColor(...hexRgb(c.bord))
        doc.rect(x + 1, yy, colW - 2, 8.5, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.6)
        doc.setTextColor(...hexRgb(c.texte))
        doc.text(
          doc.splitTextToSize(
            `${a.intitule || 'Créneau'}${a.horaires ? ' · ' + a.horaires : ''}`,
            colW - 6
          )[0] ?? '',
          x + 3,
          yy + 6
        )
        yy += 9
      }
    })
    doc.setDrawColor(...GRID_LINE)
    doc.line(gridLeft, railTop, PW - M, railTop)
  }

  // Créneaux placés
  jours.forEach((j, i) => {
    const colX = gridLeft + i * colW
    for (const p of placerJour(timedParJour[j])) {
      const bw = colW / p.ncol - 2
      const bx = colX + (p.col / p.ncol) * colW + 1
      const by = railTop + ((p.debut - h0 * 60) / 60) * hourPx
      const bh = Math.max(15, ((p.fin - p.debut) / 60) * hourPx)
      const c = nuanceLieu(couleurActivite(p.a, lieux))
      doc.setFillColor(...hexRgb(c.bg))
      doc.setDrawColor(...hexRgb(c.bord))
      doc.setLineWidth(0.7)
      doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD')
      ecrireContenuBloc(doc, p.a, hexRgb(c.texte), bx + 3, by, bw - 6, bh)
    }
  })

  return doc.output('blob')
}

function nomFichier(p: PlanningMin): string {
  const base = `Semaine ${libelleSemaine(p.semaine_debut)}`
  const nom = p.titre ? `${base} - ${p.titre}` : base
  return nom.replace(/[\\/:*?"<>|]+/g, ' ').trim()
}

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function qrDataUrl(url: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
}

let _logo: { dataUrl: string; ratio: number } | null = null
async function chargerLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
  if (_logo) return _logo
  try {
    const blob = await (await fetch(logoUrl)).blob()
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(blob)
    })
    const ratio = await new Promise<number>((res) => {
      const img = new Image()
      img.onload = () => res(img.naturalWidth / img.naturalHeight || 3)
      img.onerror = () => res(3)
      img.src = dataUrl
    })
    _logo = { dataUrl, ratio }
    return _logo
  } catch {
    return null
  }
}

/**
 * Exporte UNE semaine en PDF (téléchargement direct). Même format que l'export
 * groupé des archives — la seule différence est le QR code, présent uniquement
 * quand `qrUrl` est fourni (semaine active).
 */
export async function exporterUneSemaine(
  planning: PlanningMin,
  activites: ActiviteAvecAffectations[],
  lieux: LieuMin[],
  opts: { qrUrl?: string } = {}
): Promise<void> {
  const [qr, logo] = await Promise.all([
    opts.qrUrl ? qrDataUrl(opts.qrUrl) : Promise.resolve(undefined),
    chargerLogo(),
  ])
  telecharger(
    genererPdfSemaine(planning, activites, lieux, {
      qrDataUrl: qr,
      logoDataUrl: logo?.dataUrl,
      logoRatio: logo?.ratio,
    }),
    nomFichier(planning) + '.pdf'
  )
}

export interface SemaineAExporter {
  planning: PlanningMin
  activites: ActiviteAvecAffectations[]
}

/** Un PDF par semaine, le tout dans un .zip. Même format que l'export individuel (sans QR). */
export async function exporterSemainesZip(
  items: SemaineAExporter[],
  lieux: LieuMin[]
): Promise<void> {
  const logo = await chargerLogo()
  const base = { logoDataUrl: logo?.dataUrl, logoRatio: logo?.ratio }

  if (items.length === 1) {
    telecharger(
      genererPdfSemaine(items[0].planning, items[0].activites, lieux, base),
      nomFichier(items[0].planning) + '.pdf'
    )
    return
  }
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const it of items) {
    zip.file(
      nomFichier(it.planning) + '.pdf',
      genererPdfSemaine(it.planning, it.activites, lieux, base)
    )
  }
  const out = await zip.generateAsync({ type: 'blob' })
  telecharger(out, 'plannings-archives.zip')
}
