// An iOS home screen painted into a canvas: the content both Duo screens
// render in the demo. Everything is laid out in points and drawn at 1.5 px/pt
// (half the Duo's native @3x), so the canvases match COVER/INNER in main.ts.

export const PX_PER_PT = 1.5
const FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif'
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`

// ---------------------------------------------------------------------------
// App icons, as 100×100 SVGs rasterised once.

const grad = (id: string, a: string, b: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const GREEN = grad('g', '#6AF184', '#0EBE30')

function ring(n: number, f: (i: number) => string) {
  return Array.from({ length: n }, (_, i) => f(i)).join('')
}
function hand(deg: number, len: number, width: number, color: string, tail = 0) {
  const r = (deg * Math.PI) / 180
  const x = (d: number) => (50 + d * Math.sin(r)).toFixed(2)
  const y = (d: number) => (50 - d * Math.cos(r)).toFixed(2)
  return `<line x1="${x(-tail)}" y1="${y(-tail)}" x2="${x(len)}" y2="${y(len)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`
}

const ICON_SVG: Record<string, [bg: string, body: string, defs?: string]> = {
  Phone: [
    'url(#g)',
    '<path fill="#fff" d="M30 20c3-2 7-1 9 2l6 10c1.5 2.5 1 5.5-1.5 7.3l-3.5 2.5c3 7 9 13 16 16l2.5-3.5c1.8-2.5 4.8-3 7.3-1.5l10 6c3 2 4 6 2 9l-3 4c-3 4-9 5-14 3C46 69 31 54 25 38c-2-5-1-11 3-14z"/>',
    GREEN,
  ],
  Messages: [
    'url(#g)',
    '<path fill="#fff" d="M50 22c-19.3 0-35 12.5-35 28 0 8.6 4.8 16.2 12.4 21.4-.6 4.3-2.8 8.2-6.4 10.6 6.2.4 12.2-1.8 16.6-5.6 3.9 1.1 8.1 1.6 12.4 1.6 19.3 0 35-12.5 35-28S69.3 22 50 22z"/>',
    GREEN,
  ],
  FaceTime: [
    'url(#g)',
    '<rect x="17" y="33" width="45" height="34" rx="9" fill="#fff"/><path d="M65 45.5l15-9.5v28l-15-9.5z" fill="#fff"/>',
    GREEN,
  ],
  Mail: [
    'url(#g)',
    '<rect x="17" y="29" width="66" height="44" rx="6" fill="#fff"/><path d="M19 32l31 23 31-23" fill="none" stroke="#2C8CF6" stroke-width="3" stroke-linejoin="round"/>',
    grad('g', '#22C1FF', '#1366F1'),
  ],
  Safari: [
    'url(#w)',
    `<circle cx="50" cy="50" r="39" fill="url(#c)"/>${ring(36, (i) => `<line x1="50" y1="14" x2="50" y2="${i % 3 ? 17 : 19}" stroke="#fff" stroke-width="0.9" transform="rotate(${i * 10} 50 50)"/>`)}<path d="M72 28L53.5 53.5 46.5 46.5z" fill="#FF3B30"/><path d="M28 72l18.5-25.5 7 7z" fill="#fff"/>`,
    grad('w', '#ffffff', '#e4e4e8') + grad('c', '#1CD4FF', '#195DEF'),
  ],
  Camera: [
    'url(#g)',
    '<rect x="15" y="32" width="70" height="45" rx="9" fill="#2c2c2e"/><rect x="38" y="25" width="24" height="10" rx="3" fill="#2c2c2e"/><circle cx="50" cy="54.5" r="16" fill="#d8d8dc"/><circle cx="50" cy="54.5" r="12" fill="#111"/><circle cx="50" cy="54.5" r="6.5" fill="#2b3a6b"/><circle cx="46.5" cy="51" r="2" fill="#fff" opacity=".7"/><circle cx="74" cy="40" r="2.6" fill="#ffcc00"/>',
    grad('g', '#EDEDF0', '#9E9EA4'),
  ],
  Photos: [
    '#fff',
    ring(8, (i) => {
      const c = ['#F9A43A', '#F6CF45', '#A6D25A', '#55C7C6', '#4C8FE9', '#8D6AD8', '#D964B4', '#F05E5B'][i]
      return `<ellipse cx="50" cy="31" rx="9.5" ry="17" fill="${c}" opacity="0.85" style="mix-blend-mode:multiply" transform="rotate(${i * 45} 50 50)"/>`
    }),
  ],
  Settings: [
    'url(#g)',
    `<g fill="#3a3a3c">${ring(12, (i) => `<rect x="45.5" y="15" width="9" height="14" rx="2" transform="rotate(${i * 30} 50 50)"/>`)}<circle cx="50" cy="50" r="28"/></g><circle cx="50" cy="50" r="22" fill="url(#h)"/>${ring(6, (i) => `<rect x="48" y="30" width="4" height="40" rx="2" fill="#5a5a5e" transform="rotate(${i * 30} 50 50)"/>`)}<circle cx="50" cy="50" r="9" fill="#3a3a3c"/><circle cx="50" cy="50" r="4.5" fill="#8e8e93"/>`,
    grad('g', '#B4B4BA', '#6C6C72') + grad('h', '#D1D1D6', '#9A9AA0'),
  ],
  Calendar: [
    '#fff',
    `<text x="50" y="31" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="14.5" font-weight="600" fill="#FF3B30">SAT</text><text x="50" y="77" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="48" font-weight="300" fill="#1c1c1e">24</text>`,
  ],
  Clock: [
    '#000',
    `<circle cx="50" cy="50" r="41" fill="#fff"/>${ring(12, (i) => `<line x1="50" y1="12" x2="50" y2="${i % 3 ? 16 : 18}" stroke="#1c1c1e" stroke-width="${i % 3 ? 1.6 : 2.6}" transform="rotate(${i * 30} 50 50)"/>`)}${hand(290.5, 20, 4.5, '#1c1c1e')}${hand(246, 31, 3.2, '#1c1c1e')}${hand(60, 34, 1.4, '#FF9500', 8)}<circle cx="50" cy="50" r="3" fill="#FF9500"/><circle cx="50" cy="50" r="1.2" fill="#fff"/>`,
  ],
  Weather: [
    'url(#g)',
    '<circle cx="39" cy="39" r="14" fill="#FFD60A"/><path fill="#fff" d="M30 72h40a12 12 0 0 0 0-24 16 16 0 0 0-30.5-4A13 13 0 0 0 30 72z"/>',
    grad('g', '#4BA3F2', '#1D63D5'),
  ],
  Maps: [
    '#EDE7DA',
    '<path d="M0 0h46L0 46z" fill="#BEE3A3"/><path d="M100 58V100H58z" fill="#9ED2F5"/><path d="M-5 68L68-5" stroke="#fff" stroke-width="9"/><path d="M18 106L106 18" stroke="#FFD05A" stroke-width="9"/><path d="M18 106L106 18" stroke="#F5B935" stroke-width="1" stroke-dasharray="4 4"/><circle cx="60" cy="60" r="10" fill="#fff"/><circle cx="60" cy="60" r="7" fill="#0A84FF"/>',
  ],
  Notes: [
    '#fff',
    '<rect width="100" height="27" fill="url(#y)"/><line x1="8" y1="31.5" x2="92" y2="31.5" stroke="#c7c7cc" stroke-width="1.6" stroke-dasharray="1.6 3.2"/><g stroke="#dcdce0" stroke-width="1.6"><line x1="10" y1="45" x2="90" y2="45"/><line x1="10" y1="58" x2="90" y2="58"/><line x1="10" y1="71" x2="90" y2="71"/><line x1="10" y1="84" x2="90" y2="84"/></g>',
    grad('y', '#FFE36A', '#F8C92A'),
  ],
  Reminders: [
    '#fff',
    ring(3, (i) => {
      const y = 30 + i * 20
      const c = ['#0A84FF', '#FF3B30', '#FF9F0A'][i]
      return `<circle cx="25" cy="${y}" r="7" fill="${c}"/><circle cx="25" cy="${y}" r="4.2" fill="none" stroke="#fff" stroke-width="1.6"/><line x1="39" y1="${y}" x2="85" y2="${y}" stroke="#d6d6da" stroke-width="2.4" stroke-linecap="round"/>`
    }),
  ],
  Music: [
    'url(#g)',
    '<path fill="#fff" d="M41 29l31-7.5v40a9 7.5 0 1 1-4.5-6.5V34L45.5 39.5v27a9 7.5 0 1 1-4.5-6.5z"/>',
    grad('g', '#FF6E82', '#F9233F'),
  ],
  'App Store': [
    'url(#g)',
    '<g stroke="#fff" stroke-width="7" stroke-linecap="round"><line x1="56" y1="24" x2="33" y2="66"/><line x1="44" y1="24" x2="70" y2="70"/><line x1="25" y1="57" x2="62" y2="57"/></g><line x1="26" y1="76" x2="30" y2="70" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
    grad('g', '#1CC9FD', '#1D6BF2'),
  ],
  Wallet: [
    '#000',
    '<rect x="16" y="22" width="68" height="34" rx="5" fill="#2F9DF4"/><rect x="16" y="31" width="68" height="34" rx="5" fill="#FFC93A"/><rect x="16" y="40" width="68" height="34" rx="5" fill="#35C759"/><rect x="16" y="49" width="68" height="30" rx="5" fill="#FF7A45"/><path d="M13 57h22c3 0 5 7 15 7s12-7 15-7h22v20a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6z" fill="#2c2c2e"/>',
  ],
  Health: [
    '#fff',
    '<path fill="url(#h)" d="M50 80C26 64 16 51 16 38c0-10 8-18 17.5-18 7 0 13 4 16.5 10 3.5-6 9.5-10 16.5-10C76 20 84 28 84 38c0 13-10 26-34 42z"/>',
    grad('h', '#FF6A86', '#FF2D55'),
  ],
  Podcasts: [
    'url(#g)',
    '<circle cx="50" cy="42" r="8.5" fill="#fff"/><path d="M37 57.5a19 19 0 1 1 26 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M29 69a31 31 0 1 1 42 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><rect x="45.5" y="54" width="9" height="26" rx="4.5" fill="#fff"/>',
    grad('g', '#E07BFF', '#8A2BE2'),
  ],
  Files: [
    '#fff',
    '<path d="M15 31a5 5 0 0 1 5-5h18l6 6h36a5 5 0 0 1 5 5v35a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5z" fill="#1E87EF"/><path d="M15 41h70v31a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5z" fill="#44ADF6"/>',
  ],
  Books: [
    'url(#g)',
    '<path fill="#fff" d="M48 33c-8-5.5-19-6.5-31-4.5v40c12-2 23-1 31 4.5z"/><path fill="#fff" d="M52 33c8-5.5 19-6.5 31-4.5v40c-12-2-23-1-31 4.5z"/>',
    grad('g', '#FFA53A', '#FF6A00'),
  ],
  'Find My': [
    'url(#g)',
    '<circle cx="50" cy="50" r="31" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.2"/><circle cx="50" cy="50" r="19" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="2.2"/><circle cx="50" cy="50" r="8.5" fill="#fff"/>',
    grad('g', '#3BD563', '#1CA545'),
  ],
  Stocks: [
    '#000',
    '<g stroke="#2c2c2e" stroke-width="1"><line x1="12" y1="34" x2="88" y2="34"/><line x1="12" y1="52" x2="88" y2="52"/><line x1="12" y1="70" x2="88" y2="70"/></g><polyline points="14,66 28,58 40,63 55,40 67,48 86,28" fill="none" stroke="#30D158" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>',
  ],
  TV: [
    'url(#g)',
    '<text x="50" y="64" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="40" font-weight="600" letter-spacing="-1" fill="#fff">tv</text>',
    grad('g', '#2c2c2e', '#000000'),
  ],
  News: [
    '#fff',
    '<path d="M27 76V24h11l24 33V24h11v52H62L38 43v33z" fill="#FA324A"/>',
  ],
  Fitness: [
    '#000',
    `${[
      [31, '#FA114F', 0.78],
      [22, '#92E82A', 0.62],
      [13, '#1EEAEF', 0.85],
    ]
      .map(([r, c, p]) => {
        const len = 2 * Math.PI * (r as number)
        return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="7.5"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-width="7.5" stroke-linecap="round" stroke-dasharray="${(len * (p as number)).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 50 50)"/>`
      })
      .join('')}`,
  ],
}

const icons = new Map<string, HTMLImageElement>()

export function loadIcons(): Promise<void> {
  const jobs = Object.entries(ICON_SVG).map(([name, [bg, body, defs = '']]) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100"><defs>${defs}</defs><rect width="100" height="100" fill="${bg}"/>${body}</svg>`
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    icons.set(name, img)
    return img.decode().catch(() => undefined)
  })
  return Promise.all(jobs).then(() => undefined)
}

