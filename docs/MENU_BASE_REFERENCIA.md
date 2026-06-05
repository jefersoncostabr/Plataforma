# Menu da Base: referência rápida

## Como o menu da base é criado

1. O ID `craft_base` é mapeado para o HTML da base em [config/interacoes/mapeamento.json](D:/Programação/Minha%20home/Jogos/Plataforma/config/interacoes/mapeamento.json#L4) e o arquivo carregado é [src/ui/interacoes/telas/base-craft.html](D:/Programação/Minha%20home/Jogos/Plataforma/config/interacoes/mapeamento.json#L6).
2. A abertura do menu acontece na função [abrirTelaInteracao](D:/Programação/Minha%20home/Jogos/Plataforma/src/core/interacao-sistema.js#L365).
3. O overlay é criado em [src/core/interacao-sistema.js](D:/Programação/Minha%20home/Jogos/Plataforma/src/core/interacao-sistema.js#L381) e recebe a classe `.interaction-overlay` em [src/core/interacao-sistema.js](D:/Programação/Minha%20home/Jogos/Plataforma/src/core/interacao-sistema.js#L382).
4. Quando o ID é `craft_base`, o HTML externo da base é injetado em [src/core/interacao-sistema.js](D:/Programação/Minha%20home/Jogos/Plataforma/src/core/interacao-sistema.js#L385).
5. Depois disso, o menu é anexado na árvore da interface em [src/core/interacao-sistema.js](D:/Programação/Minha%20home/Jogos/Plataforma/src/core/interacao-sistema.js#L936).

## Estrutura HTML do menu base

- O modal principal começa em [src/ui/interacoes/telas/base-craft.html](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/telas/base-craft.html#L1).
- O cabeçalho começa em [src/ui/interacoes/telas/base-craft.html](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/telas/base-craft.html#L2).
- O corpo do menu começa em [src/ui/interacoes/telas/base-craft.html](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/telas/base-craft.html#L24).
- O container principal do conteúdo da base (`.base-panel`) começa em [src/ui/interacoes/telas/base-craft.html](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/telas/base-craft.html#L25).

## Onde está o estilo

### Estilo principal do modal da base

- Overlay: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L1)
- Modal: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L15)
- Header: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L29)
- Body: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L97)
- Painel da base: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L101)
- Seção de modos: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L136)
- Seção de equipamento salvo: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L230)
- Ações da base: [src/ui/interacoes/base-interacao.css](D:/Programação/Minha%20home/Jogos/Plataforma/src/ui/interacoes/base-interacao.css#L354)

### Estilo complementar usado pelo menu base e pelo crafting

- Overlay complementar: [base-menu-style.css](D:/Programação/Minha%20home/Jogos/Plataforma/base-menu-style.css#L3)
- Badges de pets: [base-menu-style.css](D:/Programação/Minha%20home/Jogos/Plataforma/base-menu-style.css#L18) e [base-menu-style.css](D:/Programação/Minha%20home/Jogos/Plataforma/base-menu-style.css#L25)
- Feedback do menu: [base-menu-style.css](D:/Programação/Minha%20home/Jogos/Plataforma/base-menu-style.css#L72)
- Botão de crafting da base: [base-menu-style.css](D:/Programação/Minha%20home/Jogos/Plataforma/base-menu-style.css#L322)

## Resumo curto

O menu da base não nasce direto no HTML fixo da página. Ele é resolvido pelo ID `craft_base`, carregado por `fetch`, inserido em um `div.interaction-overlay` via JS e então anexado à raiz da interface. A estrutura visual do menu base está principalmente em `base-craft.html` + `base-interacao.css`, enquanto `base-menu-style.css` complementa pets, feedback e partes do fluxo de crafting.