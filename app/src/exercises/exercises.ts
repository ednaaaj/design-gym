// Exercise data. Kept free of JSX/CSS imports so `npm test` can load it in plain Node.
import type { Exercise, Flaw } from './schema.ts';

/** Flawed render params: base with every flaw's badValue applied. */
export const applyFlaws = (base: Record<string, unknown>, flaws: Flaw[]) =>
  Object.fromEntries([...Object.entries(base), ...flaws.map((f) => [f.param, f.badValue])]);

// Specimen palette (mirrors samples.css), so contrast claims point at real values.
const INK = 'oklch(0.24 0.02 260)'; // 16.5:1 on white
const INK_2 = 'oklch(0.47 0.02 260)'; // 6.8:1
const LINK = 'oklch(0.45 0.12 255)'; // 7.5:1
const GREEN = 'oklch(0.5 0.12 150)'; // 5.7:1
const WHITE = 'oklch(1 0 0)';

const pricingFlaws: Flaw[] = [
  {
    id: 'price-size',
    label: 'Price is demoted',
    region: { x: 14, y: 31, w: 34, h: 10 },
    param: 'priceSize',
    badValue: 20,
    explanation:
      'B sets the price at 20px / 500 weight, barely above the 14px body text. A uses 40px / 700: almost 3× the body size, so it is read first.',
  },
  {
    id: 'plan-size',
    label: 'Plan name competes with the price',
    region: { x: 14, y: 11.5, w: 30, h: 8.5 },
    param: 'planSize',
    badValue: 20,
    explanation:
      'In B the plan name and the price are both 20px, so neither leads. A keeps the name at 16px and lets the 40px price own the card.',
  },
  {
    id: 'cta-style',
    label: 'Primary action looks optional',
    region: { x: 14, y: 65, w: 72, h: 12 },
    param: 'cta',
    badValue: 'outline',
    explanation:
      'B draws the main button as a 1px outline, with the same visual weight as the list above it. A fills it (dark on white, 16:1), so the next step is unmissable.',
  },
];

// Hotel: A (base) is the weaker card here, so badValue = the base value.
const hotelFlaws: Flaw[] = [
  {
    id: 'badge-contrast',
    label: 'Badge text fails contrast',
    region: { x: 12.8, y: 44.3, w: 36, h: 7.6 },
    param: 'badgeBg',
    badValue: 'oklch(0.75 0.15 150)',
    explanation:
      'A’s badge is white on oklch(0.75 0.15 150): 2.1:1, under the 4.5:1 that 12px text needs. B sets dark green on pale green: 6.2:1.',
  },
  {
    id: 'price-red',
    label: 'Price in warning red',
    region: { x: 12.8, y: 77.6, w: 17.8, h: 7.6 },
    param: 'priceColor',
    badValue: 'oklch(0.6 0.2 25)',
    explanation:
      'A colors the price oklch(0.6 0.2 25): 4.4:1, just under 4.5:1, and red reads as a warning or a sale. B sets it in the ink color at 16.5:1.',
  },
  {
    id: 'cta-contrast',
    label: 'Main button label fails contrast',
    region: { x: 60, y: 75.7, w: 27.2, h: 11.4 },
    param: 'ctaBg',
    badValue: 'oklch(0.78 0.15 70)',
    explanation:
      'A’s Reserve button is white on amber oklch(0.78 0.15 70): 2.1:1, so the main action has the weakest label on the card. B’s blue gives 7.5:1.',
  },
];