// ---------------------------------------------------------------------------
// Drawing helpers (all in points)

type Ctx = CanvasRenderingContext2D

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawIcon(ctx: Ctx, name: string, x: number, y: number, size: number) {
  const img = icons.get(name)
  ctx.save()
  rr(ctx, x, y, size, size, size * 0.225)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 1.5
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.restore()
  ctx.clip()
  if (img?.complete && img.naturalWidth) ctx.drawImage(img, x, y, size, size)
  // Glass rim, as on iOS 26 icons.
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  rr(ctx, x + 0.6, y + 0.6, size - 1.2, size - 1.2, size * 0.225)
  ctx.stroke()
  ctx.restore()
}

/** Wallpaper sampled through a blur and a white tint: the dock/search pill glass. */
function glass(ctx: Ctx, wall: HTMLCanvasElement, W: number, H: number, x: number, y: number, w: number, h: number, r: number) {
  ctx.save()
  rr(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.filter = 'blur(14px) saturate(1.6)'
  ctx.drawImage(wall, 0, 0, W, H)
  ctx.filter = 'none'
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  ctx.save()
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r)
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.stroke()
  ctx.restore()
}

/** The iPhone Duo status ring: Wi-Fi inside a battery ring, signal as dots along the bottom. */
function statusRing(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 3
  ctx.lineWidth = r * 0.085
  ctx.globalAlpha = 0.45
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI * 0.62, Math.PI * 2.38)
  ctx.stroke()
  ctx.globalAlpha = 1
  // Battery: the ring's lit arc, ~80%.
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI * 0.62, Math.PI * (0.62 + 1.76 * 0.8))
  ctx.stroke()
  // Wi-Fi
  const wy = cy + r * 0.12
  ctx.beginPath()
  ctx.moveTo(cx, wy)
  ctx.arc(cx, wy, r * 0.17, -Math.PI * 0.75, -Math.PI * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = r * 0.1
  ctx.lineCap = 'round'
  for (const k of [0.34, 0.52]) {
    ctx.beginPath()
    ctx.arc(cx, wy, r * k, -Math.PI * 0.75, -Math.PI * 0.25)
    ctx.stroke()
  }
  // Signal: four dots in the ring's gap.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (0.5 + (i - 1.5) * 0.085)
    ctx.globalAlpha = i < 3 ? 1 : 0.45
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98, r * 0.065, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function sun(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save()
  ctx.fillStyle = '#FFD60A'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#FFD60A'
  ctx.lineWidth = r * 0.28
  ctx.lineCap = 'round'
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45)
    ctx.lineTo(x + Math.cos(a) * r * 1.85, y + Math.sin(a) * r * 1.85)
    ctx.stroke()
  }
  ctx.restore()
}

