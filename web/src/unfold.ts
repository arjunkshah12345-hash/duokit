/**
 * Renderers for the unfold effect.
 *
 *  - UnfoldRenderer: WebGL2, per-pixel progressive blur + shade + stretch.
 *    This is the faithful one. Feed it an image/canvas/video of the screen.
 *  - unfoldStyle / applyUnfoldStyle: a CSS approximation for live DOM
 *    (stretch + uniform blur + a shade mask). Cheaper, no snapshot needed.
 *  - playUnfold: drives the angle over time when you have no hinge stream.
 */

import {
  UNFOLD,
  blurAt,
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
uniform float u_role;   // 0 cover, 1 inner
uniform float u_flip;   // 1 when the hinge is on the trailing side
uniform float u_fit;    // 0 cover, 1 contain
in vec2 v_uv;
out vec4 outColor;

const float FALLOFF = ${UNFOLD.falloff.toFixed(4)};
const float SHADE_START = ${UNFOLD.shadeStart.toFixed(4)};
const float SHADE_GAIN = ${UNFOLD.shadeGain.toFixed(4)};

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
  float g, sx;
  if (u_role < 0.5) {
    g = clamp(x, 0.0, 1.0);
    sx = x * stretch;
  } else {
    g = clamp(abs(x - 0.5) * 2.0, 0.0, 1.0);
    sx = x < 0.5 ? 0.5 - (0.5 - x) * stretch : x;
  }
  if (u_flip > 0.5) sx = 1.0 - sx;

  vec2 s = fitScale();
  vec2 uv = (vec2(sx, v_uv.y) - 0.5) * s + 0.5;

  // Progressive blur: radius grows with distance from the hinge.
  float rpx = maxBlur * motion * pow(g, FALLOFF) * u_res.x;
  vec2 step = 0.5 * rpx / u_res * s;
  float texelsPerPx = u_texSize.x * s.x / u_res.x;
  float lod = max(0.0, log2(max(rpx * texelsPerPx * 0.5, 1.0)));

  vec3 acc = vec3(0.0);
  float w[5] = float[](1.0, 4.0, 6.0, 4.0, 1.0);
  for (int j = 0; j < 5; j++) {
    for (int i = 0; i < 5; i++) {
      vec2 o = vec2(float(i - 2), float(j - 2)) * step;
      acc += textureLod(u_tex, uv + o, lod).rgb * (w[i] * w[j]);
    }
  }
  vec3 color = acc / 256.0;

  if (u_fit > 0.5 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) color = vec3(0.0);

  float d = clamp((g - SHADE_START) / (1.0 - SHADE_START), 0.0, 1.0);
  float shade = (1.0 - min(1.0, SHADE_GAIN * motion * pow(d, FALLOFF))) * opacity;
  outColor = vec4(color * shade, 1.0);
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
    for (const n of ['u_tex', 'u_res', 'u_texSize', 'u_frame', 'u_role', 'u_flip', 'u_fit']) {
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
    stops.push(`rgba(0,0,0,${shadeAt(g, f).toFixed(3)}) ${u * 100}%`)
  }
  // Mean of the progressive radius over g: ∫ g^1.35 dg = 1 / 2.35.
  const blur = blurAt(1, f) * width / (UNFOLD.falloff + 1)
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
