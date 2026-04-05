# Guia de Criação de Fases

As fases do jogo são armazenadas em arquivos `.json` na pasta raiz do projeto. Este documento explica como estruturar esses arquivos para criar novos desafios.

## 1. O Sistema de Coordenadas (Grid)

O jogo utiliza um sistema de coordenadas baseado em letras (linhas) e números (colunas). Cada "tile" ou bloco tem **32x32 pixels**.

*   **Letras (Eixo Y):** 'a' é o chão (base), 'b' é a linha acima, e assim por diante.
*   **Números (Eixo X):** 1 é o canto esquerdo, 2 é o próximo bloco à direita, etc.

**Exemplos:**
*   `a1`: Canto inferior esquerdo.
*   `c10`: Terceira linha de altura, décima coluna de largura.

---

## 2. Estrutura do Arquivo JSON

Crie um novo arquivo (ex: `fase4.json`) com a seguinte estrutura:

```json
{
  "posicaoInicialJogador": "b2",
  "objetivo": "c18",
  "plataformas": [
    "a1", "a2", "a3", "b5", "b6", "c8", "a15", "a16", "a17", "a18"
  ],
  "inimigos0": ["b6"],
  "inimigos1": ["b15"],
  "inimigos2": ["c8"],
  "inimigos3": ["b17"],
  "itens": [
    { "tipo": "escudo", "pos": "d5" }
  ],
  "inimigoAleatorio": [2, 1]
}
```

### Detalhes das Chaves:

| Chave | Descrição |
| :--- | :--- |
| `posicaoInicialJogador` | Onde o personagem aparece ao iniciar ou resetar a fase. |
| `objetivo` | A coordenada do item de vitória (bandeira/portal). |
| `plataformas` | Lista de todas as coordenadas que terão blocos sólidos. |
| `inimigos0` | Inimigos básicos (melee/sem arma). |
| `inimigos1` | Inimigos com Revólver (Atiram à distância). |
| `inimigos2` | Inimigos com Escudo (Mais resistentes e dropam proteção). |
| `inimigos3` | Inimigos com Botas (mais rápidos e pulam mais). |
| `itens` | Itens espalhados no mapa. Tipos: `"escudo"`, `"bota"`, `"revolver"`. |
| `inimigoAleatorio` | Configuração: `[Dificuldade (1-3), Equipamento (0=nenhum, 1=arma, 2=escudo)]`. |

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

1.  **Buracos:** Para criar um buraco onde o jogador pode cair, basta deixar um espaço vazio na lista de `plataformas` (ex: pular de `a5` direto para `a8`).
2.  **Altura dos Inimigos:** Tente sempre colocar os inimigos pelo menos uma letra acima da plataforma onde eles devem ficar (ex: se a plataforma está em `a10`, coloque o inimigo em `b10`).
3.  **Progressão:** Comece as fases com `inimigos0` e vá introduzindo os tipos `1`, `2` e `3` conforme o jogador aprende as mecânicas.
4.  **Itens Estratégicos:** Se você colocar um `inimigo2` (escudo), considere colocar um item de `bota` antes para ajudar o jogador a dar o dash e contornar o escudo.

---

## 5. Limites do Palco

Por padrão, o palco configurado é de **640x480 pixels**.
*   Isso significa que você tem aproximadamente **20 colunas** (1 a 20) e **15 linhas** (a a o) para trabalhar por tela. 
*   Se o jogador passar do limite da tela, ele ainda poderá andar, mas você não verá o cenário a menos que implemente uma câmera (atualmente o jogo é de tela estática por fase).
```

### Conferência rápida:
*   **Coordenadas:** Expliquei o sistema `letra + número`, que é o que as funções `gridParaPixels` e `coordenadaParaPosicao` nos seus arquivos esperam.
*   **Inimigos:** Diferenciei os tipos de 0 a 3, correspondendo às verificações que você tem no `carregarFase` do `inicializador.js`.
*   **Itens:** Incluí a sintaxe de objeto `{tipo, pos}` que o seu `resetarItens` utiliza.
*   **Registro:** Mostrei como atualizar o array `window.niveis`, que é o passo final obrigatório para a fase aparecer no jogo.

<!--
[PROMPT_SUGGESTION]Como posso criar um inimigo que dropa um item específico que não seja o que ele está usando?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Como posso aumentar o tamanho do palco (canvas) para criar fases mais longas com rolagem lateral?[/PROMPT_SUGGESTION]
