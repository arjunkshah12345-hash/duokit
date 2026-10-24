# DuoKit

Make apps fold-aware on **iPhone Duo**, and get the Duo's cover → inner **unfold animation** as open code.

- **SwiftUI** (`DuoKit` Swift package): one `DuoState` for display + posture, `DuoSplit` for two-pane layouts that respect the fold, and `.unfoldEffect` / `.unfoldTransition`, a Metal shader version of the unfold.
- **Web** (`duokit` npm package): posture detection from the Device Posture and Viewport Segments APIs (Safari 27.1), `duo.css` for no-JS layouts, React bindings, and a WebGL2 renderer for the unfold.
- **One model, two ports.** The animation is pure math in [`web/src/model.ts`](web/src/model.ts) and [`Sources/DuoKit/UnfoldModel.swift`](Sources/DuoKit/UnfoldModel.swift). Both test suites assert the same [`fixtures/unfold.json`](fixtures/unfold.json), so the two can't drift apart.

**Live demo:** https://arjunkshah12345-hash.github.io/duokit/ · How the animation was reverse-engineered: [docs/ANIMATION.md](docs/ANIMATION.md)

> Unofficial. Not affiliated with Apple. The unfold is a reconstruction from public footage and teardowns, not Apple's code.

---

## Why

The Duo gives one app two very different canvases: a ~1.45:1 portrait cover screen and a ~1.42:1 landscape inner screen with a crease down the middle. The inner screen can also be half-folded (book or tabletop). Most layouts written for a 19.5:9 slab don't fit any of these. DuoKit reduces the device to one value and gives you layouts that react to it.

| | display | posture | fold |
|---|---|---|---|
| Slab iPhone | `other` | `unknown` | none |
| Duo, closed | `cover` | `flat` | none |
| Duo, open flat | `inner` | `flat` | centre line, not occluding |
| Duo, half-open, landscape | `inner` | `book` | vertical, occluding |
| Duo, half-open, portrait | `inner` | `tabletop` | horizontal, occluding |

---

## SwiftUI

```swift
// Package.swift
.package(url: "https://github.com/arjunkshah12345-hash/duokit", from: "0.1.0")
```

iOS 17+, macOS 14+, visionOS 1+.

### Layout

```swift
import DuoKit

struct MailScene: View {
    var body: some View {
        DuoSplit {
            InboxList()          // cover: the only pane
        } secondary: {
            MessageDetail()      // inner: beside the fold (or below it in tabletop)
        }
        .duoAware()              // once per scene, near the root
    }
}

struct MessageDetail: View {
    @Environment(\.duoState) private var duo
    var body: some View {
        Text(duo.posture == .tabletop ? "Video up top, controls below" : "Reading")
    }
}
```

`DuoSplit` leaves `foldGap` (24pt by default) clear over the crease only when the fold is physically bent. When the screen is flat, the panes meet at the centre.

### Hinge input (iOS 27.1)

On its own, `.duoAware()` infers the display from the window's shape. To get book/tabletop posture and the live angle, pass in what the system hinge API reports:

```swift
@State private var hinge: DuoHingeStatus = .unknown
@State private var angle: Double?

ContentView()
    .duoAware(hinge: hinge, angle: angle)
    // Wire this to the iOS 27.1 hinge API (`onHingeChange` / `UIHingeInteraction`),
    // mapping its status to DuoHingeStatus and its angle to degrees.
```

DuoKit doesn't call the 27.1 symbols itself, so it still builds on older SDKs, and Apple's final API names can't break it.

### The unfold

```swift
// Timed: plays whenever the app moves between screens.
HomeView()
    .unfoldTransition(role: duo.display == .cover ? .cover : .inner, trigger: duo.display)

// Hand-driven: follows the hinge exactly.
HomeView()
    .unfoldEffect(angle: duo.hingeAngle ?? 180, role: .inner)
```

