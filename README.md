# Brenno Leon — Into the Deep

Portfólio imersivo em uma única página de scroll: a superfície, o mar, o quarto, o buraco negro, as estrelas, o vidro, o nome, o arquivo e a volta à superfície.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

O deploy no GitHub Pages é automático (`.github/workflows/deploy-site.yml`) a cada push na `main` que mexa em `site/`.

Para pular direto para um capítulo, use `#capitulo/progresso` na URL, por exemplo `#horizon/0.4`.
Capítulos: `welcome`, `ocean`, `room`, `hello`, `horizon`, `stars`, `glass`, `identity`, `archive`, `ending`.

## Stack

- Vite, TypeScript estrito e three.js r186, sem framework de UI
- Lenis no scroll e Web Audio para a trilha procedural (nenhum arquivo de áudio)
- Um único `WebGLRenderer`: cada capítulo tem a sua cena, e um passe final cuida do preto e branco, grão, vinheta e transições
- Qualidade adaptativa: resolução, sombras, partículas e malhas se ajustam ao aparelho

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/app` | Experiência, diretor de capítulos e contexto compartilhado |
| `src/chapters` | Um capítulo por seção, com a coreografia de scroll de cada um |
| `src/webgl` | Cenas, materiais e shaders |
| `src/content` | Todos os textos do site |
| `src/story` | Seções, portões e progresso do scroll |
| `src/audio` | Motor de som, trilha e efeitos |
| `scripts` | Escultura do personagem 3D |

## Personagem 3D

O personagem é esculpido por código (campos de distância e surface nets) sobre o esqueleto do Mixamo X Bot:

```bash
node --max-old-space-size=4096 scripts/sculpt-person.mjs caminho/para/Xbot.glb
```

O resultado vai para `public/models/person.glb`.
