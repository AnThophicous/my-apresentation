export const site = {
  name: 'Brenno Leon de Souza Amaral',
  short: 'Brenno Leon',
  role: 'Desenvolvedor Full Stack, foco em Front-end',
  github: 'https://github.com/AnThophicous',
  githubLabel: 'github.com/AnThophicous',
};

export const intro = [
  { id: 'hi', text: 'Hi.', kind: 'xl' },
  { id: 'welcome', text: 'Welcome into my life.', kind: 'l' },
  { id: 'dot1', text: '.', kind: 'dot' },
  { id: 'wonder', text: 'You must be wondering who I am.', kind: 'l' },
  { id: 'dot2', text: '.', kind: 'dot' },
  { id: 'name', pre: 'Well. I am', text: 'Brenno Leon de Souza Amaral.', kind: 'name' },
  { id: 'role', text: 'Full Stack Developer. Front-end at heart.', kind: 's' },
];

export const skills = [
  { name: 'Programador', detail: 'Full Stack · foco em Front-end', time: '4 anos', months: 48 },
  { name: 'Designer Gráfico', time: '3 anos', months: 36 },
  { name: 'Especialista em ML', time: '1 ano', months: 12 },
  { name: 'SVG Maker', time: '1 ano', months: 12 },
  { name: 'Fotógrafo', detail: 'aprendiz', time: '1 ano', months: 12 },
  { name: 'Modelador 3D', detail: 'Blender', time: '6 meses', months: 6 },
  { name: 'WebGL & posterização', detail: 'iniciante', time: 'começando', kind: 'dashed' },
  { name: 'Marketing Digital', detail: 'aspirante', time: 'aprendendo', kind: 'dashed' },
  { name: 'Música', detail: 'apaixonado', time: '∞', kind: 'wave' },
];

export const keyboard = [
  [
    { l: 'React', w: 1.75, dark: true, d: 'Front-end com identidade.' },
    { l: 'TypeScript', w: 2, d: 'Desde 2023.' },
    { l: 'JavaScript', w: 2, d: 'Desde 2020, a primeira língua.' },
    { l: 'Node.js', w: 1.5, d: 'O lado de trás da tela.' },
    { l: 'Python', w: 1.5, d: 'Desde 2020, onde tudo começou.' },
    { l: 'Java', w: 1.25, d: 'Aprendendo desde 2023.' },
  ],
  [
    { l: 'HTML', w: 1, d: 'A base de tudo.' },
    { l: 'CSS', w: 1, d: 'Onde o design vira real.' },
    { l: 'SVG', w: 1, dark: true, d: '1 ano desenhando com código.' },
    { l: 'WebGL', w: 1.5, d: 'Aplicado em 2026, inclusive aqui.' },
    { l: 'GLSL', w: 1.25, d: 'Shaders, dithering, posterização.' },
    { l: 'Three.js', w: 1.75, d: '3D de verdade, no navegador.' },
    { l: 'PyTorch', w: 1.5, d: 'Onde nasce a família Koemi.' },
    { l: 'CUDA', w: 1, d: 'Frentes nativas no Koemi-4HCM.' },
  ],
  [
    { l: 'Framer Motion', w: 2.5, d: 'Movimento com intenção.' },
    { l: 'Blender', w: 1.75, d: '6 meses modelando em 3D.' },
    { l: 'ML', w: 1.25, dark: true, d: 'Especialista há 1 ano. Koemi AI.' },
    { l: 'Prompt Eng.', w: 2.25, d: 'Estudado pela Harvard, de graça.' },
    { l: 'WebSocket', w: 2.25, d: 'Tempo real, desde 2020.' },
  ],
  [
    { l: 'Discord bots', w: 2.25, d: '2021, aprendendo na prática.' },
    { l: 'space', w: 6, d: 'Espaço para o que ainda não existe.' },
    { l: 'IA', w: 1.75, dark: true, d: 'Entusiasta desde o GPT-4.' },
  ],
];

