#!/usr/bin/env node
// One-off tool: turn the multi-MB brand team photo in design/ into the Open Graph
// share card the site serves (public/og-team.jpg).
//
// Run manually after replacing a source photo — this is deliberately NOT wired
// into `npm run build`. Keep the multi-MB originals in the repo-root design/
// folder, not in public/.
//
//   node scripts/optimize-brand-photos.mjs
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, '..', '..', 'design')
const OUT_DIR = join(ROOT, 'public')

/** Social crawlers still don't all render WebP, so the OG image stays JPEG. */
const OG = { src: 'team-band-source.png', out: 'og-team.jpg', width: 1200, height: 630, quality: 80 }

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`
}

async function emit(outPath, pipeline) {
  await pipeline.toFile(outPath)
  const { size } = await stat(outPath)
  console.log(`  ${outPath.replace(`${ROOT}/`, '')}  ${kb(size)}`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log(`${OG.src} → OG card`)
  await emit(
    join(OUT_DIR, OG.out),
    sharp(join(SRC_DIR, OG.src))
      .resize({ width: OG.width, height: OG.height, fit: 'cover', position: 'top' })
      .jpeg({ quality: OG.quality, mozjpeg: true }),
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
