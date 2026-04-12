# 📋 Análise Completa da Arquitetura do Projeto

## 1. CATEGORIAS DE FUNCIONALIDADE

### 🎮 SISTEMA DE MOVIMENTO E FÍSICA
**Responsabilidade:** Movimentação do personagem, gravidade, pulos, colisões gerais

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `movimentacao.js` | Sistema principal de movimento do jogador | `configuracoesGerais.json`, `controles.json`, `fisica.js` |
| `fisica.js` | Gravidade e lógica de pulos | (nenhuma externa) |
| `colisao.js` | Verificação de colisões com tiles/plataformas | `estacas.js`, `fisica.js` |
| `estacas.js` | Sistema isolado de colisão com spikes | (nenhuma externa) |
| `posicionamento.js` | Posicionamento inicial do personagem | (nenhuma externa) |


### 👻 SISTEMA DE INIMIGOS
**Responsabilidade:** Criação, IA, movimentação e combate de inimigos

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `inimigo.js` | Criação e instanciação de inimigos | `colisao.js`, `configuracoesGerais.json` |
| `inimigoMovimentacao.js` | IA, perseguição e comportamento de inimigos | `configuracoesGerais.json`, `inimigo.js`, `colisao.js` |


### ⚡ SISTEMA DE HABILIDADES (SKILLS)
**Responsabilidade:** Árvore de habilidades, XP, pontos de skill

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `skills.js` | Gerenciador da árvore de skills e XP | `skillsData.json` |
| `skillsEfeitos.js` | Aplicação dos efeitos das skills adquiridas | `skills.js` |


### 🎨 SISTEMA VISUAL E ANIMAÇÕES
**Responsabilidade:** Sprites, animações, efeitos visuais

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `animacao_andando.js` | Controle de frames de animação (andar/parado/pulo) | (nenhuma externa) |
| `animacoesEquipamentos.js` | Animações de recuo de armas e equipamentos | (nenhuma externa) |
| `efeitos.js` | Efeitos visuais (flash, pisca, feedback visual) | (nenhuma externa) |


### 🎬 GESTÃO DE CENAS E FASES
**Responsabilidade:** Carregamento de fases, limpeza de cenário, renderização

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `inicializador.js` | Gerenciador central de fases e mundo | `configuracoesGerais.json`, `cenario.js`, `colisao.js` |
| `cenario.js` | Renderização de plataformas, tiles e limpeza | `colisao.js` |
| `grade.js` | Grade auxiliar visual para debug e edição | (nenhuma externa) |


### 📷 CÂMERA E VIEWPORT
**Responsabilidade:** Follow de câmera no jogador, limites de mundo

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `camera.js` | Sistema de câmera com clamping de limites | (nenhuma externa) |


### 🎛️ MENU E INTERFACE
**Responsabilidade:** Menu de pausa, seleção de skills, navegação

| Arquivo | Descrição | Dependências |
|---------|-----------|--------------|
| `menu.js` | Menu de pause e interface principal | `skills.js`, `inicializador.js` |


### 🛠️ SISTEMA DE EDITOR (Isolado)
**Responsabilidade:** Ferramenta de edição de fases

| Arquivo | Descrição | Localização | Dependências |
|---------|-----------|------------|--------------|
| `editor.js` | Lógica do editor de fases | `editor/` | `controles.json` |
| `editor.html` | Interface visual do editor | `editor/` | (nenhuma) |
| `editor.css` | Estilos do editor | `editor/` | (nenhuma) |


---

## 2. MAPA COMPLETO DE DEPENDÊNCIAS

### Dependências Entrada/Saída

