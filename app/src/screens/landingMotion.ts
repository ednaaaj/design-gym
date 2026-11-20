import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { BP_SCHEDULE, BP_TIMING } from '../lib/blueprint.ts';
import { PASS_MAX_MS, countAt, currentSection, passMs, staggerDelay } from '../lib/motion.ts';

/* Landing motion. Three rules hold for everything here:
   1. Step 0 / the first render is the complete, meaningful state. With reduced motion,
      no JS, or the demo off screen, that is what people see.
   2. Nothing loops. A demo plays one pass when it comes into view, then rests on step 0.
   3. Only transform, opacity and clip-path move; CSS owns the curves and durations. */

export const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The 3D dumbbell's gates (DumbbellActor.tsx): its intro plays once per browser session,
   and only where WebGL can draw it. */
const SEEN_KEY = 'designgym:intro-seen';
export const introSeen = (): boolean => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
export const markIntroSeen = (): void => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage blocked: the intro may play again next load, which is harmless.
  }
};

/** True when this browser can draw WebGL. The probe context is released straight away. */
export function canWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const ENTER = 0.35; // share of a demo that must be visible before its pass starts

/** Plays a demo once per visit. Step 0 holds holds[0] ms after the demo comes into view,
    each later step holds its own time, and the pass ends back on step 0, where it stays.
    Scrolling it fully out of view resets it, so the next visit replays; a hidden tab pauses.
    While `paused`, nothing starts; the pass begins once it is released. */
export function useDemoStep(ref: RefObject<Element | null>, holds: readonly number[], paused = false): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || paused || reduced()) return;
    if (import.meta.env.DEV && passMs(holds) > PASS_MAX_MS) {
      console.warn(`Demo pass is ${passMs(holds)}ms; keep it within ${PASS_MAX_MS}ms (WCAG 2.2.2).`);
    }
    let i = 0;
    let done = false;
    let onScreen = false;
    let timer = 0;
    const advance = () => {
      i = (i + 1) % holds.length;
      setStep(i);
      if (i === 0) done = true;
      else timer = window.setTimeout(advance, holds[i]);
    };
    const sync = () => {
      clearTimeout(timer);
      if (onScreen && !done && document.visibilityState === 'visible') timer = window.setTimeout(advance, holds[i]);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= ENTER && !onScreen) {
          onScreen = true;
          sync();
        } else if (!e.isIntersecting && onScreen) {
          onScreen = false;
          i = 0;
          done = false;
          setStep(0);
          sync();
        }
      },
      { threshold: [0, ENTER] },
    );
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearTimeout(timer);
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ref, holds, paused]);
  return step;
}

/** Counts from `from` to `to` once, the first time the element scrolls into view.
    Renders `to` when it is already in view on load, or under reduced motion. */
export function useCountUp(ref: RefObject<Element | null>, from: number, to: number, ms = 900): number {
  const [value, setValue] = useState(to);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced() || el.getBoundingClientRect().top < innerHeight) return;
    setValue(from);
    let frame = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        // starts as the tile's content builds in (it sits second in its row, hence one stagger)
        const start = performance.now() + BP_SCHEDULE.contentAt + BP_TIMING.stagger;
        const tick = (now: number) => {
          setValue(countAt((now - start) / ms, from, to));
          if (now - start < ms) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, from, to, ms]);
  return value;
}

/** One entrance for the whole page: every [data-reveal] below the fold starts 12px low and
    transparent, then settles once as it scrolls in. Content above the fold never animates.
    [data-reveal="2"] etc. is the item's stagger index. */
export function useSectionReveal(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    const pending = [...root.querySelectorAll<HTMLElement>('[data-reveal]')].filter(
      (el) => el.getBoundingClientRect().top > innerHeight,
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.revealed = 'in';
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    for (const el of pending) {
      el.style.setProperty('--reveal-delay', `${staggerDelay(Number(el.dataset.reveal) || 0)}ms`);
      el.dataset.revealed = 'pending';
      io.observe(el);
    }
    return () => io.disconnect();
  }, [ref]);
}

/** The id of the section the reader is in, for the header nav. The reading line sits 40%
    down the viewport; above the first section (the hero) it is null. */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const i = currentSection(
        els.map((el) => (el ? el.getBoundingClientRect().top : Infinity)),
        innerHeight * 0.4,
      );
      setCurrent(i < 0 ? null : ids[i]);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, [ids]);
  return current;
}

/** Fallback for the margin construction line where scroll-driven animations are missing:
    writes page scroll progress (0..1) to --lp-scroll on the element. CSS does it natively
    otherwise, and reduced motion hides the line, so this does nothing in either case. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || CSS.supports('animation-timeline: scroll()')) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.setProperty('--lp-scroll', String(max > 0 ? Math.min(1, scrollY / max) : 0));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, [ref]);
}
