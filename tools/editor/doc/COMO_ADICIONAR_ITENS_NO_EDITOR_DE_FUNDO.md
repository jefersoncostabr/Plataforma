# Como Adicionar Itens no Editor de Fundo

Este guia mostra como incluir novos sprites no editor de fundo e como posicionar esses itens em uma fase.

## Resumo reducionista

        *editor-save-server.js
const canonizarSpriteFundo = (arquivoRelativo = '') => {
            return String(arquivoRelativo || '').replace(/fundo_irregular_verticall\.png$/i, 'fundo_irregular_vertical.png');
        };

        const sprites = [...new Set(arquivos.map(canonizarSpriteFundo))]

*editor-utils.js
    function canonizarIdSpriteFundo(idSprite = '') {
        return String(idSprite || '').trim().replace(/\\/g, '/').replace(/fundo_irregular_verticall\.png$/i, 'fundo_irregular_vertical.png');
    }

*editor-render.js
const sprite = (window.EditorUtils?.canonizarIdSpriteFundo || ((valor) => String(valor || '').trim().replace(/\\/g, '/')))(entrada.idSprite || entrada.sprite || entrada.src || '');
         
*editor-fundo.js
const canonizarIdSpriteFundo = window.EditorUtils?.canonizarIdSpriteFundo || ((valor) => String(valor || '').trim().replace(/\\/g, '/'));

*cenario.js
 const normalizado = bruto.replace(/\\/g, '/').replace(/fundo_irregular_verticall\.png$/i, 'fundo_irregular_vertical.png');

## Objetivo
- Editar apenas o campo `fundoFrente` da fase.
- Usar sprites da pasta `assets/fundo`.
- Manter blocos com fisica e entidades sem alteracao.

## 1) Adicionar arquivos de sprite
1. Coloque o arquivo de imagem em `assets/fundo`.
2. Pode usar subpastas dentro de `assets/fundo` (exemplo: `assets/fundo/arvores/arvore_01.png`).
3. Formatos aceitos: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`.

Dicas:
- Prefira `png` para pixel art.
- Use nomes simples e consistentes (exemplo: `pedra_grande.png`).

## 2) Abrir o Editor de Fundo
1. Inicie o servidor local do editor.
2. Abra `tools/editor/editor-fundo.html` no servidor.
3. Clique em `Atualizar Lista` para carregar fases existentes.
4. Selecione a fase e clique em `Carregar Fase`.

## 3) Atualizar lista de sprites
1. Ao abrir a pagina, os sprites sao carregados automaticamente.
2. Se adicionou arquivos novos em `assets/fundo`, recarregue a pagina do navegador.
3. Se necessario, reinicie o servidor do editor para forcar nova leitura de arquivos.

## 4) Adicionar item no palco
1. No menu da esquerda, clique no sprite desejado.
2. Clique no palco para adicionar o item.
3. O item entra em `fundoFrente` com `x` e `y` alinhados na grade.

## 5) Mover e remover item
1. Clique/arraste a caixa de selecao do item para mover.
2. Use `Remover Selecionado` para excluir o item atual.
3. Apenas itens de fundo sao editaveis nesta pagina.

## 6) Salvar alteracoes
1. Clique em `Salvar Fundo`.
2. O editor salva somente `fundoFrente` na fase atual.
3. Os demais dados da fase (blocos, entidades, itens, etc.) sao preservados.

## Estrutura esperada em JSON
Exemplo de `fundoFrente` salvo na fase:

```json
{
    "fundoFrente": [
        {
            "idSprite": "arvores/arvore_01.png",
            "x": 160,
            "y": 64,
            "escala": 1,
            "zIndex": 12
        },
        {
            "idSprite": "pedras/pedra_02.png",
            "x": 320,
            "y": 32
        }
    ]
}
```

Campos usados:
- `idSprite`: caminho relativo dentro de `assets/fundo`.
- `x`, `y`: posicao em pixels no palco.
- `escala` (opcional): escala do sprite.
- `zIndex` (opcional): ordem visual dentro da camada.
- `largura`, `altura` (opcional): sobrescrevem tamanho final.

## Checklist rapido
- Sprite novo foi colocado em `assets/fundo`.
- Fase foi carregada no `editor-fundo`.
- Item foi adicionado/movido no palco.
- Salvamento foi feito em `Salvar Fundo`.
- Reabriu a fase e confirmou persistencia do `fundoFrente`.

## Solucao de problemas
- Sprite nao aparece na lista:
  - Verifique extensao do arquivo.
  - Confirme que o arquivo esta em `assets/fundo`.
  - Recarregue pagina e, se preciso, reinicie o servidor.

- Item nao aparece no palco:
  - Confirme se um sprite foi selecionado antes do clique.
  - Verifique console do navegador para erro de caminho de imagem.

- Salvou mas nao persistiu:
  - Confirme que uma fase valida foi carregada.
  - Verifique se o servidor local esta ativo e sem erro no endpoint de save.
