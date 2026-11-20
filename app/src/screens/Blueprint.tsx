import { useLayoutEffect, useRef, useState } from 'react';
import { BP_SCHEDULE, LABEL_PX, blueprintGeometry, type BlueprintMode, type Geometry, type Rect } from '../lib/blueprint.ts';
import { reduced } from './landingMotion.ts';

/* A blueprint that builds its parent. Drop it in as the last child of any positioned box:
   it measures that box (and the `subjects` inside it), draws hairline construction and
   dimension lines with the real rendered px, and runs the parent through
   data-bp = pending → build → done the first time it scrolls into view. Landing.css owns
   the choreography, timed by BP_TIMING (lib/blueprint.ts); at rest a faint residual of the
   drawing stays, and tile hover brings back all of it, numbers included.

   Content is never hidden without JS: only this effect sets [data-bp='pending'], and it
   skips reduced motion entirely. The stagger is the inherited CSS variable --bp-delay. */

type Props = {
  subjects?: string; // selector for the boxes to measure inside the parent; none = the parent
  mode?: BlueprintMode;
  skip?: boolean; // render the finished state straight away (e.g. coming back from the arena)
  hold?: boolean; // stay pending (content hidden, nothing drawn) until released
};

export default function Blueprint({ subjects, mode = 'full', skip = false, hold = false }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);

  useLayoutEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    const targets = subjects ? [...host.querySelectorAll<HTMLElement>(subjects)] : [];

    // Rendered px relative to the host. Only measured while nothing inside is mid-build,
    // since the build scales the content.
    const measure = () => {
      if (host.dataset.bp === 'pending' || host.dataset.bp === 'build') return;
      const hb = host.getBoundingClientRect();
      const rel = (r: DOMRect): Rect => ({ x: r.left - hb.left, y: r.top - hb.top, w: r.width, h: r.height });
      setGeo(blueprintGeometry(hb.width, hb.height, mode, targets.map((t) => rel(t.getBoundingClientRect()))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [host, ...targets]) ro.observe(el);

    if (skip || reduced()) return () => ro.disconnect();

    host.dataset.bp = 'pending';
    if (hold) {
      return () => {
        ro.disconnect();
        delete host.dataset.bp;
      };
    }
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        host.dataset.bp = 'build';
        const delay = parseFloat(getComputedStyle(host).getPropertyValue('--bp-delay')) || 0;
        timer = window.setTimeout(() => {
          host.dataset.bp = 'done';
          measure();
        }, BP_SCHEDULE.end + delay);
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(host);
    return () => {
      ro.disconnect();
      io.disconnect();
      clearTimeout(timer);
      delete host.dataset.bp;
    };
  }, [subjects, mode, skip, hold]);

  return (
    <svg
      ref={svg}
      className="bp"
      data-mode={mode}
      aria-hidden="true"
      focusable="false"
      viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
      preserveAspectRatio="none"
    >
      {geo && (
        <>
          {geo.guides.map((d, i) => (
            <path key={`g${i}`} className="bp-guide" d={d} pathLength={1} />
          ))}
          {geo.outlines.map((d, i) => (
            <path key={`o${i}`} className="bp-outline" d={d} pathLength={1} />
          ))}
          {geo.dims.map((d, i) => (
            <path key={`d${i}`} className="bp-dim" d={d} pathLength={1} />
          ))}
          <path className="bp-tick" d={geo.ticks} />
          <path className="bp-mark" d={geo.marks} />
          {geo.labels.map((l, i) => (
            <text
              key={`l${i}`}
              className="bp-label"
              x={l.x}
              y={l.y}
              fontSize={LABEL_PX}
              textAnchor={l.anchor}
              dominantBaseline="central"
              transform={l.vertical ? `rotate(-90 ${l.x} ${l.y})` : undefined}
            >
              {l.text}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
