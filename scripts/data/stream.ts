import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import type { Readable } from 'node:stream'

function spawnStdout(cmd: string, args: string[]): Readable {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] })
  child.on('error', (err) => {
    throw new Error(`${cmd} failed: ${err.message}`)
  })
  return child.stdout
}

export function lines(file: string): AsyncIterable<string> {
  let input: Readable
  if (file.endsWith('.tar.bz2')) input = spawnStdout('tar', ['-xOjf', file])
  else if (file.endsWith('.bz2')) input = spawnStdout('bzip2', ['-dc', file])
  else if (file.endsWith('.gz')) input = createReadStream(file).pipe(createGunzip())
  else input = createReadStream(file)
  return createInterface({ input, crlfDelay: Infinity })
}
