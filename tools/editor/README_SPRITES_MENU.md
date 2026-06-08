# Guia rápido: como evitar “imagem desconhecida” no menu de blocos

## Onde o menu busca as imagens
O menu de blocos é montado em `tools/editor/editor-ui.js` a partir de `tools/editor/menu_blocos.json`:
- Se o item tiver `sprite`, o menu usa `it.sprite`.
- Se não tiver `sprite`, o item é ignorado no menu de blocos.

## Onde o palco busca as imagens
Quando você coloca o bloco no palco, `tools/editor/editor-render.js` renderiza usando:
- `window.EditorConfig.PLATFORM_DEFS[*].sprite` (para blocos)

## Checklist manual (sem código)
1) Para cada item em `tools/editor/menu_blocos.json`, valide que o `sprite` existe em `assets/`.
2) Confirme que o `type` existe em `tools/editor/editor-config.js` (PLATFORM_DEFS) quando `sprite` não vier no JSON.
3) Abra o editor e olhe o Console: `EditorRender: Erro ao carregar imagem: <src>`.

## Ajustes aplicados
- Ciclo “geral” usa `plataformaMuro` com `../../assets/bloco terra/terra_muro.png`.
- O menu de blocos usa somente `menu_blocos.json` como referência visual.

