// The unfold effect for SwiftUI `.layerEffect`. Mirrors the WebGL shader in
// web/src/unfold.ts and the math in UnfoldModel.swift.
#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

constant float VIEW = 3.75;
constant float BLUR_FALLOFF = 3.0;
constant float FIXED_BLUR = 0.4;
constant float SHADE_GAIN = 0.75;
constant float SHADE_FALLOFF = 2.0;
constant float FIXED_DIM = 0.25;

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
    float sy = 0.5 + (uv.y - 0.5) * k;

    float2 lo = origin;
    float2 hi = origin + size - 1.0;
    float2 center = clamp(origin + float2(sx, sy) * size, lo, hi);
    float falloff = g > 0.0 ? pow(g, BLUR_FALLOFF) : 0.0;
    float r = maxBlur * motion * falloff * (moving ? 1.0 : FIXED_BLUR) * size.x;

    float4 color;
    if (r < 0.5) {
        color = float4(layer.sample(center));
    } else {
        // 7x7 binomial kernel, radius r.
        const float w[7] = {1.0, 6.0, 15.0, 20.0, 15.0, 6.0, 1.0};
        float step = r / 3.0;
        float4 acc = float4(0.0);
        for (int j = 0; j < 7; j++) {
            for (int i = 0; i < 7; i++) {
                float2 p = clamp(center + float2(float(i - 3), float(j - 3)) * step, lo, hi);
                acc += float4(layer.sample(p)) * (w[i] * w[j]);
            }
        }
        color = acc / 4096.0;
    }

    float gp = g > 0.0 ? pow(g, SHADE_FALLOFF) : 0.0;
    float loss = moving ? SHADE_GAIN * motion * gp : FIXED_DIM * motion;
    float shade = (1.0 - loss) * opacity;
    return half4(half3(color.rgb * shade), half(color.a));
}