```
index.html (RAIZ)
    ├── style.css (gráficos)
    ├── inicializador.js (ORQUESTRADOR CENTRAL)
    │   ├── configuracoesGerais.json
    │   ├── cenario.js
    │   │   ├── colisao.js
    │   │   │   ├── estacas.js
    │   │   │   └── fisica.js
    │   │   └── posicionamento.js
    │   ├── fases/*.json (dados de níveis)
    │   └── camera.js
    │
    ├── movimentacao.js (JOGADOR)
    │   ├── configuracoesGerais.json
    │   ├── controles.json
    │   ├── fisica.js
    │   ├── colisao.js
    │   ├── animacao_andando.js
    │   ├── efeitos.js
    │   └── skillsEfeitos.js
    │
    ├── inimigo.js (INIMIGOS)
    │   ├── configuracoesGerais.json
    │   ├── colisao.js
    │   └── animacao_andando.js
    │
    ├── inimigoMovimentacao.js (IA)
    │   ├── configuracoesGerais.json
    │   ├── inimigo.js
    │   ├── colisao.js
    │   ├── efeitos.js
    │   └── animacao_andando.js
    │
    ├── skills.js (HABILIDADES)
    │   └── skillsData.json
    │
    ├── skillsEfeitos.js (APLICAR SKILLS)
    │   ├── skills.js
    │   └── configuracoesGerais.json
    │
    ├── menu.js (INTERFACE)
    │   ├── skills.js
    │   ├── inicializador.js
    │   └── controles.json
    │
    ├── animacao_andando.js (ANIMAÇÕES)
    │
    ├── animacoesEquipamentos.js (EQUIPAMENTOS)
    │
    ├── efeitos.js (EFEITOS VISUAIS)
    │
    ├── grade.js (DEBUG)
    │
    ├── camera.js (CÂMERA)
    │
    ├── controles.json (MAPEAMENTO DE TECLAS)
    │
    └── configuracoesGerais.json (CONFIG GLOBAL)

editor/ (ISOLADO)
    ├── editor.html
    ├── editor.css
    └── editor.js
```

### Matriz de Dependências

| Módulo | Depende De | É Usado Por |
|--------|-----------|-----------|
| `inicializador.js` | cenario, colisao, configuracoesGerais, fases | menu, principal |
| `movimentacao.js` | fisica, colisao, animacao_andando, efeitos, skilsEfeitos, config | loop principal |
| `colisao.js` | estacas, fisica | movimentacao, inimigo, inimigoMov |
| `inimigo.js` | colisao, config | inimigoMov, loop principal |
| `inimigoMovimentacao.js` | inimigo, colisao, efeitos, config | loop principal |
| `skills.js` | skillsData | skillsEfeitos, menu |
| `skillsEfeitos.js` | skills, config | movimentacao |
| `camera.js` | (nenhum) | loop principal |
| `menu.js` | skills, inicializador, controles | interface |
| `cenario.js` | colisao, posicionamento | inicializador |
| `animacao_andando.js` | (nenhum) | movimentacao, inimigo |
| `animacoesEquipamentos.js` | (nenhum) | (não usado ativamente) |
| `efeitos.js` | (nenhum) | movimentacao, inimigoMov |
| `estacas.js` | (nenhum) | colisao |
| `grade.js` | (nenhum) | controle manual |
| `fisica.js` | (nenhum) | movimentacao, colisao |
| `posicionamento.js` | (nenhum) | cenario |


---

## 3. CONFIGURAÇÕES E DADOS

### Arquivos JSON

| Arquivo | Conteúdo | Usado Por | Tamanho Aprox |
|---------|----------|----------|---------------|
| `configuracoesGerais.json` | Valores globais (velocidade, dano, knockback, sprites) | 90% dos módulos | ~2.5KB |
| `skillsData.json` | Árvore de habilidades e stats iniciais | skills.js | ~0.5KB |
| `controles.json` | Mapeamento de teclas | movimentacao, menu | ~0.3KB |
| `fases/*.json` (9 arquivos) | Definição de cada nível (tiles, inimigos, itens) | inicializador | ~50-150KB total |

**Padrão de Fases JSON:**
```json
{
  "proporcao": "1x1",
  "posicaoInicialJogador": "b2",
  "objetivo": "f19",
  "plataformas": ["a1", "a2", ...],
  "plataformasNeve": [...],
  "plataformasEstaca[Sup|Dir|Esq|Baixo]": [...],
  "inimigos0": [{"coord": "c5", "direcao": "d", "tipo": 1}, ...],
  "itens": [...]
}
```


---

## 4. UTILITÁRIOS E HELPERS

### Funções Globais/Utilitárias