// Stat tiles: A (base) is the weaker set here.
const statTypeFlaws: Flaw[] = [
  {
    id: 'label-caps',
    label: 'Labels in small tracked capitals',
    region: { x: 5.4, y: 25, w: 87, h: 11 },
    param: 'labelStyle',
    badValue: 'caps',
    explanation:
      'A sets labels in 11px capitals with 0.1em tracking: a third type style, and caps at 11px read slower than 13px sentence case. B keeps labels at 13px.',
  },
  {
    id: 'value-light',
    label: 'Values set in a thin weight',
    region: { x: 5.4, y: 38, w: 87, h: 20 },
    param: 'valueWeight',
    badValue: 300,
    explanation:
      'A’s values are 28px at weight 300: the thin strokes carry less visual weight than the size promises, so the number no longer clearly leads the tile. B uses 600.',
  },
  {
    id: 'delta-italic',
    label: 'Deltas italicised',
    region: { x: 5.4, y: 60, w: 87, h: 11 },
    param: 'deltaStyle',
    badValue: 'italic',
    explanation:
      'A italicises the deltas: a fourth style that adds no meaning, since the ▲ arrow and the color already mark them as change. B keeps them upright at 500.',
  },
];

const navFlaws: Flaw[] = [
  {
    id: 'logo-gap',
    label: 'Logo spaced like a link',
    region: { x: 23.3, y: 29.4, w: 7.4, h: 41.2 },
    param: 'logoGap',
    badValue: 28,
    explanation:
      'In B the logo sits 28px from Product, the same as the gaps between links, so it reads as a fourth link. A gives it 40px, double the 20px link gap.',
  },
  {
    id: 'link-gap',
    label: 'Links do not group',
    region: { x: 31, y: 29.4, w: 31, h: 41.2 },
    param: 'linkGap',
    badValue: 28,
    explanation:
      'B spaces the links 28px apart, the same as every other gap, so nothing groups. A tightens them to 20px so Product, Pricing and Docs read as one set.',
  },
  {
    id: 'action-gap',
    label: 'Sign in drifts from its button',
    region: { x: 64, y: 29.4, w: 16, h: 41.2 },
    param: 'actionGap',
    badValue: 28,
    explanation:
      'B separates Sign in and Get started by 28px, the same as the links, so Sign in looks like another destination. A pulls them to 12px: one account group.',
  },
];

