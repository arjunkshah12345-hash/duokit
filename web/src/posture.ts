/**
 * Posture + display detection for the web.
 *
 * Signals, strongest first:
 *  1. Viewport Segments API (`window.viewport.segments`) — exact fold geometry.
 *  2. Device Posture API (`navigator.devicePosture.type`) — 'folded' | 'continuous'.
 *  3. Screen-shape heuristic — the Duo's screens are both ~1.4:1, unlike any
 *     slab iPhone (~2.17:1), which tells cover vs inner apart.
 *
 * Everything funnels through `classify()`, a pure function, so it is testable
 * and so apps can feed it simulated input.
 */

export type Display = 'cover' | 'inner' | 'other'
export type Posture = 'flat' | 'book' | 'tabletop' | 'unknown'
export type FoldAxis = 'vertical' | 'horizontal'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DuoInput {
  viewport: { width: number; height: number }
  screen: { width: number; height: number }
  /** From the Viewport Segments API, in viewport CSS px. */
  segments?: readonly Rect[] | null
  /** From the Device Posture API. */
  devicePosture?: 'folded' | 'continuous' | null
}

export interface DuoState {
  display: Display
  posture: Posture
  /** The hinge region between segments, or the visual centre line on a flat inner screen. */
  fold: Rect | null
  foldAxis: FoldAxis | null
  /** True when the fold is physically bent, i.e. content must avoid it. */
  foldIsOccluding: boolean
  segments: Rect[]
  viewport: { width: number; height: number }
}

export interface ClassifyOptions {
  /** Short side (CSS px) below which a ~1.4:1 screen is the cover display. */
  coverMaxShortSide?: number
  /** Short side (CSS px) below which a ~1.4:1 screen is still the Duo inner display. */
  innerMaxShortSide?: number
  /** Aspect-ratio window that marks a Duo screen. */
  duoAspect?: readonly [number, number]
}

const DEFAULTS: Required<ClassifyOptions> = {
  // Cover is ~466×678pt, inner ~890×626pt at 3x. iPad mini starts at 744pt.
  coverMaxShortSide: 560,
  innerMaxShortSide: 720,
  duoAspect: [1.3, 1.6],
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height }
}

export function classify(input: DuoInput, options: ClassifyOptions = {}): DuoState {
  const opts = { ...DEFAULTS, ...options }
  const segments = (input.segments ?? []).map((s) => rect(s.x, s.y, s.width, s.height))
  const vp = input.viewport

  const short = Math.min(input.screen.width, input.screen.height)
  const long = Math.max(input.screen.width, input.screen.height)
  const aspect = short > 0 ? long / short : 0
  const duoShaped = aspect >= opts.duoAspect[0] && aspect <= opts.duoAspect[1]

  let display: Display = 'other'
  if (segments.length >= 2 || input.devicePosture === 'folded') display = 'inner'
  else if (duoShaped && short < opts.coverMaxShortSide) display = 'cover'
  else if (duoShaped && short < opts.innerMaxShortSide) display = 'inner'

  let fold: Rect | null = null
  let foldAxis: FoldAxis | null = null
  let posture: Posture = 'unknown'

  if (segments.length >= 2) {
    const [a, b] = segments as [Rect, Rect]
    const sideBySide = Math.abs(a.y - b.y) < 1 && Math.abs(a.x - b.x) >= 1
    if (sideBySide) {
      const [l, r] = a.x <= b.x ? [a, b] : [b, a]
      foldAxis = 'vertical'
      fold = rect(l.x + l.width, l.y, Math.max(0, r.x - (l.x + l.width)), l.height)
      posture = 'book'
    } else {
      const [t, btm] = a.y <= b.y ? [a, b] : [b, a]
      foldAxis = 'horizontal'
      fold = rect(t.x, t.y + t.height, t.width, Math.max(0, btm.y - (t.y + t.height)))
      posture = 'tabletop'
    }
  } else if (display === 'inner') {
    // Flat (or posture-only) inner screen: the fold runs across the long axis' centre.
    const landscape = vp.width >= vp.height
    foldAxis = landscape ? 'vertical' : 'horizontal'
    fold = landscape ? rect(vp.width / 2, 0, 0, vp.height) : rect(0, vp.height / 2, vp.width, 0)
    posture = input.devicePosture === 'folded' ? (landscape ? 'book' : 'tabletop') : 'flat'
  } else if (display === 'cover') {
    posture = 'flat'
  }

  return {
    display,
    posture,
    fold,
    foldAxis,
    foldIsOccluding: posture === 'book' || posture === 'tabletop',
    segments: segments.length ? segments : [rect(0, 0, vp.width, vp.height)],
    viewport: { width: vp.width, height: vp.height },
  }
}