export const why = {
  eyebrow: '03 · Por quê',
  question: 'Por que alguém passaria a madrugada inteira por causa de um único pixel?',
  text: 'Porque computação é onde uma ideia vira algo que alguém pode sentir. Uma linha vira forma. A forma vira movimento. O movimento vira emoção. E eu nunca mais quis parar de construir.',
  emphasis: ['linha', 'forma.', 'movimento.', 'emoção.'],
  historyTitle: ['Tudo isso começou com gente curiosa.', 'Arraste. Olhe de perto.'],
  history: [
    {
      slug: 'eniac',
      year: '1946',
      title: 'ENIAC',
      caption: 'Uma sala inteira para fazer contas. Hoje, isso cabe no seu bolso.',
      alt: 'Operadores ao lado dos painéis do ENIAC',
      ratio: 1340 / 1024,
      rotate: -4,
    },
    {
      slug: 'first-bug',
      year: '1947',
      title: 'O primeiro bug',
      caption: 'Uma mariposa de verdade, presa num relé. Desde então, a gente caça bugs.',
      alt: 'Página de diário de bordo com uma mariposa colada',
      ratio: 1400 / 1108,
      rotate: 3,
    },
    {
      slug: 'earthrise',
      year: '1968',
      title: 'Earthrise',
      caption: 'Computadores levaram a gente longe o bastante para olhar de volta pra casa.',
      alt: 'A Terra surgindo no horizonte da Lua, Apollo 8',
      ratio: 1400 / 1100,
      rotate: -2,
    },
    {
      slug: 'hamilton',
      year: '1969',
      title: 'Margaret Hamilton',
      caption: 'Ao lado do código que levou a humanidade à Lua. Uma pilha de linhas.',
      alt: 'Margaret Hamilton ao lado das listagens do código da Apollo',
      ratio: 1400 / 1741,
      rotate: 5,
    },
  ],
};