| Função | Arquivo | Tipo | Descrição |
|--------|---------|------|-----------|
| `aplicarFisica()` | fisica.js | Physics | Aplica gravidade e processa pulos |
| `limitarPosicaoAoPalco()` | colisao.js | Bounds | Garante objeto dentro dos limites |
| `verificarColisaoComTiles()` | colisao.js | Collision | Verifica colisão com plataformas |
| `verificarColisaoEstaca()` | estacas.js | Collision | Verifica colisão com spikes |
| `calcularCoordenadosEstaca()` | estacas.js | Math | Calcula zona colisível de estacas |
| `renderizarChao()` | cenario.js | Render | Renderiza tiles de chão |
| `limparCenario()` | cenario.js | Cleanup | Remove todos os elementos de cena |
| `renderizarPlataformas()` | cenario.js | Render | Renderiza plataformas |
| `atualizarAnimacao()` | animacao_andando.js | Animation | Controla frames de animação |
| `flashElement()` | efeitos.js | Visual | Cria efeito de flash em elemento |
| `configurarGrade()` | grade.js | Debug | Cria grade visual auxiliar |
| `atualizarCamera()` | camera.js | Camera | Atualiza posição e clamping |
| `resetarCamera()` | camera.js | Camera | Reseta câmera à origem |
| `configurarPosicaoInicial()` | posicionamento.js | Init | Define posição inicial |
| `criarInimigo()` | inimigo.js | Creation | Cria inimigo no stage |
| `iniciarIAInimigos()` | inimigoMovimentacao.js | AI | Inicia loop de IA de inimigos |
| `ganharXP()` | skills.js | Gameplay | Adiciona XP ao jogador |
| `carregarDadosSkills()` | skills.js | Data | Carrega tree de skills |
| `aplicarEfeitosSkills()` | skillsEfeitos.js | Gameplay | Aplica bônus das skills |


### Constantes Globais Importantes

```javascript
window.playerControle       // Estado do jogador
window.inimigos             // Array de inimigos ativos
window.plataformas          // Mapa de tiles colidíveis
window.projeteis            // Array de projéteis
window.itensColetaveis      // Array de itens
window.playerSkills         // Array de skills adquiridas
window.playerXP             // Total de XP
window.skillPoints          // Pontos disponíveis
window.cameraX/Y            // Posição da câmera
window.mundoLargura/Altura  // Dimensões atuais do mundo
window.nivelAtual           // Índice da fase
window.isMenuOpen           // Menu de pause aberto
window.isSkillMenuOpen      // Menu de skills aberto
```


---

## 5. SISTEMAS VISUAIS

### Animações

| Sistema | Arquivo | Tipo | Descrição |
|---------|---------|------|-----------|
| Walk cycle | `animacao_andando.js` | Sprite flip | Alterna entre 2 frames a cada 10 quadros |
| Jump sprite | `animacao_andando.js` | State-based | Mostra sprite específico no ar |
| Recoil | `animacoesEquipamentos.js` | Transform | Inclina arma ao disparar |
| Flash damage | `efeitos.js` | Filter | Brightness() effect em 200ms |
| Shield blink | `efeitos.js` | Filter | Pisca em loop até regenerar |

### Efeitos Visuais

| Efeito | Arquivo | Implementação |
|--------|---------|---------------|
| Flash de impacto | efeitos.js | `filter: brightness()` |
| Pisca de dano | efeitos.js | `setInterval()` + filter |
| Grid de debug | grade.js | `backgroundImage: linear-gradient` |
| Câmera follow | camera.js | `transform: translate()` |


---

## 6. MÓDULOS DO EDITOR

### Estrutura Do Editor (Isolado)

```
editor/
├── editor.html
│   ├── Paleta de blocos
│   ├── Canvas de edição
│   ├── Exportar/Importar JSON
│   └── Controles de proporção
├── editor.js
│   ├── Renderização da grade
│   ├── Seleção de blocos
│   ├── Colocação de objetos
│   ├── Export para JSON
│   ├── Import de JSON existente
│   └── Sistema de configuração de proporção
└── editor.css
    ├── Interface responsiva
    ├── Estilos da paleta
    └── Estilos do canvas
```

**Dados do Editor:**
```javascript
faseData = {
  proporcao: "1x1",
  posicaoInicialJogador: "b2",
  objetivo: "f19",
  plataformas: [],           // Blocos sólidos padrão
  plataformasNeve: [],       // Blocos de neve
  plataformasEstacaSup: [],  // Spikes apontando para cima
  plataformasEstacaDir: [],  // Spikes apontando para direita
  plataformasEstacaEsq: [],  // Spikes apontando para esquerda
  plataformasEstacaBaixo: [], // Spikes apontando para baixo
  inimigos0: [],             // Inimigos tipo 0 (tipo 0 = melee)
  inimigos1: [],             // Inimigos tipo 1 (tipo 1 = revolver)
  // ... inimigos2-6
  itens: [],
  inimigoAleatorio: [1, 0]
}
```

---

## 7. SUGESTÕES DE REORGANIZAÇÃO EM PASTAS

### Estrutura Proposta

