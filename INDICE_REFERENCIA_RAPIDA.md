# 🔍 ÍNDICE RÁPIDO DE REFERÊNCIA

## 📑 Índice de Todos os Arquivos

### JavaScript - CORE (Fundamental)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `colisao.js` | ~400 | Detectar colisão com tiles | estacas.js | 🔴 CRÍTICA |
| `estacas.js` | ~200 | Colisão com spikes | nenhuma | 🟡 IMPORTANTE |
| `fisica.js` | ~40 | Aplicar gravidade e pulo | nenhuma | 🔴 CRÍTICA |
| `posicionamento.js` | ~20 | Posição inicial do personagem | nenhuma | 🟢 BAIXA |
| `inicializador.js` | ~150 | Carregar e iniciar fases | cenario, colisao, fases JSON | 🔴 CRÍTICA |

### JavaScript - PLAYER (Jogador)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `movimentacao.js` | ~800 | Input do jogador → Movimento | 10+ arquivos | 🔴 CRÍTICA |
| `animacao_andando.js` | ~50 | Animação de walking | nenhuma | 🟡 IMPORTANTE |
| `skillsEfeitos.js` | ~50 | Aplicar bônus de skills | skills.js | 🟡 IMPORTANTE |

### JavaScript - ENEMIES (Inimigos)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `inimigo.js` | ~100 | Criar inimigo no stage | config JSON | 🟡 IMPORTANTE |
| `inimigoMovimentacao.js` | ~600 | IA e combate | colisao, fisica, config | 🟡 IMPORTANTE |

### JavaScript - SKILLS (Habilidades)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `skills.js` | ~200 | Gerenciar árvore de skills | skillsData.json | 🟡 IMPORTANTE |

### JavaScript - VISUAL (Gráficos)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `camera.js` | ~40 | Follow de câmera | nenhuma | 🟡 IMPORTANTE |
| `cenario.js` | ~150 | Renderizar tiles | colisao.js | 🟡 IMPORTANTE |
| `grade.js` | ~50 | Grade de debug visual | nenhuma | 🟢 DEBUG |
| `efeitos.js` | ~100 | Flash, pisca, feedback | nenhuma | 🟢 BAIXA |
| `animacoesEquipamentos.js` | ~30 | Recuo de armas | nenhuma | 🟢 BAIXA |

### JavaScript - UI (Interface)
| Arquivo | Linhas | Função Primária | Depende De | 🎯 Prioridade |
|---------|--------|-----------------|-----------|--------------|
| `menu.js` | ~200 | Menu de pause | skills.js, inicializador | 🟡 IMPORTANTE |

### HTML/CSS
| Arquivo | Tipo | Função Primária |
|---------|------|-----------------|
| `index.html` | HTML | Raiz - Carrega todos os scripts |
| `style.css` | CSS | Estilos do jogo |

### JSON - Configuração
| Arquivo | Linhas | Conteúdo | Usado Por |
|---------|--------|----------|----------|
| `configuracoesGerais.json` | ~80 | Valores globais (velocidade, dano) | 90% dos módulos ⚠️ |
| `skillsData.json` | ~30 | Definição de árvore de skills | skills.js |
| `controles.json` | ~10 | Mapeamento de teclas | menu.js, (implícito) |

### JSON - Fases
| Arquivo | Linhas | Conteúdo |
|---------|--------|----------|
| `fases/fase1.json` | ~200 | Nível 1 |
| `fases/fase2.json` | ~200 | Nível 2 |
| `fases/fase3.json` | ~200 | Nível 3 |
| ... | ... | ... |
| `fases/fase9.json` | ~200 | Nível 9 |
| `fases/treino.json` | ~100 | Nível de treino |

### Editor (Isolado)
| Arquivo | Tipo | Função |
|---------|------|--------|
| `editor/editor.html` | HTML | Interface de edição |
| `editor/editor.js` | JS | Lógica de edição |
| `editor/editor.css` | CSS | Estilos do editor |

### Documentação
| Arquivo | Tipo | Conteúdo |
|---------|------|----------|
| `README_ESTACAS.md` | MD | Guia de sistema de spikes |
| `EXEMPLOS_ESTACAS.js` | JS | Exemplos de testes |
| `ANALISE_ARQUITETURA.md` | MD | **Este documento - análise completa** |
| `REORGANIZACAO_PASTAS.md` | MD | Plano de estrutura de pastas |
| `DIAGRAMA_DEPENDENCIAS.md` | MD | Diagramas visuais e fluxos |
| `documetacao/` | DIR | Docs do projeto original |

---

## 🎯 Buscar Funcionalidade Específica

