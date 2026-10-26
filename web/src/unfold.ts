/**
 * Renderers for the unfold effect.
 *
 *  - UnfoldRenderer: WebGL2, per-pixel progressive blur + shade + perspective.
 *    This is the faithful one. Feed it an image/canvas/video of the screen.
 *  - unfoldStyle / applyUnfoldStyle: a CSS approximation for live DOM
 *    (stretch + uniform blur + a shade mask). Cheaper, no snapshot needed.
 *  - playUnfold: drives the angle over time when you have no hinge stream.
 */

import {
  UNFOLD,
  blurAt,
  isMoving,
  shadeAt,
  unfoldAngleAt,
  unfoldFrame,
  type PixelOptions,
  type ScreenRole,
} from './model'

export interface UnfoldRendererOptions extends PixelOptions {
  role: ScreenRole
  /** How the source fills the canvas. Default 'cover'. */
  fit?: 'cover' | 'contain'
  /** Cap on device pixel ratio for the backing store. Default 2. */
  maxDpr?: number
}

const VERT = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = p;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_texSize;
uniform vec4 u_frame;   // motion, stretch, opacity, maxBlur
uniform float u_lift;   // sin of the moving panel's tilt
uniform float u_role;   // 0 cover, 1 inner
uniform float u_flip;   // 1 when the hinge is on the trailing side
uniform float u_fit;    // 0 cover, 1 contain
in vec2 v_uv;
out vec4 outColor;

const float VIEW = ${UNFOLD.viewDistance.toFixed(4)};
const float BLUR_FALLOFF = ${UNFOLD.blurFalloff.toFixed(4)};
const float SHADE_GAIN = ${UNFOLD.shadeGain.toFixed(4)};
const float SHADE_FALLOFF = ${UNFOLD.shadeFalloff.toFixed(4)};

vec2 fitScale() {
  float ca = u_res.x / u_res.y;
  float ta = u_texSize.x / u_texSize.y;
  vec2 s = vec2(1.0);
  bool wider = ta > ca;
  if ((u_fit < 0.5) == wider) s.x = ca / ta; else s.y = ta / ca;
  return s;
}

void main() {
  float motion = u_frame.x, stretch = u_frame.y, opacity = u_frame.z, maxBlur = u_frame.w;
  float x = u_flip > 0.5 ? 1.0 - v_uv.x : v_uv.x;
  bool moving = u_role < 0.5 || x < 0.5;
  float g = u_role < 0.5 ? clamp(x, 0.0, 1.0) : clamp(abs(x - 0.5) * 2.0, 0.0, 1.0);

  // Ray-cast the moving panel onto the plane of the open screen.
  float k = moving ? VIEW / (VIEW - g * u_lift) : 1.0;
  float reach = g * stretch * k;
  float sx = !moving ? x : (u_role < 0.5 ? reach : 0.5 - reach * 0.5);
  if (u_flip > 0.5) sx = 1.0 - sx;
  vec2 p = vec2(sx, 0.5 + (v_uv.y - 0.5) * k);

  vec2 s = fitScale();
  float texelsPerPx = u_texSize.x * s.x / u_res.x;
  // Rays that miss the open screen see black. The kernel blurs coverage with
  // colour, so the black spreads softly into the free edge's corners.
  vec2 px = 1.0 / u_res;
  float rpx = moving ? maxBlur * motion * pow(g, BLUR_FALLOFF) * u_res.x : 0.0;
  vec2 stride = 0.5 * rpx * px;
  vec2 edge = max(stride, px);
  float lod = max(0.0, log2(max(rpx * texelsPerPx * 0.5, 1.0)));

  vec3 color;
  if (rpx < 0.5) {
    // Sharp: one tap (the resting half, and the moving panel at rest).
    vec2 c = step(vec2(0.0), p) * step(p, vec2(1.0));
    color = textureLod(u_tex, (p - 0.5) * s + 0.5, 0.0).rgb * (moving ? c.x * c.y : 1.0);
  } else {
    vec3 acc = vec3(0.0);
    float w[5] = float[](1.0, 4.0, 6.0, 4.0, 1.0);
    for (int j = 0; j < 5; j++) {
      for (int i = 0; i < 5; i++) {
        vec2 q = p + vec2(float(i - 2), float(j - 2)) * stride;
        vec2 c = smoothstep(-edge, vec2(0.0), q) * (1.0 - smoothstep(vec2(1.0), 1.0 + edge, q));
        acc += textureLod(u_tex, (q - 0.5) * s + 0.5, lod).rgb * (w[i] * w[j] * c.x * c.y);
      }
    }
    color = acc / 256.0;
  }

  if (u_fit > 0.5) {
    vec2 uv = (p - 0.5) * s + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) color = vec3(0.0);
  }

  float loss = moving ? SHADE_GAIN * motion * pow(g, SHADE_FALLOFF) : 0.0;
  outColor = vec4(color * (1.0 - loss) * opacity, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`duokit: ${gl.getShaderInfoLog(sh)}`)
  return sh
}

type Source = TexImageSource & { width?: number; height?: number }

