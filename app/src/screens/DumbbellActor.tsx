import { useEffect, useRef } from 'react';
import dumbbell from '../assets/design-dumbbell.webp';
import {
  INTRO,
  INTRO_END,
  INTRO_TRAVEL_AT,
  copyPose,
  introPose,
  pose,
  poseAt,
  posesEqual,
  settleStops,
  type IntroEvent,
  type Pose,
  type Stage,
  type Stop,
} from '../lib/actor.ts';
import type { DumbbellView } from '../three/Dumbbell.ts';
import { markIntroSeen } from './landingMotion.ts';

/* The dumbbell as the page's one actor: a live 3D model on a single fixed, transparent,
   decorative canvas that follows the reader from section to section.

   - three.js arrives in its own chunk after first paint. Until it draws, the hero's WebP is
     the dumbbell; the swap is a 240ms crossfade between two renders of the same pose.
   - It draws only when its pose changes (scroll, resize, the intro), never in an idle loop.
   - It never covers text: every waypoint is a measured empty box in its section, held in
     document space so it scrolls with that section. Only the trips between sections move
     on their own, and long ones take the side margin.
   - Without WebGL, under reduced motion, or if the chunk fails, the WebP simply stays. */

type Props = {
  intro: boolean; // play the first-visit intro (Landing decides, see shouldPlayIntro)
  onIntro: (e: IntroEvent) => void;
};

// Rest rotation: the poster's three-quarter view. Each section turns it to show its subject.
const REST = { rx: 0, ry: -0.66, rz: -0.03 };
const FIT = 0.6; // a pose box is at most this tall for its width at any waypoint rotation
const STAGE_W = 0.6; // intro: the dumbbell spans 60% of the viewport width
const WAIT_MAX = 1200; // intro: longest the hold waits for three.js before giving up on it

