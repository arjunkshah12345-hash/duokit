# duokit

Make web apps fold-aware on iPhone Duo, and get the Duo's cover → inner unfold as a WebGL2 renderer.

```js
import { installDuoCSS, classify, watchDuo, UnfoldRenderer, playUnfold } from 'duokit'
import 'duokit/duo.css'
import { DuoSplit, useDuo, UnfoldCanvas, useUnfoldAngle } from 'duokit/react'
```

No runtime dependencies; React is an optional peer.

Docs, the SwiftUI port and the live demo: https://github.com/arjunkshah12345-hash/duokit

MIT. Unofficial, not affiliated with Apple.
