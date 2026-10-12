import type { BeatSpec } from '@/ui/Beats';
import type { MagnifyRowSpec } from '@/ui/MagnifyText';

export const WELCOME_BEATS: BeatSpec[] = [
  { text: 'Welcome.', start: 0, end: 0.15, variant: 'display', place: 'sky', holdIn: true },
  {
    text: 'My name is\nBrenno Leon de Souza Amaral.',
    start: 0.17,
    end: 0.34,
    variant: 'title',
    place: 'sky',
  },
  {
    text: 'I design for the web\nand set it in motion.',
    start: 0.36,
    end: 0.53,
    variant: 'title',
    place: 'sky',
  },
  {
    text: 'Sixteen years old.\nSix of them talking to machines.',
    start: 0.55,
    end: 0.71,
    variant: 'title',
    place: 'sky',
  },
  { text: 'Most people live\nat the surface.', start: 0.73, end: 0.885, variant: 'title', place: 'sky' },
  { text: 'I never could.', start: 0.77, end: 0.885, variant: 'lead', place: 'sea' },
  {
    text: 'There is more beneath this page',
    start: 0.9,
    end: 1,
    variant: 'caption',
    place: 'gate',
    holdOut: true,
  },
];

export const OCEAN_BEATS: BeatSpec[] = [
  {
    text: 'Have you ever been swallowed whole\nby something you were studying?',
    start: 0.1,
    end: 0.27,
    variant: 'lead',
    place: 'sky',
  },
  { text: 'Then you know this place.', start: 0.42, end: 0.54, variant: 'title' },
  { text: 'Every page pulled me\na little deeper.', start: 0.56, end: 0.68, variant: 'title' },
  {
    text: 'Some of them still float up\nwhen I need them.',
    start: 0.7,
    end: 0.8,
    variant: 'lead',
    place: 'top',
  },
  { text: 'Drag a book. Click to open it.', start: 0.7, end: 0.84, variant: 'caption', place: 'bottom' },
  { text: 'Deeper.', start: 0.88, end: 0.97, variant: 'title' },
];

export const ROOM_BEATS: BeatSpec[] = [
  {
    text: 'Somewhere under all of it,\nthere is a room.',
    start: 0.03,
    end: 0.16,
    variant: 'lead',
    place: 'top',
  },
  { text: 'This is where I spend most nights.', start: 0.27, end: 0.44, variant: 'lead', place: 'bottom' },
  { text: 'Building things nobody asked for,', start: 0.47, end: 0.63, variant: 'lead', place: 'bottom' },
  {
    text: 'until they become\nthings people need.',
    start: 0.66,
    end: 0.86,
    variant: 'lead',
    place: 'bottom',
  },
];

export const HELLO_ROWS: readonly MagnifyRowSpec[] = [
  { text: 'Hi. Welcome.', size: 'hero' },
  { text: 'You’re a little late,', size: 'lead' },
  { text: 'but I can tell you want', size: 'lead' },
  { text: 'to know more about me.', size: 'lead' },
  { text: 'I like that.', size: 'lead' },
];

export const FALL_ROWS: readonly MagnifyRowSpec[] = [
  { text: 'If you really want to know me,', size: 'lead' },
  { text: 'you’ll have to fall in.', size: 'hero' },
];

export const HELLO_HINT = {
  pointer: 'Move closer. The words are listening.',
  touch: 'Touch the words. They are listening.',
} as const;

export const HORIZON_BEATS: BeatSpec[] = [
  { text: 'An event horizon.', start: 0.15, end: 0.28, variant: 'caption', place: 'top' },
  {
    text: 'Nothing that crosses it\never comes back the same.',
    start: 0.3,
    end: 0.45,
    variant: 'lead',
    place: 'bottom',
  },
  { text: 'Not light.', start: 0.48, end: 0.56, variant: 'title', place: 'bottom' },
  { text: 'Not time.', start: 0.57, end: 0.65, variant: 'title', place: 'bottom' },
  { text: 'Not even doubt.', start: 0.66, end: 0.75, variant: 'title', place: 'bottom' },
];

export const STARS_BEATS: BeatSpec[] = [
  { text: 'Inside, it isn’t empty.', start: 0.03, end: 0.13, variant: 'title' },
  { text: 'Every star is something I lived.', start: 0.14, end: 0.25, variant: 'title' },
  {
    text: 'A year. A book.\nA first line of code.',
    start: 0.26,
    end: 0.36,
    variant: 'lead',
    place: 'bottom',
  },
];

export const STARS_HINT = {
  pointer: 'Hover the brightest ones. Remember with me.',
  touch: 'Tap the brightest ones. Remember with me.',
} as const;

export const GLASS_BEATS: BeatSpec[] = [
  { text: 'Look closer.', start: 0.02, end: 0.14, variant: 'title' },
  { text: 'You know, don’t you?', start: 0.32, end: 0.78, variant: 'display' },
];

export const IDENTITY_NAME = ['Brenno Leon', 'de Souza Amaral'] as const;

export const IDENTITY_BEATS: BeatSpec[] = [
  { text: 'But this is who I am.', start: 0.05, end: 0.22, variant: 'lead' },
  {
    text: 'Designer — Web designer — Front-end developer',
    start: 0.58,
    end: 0.92,
    variant: 'caption',
    place: 'bottom',
  },
];

export const ENDING_BEATS: BeatSpec[] = [
  {
    text: 'Most people live at the surface.\nIt is warm there.',
    start: 0.04,
    end: 0.14,
    variant: 'lead',
  },
  {
    text: 'But everything worth finding\nis a little deeper.',
    start: 0.16,
    end: 0.27,
    variant: 'lead',
  },
  { text: 'So follow your dreams.', start: 0.29, end: 0.39, variant: 'title' },
  {
    text: 'Then go deeper.\nInto reality. Into study. Into yourself.',
    start: 0.41,
    end: 0.53,
    variant: 'lead',
  },
  { text: 'And if it ever feels like drowning,', start: 0.64, end: 0.73, variant: 'lead', place: 'sky' },
  {
    text: 'you’re only learning\nto breathe underwater.',
    start: 0.74,
    end: 0.86,
    variant: 'title',
    place: 'sky',
  },
];

export const ENDING_FINALE = {
  signature: 'Brenno Leon de Souza Amaral',
  action: 'Back to the surface ↑',
  credits:
    'Designed and built by Brenno Leon. Set in Impostor Pro. Skeleton and motion by Mixamo X Bot. Made in 2026, somewhere around 2:47 am.',
} as const;
