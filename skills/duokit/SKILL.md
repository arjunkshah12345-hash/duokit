---
name: duokit
description: Make an iOS (SwiftUI) or web app fold-aware on iPhone Duo with DuoKit (cover vs inner screen, book/tabletop posture, the fold rect, two-pane layouts), add the Duo's cover → inner unfold animation, or draw a realistic iPhone Duo device mockup in HTML/CSS. Use when someone mentions iPhone Duo, foldables, hinge or fold-aware layout, Device Posture / Viewport Segments, DuoSplit, or the unfold animation.
---

# DuoKit

Repo: https://github.com/arjunkshah12345-hash/duokit (MIT) · Demo: https://arjunkshah12345-hash.github.io/duokit/

DuoKit reduces the device to one state and gives layouts that react to it:

| | display | posture | fold |
|---|---|---|---|
| Slab iPhone | `other` | `unknown` | none |
| Duo, closed | `cover` | `flat` | none |
| Duo, open flat | `inner` | `flat` | centre line, not occluding |
| Duo, half-open, landscape | `inner` | `book` | vertical, occluding |
| Duo, half-open, portrait | `inner` | `tabletop` | horizontal, occluding |

Only keep content out of the fold when `foldIsOccluding` is true (book/tabletop). On a flat inner screen, panes may meet at the centre.

## Workflow

1. Find the app's root view (SwiftUI) or root element (web). Add DuoKit once there; don't scatter detection.
2. Pick the layout per display. On the cover, show one pane (usually the list). On the inner screen, show list + detail across the fold. In tabletop, put media above the fold and controls below it.
3. Wire the hinge (native) or accept the shape fallback (web, see Limits).
4. Optional: add the unfold on the cover ↔ inner handoff.
5. Verify every row of the table above with simulated input (`classify()` is pure), not just on the current screen.

## SwiftUI

```swift
.package(url: "https://github.com/arjunkshah12345-hash/duokit", from: "0.1.0") // iOS 17+, macOS 14+, visionOS 1+

import DuoKit

DuoSplit(foldGap: 24, cover: .primary) {     // cover: .primary | .secondary | .stacked
    InboxList()
} secondary: {
    MessageDetail()
}
.duoAware()                                   // once per scene, near the root

@Environment(\.duoState) private var duo      // display, posture, hinge, hingeAngle, size, foldIsOccluding, foldAxis
```

Hinge: `.duoAware()` alone infers cover/inner from window shape. For book/tabletop and the live angle, pass what the iOS 27.1 hinge API reports (`onHingeChange` / `UIHingeInteraction`): `.duoAware(hinge: DuoHingeStatus, angle: Double?)`, where `DuoHingeStatus` is `.closed | .partiallyOpen | .fullyOpen | .unknown`. DuoKit deliberately doesn't call those symbols itself, so check the real names in the SDK before wiring them.

Unfold (Metal `layerEffect`, which turns itself off at rest):

```swift
HomeView().unfoldTransition(role: duo.display == .cover ? .cover : .inner, trigger: duo.display) // timed
HomeView().unfoldEffect(angle: duo.hingeAngle ?? 180, role: .inner)                           // follows the hinge
```

## Web

Not on npm yet: `cd web && npm i && npm run build`, or copy `web/src` (no runtime deps; React optional).

```js
import { installDuoCSS } from 'duokit'
import 'duokit/duo.css'
installDuoCSS() // sets data-duo-display / data-duo-posture and --duo-fold-x/-y/-width/-height on <html>
```

```html
<div class="duo-split"><nav>list</nav><article>detail, inner screen only</article></div>
```

```css
[data-duo-display='cover'] .toolbar { position: fixed; bottom: 0 }
[data-duo-posture='tabletop'] video { height: var(--duo-fold-y) }
```

JS/React: `watchDuo(cb, { onDisplayChange })`, `readDuo()`, `classify(input)` (pure, so use it for previews and SSR), `useDuo()`, `<DuoSplit primary secondary cover state>`, `useUnfoldAngle()`, `<UnfoldCanvas src angle role>`. Framework-free unfold: `new UnfoldRenderer(canvas, { role })`, `.setSource(img|canvas|video)`, `playUnfold({ onFrame: a => r.render(a) })`, `applyUnfoldStyle(el, angle, role)` for live DOM.

Testing a posture without a device:

```ts
classify({
  viewport: { width: 890, height: 626 }, screen: { width: 890, height: 626 }, devicePosture: 'folded',
  segments: [{ x: 0, y: 0, width: 437, height: 626 }, { x: 453, y: 0, width: 437, height: 626 }],
}) // → inner / book / vertical fold at x=437
```

## Limits (tell the user)

- Safari 27.1 ships Device Posture and Viewport Segments behind flags. With them off, web can tell cover from inner by shape (short side cut-offs 560/720 pt, aspect 1.3–1.6), but not book/tabletop.
- The unfold is a reconstruction from public footage, not Apple's code. Timings are in `docs/ANIMATION.md`.
- If you change the animation model, change it in both `web/src/model.ts` and `Sources/DuoKit/UnfoldModel.swift`, run `npm run fixtures`, and commit `fixtures/unfold.json`. Both test suites assert it.

