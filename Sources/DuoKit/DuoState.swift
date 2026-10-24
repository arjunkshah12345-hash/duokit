import SwiftUI

/// Which physical screen the app is on.
public enum DuoDisplay: String, Sendable {
    case cover, inner, other
}

/// How the inner screen is bent.
public enum DuoPosture: String, Sendable {
    /// Fully open (or the cover screen).
    case flat
    /// Half-open with a vertical fold, held like a book.
    case book
    /// Half-open with a horizontal fold, resting like a laptop.
    case tabletop
    case unknown
}

/// Mirrors the hinge status the iOS 27.1 hinge APIs report.
public enum DuoHingeStatus: String, Sendable {
    case closed, partiallyOpen, fullyOpen, unknown
}

public struct DuoThresholds: Sendable, Equatable {
    /// Short side (pt) below which a ~1.4:1 window is the cover screen.
    public var coverMaxShortSide: CGFloat = 560
    /// Short side (pt) below which a ~1.4:1 window is still the Duo inner screen.
    public var innerMaxShortSide: CGFloat = 720
    public var duoAspect: ClosedRange<CGFloat> = 1.3...1.6
    public init() {}
}

/// Everything a layout needs to know about the Duo, as one value.
public struct DuoState: Equatable, Sendable {
    public var display: DuoDisplay
    public var posture: DuoPosture
    public var hinge: DuoHingeStatus
    /// Degrees, 0 closed → 180 flat, when a live hinge stream is wired up.
    public var hingeAngle: Double?
    public var size: CGSize

    /// True when the fold is physically bent, so content should avoid it.
    public var foldIsOccluding: Bool { posture == .book || posture == .tabletop }
    public var foldAxis: Axis? {
        guard display == .inner else { return nil }
        return size.width >= size.height ? .vertical : .horizontal
    }

    public static let unknown = DuoState(display: .other, posture: .unknown, hinge: .unknown, hingeAngle: nil, size: .zero)

    /// Classify from the window size plus optional hinge input.
    public static func classify(
        size: CGSize,
        hinge: DuoHingeStatus = .unknown,
        angle: Double? = nil,
        thresholds: DuoThresholds = .init()
    ) -> DuoState {
        let short = min(size.width, size.height)
        let long = max(size.width, size.height)
        let aspect = short > 0 ? long / short : 0
        let duoShaped = thresholds.duoAspect.contains(aspect)

        var display: DuoDisplay = .other
        if hinge == .partiallyOpen || hinge == .fullyOpen {
            display = .inner
        } else if duoShaped && short < thresholds.coverMaxShortSide {
            display = .cover
        } else if duoShaped && short < thresholds.innerMaxShortSide {
            display = .inner
        }

        let posture: DuoPosture
        switch display {
        case .cover:
            posture = .flat
        case .inner:
            if hinge == .partiallyOpen {
                posture = size.width >= size.height ? .book : .tabletop
            } else {
                posture = .flat
            }
        case .other:
            posture = .unknown
        }
        return DuoState(display: display, posture: posture, hinge: hinge, hingeAngle: angle, size: size)
    }
}

private struct DuoStateKey: EnvironmentKey {
    static let defaultValue = DuoState.unknown
}

public extension EnvironmentValues {
    /// Set by `.duoAware()` on an ancestor.
    var duoState: DuoState {
        get { self[DuoStateKey.self] }
        set { self[DuoStateKey.self] = newValue }
    }
}

public extension View {
    /// Measures this view and publishes a `DuoState` to its subtree.
    ///
    /// Apply once near the root of each scene. Pass the hinge status/angle if
    /// you subscribe to the system hinge APIs; otherwise the display is
    /// inferred from the window shape.
    func duoAware(
        hinge: DuoHingeStatus = .unknown,
        angle: Double? = nil,
        thresholds: DuoThresholds = .init()
    ) -> some View {
        modifier(DuoAwareModifier(hinge: hinge, angle: angle, thresholds: thresholds))
    }
}

struct DuoAwareModifier: ViewModifier {
    let hinge: DuoHingeStatus
    let angle: Double?
    let thresholds: DuoThresholds
    @State private var size: CGSize = .zero

    func body(content: Content) -> some View {
        content
            .environment(\.duoState, DuoState.classify(size: size, hinge: hinge, angle: angle, thresholds: thresholds))
            .background {
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { size = proxy.size }
                        .onChange(of: proxy.size) { size = proxy.size }
                }
            }
    }
}