The effect is a SwiftUI `layerEffect` backed by [`Unfold.metal`](Sources/DuoKit/Unfold.metal). At rest it switches itself off and costs nothing.

---

## Web

Not on npm yet. Build it from the repo (`cd web && npm i && npm run build`), or copy `web/src`, which has no runtime dependencies (React is optional).

### Plain CSS

```js
import { installDuoCSS } from 'duokit'
import 'duokit/duo.css'

installDuoCSS() // sets data-duo-display / data-duo-posture / --duo-fold-* on <html>
```

```html
<div class="duo-split">
  <nav>…list…</nav>        <!-- always shown -->
  <article>…detail…</article> <!-- only on the inner screen, beside the fold -->
</div>
```

```css
[data-duo-display='cover'] .toolbar { position: fixed; bottom: 0 }
[data-duo-posture='tabletop'] video { height: var(--duo-fold-y) }
```

`duo.css` reads the native `env(viewport-segment-*)` variables and the `(horizontal-viewport-segments: 2)` media query where the browser supports them. JavaScript fills in the gaps elsewhere.

### JS / React

```ts
import { watchDuo, classify } from 'duokit'

watchDuo((s) => console.log(s.display, s.posture, s.fold), {
  onDisplayChange: ({ from, to }) => console.log(`moved ${from} → ${to}`),
})
```

```tsx
import { DuoSplit, UnfoldCanvas, useDuo, useUnfoldAngle } from 'duokit/react'

function App() {
  const duo = useDuo()
  return <DuoSplit primary={<Inbox />} secondary={<Message />} />
}

function Wallpaper({ img }: { img: HTMLImageElement }) {
  const { angle, display } = useUnfoldAngle() // animates on cover ↔ inner
  return <UnfoldCanvas src={img} angle={angle} role={display === 'cover' ? 'cover' : 'inner'} />
}
```

`classify()` is a pure function, so you can feed it simulated input to preview layouts or render on the server (`<DuoSplit state={…}>`).

### The unfold, framework-free

```ts
import { UnfoldRenderer, playUnfold, applyUnfoldStyle } from 'duokit'

const r = new UnfoldRenderer(canvas, { role: 'inner' })
r.setSource(imageOrCanvasOrVideo)
playUnfold({ onFrame: (a) => r.render(a) })          // 0° → 180°

applyUnfoldStyle(someElement, 60, 'cover')            // CSS approximation for live DOM
```

---

## Detection, honestly

| Signal | Used for | Notes |
|---|---|---|
| Viewport Segments API | exact fold rect, book vs tabletop | Safari 27.1, behind a flag at launch |
| Device Posture API | `folded` vs `continuous` | Safari 27.1, behind a flag at launch |
| Screen shape | cover vs inner vs other | Both Duo screens are ~1.4:1, unlike any slab iPhone (~2.17:1). The cut-offs (560 / 720pt short side) are configurable. |

With the flags off, Safari reports neither the fold nor the posture. The screen-shape fallback still tells cover from inner, and a flat inner screen gets its centre fold line, but book/tabletop can't be detected. On native, pass the hinge status into `.duoAware(hinge:)`.

---

## Repo

```
Package.swift             Swift package (root, so SPM can depend on the git URL)
Sources/DuoKit/           SwiftUI: state, DuoSplit, unfold effect + Metal shader
Tests/DuoKitTests/        XCTest, including the shared fixture parity test
web/src/                  TypeScript: model, posture, WebGL renderer, React
web/demo/                 the demo site (npm run dev)
fixtures/unfold.json      generated by `npm run fixtures`; both ports assert it
docs/ANIMATION.md         the reverse-engineering notes
```

```sh
cd web && npm i && npm test && npm run dev    # web
xcodebuild test -scheme DuoKit -destination 'platform=macOS'   # swift
```

If you change the model, change it in both languages, run `npm run fixtures`, and commit the new JSON.

MIT licensed.