export const exercises: Exercise[] = [
  {
    id: 'fm-profile-spacing',
    type: 'find-mistake',
    skill: 'spacing',
    difficulty: 1,
    title: 'Profile card',
    objective: 'This card has 3 spacing mistakes. Click each one on the preview.',
    component: 'ProfileCard',
    base: { padL: 24, padR: 24, avatarGap: 16, actionsGap: 12 },
    flaws: [
      {
        id: 'pad-l',
        label: 'Unequal horizontal padding',
        region: { x: 12.3, y: 16.8, w: 9.2, h: 65.8 },
        param: 'padL',
        badValue: 12,
        explanation: 'The card uses 12px on the left and 24px on the right. Use 24px on both sides.',
      },
      {
        id: 'avatar-gap',
        label: 'Avatar crowds the name',
        region: { x: 26.9, y: 22.1, w: 7.7, h: 16.8 },
        param: 'avatarGap',
        badValue: 4,
        explanation:
          'Only 4px separates the avatar from the name, the same gap as name to role, so nothing says they are separate elements. Use 16px.',
      },
      {
        id: 'actions-gap',
        label: 'Buttons nearly touch',
        region: { x: 44.6, y: 64.2, w: 8.5, h: 13.7 },
        param: 'actionsGap',
        badValue: 4,
        explanation:
          'The two buttons sit 4px apart, so they read as one split control. Use 12px, a clear step above the 4px text gaps.',
      },
    ],
    hints: [
      'Compare the space on the left of the content with the space on the right.',
      'Look where elements meet: the avatar and the name, and the two buttons.',
    ],
    principle:
      'Padding defines a container’s edges: unequal sides make content look like it is sliding out. Gaps encode relationships, so the smallest gaps should belong to the most closely related things.',
  },
  {
    id: 'wb-pricing-hierarchy',
    type: 'which-better',
    skill: 'hierarchy',
    difficulty: 1,
    title: 'Pricing card',
    objective: 'Same content, two hierarchies. Pick the stronger card, then say why.',
    component: 'PricingCard',
    base: { planSize: 16, planLine: 24, priceSize: 40, priceLine: 48, priceWeight: 700, cta: 'solid' },
    flaws: pricingFlaws,
    variantB: { planLine: 28, priceLine: 28, priceWeight: 500, ...applyFlaws({}, pricingFlaws) },
    answer: {
      correct: 'A',
      reasons: [
        { id: 'colors', label: 'It uses more color to separate sections', correct: false },
        {
          id: 'entry',
          label: 'Its price is clearly the largest, heaviest element, so the eye lands there first',
          correct: true,
        },
        { id: 'density', label: 'It fits more information in the same space', correct: false },
        { id: 'target', label: 'Its button has a larger click target', correct: false },
      ],
    },
    hints: [
      'Squint at both cards. Which element do you see first in each?',
      'Compare the size of the price with the size of the plan name.',
    ],
    principle:
      'A card needs one obvious entry point. Size and weight steps of at least 1.5× between levels make the reading order visible at a glance; equal sizes make the reader scan everything.',
    tradeoffs:
      'B’s flatter hierarchy is calmer, and can suit a comparison table where several plans sit side by side and no single price should shout. As a standalone card that has to convert, A wins.',
  },
  {
    id: 'sd-login-alignment',
    type: 'spot-diff',
    skill: 'alignment',
    difficulty: 2,
    title: 'Sign-in form',
    objective: 'The right form differs from the reference in 3 places. Click each difference on the right.',
    component: 'LoginForm',
    base: { emailLabelIndent: 0, checkboxIndent: 0, buttonWidth: 280 },
    flaws: [
      {
        id: 'label-indent',
        label: 'Email label is indented',
        region: { x: 6.5, y: 25.4, w: 25.9, h: 7.1 },
        param: 'emailLabelIndent',
        badValue: 6,
        explanation:
          'The Email label starts 6px right of the input edge, while the Password label sits at 0px. Labels should share the input’s left edge.',
      },
      {
        id: 'check-indent',
        label: 'Checkbox row is indented',
        region: { x: 6.5, y: 62.9, w: 40.6, h: 7.1 },
        param: 'checkboxIndent',
        badValue: 8,
        explanation: 'The Remember me row starts 8px in from the fields’ left edge. Align it to 0px.',
      },
      {
        id: 'button-width',
        label: 'Button stops short',
        region: { x: 79.4, y: 72.8, w: 15.3, h: 11.6 },
        param: 'buttonWidth',
        badValue: 264,
        explanation:
          'The button is 264px wide against 280px inputs, so its right edge stops 16px short. Make it 280px so both edges line up.',
      },
    ],
    hints: [
      'Run your eye straight down the left edge of the inputs.',
      'Check whether the button’s right edge lines up with the inputs above it.',
    ],
    principle:
      'Shared edges create invisible lines the eye follows. An offset of 4–16px is too small to look intentional and too large to go unnoticed, so it reads as a mistake.',
  },
  {
    id: 'fm-toast-color',
    type: 'find-mistake',
    skill: 'color',
    difficulty: 2,
    title: 'Notification toast',
    objective: 'This toast has 3 contrast problems. Click each one on the preview.',
    component: 'Toast',
    base: {
      iconBg: 'oklch(0.55 0.13 155)',
      titleWeight: 600,
      bodyColor: INK_2,
      bodyLine: 20,
      actionColor: LINK,
      actionCase: 'sentence',
    },
    flaws: [
      {
        id: 'icon-contrast',
        label: 'Success icon barely shows',
        region: { x: 10, y: 26, w: 9.5, h: 20 },
        param: 'iconBg',
        badValue: 'oklch(0.85 0.1 150)',
        explanation:
          'The white check sits on oklch(0.85 0.1 150): 1.5:1. Icons that carry meaning need 3:1 (WCAG 1.4.11). oklch(0.55 0.13 155) gives 4.6:1.',
      },
      {
        id: 'body-contrast',
        label: 'Message text is too pale',
        region: { x: 21, y: 39, w: 57.6, h: 22 },
        param: 'bodyColor',
        badValue: 'oklch(0.78 0.01 260)',
        explanation:
          'The message is oklch(0.78 0.01 260) on white: 2.0:1, far under the 4.5:1 minimum for 14px text. oklch(0.47 0.02 260) gives 6.8:1 and still sits below the 16.5:1 title.',
      },
      {
        id: 'action-contrast',
        label: 'Action links are too pale',
        region: { x: 21, y: 65, w: 38, h: 12 },
        param: 'actionColor',
        badValue: 'oklch(0.72 0.1 255)',
        explanation:
          'The actions are oklch(0.72 0.1 255) on white: 2.5:1. 14px links need 4.5:1; oklch(0.45 0.12 255) reaches 7.5:1.',
      },
    ],
    hints: [
      'Squint: which parts of the toast almost disappear into the white?',
      'Check every element that carries meaning: the icon, the message and the things you can click.',
    ],
    principle:
      'Text needs 4.5:1 contrast against its background, meaningful icons 3:1. Pale greys and pastel accents look refined on a bright monitor and vanish in sunlight or for low-vision readers.',
  },
  {
    id: 'wb-stat-typography',
    type: 'which-better',
    skill: 'typography',
    difficulty: 1,
    title: 'Dashboard stats',
    objective: 'Same numbers, two type treatments. Pick the clearer set, then say why.',
    component: 'StatTiles',
    base: {
      ...applyFlaws({}, statTypeFlaws),
      revLabelColor: INK_2,
      ordersDeltaColor: GREEN,
      refundsTone: 'bad',
    },
    flaws: statTypeFlaws,
    variantB: { labelStyle: 'sentence', valueWeight: 600, deltaStyle: 'normal' },
    answer: {
      correct: 'B',
      reasons: [
        { id: 'caps', label: 'Its capital-letter labels look more official', correct: false },
        { id: 'styles', label: 'It uses fewer type styles, so each number clearly leads its tile', correct: true },
        { id: 'light', label: 'Its lighter numbers feel more elegant', correct: false },
        { id: 'size', label: 'Its tiles are larger', correct: false },
      ],
    },
    hints: [
      'Count the distinct text styles (size, case, weight, slant) in one tile of each set.',
      'Which set lets you read the three numbers fastest?',
    ],
    principle:
      'A small component rarely needs more than 2–3 type styles. Each extra size, case or slant is one more thing to decode, and it dilutes the one style that should lead.',
    tradeoffs:
      'A’s thin numerals and tracked caps can suit a single hero metric on a marketing page, where tone matters more than scanning. In a dashboard read at a glance, B’s two clear levels win.',
  },
  {
    id: 'sd-stat-color',
    type: 'spot-diff',
    skill: 'color',
    difficulty: 1,
    title: 'Dashboard stats',
    objective: 'The right tiles differ from the reference in 3 colors. Click each difference on the right.',
    component: 'StatTiles',
    base: {
      labelStyle: 'sentence',
      valueWeight: 600,
      deltaStyle: 'normal',
      revLabelColor: INK_2,
      ordersDeltaColor: GREEN,
      refundsTone: 'bad',
    },
    flaws: [
      {
        id: 'rev-label',
        label: 'Revenue label fades out',
        region: { x: 7.6, y: 24, w: 14.1, h: 13 },
        param: 'revLabelColor',
        badValue: 'oklch(0.8 0.01 260)',
        explanation:
          'The Revenue label is oklch(0.8 0.01 260) on white: 1.9:1, while the other labels use oklch(0.47 0.02 260) at 6.8:1. 13px text needs 4.5:1.',
      },
      {
        id: 'orders-delta',
        label: 'Orders change is too pale',
        region: { x: 38, y: 59, w: 14.5, h: 13 },
        param: 'ordersDeltaColor',
        badValue: 'oklch(0.78 0.12 150)',
        explanation:
          'The Orders change is pale green oklch(0.78 0.12 150): 1.9:1. The reference uses oklch(0.5 0.12 150) at 5.7:1.',
      },
      {
        id: 'refunds-tone',
        label: 'Rising refunds shown as good news',
        region: { x: 68.5, y: 59, w: 14.5, h: 13 },
        param: 'refundsTone',
        badValue: 'good',
        explanation:
          'Refunds up 9.2% is bad news, but the right version colors it the same green as revenue growth. The reference uses red, oklch(0.52 0.17 25) at 6.0:1, so the color matches the meaning.',
      },
    ],
    hints: [
      'Compare each label and each percentage between the two versions.',
      'Ask what each color is telling you: is a rise in refunds good?',
    ],
    principle:
      'Color has to stay legible and mean something: keep text at 4.5:1 or more, and map green and red to good and bad outcomes, not simply to up and down.',
  },
  {
    id: 'fm-article-typography',
    type: 'find-mistake',
    skill: 'typography',
    difficulty: 2,
    title: 'Article card',
    objective: 'This card has 3 typography mistakes. Click each one on the preview.',
    component: 'ArticleCard',
    base: { metaSize: 12, titleSize: 20, titleLine: 28, excerptLine: 22, excerptColor: INK_2, readStyle: 'link' },
    flaws: [
      {
        id: 'meta-size',
        label: 'Meta line is too small',
        region: { x: 13, y: 40.4, w: 37, h: 5.3 },
        param: 'metaSize',
        badValue: 9,
        explanation:
          'The meta line is set at 9px. Below about 12px, text loses legibility on most screens; the corrected card uses 12px, still clearly secondary to the 14px excerpt.',
      },
      {
        id: 'title-leading',
        label: 'Title lines drift apart',
        region: { x: 13, y: 46.1, w: 62, h: 18.2 },
        param: 'titleLine',
        badValue: 40,
        explanation:
          'The two title lines are 40px apart on 20px type (2.0×), so they float apart like two headings. Headings hold together at 1.2–1.4×: the corrected card uses 28px (1.4×).',
      },
      {
        id: 'excerpt-leading',
        label: 'Excerpt lines are cramped',
        region: { x: 13, y: 65.2, w: 64.5, h: 10.7 },
        param: 'excerptLine',
        badValue: 15,
        explanation:
          'The excerpt is 14px on a 15px line-height (1.07×), so descenders nearly touch the next line. Body text needs about 1.4–1.6×; the corrected card uses 22px (1.57×).',
      },
    ],
    hints: [
      'Compare the space between title lines with the space between excerpt lines.',
      'Look for text that is hard to read at its size.',
    ],
    principle:
      'Line-height should shrink as type grows: about 1.5× for body copy, 1.2–1.4× for headings. And keep text at 12px or above; size is a hierarchy tool only inside the readable range.',
  },
  {
    id: 'wb-hotel-color',
    type: 'which-better',
    skill: 'color',
    difficulty: 2,
    title: 'Hotel booking card',
    objective: 'Same card, two color schemes. Pick the stronger one, then say why.',
    component: 'HotelCard',
    base: { ...applyFlaws({}, hotelFlaws), badgeFg: WHITE },
    flaws: hotelFlaws,
    variantB: {
      badgeBg: 'oklch(0.95 0.04 155)',
      badgeFg: 'oklch(0.45 0.1 155)',
      priceColor: INK,
      ctaBg: LINK,
    },
    answer: {
      correct: 'B',
      reasons: [
        { id: 'lively', label: 'It uses more colors, so it feels livelier', correct: false },
        {
          id: 'contrast',
          label: 'Every label clears 4.5:1 contrast and one accent color marks the action',
          correct: true,
        },
        { id: 'badge', label: 'Its badge is bigger', correct: false },
        { id: 'warm', label: 'Warm colors make people more likely to book', correct: false },
      ],
    },
    hints: [
      'Read the white text on each colored surface. Is any of it hard to make out?',
      'Count the accent colors on each card. What does each one mean?',
    ],
    principle:
      'Contrast under 4.5:1 is an objective failure for normal-size text. Beyond that, one accent color tells the eye where to act; three competing accents tell it nothing.',
    tradeoffs:
      'A’s saturated palette grabs attention in a busy results list, and some brands own a loud color. Keep the energy if you like, but darken the amber and green until white text clears 4.5:1, and save red for real alerts.',
  },
  {
    id: 'sd-article-hierarchy',
    type: 'spot-diff',
    skill: 'hierarchy',
    difficulty: 2,
    title: 'Article card',
    objective: 'The right card differs from the reference in 3 places. Click each difference on the right.',
    component: 'ArticleCard',
    base: { metaSize: 12, titleSize: 20, titleLine: 28, excerptLine: 22, excerptColor: INK_2, readStyle: 'link' },
    flaws: [
      {
        id: 'title-size',
        label: 'Title shrinks toward body size',
        region: { x: 13, y: 46.1, w: 62, h: 13 },
        param: 'titleSize',
        badValue: 15,
        explanation:
          'The title drops from 20px to 15px, barely above the 14px excerpt (1.07×), so the eye has no clear starting point. The reference keeps a 1.43× step.',
      },
      {
        id: 'excerpt-ink',
        label: 'Excerpt as dark as the title',
        region: { x: 13, y: 60, w: 64.5, h: 15.2 },
        param: 'excerptColor',
        badValue: INK,
        explanation:
          'The excerpt switches from the muted grey (6.8:1) to the title’s ink (16.5:1), so three lines of body copy compete with the headline.',
      },
      {
        id: 'read-button',
        label: 'Secondary link turned into a button',
        region: { x: 59, y: 77.4, w: 28.5, h: 8.7 },
        param: 'readStyle',
        badValue: 'button',
        explanation:
          'Read article becomes a solid 32px button, the darkest, heaviest shape on the card. In the reference it is a 14px text link, so the title stays the first thing you see.',
      },
    ],
    hints: [
      'Squint at both cards: what do you read first on each?',
      'Compare the title, the excerpt and the link at the bottom.',
    ],
    principle:
      'Hierarchy is a ranking: size, weight and color should each step down from the title to the supporting text. When secondary elements gain weight, they steal attention from the one thing that should lead.',
  },
  {
    id: 'fm-settings-alignment',
    type: 'find-mistake',
    skill: 'alignment',
    difficulty: 3,
    title: 'Settings list',
    objective: 'This list has 3 alignment mistakes. Click each one on the preview.',
    component: 'SettingsList',
    base: { row3ToggleShift: 0, divider2Inset: 64, row4TextShift: 0 },
    flaws: [
      {
        id: 'toggle-edge',
        label: 'One switch stops short',
        region: { x: 76.4, y: 61.1, w: 13.2, h: 6.7 },
        param: 'row3ToggleShift',
        badValue: 12,
        explanation:
          'The Weekly digest switch ends 32px from the card’s right edge; the others end at 20px. Controls in a list should share one right edge.',
      },
      {
        id: 'divider-inset',
        label: 'One divider starts too early',
        region: { x: 10.5, y: 53.9, w: 12.3, h: 4.4 },
        param: 'divider2Inset',
        badValue: 20,
        explanation:
          'The divider under Replies starts 20px from the card edge, at the icons; the other two start at 64px, where the text begins. Mixed insets break the column the dividers draw.',
      },
      {
        id: 'text-indent',
        label: 'One label is indented',
        region: { x: 20.9, y: 75.6, w: 46, h: 11.1 },
        param: 'row4TextShift',
        badValue: 8,
        explanation:
          'Product updates starts at 72px, 8px right of the other labels at 64px, so its text leaves the column above it.',
      },
    ],
    hints: [
      'Run your eye down the column of switches on the right.',
      'Then check the left edge of the labels, and where each divider line starts.',
    ],
    principle:
      'Lists rely on repeated edges: every row should put the same thing at the same x. One element off by 8–12px is easy to miss on its own but makes the whole list feel handmade.',
  },
  {
    id: 'wb-nav-spacing',
    type: 'which-better',
    skill: 'spacing',
    difficulty: 3,
    title: 'Navigation bar',
    objective: 'Same items, two spacing systems. Pick the clearer bar, then say why.',
    component: 'NavBar',
    base: { logoGap: 40, linkGap: 20, actionGap: 12 },
    flaws: navFlaws,
    variantB: applyFlaws({}, navFlaws),
    answer: {
      correct: 'A',
      reasons: [
        { id: 'even', label: 'Its gaps are all equal, which looks more balanced', correct: false },
        {
          id: 'groups',
          label: 'Its gaps change between groups, so logo, links and account actions read as three clusters',
          correct: true,
        },
        { id: 'bigger', label: 'Its links are larger and easier to tap', correct: false },
        { id: 'air', label: 'It has more whitespace overall', correct: false },
      ],
    },
    hints: [
      'Squint: how many groups do you see in each bar?',
      'Compare the gap after the logo with the gaps between the links.',
    ],
    principle:
      'Proximity is grouping: items closer to each other than to their neighbours read as one unit. Space between groups should be clearly larger, roughly 2×, than space within them.',
    tradeoffs:
      'Equal gaps are right when every item is the same kind of thing, like a row of tabs. A marketing nav mixes brand, destinations and account actions, so gaps that mirror those groups are clearer.',
  },
  {
    id: 'sd-toast-typography',
    type: 'spot-diff',
    skill: 'typography',
    difficulty: 3,
    title: 'Notification toast',
    objective: 'The right toast differs from the reference in 3 type details. Click each difference on the right.',
    component: 'Toast',
    base: {
      iconBg: 'oklch(0.55 0.13 155)',
      titleWeight: 600,
      bodyColor: INK_2,
      bodyLine: 20,
      actionColor: LINK,
      actionCase: 'sentence',
    },
    flaws: [
      {
        id: 'title-weight',
        label: 'Title loses its weight',
        region: { x: 21, y: 27, w: 31.4, h: 12 },
        param: 'titleWeight',
        badValue: 400,
        explanation:
          'The title drops from 600 to 400. At 14px, the same size as the message, weight is the only thing marking it as the title; without it the toast reads as one paragraph.',
      },
      {
        id: 'body-leading',
        label: 'Message lines crowd together',
        region: { x: 21, y: 40, w: 57.6, h: 21 },
        param: 'bodyLine',
        badValue: 16,
        explanation:
          'The message is 14px on a 16px line-height (1.14×), so its two lines crowd together. The reference uses 20px (1.43×).',
      },
      {
        id: 'action-caps',
        label: 'Actions set in small caps',
        region: { x: 21, y: 65, w: 38, h: 12 },
        param: 'actionCase',
        badValue: 'caps',
        explanation:
          'The actions switch to 12px uppercase with 0.08em tracking. Small caps read slower and shout louder than the message they belong to; the reference uses 14px sentence case.',
      },
    ],
    hints: [
      'Compare the title weight first, then the space between the two message lines.',
      'Look at the two actions at the bottom: how are the letters set?',
    ],
    principle:
      'In small components, typography does all the hierarchy work: weight separates the title, comfortable leading keeps copy readable, and sentence case keeps actions calm. Change one and the balance tips.',
  },
];