function sourceSize(src: Source): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight]
  if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight]
  return [src.width ?? 1, src.height ?? 1]
}

export class UnfoldRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private tex: WebGLTexture
  private texSize: [number, number] = [1, 1]
  private u: Record<string, WebGLUniformLocation | null> = {}
  private opts: Required<UnfoldRendererOptions>
  private angle = 0

  constructor(canvas: HTMLCanvasElement, options: UnfoldRendererOptions) {
    this.canvas = canvas
    this.opts = { hinge: 'leading', fit: 'cover', maxDpr: 2, ...options }
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true })
    if (!gl) throw new Error('duokit: WebGL2 is not available')
    this.gl = gl

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`duokit: ${gl.getProgramInfoLog(program)}`)
    this.program = program
    for (const n of ['u_tex', 'u_res', 'u_texSize', 'u_frame', 'u_lift', 'u_role', 'u_flip', 'u_fit']) {
      this.u[n] = gl.getUniformLocation(program, n)
    }

    this.tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  }

  /** Upload the screen content. Call again whenever it changes (e.g. each video frame). */
  setSource(src: Source): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.generateMipmap(gl.TEXTURE_2D)
    this.texSize = sourceSize(src)
    this.render()
  }

  /** Match the backing store to the element's CSS size. */
  resize(): void {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, this.opts.maxDpr)
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  /** Draw the frame for a hinge angle in degrees (0 closed → 180 flat). */
  render(angle = this.angle): void {
    this.angle = angle
    this.resize()
    const { gl, u } = this
    const f = unfoldFrame(angle, this.opts.role)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.uniform1i(u.u_tex!, 0)
    gl.uniform2f(u.u_res!, this.canvas.width, this.canvas.height)
    gl.uniform2f(u.u_texSize!, this.texSize[0], this.texSize[1])
    gl.uniform4f(u.u_frame!, f.motion, f.stretch, f.opacity, f.maxBlur)
    gl.uniform1f(u.u_lift!, f.lift)
    gl.uniform1f(u.u_role!, this.opts.role === 'cover' ? 0 : 1)
    gl.uniform1f(u.u_flip!, this.opts.hinge === 'trailing' ? 1 : 0)
    gl.uniform1f(u.u_fit!, this.opts.fit === 'contain' ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose(): void {
    this.gl.deleteTexture(this.tex)
    this.gl.deleteProgram(this.program)
  }
}

/** CSS approximation of a frame, for live DOM content. */
export function unfoldStyle(
  angle: number,
  role: ScreenRole,
  width: number,
  opts: PixelOptions = {},
): Partial<CSSStyleDeclaration> {
  const f = unfoldFrame(angle, role)
  const trailing = opts.hinge === 'trailing'
  const leftToRight = (u: number) => (trailing ? 1 - u : u)
  // Shade mask sampled from the model, so the CSS and WebGL shading agree.
  const stops: string[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const x = leftToRight(u)
    const g = role === 'cover' ? x : Math.abs(x - 0.5) * 2
    stops.push(`rgba(0,0,0,${shadeAt(g, f, isMoving(x, role)).toFixed(3)}) ${u * 100}%`)
  }
  // Mean of the progressive radius over g: ∫ g^n dg = 1 / (n + 1).
  const blur = (blurAt(1, f) * width) / (UNFOLD.blurFalloff + 1)
  // The CSS version can only stretch the cover screen as a whole.
  const scale = role === 'cover' ? 1 / f.stretch : 1
  const mask = `linear-gradient(to right, ${stops.join(', ')})`
  return {
    transformOrigin: trailing ? 'right center' : 'left center',
    transform: `scaleX(${scale.toFixed(4)})`,
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
    maskImage: mask,
    webkitMaskImage: mask,
  } as Partial<CSSStyleDeclaration>
}

export function applyUnfoldStyle(el: HTMLElement, angle: number, role: ScreenRole, opts?: PixelOptions): void {
  Object.assign(el.style, unfoldStyle(angle, role, el.clientWidth, opts))
}

export interface PlayOptions {
  /** Milliseconds. Default 700, roughly a one-handed open. */
  duration?: number
  /** Play 180° → 0° instead (closing). */
  reverse?: boolean
  onFrame: (angle: number) => void
}

export interface Playback {
  finished: Promise<void>
  cancel(): void
}

/** Drive the hinge angle over time with the model's cosine ease. */
export function playUnfold({ duration = 700, reverse = false, onFrame }: PlayOptions): Playback {
  let raf = 0
  let start = 0
  let resolve!: () => void
  const finished = new Promise<void>((r) => (resolve = r))
  const tick = (now: number) => {
    if (!start) start = now
    const t = Math.min(1, (now - start) / duration)
    const a = unfoldAngleAt(t)
    onFrame(reverse ? 180 - a : a)
    if (t < 1) raf = requestAnimationFrame(tick)
    else resolve()
  }
  raf = requestAnimationFrame(tick)
  return {
    finished,
    cancel() {
      cancelAnimationFrame(raf)
      resolve()
    },
  }
}
