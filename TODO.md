# TODO - Correções do menu de blocos (sprites)

- [x] Validar como o menu de blocos resolve sprites (menu usa `it.sprite`, palco usa `EditorConfig.PLATFORM_DEFS[*].sprite`).
- [x] Ajustar/alinhar os sprites do ciclo do JSON para:
  - [x] `plataforma`: `assets/bloco terra/terra_horizontal.png`
  - [x] `plataformaCantoDir`: `assets/bloco terra/terra_canto_direito.png`
  - [x] `plataformaCantoEsq`: `assets/bloco terra/terra_canto_esquerdo.png`
  - [x] `plataformaMeio`: `assets/bloco terra/terra_meio.png`
- [x] Adicionar o bloco `assets/bloco terra_muro.png` no menu “geral” (type: `plataformaMuro`, sprite: `../../assets/bloco terra_muro.png` no `menu_blocos.json`).
- [x] Garantir que o mesmo `type` renderiza corretamente no palco (stage) e no menu (`tools/editor/editor-config.js` adiciona `plataformaMuro` em `PLATFORM_DEFS`).