function cloud(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x - s * 0.45, y + s * 0.1, s * 0.42, 0, Math.PI * 2)
  ctx.arc(x + s * 0.05, y - s * 0.15, s * 0.55, 0, Math.PI * 2)
  ctx.arc(x + s * 0.55, y + s * 0.12, s * 0.4, 0, Math.PI * 2)
  ctx.fill()
  rr(ctx, x - s * 0.85, y + s * 0.05, s * 1.8, s * 0.48, s * 0.24)
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Widgets

function weatherWidget(ctx: Ctx, x: number, y: number, size: number) {
  const k = size / 158
  ctx.save()
  rr(ctx, x, y, size, size, 22 * k)
  const g = ctx.createLinearGradient(0, y, 0, y + size)
  g.addColorStop(0, '#2A6DCB')
  g.addColorStop(1, '#5E9DE6')
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 15 * k)
  ctx.fillText('Cupertino', x + 15 * k, y + 27 * k)
  ctx.font = font(300, 44 * k)
  ctx.fillText('72°', x + 12 * k, y + 72 * k)
  sun(ctx, x + 22 * k, y + size - 52 * k, 4.6 * k)
  cloud(ctx, x + 28 * k, y + size - 48 * k, 8 * k)
  ctx.font = font(600, 12.5 * k)
  ctx.fillText('Partly Cloudy', x + 15 * k, y + size - 27 * k)
  ctx.fillText('H:78° L:59°', x + 15 * k, y + size - 11 * k)
  ctx.restore()
}

