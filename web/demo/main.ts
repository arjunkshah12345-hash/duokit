import { UnfoldRenderer, classify, playUnfold, type DuoInput, type DuoState, type Playback } from '../src'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// ---------------------------------------------------------------------------
// Screen content: a home screen painted at half the Duo's native resolution.

const COVER = { w: 699, h: 1017, cols: 4, rows: 6 }
const INNER = { w: 1335, h: 939, cols: 8, rows: 4 }

const ICONS = ['#ff6b5e', '#ffb340', '#ffd84d', '#4cd97b', '#3ec7e0', '#4a8dff', '#8b6bff', '#ff5fa8', '#f2f1ee', '#2b2b30']

function paintWallpaper(ctx: CanvasRenderingContext2D, w: number, h: number, img: HTMLImageElement | null) {
  if (img) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih)
    return
  }
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#0d1b3d')
  g.addColorStop(0.5, '#2a1458')
  g.addColorStop(1, '#5a1236')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const blobs: [number, number, number, string][] = [
    [0.3, 0.35, 0.55, 'rgba(255,120,80,0.75)'],
    [0.72, 0.6, 0.5, 'rgba(70,140,255,0.7)'],
    [0.5, 0.9, 0.45, 'rgba(255,70,170,0.55)'],
    [0.85, 0.15, 0.35, 'rgba(255,210,90,0.5)'],
  ]
  const m = Math.max(w, h)
  for (const [x, y, r, c] of blobs) {
    const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * m)
    rg.addColorStop(0, c)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function paintHome(spec: typeof COVER, img: HTMLImageElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = spec.w
  c.height = spec.h
  const ctx = c.getContext('2d')!
  paintWallpaper(ctx, spec.w, spec.h, img)

  const unit = Math.min(spec.w / spec.cols, spec.h / (spec.rows + 2.4))
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.textAlign = 'center'
  ctx.font = `600 ${unit * 0.95}px -apple-system, system-ui, sans-serif`
  ctx.fillText('9:41', spec.w / 2, unit * 1.25)
  ctx.font = `500 ${unit * 0.22}px -apple-system, system-ui, sans-serif`
  ctx.fillText('Saturday, October 24', spec.w / 2, unit * 1.62)

  const icon = unit * 0.62
  const gx = spec.w / spec.cols
  const top = unit * 2.1
  const gy = (spec.h - top - unit * 1.3) / spec.rows
  let k = 0
  for (let r = 0; r < spec.rows - 1; r++) {
    for (let col = 0; col < spec.cols; col++) {
      ctx.fillStyle = ICONS[(k++ * 7 + r) % ICONS.length]!
      roundRect(ctx, col * gx + (gx - icon) / 2, top + r * gy + (gy - icon) / 2, icon, icon, icon * 0.23)
    }
  }
  // Dock
  const dockH = icon * 1.35
  const dockW = Math.min(spec.w - unit * 0.4, gx * Math.min(spec.cols, 6))
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, (spec.w - dockW) / 2, spec.h - dockH - unit * 0.25, dockW, dockH, dockH * 0.38)
  const dockN = Math.min(spec.cols, 6)
  for (let i = 0; i < dockN; i++) {
    ctx.fillStyle = ICONS[(i * 3 + 1) % ICONS.length]!
    const step = dockW / dockN
    roundRect(ctx, (spec.w - dockW) / 2 + i * step + (step - icon) / 2, spec.h - dockH - unit * 0.25 + (dockH - icon) / 2, icon, icon, icon * 0.23)
  }
  return c
}

// ---------------------------------------------------------------------------
// Unfold section

const coverGL = new UnfoldRenderer($<HTMLCanvasElement>('coverGL'), { role: 'cover' })
const innerGL = new UnfoldRenderer($<HTMLCanvasElement>('innerGL'), { role: 'inner' })
const faces = {
  cover: $<HTMLCanvasElement>('coverFace'),
  left: $<HTMLCanvasElement>('innerLeft'),
  right: $<HTMLCanvasElement>('innerRight'),
}
const moving = $<HTMLDivElement>('moving')
const fixed = document.querySelector<HTMLDivElement>('.half.fixed')!
let tilted = false
const slider = $<HTMLInputElement>('angle')
const out = $<HTMLOutputElement>('angleOut')

let wallpaper: HTMLImageElement | null = null
let angle = 0
let playback: Playback | null = null

function loadContent() {
  coverGL.setSource(paintHome(COVER, wallpaper))
  innerGL.setSource(paintHome(INNER, wallpaper))
  draw(angle)
}

function blit(dst: HTMLCanvasElement, src: HTMLCanvasElement, sx: number, sw: number) {
  const dpr = Math.min(devicePixelRatio || 1, 2)
  dst.width = Math.round(dst.clientWidth * dpr)
  dst.height = Math.round(dst.clientHeight * dpr)
  const ctx = dst.getContext('2d')!
  ctx.drawImage(src, sx * src.width, 0, sw * src.width, src.height, 0, 0, dst.width, dst.height)
}

