import { describe, expect, it } from 'vitest'
import fixtures from '../../fixtures/unfold.json'
import {
  UNFOLD,
  blurAt,
  hingeDistance,
  isMoving,
  sampleU,
  sampleV,
  shadeAt,
  unfoldAngleAt,
  unfoldFrame,
  type ScreenRole,
} from '../src/model'

describe('unfold model', () => {
  it('matches the shared fixtures (Swift asserts the same file)', () => {
    for (const fx of fixtures.frames) {
      const role = fx.role as ScreenRole
      const f = unfoldFrame(fx.angle, role)
      for (const k of ['motion', 'stretch', 'lift', 'opacity', 'maxBlur'] as const) expect(f[k]).toBeCloseTo(fx.frame[k], 5)
      for (const p of fx.pixels) {
        const g = hingeDistance(p.u, role)
        expect(g).toBeCloseTo(p.g, 5)
        expect(isMoving(p.u, role)).toBe(p.moving)
        expect(sampleU(p.u, role, f)).toBeCloseTo(p.sampleU, 5)
        expect(sampleV(p.u, 0, role, f)).toBeCloseTo(p.sampleV, 5)
        expect(blurAt(g, f, p.moving)).toBeCloseTo(p.blur, 5)
        expect(shadeAt(g, f, p.moving)).toBeCloseTo(p.shade, 5)
      }
    }
    for (const e of fixtures.ease) expect(unfoldAngleAt(e.t)).toBeCloseTo(e.angle, 5)
  })

  it('is at rest at both ends', () => {
    expect(unfoldFrame(0, 'cover')).toMatchObject({ motion: 0, stretch: 1, lift: 0, opacity: 1 })
    expect(unfoldFrame(180, 'inner')).toMatchObject({ motion: 0, stretch: 1, opacity: 1 })
    expect(unfoldFrame(180, 'inner').lift).toBeCloseTo(0, 12)
    expect(unfoldFrame(180, 'cover').opacity).toBe(0)
    expect(unfoldFrame(0, 'inner').opacity).toBe(0)
  })

  it('hands off at 90° with both screens fully in transit', () => {
    expect(unfoldFrame(90, 'cover').motion).toBe(1)
    expect(unfoldFrame(90, 'inner').motion).toBe(1)
  })

  it('keeps the hinge sharp and blurs cubically toward the far edge', () => {
    const f = unfoldFrame(60, 'cover')
    expect(blurAt(0, f)).toBe(0)
    expect(blurAt(0.5, f)).toBeCloseTo(blurAt(1, f) / 8, 9)
  })

  it('leaves the resting half nearly sharp and only dims it', () => {
    const f = unfoldFrame(90, 'inner')
    expect(blurAt(1, f, false)).toBeCloseTo(blurAt(1, f) * UNFOLD.fixedBlur, 9)
    expect(shadeAt(1, f, false)).toBeCloseTo(shadeAt(0.2, f, false), 9)
    expect(shadeAt(1, f, false)).toBeGreaterThan(shadeAt(1, f, true))
  })

  it('ray-casts the moving panel onto the open screen plane', () => {
    const cover = unfoldFrame(60, 'cover')
    const D = UNFOLD.viewDistance
    const k = D / (D - Math.sin(Math.PI / 3))
    expect(sampleU(0, 'cover', cover)).toBe(0)
    expect(sampleU(1, 'cover', cover)).toBeCloseTo(0.5 * k, 5) // cos 60° · perspective
    expect(sampleV(1, 0, 'cover', cover)).toBeCloseTo(0.5 - 0.5 * k, 5) // the near edge samples a taller slice
    const inner = unfoldFrame(120, 'inner')
    expect(sampleU(0.5, 'inner', inner)).toBe(0.5)
    expect(sampleU(0.8, 'inner', inner)).toBe(0.8)
    expect(sampleV(0.8, 0.1, 'inner', inner)).toBe(0.1)
    expect(sampleU(0, 'inner', inner)).toBeCloseTo(0.5 - 0.25 * k, 5)
    expect(sampleU(1, 'inner', inner, { hinge: 'trailing' })).toBeCloseTo(0.5 + 0.25 * k, 5)
  })

  it('clamps out-of-range angles', () => {
    expect(unfoldFrame(-30, 'cover')).toEqual(unfoldFrame(0, 'cover'))
    expect(unfoldFrame(400, 'inner')).toEqual(unfoldFrame(180, 'inner'))
  })
})