### Eu quero modificar...

#### ...a física do pulo
   - **Arquivo:** `fisica.js` (forcaPulo, gravidade)
   - **Também tocar:** `configuracoesGerais.json` (inimigoForcaPulo, bonusPuloBota)
   - **Tempo:** 5 min
   - **Risco:** Médio (afeta player e inimigos)

#### ...a velocidade do jogador
   - **Arquivo:** `movimentacao.js` (velocidade base)
   - **Também tocar:** `configuracoesGerais.json` (velocidadePlayer, bonusVelocidadeBota)
   - **Tempo:** 2 min
   - **Risco:** Baixo

#### ...o comportamento dos inimigos
   - **Arquivo:** `inimigoMovimentacao.js` (lógica principal)
   - **Também tocar:** `configuracoesGerais.json` (distâncias, cooldowns)
   - **Tempo:** 15-30 min
   - **Risco:** Alto (lógica complexa)

#### ...as habilidades
   - **Arquivo:** `skills.js` (árvore) + `skillsEfeitos.js` (efeitos)
   - **Também tocar:** `skillsData.json` (definições)
   - **Tempo:** 10-20 min
   - **Risco:** Baixo (isolado)

#### ...o sistema de colisão
   - **Arquivo:** `colisao.js` (main) + `estacas.js` (spikes)
   - **Também tocar:** `configuracoesGerais.json` (hitbox dimensions)
   - **Tempo:** 30-60 min
   - **Risco:** ALTÍSSIMO (quebra tudo)

#### ...a câmera
   - **Arquivo:** `camera.js`
   - **Tempo:** 10 min
   - **Risco:** Baixo (isolado)

#### ...as animações
   - **Arquivo:** `animacao_andando.js`
   - **Tempo:** 5 min
   - **Risco:** Muito baixo

#### ...o menu
   - **Arquivo:** `menu.js`
   - **Tempo:** 10-15 min
   - **Risco:** Baixo

#### ...as cores ou estilos
   - **Arquivo:** `style.css`
   - **Tempo:** 5-10 min
   - **Risco:** Nenhum (visual apenas)

#### ...um nível específico
   - **Arquivo:** `fases/faseX.json`
   - **Ferramenta:** `editor/editor.html` (usar)
   - **Tempo:** 10-30 min
   - **Risco:** Nenhum (dados apenas)

#### ...adicionar novo item/equipamento
   - **Arquivo:** `movimentacao.js` (coleta)
   - **Também tocar:** `skillsEfeitos.js` (efeitos), `configuracoesGerais.json` (sprite)
   - **Tempo:** 30-45 min
   - **Risco:** Médio

#### ...adicionar novo tipo de inimigo
   - **Arquivo:** `inimigo.js` (criação) + `inimigoMovimentacao.js` (IA)
   - **Também tocar:** `configuracoesGerais.json`, fases JSON
   - **Tempo:** 45-60 min
   - **Risco:** Médio-Alto

---

## 🐛 Debugar Problema Específico

### O jogador estranho/tremido
   → Verificar: `fisica.js`, `colisao.js`, `movimentacao.js`
   → Usar: `grade.js` para visualizar grid

### Colisão não funcionando
   → Verificar: `colisao.js`, depois `estacas.js`
   → Config check: `configuracoesGerais.json` (HITBOX_*)
   → Usar: `grade.js` para debug visual

### Inimigo não atacando
   → Verificar: `inimigoMovimentacao.js` (distâncias, cooldowns)
   → Config check: `configuracoesGerais.json` (distancia*, cooldown*)
   → Posição player: `window.playerControle` no console

### Câmera errada
   → Verificar: `camera.js`
   → Check: `window.cameraX`, `window.cameraY` no console

### Skill não funcionando
   → Verificar: `skills.js` (carregamento) → `skillsEfeitos.js` (aplicação)
   → Config check: `skillsData.json`

### Animação errada
   → Verificar: `animacao_andando.js`
   → Config check: `configuracoesGerais.json` (sprites)

### Fase não carrega
   → Verificar: `inicializador.js` (carregarFase)
   → File check: `fases/faseX.json` existe e é válida?
   → Console: Abrir DevTools, ver erro de fetch

---

## 📊 Gráfico de Impacto de Mudanças

