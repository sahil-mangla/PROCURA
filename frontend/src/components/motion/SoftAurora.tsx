"use client";

// Adapted from RewampUI "Soft Aurora" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: props for colours, transparent premultiplied output so an image can sit underneath, half-resolution
// rendering with an fps cap, reduced-motion and no-WebGL fallbacks, cleanup of GL resources.
import { useEffect, useRef, useState } from "react";

type Props = {
  /** Three glow colours as hex. */
  colors?: [string, string, string];
  /** 0 to 1. How strong the glow bands are. */
  intensity?: number;
  /** Fraction of CSS pixels to render at. The effect is soft, so 0.5 looks the same and costs a quarter. */
  scale?: number;
  fps?: number;
  className?: string;
};

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 u_resolution; uniform float u_time; uniform float u_intensity;
uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3;
void main(){
  vec2 p = gl_FragCoord.xy / u_resolution.xy;
  p.x *= u_resolution.x / u_resolution.y;
  float t = u_time * 0.15;
  float wave1 = sin(p.x * 2.0 + t) * 0.5 + 0.5;
  float wave2 = sin(p.y * 3.0 - t * 1.5 + wave1) * 0.5 + 0.5;
  float wave3 = sin((p.x + p.y) * 2.0 + t + wave2 * 2.0) * 0.5 + 0.5;
  vec3 layer = mix(mix(u_c1, u_c2, wave1), u_c3, wave2);
  float mask = smoothstep(0.4, 0.6, wave3);
  mask *= sin(p.y * 3.14159) * 1.2;
  float glow = clamp(mask * u_intensity + smoothstep(0.7, 1.0, wave2) * 0.2 * u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(layer * glow, glow);
}`;

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function SoftAurora({ colors = ["#5ad1c8", "#6f8cff", "#b48cff"], intensity = 0.55, scale = 0.5, fps = 30, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) { setFailed(true); return; }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setFailed(true); return; }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setFailed(true); return; }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);
    const uTime = u("u_time"), uRes = u("u_resolution");
    gl.uniform1f(u("u_intensity"), intensity);
    gl.uniform3fv(u("u_c1"), hex(colors[0]));
    gl.uniform3fv(u("u_c2"), hex(colors[1]));
    gl.uniform3fv(u("u_c3"), hex(colors[2]));
    gl.clearColor(0, 0, 0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      canvas.width = Math.max(2, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(14); });
    ro.observe(canvas);
    resize();

    let raf = 0, last = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / fps) return;
      last = now;
      draw((now - start) / 1000);
    };
    if (reduce) draw(14); else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [colors, intensity, scale, fps]);

  if (failed) {
    return (
      <div
        aria-hidden
        className={className}
        style={{ background: `radial-gradient(60% 50% at 20% 30%, ${colors[0]}55, transparent), radial-gradient(50% 50% at 80% 20%, ${colors[1]}55, transparent), radial-gradient(60% 50% at 60% 90%, ${colors[2]}44, transparent)` }}
      />
    );
  }
  return <canvas ref={ref} aria-hidden className={className} />;
}
