import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fill } from '../types'

const P = 'context-thermo'
const SEUIL = 70
const CELLS = 20

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
    const { Box, Text } = $.ui.resolve(e)
    const pleines = Math.round((f.percent / 100) * CELLS)
    const auto = await read($, isAuto)
    const cells = Array.from({ length: CELLS }, (_, i) => i)

    return (
      <Box flexDirection="row">
        <Text>Contexte </Text>
        {cells.map(i => (
          <Text key={`c${i}`} color={i < pleines ? couleur(((i + 0.5) / CELLS) * 100) : undefined} dimColor={i >= pleines}>
            {i < pleines ? '█' : '░'}
          </Text>
        ))}
        <Text color={couleur(f.percent)} bold>{` ${f.percent} %`}</Text>
        <Text dimColor>{` ${kTok(f.tokens)}/${kTok(f.window)} · auto ${auto ? `à ${SEUIL} %` : 'off'}`}</Text>
      </Box>
    )
  })
}
