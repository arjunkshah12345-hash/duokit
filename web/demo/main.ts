import { UnfoldRenderer, classify, playUnfold, type DuoInput, type DuoState, type Playback } from '../src'
import { loadIcons, paintHome, sharedWallpaper } from './ios'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

// Screen content: an iOS home screen painted at half the Duo's native resolution.
const COVER = { kind: 'cover', w: 699, h: 1017 } as const
const INNER = { kind: 'inner', w: 1335, h: 939 } as const

// ---------------------------------------------------------------------------
// Unfold section

const coverGL = new UnfoldRenderer($<HTMLCanvasElement>('coverGL'), { role: 'cover' })
const innerGL = new UnfoldRenderer($<HTMLCanvasElement>('innerGL'), { role: 'inner' })
const faces = {
  cover: $<HTMLCanvasElement>('coverFace'),
  left: $<HTMLCanvasElement>('innerLeft'),
  right: $<HTMLCanvasElement>('innerRight'),
}
const phone = $<HTMLDivElement>('phone')
const moving = $<HTMLDivElement>('moving')
const fixed = $<HTMLDivElement>('fixed')
let tilted = false
const slider = $<HTMLInputElement>('angle')
const out = $<HTMLOutputElement>('angleOut')

let wallpaper: HTMLImageElement | null = null
let angle = 0
let playback: Playback | null = null

function loadContent() {
  const wall = sharedWallpaper(INNER, wallpaper)
  coverGL.setSource(paintHome(COVER, wall))
  innerGL.setSource(paintHome(INNER, wall))
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
  // Lighting: each face darkens as it turns away from the viewer, and the
  // fixed half falls into the moving half's shadow near the hinge.
  const rad = (d: number) => (d * Math.PI) / 180
  phone.style.setProperty('--lit-front', String(((1 - Math.cos(rad(180 - a))) / 2) * 0.3))
  phone.style.setProperty('--lit-back', String(((1 - Math.cos(rad(a))) / 2) * 0.3))
  phone.style.setProperty('--occlude', String(Math.max(0, 1 - a / 150) ** 2 * 0.6))
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
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=finish]')) {
  radio.addEventListener('change', () => {
    phone.dataset.finish = radio.value
    $('finishName').textContent = radio.getAttribute('aria-label')
  })
}
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
loadIcons().then(loadContent)
// Open once on load so the page explains itself.
setTimeout(() => play(false), 500)

// ---------------------------------------------------------------------------
// Layout section: the same classify() + split logic as <DuoSplit>, on
// simulated inputs for each posture.

