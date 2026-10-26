# Contributing to DuoKit

Thanks for helping. DuoKit is small on purpose, so a focused PR with a test is the fastest way in.

## Setup

```sh
cd web && npm i
npm run typecheck && npm test   # web
npm run dev                     # the demo, at http://localhost:5173

xcodebuild test -scheme DuoKit -destination 'platform=macOS'   # Swift
```

CI runs both suites on every push and builds the Swift package for the iOS Simulator, which compiles the Metal shader.

## The one rule: keep the two ports in step

The unfold is the same pure function of the hinge angle in [`web/src/model.ts`](web/src/model.ts) and [`Sources/DuoKit/UnfoldModel.swift`](Sources/DuoKit/UnfoldModel.swift). If you change one:

1. Make the same change in the other language.
2. Run `npm run fixtures` in `web/` to regenerate [`fixtures/unfold.json`](fixtures/unfold.json).
3. Commit the new JSON. Both test suites assert it, so a one-sided change fails CI.

If you change a number in the model, update [docs/ANIMATION.md](docs/ANIMATION.md) with where it came from.

## Posture changes

`classify()` is pure. Add a test case for every display/posture/fold row your change touches, in [`web/test/posture.test.ts`](web/test/posture.test.ts) and [`Tests/DuoKitTests`](Tests/DuoKitTests).

## Hinge APIs

DuoKit deliberately doesn't call the iOS 27.1 hinge symbols or depend on Safari flags, so it builds on older SDKs. Keep new platform calls behind availability checks or behind an input the app passes in.

## Pull requests

- Branch off `main`, keep each PR to one change, and say why in the description.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- For visual changes to the unfold or the demo, attach a before/after screenshot or clip.

By contributing, you agree your work is released under the [MIT License](LICENSE).