export default function DumbbellActor({ intro, onIntro }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onIntroRef = useRef(onIntro);
  useEffect(() => {
    onIntroRef.current = onIntro;
  });
  const introRef = useRef(intro); // read once at mount: the intro never restarts

  useEffect(() => {
    const el = box.current;
    const canvas = canvasRef.current;
    const page = el?.closest<HTMLElement>('.lp');
    if (!el || !canvas || !page) return;

    let view: DumbbellView | null = null;
    let alive = true;
    let live = false;
    let frame = 0;
    let stops: Stop[] = [];
    const stage: Stage = { vw: 1, vh: 1, gutterL: 0, gutterR: 0, gutterW: 0 };
    const big = pose();
    const target = pose();
    const next = pose();
    const last = pose(NaN);

    // Intro clock. `introMs` advances with real time, except that the hold waits for three.js.
    let introOn = introRef.current;
    let introMs = 0;
    let clock = performance.now();
    let waited = 0;
    let travelled = false;
    if (introOn) markIntroSeen();

    /* ---- measuring: layout reads happen here only, never per frame ---- */
    const docRect = (sel: string) => {
      const r = page.querySelector(sel)?.getBoundingClientRect();
      return r && { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width };
    };
    const fit = (l: number, t: number, r: number, b: number, maxW: number, rot: Partial<typeof REST> = {}, aspect = FIT): Pose => {
      const w = Math.max(0, Math.min(maxW, r - l, (b - t) / aspect));
      const o = { ...REST, ...rot };
      return pose((l + r) / 2, (t + b) / 2, w, o.rx, o.ry, o.rz);
    };

    function measure() {
      const vw = document.documentElement.clientWidth;
      const vh = innerHeight;
      stage.vw = vw;
      stage.vh = vh;
      const bell = docRect('.lp-hero-bell');
      const tiles = docRect('#train .lp-tiles');
      if (!bell || !tiles) return;
      const pad = tiles.l;
      stage.gutterW = Math.max(64, Math.min(140, pad * 0.85));
      stage.gutterR = Math.max(vw - pad / 2, vw - pad + 6 + stage.gutterW / 2);
      stage.gutterL = Math.min(pad / 2, pad - 6 - stage.gutterW / 2);

      const list: Stop[] = [];
      const still = (p: Pose, drift = 0) =>
        list.push({ at: p.y - vh * 0.75, until: p.y - vh * 0.25, pose: p, drift });

      // 1. hero: exactly where the poster image sits, so the swap is seamless.
      list.push({ at: -Infinity, until: 0, pose: pose((bell.l + bell.r) / 2, (bell.t + bell.b) / 2, bell.w, REST.rx, REST.ry, REST.rz) });

      // 2-3, 6. Beside each section heading (which stops at 640px): tilted toward what
      // follows it. Tiles: leaning over them. How: the pixel plate turned to the reading
      // column. Skills: the swatch wheel shown almost face-on.
      const beside = (id: string, below: string, maxW: number, rot: Partial<typeof REST>, drift: number) => {
        const sec = docRect(`#${id}`);
        const head = docRect(`#${id} .lp-head`);
        const after = docRect(`#${id} ${below}`);
        if (sec && head && after) still(fit(head.r + 48, sec.t + 40, after.r, after.t - 24, maxW, rot), drift);
      };
      beside('train', '.lp-tiles', 340, { rx: 0.42, ry: -0.42, rz: 0.1 }, 0.35);
      beside('how', '.lp-loop', 320, { rx: 0.08, ry: -2.42, rz: 0 }, 0.3);

      // 4. exams: under the score card, the Aa weight turned toward the reader. The gap is
      // short, so it lies low (its bar nearly level) to stay as large as the gap allows.
      const score = docRect('#exams .lp-score');
      const rules = docRect('#exams .lp-rules');
      if (score && rules) still(fit(score.l, score.b + 14, score.r, rules.t - 4, 320, { rx: -0.12, ry: -1.0, rz: 0.02 }, 0.47), 0.25);

      // 5. roadmap: small, riding down the empty column beside the route at mid-viewport,
      // turning as it goes.
      const head = docRect('#roadmap .lp-roadmap-head');
      const rail = docRect('#roadmap .rm-rail');
      const goal = docRect('#roadmap .rm-goal');
      if (head && rail && goal) {
        const p = fit(head.l, head.b + 40, rail.l - 40, goal.b, 220, { rx: 0.16, rz: 0.06 });
        const h = p.w * FIT;
        const top = head.b + 40 + h / 2;
        const bottom = goal.b - h / 2;
        p.y = top;
        list.push({ at: top - vh * 0.5, until: Math.max(top, bottom) - vh * 0.5, pose: p, ride: true, drift: 1.6 });
      }

      beside('improve', '.lp-skills', 320, { rx: 0.15, ry: -2.0, rz: -0.4 }, 0.3);

      // 7. finish: back to full size beside the closing statement, at rest.
      const end = docRect('.lp-end');
      const statement = docRect('.lp-end-statement');
      const cta = docRect('.lp-end .lp-cta');
      if (end && statement && cta) still(fit(statement.r + 48, end.t + 40, cta.r, end.b - 40, 460, { ry: -0.5 }));

      stops = settleStops(list, vh * 0.25, document.documentElement.scrollHeight - vh);
      big.x = vw / 2;
      big.y = vh / 2;
      big.w = vw * STAGE_W;
      big.rx = REST.rx;
      big.ry = REST.ry;
      big.rz = REST.rz;
      view?.setSize(vw, vh, devicePixelRatio);
      last.x = NaN; // force a redraw
    }

    /* ---- drawing ---- */
    function draw() {
      frame = 0;
      poseAt(target, scrollY, stops, stage);
      if (introOn) {
        const now = performance.now();
        const dt = now - clock;
        clock = now;
        if (!live && introMs >= INTRO.hold) {
          waited += dt; // hold on the poster until three.js can take over
          if (waited > WAIT_MAX) return endIntro('fail');
        } else {
          introMs += dt;
        }
        if (!travelled && introMs >= INTRO_TRAVEL_AT) {
          travelled = true;
          onIntroRef.current('travel');
        }
        if (introMs >= INTRO_END) {
          endIntro('end');
        } else {
          introPose(next, introMs, big, target, stage.vh * 0.06);
          frame = requestAnimationFrame(draw);
        }
      }
      if (!introOn) copyPose(next, target);
      if (view && live && !posesEqual(next, last)) {
        view.render(next);
        copyPose(last, next);
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    function endIntro(e: IntroEvent) {
      if (!introOn) return;
      introOn = false;
      removeSkip();
      onIntroRef.current(e);
      el!.dataset.intro = 'off'; // the stage poster goes; the hero image takes over if 3D failed
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      schedule();
    }

    const goLive = () => {
      if (!view || !alive) return;
      live = true;
      last.x = NaN;
      if (frame) cancelAnimationFrame(frame); // draw now; an intro frame re-schedules itself
      draw();
      el.dataset.live = '';
      page.dataset.actor = 'live';
    };

    /* ---- intro skip: any key, click, wheel or touch ---- */
    const skip = () => endIntro('skip');
    const SKIP = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
    const removeSkip = () => {
      for (const t of SKIP) removeEventListener(t, skip);
    };
    // A hidden tab draws nothing and its intro clock stops; it resumes where it was.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else {
        clock = performance.now();
        schedule();
      }
    };

    /* ---- context loss: hand the dumbbell back to the image, take it back on restore ---- */
    const onLost = (e: Event) => {
      e.preventDefault();
      live = false;
      delete el.dataset.live;
      delete page.dataset.actor;
    };
    const onRestored = () => requestAnimationFrame(goLive); // after three.js has rebuilt its state

    measure();
    const ro = new ResizeObserver(() => {
      measure();
      schedule();
    });
    ro.observe(page);
    addEventListener('resize', schedule, { passive: true });
    addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    if (introOn) {
      el.dataset.intro = 'on';
      for (const t of SKIP) addEventListener(t, skip, { passive: true });
      clock = performance.now();
      schedule();
    }

    import('../three/Dumbbell.ts')
      .then(async ({ createDumbbell }) => {
        if (!alive) return;
        view = createDumbbell(canvas);
        view.setSize(stage.vw, stage.vh, devicePixelRatio);
        // Outside the intro, let the poster finish its own settle before swapping it out.
        if (!introOn) {
          const img = page.querySelector('.lp-hero-bell');
          await Promise.allSettled(img?.getAnimations().map((a) => a.finished) ?? []);
        }
        goLive();
      })
      .catch(() => {
        if (introOn) endIntro('fail');
      });

    return () => {
      alive = false;
      introOn = false;
      removeSkip();
      cancelAnimationFrame(frame);
      ro.disconnect();
      removeEventListener('resize', schedule);
      removeEventListener('scroll', schedule);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      delete page.dataset.actor;
      delete el.dataset.live;
      delete el.dataset.intro;
      view?.dispose();
      view = null;
    };
  }, []);

  return (
    <div className="lp-actor" ref={box} aria-hidden="true">
      {intro && <img className="lp-actor-poster" src={dumbbell} alt="" width={1600} height={843} decoding="async" />}
      <canvas ref={canvasRef} />
    </div>
  );
}
