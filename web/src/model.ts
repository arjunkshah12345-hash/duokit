/**
 * The unfold model: a reconstruction of the iPhone Duo cover → inner screen
 * hand-off, expressed as pure functions of the hinge angle.
 *
 * Angle convention: 0° = closed (cover screen facing you), 180° = flat open.
 *
 * Per screen, each frame is described by five numbers:
 *  - motion   0..1  how far the screen is "in transit" (drives blur + shade)
 *  - stretch  0..1  cos of the moving panel's tilt (clamped): how much it
 *                   compresses content toward the hinge
 *  - lift     0..1  sin of the tilt: how far the free edge has swung toward
 *                   the viewer, for the perspective correction
 *  - opacity  0..1  overall screen brightness (cover fades out late, inner
 *                   fades in early)
 *  - maxBlur        blur radius at the far edge, as a fraction of screen width
 *
 * Per pixel, content on the moving panel is ray-cast onto the plane of the open
 * screen (so it holds still), and blur and shade grow with distance from the
 * hinge (`g`): sharp at the fold, softest and darkest at the moving edge. Rays
 * that miss the open screen (a sample outside 0..1) see black, which darkens
 * the free edge's corners. The half resting in your hand is left untouched.
 *
 * See docs/ANIMATION.md for how each constant was derived. The Swift port in
 * Sources/DuoKit/UnfoldModel.swift must stay numerically identical: both test
 * suites assert the same fixtures.
 */

export type ScreenRole = 'cover' | 'inner'

export interface UnfoldFrame {
  motion: number
  stretch: number
  /** sin of the moving panel's tilt: how far its free edge has swung toward the viewer. */
  lift: number
  opacity: number
  maxBlur: number
}

export const UNFOLD = {
  /** Blur ramps in over the first/last 90° of travel. */
  transitAngle: 90,
  /**
   * Assumed eye distance, in panel widths (≈30 cm from an 8 cm panel). Content
   * is ray-cast onto a plane at the open screen, so it holds still in a
   * perspective view rather than just an orthographic one.
   */
  viewDistance: 3.75,
  /**
   * Blur grows linearly with hinge distance, like the panel's gap from the
   * image plane: in Apple's launch film the swinging half is already soft a
   * thumb's width from the fold, and about half as soft midway as at the edge.
   */
  blurFalloff: 1,
  /** Brightness lost at the free edge at full motion: it reads as nearly black. */
  shadeGain: 0.9,
  shadeFalloff: 1.5,
  /** Never compress content past this, so it can't collapse to a line. */
  minStretch: 0.2,
  /**
   * 144px at the far edge of the 2670px-wide inner screen: in Apple's film the
   * photo on the swinging half is unrecognisable until the last ~40°.
   */
  innerMaxBlur: 144 / 2670,
  /** The same 144px measured on the 1398px-wide cover screen. */
  coverMaxBlur: 144 / 1398,
  /** Cover screen fades to black between these angles. */
  coverFadeOut: [120, 175] as const,
  /** Inner screen wakes between these angles: already lit as soon as it's visible. */
  innerFadeIn: [2, 20] as const,
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
  const tilt = role === 'cover' ? a : 180 - a
  return {
    motion: smoothstep(0, UNFOLD.transitAngle, tilt),
    stretch: Math.max(Math.cos(tilt * DEG), UNFOLD.minStretch),
    lift: Math.sin(tilt * DEG),
    opacity:
      role === 'cover'
        ? 1 - smoothstep(UNFOLD.coverFadeOut[0], UNFOLD.coverFadeOut[1], a)
        : smoothstep(UNFOLD.innerFadeIn[0], UNFOLD.innerFadeIn[1], a),
    maxBlur: role === 'cover' ? UNFOLD.coverMaxBlur : UNFOLD.innerMaxBlur,
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

/** True for pixels on the panel that swings: all of the cover, one half of the inner screen. */
export function isMoving(u: number, role: ScreenRole, opts: PixelOptions = {}): boolean {
  const x = opts.hinge === 'trailing' ? 1 - u : u
  return role === 'cover' || x < 0.5
}

/**
 * Perspective factor for a point on the moving panel `g` panel-widths from the
 * hinge: it sits `g · lift` closer to the eye, so its ray reaches further across
 * the image plane behind it.
 */
export function perspectiveAt(g: number, frame: UnfoldFrame): number {
  return UNFOLD.viewDistance / (UNFOLD.viewDistance - clamp(g) * frame.lift)
}

/**
 * Maps a horizontal panel coordinate (0..1) to the content coordinate to sample.
 * Each moving-panel pixel samples where its eye ray meets the plane of the open
 * screen, so content stays put in space as the panel rotates.
 */
export function sampleU(u: number, role: ScreenRole, frame: UnfoldFrame, opts: PixelOptions = {}): number {
  const flip = opts.hinge === 'trailing'
  const x = flip ? 1 - u : u
  let s = x
  if (isMoving(u, role, opts)) {
    const g = hingeDistance(u, role, opts)
    const reach = g * frame.stretch * perspectiveAt(g, frame)
    s = role === 'cover' ? reach : 0.5 - reach / 2
  }
  return flip ? 1 - s : s
}

/** Vertical counterpart of sampleU: the nearer free edge looks taller, so it samples a taller slice. */
export function sampleV(u: number, v: number, role: ScreenRole, frame: UnfoldFrame, opts: PixelOptions = {}): number {
  if (!isMoving(u, role, opts)) return v
  return 0.5 + (v - 0.5) * perspectiveAt(hingeDistance(u, role, opts), frame)
}

/** Blur radius at distance g, as a fraction of screen width. Sharp at the hinge, growing toward the edge. */
export function blurAt(g: number, frame: UnfoldFrame, moving = true): number {
  if (!moving) return 0
  return frame.maxBlur * frame.motion * Math.pow(clamp(g), UNFOLD.blurFalloff)
}

/**
 * Brightness multiplier at distance g (1 = untouched). The moving panel darkens
 * toward its free edge; the resting half only follows the screen's opacity.
 */
export function shadeAt(g: number, frame: UnfoldFrame, moving = true): number {
  const loss = moving ? UNFOLD.shadeGain * frame.motion * Math.pow(clamp(g), UNFOLD.shadeFalloff) : 0
  return (1 - loss) * frame.opacity
}

/** True when a sample lands on the open screen; rays that miss it see black. */
export function onScreen(su: number, sv: number): boolean {
  return su >= 0 && su <= 1 && sv >= 0 && sv <= 1
}

/**
 * Hinge angle over normalised time t (0..1) for a time-driven unfold,
 * for when there is no live hinge stream: a cosine ease, 0° → 180°.
 */
export function unfoldAngleAt(t: number): number {
  return 90 * (1 - Math.cos(Math.PI * clamp(t)))
}