interface PostureNavigator {
  devicePosture?: EventTarget & { type?: 'folded' | 'continuous' }
}
interface SegmentsWindow {
  viewport?: { segments?: readonly DOMRect[] | null }
  visualViewport: (VisualViewport & { segments?: readonly DOMRect[] | null }) | null
}

/** Read the live browser state. */
export function readDuo(options?: ClassifyOptions, win: Window = window): DuoState {
  const w = win as Window & SegmentsWindow
  const nav = win.navigator as Navigator & PostureNavigator
  const segments = w.viewport?.segments ?? w.visualViewport?.segments ?? null
  return classify(
    {
      viewport: { width: win.innerWidth, height: win.innerHeight },
      screen: { width: win.screen.width, height: win.screen.height },
      segments,
      devicePosture: nav.devicePosture?.type ?? null,
    },
    options,
  )
}

/** Feature flags for the underlying platform APIs. */
export function duoSupport(win: Window = window) {
  const w = win as Window & SegmentsWindow
  return {
    devicePosture: 'devicePosture' in win.navigator,
    viewportSegments: !!(w.viewport && 'segments' in w.viewport) || !!(w.visualViewport && 'segments' in w.visualViewport),
  }
}

export interface DisplayChange {
  from: Display
  to: Display
  state: DuoState
}

/**
 * Subscribe to posture/display changes. Fires immediately with the current
 * state. `onDisplayChange` fires when the app moves between cover and inner.
 */
export function watchDuo(
  listener: (state: DuoState) => void,
  options: ClassifyOptions & { onDisplayChange?: (change: DisplayChange) => void } = {},
  win: Window = window,
): () => void {
  const { onDisplayChange, ...classifyOpts } = options
  let last: DuoState | null = null
  let frame = 0

  const update = () => {
    frame = 0
    const next = readDuo(classifyOpts, win)
    if (last && sameState(last, next)) return
    if (last && last.display !== next.display) onDisplayChange?.({ from: last.display, to: next.display, state: next })
    last = next
    listener(next)
  }
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(update)
  }

  update()
  win.addEventListener('resize', schedule)
  win.addEventListener('orientationchange', schedule)
  const posture = (win.navigator as Navigator & PostureNavigator).devicePosture
  posture?.addEventListener('change', schedule)
  const queries = ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)', '(device-posture: folded)']
    .map((q) => win.matchMedia?.(q))
    .filter((m): m is MediaQueryList => !!m)
  queries.forEach((m) => m.addEventListener('change', schedule))

  return () => {
    if (frame) win.cancelAnimationFrame(frame)
    win.removeEventListener('resize', schedule)
    win.removeEventListener('orientationchange', schedule)
    posture?.removeEventListener('change', schedule)
    queries.forEach((m) => m.removeEventListener('change', schedule))
  }
}

function sameState(a: DuoState, b: DuoState): boolean {
  return (
    a.display === b.display &&
    a.posture === b.posture &&
    a.viewport.width === b.viewport.width &&
    a.viewport.height === b.viewport.height &&
    JSON.stringify(a.fold) === JSON.stringify(b.fold)
  )
}

/**
 * Mirror the state onto an element (default <html>) as data attributes and CSS
 * custom properties, so layouts can be written in plain CSS:
 *
 *   [data-duo-display="inner"] .sidebar { display: block }
 *   .detail { margin-left: calc(var(--duo-fold-x) + var(--duo-fold-width)) }
 */
export function applyDuoCSS(state: DuoState, el: HTMLElement = document.documentElement): void {
  el.dataset.duoDisplay = state.display
  el.dataset.duoPosture = state.posture
  el.dataset.duoFold = state.foldAxis ?? 'none'
  el.dataset.duoOccluding = String(state.foldIsOccluding)
  const f = state.fold ?? { x: 0, y: 0, width: 0, height: 0 }
  el.style.setProperty('--duo-fold-x', `${f.x}px`)
  el.style.setProperty('--duo-fold-y', `${f.y}px`)
  el.style.setProperty('--duo-fold-width', `${f.width}px`)
  el.style.setProperty('--duo-fold-height', `${f.height}px`)
}

/** One-liner: keep <html> in sync with the device. Returns an unsubscribe. */
export function installDuoCSS(options?: ClassifyOptions, el?: HTMLElement): () => void {
  return watchDuo((s) => applyDuoCSS(s, el), options)
}
