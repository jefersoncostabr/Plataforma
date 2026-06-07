# Como adicionar novo Bloco / Item no Criador de Fases (Editor)

Este guia explica como fazer o editor reconhecer e exibir **novos blocos (plataformas)** e **novos itens (itens coletáveis/objetos)**.

---

## 1) Novo **Bloco** (Plataforma / Terra / Estacas)

### Onde configurar
Os blocos do palco e da paleta esquerda vêm de:
- **`tools/editor/editor-config.js`** → `PLATFORM_DEFS`

Cada entrada define um “tipo” que o editor grava no `faseData`.

### Exemplo (dentro de `PLATFORM_DEFS`)
```js
{ 
  type: 'plataforma',
  stateKey: 'plataformas',
  sprite: '../../assets/bloco terra/terra_horizontal.png',
  label: 'Plataforma',
  kind: 'array'
}
```

### Passo a passo
1. Abra `tools/editor/editor-config.js`.
2. Localize o array `PLATFORM_DEFS`.
3. Adicione uma nova definição com:
   - `type`: id lógico do bloco (usado para identificar na paleta)
   - `stateKey`: chave onde o editor salva no `faseData` (ex.: `plataformas` ou `plataformasNeve`)
   - `sprite`: caminho do PNG
   - `label`: texto mostrado na paleta
   - `kind`: `array` (porque blocos usam lista de coords)
4. Garanta que o arquivo exista em `assets/...` com o caminho exato.

### Depois de adicionar
- O editor renderiza os blocos a partir do catálogo (`EditorConfig/EditorDefinitions`).
- Para ver no menu “Blocos” e conseguir clicar no palco:
  - recarregue a página do editor (F5).

---

## 2) Novo **Item** (itens em `faseData.itens`)

Itens (objetos coletáveis/consumíveis) vêm dos JSONs em:
- **`config/items/*.json`**

### Onde adicionar
1. Crie/edite o arquivo em `config/items/SEU_TIPO.json`.

### Estrutura mínima esperada
O editor carrega todos os itens via `carregarItemDefinitions()` (em `tools/editor/editor.js`) e espera um JSON com `id` e caminhos de sprite.

Em geral, você deve incluir ao menos:
- `id` (string única)
- `spriteColetavel` (sprite usado como “ícone do item”) 
  - ou `spriteMenu` (se o item tiver outro sprite para menu)

Exemplo (modelo):
```json
{
  "id": "meu_item",
  "nome": "Meu Item",
  "spriteColetavel": "../../assets/personagem/objetos/meu_item.png",
  "spriteMenu": "../../assets/personagem/objetos/meu_item.png"
}
```

> Se você só fornecer um caminho (ex.: apenas `spriteColetavel`), o editor usa como fallback.

### Passo a passo
1. Coloque seu PNG em `assets/...` (mesma pasta do projeto).
2. Crie `config/items/meu_item.json` com:
   - `id` = `meu_item` (deve bater com o tipo)
   - `spriteColetavel` (caminho do PNG)
   - (opcional) `spriteMenu`
3. Abra o editor e recarregue.
4. No menu “Itens”, procure pelo item pelo `id/nome` e clique para posicionar no palco.

---

## 3) (Opcional mas recomendado) Alias para sprites específicos (ex.: terra)

Se o seu sprite estiver em uma pasta diferente do padrão e você quiser que o editor resolva automaticamente, ajuste o alias em:
- **`tools/editor/editor-definitions.js`** → `SPRITE_ALIASES`

Exemplo de alias existente:
- `terra_horizontal` / `plataforma` → `../../assets/bloco terra/terra_horizontal.png`

---

## 4) Checklist de debug (quando a imagem não aparece)

1. Confirme que o arquivo PNG existe no caminho.
2. Abra o DevTools (Console/Network) e confira o erro:
   - `[EditorRender] Erro ao carregar imagem: <url>`
3. Se o caminho for `assets/personagem/...` mas o arquivo está em outra pasta, ajuste:
   - `sprite` (para blocos) em `editor-config.js`
   - `spriteColetavel/spriteMenu` (para itens) no JSON em `config/items/`
4. Recarregue o editor.

---

## Arquivos mais importantes
- Blocos: `tools/editor/editor-config.js` (`PLATFORM_DEFS`)
- Itens: `config/items/*.json`
- Resolução de sprite/aliases: `tools/editor/editor-definitions.js`
- Render e paleta: `tools/editor/editor-render.js` e `tools/editor/editor-ui.js`

---

Fim.

