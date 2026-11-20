import { Fragment, useLayoutEffect, useRef, type ComponentPropsWithRef, type CSSProperties, type ElementType } from 'react';
import { lineIndexes } from '../lib/motion.ts';

/* Text that can rise into place word by word or line by line, with nothing lost when it
   doesn't. Screen readers get the sentence once, from a visually hidden copy; the split
   words beside it are aria-hidden and sit exactly where plain text would, so nothing
   reflows. At rest every word is in place: only Landing.css moves them, and only while an
   entrance runs (the hero on load, or a [data-revealed='in'] ancestor).

   split="words": each word is its own beat (--rt-i = word index), for the hero headline.
   split="lines": words on one line share a beat (--rt-i = line index), measured after layout. */

type Props<T extends ElementType> = {
  as?: T;
  text: string;
  split?: 'words' | 'lines';
} & Omit<ComponentPropsWithRef<T>, 'children'>;

export default function RevealText<T extends ElementType = 'span'>({ as, text, split = 'lines', ...rest }: Props<T>) {
  const Tag: ElementType = as ?? 'span';
  const words = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (split !== 'lines' || !words.current) return;
    const spans = [...words.current.children] as HTMLElement[];
    const lines = lineIndexes(spans.map((s) => s.getBoundingClientRect().top));
    spans.forEach((s, i) => s.style.setProperty('--rt-i', String(lines[i])));
  }, [split, text]);

  const list = text.split(' ');
  return (
    <Tag {...rest}>
      <span className="visually-hidden">{text}</span>
      <span className="rt" data-split={split} ref={words} aria-hidden="true">
        {/* the space stays a text node between words, so lines still break and balance normally */}
        {list.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span className="rt-word" style={{ '--rt-i': i } as CSSProperties}>
              {w}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