/** A Find My widget: a little map with a friend's location. */
function findMyWidget(ctx: Ctx, x: number, y: number, size: number) {
  const k = size / 158
  ctx.save()
  rr(ctx, x, y, size, size, 22 * k)
  ctx.fillStyle = '#EEF0E6'
  ctx.fill()
  ctx.clip()
  // Parks and water
  ctx.fillStyle = '#CDE8B8'
  ctx.beginPath()
  ctx.moveTo(x, y + size * 0.18)
  ctx.lineTo(x + size * 0.42, y + size * 0.05)
  ctx.lineTo(x + size * 0.56, y + size * 0.42)
  ctx.lineTo(x + size * 0.1, y + size * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#B3DBF4'
  ctx.beginPath()
  ctx.moveTo(x + size, y + size * 0.5)
  ctx.quadraticCurveTo(x + size * 0.8, y + size * 0.62, x + size * 0.86, y + size)
  ctx.lineTo(x + size, y + size)
  ctx.fill()
  // Streets
  const road = ([x0, y0, x1, y1]: number[], w: number, c: string) => {
    ctx.strokeStyle = c
    ctx.lineWidth = w * k
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + x0! * size, y + y0! * size)
    ctx.lineTo(x + x1! * size, y + y1! * size)
    ctx.stroke()
  }
  for (const [pts, w] of [
    [[-0.1, 0.32, 1.1, 0.12], 7],
    [[0.2, -0.1, 0.42, 1.1], 7],
    [[-0.1, 0.78, 1.1, 0.55], 5],
    [[0.72, -0.1, 0.95, 1.1], 5],
    [[-0.1, 0.05, 0.6, 1.1], 3.5],
  ] as [number[], number][]) {
    road(pts, w + 1.5, '#D9DBD2')
    road(pts, w, '#fff')
  }
  road([0.2, -0.1, 0.42, 1.1], 3, '#FFD466')
  // Friend
  const ax = x + size * 0.68
  const ay = y + size * 0.3
  const ar = 20 * k
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.arc(ax, ay + 1.5 * k, ar + 2.5 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(ax, ay, ar + 2.5 * k, 0, Math.PI * 2)
  ctx.fill()
  const ag = ctx.createLinearGradient(0, ay - ar, 0, ay + ar)
  ag.addColorStop(0, '#FFB86B')
  ag.addColorStop(1, '#FF7A59')
  ctx.fillStyle = ag
  ctx.beginPath()
  ctx.arc(ax, ay, ar, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 15 * k)
  ctx.textAlign = 'center'
  ctx.fillText('MC', ax, ay + 5.5 * k)
  ctx.textAlign = 'left'
  // Caption over a soft white fade
  const fade = ctx.createLinearGradient(0, y + size * 0.52, 0, y + size)
  fade.addColorStop(0, 'rgba(255,255,255,0)')
  fade.addColorStop(0.45, 'rgba(255,255,255,0.92)')
  fade.addColorStop(1, 'rgba(255,255,255,0.97)')
  ctx.fillStyle = fade
  ctx.fillRect(x, y + size * 0.52, size, size * 0.48)
  ctx.fillStyle = '#8a8a8e'
  ctx.font = font(500, 11 * k)
  ctx.fillText('Now', x + 14 * k, y + size - 44 * k)
  ctx.fillStyle = '#1c1c1e'
  ctx.font = font(600, 14 * k)
  ctx.fillText('Infinite Loop', x + 14 * k, y + size - 27 * k)
  ctx.font = font(400, 12 * k)
  ctx.fillText('Cupertino, CA', x + 14 * k, y + size - 11 * k)
  ctx.restore()
}

/** A Photos "On This Day" memory: a close-up of a pink cosmos against the sky. */
function memoryWidget(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  rr(ctx, x, y, w, h, 26)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, '#3E63C9')
  sky.addColorStop(0.55, '#6E8FE0')
  sky.addColorStop(1, '#9DB5EE')
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  // Out-of-focus meadow, other flowers and bokeh: shallow depth of field.
  ctx.save()
  ctx.filter = 'blur(7px)'
  for (const [bx, by, br] of [
    [0.16, 0.66, 0.16],
    [0.88, 0.58, 0.12],
    [0.3, 0.86, 0.2],
  ]) {
    ctx.fillStyle = 'rgba(236,92,160,0.85)'
    ctx.beginPath()
    ctx.arc(x + bx! * w, y + by! * h, br! * w, 0, Math.PI * 2)
    ctx.fill()
  }
  const meadow = ctx.createLinearGradient(0, y + h * 0.62, 0, y + h)
  meadow.addColorStop(0, 'rgba(126,170,92,0)')
  meadow.addColorStop(0.35, 'rgba(110,158,82,0.85)')
  meadow.addColorStop(1, '#3F6B35')
  ctx.fillStyle = meadow
  ctx.fillRect(x, y + h * 0.62, w, h * 0.38)
  const bokeh: [number, number, number, string][] = [
    [0.12, 0.2, 0.09, 'rgba(255,255,255,0.18)'],
    [0.86, 0.12, 0.06, 'rgba(255,255,255,0.14)'],
    [0.2, 0.72, 0.12, 'rgba(255,170,210,0.35)'],
    [0.9, 0.78, 0.1, 'rgba(255,200,120,0.3)'],
  ]
  for (const [bx, by, br, c] of bokeh) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(x + bx * w, y + by * h, br * w, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Stem
  ctx.strokeStyle = '#4E8A3C'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(x + w * 0.46, y + h)
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.7, x + w * 0.55, y + h * 0.44)
  ctx.stroke()
  // Flower
  const fx = x + w * 0.55
  const fy = y + h * 0.4
  const pr = w * 0.3
  ctx.save()
  ctx.shadowColor = 'rgba(20,30,80,0.35)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 6
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.2
    ctx.save()
    ctx.translate(fx, fy)
    ctx.rotate(a)
    const pg = ctx.createLinearGradient(0, 0, pr, 0)
    pg.addColorStop(0, '#A3124C')
    pg.addColorStop(0.3, '#E8408C')
    pg.addColorStop(0.8, '#FF9CC8')
    pg.addColorStop(1, '#FFD3E6')
    ctx.fillStyle = pg
    // A cosmos petal: broad, with a notched tip.
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(pr * 0.3, -pr * 0.26, pr * 0.85, -pr * 0.3, pr, -pr * 0.12)
    ctx.lineTo(pr * 0.9, 0)
    ctx.lineTo(pr, pr * 0.12)
    ctx.bezierCurveTo(pr * 0.85, pr * 0.3, pr * 0.3, pr * 0.26, 0, 0)
    ctx.fill()
    ctx.strokeStyle = 'rgba(150,20,80,0.25)'
    ctx.lineWidth = 0.8
    for (const k of [-0.08, 0, 0.08]) {
      ctx.beginPath()
      ctx.moveTo(pr * 0.15, 0)
      ctx.lineTo(pr * 0.85, pr * k)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
  const core = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, pr * 0.2)
  core.addColorStop(0, '#FFE680')
  core.addColorStop(0.6, '#F2B321')
  core.addColorStop(1, '#B3740F')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(fx, fy, pr * 0.19, 0, Math.PI * 2)
  ctx.fill()
  // Legibility scrim, caption, play button
  const scrim = ctx.createLinearGradient(0, y + h * 0.7, 0, y + h)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.38)')
  ctx.fillStyle = scrim
  ctx.fillRect(x, y + h * 0.7, w, h * 0.3)
  ctx.fillStyle = '#fff'
  ctx.font = font(700, 19)
  ctx.fillText('On This Day', x + 16, y + h - 36)
  ctx.font = font(600, 10.5)
  ctx.fillText('OCTOBER 24, 2025', x + 16, y + h - 18)
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath()
  ctx.arc(x + w - 32, y + h - 33, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(x + w - 37, y + h - 41)
  ctx.lineTo(x + w - 24, y + h - 33)
  ctx.lineTo(x + w - 37, y + h - 25)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Wallpaper: desert dunes under a pale sky, painted procedurally.

function ridge(ctx: Ctx, w: number, base: number, amp: number, seed: number) {
  ctx.beginPath()
  ctx.moveTo(0, base)
  for (let i = 0; i <= 120; i++) {
    const t = i / 120
    const n =
      Math.sin(t * 7.1 + seed) * 0.5 +
      Math.sin(t * 13.3 + seed * 2.1) * 0.28 +
      Math.sin(t * 29.7 + seed * 3.7) * 0.14 +
      Math.abs(Math.sin(t * 4.3 + seed * 0.7)) * 0.6
    ctx.lineTo(t * w, base - n * amp)
  }
}

export function paintWallpaper(ctx: Ctx, w: number, h: number, img: HTMLImageElement | null) {
  if (img) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih)
    return
  }
  const horizon = h * 0.5
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, '#6F95C4')
  sky.addColorStop(0.6, '#AFC4DA')
  sky.addColorStop(1, '#E6E1D6')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Two mountain ranges, the far one lost in haze.
  ridge(ctx, w, horizon + h * 0.01, h * 0.075, 1.3)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fillStyle = 'rgba(132,145,165,0.7)'
  ctx.fill()
  ridge(ctx, w, horizon + h * 0.07, h * 0.085, 4.2)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  const range = ctx.createLinearGradient(0, horizon - h * 0.05, 0, horizon + h * 0.12)
  range.addColorStop(0, '#6E6560')
  range.addColorStop(1, '#AE9F8C')
  ctx.fillStyle = range
  ctx.fill()

  // Dunes, back to front: a sunlit face above each crest line, shadow below it.
  const dunes: [number, number, number][] = [
    [0.62, 0.05, 0.4],
    [0.73, 0.08, 1.7],
    [0.86, 0.1, 3.1],
  ]
  for (const [base, amp, seed] of dunes) {
    const y0 = h * base
    const crest = (t: number) =>
      y0 - (Math.sin(t * Math.PI * 1.6 + seed) * 0.6 + Math.sin(t * Math.PI * 3.3 + seed * 1.7) * 0.4) * h * amp
    ctx.beginPath()
    ctx.moveTo(0, crest(0))
    for (let i = 1; i <= 100; i++) ctx.lineTo((i / 100) * w, crest(i / 100))
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, y0 - h * amp, 0, y0 + h * 0.16)
    g.addColorStop(0, '#F3E6CF')
    g.addColorStop(0.35, '#DEC6A0')
    g.addColorStop(1, '#BE9E73')
    ctx.fillStyle = g
    ctx.fill()
    // Crest highlight
    ctx.save()
    ctx.filter = `blur(${Math.max(1, h / 300)}px)`
    ctx.strokeStyle = 'rgba(255,250,240,0.55)'
    ctx.lineWidth = h / 260
    ctx.beginPath()
    ctx.moveTo(0, crest(0))
    for (let i = 1; i <= 100; i++) ctx.lineTo((i / 100) * w, crest(i / 100))
    ctx.stroke()
    ctx.restore()
  }

  // Wind ripples in the sand.
  ctx.save()
  ctx.lineWidth = Math.max(1, h / 700)
  for (let i = 0; i < 80; i++) {
    const y = h * (0.62 + (i / 80) * 0.4)
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(110,80,40,0.08)'
    ctx.beginPath()
    for (let j = 0; j <= 60; j++) {
      const t = j / 60
      const yy = y + Math.sin(t * 9 + i * 0.7) * h * 0.006 + Math.sin(t * 2.3 + i) * h * 0.012
      if (j) ctx.lineTo(t * w, yy)
      else ctx.moveTo(0, yy)
    }
    ctx.stroke()
  }
  ctx.restore()

  // A soft vignette keeps white type legible at the top.
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.3)
  top.addColorStop(0, 'rgba(40,60,90,0.18)')
  top.addColorStop(1, 'rgba(40,60,90,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, w, h * 0.3)
}

