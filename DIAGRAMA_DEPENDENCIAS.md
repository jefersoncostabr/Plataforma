# 📊 MAPA VISUAL DAS DEPENDÊNCIAS POR CATEGORIA

## Sistema de Cores e Legenda

```
🔴 RAIZ/ENTRADA
🟠 ORQUESTRADOR
🟡 DADOS/CONFIG
🟢 GAMEPLAY/LOGIC
🔵 JOGADOR
🟣 INIMIGOS
🟠 VISUAL/RENDERIZAÇÃO
🪴 DEBUG/TOOLS
```

---

## 1. FLUXO DE INICIALIZAÇÃO

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html 🔴                             │
│  └─ Carrega todos os scripts JS e CSS                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │  inicializador.js 🟠          │
       │  (Orquestrador Central)       │
       │                               │
       │  1. Define window.niveis      │
       │  2. Prepara mapa do mundo     │
       │  3. Aguarda ação do usuário   │
       └──────────┬────────────────────┘
                  │
        ┌─────────┴─────────┬──────────────┐
        │                   │              │
        ▼                   ▼              ▼
   cenario.js 🟠      colisao.js 🟢   camera.js 🟠
   renderiza           setup             setup
   plataformas         limites           viewport
```

---

## 2. CICLO DE JOGO PRINCIPAL (requestAnimationFrame)

```
┌──────────────────────────────────────────────────────────────────┐
│                  CADA FRAME (~16ms em 60fps)                      │
└──────────────┬───────────────────────────────────────────────────┘
               │
        ┌──────┴──────────────────────────┐
        │                                 │
        ▼                                 ▼
    ┌─────────────┐              ┌──────────────┐
    │ ENTRADA     │              │ ATUALIZAR    │
    ├─────────────┤              ├──────────────┤
    │ Teclas      │──────────────│ Posição X/Y  │
    │ Pressionadas│              │ Velocidade Y │
    │ (Controles) │              │ (Gravidade)  │
    └─────────────┘              └──────┬───────┘
         │                              │
         │                              ▼
         │                    ┌──────────────────┐
         │                    │ COLISÕES         │
         │                    ├──────────────────┤
         │                    │ - Tiles normais  │
         │                    │ - Spikes (estaca)│
         │                    │ - Limites do mapa│
         │                    │ - Inimigos       │
         │                    │ - Itens          │
         │                    └──────┬───────────┘
         │                           │
         │                           ▼
         │                    ┌──────────────────┐
         │                    │ ANIMAÇÕES        │
         │                    ├──────────────────┤
         │                    │ Walk cycle       │
         │                    │ Jump sprite      │
         │                    │ Kick animation   │
         │                    └──────┬───────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ INIMIGOS 🟣      │
            ├──────────────────┤
            │ 1. Ler posição   │
            │    do jogador    │
            │ 2. Calcular IA   │
            │ 3. Mover inimigo │
            │ 4. Atacar se     │
            │    perto         │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ CÂMERA 🟠        │
            ├──────────────────┤
            │ Seguir jogador   │
            │ Aplicar limites  │
            │ Transformar CSS  │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ RENDERIZAR 🟠    │
            ├──────────────────┤
            │ CSS transforms   │
            │ Z-index          │
            │ Visibilidade     │
            └──────────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ VERIFICAR 🎯     │
            ├──────────────────┤
            │ Venceu?          │
            │ Morreu?          │
            │ Fase completa?   │
            └──────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
      SIM: ▼              NÃO: │
    ┌──────────────┐         │
    │ carregarFase │         │
    │ (Próxima)    │         │
    └──────────────┘         │
                             │
                    ┌────────┴──────────┐
                    │                   │
                    └───────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ PRÓXIMO FRAME    │
                    │ requestAnimFrame │
                    └──────────────────┘
```

---

## 3. ÁRVORE DE DEPENDÊNCIAS DETALHADA

### NÚCLEO (Core - Tudo depende disto)
```
            ┌─────────────────┐
            │  fisica.js 🟢   │
            │  (Gravidade)    │
            └────────┬────────┘
                     │ usa
        ┌────────────┴─────────────┐
        │                          │
        ▼                          ▼
    movimento.js 🔵     colisao.js 🟢
    (Jogador)           (Tiles/Limites)
        │                    │
        │                    ▼
        │              estacas.js 🟢
        │              (Spike collision)
        │
        └────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │ Todos os outros     │
          │ módulos dependem    │
          │ desta base!         │
          └─────────────────────┘