## Realistic iPhone Duo mockup (HTML/CSS)

For marketing pages or demos, draw hardware, not a dark rectangle, and put real iOS on its screens. `web/demo/index.html`, `style.css` and `ios.ts` are the reference build. Rules it follows:

- **Proportions from the spec sheet.** Open: 164.6 × 117.8 × 5.2 mm per half. Closed: 84.1 × 117.8 × 11.3 mm. Cover display 1398 × 2034 px. Inner display 2670 × 1878 px. So each half is 82.3 : 117.8 (`--w: 240px; --h: 344px`).
- **Layers, outside in:** a titanium rim (~1 mm; a multi-stop gradient, not a flat colour), then black cover glass as the bezel (~2.5 mm), then the display with concentric corner radii (`screen r = outer r − rim − bezel`). Add a faint diagonal reflection over the glass.
- **Finishes:** Star White (warm light titanium, the one in Apple's films) and Night Sky (dark titanium). Keep the bezel black on both.
- **Details that sell it:** a punch-hole camera in the cover's top corner away from the hinge, not a Dynamic Island (the inner camera is under the display), status painted into the screen content, volume and Camera Control on the outer edge, the side button (Touch ID) on top, and a titanium hinge barrel showing in the small notches at the hinge. Leave out rim and bezel on the hinge side of the inner screen: it's one continuous panel. Don't draw a crease line. Overlap the two halves by 1px so anti-aliasing doesn't leave a seam, and lay one glass reflection across both halves rather than one per half.
- **Depth:** give the moving half real thickness. Put its front face at z = 0, its back (cover) face at `translateZ(-t) rotateY(180deg)`, and an outward-facing edge strip with `backface-visibility: hidden`. Don't use `preserve-3d` across both halves, because Chrome mis-sorts them; paint order (the moving half after the fixed half) is enough.
- **Lighting from the hinge angle:** darken each face by about `0.3 · (1 − cos θ)/2` as it turns away, and add shadow near the hinge on the fixed half as it closes. Keep it light: the unfold shader already shades the screens.
- **Make the unfold read like Apple's.** Feed each panel `UnfoldRenderer` output, not a CSS blur. The model blurs and darkens only the panel that swings: sharp at the hinge, growing linearly to a near-black, heavily blurred free edge with dark corners. The half in your hand doesn't change. Also:
  - Set the stage's CSS `perspective` to `UNFOLD.viewDistance` × the panel width (3.75 × `--w`), with the perspective origin on the hinge. The model ray-casts for that eye distance, so content holds still while the panel visibly grows toward you. A weak perspective (e.g. 1800px) flattens the effect and breaks the illusion.
  - Give both screens one shared wallpaper: paint it at inner-screen size, and give the cover the half it lies over when closed.
  - Lay the home screen out for the hand-off, as iOS does on iPhone Duo: paint the cover's page again on the half of the inner screen the cover lies over, and put new content (a large widget) on the half that unfolds. Then nothing under your thumb moves, and only the new half resolves out of the blur.
  - Time-driven playback: `playUnfold` with ~1–1.4 s and the cosine ease. A real open by hand is about a second.
- **Stage:** a white page with a soft studio shadow (`filter: drop-shadow(...)` on the stage), so the shadow follows the silhouette while the phone folds.
- **Screen content must look like iPhone Duo's iOS, not a wireframe or an iPad.** No coloured squares or grey bars. In `ios.ts` the home screen is painted in points at 1.5 px/pt, with positions measured from Apple's films as fractions of the page:
  - one page: two 2×2 widgets (Weather, Find My) over a 4×4 grid of unlabelled icons, drawn as SVGs clipped to a 22.5% squircle
  - a right-hand column: the time, the status ring (Wi-Fi inside a battery ring, signal as dots), a vertical Liquid Glass dock (Phone, Safari, Messages, Music), and a round Search button at the bottom. Glass is the wallpaper blurred and tinted through the shape.
  - the cover shows that page with the camera above the time; the inner screen shows it on the half the cover covers, and a tall Photos "On This Day" widget on the other half
  - wallpaper: a landscape that reads when blurred (the demo paints desert dunes procedurally). Don't ship Apple's wallpapers or screenshots.
- **App previews:** build the app at real iOS point sizes (17pt body, 34pt large title, `#007AFF` tint, 0.5px `#c6c6c8` separators, a home indicator), then `transform: scale()` it into the frame. Don't hand-shrink fonts. Place split panes explicitly (`grid-column` / `grid-row`); auto-placement can drop a pane into the hinge track.
- **Check it** at 0°, ~70° in the three-quarter view, ~125°, and 180°, in both finishes, plus a ~390 px wide viewport. At ~125° it should look like Apple's film: a soft, dark swinging half beside a crisp resting half.
- **Recording in a headless or software-GL browser:** frames can drop. Drive the angle slowly (e.g. 10 s), record, then speed the video up with `ffmpeg -vf setpts=PTS/7`.
