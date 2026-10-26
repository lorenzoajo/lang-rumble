import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseRecord, type Edition, type LexRecord } from '../wiktionary'

export function fixtureLines(edition: Edition): string[] {
  const path = join(process.cwd(), 'scripts/data/fixtures', `kaikki-${edition}.jsonl`)
  return readFileSync(path, 'utf8').split('\n').filter(Boolean)
}

export function fixtureRecords(edition: Edition): LexRecord[] {
  return fixtureLines(edition)
    .map((line) => parseRecord(line, edition))
    .filter((r): r is LexRecord => r !== null)
}