```
/Plataforma (raiz)
│
├── /core (LÓGICA FUNDAMENTAL)
│   ├── inicializador.js (orquestrador)
│   ├── colisao.js
│   ├── estacas.js
│   ├── fisica.js
│   └── posicionamento.js
│
├── /player (SISTEMA DO JOGADOR)
│   ├── movimentacao.js
│   ├── animacao_andando.js
│   └── skillsEfeitos.js
│
├── /inimigos (SISTEMA DE INIMIGOS)
│   ├── inimigo.js
│   └── inimigoMovimentacao.js
│
├── /skills (ÁRVORE DE HABILIDADES)
│   ├── skills.js
│   ├── skillsData.json
│   └── skillsEfeitos.js (ou ficar em /player)
│
├── /visual (RENDERIZAÇÃO E EFEITOS)
│   ├── cenario.js
│   ├── camera.js
│   ├── grade.js
│   ├── efeitos.js
│   ├── animacoesEquipamentos.js
│   └── style.css
│
├── /ui (INTERFACE DO USUÁRIO)
│   ├── menu.js
│   └── index.html
│
├── /config (DADOS E CONFIGURAÇÕES)
│   ├── configuracoesGerais.json
│   ├── controles.json
│   ├── skillsData.json
│   └── fases/
│       ├── fase1.json
│       ├── fase2.json
│       └── ... fase9.json
│
├── /editor (FERRAMENTA DE EDIÇÃO - ISOLADO)
│   ├── editor.html
│   ├── editor.js
│   └── editor.css
│
├── /personagem (ASSETS COMPARTILHADOS)
│   ├── Personagem_parado.png
│   ├── Personagem_andando.png
│   ├── revolver.png
│   ├── bota_pegavel.png
│   └── ... outros sprites
│
├── /documentacao (DOCS - JÁ OGANIZADO)
│   ├── GDD.md
│   ├── Como criar fases.md
│   └── ... outros docs
│
├── README_ESTACAS.md
├── EXEMPLOS_ESTACAS.js
└── ANALISE_ARQUITETURA.md (este arquivo)
```

### Benefícios da Reorganização

✅ **Clareza:** Módulos agrupados por funcionalidade
✅ **Manutenibilidade:** Fácil encontrar code relacionado
✅ **Escalabilidade:** Padrão bem definido para novos módulos
✅ **Separação de Responsabilidades:** Core, Player, Inimigos, Skills bem delimitados
✅ **Isolamento:** Editor totalmente separado (pode virar ferramenta externa)


---

## 8. CICLO DE VIDA E FLUXO PRINCIPAL

```
1. Usuário abre index.html
   ↓
2. index.html carrega todos os scripts (orquestração implícita)
   ↓
3. inicializador.js
   - Define window.niveis
   - Prepara sistema
   ↓
4. movimentacao.js
   - iniciarMovimentacao()
   - Carrega configurações
   - Inicia listeners de teclado
   ↓
5. Loop Principal (requestAnimationFrame)
   ├─ Atualizar posição do jogador
   ├─ Verificar colisões
   ├─ Atualizar IA de inimigos
   ├─ Atualizar câmera
   ├─ Renderizar animações
   └─ Verificar condições de vitória/derrota
   ↓
6. Se fase concluída
   - carregarFase() → reiniciar ciclo
```


---

## 9. ANÁLISE DE ACOPLAMENTO

### Módulos de Alto Acoplamento (Precisam estar próximos)
- `movimentacao.js` ↔ `colisao.js` ↔ `fisica.js`
- `inimigo.js` ↔ `inimigoMovimentacao.js`
- `skills.js` ↔ `skillsEfeitos.js`

### Módulos de Baixo Acoplamento (Independentes)
- `efeitos.js` (pode ser usado em qualquer módulo)
- `grade.js` (apenas debug)
- `camera.js` (pode ser substituído completamente)
- `animacoesEquipamentos.js` (não integrado ainda)

### Pontos de Fragilidade
⚠️ `configuracoesGerais.json` - Usado por TUDO (80% dos módulos)
⚠️ `inicializador.js` - Orquestra múltiplas dependências
⚠️ `window.playerControle` - Estado global compartilhado

---

## 10. ESTATÍSTICAS DO PROJETO

| Métrica | Valor |
|---------|-------|
| Arquivos JS principais | 16 |
| Arquivos JSON | 12 |
| Módulos de core | 5 |
| Módulos de game logic | 6 |
| Módulos de UI/Visual | 7 |
| Linhas de código (aprox) | 4,000-5,000 |
| Complexidade ciclomática | Média-Alta |
| Fatores de risco | Acoplamento com estado global |

