export type SectionId =
  'welcome' | 'ocean' | 'room' | 'hello' | 'horizon' | 'stars' | 'glass' | 'identity' | 'archive' | 'ending';

export type GateId = 'dive' | 'computer';

export interface GateSpec {
  id: GateId;
  at: number;
}

export interface SectionSpec {
  id: SectionId;
  index: string;
  title: string;
  kind: 'pinned' | 'flow';
  length: number;
  gate?: GateSpec;
}

export const SECTIONS: readonly SectionSpec[] = [
  {
    id: 'welcome',
    index: '00',
    title: 'Surface',
    kind: 'pinned',
    length: 6,
    gate: { id: 'dive', at: 0.985 },
  },
  { id: 'ocean', index: '01', title: 'The deep', kind: 'pinned', length: 9 },
  {
    id: 'room',
    index: '02',
    title: 'The room',
    kind: 'pinned',
    length: 5,
    gate: { id: 'computer', at: 0.22 },
  },
  { id: 'hello', index: '03', title: 'Hello', kind: 'pinned', length: 5 },
  { id: 'horizon', index: '04', title: 'Event horizon', kind: 'pinned', length: 7 },
  { id: 'stars', index: '05', title: 'A life in stars', kind: 'pinned', length: 6 },
  { id: 'glass', index: '06', title: 'Glass', kind: 'pinned', length: 4 },
  { id: 'identity', index: '07', title: 'Who I am', kind: 'pinned', length: 5 },
  { id: 'archive', index: '08', title: 'Archive', kind: 'flow', length: 0 },
  { id: 'ending', index: '09', title: 'Resurface', kind: 'pinned', length: 6 },
];
