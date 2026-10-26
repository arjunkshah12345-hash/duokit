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
    /// 0…1, cos of the moving panel's tilt: compression toward the hinge.
    public var stretch: Double
    /// 0…1, sin of the tilt: how far the free edge has swung toward the viewer.
    public var lift: Double
    /// 0…1, overall brightness.
    public var opacity: Double
    /// Blur radius at the far edge, as a fraction of the screen width.
    public var maxBlur: Double
}

public enum Unfold {
    public static let transitAngle = 90.0
    /// Assumed eye distance in panel widths (≈30 cm from an 8 cm panel).
    public static let viewDistance = 3.75
    /// Blur grows linearly with hinge distance, like the panel's gap from the image plane.
    public static let blurFalloff = 1.0
    /// Brightness lost at the free edge at full motion.
    public static let shadeGain = 0.9
    public static let shadeFalloff = 1.5
    public static let minStretch = 0.2
    public static let innerMaxBlur = 144.0 / 2670.0
    public static let coverMaxBlur = 144.0 / 1398.0
    public static let coverFadeOut = (120.0, 175.0)
    public static let innerFadeIn = (2.0, 20.0)

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
        let tilt = role == .cover ? a : 180 - a
        return UnfoldFrame(
            motion: smoothstep(0, transitAngle, tilt),
            stretch: max(cos(tilt * .pi / 180), minStretch),
            lift: sin(tilt * .pi / 180),
            opacity: role == .cover
                ? 1 - smoothstep(coverFadeOut.0, coverFadeOut.1, a)
                : smoothstep(innerFadeIn.0, innerFadeIn.1, a),
            maxBlur: role == .cover ? coverMaxBlur : innerMaxBlur
        )
    }

    /// Normalised distance from the hinge: 0 at the fold, 1 at the far edge.
    public static func hingeDistance(_ u: Double, role: ScreenRole, hinge: HingeSide = .leading) -> Double {
        let x = hinge == .trailing ? 1 - u : u
        return role == .cover ? clamp(x) : clamp(abs(x - 0.5) * 2)
    }

    /// True on the panel that swings: all of the cover, one half of the inner screen.
    public static func isMoving(_ u: Double, role: ScreenRole, hinge: HingeSide = .leading) -> Bool {
        let x = hinge == .trailing ? 1 - u : u
        return role == .cover || x < 0.5
    }

    /// How much further a moving-panel ray reaches across the open screen plane.
    public static func perspective(at g: Double, frame f: UnfoldFrame) -> Double {
        viewDistance / (viewDistance - clamp(g) * f.lift)
    }

    /// Panel coordinate → content coordinate, so content stays put in space.
    public static func sampleU(_ u: Double, role: ScreenRole, frame f: UnfoldFrame, hinge: HingeSide = .leading) -> Double {
        let flip = hinge == .trailing
        let x = flip ? 1 - u : u
        var s = x
        if isMoving(u, role: role, hinge: hinge) {
            let g = hingeDistance(u, role: role, hinge: hinge)
            let reach = g * f.stretch * perspective(at: g, frame: f)
            s = role == .cover ? reach : 0.5 - reach / 2
        }
        return flip ? 1 - s : s
    }

    /// Vertical counterpart of `sampleU`: the nearer free edge samples a taller slice.
    public static func sampleV(_ u: Double, _ v: Double, role: ScreenRole, frame f: UnfoldFrame, hinge: HingeSide = .leading) -> Double {
        guard isMoving(u, role: role, hinge: hinge) else { return v }
        return 0.5 + (v - 0.5) * perspective(at: hingeDistance(u, role: role, hinge: hinge), frame: f)
    }

    /// Blur radius at distance `g`, as a fraction of the screen width. The resting half stays sharp.
    public static func blur(at g: Double, frame f: UnfoldFrame, moving: Bool = true) -> Double {
        guard moving else { return 0 }
        return f.maxBlur * f.motion * pow(clamp(g), blurFalloff)
    }

    /// Brightness multiplier at distance `g`. The resting half only follows the screen's opacity.
    public static func shade(at g: Double, frame f: UnfoldFrame, moving: Bool = true) -> Double {
        let loss = moving ? shadeGain * f.motion * pow(clamp(g), shadeFalloff) : 0
        return (1 - loss) * f.opacity
    }

    /// True when a sample lands on the open screen; rays that miss it see black.
    public static func onScreen(_ su: Double, _ sv: Double) -> Bool {
        (0...1).contains(su) && (0...1).contains(sv)
    }

    /// Hinge angle over normalised time for a time-driven unfold (cosine ease).
    public static func angle(at t: Double) -> Double {
        90 * (1 - cos(.pi * clamp(t)))
    }
}
