#!/usr/bin/env node
// One-off tool: turn the multi-MB brand team photos in design/ into the web
// derivatives the marketing site actually serves (public/*.webp + an OG jpg).
//
// Run manually after replacing a source photo — this is deliberately NOT wired
// into `npm run build`. /public ships to Vercel *and* into the Capacitor iOS
// bundle, so every byte here is paid twice; keep the originals in design/.
//
//   node scripts/optimize-brand-photos.mjs
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'design')
const OUT_DIR = join(ROOT, 'public')

/** Widths are the `srcset` candidates the markup offers; see HomePage/TeamBand. */
const JOBS = [
  { src: 'team-hero-source.png', base: 'hero-team', widths: [2000, 900], quality: 72 },
  { src: 'team-band-source.png', base: 'team-band', widths: [1600, 900], quality: 72 },
]

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

  for (const job of JOBS) {
    const srcPath = join(SRC_DIR, job.src)
    const { width: srcWidth } = await sharp(srcPath).metadata()
    console.log(`${job.src} (${srcWidth}px wide)`)

    for (const width of job.widths) {
      // Never upscale — a 900px source stretched to 2000px is just a bigger blur.
      const target = Math.min(width, srcWidth)
      await emit(
        join(OUT_DIR, `${job.base}-${width}.webp`),
        sharp(srcPath).resize({ width: target }).webp({ quality: job.quality }),
      )
    }
  }

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
