# Reverse-engineering the iPhone Duo unfold

Apple hasn't documented the transition, and its implementation is closed. This file describes what DuoKit reproduces and where each number came from, so you can disagree with it in a PR.

## What people see

From Apple's own iPhone Duo product film (the hands-on open in the page's hero video), launch coverage, and two frame-by-frame reconstructions of the launch footage:

- When the phone opens, the cover screen's content *loses definition like frosted glass*. The inner screen's content arrives with the same blur, the two merge, and then it sharpens. Reviewers describe *opening and closing a transparent piece of glass*.
- Content *holds its position in space* while the panel it is drawn on rotates, even though the panel visibly grows as its free edge swings toward you. Both screens behave as windows onto one picture behind the phone.
- The blur is **sharp at the hinge and strongest at the moving edge**, and the bezel stays crisp. Apple's film shows the swinging half already soft a thumb's width from the fold, its free edge close to black, and its far corners dark. The half resting in your hand doesn't change at all.
- The home screen is laid out for the hand-off. The inner screen's right half *is* the cover's page (widgets, a 4×4 grid, and a right-hand column with the time, a status ring, a vertical dock and Search), so nothing under your thumb moves. The half that unfolds holds new content, a large Photos widget in Apple's film, which resolves out of the blur.
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
| `opacity` | `1 − smoothstep(120°, 175°, θ)` | `smoothstep(2°, 20°, θ)` |
| `maxBlur` (fraction of width) | `144 / 1398` | `144 / 2670` |

The hand-off happens at **90°**, where both screens are fully in transit (`motion = 1`).

### Per pixel

`g` is the distance from the hinge, normalised: 0 at the fold, 1 at the far edge. On the cover the hinge is one edge; on the inner screen it's the centre line. *Moving* pixels are the whole cover and the half of the inner screen that swings.

```
moving:   blur  = maxBlur · motion · g                  (× screen width)
          shade = (1 − 0.9 · motion · g^1.5) · opacity
          black where the sample lands outside the screen (see below)
resting:  blur  = 0
          shade = opacity
```

The blur grows linearly, like the gap between the tilted panel and the picture plane behind it. An earlier version used a cubic falloff from a third-party reconstruction (6 px halfway against 48 px at the edge). Measured against Apple's own film, that left the swinging half far too sharp: content a fifth of the way out is already visibly soft, and midway it is about half as soft as at the edge. The free edge loses 90% of its light, so it reads as nearly black, as in the film.

### Holding content still

Every moving pixel samples where the eye's ray through it meets the plane of the open screen. With the eye `D = 3.75` panel widths away (about 30 cm from an 8 cm panel), a point `g` from the hinge sits `g · lift` closer to the eye, so its ray reaches further across that plane:

```
k(g)  = D / (D − g · lift)
reach = g · stretch · k(g)

cover:  sample(u) = reach                         (anchored at the hinge edge)
inner:  sample(u) = 0.5 − reach / 2   on the moving half,   u   on the resting half
        sample(v) = 0.5 + (v − 0.5) · k(g)        on moving pixels
```

Samples that land outside 0…1 (near the free edge's corners, where the panel is closer to you than the picture is tall) see black. The kernel blurs coverage along with colour, so that black spreads softly into the corners, which is the dark vignette in Apple's film.

On the panel the content looks squeezed toward the hinge and, near the free edge, shrunk vertically. Seen in perspective, foreshortening cancels both, and the content holds still while the panel grows toward you. With `D → ∞` this reduces to the older orthographic `u · cos θ`. The demo uses the same `D` for its CSS perspective, so the effect lines up there too.

`stretch` is clamped at 0.2. Past 90° of tilt the panel faces away from you anyway, and the clamp keeps the sampling from collapsing to a single column.

### One picture behind both screens

Both screens should show the same picture where they overlap in space. In the demo, the cover's wallpaper is the half of the inner wallpaper it lies over when closed, and the cover's home screen page is painted again on that half of the inner screen, as on the real phone. The background and the icons line up through the hand-off, and only the unfolding half brings new content. In an app, give both screens content that agrees on the half the cover covers.

### Timing (when there is no hinge stream)

On the web there is no hinge angle, only `folded` / `continuous`. A timed unfold uses a cosine ease, which matches how a hinge accelerates and decelerates under a thumb:

```
θ(t) = 90° · (1 − cos(π·t)),   t ∈ [0, 1],   default duration 700 ms
```

Closing plays it in reverse on the cover screen.

## Where the numbers come from

| Constant | Source |
|---|---|
| Linear blur from the hinge, 144 px at the edge, ~90% darkening at the free edge, black corners, untouched resting half, inner screen lit as soon as it's visible, home screen layout | Frame-by-frame comparison against the hands-on open in Apple's [iPhone Duo](https://www.apple.com/iphone-duo/) product film, and Apple's [iPhone Duo design guidelines](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo) images |
| Sharp hinge, crisp bezel, endpoints sharp and bright, one shared picture, a perspective camera in which the moving panel grows | Empirical Health's frame-matched reconstruction of the launch clip: [Why the iPhone Duo fold animation works so well](https://www.empirical.health/blog/why-iphone-duo-fold-animation-works/) |
| 90° hand-off, smoothstep ramps, cosine ease | The open Three.js study [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo) |
| Rays that miss the picture see black; blur from the panel's gap | The frosted-glass model in [marcoazeem/duo-open](https://github.com/marcoazeem/duo-open) |
| `D = 3.75` panel widths, the `1.5` shade exponent | Tuned by eye against the above. A typical viewing distance is ~30 cm and the panel is ~8 cm wide. |
| `cos`/`sin` sampling | Derived above from the "content holds still" observation. |
| Fade windows (120–175°, 2–20°) | Tuned by eye against footage. |
| Screen sizes (cover 1398×2034, inner 2670×1878, ~1.4:1) | Apple's published specs. |

## Implementations

- `web/src/model.ts`: reference implementation.
- `web/src/unfold.ts`: WebGL2. Mip-mapped texture plus a 5×5 binomial kernel at `log2(r)` LOD, so a 144px blur costs 25 taps, and sharp pixels (the resting half) cost one.
- `Sources/DuoKit/Unfold.metal`: SwiftUI `layerEffect`, a 7×7 binomial kernel.
- `Sources/DuoKit/UnfoldModel.swift`: the same math. `fixtures/unfold.json` holds both ports to identical outputs.
