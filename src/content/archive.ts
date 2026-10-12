import type { SectionId } from '@/story/sections';

export interface KoemiModel {
  generation: string;
  name: string;
  stack: string;
  description: string;
  url: string;
  featured?: boolean;
}

export interface Principle {
  title: string;
  body: string;
}

export interface Specimen {
  id: 'swell' | 'dissolve' | 'magnify' | 'lens' | 'fracture' | 'particles';
  name: string;
  body: string;
  chapter: SectionId;
  chapterTitle: string;
}

export interface ToolGroup {
  name: string;
  tools: readonly string[];
}

export const ARCHIVE_INTRO = {
  caption: 'Archive',
  title: 'The record.',
  lede: 'Everything above was a feeling. Down here is the proof: what I build, what I read, how I work, and how to reach me.',
} as const;

export const KOEMI = {
  caption: 'Organization',
  title: 'Koemi AI',
  lede: 'My open-source research organization. Efficient alternatives to Transformers: recurrent models, long-term memory and adaptive computation.',
  question: 'Five generations, one question: what if a machine only spent effort where the text is hard?',
  url: 'https://github.com/Koemi-AI',
  urlLabel: 'github.com/Koemi-AI',
  models: [
    {
      generation: '01',
      name: 'Koemi-1FPA',
      stack: 'Python · PyTorch',
      description:
        'A recurrent language model with long-term memory and adaptive computation. Library and CLI for training and inference.',
      url: 'https://github.com/Koemi-AI/Koemi-1FPA',
    },
    {
      generation: '02',
      name: 'Koemi-2OBOV',
      stack: 'Python · PyTorch',
      description: 'The second generation of the Koemi family.',
      url: 'https://github.com/Koemi-AI/Koemi-2OBOV',
    },
    {
      generation: '03',
      name: 'Koemi-3HIP',
      stack: 'Python · PyTorch',
      description:
        'The HERM framework, Hierarchical Error-Refined Memory: a byte-level causal model with associative memory, exact context recall and prefix caching.',
      url: 'https://github.com/Koemi-AI/Koemi-3HIP',
      featured: true,
    },
    {
      generation: '04',
      name: 'Koemi-4HCM',
      stack: 'Python · CUDA',
      description:
        'Consolidates the HERM architecture, with native CUDA paths and isolated mixture-of-experts sub-mapping.',
      url: 'https://github.com/Koemi-AI/Koemi-4HCM',
    },
    {
      generation: '05',
      name: 'Koemi-5HOM',
      stack: 'Python · PyTorch',
      description:
        'Learned mixture-of-experts routing inspired by DeepGEMM, with supervised training of typed decisions.',
      url: 'https://github.com/Koemi-AI/Koemi-5HOM',
    },
  ] satisfies KoemiModel[],
} as const;

export const LIBRARY = {
  caption: 'Library',
  title: 'Sixteen books. Nine that stayed.',
  outro: 'The list keeps growing. It always will.',
} as const;

export const PRINCIPLES = {
  caption: 'How I work',
  title: 'Four rules I try not to break.',
  items: [
    {
      title: 'Less, but better.',
      body: 'Every element earns its place or it leaves. Black and white first; color has to argue its way in.',
    },
    {
      title: 'Motion is language.',
      body: 'Nothing moves without a reason. Easing, timing and rhythm say as much as the words do.',
    },
    {
      title: 'Feel first, then fast.',
      body: 'People judge an experience with their body before their mind. Then it has to run on the weakest phone in the room.',
    },
    {
      title: 'Curiosity is the stack.',
      body: 'Python at ten, shaders at sixteen. The tools keep changing. The hunger to understand how things work does not.',
    },
  ] satisfies Principle[],
} as const;

export const LAB = {
  caption: 'Effects lab',
  title: 'The tricks behind the dive.',
  lede: 'Small, live specimens of the effects you just swam through. Touch them.',
  specimens: [
    {
      id: 'swell',
      name: 'Gerstner swell',
      body: 'Ocean waves as a sum of trochoids, rendered in levels of detail so the horizon costs almost nothing.',
      chapter: 'ocean',
      chapterTitle: 'The deep',
    },
    {
      id: 'dissolve',
      name: 'Noise dissolve',
      body: 'A world-space threshold over fractal noise. Things vanish from far to near until only the screen is left.',
      chapter: 'room',
      chapterTitle: 'The room',
    },
    {
      id: 'magnify',
      name: 'Magnetic type',
      body: 'Every letter measured with real kerning, then pushed aside by its neighbors as it grows toward you.',
      chapter: 'hello',
      chapterTitle: 'Hello',
    },
    {
      id: 'lens',
      name: 'Gravitational lens',
      body: 'The point-mass lens equation solved per vertex, so light bends around the hole with no ray marching.',
      chapter: 'horizon',
      chapterTitle: 'Event horizon',
    },
    {
      id: 'fracture',
      name: 'Fracture',
      body: 'Radial and concentric cracks from the point of impact, split into thousands of shards that keep their image.',
      chapter: 'glass',
      chapterTitle: 'Glass',
    },
    {
      id: 'particles',
      name: 'Particle type',
      body: 'Text sampled into thousands of points that remember where they belong, and flee when you come close.',
      chapter: 'identity',
      chapterTitle: 'Who I am',
    },
  ] satisfies Specimen[],
} as const;

export const TOOLBOX = {
  caption: 'Toolbox',
  title: 'What I build with.',
  groups: [
    { name: 'Languages', tools: ['TypeScript', 'JavaScript', 'Python', 'GLSL', 'Java, learning'] },
    { name: 'Graphics & motion', tools: ['WebGL', 'Three.js', 'Shaders', 'Blender', 'SVG', 'Framer Motion'] },
    { name: 'Interface', tools: ['React', 'HTML', 'CSS', 'Node.js', 'WebSocket'] },
    { name: 'Machine learning', tools: ['PyTorch', 'CUDA', 'Prompt engineering'] },
  ] satisfies ToolGroup[],
} as const;

export const CONTACT = {
  caption: 'Contact',
  title: 'Let’s build something deep.',
  lede: 'Projects, freelance work, a conversation about design, or just to say hi. I read everything.',
  email: 'contato.brennoleon@gmail.com',
  copy: 'Copy email',
  copied: 'Copied',
  links: [
    { label: 'GitHub', url: 'https://github.com/AnThophicous' },
    { label: 'Koemi AI', url: 'https://github.com/Koemi-AI' },
  ],
} as const;
