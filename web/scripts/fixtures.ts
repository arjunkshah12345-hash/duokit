// Writes ../fixtures/unfold.json from the TS model. The Swift tests assert the
// same numbers, which keeps the two ports in lockstep.
import { writeFileSync } from 'node:fs'
import {
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

const angles = [0, 15, 45, 90, 120, 150, 175, 180]
const us = [0, 0.1, 0.25, 0.5, 0.75, 1]
const roles: ScreenRole[] = ['cover', 'inner']
const r = (x: number) => Math.round(x * 1e6) / 1e6

const frames = roles.flatMap((role) =>
  angles.map((angle) => {
    const f = unfoldFrame(angle, role)
    return {
      role,
      angle,
      frame: { motion: r(f.motion), stretch: r(f.stretch), lift: r(f.lift), opacity: r(f.opacity), maxBlur: r(f.maxBlur) },
      pixels: us.map((u) => {
        const g = hingeDistance(u, role)
        const moving = isMoving(u, role)
        return {
          u,
          g: r(g),
          moving,
          sampleU: r(sampleU(u, role, f)),
          sampleV: r(sampleV(u, 0, role, f)),
          blur: r(blurAt(g, f, moving)),
          shade: r(shadeAt(g, f, moving)),
        }
      }),
    }
  }),
)
const ease = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ t, angle: r(unfoldAngleAt(t)) }))
writeFileSync(new URL('../../fixtures/unfold.json', import.meta.url), JSON.stringify({ frames, ease }, null, 1) + '\n')
console.log(`wrote ${frames.length} frames`)
