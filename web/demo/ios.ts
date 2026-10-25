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

function drawIcon(ctx: Ctx, name: string, x: number, y: number, size: number, label: boolean) {
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
  if (!label) return
  ctx.save()
  ctx.font = font(500, 12)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 4
  ctx.fillText(name, x + size / 2, y + size + 15)
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

function statusIcons(ctx: Ctx, right: number, cy: number, color = '#fff') {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  // Battery
  const bw = 25
  const bx = right - bw - 2
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  rr(ctx, bx + 0.5, cy - 6, bw - 1, 12, 4)
  ctx.stroke()
  rr(ctx, bx + bw, cy - 2, 1.6, 4, 1)
  ctx.fill()
  ctx.globalAlpha = 1
  rr(ctx, bx + 2, cy - 4, (bw - 4) * 0.82, 8, 2.2)
  ctx.fill()
  // Wi-Fi
  const wx = bx - 13
  const wy = cy + 5.5
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.arc(wx, wy, 3.6, -Math.PI * 0.75, -Math.PI * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = 2.1
  for (const r of [7.2, 11]) {
    ctx.beginPath()
    ctx.arc(wx, wy, r, -Math.PI * 0.75, -Math.PI * 0.25)
    ctx.stroke()
  }
  // Signal
  const sx = wx - 32
  for (let i = 0; i < 4; i++) {
    const h = 4 + i * 2.4
    rr(ctx, sx + i * 4.6, cy + 5.5 - h, 3.2, h, 1)
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

function weatherWidget(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  rr(ctx, x, y, w, h, 22)
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#2C78D8')
  g.addColorStop(1, '#5DAAEF')
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 15)
  ctx.fillText('Cupertino', x + 16, y + 28)
  ctx.font = font(300, 46)
  ctx.fillText('72°', x + 13, y + 76)
  const wide = w > 250
  if (!wide) {
    sun(ctx, x + 23, y + h - 50, 6)
    ctx.font = font(600, 13)
    ctx.fillText('Sunny', x + 16, y + h - 28)
    ctx.fillText('H:78° L:59°', x + 16, y + h - 12)
  } else {
    ctx.textAlign = 'right'
    sun(ctx, x + w - 24, y + 24, 7)
    ctx.font = font(600, 13)
    ctx.fillText('Sunny', x + w - 16, y + 56)
    ctx.fillText('H:78° L:59°', x + w - 16, y + 73)
    ctx.textAlign = 'center'
    const hours = ['Now', '11AM', '12PM', '1PM', '2PM', '3PM']
    const temps = [72, 74, 76, 78, 77, 75]
    const col = (w - 24) / hours.length
    hours.forEach((t, i) => {
      const cx = x + 12 + col * (i + 0.5)
      ctx.font = font(600, 12)
      ctx.globalAlpha = 0.85
      ctx.fillText(t, cx, y + h - 54)
      ctx.globalAlpha = 1
      if (i === 4) cloud(ctx, cx, y + h - 36, 9)
      else sun(ctx, cx, y + h - 34, 5.5)
      ctx.font = font(600, 14)
      ctx.fillText(`${temps[i]}°`, cx, y + h - 11)
    })
  }
  ctx.restore()
}

function calendarWidget(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  rr(ctx, x, y, w, h, 22)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#FF3B30'
  ctx.font = font(600, 12)
  ctx.fillText('SATURDAY', x + 16, y + 26)
  ctx.fillStyle = '#1c1c1e'
  ctx.font = font(400, 38)
  ctx.fillText('24', x + 14, y + 64)
  const events: [string, string, string][] = [
    ['Design review', '10:00–11:00 AM', '#AF52DE'],
    ['Lunch with Maya', '12:30–1:30 PM', '#34C759'],
  ]
  events.forEach(([title, time, color], i) => {
    const ey = y + 80 + i * 38
    if (ey + 32 > y + h) return
    ctx.fillStyle = color
    rr(ctx, x + 16, ey, 3.5, 31, 2)
    ctx.fill()
    ctx.fillStyle = '#1c1c1e'
    ctx.font = font(600, 13)
    ctx.fillText(title, x + 25, ey + 13)
    ctx.fillStyle = '#8e8e93'
    ctx.font = font(400, 12)
    ctx.fillText(time, x + 25, ey + 28)
  })
  ctx.restore()
}

function photosWidget(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  rr(ctx, x, y, w, h, 22)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, '#FFB46E')
  sky.addColorStop(0.5, '#FF6F7D')
  sky.addColorStop(0.62, '#5A4C9C')
  sky.addColorStop(1, '#22305E')
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(255,236,170,0.95)'
  ctx.beginPath()
  ctx.arc(x + w * 0.62, y + h * 0.55, w * 0.13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2B2346'
  ctx.beginPath()
  ctx.moveTo(x, y + h * 0.6)
  ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.42, x + w * 0.5, y + h * 0.6)
  ctx.lineTo(x, y + h)
  ctx.fill()
  ctx.fillStyle = 'rgba(20,24,52,0.9)'
  ctx.fillRect(x, y + h * 0.62, w, h)
  ctx.fillStyle = 'rgba(255,214,150,0.5)'
  for (let i = 0; i < 6; i++) ctx.fillRect(x + w * (0.52 + Math.sin(i) * 0.04), y + h * (0.66 + i * 0.045), w * (0.2 - i * 0.025), 1.6)
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 4
  ctx.font = font(600, 13)
  ctx.fillText('On This Day', x + 14, y + h - 28)
  ctx.font = font(400, 12)
  ctx.fillText('Oct 24, 2023', x + 14, y + h - 12)
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Wallpaper

export function paintWallpaper(ctx: Ctx, w: number, h: number, img: HTMLImageElement | null) {
  if (img) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih)
    return
  }
  const g = ctx.createLinearGradient(0, 0, w * 0.6, h)
  g.addColorStop(0, '#0E2A6B')
  g.addColorStop(0.55, '#3B2A86')
  g.addColorStop(1, '#8C2F6E')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const m = Math.max(w, h)
  const blobs: [number, number, number, string][] = [
    [0.2, 0.25, 0.6, 'rgba(64,140,255,0.75)'],
    [0.85, 0.2, 0.45, 'rgba(255,150,90,0.6)'],
    [0.7, 0.75, 0.55, 'rgba(255,80,150,0.55)'],
    [0.15, 0.95, 0.45, 'rgba(120,90,255,0.6)'],
  ]
  for (const [x, y, r, c] of blobs) {
    const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * m)
    rg.addColorStop(0, c)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
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
  if (spec.kind === 'cover') paintCover(ctx, wall, W, H)
  else paintInner(ctx, wall, W, H)
  return c
}

function paintCover(ctx: Ctx, wall: HTMLCanvasElement, W: number, H: number) {
  // Status bar either side of the Dynamic Island (29% wide, centred ~37pt down).
  const cy = H * 0.026 + (W * 0.29) / 3.4 / 2
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 17)
  ctx.textAlign = 'center'
  ctx.fillText('9:41', W * 0.18, cy + 6)
  ctx.textAlign = 'left'
  statusIcons(ctx, W - W * 0.09, cy)

  const m = 26
  const icon = 62
  const px = (W - 2 * m) / 4
  const py = 94
  const top = 76
  const ix = (col: number) => m + col * px + (px - icon) / 2
  const iy = (row: number) => top + row * py

  weatherWidget(ctx, ix(0), iy(0), px + icon, py + icon)
  calendarWidget(ctx, ix(2), iy(0), px + icon, py + icon)
  const apps = ['FaceTime', 'Calendar', 'Photos', 'Camera', 'Mail', 'Clock', 'Maps', 'Weather', 'Notes', 'Reminders', 'App Store', 'Settings']
  apps.forEach((name, i) => drawIcon(ctx, name, ix(i % 4), iy(2 + Math.floor(i / 4)), icon, true))

  const dockH = 88
  const dockY = H - dockH - 9
  // Search pill
  const pw = 78
  const pillY = dockY - 34
  glass(ctx, wall, W, H, (W - pw) / 2, pillY, pw, 25, 12.5)
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc((W - pw) / 2 + 15, pillY + 11.5, 4, 0, Math.PI * 2)
  ctx.moveTo((W - pw) / 2 + 18, pillY + 14.5)
  ctx.lineTo((W - pw) / 2 + 21, pillY + 17.5)
  ctx.stroke()
  ctx.font = font(600, 13)
  ctx.fillText('Search', (W - pw) / 2 + 26, pillY + 17)
  ctx.restore()

  glass(ctx, wall, W, H, 9, dockY, W - 18, dockH, 34)
  ;['Phone', 'Safari', 'Messages', 'Music'].forEach((name, i) => drawIcon(ctx, name, ix(i), dockY + (dockH - icon) / 2, icon, false))
}

