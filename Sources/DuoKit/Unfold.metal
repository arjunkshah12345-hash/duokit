// The unfold effect for SwiftUI `.layerEffect`. Mirrors the WebGL shader in
// web/src/unfold.ts and the math in UnfoldModel.swift.
#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

[[ stitchable ]] half4 duoUnfold(float2 position, SwiftUI::Layer layer, float4 bounds,
                                 float motion, float stretch, float opacity, float maxBlur,
                                 float role, float flip) {
    float2 origin = bounds.xy;
    float2 size = bounds.zw;
    float u = (position.x - origin.x) / size.x;
    float x = flip > 0.5 ? 1.0 - u : u;

    float g;
    float sx;
    if (role < 0.5) {
        g = clamp(x, 0.0, 1.0);
        sx = x * stretch;
    } else {
        g = clamp(abs(x - 0.5) * 2.0, 0.0, 1.0);
        sx = x < 0.5 ? 0.5 - (0.5 - x) * stretch : x;
    }
    if (flip > 0.5) sx = 1.0 - sx;

    float2 center = float2(origin.x + sx * size.x, position.y);
    float falloff = g > 0.0 ? pow(g, 1.35) : 0.0;
    float r = maxBlur * motion * falloff * size.x;

    float4 color;
    if (r < 0.5) {
        color = float4(layer.sample(center));
    } else {
        // 7x7 binomial kernel, radius r.
        const float w[7] = {1.0, 6.0, 15.0, 20.0, 15.0, 6.0, 1.0};
        float step = r / 3.0;
        float2 lo = origin;
        float2 hi = origin + size - 1.0;
        float4 acc = float4(0.0);
        for (int j = 0; j < 7; j++) {
            for (int i = 0; i < 7; i++) {
                float2 p = clamp(center + float2(float(i - 3), float(j - 3)) * step, lo, hi);
                acc += float4(layer.sample(p)) * (w[i] * w[j]);
            }
        }
        color = acc / 4096.0;
    }

    float d = clamp((g - 0.2) / 0.8, 0.0, 1.0);
    float dp = d > 0.0 ? pow(d, 1.35) : 0.0;
    float shade = (1.0 - min(1.0, 2.0 * motion * dp)) * opacity;
    return half4(half3(color.rgb * shade), half(color.a));
}
