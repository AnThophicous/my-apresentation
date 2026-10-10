import { intro } from '../../content';

export const SP = {
  pull: [3, 80],
  release: [80, 122],
  retract: [122, 152],
  star: [148, 215],
  throw: [205, 400],
  zoom: [395, 520],
  reveal: [505, 585],
  fall: [575, 870],
  wordsStart: 880,
  wordsGap: 78,
};

export const STAGE_SCROLL = SP.wordsStart + intro.length * SP.wordsGap + 30;
