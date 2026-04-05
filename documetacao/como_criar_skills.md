Guia de Configuração de Habilidades (`skillsData.json`)

Este arquivo controla o progresso do jogador e a estrutura visual da árvore de habilidades. O posicionamento dos botões na tela é **automático** baseado na hierarquia definida.

## 1. Estrutura de Atributos (`playerStats`)

| Campo | Descrição |
| :--- | :--- |
| `xp` | Experiência inicial do jogador. |
| `skillPoints` | Quantidade de pontos disponíveis para gastar ao iniciar. |
| `acquired` | Lista de IDs de habilidades que o jogador já possui ao começar. |

## 2. Definição de Habilidades (`skills`)

Cada entrada dentro do objeto `skills` representa um nó na árvore.

### Campos por Skill:
*   **ID (Chave):** Identificador único (ex: `skill1`, `skilla`).
*   **`nome`:** O texto que aparecerá dentro do botão no menu.
*   **`parent`:** O ID da habilidade anterior necessária. Use `null` para a habilidade raiz (base).

## 3. Lógica de Posicionamento Automático

Você não precisa definir coordenadas X e Y. O motor de jogo calcula a posição da seguinte forma:

1.  **Altura (Eixo Y):** Definida pela profundidade na árvore. A raiz (`parent: null`) fica no topo. Habilidades filhas ficam na linha de baixo.
2.  **Largura (Eixo X):** O jogo agrupa todas as habilidades do mesmo nível e as distribui igualmente pela largura do menu.
3.  **Ordem:** A ordem da esquerda para a direita é definida pela ordem alfabética dos IDs.
    *   Exemplo: `skilla` ficará à esquerda de `skillb`.

## 4. Exemplo Prático

```json
{
    "playerStats": {
        "xp": 0,
        "skillPoints": 0,
        "acquired": ["skill1"]
    },
    "skills": {
        "skill1": { "nome": "Vida", "parent": null },
        "skilla": { "nome": "Ataque", "parent": "skill1" },
        "skillb": { "nome": "Velocidade", "parent": "skill1" },
        "skilla2": { "nome": "Impacto", "parent": "skilla" }
    }
}
```

## 5. Vinculando Efeitos

Para que uma skill tenha um efeito real no jogo (ex: aumentar vida), você deve adicionar o ID dela no arquivo `skillsEfeitos.js` dentro da função `switch`.

*   **skill1:** Aumenta `maxVida` em +1.
*   **skilla:** Habilita o comando de **Drop de Item**.

---