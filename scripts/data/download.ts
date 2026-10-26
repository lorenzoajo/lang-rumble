import { createWriteStream, existsSync, mkdirSync, renameSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { CACHE_DIR, allSources, cachePath, type Source } from './sources'

const REPORT_EVERY = 50 * 1024 * 1024

async function download(source: Source): Promise<void> {
  const target = cachePath(source)
  if (existsSync(target)) return
  const res = await fetch(source.url)
  if (!res.ok || !res.body) throw new Error(`GET ${source.url} → ${res.status}`)
  let bytes = 0
  let nextReport = REPORT_EVERY
  // DOM and node typings disagree on the web stream type; the runtime object is the same.
  const body = Readable.fromWeb(res.body as NodeReadableStream<Uint8Array>)
  body.on('data', (chunk: Buffer) => {
    bytes += chunk.length
    if (bytes >= nextReport) {
      console.log(`  ${source.file}: ${Math.round(bytes / 1024 / 1024)} MB`)
      nextReport += REPORT_EVERY
    }
  })
  await pipeline(body, createWriteStream(`${target}.part`))
  renameSync(`${target}.part`, target)
  console.log(`downloaded ${source.file}`)
}

export async function downloadAll(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true })
  for (const source of allSources()) await download(source)
}
