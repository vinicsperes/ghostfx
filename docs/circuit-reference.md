# Referência de circuito real — GHOST FX MK.I

Base para modelar os internos do pedal com componentes, tamanhos e layout que
fazem sentido na vida real, em vez de um circuito inventado.

## Arquitetura real equivalente

O GHOST FX (Drive, Tone, Echo, Reverb, Volume) corresponde a um multi-efeito DIY
clássico com três blocos bem documentados:

```
Input jack (direita)
  → buffer de entrada (Q1, 2SC1815)
  → estágio de clipping estilo TS808 (½ JRC4558D + 2× 1N4148 antiparalelo)  [DRIVE]
  → estágio de tone ativo (½ JRC4558D)                                     [TONE]
  → delay digital PT2399 (DIP-16, alimentado a 5V via 78L05)               [ECHO]
  → reverb módulo Belton BTDR-2H (brick 6 pinos)                           [REVERB]
  → buffer de saída (Q2) → pot de volume                                   [VOLUME]
  → footswitch 3PDT (true bypass) → Output jack (esquerda)
```

Alimentação: bateria 9V **ou** jack DC 2,1 mm na traseira, diodo de proteção de
polaridade (1N4001), filtragem 100 µF + 47 µF, e regulador 78L05 (TO-92) gerando
5 V só para o PT2399.

## BOM visual (o que precisa aparecer na placa)

| Qtd | Componente | Aparência |
|----|-------------|-----------|
| 1 | JRC4558D (DIP-8) | corpo preto 9,8×6,35 mm, texto branco, meia-lua numa ponta, em **soquete** |
| 1 | PT2399 (DIP-16) | corpo preto 19,3×6,35 mm, texto branco, em soquete |
| 1 | Belton BTDR-2H | bloco preto 38×28×12 mm, 6 pinos em linha, etiqueta branca |
| 2 | 2SC1815 (TO-92) | meia-lua preta 4,5 mm, 3 pernas |
| 1 | 78L05 (TO-92) | idem |
| 2 | 1N4148 (DO-35) | vidro âmbar 4,25×2 mm com listra preta — **diodos de clipping, protagonistas do drive** |
| 1 | 1N4001 (DO-41) | corpo preto 5,2×2,7 mm com listra prata |
| ~20 | Resistor 1/4 W | bege 6,3×2,3 mm, 4 faixas de cor, pernas dobradas, espaçamento 10,16 mm |
| ~6 | Eletrolítico | cilindro com sleeve (azul/preto), listra branca de “−”; 1 µF: ø5×11 · 47 µF: ø6,3×11 · 100 µF: ø8×11,5 mm |
| ~5 | Film box (WIMA) | caixinha vermelha 7,2×7,2×2,5–5 mm, pitch 5 mm (0,047 µF / 0,22 µF do TS808) |
| ~3 | Cerâmico disco | disco laranja ø5–6 mm (51 pF de compensação etc.) |
| 5 | Pot Alpha 16 mm | corpo ø16×10 mm, bushing roscado 7 mm, 3 lugs |
| 1 | Footswitch 3PDT | base 17,6×17,6 mm, 9 lugs, altura total ~33 mm |
| 2 | Jack 1/4" | bushing ø9,5 mm, corpo ~30 mm pra dentro |
| 1 | Jack DC 2,1 mm | rosca ø12 mm, traseira |
| 1 | Bateria 9V | 48,5×26,5×17,5 mm — **domina o interior**, com snap (capinha preta + fios vermelho/preto) |
| 1 | LED 5 mm | ø5 mm com bezel |

Valores canônicos do bloco TS808 (pra silkscreen/labels realistas): Drive 500KA,
Tone 20K, Level/Volume 100K; clipping 51K + 51 pF no feedback, 4,7K + 0,047 µF
no inversor. Echo (PT2399): pot 50KB no pino 6.

## Escala da cena

Gabarito real de referência: **Hammond 1590BB** (119×94×34 mm) — é o que se usa
com 5 knobs + delay + reverb. Ancorando no comprimento do chassi atual
(`L = 3.20` unidades ≙ 119 mm):

> **1 unidade = 37,2 mm  ·  1 mm = 0,0269 u**

A face superior atual já bate bem com essa escala (knobs ø0,30–0,34 u ≈ 11–13 mm ✓,
footswitch ✓, LED ✓). O que está fora de escala são os **internos**:

