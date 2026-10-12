export type CoverMotif =
  'twoPaths' | 'target' | 'teapot' | 'tenLaws' | 'keypad' | 'frame' | 'codeLines' | 'rings' | 'brokenWindow';

export interface BookEntry {
  slug: string;
  title: string;
  author: string;
  subject: string;
  readIn: number;
  takeaway: string;
  motif: CoverMotif;
  tone: 'light' | 'dark';
  ratio: number;
  thickness: number;
}

export const BOOKS: readonly BookEntry[] = [
  {
    slug: 'pai-rico',
    title: 'Pai Rico, Pai Pobre',
    author: 'Robert Kiyosaki',
    subject: 'Money',
    readIn: 2025,
    takeaway: 'Money is a tool, not a finish line. Learn how it moves before you let it move you.',
    motif: 'twoPaths',
    tone: 'dark',
    ratio: 0.716,
    thickness: 0.6,
  },
  {
    slug: 'dont-make-me-think',
    title: "Don't Make Me Think",
    author: 'Steve Krug',
    subject: 'Usability',
    readIn: 2025,
    takeaway: 'If someone has to stop and think about how to use it, I have not finished designing it.',
    motif: 'target',
    tone: 'light',
    ratio: 0.746,
    thickness: 0.45,
  },
  {
    slug: 'design-everyday-things',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    subject: 'Design',
    readIn: 2025,
    takeaway: 'When a door makes you feel stupid, the door is the problem. Never the person.',
    motif: 'teapot',
    tone: 'dark',
    ratio: 0.665,
    thickness: 0.7,
  },
  {
    slug: 'laws-of-simplicity',
    title: 'The Laws of Simplicity',
    author: 'John Maeda',
    subject: 'Simplicity',
    readIn: 2025,
    takeaway:
      'Simplicity is not about less. It is about removing everything that keeps the meaningful hidden.',
    motif: 'tenLaws',
    tone: 'light',
    ratio: 0.672,
    thickness: 0.32,
  },
  {
    slug: 'less-and-more',
    title: 'Less and More',
    author: 'Dieter Rams',
    subject: 'Industrial design',
    readIn: 2025,
    takeaway: 'Less, but better. Every element has to earn its place, or it leaves.',
    motif: 'keypad',
    tone: 'dark',
    ratio: 0.659,
    thickness: 0.95,
  },
  {
    slug: 'minimum',
    title: 'Minimum',
    author: 'John Pawson',
    subject: 'Architecture',
    readIn: 2025,
    takeaway: 'Empty space is never empty. Silence is a material too.',
    motif: 'frame',
    tone: 'light',
    ratio: 0.846,
    thickness: 0.8,
  },
  {
    slug: 'clean-code',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    subject: 'Software',
    readIn: 2025,
    takeaway:
      'Code is read far more often than it is written. Write it for the next person, who is usually you.',
    motif: 'codeLines',
    tone: 'dark',
    ratio: 0.756,
    thickness: 0.75,
  },
  {
    slug: 'clean-architecture',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    subject: 'Software design',
    readIn: 2025,
    takeaway: 'Good architecture lets you delay decisions until you finally know enough to make them.',
    motif: 'rings',
    tone: 'light',
    ratio: 0.695,
    thickness: 0.66,
  },
  {
    slug: 'pragmatic-programmer',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt & David Thomas',
    subject: 'Craft',
    readIn: 2025,
    takeaway: 'Care about the craft. Never live with a broken window, not even a small one.',
    motif: 'brokenWindow',
    tone: 'dark',
    ratio: 0.764,
    thickness: 0.7,
  },
];
