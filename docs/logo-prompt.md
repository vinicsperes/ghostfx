# Prompt — novo logo vetor do fantasma (GHOST FX)

Cole no Claude (ou ferramenta de design) o bloco abaixo:

```
Crie um logo vetorial (SVG) de mascote fantasma para "GHOST FX", um pedal de
guitarra virtual com estética de terminal/CRT (fundo escuro, traços em verde
fosforescente ou branco puro).

Direção:
- Fantasma estilo "lençol" minimalista e geométrico: silhueta de topo
  arredondado, base com 2–3 ondulações suaves (não serrilhada).
- UM olho só, grande e deslocado pro lado, com uma pálpebra reta caída
  (expressão de tédio/desconfiança — personalidade > fofura).
- Traço único de peso constante (stroke 2px em viewBox 32×32), sem gradientes,
  sem sombras; cantos com raio consistente.
- Precisa funcionar em 16×16px (favicon) e em 200px sem mudar de leitura.
- Monocromático: versão outline (stroke) e versão sólida (fill) no mesmo
  arquivo.
- Nada de braços, bochechas rosadas ou brilho de desenho infantil — referência
  é sinalização técnica / pixel art limpa, como ícones da Teenage Engineering.
- Entregar: SVG com path único otimizado, viewBox="0 0 32 32".

Contexto de uso: serigrafado em branco no topo de um pedal 3D ao lado do texto
"GHOST" em letras espaçadas, e como ícone pequeno na sidebar do site.
```

Quando o SVG vier, substituir `public/ghost.svg` (o `Svg` em `Pedal3D.tsx` e o
ícone da sidebar leem dele).
