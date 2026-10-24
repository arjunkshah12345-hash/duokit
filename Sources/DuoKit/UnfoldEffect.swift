import SwiftUI

public extension View {
    /// Renders this view as one screen of the unfold transition at `angle`
    /// (degrees, 0 closed → 180 flat).
    ///
    /// Feed it a live hinge angle (e.g. from `onHingeChange` on iOS 27.1) for
    /// the real, hand-driven effect, or use `unfoldTransition(role:trigger:)`
    /// for a timed one.
    func unfoldEffect(
        angle: Double,
        role: ScreenRole,
        hinge: HingeSide = .leading,
        isEnabled: Bool = true
    ) -> some View {
        let f = Unfold.frame(angle: angle, role: role)
        let atRest = f.motion == 0 && f.stretch == 1 && f.opacity == 1
        let flip: Float = hinge == .trailing ? 1 : 0
        let roleValue: Float = role == .cover ? 0 : 1
        return visualEffect { content, proxy in
            let width = proxy.size.width
            let blur = f.maxBlur * f.motion * width
            let offset = CGSize(width: width * (1 - f.stretch) + blur, height: blur)
            return content.layerEffect(
                ShaderLibrary.bundle(.module).duoUnfold(
                    .boundingRect,
                    .float(Float(f.motion)),
                    .float(Float(f.stretch)),
                    .float(Float(f.opacity)),
                    .float(Float(f.maxBlur)),
                    .float(roleValue),
                    .float(flip)
                ),
                maxSampleOffset: offset,
                isEnabled: isEnabled && !atRest
            )
        }
    }

    /// Plays the unfold on this screen whenever `trigger` changes.
    ///
    /// `.inner` plays 0° → 180° (content resolves out of the fold); `.cover`
    /// plays 180° → 0° (content resolves back onto the cover when closing).
    /// Typical trigger: `duo.display`.
    func unfoldTransition<Trigger: Equatable>(
        role: ScreenRole,
        trigger: Trigger,
        duration: TimeInterval = 0.7,
        hinge: HingeSide = .leading
    ) -> some View {
        modifier(UnfoldTransitionModifier(role: role, trigger: trigger, duration: duration, hinge: hinge))
    }
}

struct UnfoldTransitionModifier<Trigger: Equatable>: ViewModifier {
    let role: ScreenRole
    let trigger: Trigger
    let duration: TimeInterval
    let hinge: HingeSide
    @State private var start: Date?

    func body(content: Content) -> some View {
        TimelineView(.animation(paused: start == nil)) { context in
            let t = start.map { min(1, context.date.timeIntervalSince($0) / duration) } ?? 1
            let opening = Unfold.angle(at: t)
            content.unfoldEffect(
                angle: role == .inner ? opening : 180 - opening,
                role: role,
                hinge: hinge,
                isEnabled: t < 1
            )
        }
        .onChange(of: trigger) {
            let began = Date()
            start = began
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(duration))
                if start == began { start = nil }
            }
        }
    }
}

extension Bundle {
    /// The package resource bundle holding the compiled `Unfold.metal`.
    static var duoKitResources: Bundle { .module }
}