function draw(a: number) {
  angle = a
  slider.value = String(a)
  out.textContent = `${a.toFixed(0)}°`
  coverGL.render(a)
  innerGL.render(a)
  // 3D preview: the moving half swings about the hinge; cover on its back.
  const tilt = tilted ? 'rotateX(14deg) rotateY(-28deg) ' : ''
  fixed.style.transform = `${tilt}translateZ(-1px)`
  moving.style.transform = `${tilt}rotateY(${180 - a}deg)`
  blit(faces.cover, coverGL.canvas, 0, 1)
  blit(faces.left, innerGL.canvas, 0, 0.5)
  blit(faces.right, innerGL.canvas, 0.5, 0.5)
}

slider.addEventListener('input', () => {
  playback?.cancel()
  draw(Number(slider.value))
})

function play(reverse: boolean) {
  playback?.cancel()
  if (!reverse && angle > 170) draw(0)
  if (reverse && angle < 10) draw(180)
  playback = playUnfold({ duration: 1400, reverse, onFrame: draw })
}
$('play').addEventListener('click', () => play(false))
$('playClose').addEventListener('click', () => play(true))
$<HTMLInputElement>('tilt').addEventListener('change', (e) => {
  tilted = (e.target as HTMLInputElement).checked
  draw(angle)
})
$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    wallpaper = img
    loadContent()
  }
  img.src = URL.createObjectURL(file)
})
addEventListener('resize', () => draw(angle))

loadContent()
// Open once on load so the page explains itself.
setTimeout(() => play(false), 500)

// ---------------------------------------------------------------------------
// Layout section: the same classify() + split logic as <DuoSplit>, on
// simulated inputs for each posture.

const SCENARIOS: { name: string; input: DuoInput; bend?: number }[] = [
  { name: 'iPhone 17 Pro', input: { viewport: { width: 402, height: 874 }, screen: { width: 402, height: 874 } } },
  { name: 'Duo · cover', input: { viewport: { width: 466, height: 678 }, screen: { width: 466, height: 678 } } },
  {
    name: 'Duo · inner, flat',
    input: { viewport: { width: 890, height: 626 }, screen: { width: 890, height: 626 }, devicePosture: 'continuous' },
  },
  {
    name: 'Duo · book',
    bend: -12,
    input: {
      viewport: { width: 890, height: 626 },
      screen: { width: 890, height: 626 },
      devicePosture: 'folded',
      segments: [
        { x: 0, y: 0, width: 437, height: 626 },
        { x: 453, y: 0, width: 437, height: 626 },
      ],
    },
  },
  {
    name: 'Duo · tabletop',
    input: {
      viewport: { width: 626, height: 890 },
      screen: { width: 626, height: 890 },
      devicePosture: 'folded',
      segments: [
        { x: 0, y: 0, width: 626, height: 437 },
        { x: 0, y: 453, width: 626, height: 437 },
      ],
    },
  },
]

const K = 0.36
const COLORS = ['#ff6b5e', '#4a8dff', '#4cd97b', '#ffb340', '#8b6bff', '#3ec7e0', '#ff5fa8']

function listPane(): string {
  const rows = COLORS.map((c, i) => `<div class="row${i === 1 ? ' sel' : ''}" style="--c:${c}"><i></i><span></span></div>`)
  return `<div class="pane list"><h4>Inbox</h4>${rows.join('')}</div>`
}
function detailPane(): string {
  const bars = [90, 70, 95, 60, 85, 40].map((w) => `<div class="bar" style="width:${w}%"></div>`)
  return `<div class="pane detail"><h4>Design review</h4>${bars.join('')}</div>`
}

function renderApp(s: DuoState): string {
  if (s.display !== 'inner' || !s.fold) return `<div class="app">${listPane()}</div>`
  const f = s.fold
  const vertical = s.foldAxis === 'vertical'
  const gap = Math.max((vertical ? f.width : f.height) * K, 1)
  const track = `${(vertical ? f.x : f.y) * K}px ${gap}px minmax(0,1fr)`
  const prop = vertical ? 'grid-template-columns' : 'grid-template-rows'
  return `<div class="app" style="${prop}:${track}">${listPane()}<div class="foldline" style="--dir:${vertical ? '0deg' : '90deg'}"></div>${detailPane()}</div>`
}

$('devices').innerHTML = SCENARIOS.map(({ name, input, bend }) => {
  const s = classify(input)
  const { width, height } = input.viewport
  const summary = `display: ${s.display}\nposture: ${s.posture}\nfold:    ${s.fold ? `${s.foldAxis} @ ${s.foldAxis === 'vertical' ? s.fold.x : s.fold.y}px` : 'none'}`
  return `<figure class="device">
    <div class="frame${bend ? ' bent' : ''}" style="width:${width * K}px;height:${height * K}px;${bend ? `--bend:${bend}deg` : ''}">${renderApp(s)}</div>
    <figcaption><b>${name}</b><div class="state">${summary}</div></figcaption>
  </figure>`
}).join('')
