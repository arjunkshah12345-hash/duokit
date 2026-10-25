import XCTest
@testable import DuoKit

private struct Fixtures: Decodable {
    struct Frame: Decodable {
        struct Values: Decodable { let motion, stretch, lift, opacity, maxBlur: Double }
        struct Pixel: Decodable {
            let u, g, sampleU, sampleV, blur, shade: Double
            let moving: Bool
        }
        let role: String
        let angle: Double
        let frame: Values
        let pixels: [Pixel]
    }
    struct Ease: Decodable { let t, angle: Double }
    let frames: [Frame]
    let ease: [Ease]
}

final class UnfoldModelTests: XCTestCase {
    func testMatchesSharedFixtures() throws {
        // Generated from the TypeScript model: keeps both ports in lockstep.
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("fixtures/unfold.json")
        let fx = try JSONDecoder().decode(Fixtures.self, from: Data(contentsOf: url))
        let eps = 1e-5
        for item in fx.frames {
            let role = try XCTUnwrap(ScreenRole(rawValue: item.role))
            let f = Unfold.frame(angle: item.angle, role: role)
            XCTAssertEqual(f.motion, item.frame.motion, accuracy: eps)
            XCTAssertEqual(f.stretch, item.frame.stretch, accuracy: eps)
            XCTAssertEqual(f.lift, item.frame.lift, accuracy: eps)
            XCTAssertEqual(f.opacity, item.frame.opacity, accuracy: eps)
            XCTAssertEqual(f.maxBlur, item.frame.maxBlur, accuracy: eps)
            for p in item.pixels {
                let g = Unfold.hingeDistance(p.u, role: role)
                XCTAssertEqual(g, p.g, accuracy: eps)
                XCTAssertEqual(Unfold.isMoving(p.u, role: role), p.moving)
                XCTAssertEqual(Unfold.sampleU(p.u, role: role, frame: f), p.sampleU, accuracy: eps)
                XCTAssertEqual(Unfold.sampleV(p.u, 0, role: role, frame: f), p.sampleV, accuracy: eps)
                XCTAssertEqual(Unfold.blur(at: g, frame: f, moving: p.moving), p.blur, accuracy: eps)
                XCTAssertEqual(Unfold.shade(at: g, frame: f, moving: p.moving), p.shade, accuracy: eps)
            }
        }
        for e in fx.ease {
            XCTAssertEqual(Unfold.angle(at: e.t), e.angle, accuracy: eps)
        }
    }

    func testRestStates() {
        XCTAssertEqual(Unfold.frame(angle: 0, role: .cover).motion, 0)
        XCTAssertEqual(Unfold.frame(angle: 180, role: .inner).motion, 0)
        XCTAssertEqual(Unfold.frame(angle: 180, role: .cover).opacity, 0)
        XCTAssertEqual(Unfold.frame(angle: 0, role: .inner).opacity, 0)
    }
}

final class DuoStateTests: XCTestCase {
    func testCover() {
        let s = DuoState.classify(size: CGSize(width: 466, height: 678))
        XCTAssertEqual(s.display, .cover)
        XCTAssertEqual(s.posture, .flat)
        XCTAssertNil(s.foldAxis)
    }

    func testSlabPhoneIsOther() {
        XCTAssertEqual(DuoState.classify(size: CGSize(width: 402, height: 874)).display, .other)
    }

    func testInnerFlatAndBook() {
        let flat = DuoState.classify(size: CGSize(width: 890, height: 626))
        XCTAssertEqual(flat.display, .inner)
        XCTAssertEqual(flat.posture, .flat)
        XCTAssertEqual(flat.foldAxis, .vertical)
        XCTAssertFalse(flat.foldIsOccluding)

        let book = DuoState.classify(size: CGSize(width: 890, height: 626), hinge: .partiallyOpen, angle: 110)
        XCTAssertEqual(book.posture, .book)
        XCTAssertTrue(book.foldIsOccluding)
        XCTAssertEqual(book.hingeAngle, 110)
    }

    func testTabletop() {
        let s = DuoState.classify(size: CGSize(width: 626, height: 890), hinge: .partiallyOpen)
        XCTAssertEqual(s.posture, .tabletop)
        XCTAssertEqual(s.foldAxis, .horizontal)
    }
}

#if canImport(Metal)
import Metal

final class ShaderBundleTests: XCTestCase {
    func testMetalLibraryShipsTheUnfoldShader() throws {
        let url = try XCTUnwrap(
            Bundle.duoKitResources.url(forResource: "default", withExtension: "metallib"),
            "Unfold.metal was not compiled into the package bundle"
        )
        guard let device = MTLCreateSystemDefaultDevice() else {
            throw XCTSkip("No Metal device on this runner; metallib presence verified only")
        }
        let library = try device.makeLibrary(URL: url)
        XCTAssertTrue(library.functionNames.contains("duoUnfold"))
    }
}
#endif
