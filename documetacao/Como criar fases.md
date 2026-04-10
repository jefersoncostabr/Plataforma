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
  "inimigos0": ["b6"],
  "inimigos1": ["b15"],
  "inimigos2": ["c8"],
  "inimigos3": ["b17"],
  "itens": [
    { "tipo": "jetpack", "pos": "d5" }
  ],
  "inimigoAleatorio": [2, 1]
}
```

### Detalhes das Chaves:

| Chave | Descrição |
| :--- | :--- |
| `posicaoInicialJogador` | Coordenada onde o jogador será posicionado ao iniciar ou reiniciar a fase. |
| `objetivo` | Coordenada do item de vitória (bandeira ou portal) que finaliza a fase. |
| `plataformas` | Lista de coordenadas que representam blocos sólidos no cenário. |
| `inimigos0` | Lista de coordenadas para inimigos básicos (ataque corpo a corpo, sem armas). |
| `inimigos1` | Lista de coordenadas para inimigos equipados com revólver (atiram à distância). |
| `inimigos2` | Lista de coordenadas para inimigos com escudo (mais resistentes, dropam proteção ao serem derrotados). |
| `inimigos3` | Lista de coordenadas para inimigos com botas (mais rápidos e com pulo aprimorado). |
| `inimigos4` | Lista de coordenadas para inimigos com jetpack (capazes de voar para perseguir o jogador). |
| `inimigos5` | Lista de coordenadas para o Alvo de Feno (usado para treino, reseta a posição ao ser destruído). |
| `inimigos6` | Lista de coordenadas para inimigos com garra (capazes de puxar o jogador ou itens). |
| `itens` | Lista de objetos `{ "tipo": "...", "pos": "..." }` para itens fixos no mapa. Tipos disponíveis: `"escudo"`, `"bota"`, `"revolver"`, `"jetpack"`, `"garra"`, `"restauracao"`. |
| `inimigoAleatorio` | Array `[Dificuldade, Equipamento]` para configurar o spawn de inimigos aleatórios. `Dificuldade` (1-3) afeta a frequência de spawn. `Equipamento` (0=nenhum, 1=arma, 2=escudo, 3=bota, 4=jetpack, 6=garra) define o item inicial do inimigo. |

---

## 3. Como Adicionar a Fase ao Jogo

Para que o jogo reconheça a sua nova fase, você precisa adicioná-la à lista de níveis no arquivo `inicializador.js`.

1. Abra o arquivo `inicializador.js`.
2. Localize a variável `window.niveis`.
3. Adicione o nome do seu arquivo à lista:

```javascript
window.niveis = ["fase1.json", "fase2.json", "fase3.json", "fase4.json"];
```

---

## 4. Dicas de Design

1.  **Buracos:** Para criar um buraco no cenário, simplesmente omita as coordenadas correspondentes na lista de `plataformas` (ex: pular de `a5` para `a8` cria um buraco entre `a6` e `a7`).
2.  **Posicionamento de Inimigos:** Inimigos devem ser posicionados pelo menos uma linha (letra) acima da plataforma onde se encontram (ex: inimigo em `b10` para plataforma em `a10`).
3.  **Curva de Dificuldade:** Inicie as fases com `inimigos0` e introduza gradualmente os tipos `1`, `2`, `3` e `4` à medida que o jogador se familiariza com as mecânicas.
4.  **Estratégia de Itens:** Posicione itens de forma estratégica. Por exemplo, uma `garra` pode ser útil para alcançar itens em plataformas isoladas ou puxar inimigos para longe de perigos.

---

## 5. Limites do Palco

Por padrão, o palco configurado é de **640x480 pixels**.
*   Isso corresponde a aproximadamente **20 colunas** (de 1 a 20) e **15 linhas** (de 'a' a 'o') de tiles de 32x32 pixels.
*   O jogo atualmente utiliza uma câmera estática por fase. Se o jogador se mover além dos limites visíveis, o cenário não será renderizado.
```

### Conferência rápida:
*   **Coordenadas:** Expliquei o sistema `letra + número`, que é o que as funções `gridParaPixels` e `coordenadaParaPosicao` nos seus arquivos esperam.
*   **Inimigos:** Diferenciei os tipos de 0 a 3, correspondendo às verificações que você tem no `carregarFase` do `inicializador.js`.
*   **Itens:** Incluí a sintaxe de objeto `{tipo, pos}` que o seu `resetarItens` utiliza.
*   **Registro:** Mostrei como atualizar o array `window.niveis`, que é o passo final obrigatório para a fase aparecer no jogo.

<!--
[PROMPT_SUGGESTION]Como posso criar um inimigo que dropa um item específico que não seja o que ele está usando?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Como posso aumentar o tamanho do palco (canvas) para criar fases mais longas com rolagem lateral?[/PROMPT_SUGGESTION]