function paintInner(ctx: Ctx, wall: HTMLCanvasElement, W: number, H: number) {
  // iPad-style status bar: time and date on the left. The camera is under the display.
  ctx.fillStyle = '#fff'
  ctx.font = font(600, 15)
  ctx.fillText('9:41', 26, 22)
  ctx.font = font(500, 15)
  ctx.fillText('Sat Oct 24', 26 + ctx.measureText('9:41 ').width + 2, 22)
  statusIcons(ctx, W - 22, 17)

  const m = 40
  const icon = 64
  const px = (W - 2 * m) / 8
  const py = 114
  const top = 50
  const ix = (col: number) => m + col * px + (px - icon) / 2
  const iy = (row: number) => top + row * py

  // Widgets on the left half, apps on the right half.
  weatherWidget(ctx, ix(0), iy(0), 3 * px + icon, py + icon)
  calendarWidget(ctx, ix(0), iy(2), px + icon, py + icon)
  photosWidget(ctx, ix(2), iy(2), px + icon, py + icon)
  const apps = ['FaceTime', 'Calendar', 'Photos', 'Camera', 'Mail', 'Notes', 'Reminders', 'Clock', 'Maps', 'Weather', 'Books', 'App Store', 'Podcasts', 'Health', 'Wallet', 'Settings']
  apps.forEach((name, i) => drawIcon(ctx, name, ix(4 + (i % 4)), iy(Math.floor(i / 4)), icon, true))

  // Page dots
  ctx.fillStyle = '#fff'
  ;[0, 1].forEach((i) => {
    ctx.globalAlpha = i ? 0.45 : 1
    ctx.beginPath()
    ctx.arc(W / 2 - 6 + i * 12, H - 118, 3.5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // Dock: eight apps, a divider, two recents.
  const dock = ['Phone', 'Safari', 'Messages', 'Music', 'Files', 'Find My', 'Photos', 'Mail']
  const recents = ['Fitness', 'Stocks']
  const di = 58
  const gap = 15
  const pad = 14
  const n = dock.length + recents.length
  const dw = pad * 2 + n * di + (n - 1) * gap + gap + 1
  const dh = di + pad * 2
  const dx = (W - dw) / 2
  const dy = H - dh - 12
  glass(ctx, wall, W, H, dx, dy, dw, dh, 28)
  let x = dx + pad
  dock.forEach((name) => {
    drawIcon(ctx, name, x, dy + pad, di, false)
    x += di + gap
  })
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(x - gap / 2 + 2, dy + pad + 6, 1, di - 12)
  x += gap
  recents.forEach((name) => {
    drawIcon(ctx, name, x, dy + pad, di, false)
    x += di + gap
  })
}
