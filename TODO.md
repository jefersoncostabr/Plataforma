# TODO - Remover dependência de config/fases/index.json (escopo restrito)

- [ ] Criar função de descoberta de fases em `src/core/inicial.js` que preenche `window.niveis` sem buscar `index.json`.
- [ ] Remover/alterar o carregamento inicial de `window.niveis` e a atualização de manifesto em `window.proximoNivel` para não depender de `index.json`.
- [ ] Garantir que `window.niveis` contém caminhos compatíveis com `carregarFase`.
- [ ] Garantir compatibilidade com `craftPersistido` via `window.faseAtualNome`/`faseAtualPathRelativo` (sem migração extra).
- [ ] Teste manual: iniciar jogo, concluir fase 1, avançar e reiniciar.

