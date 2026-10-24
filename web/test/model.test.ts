import { describe, expect, it } from 'vitest'
import fixtures from '../../fixtures/unfold.json'
import { blurAt, hingeDistance, sampleU, shadeAt, unfoldAngleAt, unfoldFrame, type ScreenRole } from '../src/model'

describe('unfold model', () => {
  it('matches the shared fixtures (Swift asserts the same file)', () => {
    for (const fx of fixtures.frames) {
      const role = fx.role as ScreenRole
      const f = unfoldFrame(fx.angle, role)
      for (const k of ['motion', 'stretch', 'opacity', 'maxBlur'] as const) expect(f[k]).toBeCloseTo(fx.frame[k], 5)
      for (const p of fx.pixels) {
        const g = hingeDistance(p.u, role)
        expect(g).toBeCloseTo(p.g, 5)
        expect(sampleU(p.u, role, f)).toBeCloseTo(p.sampleU, 5)
        expect(blurAt(g, f)).toBeCloseTo(p.blur, 5)
        expect(shadeAt(g, f)).toBeCloseTo(p.shade, 5)
      }
    }
    for (const e of fixtures.ease) expect(unfoldAngleAt(e.t)).toBeCloseTo(e.angle, 5)
  })

  it('is at rest at both ends', () => {
    expect(unfoldFrame(0, 'cover')).toMatchObject({ motion: 0, stretch: 1, opacity: 1 })
    expect(unfoldFrame(180, 'inner')).toMatchObject({ motion: 0, stretch: 1, opacity: 1 })
    expect(unfoldFrame(180, 'cover').opacity).toBe(0)
    expect(unfoldFrame(0, 'inner').opacity).toBe(0)
  })

  it('hands off at 90° with both screens fully in transit', () => {
    expect(unfoldFrame(90, 'cover').motion).toBe(1)
    expect(unfoldFrame(90, 'inner').motion).toBe(1)
  })

  it('keeps the hinge sharp and blurs toward the far edge', () => {
    const f = unfoldFrame(60, 'cover')
    expect(blurAt(0, f)).toBe(0)
    expect(blurAt(0.5, f)).toBeLessThan(blurAt(1, f))
  })

  it('anchors content at the hinge and only stretches the moving inner half', () => {
    const cover = unfoldFrame(60, 'cover')
    expect(sampleU(0, 'cover', cover)).toBe(0)
    expect(sampleU(1, 'cover', cover)).toBeCloseTo(0.5, 5) // cos 60°
    const inner = unfoldFrame(120, 'inner')
    expect(sampleU(0.5, 'inner', inner)).toBe(0.5)
    expect(sampleU(0.8, 'inner', inner)).toBe(0.8)
    expect(sampleU(0, 'inner', inner)).toBeCloseTo(0.25, 5)
    expect(sampleU(1, 'inner', inner, { hinge: 'trailing' })).toBeCloseTo(0.75, 5)
  })

  it('clamps out-of-range angles', () => {
    expect(unfoldFrame(-30, 'cover')).toEqual(unfoldFrame(0, 'cover'))
    expect(unfoldFrame(400, 'inner')).toEqual(unfoldFrame(180, 'inner'))
  })
})