```

### PLAYER LAYER (Jogador)
```
                movimento.js 🔵
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    animacao     efeitos    skills-
    .js 🟠       visuais.js  efeitos
                  🟠          .js 🟢
                             (Aplica bônus)
                                │
                                ▼
                           skills.js 🟡
                           (Árvore defs)
```

### ENEMY LAYER (Inimigos)
```
                inimigo.js 🟣
                     │
                     ▼
            ia-inimigo.js 🟣
            (IA de perseguição)
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    colisao    efeitos    animacao
    .js 🟢      visuais    .js 🟠
               .js 🟠
```

### VISUAL LAYER (Renderização)
```
                camera.js 🟠
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    cenario     grade-debug    animacoes-
    .js 🟠       .js 🪴         equipamento
               (Auxiliar)        .js 🟠
```

---

## 4. MATRIZ DE INFLUÊNCIA (O que afeta o quê)

```
                │ Core │ Player│Enemy │Visual│ UI │Skills│
                ├──────┼───────┼──────┼──────┼───┼──────┤
Core            │ ✓    │ ~~~   │ ~~~  │ -   │ -  │  -   │  (Afeta tudo)
Player          │ -    │ ✓     │ ~~~  │ ~~  │ -  │  ~~  │
Enemy           │ -    │ ✓     │ ✓    │ ~~  │ -  │  -   │
Visual          │ -    │ ~~    │ ~~   │ ✓   │ ~~  │  -   │
UI              │ -    │ ~~    │ -    │ -   │ ✓  │  ~~~  │
Skills          │ -    │ ~~    │ -    │ -   │ -  │  ✓    │

Legenda:
✓   = Influência forte e direta
~~  = Influência média
~~~ = Influência forte INdireta
-   = Sem influência
```

---

## 5. CASCATA DE DADOS (Flow de Informações)

```
ENTRADA (Teclas)
    │
    ▼
movimento.js 🔵
    │
    ├─ Calcula nova posição
    │       │
    │       ▼
    ├─ Verifica colisão ──────► colisao.js 🟢 ──► estacas.js 🟢
    │       │
    │       ▼
    ├─ Aplica gravidade ──────► fisica.js 🟢
    │       │
    │       ▼
    ├─ Renderiza sprite ──────► animacao.js 🟠
    │       │
    │       ▼
    └─ Retorna nova posição (x, y, velocidadeY)
                │
                ▼
        Posição armazenada em:
        window.playerControle = {
            x, y, velocidadeY,
            noChao, chutando,
            temEscudo, ...
        }
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
   Inimigos usam   Camera segue
   para IA 🟣      update 🟠
```

---

## 6. TABELA DE RESPONSABILIDADES

| Módulo | Responsabilidade Única | Acoplamento | Criticidade |
|--------|------------------------|-------------|------------|
| `fisica.js` | Aplicar gravidade | ZERO | CRÍTICA |
| `colisao.js` | Detectar colisões | Baixo | CRÍTICA |
| `estacas.js` | Colisão especial (spikes) | Muito baixo | MÉDIA |
| `movimento.js` | Input → Atualizar posição | Médio | CRÍTICA |
| `inimigo.js` | Criar inimigo visual/lógico | Baixo | MÉDIA |
| `ia-inimigo.js` | Movimento inimigo seguindo player | Médio | ALTA |
| `camera.js` | Follow + Culling | Muito baixo | MÉDIA |
| `animacao.js` | Atualizar sprite frame | Muito baixo | BAIXA |
| `skills.js` | Gerenciar árvore de skills | Baixo | ALTA |
| `skills-efeitos.js` | Aplicar bônus | Médio | MÉDIA |
| `menu.js` | UI/UX do menu | Médio | MÉDIA |
| `cenario.js` | Renderizar tiles | Médio | CRÍTICA |
| `efeitos-visuais.js` | Feedback visual (flash, etc) | Muito baixo | BAIXA |
| `grade-debug.js` | Auxiliar edição/debug | Zero | DEBUG |

---

## 7. PONTOS CRÍTICOS E RISCOS

### 🔴 PONTOS CRÍTICOS (Altamente Acoplados)

```
1. configuracoesGerais.json
   └─ Usado por: 12+ módulos
   └─ Risco: Uma mudança quebra TUDO
   └─ Mitigação: Versionamento, validação em load