const SCENARIOS: { name: string; input: DuoInput; bend?: number; island?: boolean }[] = [
  { name: 'iPhone 17 Pro', island: true, input: { viewport: { width: 402, height: 874 }, screen: { width: 402, height: 874 } } },
  { name: 'Duo · cover', island: true, input: { viewport: { width: 466, height: 678 }, screen: { width: 466, height: 678 } } },
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

// A Mail-style app at real iOS point sizes, scaled down into each frame.
const MAILS = [
  { from: 'Maya Chen', time: '9:41 AM', subject: 'Design review notes', preview: 'Great session today. I pulled the open questions from the fold layouts into one doc so we can…', unread: true },
  { from: 'GitHub', time: '9:12 AM', subject: '[duokit] CI passed on main', preview: 'All checks have passed: swift ✓ web ✓. View the workflow run for details.', unread: false },
  { from: 'Apple Developer', time: '8:30 AM', subject: 'Get your app ready for iPhone Duo', preview: 'Adapt your layouts for the cover and inner displays, and respond to hinge posture changes…', unread: true },
  { from: 'Jordan Lee', time: 'Yesterday', subject: 'Dinner Saturday?', preview: 'We’re thinking 7:30 at the usual place. Let me know if that works for you two.', unread: false },
  { from: 'Figma', time: 'Yesterday', subject: 'Maya commented on Duo Mail', preview: '“Can the toolbar sit on the bottom half in tabletop?”', unread: false },
  { from: 'Sam Rivera', time: 'Thursday', subject: 'Photos from the trip', preview: 'Uploaded everything to the shared album. The sunset ones came out amazing.', unread: false },
  { from: 'Calendar', time: 'Thursday', subject: 'Invitation: Hinge sync', preview: 'Friday, Oct 30 · 10:00 – 10:30 AM · Join with FaceTime', unread: false },
]

const STATUS_ICONS = `<svg class="sb-icons" width="68" height="13" viewBox="0 0 68 13" fill="currentColor"><rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="4.6" y="5.6" width="3.2" height="6.4" rx="1"/><rect x="9.2" y="3.2" width="3.2" height="8.8" rx="1"/><rect x="13.8" y="0.8" width="3.2" height="11.2" rx="1"/><path d="M30.5 12.2l-2.6-2.6a3.7 3.7 0 0 1 5.2 0zM26 7.8a6.3 6.3 0 0 1 9 0l1.7-1.7a8.7 8.7 0 0 0-12.4 0zM22.7 4.4a11 11 0 0 1 15.6 0L40 2.7a13.4 13.4 0 0 0-19 0z"/><rect x="43.5" y="0.5" width="21.5" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="45.5" y="2.5" width="15" height="8" rx="2.2"/><path d="M66.3 4.5v4a2.2 2.2 0 0 0 0-4z" fill-opacity=".4"/></svg>`

const svgIcon = (d: string) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const I = {
  compose: svgIcon('<path d="M20 12.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6.5"/><path d="M17.5 3.5l3 3L12 15l-4 1 1-4z"/>'),
  flag: svgIcon('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  folder: svgIcon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  trash: svgIcon('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  reply: svgIcon('<path d="M10 8L4 13l6 5M4 13h10a6 6 0 0 1 6 6"/>'),
  search: svgIcon('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
}

function listPane(selected: boolean, style = ''): string {
  const rows = MAILS.map(
    (m, i) => `<div class="mail${selected && i === 0 ? ' sel' : ''}">
      <i class="dot${m.unread ? '' : ' read'}"></i>
      <div class="m"><div class="m1"><b>${m.from}</b><span>${m.time} <em>›</em></span></div><div class="m2">${m.subject}</div><div class="m3">${m.preview}</div></div>
    </div>`,
  )
  return `<div class="pane list" style="${style}">
    <div class="nav"><span>‹ Mailboxes</span><span>Edit</span></div>
    <h1>Inbox</h1>
    <div class="search">${I.search}<span>Search</span></div>
    ${rows.join('')}
    <div class="tb"><span></span><span class="tb-c">Updated Just Now<small>3 Unread</small></span><span class="tb-r">${I.compose}</span></div>
  </div>`
}

function detailPane(below: boolean, style = ''): string {
  return `<div class="pane detail${below ? ' below' : ''}" style="${style}">
    <div class="dhead"><i class="av">MC</i><div class="who"><b>Maya Chen</b><span>To: You</span></div><span class="when">9:41 AM</span></div>
    <h2>Design review notes</h2>
    <p>Hi all,</p>
    <p>Great session today. On the cover screen the inbox stays a single column; open the phone and the message slides in beside it, never under the hinge.</p>
    <p>In tabletop the message reads on the top half and the reply controls drop to the bottom half, like the Camera app.</p>
    <div class="attach"><i></i><div><b>fold-layouts.png</b><span>2.4 MB</span></div></div>
    <div class="tb dtb">${I.flag}${I.folder}${I.trash}${I.reply}${I.compose}</div>
  </div>`
}

function renderApp(s: DuoState, island: boolean): string {
  const { width, height } = s.viewport
  const sb = island
    ? `<div class="sb notch"><b>9:41</b><span></span>${STATUS_ICONS}</div>`
    : `<div class="sb"><b>9:41</b><span class="sb-date">Sat Oct 24</span>${STATUS_ICONS}</div>`
  let body: string
  if (s.display !== 'inner' || !s.fold) {
    body = `<div class="ios-grid">${listPane(false)}</div>`
  } else {
    const f = s.fold
    const vertical = s.foldAxis === 'vertical'
    // Flat: the panes meet with a hairline. Bent: leave the hinge region empty.
    const gap = s.foldIsOccluding ? `${vertical ? f.width : f.height}px` : '0.5px'
    const at = vertical ? f.x : f.y
    const prop = vertical ? 'grid-template-columns' : 'grid-template-rows'
    const track = vertical ? 'grid-column' : 'grid-row'
    body = `<div class="ios-grid" style="${prop}:${at}px ${gap} minmax(0,1fr)">${listPane(true, `${track}:1${vertical ? '' : ';--tbh:50px'}`)}<div class="gap${s.foldIsOccluding ? ' hinge' : ''}" style="${track}:2"></div>${detailPane(!vertical, `${track}:3`)}</div>`
  }
  return `<div class="ios${island ? ' has-island' : ''}" style="width:${width}px;height:${height}px;transform:scale(${K})">${sb}${body}<i class="hi"></i></div>`
}

$('devices').innerHTML = SCENARIOS.map(({ name, input, bend, island }) => {
  const s = classify(input)
  const { width, height } = input.viewport
  const summary = `display: ${s.display}\nposture: ${s.posture}\nfold:    ${s.fold ? `${s.foldAxis} @ ${s.foldAxis === 'vertical' ? s.fold.x : s.fold.y}px` : 'none'}`
  return `<figure class="device">
    <div class="hw frame${bend ? ' bent' : ''}" style="width:${width * K}px;height:${height * K}px;${bend ? `--bend:${bend}deg` : ''}">${renderApp(s, !!island)}${island ? '<i class="island"></i>' : ''}</div>
    <figcaption><b>${name}</b><div class="state">${summary}</div></figcaption>
  </figure>`
}).join('')
