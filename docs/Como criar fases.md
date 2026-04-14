# Guia de Criação de Fases

Este documento detalha a estrutura dos arquivos `.json` utilizados para criar as fases do jogo, permitindo a criação de novos desafios e cenários.

## Sumário

1.  O Sistema de Coordenadas (Grid)
2.  Estrutura do Arquivo JSON
    *   Detalhes das Chaves
3.  Como Adicionar a Fase ao Jogo
4.  Dicas de Design
5.  Limites do Palco


## 1. O Sistema de Coordenadas (Grid)

O jogo utiliza um sistema de coordenadas baseado em letras (linhas) e números (colunas). Cada "tile" ou bloco tem **32x32 pixels**.

*   **Letras (Eixo Y):** 'a' é o chão (base), 'b' é a linha acima, e assim por diante.
*   **Números (Eixo X):** 1 é o canto esquerdo, 2 é o próximo bloco à direita, etc.

**Exemplos:**
*   `a1`: Canto inferior esquerdo do palco.
*   `c10`: Terceira linha de altura, décima coluna de largura.

---

## 2. Estrutura do Arquivo JSON

Crie um novo arquivo (ex: `fase4.json`) com a seguinte estrutura:

```json
{
  "posicaoInicialJogador": "b2",
  "objetivo": "c18",
  "plataformas": [
    "a1", "a2", "a3", "b5", "b6", "c8", "a15", "a16", "a17", "a18", "a19", "a20"
  ],
  "inimigos0": [
    { "coord": "b6", "direcao": "d", "tipo": 0 }
  ],
  "inimigos1": [
    { "coord": "b15", "direcao": "e", "tipo": 1 }
  ],
  "itens": [
    { "tipo": "cinto", "pos": "b10" }
  ]
}
```

### Detalhes das Chaves Disponíveis:

| Chave | Descrição | Exemplo |
| :--- | :--- | :--- |
| `posicaoInicialJogador` | Coordenada onde o jogador inicia a fase | `"b2"` |
| `objetivo` | Coordenada do item de vitória que finaliza a fase | `"c18"` |
| `plataformas` | Lista de coordenadas de blocos sólidos | `["a1", "a2", "b5", "b6"]` |
| `inimigos0` | Lista de inimigos tipo 0 (básico, comportamento simples) | `[{"coord": "b6", "direcao": "d", "tipo": 0}]` |
| `inimigos1` | Lista de inimigos tipo 1 (comportamento intermediário) | `[{"coord": "b15", "direcao": "e", "tipo": 1}]` |
| `inimigos7` | Lista de inimigos equipados com Cinto | `[{"coord": "c10", "direcao": "e", "tipo": 7}]` |
| `itens` | Lista de itens coletáveis (revolver, escudo, bota, jetpack, garra, cinto) | `[{"tipo": "cinto", "pos": "b5"}]` |

#### Campo de Inimigo (Objeto)
```json
{
  "coord": "b6",        // Coordenada de spawn
  "direcao": "d",       // Direção inicial: "d"=direita, "e"=esquerda
  "tipo": 0             // 0=básico, 1=revólver, 2=escudo, 3=bota, 4=jetpack, 6=garra, 7=cinto
}
```

---

## 3. Como Adicionar a Fase ao Jogo

Para que o jogo reconheça a sua nova fase, você precisa adicioná-la ao arquivo de fases em `config/fases/`.

1. Crie o arquivo `faseX.json` em `config/fases/`
2. O jogo carrega automaticamente todas as fases na ordem alfabética
3. Use o Debug Key (4) para pular entre fases

**Nota:** O arquivo `src/core/inicial.js` carrega as fases dinamicamente do diretório `config/fases/`.

---

## 4. Dicas de Design

1. **Buracos:** Para criar um buraco no cenário, simplesmente omita as coordenadas correspondentes na lista de `plataformas` (ex: pular de `a5` para `a8` cria um buraco entre `a6` e `a7`).
2. **Posicionamento de Inimigos:** Inimigos devem ser posicionados pelo menos uma linha (letra) acima da plataforma onde se encontram (ex: inimigo em `b10` para plataforma em `a10`).
3. **Curva de Dificuldade:** Comece com `inimigos0` e introduza gradualmente `inimigos1` à medida que o jogador se familiariza com as mecânicas.

---

## 5. Visão Geral do Sistema de Coordenadas

O palco padrão é **640x480 pixels**.
- Corresponde a aproximadamente **20 colunas** (1 a 20) e **15 linhas** (a a o) de tiles 32x32px
- **Fases dinâmicas:** Você pode criar fases maiores definindo a propriedade `proporcao` no JSON (ex: `"proporcao": "2x2"` para 1280x960px)
- A **câmera inteligente** ajusta automaticamente: em fases pequenas, fica fixa; em fases grandes, segue o jogador```

### Conferência rápida:
*   **Coordenadas:** Expliquei o sistema `letra + número`, que é o que as funções `gridParaPixels` e `coordenadaParaPosicao` nos seus arquivos esperam.
*   **Inimigos:** Diferenciei os tipos de 0 a 3, correspondendo às verificações que você tem no `carregarFase` do `inicializador.js`.
*   **Itens:** Incluí a sintaxe de objeto `{tipo, pos}` que o seu `resetarItens` utiliza.
*   **Registro:** Mostrei como atualizar o array `window.niveis`, que é o passo final obrigatório para a fase aparecer no jogo.

<!--
[PROMPT_SUGGESTION]Como posso criar um inimigo que dropa um item específico que não seja o que ele está usando?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Como posso aumentar o tamanho do palco (canvas) para criar fases mais longas com rolagem lateral?[/PROMPT_SUGGESTION]
