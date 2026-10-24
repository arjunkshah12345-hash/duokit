/**
 * The unfold model: a reconstruction of the iPhone Duo cover → inner screen
 * hand-off, expressed as pure functions of the hinge angle.
 *
 * Angle convention: 0° = closed (cover screen facing you), 180° = flat open.
 *
 * Per screen, each frame is described by four numbers:
 *  - motion   0..1  how far the screen is "in transit" (drives blur + shade)
 *  - stretch  0..1  how much the moving panel compresses content toward the
 *                   hinge so it appears to stay fixed in space (cos of the
 *                   panel's tilt toward the viewer, clamped)
 *  - opacity  0..1  overall screen brightness (cover fades out late, inner
 *                   fades in early)
 *  - maxBlur        blur radius at the far edge, as a fraction of screen width
 *
 * Per pixel, blur and shade grow with distance from the hinge (`g`), which
 * gives the effect its progressive look: sharp at the fold, softest at the edge.
 *
 * See docs/ANIMATION.md for how each constant was derived. The Swift port in
 * Sources/DuoKit/UnfoldModel.swift must stay numerically identical: both test
 * suites assert the same fixtures.
 */

export type ScreenRole = 'cover' | 'inner'

export interface UnfoldFrame {
  motion: number
  stretch: number
  opacity: number
  maxBlur: number
}

export const UNFOLD = {
  /** Blur ramps in over the first/last 90° of travel. */
  transitAngle: 90,
  /** Progressive falloff exponent for blur and shade. */
  falloff: 1.35,
  /** Shade starts this far from the hinge (0..1). */
  shadeStart: 0.2,
  /** Shade strength multiplier at full motion. */
  shadeGain: 2,
  /** Never compress content past this, so it can't collapse to a line. */
  minStretch: 0.2,
  /** 72px at the far edge of a 2670px-wide inner screen. */
  innerMaxBlur: 72 / 2670,
  /** The same 72px measured on the 1398px-wide cover screen. */
  coverMaxBlur: 72 / 1398,
  /** Cover screen fades to black between these angles. */
  coverFadeOut: [120, 175] as const,
  /** Inner screen wakes between these angles. */
  innerFadeIn: [5, 60] as const,
} as const

const DEG = Math.PI / 180

export function clamp(x: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, x))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Frame parameters for one screen at a given hinge angle (degrees). */
export function unfoldFrame(angle: number, role: ScreenRole): UnfoldFrame {
  const a = clamp(angle, 0, 180)
  if (role === 'cover') {
    return {
      motion: smoothstep(0, UNFOLD.transitAngle, a),
      stretch: Math.max(Math.cos(a * DEG), UNFOLD.minStretch),
      opacity: 1 - smoothstep(UNFOLD.coverFadeOut[0], UNFOLD.coverFadeOut[1], a),
      maxBlur: UNFOLD.coverMaxBlur,
    }
  }
  const tilt = 180 - a
  return {
    motion: smoothstep(0, UNFOLD.transitAngle, tilt),
    stretch: Math.max(Math.cos(tilt * DEG), UNFOLD.minStretch),
    opacity: smoothstep(UNFOLD.innerFadeIn[0], UNFOLD.innerFadeIn[1], a),
    maxBlur: UNFOLD.innerMaxBlur,
  }
}

export interface PixelOptions {
  /**
   * Which side the hinge is on. For the cover screen this is the edge touching
   * the hinge; for the inner screen it is the half that physically moves.
   * Default 'leading' (left in LTR).
   */
  hinge?: 'leading' | 'trailing'
}

/** Normalised distance from the hinge, 0 at the fold → 1 at the far edge. */
export function hingeDistance(u: number, role: ScreenRole, opts: PixelOptions = {}): number {
  const x = opts.hinge === 'trailing' ? 1 - u : u
  return role === 'cover' ? clamp(x) : clamp(Math.abs(x - 0.5) * 2)
}

/**
 * Maps a horizontal panel coordinate (0..1) to the content coordinate to sample,
 * so content on the moving panel stays put in space as the panel rotates.
 */
export function sampleU(u: number, role: ScreenRole, frame: UnfoldFrame, opts: PixelOptions = {}): number {
  const flip = opts.hinge === 'trailing'
  const x = flip ? 1 - u : u
  let s: number
  if (role === 'cover') {
    s = x * frame.stretch
  } else {
    // Only the moving (leading) half compresses toward the fold at 0.5.
    s = x < 0.5 ? 0.5 - (0.5 - x) * frame.stretch : x
  }
  return flip ? 1 - s : s
}

/** Blur radius at distance g, as a fraction of screen width. */
export function blurAt(g: number, frame: UnfoldFrame): number {
  return frame.maxBlur * frame.motion * Math.pow(clamp(g), UNFOLD.falloff)
}

/** Brightness multiplier at distance g (1 = untouched, 0 = black). */
export function shadeAt(g: number, frame: UnfoldFrame): number {
  const d = clamp((g - UNFOLD.shadeStart) / (1 - UNFOLD.shadeStart))
  return (1 - Math.min(1, UNFOLD.shadeGain * frame.motion * Math.pow(d, UNFOLD.falloff))) * frame.opacity
}

/**
 * Hinge angle over normalised time t (0..1) for a time-driven unfold,
 * for when there is no live hinge stream: a cosine ease, 0° → 180°.
 */
export function unfoldAngleAt(t: number): number {
  return 90 * (1 - Math.cos(Math.PI * clamp(t)))
}