export const books = [
  { slug: 'pai-rico', title: 'Pai Rico, Pai Pobre', author: 'Robert Kiyosaki', ratio: 358 / 500, thick: 26 },
  { slug: 'dont-make-me-think', title: "Don't Make Me Think", author: 'Steve Krug', ratio: 341 / 457, thick: 20 },
  { slug: 'design-everyday-things', title: 'The Design of Everyday Things', author: 'Don Norman', ratio: 332 / 499, thick: 30 },
  { slug: 'laws-of-simplicity', title: 'The Laws of Simplicity', author: 'John Maeda', ratio: 336 / 500, thick: 14 },
  { slug: 'less-and-more', title: 'Less and More', author: 'Dieter Rams', ratio: 282 / 428, thick: 40 },
  { slug: 'minimum', title: 'Minimum', author: 'John Pawson', ratio: 402 / 475, thick: 34 },
  { slug: 'clean-code', title: 'Clean Code', author: 'Robert C. Martin', ratio: 300 / 397, thick: 32 },
  { slug: 'clean-architecture', title: 'Clean Architecture', author: 'Robert C. Martin', ratio: 339 / 488, thick: 28 },
  { slug: 'pragmatic-programmer', title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas', ratio: 382 / 500, thick: 30 },
];

export const timelineIntro = {
  eyebrow: '04 · A linha',
  question: 'Lembra da linha que você puxou?',
  lede: ['Ela não era só uma linha.', 'Era o fio de uma história, a minha.', 'Ainda embolada, como toda história que está começando.'],
};

export const timeline = [
  {
    year: 2020,
    age: 10,
    question: 'Você lembra o que fazia aos 10 anos?',
    title: 'Eu estava aprendendo a conversar com máquinas.',
    body: [
      'Programação na prática. Sem saber o nome de metade das coisas, mas sabendo exatamente o que eu queria: fazer algo funcionar.',
      'A primeira vez que uma linha que eu escrevi respondeu de volta, alguma coisa mudou pra sempre.',
    ],
    tags: ['Python', 'JavaScript', 'WebSocket'],
  },
  {
    year: 2021,
    age: 11,
    question: 'Quando foi a última vez que você criou algo só pra ver se dava certo?',
    title: 'Bots de Discord, na prática.',
    body: [
      'Pessoas conversando com algo que eu tinha escrito. Comandos, respostas, erros, e a alegria boba de ver tudo funcionando.',
      'Foi ali que eu entendi: código não é sobre computadores. É sobre gente.',
    ],
    tags: ['JavaScript', 'Python'],
  },
  {
    year: 2023,
    age: 13,
    question: 'Você já sentiu que uma máquina te entendeu?',
    title: 'Entusiasta da IA.',
    body: [
      'Aí veio o GPT-4. E com ele, uma pergunta que nunca mais saiu da minha cabeça: como uma máquina aprende?',
      'Comecei a estudar Machine Learning e IA aplicada. TypeScript entrou na rotina. Java, aos poucos.',
    ],
    tags: ['JavaScript', 'Python', 'TypeScript', 'Java · aprendendo'],
  },
  {
    year: 2024,
    age: 14,
    question: 'Quantas versões de você cabem em um único ano?',
    title: 'Designer. Front-end. E, finalmente, Full Stack.',
    body: [
      'O ano em que eu parei de só escrever código e comecei a desenhar experiências. Design Gráfico e Front-end, levados a sério.',
      'Front e back-end, os dois lados da tela. E Engenharia de Prompts, estudada de graça pelo site de Harvard. Vontade de aprender nunca precisou de permissão.',
    ],
    tags: ['Design Gráfico', 'Front-end', 'Back-end', 'Engenharia de Prompts'],
  },
  {
    year: 2025,
    age: 15,
    question: 'Quantas páginas são precisas pra mudar o jeito que você enxerga o mundo?',
    title: 'Estudante aplicado em Design Gráfico.',
    body: [
      'Pra mim, foram mais de 16 livros. Sobre dinheiro, sobre código limpo, e sobre por que uma porta mal desenhada faz você se sentir burro, quando a culpa é do design.',
    ],
    books: true,
    booksCount: 16,
    booksExtra: 13,
    counters: [{ value: 30, label: 'ideias de designs interativos' }],
  },
  {
    year: 2026,
    age: 16,
    question: 'E se menos for, de verdade, mais?',
    title: 'Menos fala mais.',
    body: [
      'Mais de 60 designs interativos aprendidos. A arte do minimalismo. Teoria das cores. WebGL aplicado, inclusive neste site que você está navegando agora.',
    ],
    counters: [{ value: 60, label: 'designs interativos aprendidos' }],
    learned: ['Arte do minimalismo', 'Teoria das cores', 'WebGL aplicado'],
    closing: ['Amante da tecnologia, de Machine Learning e de IA.', 'Front-end profissional, e com identidade.'],
  },
];

export const projects = {
  title: ['O que eu construo', 'quando ninguém está olhando.'],
  org: {
    name: 'Koemi AI',
    url: 'https://github.com/Koemi-AI',
    lede: 'Minha organização de pesquisa open-source.',
    desc: 'Alternativas eficientes aos Transformers: modelos recorrentes, memória de longo prazo e computação adaptativa. Cinco gerações, uma pergunta: e se a máquina gastasse esforço só onde o texto é difícil?',
  },
  items: [
    {
      gen: '01',
      name: 'Koemi-1FPA',
      lang: 'Python · PyTorch',
      desc: 'Modelo de linguagem recorrente com memória de longo prazo e computação adaptativa. Biblioteca e CLI para treino e inferência.',
      url: 'https://github.com/Koemi-AI/Koemi-1FPA',
    },
    {
      gen: '02',
      name: 'Koemi-2OBOV',
      lang: 'Python · PyTorch',
      desc: 'A segunda geração da família Koemi.',
      url: 'https://github.com/Koemi-AI/Koemi-2OBOV',
    },
    {
      gen: '03',
      name: 'Koemi-3HIP',
      lang: 'Python · PyTorch',
      desc: 'O framework HERM (Hierarchical Error-Refined Memory): modelo causal em nível de byte, memória associativa, recall exato de contexto e prefix caching.',
      url: 'https://github.com/Koemi-AI/Koemi-3HIP',
      featured: true,
    },
    {
      gen: '04',
      name: 'Koemi-4HCM',
      lang: 'Python · CUDA',
      desc: 'Consolidação da arquitetura HERM, com frentes nativas em CUDA e submapeamento isolado de MoE.',
      url: 'https://github.com/Koemi-AI/Koemi-4HCM',
    },
    {
      gen: '05',
      name: 'Koemi-5HOM',
      lang: 'Python · PyTorch',
      desc: 'Roteamento MoE aprendido, inspirado no DeepGEMM, com treino supervisionado de decisões tipadas (MDT).',
      url: 'https://github.com/Koemi-AI/Koemi-5HOM',
    },
  ],
};

export const contact = {
  eyebrow: '05 · Converse comigo',
  title: 'Converse comigo!',
  lede: 'Uma ideia, um projeto, uma dúvida, ou só um oi. Toda boa história começa com alguém puxando a linha.',
  email: 'contato.brennoleon@gmail.com',
  greeting: 'Oi! Que bom que você chegou até aqui. Sobre o que você quer conversar?',
  topics: [
    { label: 'Tenho um projeto', reply: 'Que demais. Me conta a ideia, sem pressa, do jeito que vier.' },
    { label: 'Freela / trabalho', reply: 'Bora. Me fala o que você precisa e pra quando.' },
    { label: 'Trocar ideia sobre design', reply: 'Meu assunto favorito. Manda.' },
    { label: 'Só dizer oi', reply: 'Oi! 👋 Fico feliz de verdade. Deixa um recado.' },
  ],
  placeholder: 'Escreva aqui…',
  thanks: 'Recebido. Prometo responder com o mesmo cuidado que pus neste site.',
};

export const ending = {
  question: 'Aí chega no fim, certo?',
  answer: 'Não.',
  note: ['Toda linha que a gente puxa', 'leva de volta ao começo.'],
};
