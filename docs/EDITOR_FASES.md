# Editor de Fases — Guia completo

> **Em 30 segundos:** Editor em `tools/editor/editor.html`. Abre com `iniciar-editor-local.bat` ou `node tools/editor/editor-save-server.js`. Paletas de blocos, itens, NPCs, BBs. Salva em `config/fases/`.

## Como Abrir

### Método 1: .bat (Windows)
```
Duplo clique em tools/editor/iniciar-editor-local.bat
```
Acede em: `http://127.0.0.1:3210/tools/editor/editor.html`

### Método 2: Terminal
```bash
node ./tools/editor/editor-save-server.js
```
Depois abra `http://127.0.0.1:3210/tools/editor/editor.html`

## Estrutura do Editor

| Arquivo | Responsabilidade |
|---|---|
| `editor.html` | Estrutura HTML |
| `editor.js` | Lógica principal |
| `editor-ui.js` | Interface (paletas, menus) |
| `editor-render.js` | Renderização no palco |
| `editor-config.js` | Configuração de tipos de blocos |
| `editor-export.js` | Exportação de fases |
| `editor-persistence.js` | Salvamento de arquivos |
| `editor-save-server.js` | Servidor Node.js para salvamento |
| `editor-utils.js` | Utilitários |
| `editor-definitions.js` | Definições de elementos |
| `menu-blocos-loader.js` | Carregamento do menu de blocos |
| `menu-blocos.json` | Definição dos blocos do menu |

## Paletas

### Blocos
- Definidos em `menu-blocos.json`
- Cada item tem `sprite` (caminho para imagem)
- Renderizados em `editor-render.js` usando `PLATFORM_DEFS`

### Itens
- Itens coletáveis
- Definidos em `config/items/*.json`
- Usam `spriteColetavel` ou `spriteMenu`

### NPCs
- Inimigos e aliados
- Configurados via JSON em `config/`

### BBs
- Bebês para colocar na fase
- Definidos em `fase.bbNPCs[]`

## Atalhos do Editor

| Tecla | Ação |
|---|---|
| `Ctrl+S` | Salvar fase |
| `Ctrl+E` | Exportar fase |
| `Ctrl+Z` | Desfazer |
| `Delete` | Remover elemento selecionado |
| `Clique duplo` | Editar propriedades do elemento |

## Salvamento

- Fases salvas em `config/fases/nivel_N/faseN.json`
- O jogo detecta novas fases automaticamente
- Atualize `config/fases/manifesto-fases.json` para adicionar novas fases

## Checklist para Adicionar Bloco

1. Validar que `sprite` existe em `assets/`
2. Confirmar que `type` existe em `PLATFORM_DEFS` (editor-config.js)
3. Testar no editor: coloca, salva, abre no jogo
4. Verificar console: `EditorRender: Erro ao carregar imagem`

## Checklist para Adicionar Item

1. Criar JSON em `config/items/<id>.json`
2. Adicionar id em `loadAllItems.js` e `itens.js`
3. Se for material, liberar em `config/colete-itens.json`
4. Testar no editor: aparece na paleta?
5. Testar no jogo: aparece no mapa? Coleta?

## Dicas

- Use `iniciar-editor-local.bat` para evitar problemas de permissão
- Mantenha o terminal aberto enquanto usa o editor
- Para ver erros, verifique o console do navegador