import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { classify, watchDuo, type ClassifyOptions, type Display, type DuoState } from './posture'
import { UnfoldRenderer, playUnfold, type UnfoldRendererOptions } from './unfold'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Server/first-render fallback: a plain single-screen device. */
const SSR_STATE = classify({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } })

/** Live posture/display state. Re-renders on fold, unfold, rotation and resize. */
export function useDuo(options?: ClassifyOptions): DuoState {
  const [state, setState] = useState<DuoState>(SSR_STATE)
  const key = JSON.stringify(options ?? {})
  useIsoLayoutEffect(() => watchDuo(setState, options), [key])
  return state
}

export interface DuoSplitProps {
  /** Always shown. On the cover screen it is the only pane. */
  primary: ReactNode
  /** Shown beside (book/flat) or below (tabletop) the fold on the inner screen. */
  secondary: ReactNode
  /** What the cover screen shows. Default 'primary'. 'stack' shows both stacked. */
  cover?: 'primary' | 'secondary' | 'stack'
  /** Use a fixed state (SSR, tests, design previews) instead of the live device. */
  state?: DuoState
  className?: string
  style?: CSSProperties
}

/**
 * Two panes that sit on either side of the fold.
 *
 * Flat inner screen: split at the centre line. Half-folded: split exactly on
 * the reported hinge, with the hinge width left empty so nothing lands in the
 * crease. Cover screen: a single pane.
 */
export function DuoSplit({ primary, secondary, cover = 'primary', state, className, style }: DuoSplitProps) {
  const live = useDuo()
  const s = state ?? live
  const base: CSSProperties = { display: 'grid', width: '100%', height: '100%', ...style }
  const pane = (child: ReactNode, key: string, extra?: CSSProperties) =>
    createElement('div', { key, 'data-duo-pane': key, style: { minWidth: 0, minHeight: 0, overflow: 'auto', ...extra } }, child)

  if (s.display !== 'inner' || !s.fold || !s.foldAxis) {
    const children =
      cover === 'stack'
        ? [pane(primary, 'primary'), pane(secondary, 'secondary')]
        : [pane(cover === 'secondary' ? secondary : primary, cover === 'secondary' ? 'secondary' : 'primary')]
    return createElement(
      'div',
      { className, 'data-duo-split': 'single', style: { ...base, gridAutoRows: cover === 'stack' ? 'auto' : '100%' } },
      children,
    )
  }

  const f = s.fold
  const vertical = s.foldAxis === 'vertical'
  const track = vertical ? `${f.x}px ${f.width}px minmax(0, 1fr)` : `${f.y}px ${f.height}px minmax(0, 1fr)`
  return createElement(
    'div',
    {
      className,
      'data-duo-split': vertical ? 'columns' : 'rows',
      style: { ...base, [vertical ? 'gridTemplateColumns' : 'gridTemplateRows']: track },
    },
    pane(primary, 'primary'),
    createElement('div', { key: 'fold', 'aria-hidden': true, 'data-duo-fold': true }),
    pane(secondary, 'secondary'),
  )
}

export interface UnfoldCanvasProps extends UnfoldRendererOptions {
  src: TexImageSource | null
  /** Hinge angle in degrees: 0 closed → 180 flat. */
  angle: number
  className?: string
  style?: CSSProperties
}

/** The WebGL unfold effect as a component. */
export function UnfoldCanvas({ src, angle, role, hinge, fit, maxDpr, className, style }: UnfoldCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<UnfoldRenderer | null>(null)

  useEffect(() => {
    renderer.current = new UnfoldRenderer(ref.current!, { role, hinge, fit, maxDpr })
    return () => {
      renderer.current?.dispose()
      renderer.current = null
    }
  }, [role, hinge, fit, maxDpr])

  useEffect(() => {
    if (src) renderer.current?.setSource(src)
  }, [src, role, hinge, fit, maxDpr])

  useEffect(() => {
    renderer.current?.render(angle)
  }, [angle, src, role, hinge, fit, maxDpr])

  return createElement('canvas', { ref, className, style: { display: 'block', width: '100%', height: '100%', ...style } })
}

/**
 * A hinge angle that animates whenever the app moves between displays:
 * cover → inner plays 0° → 180°, inner → cover plays 180° → 0°.
 * Pass a live angle (e.g. from a native bridge) to bypass the timer.
 */
export function useUnfoldAngle(options: { duration?: number; liveAngle?: number | null } = {}): {
  angle: number
  display: Display
  playing: boolean
} {
  const [angle, setAngle] = useState(180)
  const [playing, setPlaying] = useState(false)
  const [display, setDisplay] = useState<Display>(SSR_STATE.display)
  const duration = options.duration ?? 700

  useEffect(() => {
    let playback: ReturnType<typeof playUnfold> | null = null
    const stop = watchDuo((s) => setDisplay(s.display), {
      onDisplayChange: ({ from, to }) => {
        if (from === to || (from !== 'cover' && to !== 'cover')) return
        playback?.cancel()
        setPlaying(true)
        playback = playUnfold({ duration, reverse: to === 'cover', onFrame: setAngle })
        playback.finished.then(() => setPlaying(false))
      },
    })
    return () => {
      playback?.cancel()
      stop()
    }
  }, [duration])

  return { angle: options.liveAngle ?? angle, display, playing }
}
