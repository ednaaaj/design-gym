import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { route, type Pt } from '../lib/route.ts';

/* A route drawn beside a list of stops. Children mark each stop with [data-stop] and the line
   the route passes through with [data-waypoint]. The route draws as the reader scrolls and a
   marker travels it; a stop is "arrived" once the marker has passed its waypoint.

   Progress is 0 when the rail's top reaches the reading line and 1 when its bottom does.
   CSS drives it with a view timeline where supported; otherwise this file sets --p. The
   reading line must match `view(block 60% 40%)` in Landing.css. */
const READING_LINE = 0.6;
const LANES = [24, 72]; // stop x positions, alternating, inside the 96px rail

type Geo = { d: string; h: number; stops: Pt[]; at: number[] };

export default function RouteMap({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  // Measure where each waypoint sits; redo it whenever text reflows.
  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const stops = [...el.querySelectorAll('[data-waypoint]')].map((w, i) => {
        const r = w.getBoundingClientRect();
        return { x: LANES[i % 2], y: Math.round(r.top - top + r.height / 2) };
      });
      if (!stops.length) return;
      const { d, at } = route({ x: stops[0].x, y: 0 }, stops);
      setGeo((g) => (g?.d === d ? g : { d, at, stops, h: stops[stops.length - 1].y }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Follow the scroll: set progress (fallback only) and flip stops to arrived as the marker passes.
  useLayoutEffect(() => {
    if (!geo) return;
    const el = box.current!;
    const r = rail.current!;
    const stops = [...el.querySelectorAll<HTMLElement>('[data-stop]')];
    const pins = [...r.querySelectorAll<SVGGElement>('[data-pin]')];
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const viewTimeline = !still && CSS.supports('animation-timeline: view()');
    if (viewTimeline) r.dataset.timeline = 'view';
    if (!still) el.dataset.motion = '';

    let frame = 0;
    const update = () => {
      frame = 0;
      const b = r.getBoundingClientRect();
      const vh = document.documentElement.clientHeight;
      const p = still ? 1 : Math.min(1, Math.max(0, (vh * READING_LINE - b.top) / b.height));
      if (!viewTimeline) r.style.setProperty('--p', String(p));
      geo.at.forEach((at, i) => {
        const on = p >= at - 0.001;
        for (const node of [stops[i], pins[i]]) {
          if (node && node.hasAttribute('data-arrived') !== on) node.toggleAttribute('data-arrived', on);
        }
      });
      const done = p >= 1 - 0.001;
      if (r.hasAttribute('data-done') !== done) r.toggleAttribute('data-done', done);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // Transitions start only after the first settled state, so loading mid-page does not animate.
    const ready = requestAnimationFrame(() => (el.dataset.ready = ''));
    if (still) return () => cancelAnimationFrame(ready);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(ready);
      cancelAnimationFrame(frame);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, [geo]);

  const last = geo ? geo.stops.length - 1 : -1;
  return (
    <div className="rm" ref={box}>
      <div className="rm-rail" ref={rail} aria-hidden="true" style={geo ? { height: geo.h } : undefined}>
        {geo && (
          <>
            <svg className="rm-map" width="96" height={geo.h} viewBox={`0 0 96 ${geo.h}`}>
              <path className="rm-trail" d={geo.d} />
              <path className="rm-ink" d={geo.d} pathLength={1} />
              {geo.stops.map((s, i) => (
                <g key={i} data-pin className={i === last ? 'rm-pin rm-pin-goal' : 'rm-pin'} transform={`translate(${s.x} ${s.y})`}>
                  <circle className="rm-pin-base" r={i === last ? 11 : 6} />
                  {/* draws round the stop as the marker arrives */}
                  <circle className="rm-pin-ring" r={i === last ? 16 : 10} pathLength={1} />
                  <g className="rm-pin-fill">
                    {i === last ? (
                      <>
                        <circle className="rm-goal-ring" r={11} />
                        <circle r={4} />
                      </>
                    ) : (
                      <circle r={6} />
                    )}
                  </g>
                </g>
              ))}
            </svg>
            <span className="rm-marker" style={{ offsetPath: `path('${geo.d}')` }} />
          </>
        )}
      </div>
      {children}
    </div>
  );
}
