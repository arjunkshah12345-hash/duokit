# Reverse-engineering the iPhone Duo unfold

Apple hasn't documented the transition, and its implementation is closed. This file describes what DuoKit reproduces and where each number came from, so you can disagree with it in a PR.

## What people see

From launch coverage, reviews, and two frame-by-frame reconstructions of the launch footage:

- When the phone opens, the cover screen's content *loses definition like frosted glass*. The inner screen's content arrives with the same blur, the two merge, and then it sharpens. Reviewers describe *opening and closing a transparent piece of glass*.
- Content *holds its position in space* while the panel it is drawn on rotates, even though the panel visibly grows as its free edge swings toward you. Both screens behave as windows onto one picture behind the phone.
- The blur is **sharp at the hinge and strongest at the moving edge**, and the bezel stays crisp. The half resting in your hand barely changes: it dims a little and brightens as the phone flattens.
- The motion follows your hand. It's driven by the hinge angle, not a timer.
- Known glitch: the illusion only holds head-on. Each screen is a flat 2D composite, so at an angle you can see the trick (try the demo's three-quarter view).

## The model

The hinge angle `θ` runs from 0° (closed) to 180° (flat). Each screen gets five numbers per frame, then a few per-pixel terms. `tilt` is how far the moving panel is from facing the viewer: `θ` for the cover, `180° − θ` for the inner screen.

### Per frame

| | cover | inner |
|---|---|---|
| `motion` (blur/shade strength) | `smoothstep(0°, 90°, tilt)` | same |
| `stretch` | `max(cos tilt, 0.2)` | same, applied to the moving half only |
| `lift` | `sin tilt` | same |
| `opacity` | `1 − smoothstep(120°, 175°, θ)` | `smoothstep(5°, 60°, θ)` |
| `maxBlur` (fraction of width) | `72 / 1398` | `72 / 2670` |

The hand-off happens at **90°**, where both screens are fully in transit (`motion = 1`).

### Per pixel

`g` is the distance from the hinge, normalised: 0 at the fold, 1 at the far edge. On the cover the hinge is one edge; on the inner screen it's the centre line. *Moving* pixels are the whole cover and the half of the inner screen that swings.

```
moving:   blur  = maxBlur · motion · g³                 (× screen width)
          shade = (1 − 0.75 · motion · g²) · opacity
resting:  blur  = 0.4 · maxBlur · motion · g³
          shade = (1 − 0.25 · motion) · opacity
```

The cubic falloff comes from a frame-matched reconstruction: at half the distance to the free edge the blur is an eighth of the edge value (6 px against 48 px). The moving panel darkens toward its free edge but never goes black. The resting half stays nearly sharp and only dims evenly.

### Holding content still

Every moving pixel samples where the eye's ray through it meets the plane of the open screen. With the eye `D = 3.75` panel widths away (about 30 cm from an 8 cm panel), a point `g` from the hinge sits `g · lift` closer to the eye, so its ray reaches further across that plane:

```
k(g)  = D / (D − g · lift)
reach = g · stretch · k(g)

cover:  sample(u) = reach                         (anchored at the hinge edge)
inner:  sample(u) = 0.5 − reach / 2   on the moving half,   u   on the resting half
        sample(v) = 0.5 + (v − 0.5) · k(g)        on moving pixels
```

On the panel the content looks squeezed toward the hinge and, near the free edge, shrunk vertically. Seen in perspective, foreshortening cancels both, and the content holds still while the panel grows toward you. With `D → ∞` this reduces to the older orthographic `u · cos θ`. The demo uses the same `D` for its CSS perspective, so the effect lines up there too.

`stretch` is clamped at 0.2. Past 90° of tilt the panel faces away from you anyway, and the clamp keeps the sampling from collapsing to a single column.

### One picture behind both screens

Both screens should show the same picture where they overlap in space. In the demo, the cover's wallpaper is the half of the inner wallpaper it lies over when closed, so the background lines up through the hand-off and only the icons cross-dissolve inside the blur. In an app, give both screens content that agrees at the hinge.

### Timing (when there is no hinge stream)

On the web there is no hinge angle, only `folded` / `continuous`. A timed unfold uses a cosine ease, which matches how a hinge accelerates and decelerates under a thumb:

```
θ(t) = 90° · (1 − cos(π·t)),   t ∈ [0, 1],   default duration 700 ms
```

Closing plays it in reverse on the cover screen.

## Where the numbers come from

| Constant | Source |
|---|---|
| Sharp hinge, cubic blur toward the moving edge (6 px halfway vs 48 px at the edge), crisp bezel, darker free edge, endpoints sharp and bright, one shared picture, a perspective camera in which the moving panel grows | Empirical Health's frame-matched reconstruction of the launch clip: [Why the iPhone Duo fold animation works so well](https://www.empirical.health/blog/why-iphone-duo-fold-animation-works/) |
| 90° hand-off, smoothstep ramps, 72px max blur, cosine ease | The open Three.js study [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo) |
| `D = 3.75` panel widths, `0.75` edge darkening, `0.4` resting-half blur, `0.25` resting-half dim | Tuned by eye against the above. A typical viewing distance is ~30 cm and the panel is ~8 cm wide. |
| `cos`/`sin` sampling | Derived above from the "content holds still" observation. |
| Fade windows (120–175°, 5–60°) | Tuned by eye against footage. |
| Screen sizes (cover 1398×2034, inner 2670×1878, ~1.4:1) | Apple's published specs. |

## Implementations

- `web/src/model.ts`: reference implementation.
- `web/src/unfold.ts`: WebGL2. Mip-mapped texture plus a 5×5 binomial kernel at `log2(r)` LOD, so a 72px blur costs 25 taps.
- `Sources/DuoKit/Unfold.metal`: SwiftUI `layerEffect`, a 7×7 binomial kernel.
- `Sources/DuoKit/UnfoldModel.swift`: the same math. `fixtures/unfold.json` holds both ports to identical outputs.