| Item | Real (mm) | Em unidades | Hoje no código | Status |
|------|-----------|-------------|----------------|--------|
| PCB (espessura) | 1,6 | 0,043 | 0,05 | ✓ ok |
| Trilha | 0,8–1,5 | 0,022–0,040 | 0,011–0,030 | ✓ ok |
| DIP-8 | 9,8 × 6,35 × 3,3 | 0,264 × 0,171 × 0,089 | 0,235 × 0,10 × 0,038 | estreito e baixo |
| DIP-16 (PT2399) | 19,3 × 6,35 | 0,519 × 0,171 | — não existe | criar |
| Belton brick | 38 × 28 × 12 | 1,02 × 0,75 × 0,32 | — não existe | criar |
| Resistor 1/4 W | 6,3 × ø2,3 | 0,169 × ø0,062 | 0,052 × ø0,030 | **3× menor** |
| Eletrolítico 47 µF | ø6,3 × 11 | ø0,169 × 0,296 | ø0,13 × 0,22 | um pouco menor |
| Eletrolítico 100 µF | ø8 × 11,5 | ø0,215 × 0,309 | ø0,144 × 0,24 | menor |
| 1N4148 | 4,25 × ø2 | 0,114 × ø0,054 | — não existe | criar |
| TO-92 | 4,5 × 4,5 | 0,121 | ø0,068 × 0,07 | menor |
| WIMA box | 7,2 × 7,2 × 2,5 | 0,194 × 0,194 × 0,067 | 0,07 × 0,05 × 0,026 | **muito menor** |
| Pot 16 mm | ø16 × 10 | ø0,430 × 0,269 | ø0,17 × 0,11 | **2,5× menor** |
| 3PDT (corpo) | 17,6 × 17,6 | 0,473 × 0,473 | 0,20 × 0,20 | **2,4× menor** |
| Jack 1/4" (corpo interno) | ø~19 × 30 | ø0,51 × 0,81 | ø0,156 × 0,19 | bem menor |
| Bateria 9V | 48,5 × 26,5 × 17,5 | 1,30 × 0,71 × 0,47 | 0,34 × 0,17 × 0,34 | **4× menor** |
| Pitch furos (2,54 mm) | 2,54 | 0,068 | — | usar como grid |

(Nota: o chassi atual tem W = 2.10 u ≈ 78 mm, entre o 1590B (60) e o 1590BB
(94). Não precisa mudar — só manter a escala 1 u = 37,2 mm pra tudo.)

## Layout que faz sentido (placa)

Fluxo de sinal da direita (input) para a esquerda (output), como num pedal real:

1. **Canto traseiro-direito**: entrada — resistor pulldown, cap de acoplamento, Q1.
2. **Centro-direita**: JRC4558D (soquete) cercado pelos 2× 1N4148, 51pF disco,
   WIMA 0,047 µF, resistores do feedback. Fios curtos até os pots DRIVE e TONE.
3. **Centro-esquerda**: PT2399 (DIP-16) com cluster de eletrolíticos pequenos e
   resistores ao redor (o chip exige ~10 caps próximos), 78L05 ao lado.
4. **Fundo-esquerdo**: Belton brick deitado (ocupa 1,0 × 0,75 u).
5. **Frente**: trilhos de alimentação, 100 µF + 47 µF perto da entrada de força,
   1N4001. Bateria presa na frente, ao lado do footswitch.
6. **Fiação true bypass**: input jack → lug do 3PDT → entrada da placa; saída da
   placa → lug do 3PDT → output jack; LED no terceiro polo do 3PDT. Quase todos
   os 9 lugs do switch recebem fio (como na foto de referência).
7. Silkscreen: designadores `R1…R20`, `C1…C14`, `IC1/IC2`, `D1–D3`, `Q1–Q3`,
   logo “GHOST FX MK.I” serigrafado.

## Fontes

- Esquemático/layout EWS Little Brute Drive (pedal do vídeo — drive de 1 knob):
  https://tagboardeffects.blogspot.com/2017/10/ews-little-brute-drive.html
- Análise completa do TS808 (blocos, valores, JRC4558D):
  https://www.electrosmash.com/tube-screamer-analysis
- Esquemático TS808 original (General Guitar Gadgets):
  https://schematicheaven.net/effects/ggg_ibanez_ts-808_ORIGINAL.pdf
- Análise do PT2399 (DIP-16, 5V, 30–340 ms):
  https://www.electrosmash.com/pt2399-analysis
- Datasheet Belton BTDR-2 (dimensões do brick):
  https://diy.smallbearelec.com/Library/Datasheets/Belton_BTDR-2.pdf
- BTDR-2H 38×28×12 mm: https://stompboxparts.com/semiconductors/belton-btdr-2h-reverb-ic/
