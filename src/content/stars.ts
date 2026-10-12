import { BOOKS } from './books';

export type ConstellationId = 'years' | 'books' | 'pioneers' | 'loves';

export interface MemoryEntry {
  label: string;
  kicker: string;
  title: string;
  line: string;
  magnitude: number;
}

export interface ConstellationSpec {
  id: ConstellationId;
  name: string;
  center: readonly [number, number, number];
  scale: readonly [number, number];
  points: readonly (readonly [number, number, number])[];
  links: readonly (readonly [number, number])[];
  entries: readonly MemoryEntry[];
}

const YEARS: readonly MemoryEntry[] = [
  {
    label: '2010',
    kicker: 'Year zero',
    title: 'A very loud beginning.',
    line: 'Nothing to remember yet. Everything to start.',
    magnitude: 0.55,
  },
  {
    label: '2020',
    kicker: 'Age 10',
    title: 'I learned to talk to machines.',
    line: 'The first time a line I wrote answered back, something changed for good.',
    magnitude: 1,
  },
  {
    label: '2021',
    kicker: 'Age 11',
    title: 'Discord bots.',
    line: 'People talking to something I wrote. Code was never about computers. It is about people.',
    magnitude: 0.8,
  },
  {
    label: '2023',
    kicker: 'Age 13',
    title: 'Then GPT-4 arrived.',
    line: 'With it, a question that never left my head: how does a machine learn?',
    magnitude: 0.9,
  },
  {
    label: '2024',
    kicker: 'Age 14',
    title: 'Designer. Front-end. Full stack.',
    line: 'The year I stopped only writing code and started designing experiences.',
    magnitude: 0.85,
  },
  {
    label: '2025',
    kicker: 'Age 15',
    title: 'Sixteen books.',
    line: 'Money, clean code, and why a badly designed door makes you feel stupid.',
    magnitude: 0.85,
  },
  {
    label: '2026',
    kicker: 'Age 16',
    title: 'Less talk. More work.',
    line: 'Sixty interactive designs learned. WebGL applied, including the page you are on.',
    magnitude: 1,
  },
];

const PIONEERS: readonly MemoryEntry[] = [
  {
    label: 'ENIAC',
    kicker: '1946',
    title: 'Thirty tons of curiosity.',
    line: 'It did in hours what your phone does in a blink. Everything starts somewhere.',
    magnitude: 0.75,
  },
  {
    label: 'The first bug',
    kicker: '1947',
    title: 'A real moth, taped to a logbook.',
    line: 'Every bug I have ever fixed is one of its descendants.',
    magnitude: 0.7,
  },
  {
    label: 'Earthrise',
    kicker: '1968',
    title: 'The first time we saw ourselves from far away.',
    line: 'Distance is sometimes the only way to see what matters.',
    magnitude: 0.8,
  },
  {
    label: 'Margaret Hamilton',
    kicker: '1969',
    title: 'She led the code that landed on the Moon.',
    line: 'Proof that software is a craft worth taking seriously.',
    magnitude: 0.95,
  },
];

const LOVES: readonly MemoryEntry[] = [
  {
    label: 'Music',
    kicker: 'Forever',
    title: 'The only thing I never had to learn to love.',
    line: 'Everything on this page was timed to something playing in my head.',
    magnitude: 0.9,
  },
  {
    label: 'Photography',
    kicker: 'Still learning',
    title: 'Learning to look before I build.',
    line: 'Light, framing, patience. Design starts in the eye.',
    magnitude: 0.6,
  },
  {
    label: 'Blender',
    kicker: 'Six months in',
    title: 'Teaching myself a third dimension.',
    line: 'Every model is a small argument with gravity and light.',
    magnitude: 0.65,
  },
  {
    label: 'WebGL',
    kicker: 'Right now',
    title: 'The reason this page exists.',
    line: 'Shaders are poetry that a graphics card reads sixty times a second.',
    magnitude: 1,
  },
];

const BOOK_ENTRIES: readonly MemoryEntry[] = BOOKS.map((book) => ({
  label: book.title,
  kicker: book.author,
  title: book.title,
  line: book.takeaway,
  magnitude: 0.72,
}));

export const CONSTELLATIONS: readonly ConstellationSpec[] = [
  {
    id: 'years',
    name: 'The years',
    center: [0, 1.5, -66],
    scale: [27, 10],
    points: [
      [-1, -0.75, 4],
      [-0.68, -0.38, -3],
      [-0.4, 0.05, 2],
      [-0.08, -0.12, -4],
      [0.24, 0.32, 3],
      [0.56, 0.12, -2],
      [0.92, 0.7, 4],
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    entries: YEARS,
  },
  {
    id: 'books',
    name: 'The books',
    center: [-3, -1, -150],
    scale: [22, 13],
    points: [
      [0, 0.62, 0],
      [-0.52, 0.82, 3],
      [-1, 0.62, -2],
      [-0.96, -0.62, 2],
      [-0.46, -0.48, -3],
      [0.5, 0.84, 2],
      [1, 0.64, -3],
      [0.98, -0.6, 3],
      [0.44, -0.46, -2],
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 0],
    ],
    entries: BOOK_ENTRIES,
  },
  {
    id: 'pioneers',
    name: 'Before me',
    center: [4, 2, -222],
    scale: [18, 11],
    points: [
      [-1, -0.7, 3],
      [-0.42, -0.1, -3],
      [0.18, 0.28, 2],
      [0.9, 0.9, -2],
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    entries: PIONEERS,
  },
  {
    id: 'loves',
    name: 'What I love',
    center: [-2, 0, -282],
    scale: [17, 10],
    points: [
      [-0.95, 0.35, -2],
      [-0.3, 0.85, 3],
      [0.35, -0.15, -3],
      [0.95, 0.55, 2],
    ],
    links: [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
    ],
    entries: LOVES,
  },
];
