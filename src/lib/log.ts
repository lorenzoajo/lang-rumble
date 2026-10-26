type Ctx = Record<string, unknown>

export const log = {
  info(msg: string, ctx?: Ctx): void {
    console.info(`[lang-rumble] ${msg}`, ctx ?? '')
  },
  warn(msg: string, ctx?: Ctx): void {
    console.warn(`[lang-rumble] ${msg}`, ctx ?? '')
  },
  error(msg: string, err?: unknown, ctx?: Ctx): void {
    console.error(`[lang-rumble] ${msg}`, err ?? '', ctx ?? '')
  },
}
