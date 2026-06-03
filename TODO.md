# TODO

- [ ] Ler/entender todos os pontos do idle/respiração em `src/jogador/animacao.js` (feito parcialmente).
- [ ] Adicionar logs temporários em `src/jogador/animacao.js` para identificar qual ramo impede o idle quando o jogador está parado totalmente.
- [x] Rodar o jogo e observar logs no Console para capturar o estado das flags (movendoHorizontal, noChao, estaAgachado, carregando, estaoAberto, abrindo/tempoAbertura, chutando/tempoChute).
- [x] Com `window.DEBUG_IDLE_PLAYER = true`, capturar o ramo ativo (se idle não roda) e identificar a flag que impede o `else` final.


- [ ] Com base nos logs, propor correção mínima (sem quebrar outros estados) e aplicar mudanças no código.
- [ ] Remover/limpar logs temporários após validar.

