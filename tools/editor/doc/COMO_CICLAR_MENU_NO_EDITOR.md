# Como funciona o ciclo (“clique cicla”) no Editor de Fases

## Objetivo
Ao clicar em um único controle do menu (ex.: “Bloco (ciclo)”), o editor deve alternar entre um conjunto de opções **sem precisar listar todas** na paleta.

Exemplo solicitado: ciclo dos blocos
1. `terra_horizontal.png`
2. `terra_canto.pnr` (observação: parece ter um erro no nome; o arquivo do projeto é `terra_canto.png`)
3. `terra_canto_minimo.png`
4. `terra_canto.png`

## Mecânica (conceito)
- Existe uma lista `cycleList` com as opções.
- O editor mantém um estado simples:
  - `cycleIndex`: qual opção está “ativa” no momento.
- No clique do controle do menu:
  - `cycleIndex = (cycleIndex + 1) % cycleList.length`
  - atualiza o “valor selecionado” usado pelo editor ao adicionar no palco.

## Onde isso entra no código (escopo restrito)
- UI/Paleta: `tools/editor/editor-ui.js`
- Controlador de clique do palco e inserção: `tools/editor/editor.js` (não deve mudar a regra de inserção)

## Contrato com o editor.js
- A UI deve chamar `setItemSelecionado(type)`.
- O editor.js continuará com:
  - `adicionarElemento(coord)` usando o `itemSelecionado` atual.

## Recomendação de implementação simples (sem duplicidade)
1. Criar um helper único dentro do editor-ui:
   - `criarCiclo({ container, items, initialIndex, onSelect })`
2. O helper é responsável por:
   - renderizar uma imagem/label do item atual
   - no clique, avançar o índice e chamar `onSelect(current.type)`
3. Para o ciclo solicitado, montar `items` como:
   - `[{ type, imgSrc, label }, ...]`

## Observação importante sobre nomes de arquivo
No seu pedido consta `terra_canto.pnr`, porém o projeto contém `assets/bloco terra/terra_canto.png`.

Para evitar bugs de caminho, use sempre o nome **exato** do arquivo existente:
- `assets/bloco terra/terra_horizontal.png`
- `assets/bloco terra/terra_canto.png`
- `assets/bloco terra/terra_canto_minimo.png`

## Critérios de sucesso
- Clique no controle: alterna a opção.
- Inserir no palco: usa sempre a opção atualmente ativa.
- Não quebra o menu de itens, inimigos e sistema.

