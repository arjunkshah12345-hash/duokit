# Reverse-engineering the iPhone Duo unfold

Apple hasn't documented the transition, and its implementation is closed. This file describes what DuoKit reproduces and where each number came from, so you can disagree with it in a PR.

## What people see

From launch coverage and reviews:

- When the phone opens, the cover screen's content *loses definition like frosted glass*. The inner screen's content arrives with the same blur, the two merge, and then it sharpens. Reviewers describe a *blur and stretch* between the screens.
- Icons and wallpaper *appear to hold their position in space* while the panel they are drawn on rotates. That's what sells the illusion that content passes through the moving screen.
- The motion follows your hand. It's driven by the hinge angle, not a timer.
- Known glitch: the illusion only holds head-on. Each screen is a flat 2D composite, so at an angle you can see the trick.

## The model

The hinge angle `θ` runs from 0° (closed) to 180° (flat). Each screen gets four numbers per frame, then two per-pixel terms.

### Per frame

| | cover | inner |
|---|---|---|
| `motion` (blur/shade strength) | `smoothstep(0°, 90°, θ)` | `smoothstep(0°, 90°, 180° − θ)` |
| `stretch` (panel compression) | `max(cos θ, 0.2)` | `max(cos(180° − θ), 0.2)` on the moving half only |
| `opacity` | `1 − smoothstep(120°, 175°, θ)` | `smoothstep(5°, 60°, θ)` |
| `maxBlur` (fraction of width) | `72 / 1398` | `72 / 2670` |

The hand-off happens at **90°**, where both screens are fully in transit (`motion = 1`). Below 90° you're mostly looking at the cover. Above it, the inner screen resolves.

### Per pixel

`g` is the distance from the hinge, normalised: 0 at the fold, 1 at the far edge. On the cover the hinge is one edge; on the inner screen it's the centre line.

```
blurRadius = maxBlur · motion · g^1.35            (× screen width)
shade      = (1 − min(1, 2 · motion · d^1.35)) · opacity,   d = clamp((g − 0.2) / 0.8)
```

This makes the blur **progressive**: pixels at the hinge stay sharp, and those at the far edge are the softest and darkest. On the inner screen, content therefore appears to grow outward from the fold.

### Holding content still

The trick that makes icons look like they don't move is the `stretch` term. The cover rotates by θ around the hinge, so seen from the front its width projects to `w · cos θ`. For the content to look stationary, the panel must show only the slice of the scene it still covers. That means sampling `u · cos θ` and drawing it across the full panel:

```
cover:  sample(u) = u · stretch                          (anchored at the hinge edge)
inner:  sample(u) = 0.5 − (0.5 − u) · stretch   for u < 0.5 (the half that moves)
        sample(u) = u                           otherwise (the half in your palm)
```

On the panel the content looks stretched away from the hinge. In 3D, foreshortening cancels that out and the content holds still. You can check this in the demo with the three-quarter view off. At 140°, the clock and the icon rows line up across the crease even though the left half is tilted.

`stretch` is clamped at 0.2. Past 90° of tilt the panel faces away from you and is shaded to black anyway, and the clamp keeps the sampling from collapsing to a single column.

### Timing (when there is no hinge stream)

On the web there is no hinge angle, only `folded` / `continuous`. A timed unfold uses a cosine ease, which matches how a hinge accelerates and decelerates under a thumb:

```
θ(t) = 90° · (1 − cos(π·t)),   t ∈ [0, 1],   default duration 700 ms
```

Closing plays it in reverse on the cover screen.

## Where the numbers come from

| Constant | Source |
|---|---|
| 90° hand-off, smoothstep ramps, `g^1.35` falloff, 72px max blur, shade beyond `g = 0.2` | The open Three.js study [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo), which matches the launch footage closely. |
| `cos θ` stretch | Derived above from the "content holds still" observation. |
| Fade windows (120–175°, 5–60°) | Tuned by eye against footage. The cover goes dark before it faces away, and the inner screen wakes as soon as the hinge cracks. |
| Cosine ease | Same study. Also the natural motion of a damped hinge. |
| Screen sizes (cover 1398×2034, inner 2670×1878, ~1.4:1) | Apple's published specs and launch coverage. |

## Implementations

- `web/src/model.ts`: reference implementation.
- `web/src/unfold.ts`: WebGL2. Mip-mapped texture plus a 5×5 binomial kernel at `log2(r)` LOD, so a 72px blur costs 25 taps.
- `Sources/DuoKit/Unfold.metal`: SwiftUI `layerEffect`, a 7×7 binomial kernel.
- `Sources/DuoKit/UnfoldModel.swift`: the same math. `fixtures/unfold.json` holds both ports to identical outputs.
