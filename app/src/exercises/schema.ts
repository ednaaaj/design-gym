export type Skill = 'hierarchy' | 'spacing' | 'alignment' | 'typography' | 'color';

type ExerciseCommon = {
  id: string;
  skill: Skill;
  difficulty: 1 | 2 | 3;
  title: string;
  objective: string;                 // one line shown to user
  // component rendered live; flaws are params
  component: string;                 // key into component registry
  base: Record<string, unknown>;     // correct params
  flaws: Flaw[];                     // applied on top of base for the "bad" render
  hints: [string, string?];
  principle: string;                 // 1-2 sentence explanation of why
  tradeoffs?: string;                // subjective items only
};

export type Exercise =
  | (ExerciseCommon & { type: 'find-mistake' | 'spot-diff'; variantB?: never; answer?: never })
  | (ExerciseCommon & {
      type: 'which-better';
      variantB: Record<string, unknown>; // B renders base + variantB
      answer: WhichBetterAnswer;
    });

export type Flaw = {
  id: string;
  label: string;                     // "Unequal horizontal padding"
  region: { x: number; y: number; w: number; h: number }; // % of preview, click target
  param: string;                     // which param it overrides
  badValue: unknown;
  explanation: string;               // must include actual numbers
};

export type WhichBetterAnswer = {
  correct: 'A' | 'B';
  reasons: { id: string; label: string; correct: boolean }[];
};
