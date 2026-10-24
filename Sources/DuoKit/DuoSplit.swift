import SwiftUI

/// Two panes that sit on either side of the fold.
///
/// - Cover screen / other devices: one pane (configurable).
/// - Inner, flat: side by side, split at the centre line.
/// - Inner, book: side by side with `foldGap` kept clear over the crease.
/// - Inner, tabletop: stacked top/bottom with `foldGap` over the crease.
public struct DuoSplit<Primary: View, Secondary: View>: View {
    public enum CoverBehavior: Sendable {
        case primary, secondary, stacked
    }

    @Environment(\.duoState) private var duo
    private let foldGap: CGFloat
    private let cover: CoverBehavior
    private let primary: Primary
    private let secondary: Secondary

    public init(
        foldGap: CGFloat = 24,
        cover: CoverBehavior = .primary,
        @ViewBuilder primary: () -> Primary,
        @ViewBuilder secondary: () -> Secondary
    ) {
        self.foldGap = foldGap
        self.cover = cover
        self.primary = primary()
        self.secondary = secondary()
    }

    public var body: some View {
        let gap = duo.foldIsOccluding ? foldGap : 0
        switch (duo.display, duo.foldAxis) {
        case (.inner, .horizontal?):
            VStack(spacing: gap) {
                primary.frame(maxWidth: .infinity, maxHeight: .infinity)
                secondary.frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        case (.inner, _):
            HStack(spacing: gap) {
                primary.frame(maxWidth: .infinity, maxHeight: .infinity)
                secondary.frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        default:
            switch cover {
            case .primary: primary
            case .secondary: secondary
            case .stacked:
                VStack(spacing: 0) {
                    primary
                    secondary
                }
            }
        }
    }
}