2. window.playerControle (estado global)
   └─ Escrito por: movimento.js, colisao.js, fisica.js
   └─ Lido por: inimigos, skills, menu, camera
   └─ Risco: Inconsistência de estado
   └─ Mitigação: Nomear com getter/setter

3. inicializador.js
   └─ Orquestra: cenario, colisao, fases
   └─ Risco: Mudança quebra inicialização
   └─ Mitigação: Manter simples, testável
```

### 🟡 PONTOS DE ATENÇÃO (Mediamente Acoplados)

```
1. inimigoMovimentacao.js
   └─ Lê: playerControle, colisao, fisica
   └─ Modifica: window.inimigos
   └─ Risco: Lógica complexa, hard debug

2. skillsEfeitos.js
   └─ Modifica: playerControle (stats)
   └─ Aplicado por: movimento.js
   └─ Risco: Efeitos podem se sobrepor

3. colisao.js
   └─ Usa: estacas.js (depende estrutura)
   └─ Risco: Mudança em estaca quebra colisão
```

### 🟢 PONTOS SEGUROS (Baixo Acoplamento)

```
✓ camera.js - Pode ser reescrito sem quebrar
✓ animacao.js - Pode ser totalmente substituída
✓ efeitos-visuais.js - Totalmente modular
✓ grade-debug.js - Debug-only, sem impacto
```

---

## 8. COMO ADICIONAR NOVAS FEATURES

### Adicionar Novo Tipo de Inimigo
```
1. Criar função em inimigo.js
   function criarInimigoTipo3() { ... }
   
2. Adicionar lógica em ia-inimigo.js
   if (inimigo.tipo === 3) { ... }
   
3. Adicionar no JSON de fase
   "inimigos3": ["coordenadas"]
   
4. Testar em cenario_teste.json
   
CUSTO: 15-30 min
RISCO: Baixo (isolado em 1-2 arquivos)
```

### Adicionar Nova Skill
```
1. Defini-la em config/skills-dados.json
   "skill_nova": { "nome": "...", "parent": "..." }
   
2. Implementar efeito em skillsEfeitos.js
   case 'skill_nova': { ... }
   
3. Testar no menu de skills (F1)
   
CUSTO: 10-20 min
RISCO: Muito baixo (isolado em dados + 1 função)
```

### Adicionar Novo Equipamento
```
1. Adicionar sprite em config/configuracoes.json
   "spriteItemNovo": "path..."
   
2. Adicionar lógica de coleta em movimento.js
3. Adicionar efeito em skillsEfeitos.js ou ia-inimigo.js
4. Testar no cenário
   
CUSTO: 30-60 min
RISCO: Médio (toca movimento + coleta)
```

---

## 9. TESTING & DEBUG BY LAYER

### Para testar cada camada isoladamente:

```javascript
// 1. CORE TESTS (fisica.js, colisao.js)
// ✓ Pode ser testado com lógica pura
// ✓ Sem DOM necessário
const teste = {
  aplicar_gravidade: () => { ... },
  verificar_colisao_tile: () => { ... }
}

// 2. PLAYER LAYER (movimento.js)
// ✓ Pode ser testado com DOM mockado
// ✓ Simular teclas pressionadas
const teste = {
  movimento_esquerda: () => { ... },
  movimento_direita: () => { ... }
}

// 3. ENEMY LAYER (ia-inimigo.js)
// ✓ Pode ser testado isolado
// ✓ Simular playerControle
const teste = {
  inimigo_persegue_player: () => { ... }
}

// 4. VISUAL LAYER (camera.js, animacao.js)
// ✓ Pode ser "desligado" sem quebrar (opcional)
// ✓ Testar CSS transforms

// 5. INTEGRATION TEST
// ✓ Testar fluxo completo
// ✓ Player move → Colisão → Renderiza → Câmera
```

---

## Resumo de Dependência

```
Dependência Mais Forte/Crítica    Independência
         ▼                                ▲
┌────────┴────────────────────┬─────────┘
│                             │
├─ fisica.js (NÚCLEO)        ├─ grade-debug.js
├─ colisao.js (NÚCLEO)       ├─ efeitos-visuais.js
├─ movimento.js               ├─ animacao.js
├─ inimigo.js + ia-inimigo    ├─ camera.js
├─ cenario.js                 └─ estacas.js
├─ skills.js
├─ skillsEfeitos.js
├─ menu.js
└─ inicializador.js
```

Quanto mais à esquerda = mais central ao jogo = maior impacto de mudanças
Quanto mais à direita = mais especializado = pode ser alterado/removido

