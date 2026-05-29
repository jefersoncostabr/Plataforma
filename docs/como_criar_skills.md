# Guia de Configuração de Habilidades (skills-dados.json)

Este documento explica como configurar o arquivo de habilidades, que controla o progresso do jogador e a estrutura visual da árvore de habilidades. O posicionamento dos botões no menu de habilidades é automático, baseado na hierarquia definida.

## Sumário

1.  Estrutura de Atributos (`playerStats`)
2.  Definição de Habilidades (`skills`)
    *   Campos por Skill
3.  Registro no Enum JavaScript (`src/skills/skills.js`)
4.  Lógica de Posicionamento Automático
5.  Exemplo Prático
6.  Vinculando Efeitos e Depuração

---

## 1. Estrutura de Atributos (`playerStats`)

| Campo | Descrição |
| :--- | :--- |
| `xp` | Experiência inicial do jogador. |
| `skillPoints` | Quantidade de pontos disponíveis para gastar ao iniciar. |
| `acquired` | Lista com os nomes explícitos das habilidades que o jogador já possui ao começar. |
 
## 2. Definição de Habilidades (`skills`)

Cada entrada dentro do objeto skills representa um nó na árvore.

### Formato por Skill:
*   A chave é o nome explícito da habilidade.
*   O valor é o nome da habilidade pai.
*   Use null para uma habilidade raiz.

---

Você não precisa definir coordenadas X e Y. O motor de jogo calcula a posição da seguinte forma:

1.  **Altura (Eixo Y):** Definida pela profundidade na árvore. A raiz (`parent: null`) fica no topo. Habilidades filhas ficam na linha de baixo.
2.  **Largura (Eixo X):** O jogo agrupa todas as habilidades do mesmo nível e as distribui igualmente pela largura do menu.
3.  **Ordem:** A ordem da esquerda para a direita é definida pela ordem alfabética dos nomes das skills.
    *   Exemplo: Airdrop ficará à esquerda de Vender.

---

```skills-dadosjson
{
    "playerStats": {
        "xp": 0,
        "skillPoints": 0,
        "acquired": ["Vida"]
    },
    "skills": {
        "Vida": null,
        "Atirador": null,
        "kickboxing": "Atirador",
        "Dropar": "Vida",
        "Visão": "Vida",
        "Airdrop": "Dropar"
    }
}
```

## 5. Vinculando Efeitos

Para que uma skill tenha um efeito real no jogo, você deve adicionar a verificação do nome dela no sistema de efeitos e nos pontos do gameplay que dependem dessa habilidade.

*   Vida: aumenta maxVida em +1.
*   Dropar: habilita o comando de drop de item.

---

## Observação importante (debug de skill que não aparece no menu)

O **menu de skills** é montado a partir do conteúdo de `config/skills-dados.json` (objeto `skills`).

Se você criar/implementar um efeito no código (ex: em `src/jogador/skills-efeitos.js` ou no gameplay), mas a skill **não aparecer no menu**, a causa mais comum é: **a skill não existe como nó em `skills` no JSON**.

Exemplo real: a skill **Slide** tem lógica no gameplay (`src/jogador/movimento.js`), porém **não aparecia no menu** porque não estava cadastrada em `config/skills-dados.json`.
