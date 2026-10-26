# Changelog

All notable changes to DuoKit. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

### Added

- `DuoState`, `.duoAware()` and `.duoAware(hinge:angle:)`: one value for display, posture, fold and hinge angle (SwiftUI).
- `DuoSplit`: a two-pane layout that keeps content clear of the fold only when it physically blocks the screen.
- `.unfoldEffect(angle:role:)` and `.unfoldTransition(role:trigger:)`: the cover → inner unfold as a Metal `layerEffect`, perspective-correct and sharp at the hinge.
- Web: `classify()`, `watchDuo()`, `readDuo()`, `installDuoCSS()` and `duo.css` on the Device Posture and Viewport Segments APIs, with a screen-shape fallback.
- Web: `UnfoldRenderer`, `playUnfold()` and `applyUnfoldStyle()`, a WebGL2 port of the same unfold model.
- React: `useDuo()`, `<DuoSplit>`, `useUnfoldAngle()` and `<UnfoldCanvas>`.
- `fixtures/unfold.json`, asserted by both test suites so the two ports can't drift.
- The demo site, with a realistic iPhone Duo mockup and real iOS home screens.
- An agent skill in `skills/duokit`.

[Unreleased]: https://github.com/arjunkshah12345-hash/duokit/compare/0.1.0...HEAD
[0.1.0]: https://github.com/arjunkshah12345-hash/duokit/releases/tag/0.1.0
