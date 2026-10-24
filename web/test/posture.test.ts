import { describe, expect, it } from 'vitest'
import { classify } from '../src/posture'

const cover = { width: 466, height: 678 }
const inner = { width: 890, height: 626 }

describe('classify', () => {
  it('detects the cover screen from its 1.4:1 shape', () => {
    const s = classify({ viewport: cover, screen: cover })
    expect(s).toMatchObject({ display: 'cover', posture: 'flat', fold: null, foldIsOccluding: false })
  })

  it('treats a slab iPhone as other', () => {
    const s = classify({ viewport: { width: 402, height: 874 }, screen: { width: 402, height: 874 } })
    expect(s.display).toBe('other')
  })

  it('treats an iPad mini as other', () => {
    const s = classify({ viewport: { width: 744, height: 1133 }, screen: { width: 744, height: 1133 } })
    expect(s.display).toBe('other')
  })

  it('puts a centre fold on the flat inner screen', () => {
    const s = classify({ viewport: inner, screen: inner, devicePosture: 'continuous' })
    expect(s).toMatchObject({ display: 'inner', posture: 'flat', foldAxis: 'vertical', foldIsOccluding: false })
    expect(s.fold).toEqual({ x: 445, y: 0, width: 0, height: 626 })
  })

  it('reads book posture and the hinge gap from viewport segments', () => {
    const s = classify({
      viewport: inner,
      screen: inner,
      devicePosture: 'folded',
      segments: [
        { x: 0, y: 0, width: 437, height: 626 },
        { x: 453, y: 0, width: 437, height: 626 },
      ],
    })
    expect(s).toMatchObject({ display: 'inner', posture: 'book', foldAxis: 'vertical', foldIsOccluding: true })
    expect(s.fold).toEqual({ x: 437, y: 0, width: 16, height: 626 })
  })

  it('reads tabletop posture from stacked segments', () => {
    const v = { width: 626, height: 890 }
    const s = classify({
      viewport: v,
      screen: v,
      devicePosture: 'folded',
      segments: [
        { x: 0, y: 437, width: 626, height: 453 },
        { x: 0, y: 0, width: 626, height: 421 },
      ],
    })
    expect(s).toMatchObject({ posture: 'tabletop', foldAxis: 'horizontal' })
    expect(s.fold).toEqual({ x: 0, y: 421, width: 626, height: 16 })
  })

  it('infers posture from the Device Posture API alone', () => {
    const s = classify({ viewport: inner, screen: inner, devicePosture: 'folded' })
    expect(s).toMatchObject({ posture: 'book', foldIsOccluding: true })
  })

  it('accepts custom thresholds', () => {
    const s = classify({ viewport: cover, screen: cover }, { coverMaxShortSide: 400 })
    expect(s.display).toBe('inner')
  })
})
