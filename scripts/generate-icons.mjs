// Generates public/icon-192.png and public/icon-512.png (blue rounded square)
// using only Node built-ins (zlib). Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function png(size) {
  const radius = size * 0.24
  const cx = size / 2
  const cy = size / 2
  const raw = Buffer.alloc(size * (1 + size * 4))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      // Rounded-rect coverage
      const dx = Math.max(Math.abs(x - cx) - (cx - radius), 0)
      const dy = Math.max(Math.abs(y - cy) - (cy - radius), 0)
      const dist = Math.sqrt(dx * dx + dy * dy)
      const alpha = dist <= radius ? 255 : dist >= radius + 1.5 ? 0 : Math.round(255 * (radius + 1.5 - dist) / 1.5)
      // Gradient: #2563eb -> #1e40af (team blue)
      const t = (x + y) / (2 * size)
      const r = Math.round(37 + (30 - 37) * t)
      const g = Math.round(99 + (64 - 99) * t)
      const b = Math.round(235 + (175 - 235) * t)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = alpha
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = join(root, 'public')
mkdirSync(out, { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(join(out, `icon-${size}.png`), png(size))
  console.log(`generated public/icon-${size}.png`)
}