// ---------------------------------------------------------------------------
// Home screens

export interface HomeSpec {
  kind: 'cover' | 'inner'
  /** Canvas size in pixels. */
  w: number
  h: number
}

/**
 * Where the cover's camera sits, as fractions of the cover screen. The demo
 * draws the punch-hole there, and the home screen keeps it clear.
 */
export const COVER_CAMERA = { x: 0.857, y: 0.05, d: 0.07 } as const

/**
 * One wallpaper for both screens, painted at the inner screen's size. The cover
 * shows the half it lies over when closed, so the picture lines up across the
 * hand-off instead of jumping.
 */
export function sharedWallpaper(inner: HomeSpec, img: HTMLImageElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = inner.w
  c.height = inner.h
  paintWallpaper(c.getContext('2d')!, inner.w, inner.h, img)
  return c
}

export function paintHome(spec: HomeSpec, shared: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = spec.w
  c.height = spec.h
  const wall = document.createElement('canvas')
  wall.width = spec.w
  wall.height = spec.h
  const wctx = wall.getContext('2d')!
  if (spec.kind === 'inner') {
    wctx.drawImage(shared, 0, 0, spec.w, spec.h)
  } else {
    // The half next to the hinge, cover-fitted (the two are within 3% in aspect).
    const sw = shared.width / 2
    const sh = shared.height
    const s = Math.max(spec.w / sw, spec.h / sh)
    const cw = spec.w / s
    const ch = spec.h / s
    wctx.drawImage(shared, sw + (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, spec.w, spec.h)
  }

  const ctx = c.getContext('2d')!
  ctx.drawImage(wall, 0, 0)
  ctx.scale(PX_PER_PT, PX_PER_PT)
  const W = spec.w / PX_PER_PT
  const H = spec.h / PX_PER_PT
  const glassAt = (x: number, y: number, w: number, h: number, r: number) => glass(ctx, wall, W, H, x, y, w, h, r)
  if (spec.kind === 'cover') {
    paintPage(ctx, glassAt, 0, W, H, true)
  } else {
    // iPhone Duo's inner home screen: the cover's page on the half it covers
    // when closed, so nothing moves under your thumb, and a large widget on
    // the half that unfolds.
    const half = W / 2
    paintPage(ctx, glassAt, half, half, H, false)
    const top = H * 0.12
    memoryWidget(ctx, half * 0.153, top, half * 0.7, H * 0.872 - top)
  }
  return c
}

type GlassAt = (x: number, y: number, w: number, h: number, r: number) => void

/**
 * One home screen page, laid out as fractions of its size (measured from
 * Apple's iPhone Duo films): two widgets over a 4×4 grid, and a right-hand
 * column with the time, the status ring, a vertical dock and Search.
 */
function paintPage(ctx: Ctx, glassAt: GlassAt, ox: number, w: number, h: number, cover: boolean) {
  const icon = w * 0.146
  const cx = (col: number) => ox + w * (0.117 + 0.176 * col)
  const cy = (row: number) => h * (0.43 + 0.13 * row)
  const widget = w * 0.322
  const top = h * 0.12
  weatherWidget(ctx, cx(0) - icon / 2, top, widget)
  findMyWidget(ctx, cx(2) - icon / 2, top, widget)
  const apps = [
    ['FaceTime', 'Calendar', 'Photos', 'Camera'],
    ['Mail', 'Notes', 'Clock', 'Maps'],
    ['TV', 'News', 'App Store', 'Podcasts'],
    ['Health', 'Wallet', 'Books', 'Settings'],
  ]
  apps.forEach((row, r) => row.forEach((name, i) => drawIcon(ctx, name, cx(i) - icon / 2, cy(r) - icon / 2, icon)))

  // Page dots under the grid.
  ctx.fillStyle = '#fff'
  ;[0, 1].forEach((i) => {
    ctx.globalAlpha = i ? 0.45 : 1
    ctx.beginPath()
    ctx.arc(ox + w * 0.37 + i * 11, h * 0.93, 3.2, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // Right-hand column. On the cover, the camera sits at its top.
  const rx = ox + w * COVER_CAMERA.x
  const timeY = cover ? h * 0.118 : h * 0.06
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 15)
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 3
  ctx.fillText('9:41', rx, timeY)
  ctx.restore()
  statusRing(ctx, rx, timeY + h * (cover ? 0.052 : 0.056), w * 0.043)

  const di = w * 0.108
  const dockW = w * 0.159
  const gap = di * 0.24
  const dockH = 4 * di + 5 * gap
  const dockY = h * 0.51 - dockH / 2
  glassAt(rx - dockW / 2, dockY, dockW, dockH, dockW / 2)
  ;['Phone', 'Safari', 'Messages', 'Music'].forEach((name, i) =>
    drawIcon(ctx, name, rx - di / 2, dockY + gap + i * (di + gap), di),
  )

  // Search
  const sr = w * 0.05
  const sy = h * 0.927
  glassAt(rx - sr, sy - sr, sr * 2, sr * 2, sr)
  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(rx - 1.5, sy - 1.5, sr * 0.3, 0, Math.PI * 2)
  ctx.moveTo(rx + sr * 0.14, sy + sr * 0.14)
  ctx.lineTo(rx + sr * 0.36, sy + sr * 0.36)
  ctx.stroke()
  ctx.restore()
}
