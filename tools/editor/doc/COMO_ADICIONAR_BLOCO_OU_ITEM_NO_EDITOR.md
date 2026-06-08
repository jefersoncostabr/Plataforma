# Como adicionar bloco ou item no menu do Editor

Guia rapido, direto ao ponto.

## TL;DR

Para bloco aparecer e funcionar no palco: voce precisa atualizar 3 lugares.

1. `tools/editor/menu_blocos.json` (aparece no menu)
2. `tools/editor/editor-config.js` em `PLATFORM_DEFS` (editor consegue colocar no palco)
3. `src/visual/cenario.js` no mapa `SPRITE_POR_TIPO_PLATAFORMA` (jogo renderiza sprite correto por `type`)

Para item (menu Itens): normalmente basta o JSON em `config/items/` com `id` + sprite.

---

## 1) Adicionar bloco no menu Blocos (receita pronta)

### Passo 1: colocar no menu

Em `tools/editor/menu_blocos.json`, dentro do menu desejado (`paletteBlocks.menus[].cycle.items`), adicione:

```json
{ "type": "plataformaCanto2", "label": "Canto", "stateKey": "plataformas", "sprite": "../../assets/bloco terra/grama_canto2.png" }
```

Campos obrigatorios:
- `type`: identificador do bloco
- `stateKey`: onde salva no `faseData`
- `sprite`: imagem mostrada no botao de ciclo

### Passo 2: registrar no catalogo do editor

Em `tools/editor/editor-config.js`, no array `PLATFORM_DEFS`, adicione o mesmo `type`:

```js
{ type: 'plataformaCanto2', stateKey: 'plataformas', sprite: '../../assets/bloco terra/grama_canto2.png', label: 'Canto', kind: 'array' }
```

Se nao estiver aqui, aparece no menu mas nao posiciona no palco.

### Passo 3: registrar no runtime do jogo

Em `src/visual/cenario.js`, dentro de `SPRITE_POR_TIPO_PLATAFORMA`, adicione:

```js
plataformaCanto2: '../../assets/bloco terra/grama_canto2.png'
```

Se nao estiver aqui, o jogo pode usar sprite errado no runtime.

---

## 2) Exemplo real (Canto2, Canto3, Canto4)

Seguindo o mesmo padrao:

```json
{ "type": "plataformaCanto2", "label": "Canto", "stateKey": "plataformas", "sprite": "../../assets/bloco terra/grama_canto2.png" },
{ "type": "plataformaCanto3", "label": "Canto", "stateKey": "plataformas", "sprite": "../../assets/bloco terra/grama_canto3.png" },
{ "type": "plataformaCanto4", "label": "Canto", "stateKey": "plataformas", "sprite": "../../assets/bloco terra/grama_canto4.png" }
```

E repetir os 3 `type` em:
- `PLATFORM_DEFS` (editor-config)
- `SPRITE_POR_TIPO_PLATAFORMA` (cenario.js)

---

## 3) Adicionar item no menu Itens (receita pronta)

Itens nao entram por `menu_blocos.json`. Eles entram pelos JSONs em `config/items/`.

### Exemplo minimo

Arquivo: `config/items/meu_item.json`

```json
{
  "id": "meu_item",
  "nome": "Meu Item",
  "spriteColetavel": "../../assets/personagem/objetos/meu_item.png",
  "spriteMenu": "../../assets/personagem/objetos/meu_item.png"
}
```

### Checklist do item

1. O arquivo JSON existe em `config/items/`.
2. `id` e unico e valido.
3. O PNG existe no caminho.
4. Recarregou o editor (F5).
5. O item aparece no menu Itens pelo `id/nome`.

---

## 4) Regras importantes para nao quebrar

- Mesmo `type` entre `menu_blocos.json` e `PLATFORM_DEFS`.
- Para variacoes no mesmo `stateKey` (`plataformas`), prefira `type` unico por variacao se quiser diferenciar sprite no palco.
- Caminho de sprite precisa bater exatamente com o arquivo real.

---

## 5) Debug rapido

1. Abra DevTools e procure erro de imagem:
   - `[EditorRender] Erro ao carregar imagem: <url>`
2. Se aparece no menu e nao posiciona:
   - faltou `type` em `PLATFORM_DEFS`.
3. Se posiciona no editor mas no jogo fica errado:
   - faltou mapear `type` em `SPRITE_POR_TIPO_PLATAFORMA`.

---

Fim.

