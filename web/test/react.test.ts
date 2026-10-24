import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { classify } from '../src/posture'
import { DuoSplit } from '../src/react'

const render = (state: ReturnType<typeof classify>, cover?: 'primary' | 'secondary' | 'stack') =>
  renderToStaticMarkup(createElement(DuoSplit, { primary: 'LIST', secondary: 'DETAIL', state, cover }))

describe('DuoSplit', () => {
  it('shows one pane on the cover screen', () => {
    const html = render(classify({ viewport: { width: 466, height: 678 }, screen: { width: 466, height: 678 } }))
    expect(html).toContain('data-duo-split="single"')
    expect(html).toContain('LIST')
    expect(html).not.toContain('DETAIL')
  })

  it('splits around the hinge on the inner screen', () => {
    const v = { width: 890, height: 626 }
    const html = render(
      classify({
        viewport: v,
        screen: v,
        segments: [
          { x: 0, y: 0, width: 437, height: 626 },
          { x: 453, y: 0, width: 437, height: 626 },
        ],
      }),
    )
    expect(html).toContain('data-duo-split="columns"')
    expect(html).toContain('grid-template-columns:437px 16px minmax(0, 1fr)')
    expect(html).toMatch(/LIST.*data-duo-fold.*DETAIL/)
  })

  it('can stack both panes on the cover', () => {
    const html = render(classify({ viewport: { width: 466, height: 678 }, screen: { width: 466, height: 678 } }), 'stack')
    expect(html).toContain('LIST')
    expect(html).toContain('DETAIL')
  })
})
