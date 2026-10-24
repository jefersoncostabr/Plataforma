# Sistema de Crafting — Como funciona

> **Em 30 segundos:** Crafting = criar itens com materiais. Acesse com E (agachado) perto de `craft_base`. Receitas em `config/interacoes/mapeamento.json`. Níveis de crafting desbloqueiam mais opções.

## Visão Geral

O sistema de crafting permite criar itens e equipamentos usando materiais coletados. A base de crafting pode ser upada para desbloquear mais receitas e funcionalidades.

## Arquivos Principais

| Arquivo | Responsabilidade |
|---|---|
| `src/jogador/crafting.js` | Lógica de crafting, níveis, receitas |
| `src/core/interacao-sistema.js` | Abertura do menu de crafting |
| `src/ui/interacoes/telas/base-craft.html` | HTML do menu de crafting |
| `src/ui/interacoes/base-interacao.css` | Estilos do menu |
| `config/interacoes/mapeamento.json` | Mapeamento de interações |

## Estrutura do Menu

1. ID `craft_base` → mapeado em `config/interacoes/mapeamento.json`
2. HTML carregado via fetch de `src/ui/interacoes/telas/base-craft.html`
3. Injetado em `div.interaction-overlay` via `interacao-sistema.js`
4. Estilizado por `base-interacao.css` + `base-menu-style.css`

## Níveis de Crafting

| Nível | Desbloqueio |
|---|---|
| 1 | Receitas básicas |
| 2 | Receitas avançadas + modo renascimento "memória" |
| 3 | Modo renascimento "spawnpoint" |
| 4 | Ambos os modos de renascimento |

## Modos de Renascimento

- **spawnpoint**: Ressurge no ponto de spawn da fase
- **memória**: Mantém equipamentos ao renascer
- **ambos**: Ambos os modos (requer nível 4)

## Receitas

As receitas são definidas em `config/interacoes/mapeamento.json`. Cada receita especifica:
- Materiais necessários
- Item resultante
- Nível de crafting mínimo

## Persistência

- Estado do crafting salvo em `plataformaCraftPersistente_slotX`
- Inclui nível atual, receitas desbloqueadas e preferências

## Integração com o Jogo

1. Jogador se aproxima de `craft_base`
2. Pressiona E (interagir)
3. Menu de crafting abre
4. Jogador seleciona receita e clica para craftar
5. Item é adicionado ao inventário

## Debug

- **Tecla 2**: Reseta equipamentos e estado da armadura
- Use `window.craftingSystem` para acessar a instância ativa