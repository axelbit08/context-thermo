export type Fill = { percent: number; tokens: number; window: number }

declare module 'claude-code' {
  interface PluginState {
    'context-thermo': { fill: Fill | null; isAuto: boolean; resets: number }
  }
}
