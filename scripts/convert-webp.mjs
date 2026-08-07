import sharp from 'sharp'

const jobs = [
  ['public/sun_city.png', 'public/sun_city.webp'],
  ['public/city3.png', 'public/city3.webp'],
]

for (const [src, dest] of jobs) {
  const img = sharp(src)
  const meta = await img.metadata()
  await img
    .resize({ width: Math.min(meta.width, 1920), withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(dest)
  const out = await sharp(dest).metadata()
  console.log(`${src} (${meta.width}x${meta.height}) -> ${dest} (${out.width}x${out.height})`)
}
