import Foundation

/// The unfold model: a reconstruction of the iPhone Duo cover → inner screen
/// hand-off as pure functions of the hinge angle (0° closed, 180° flat).
///
/// This is a line-for-line port of `web/src/model.ts`. Both test suites assert
/// `fixtures/unfold.json`, so the two implementations cannot drift apart.
public enum ScreenRole: String, Sendable, CaseIterable {
    case cover
    case inner
}

public enum HingeSide: Sendable {
    /// Hinge on the leading (left in LTR) edge of the cover / the leading inner half moves.
    case leading
    case trailing
}

public struct UnfoldFrame: Equatable, Sendable {
    /// 0…1, how far the screen is "in transit". Drives blur and shade.
    public var motion: Double
    /// 0…1, compression of the moving panel toward the hinge.
    public var stretch: Double
    /// 0…1, overall brightness.
    public var opacity: Double
    /// Blur radius at the far edge, as a fraction of the screen width.
    public var maxBlur: Double
}

public enum Unfold {
    public static let transitAngle = 90.0
    public static let falloff = 1.35
    public static let shadeStart = 0.2
    public static let shadeGain = 2.0
    public static let minStretch = 0.2
    public static let innerMaxBlur = 72.0 / 2670.0
    public static let coverMaxBlur = 72.0 / 1398.0
    public static let coverFadeOut = (120.0, 175.0)
    public static let innerFadeIn = (5.0, 60.0)

    @inline(__always)
    static func clamp(_ x: Double, _ lo: Double = 0, _ hi: Double = 1) -> Double {
        min(hi, max(lo, x))
    }

    public static func smoothstep(_ e0: Double, _ e1: Double, _ x: Double) -> Double {
        let t = clamp((x - e0) / (e1 - e0))
        return t * t * (3 - 2 * t)
    }

    /// Frame parameters for one screen at a hinge angle in degrees.
    public static func frame(angle: Double, role: ScreenRole) -> UnfoldFrame {
        let a = clamp(angle, 0, 180)
        switch role {
        case .cover:
            return UnfoldFrame(
                motion: smoothstep(0, transitAngle, a),
                stretch: max(cos(a * .pi / 180), minStretch),
                opacity: 1 - smoothstep(coverFadeOut.0, coverFadeOut.1, a),
                maxBlur: coverMaxBlur
            )
        case .inner:
            let tilt = 180 - a
            return UnfoldFrame(
                motion: smoothstep(0, transitAngle, tilt),
                stretch: max(cos(tilt * .pi / 180), minStretch),
                opacity: smoothstep(innerFadeIn.0, innerFadeIn.1, a),
                maxBlur: innerMaxBlur
            )
        }
    }

    /// Normalised distance from the hinge: 0 at the fold, 1 at the far edge.
    public static func hingeDistance(_ u: Double, role: ScreenRole, hinge: HingeSide = .leading) -> Double {
        let x = hinge == .trailing ? 1 - u : u
        return role == .cover ? clamp(x) : clamp(abs(x - 0.5) * 2)
    }

    /// Panel coordinate → content coordinate, so content stays put in space.
    public static func sampleU(_ u: Double, role: ScreenRole, frame f: UnfoldFrame, hinge: HingeSide = .leading) -> Double {
        let flip = hinge == .trailing
        let x = flip ? 1 - u : u
        let s: Double
        switch role {
        case .cover: s = x * f.stretch
        case .inner: s = x < 0.5 ? 0.5 - (0.5 - x) * f.stretch : x
        }
        return flip ? 1 - s : s
    }

    public static func blur(at g: Double, frame f: UnfoldFrame) -> Double {
        f.maxBlur * f.motion * pow(clamp(g), falloff)
    }

    public static func shade(at g: Double, frame f: UnfoldFrame) -> Double {
        let d = clamp((g - shadeStart) / (1 - shadeStart))
        return (1 - min(1, shadeGain * f.motion * pow(d, falloff))) * f.opacity
    }

    /// Hinge angle over normalised time for a time-driven unfold (cosine ease).
    public static func angle(at t: Double) -> Double {
        90 * (1 - cos(.pi * clamp(t)))
    }
}
