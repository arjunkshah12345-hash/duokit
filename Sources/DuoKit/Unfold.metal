// The unfold effect for SwiftUI `.layerEffect`. Mirrors the WebGL shader in
// web/src/unfold.ts and the math in UnfoldModel.swift.
#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

constant float VIEW = 3.75;
constant float BLUR_FALLOFF = 1.0;
constant float SHADE_GAIN = 0.9;
constant float SHADE_FALLOFF = 1.5;

[[ stitchable ]] half4 duoUnfold(float2 position, SwiftUI::Layer layer, float4 bounds,
                                 float motion, float stretch, float lift, float opacity, float maxBlur,
                                 float role, float flip) {
    float2 origin = bounds.xy;
    float2 size = bounds.zw;
    float2 uv = (position - origin) / size;
    float x = flip > 0.5 ? 1.0 - uv.x : uv.x;
    bool moving = role < 0.5 || x < 0.5;
    float g = role < 0.5 ? clamp(x, 0.0, 1.0) : clamp(abs(x - 0.5) * 2.0, 0.0, 1.0);

    // Ray-cast the moving panel onto the plane of the open screen.
    float k = moving ? VIEW / (VIEW - g * lift) : 1.0;
    float reach = g * stretch * k;
    float sx = !moving ? x : (role < 0.5 ? reach : 0.5 - reach * 0.5);
    if (flip > 0.5) sx = 1.0 - sx;
    float2 p = float2(sx, 0.5 + (uv.y - 0.5) * k);
    float2 lo = origin;
    float2 hi = origin + size - 1.0;
    float r = moving ? maxBlur * motion * pow(g, BLUR_FALLOFF) * size.x : 0.0;

    // Rays that miss the open screen see black. Coverage is blurred with the
    // colour, so the black spreads softly into the free edge's corners.
    float4 color = float4(0.0);
    if (r < 0.5) {
        bool on = !moving || (p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0);
        color = on ? float4(layer.sample(clamp(origin + p * size, lo, hi))) : float4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 7x7 binomial kernel, radius r.
        const float w[7] = {1.0, 6.0, 15.0, 20.0, 15.0, 6.0, 1.0};
        float step = r / 3.0;
        float2 edge = max(float2(step) / size, 1.0 / size);
        for (int j = 0; j < 7; j++) {
            for (int i = 0; i < 7; i++) {
                float2 q = origin + p * size + float2(float(i - 3), float(j - 3)) * step;
                float2 qn = (q - origin) / size;
                float2 c = smoothstep(-edge, float2(0.0), qn) * (1.0 - smoothstep(float2(1.0), 1.0 + edge, qn));
                float4 tap = float4(layer.sample(clamp(q, lo, hi)));
                color += float4(tap.rgb * (c.x * c.y), tap.a) * (w[i] * w[j]);
            }
        }
        color /= 4096.0;
    }

    float loss = moving ? SHADE_GAIN * motion * pow(g, SHADE_FALLOFF) : 0.0;
    float shade = (1.0 - loss) * opacity;
    return half4(half3(color.rgb * shade), half(color.a));
}