```
ALTO IMPACTO (Afeta múltiplos sistemas)
├─ configuracoesGerais.json (🔴 MÁXIMO)
├─ physics.js (🔴 MUITO ALTO)
├─ colisao.js (🔴 MUITO ALTO)
├─ inicializador.js (🟡 ALTO)
├─ movimentacao.js (🟡 ALTO)
└─ window.playerControle (🟡 ALTO)

MÉDIO IMPACTO
├─ inimigoMovimentacao.js
├─ skillsEfeitos.js
├─ menu.js
├─ cenario.js
└─ skills.js

BAIXO IMPACTO
├─ camera.js ✓ Pode reescrever
├─ animacao_andando.js ✓ Pode reescrever
├─ efeitos.js ✓ Pode remover
├─ grade.js ✓ Debug only
├─ inimigo.js
└─ posicionamento.js

NENHUM IMPACTO (Arquivo Único)
├─ style.css (Visual)
├─ *.json fases (Dados)
└─ editor/* (Isolado)
```

---

## 📈 Estatísticas Rápidas

### Código Organizado Por:
- **16 arquivos JS** (60% core, 40% gameplay/ui)
- **~5,000 linhas JavaScript** (estimado)
- **10 arquivos JSON** (config + fases)
- **Responsabilidade bem definida** em 90% dos módulos

### Complexidade:
- **Muito Acoplado:** configuracoesGerais.json (80 módulos dependem)
- **Core Estável:** fisica.js, colisao.js (mudanças raras)
- **Ativo:** inimigoMovimentacao.js (mudanças frequentes)

### Custo de Mudanças Típicas:
- Rebalancear game: 10-30 min (tocar JSON)
- Adicionar novo inimigo: 30-60 min
- Adicionar nova skill: 10-20 min
- Corrigir bug física: 15-45 min
- Reescrever câmera: 30-60 min

---

## ✅ Checklist Rápido Para Novo Dev

### Primeiro Setup
- [ ] Abrir `index.html` no browser
- [ ] Janela Dev Tools (F12) aberta
- [ ] Testar movimento (setas)
- [ ] Testar pulo (espaço)
- [ ] Testar chute (P)
- [ ] Completar fase

### Entender a Arquitetura
- [ ] Ler `ANALISE_ARQUITETURA.md` (10 min)
- [ ] Ler estrutura do `index.html` (5 min)
- [ ] Abrir `inicializador.js` e seguir imports (10 min)
- [ ] Entender `window.playerControle` (5 min)

### Antes de Editar Code
- [ ] Identificar qual arquivo mexer (2 min)
- [ ] Consultar tabela de dependências (1 min)
- [ ] Fazer backup (git commit) (2 min)
- [ ] Testar após cada mudança (5-10 min)

### Debugging
- [ ] Abrir DevTools Console (F12)
- [ ] Log window.playerControle
- [ ] Log window.inimigos
- [ ] Usar `grade.js` (G key) para debug visual

---

## 🎓 Recursos de Aprendizado

### Ordem de Leitura Recomendada
1. `ANALISE_ARQUITETURA.md` ← **COMECE AQUI**
2. Este documento (referência rápida)
3. `DIAGRAMA_DEPENDENCIAS.md` (visualização)
4. `REORGANIZACAO_PASTAS.md` (futuro)
5. `README_ESTACAS.md` (complexidade específica)

### Estudar Sistemas Específicos
- **Sistema de Movimento:** Ler `movimento.js` linha 1-100
- **Sistema de Colisão:** Ler `colisao.js` linhas 1-150
- **Sistema de Física:** Ler `fisica.js` (arquivo inteiro)
- **Sistema de Inimigos:** Ler `inimigoMovimentacao.js` linhas 1-200
- **Sistema de Skills:** Sequência skills.js → skillsEfeitos.js

---

## 🔗 Conexões Principais

**DIAGRAMA MENTAL:**
```
index.html
    └─ inicializador (carrega fases)
        ├─ cenario (renderiza tiles)
        └─ colisao (configura limites)

movimentacao (input jogador)
    ├─ fisica (gravidade)
    ├─ colisao (detecta colisão)
    ├─ animacao (renderiza sprite)
    └─ skillsEfeitos (aplica bônus)

inimigos (cria inimigo)
    └─ iaInimigos (faz atacar)
        ├─ colisao (detecta colisão com player)
        └─ efeitos (feedback visual)

camera (acompanha player)
menu (pausa + skills)
skills (árvore de abilities)
```

---

## Última Atualização
- **Data:** 12/04/2026
- **Versão:** v1.0
- **Analisador:** GitHub Copilot
- **Estado:** Jogo funcional, arquitetura mediamente acoplada

**Próximos Passos Recomendados:**
1. ✅ Refatorar em pastas (REORGANIZACAO_PASTAS.md)
2. ⏳ Implementar Event System
3. ⏳ Extrair Config Manager
4. ⏳ Adicionar testes unitários

