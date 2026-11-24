"use client";

import { useEffect, useRef } from "react";

/** Same rhythm as the original background grid. */
const CELL = 46;
/** Points per cell edge: enough to bend the lines smoothly around the cursor. */
const SUB = 4;
/** Radius (px) and depth of the dent the cursor makes in the grid. */
const RADIUS = 150;
const PUSH = 30;
const DEPTH = 0.45;
/** Max DPR rendered (sharp enough, half the pixels of a 3x screen). */
const MAX_DPR = 1.5;

/**
 * The background grid as a 3D surface: the cursor presses into it like a finger on a stretched net.
 * Lines bend away from the cursor, sink (they get closer and fainter at the bottom of the dent) and
 * light up on the slopes, then spring back when the cursor leaves.
 * <p>
 * Performance: one canvas, drawn only while something moves (idle = 0 frame), DPR capped,
 * paused when the tab is hidden, disabled with "reduce motion" (static grid).
 */
export function InteractiveGrid() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let rect = canvas.getBoundingClientRect();
    // target / current cursor (local px) and dent strength 0..1
    let tx = -9999;
    let ty = -9999;
    let cx = -9999;
    let cy = -9999;
    let targetAmp = 0;
    let amp = 0;
    // parallax offset: the grid drifts a little opposite to the cursor (depth)
    let px = 0;
    let py = 0;
    let frame = 0;

    const resize = () => {
      rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      request();
    };

    /** Displacement of a grid point: pushed away from the cursor, sinking toward it. */
    const project = (x: number, y: number): [number, number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      const f = amp * Math.exp(-d2 / (2 * RADIUS * RADIUS));
      if (f < 0.002) return [x, y, 0];
      const d = Math.sqrt(d2) || 1;
      // sideways push (lines flee the cursor) + perspective pull (deeper = closer to the centre)
      const push = (PUSH * f * Math.min(d, RADIUS)) / RADIUS;
      const sink = 1 - DEPTH * f;
      return [cx + (dx / d) * push + dx * sink, cy + (dy / d) * push + dy * sink, f];
    };

    /** Flat parts of every line, stroked once per frame. */
    let flat = new Path2D();
    const line = (pts: [number, number][]) => {
      // inside the dent each short run gets its own colour (depth); elsewhere it joins the flat path
      let prev = project(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const cur = project(pts[i][0], pts[i][1]);
        const f = Math.max(prev[2], cur[2]);
        if (f < 0.01) {
          flat.moveTo(prev[0], prev[1]);
          flat.lineTo(cur[0], cur[1]);
        } else {
          ctx.strokeStyle = `rgba(${Math.round(47 + 10 * f)},${Math.round(107 + 60 * f)},${Math.round(255 - 20 * f)},${(0.05 + 0.4 * f).toFixed(3)})`;
          ctx.lineWidth = 1 + f * 0.9;
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(cur[0], cur[1]);
          ctx.stroke();
        }
        prev = cur;
      }
    };

    const draw = () => {
      frame = 0;
      // ease toward the target (spring-like, frame-rate independent enough at 60-144 Hz)
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      amp += (targetAmp - amp) * 0.12;
      const ptx = targetAmp > 0 ? -(tx / Math.max(width, 1) - 0.5) * 10 : 0;
      const pty = targetAmp > 0 ? -(ty / Math.max(height, 1) - 0.5) * 10 : 0;
      px += (ptx - px) * 0.08;
      py += (pty - py) * 0.08;

      ctx.clearRect(0, 0, width, height);
      const step = CELL / SUB;
      const ox = (((px % CELL) + CELL) % CELL) - CELL;
      const oy = (((py % CELL) + CELL) % CELL) - CELL;
      const near = amp > 0.01;
      flat = new Path2D();

      for (let x = ox; x <= width + CELL; x += CELL) {
        // far from the cursor a straight line is enough (2 points)
        if (!near || Math.abs(x - cx) > RADIUS * 3) line([[x, oy], [x, height + CELL]]);
        else {
          const pts: [number, number][] = [];
          for (let y = oy; y <= height + CELL; y += step) pts.push([x, y]);
          line(pts);
        }
      }
      for (let y = oy; y <= height + CELL; y += CELL) {
        if (!near || Math.abs(y - cy) > RADIUS * 3) line([[ox, y], [width + CELL, y]]);
        else {
          const pts: [number, number][] = [];
          for (let x = ox; x <= width + CELL; x += step) pts.push([x, y]);
          line(pts);
        }
      }

      ctx.strokeStyle = "rgba(47,107,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke(flat);

      // glowing nodes at the bottom of the dent
      if (near) {
        for (let x = ox; x <= width + CELL; x += CELL) {
          if (Math.abs(x - cx) > RADIUS * 1.6) continue;
          for (let y = oy; y <= height + CELL; y += CELL) {
            if (Math.abs(y - cy) > RADIUS * 1.6) continue;
            const [nx, ny, f] = project(x, y);
            if (f < 0.08) continue;
            ctx.fillStyle = `rgba(47,107,255,${(0.55 * f).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(nx, ny, 1 + 1.6 * f, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const moving =
        Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3 || Math.abs(targetAmp - amp) > 0.003 || Math.abs(ptx - px) > 0.05 || Math.abs(pty - py) > 0.05;
      if (moving) request();
    };

    function request() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= width && y <= height;
      if (inside && targetAmp === 0 && amp < 0.02) {
        // enters: the dent starts under the cursor instead of sliding from far away
        cx = x;
        cy = y;
      }
      tx = x;
      ty = y;
      targetAmp = inside ? 1 : 0;
      request();
    };
    const onLeave = () => {
      targetAmp = 0;
      request();
    };
    const onScroll = () => {
      rect = canvas.getBoundingClientRect();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
      document.addEventListener("visibilitychange", request);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("visibilitychange", request);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
