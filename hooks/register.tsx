import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fill } from '../types'

const P = 'context-thermo'
const SEUIL = 70
// Compteur en braille : chaque caractère = 2×4 points
const COLS = 14
const ROWS = 4

const fill = atom({ plugin: 'context-thermo', key: 'fill' } as const, null)
const isAuto = atom({ plugin: 'context-thermo', key: 'isAuto' } as const, true)
const resets = atom({ plugin: 'context-thermo', key: 'resets' } as const, 0)

// Dégradé vert (0 %) → jaune (50 %) → rouge (100 %)
export const couleur = (pct: number): string => {
  const t = Math.min(1, Math.max(0, pct / 100))
  const r = t < 0.5 ? Math.round(510 * t) : 255
  const g = t < 0.5 ? 200 : Math.round(200 * (2 - 2 * t))
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}00`
}

const kTok = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

type Segment = { text: string; color?: string; dim?: boolean; bold?: boolean }

// Dessine un demi-cercle façon compteur de voiture, aiguille pointée sur pct.
// Renvoie une ligne de segments colorés par ligne de texte.
export const compteur = (pct: number): Segment[][] => {
  const W = COLS * 2
  const H = ROWS * 4
  const ARC = 1
  const TICK = 2
  const NEEDLE = 3
  const grid: number[][] = Array.from({ length: W }, () => new Array<number>(H).fill(0))
  const cx = (W - 1) / 2
  const cy = H - 1
  const R = Math.min(cx, cy)
  const plot = (x: number, y: number, v: number) => {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px >= 0 && px < W && py >= 0 && py < H) grid[px][py] = Math.max(grid[px][py], v)
  }
  const polaire = (p: number, r: number, v: number) => {
    const t = Math.PI * (1 - p / 100)
    plot(cx + r * Math.cos(t), cy - r * Math.sin(t), v)
  }

  for (let p = 0; p <= 100; p += 0.25) {
    polaire(p, R, ARC)
    polaire(p, R - 1, ARC)
  }
  for (const p of [0, 25, 50, 75, 100]) for (let r = R - 4; r <= R - 2; r++) polaire(p, r, TICK)
  const aiguille = Math.min(100, Math.max(0, pct))
  for (let r = 0; r <= R - 4; r += 0.3) polaire(aiguille, r, NEEDLE)

  const bits = [
    [0x01, 0x02, 0x04, 0x40],
    [0x08, 0x10, 0x20, 0x80],
  ]
  const lignes: Segment[][] = []
  for (let row = 0; row < ROWS; row++) {
    const segs: Segment[] = []
    for (let col = 0; col < COLS; col++) {
      let code = 0
      let max = 0
      for (let dx = 0; dx < 2; dx++)
        for (let dy = 0; dy < 4; dy++) {
          const v = grid[col * 2 + dx][row * 4 + dy]
          if (v) code |= bits[dx][dy]
          max = Math.max(max, v)
        }
      // Couleur de l'arc selon l'angle de la case par rapport au centre
      const angle = Math.atan2(cy - (row * 4 + 1.5), col * 2 + 0.5 - cx)
      const seg: Segment =
        max === NEEDLE
          ? { text: '', color: couleur(pct), bold: true }
          : max === ARC
            ? { text: '', color: couleur((1 - angle / Math.PI) * 100) }
            : { text: '', dim: true }
      seg.text = String.fromCharCode(0x2800 + code)
      const prev = segs[segs.length - 1]
      if (prev && prev.color === seg.color && prev.dim === seg.dim && prev.bold === seg.bold) prev.text += seg.text
      else segs.push(seg)
    }
    lignes.push(segs)
  }
  return lignes
}

// Compteur façon « skill level » (app desktop / VS Code / mobile) : 4 zones colorées,
// graduations, aiguille rouge, plaque « CONTEXTE xx % » en dessous.
export const compteurSvg = (pct: number, sousTitre: string): string => {
  const cx = 120
  const cy = 118
  const R = 92
  const r = 46
  const xy = (p: number, rad: number): [number, number] => {
    const t = Math.PI * (1 - p / 100)
    return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)]
  }
  const pt = (p: number, rad: number) => xy(p, rad).map(n => n.toFixed(1)).join(',')
  const zone = (a: number, b: number, c: string) =>
    `<path d="M${pt(a, R)} A${R},${R} 0 0 1 ${pt(b, R)} L${pt(b, r)} A${r},${r} 0 0 0 ${pt(a, r)} Z" fill="${c}"/>`
  const zones = zone(0, 25, '#ff3b1f') + zone(25, 50, '#ffd000') + zone(50, 75, '#7cc710') + zone(75, 100, '#1fa847')
  const ticks = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]
    .map(p => {
      const [x1, y1] = xy(p, R - 6)
      const [x2, y2] = xy(p, R - 18)
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#0e1a33" stroke-width="5" stroke-linecap="round"/>`
    })
    .join('')
  const a = Math.min(100, Math.max(0, pct))
  const t = Math.PI * (1 - a / 100)
  const ox = 6 * Math.sin(t)
  const oy = 6 * Math.cos(t)
  const B = R + 12
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 190" width="240" height="190">
<path d="M${cx - B},${cy + 14} L${cx - B},${cy} A${B},${B} 0 0 1 ${cx + B},${cy} L${cx + B},${cy + 14} Z" fill="#e6e8f2" stroke="#0e1a33" stroke-width="6" stroke-linejoin="round"/>
${zones}
<path d="M${pt(0, R)} A${R},${R} 0 0 1 ${pt(100, R)}" fill="none" stroke="#0e1a33" stroke-width="4"/>
${ticks}
<path d="M${pt(0, r)} A${r},${r} 0 0 1 ${pt(100, r)} Z" fill="#e6e8f2" stroke="#0e1a33" stroke-width="4"/>
<polygon points="${(cx - ox).toFixed(1)},${(cy - oy).toFixed(1)} ${pt(a, R - 14)} ${(cx + ox).toFixed(1)},${(cy + oy).toFixed(1)}" fill="#e8283c" stroke="#0e1a33" stroke-width="3" stroke-linejoin="round"/>
<circle cx="${cx}" cy="${cy}" r="11" fill="#9aa3c7" stroke="#0e1a33" stroke-width="4"/>
<rect x="30" y="${cy + 12}" width="180" height="54" rx="12" fill="#e6e8f2" stroke="#0e1a33" stroke-width="6"/>
<text x="${cx}" y="${cy + 42}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="24" fill="#0e1a33">CONTEXTE ${Math.round(pct)} %</text>
<text x="${cx}" y="${cy + 58}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#3a4466">${sousTitre}</text>
</svg>`
}

let isResetting = false


async function nouveauDepart($: EngineInterface): Promise<void> {
  if (isResetting) return
  isResetting = true
  $.ui.toast(`Contexte à ${SEUIL} % — nouveau départ avec un résumé…`)
  try {
    // La compaction refuse pendant un tour : on réessaie quelques fois.
    for (let i = 0; i < 6; i++) {
      await $.clock.sleep(1500)
      try {
        const r = await $.session.compact({
          instructions:
            "Nouvelle discussion : garde l'objectif en cours, les décisions prises, les fichiers touchés et la prochaine étape. Écris le résumé en français.",
        })
        if (!('skip' in r && r.skip)) {
          await update($, resets, n => n + 1)
          await update($, fill, () => null)
          $.ui.toast('Nouvelle discussion démarrée (résumé conservé).')
        }
        return
      } catch {
        // un tour tourne encore : on attend
      }
    }
  } finally {
    isResetting = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'jauge', description: 'Jauge du contexte : /jauge auto on|off, /jauge reset' })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const c = e.context
    if (c.percent !== undefined && c.tokens !== undefined) {
      const f: Fill = { percent: c.percent, tokens: c.tokens, window: c.window }
      await update($, fill, () => f)
      $.ui.status(`Contexte ${f.percent} %`)
      if (f.percent >= SEUIL && (await read($, isAuto))) void nouveauDepart($)
    }
    return next(e)
  })

  on('command.run', { command: 'jauge' }, async ($, e) => {
    const args = (e.args ?? '').trim().toLowerCase()
    if (args === 'auto off') {
      await update($, isAuto, () => false)
      return { text: 'Changement automatique désactivé.' }
    }
    if (args === 'auto on') {
      await update($, isAuto, () => true)
      return { text: `Changement automatique activé (seuil ${SEUIL} %).` }
    }
    if (args === 'reset') {
      void nouveauDepart($)
      return { text: 'Nouveau départ demandé.' }
    }
    const f = await read($, fill)
    return { text: f ? `Contexte : ${f.percent} % (${kTok(f.tokens)} / ${kTok(f.window)} tokens)` : 'Pas encore de mesure.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, fill)
    if (e.props.hasSurvey || f === null) return next(e)
    const auto = await read($, isAuto)
    if (e.surface !== 'terminal') {
      const { Svg } = $.ui.resolve(e)
      const sousTitre = `${kTok(f.tokens)}/${kTok(f.window)} tokens · auto ${auto ? `à ${SEUIL} %` : 'off'}`
      return <Svg source={compteurSvg(f.percent, sousTitre)} alt={`Contexte ${f.percent} %`} width={170} />
    }
    const { Box, Text } = $.ui.resolve(e)
    const lignes = compteur(f.percent)

    return (
      <Box flexDirection="row">
        <Box flexDirection="column">
          {lignes.map((segs, r) => (
            <Box key={`l${r}`} flexDirection="row">
              {segs.map((s, i) => (
                <Text key={`s${r}-${i}`} color={s.color} dimColor={s.dim} bold={s.bold}>
                  {s.text}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={3} paddingTop={1}>
          <Text>Contexte</Text>
          <Text color={couleur(f.percent)} bold>{`${f.percent} %`}</Text>
          <Text dimColor>{`${kTok(f.tokens)}/${kTok(f.window)} · auto ${auto ? `à ${SEUIL} %` : 'off'}`}</Text>
        </Box>
      </Box>
    )
  })
}
