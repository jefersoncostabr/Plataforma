# Planejamento: Garra de Tracao em Solido

## Status de Implementacao

Atualizado em 2026-05-19.


### Ja implementado
- [x] Flags novas no controle do jogador: `temGarraPuxo`, `garraPuxando`, `garraAncoradaPos`, `garraPullFrames`.
- [x] Novo estado `puxando` na maquina de estados da garra.
- [x] Ativacao por hold no impacto com solido (quando habilidade booleana estiver ativa).
- [x] Cancelamentos basicos de seguranca no puxo (soltar botao, indisponibilidade da garra, timeout e bloqueio de colisao).
- [x] Gate de gravidade em movimento para nao competir com a tracao (`!controle.garraPuxando`).
- [x] Parametros adicionados em configuracao: `garraVelocidadePuxo`, `garraPuxoDistanciaParada`, `garraPuxoFramesMax`.
- [x] Correcao de sintaxe em `src/jogador/movimento.js` para liberar validacao de runtime da feature.
- [x] **Protecao: durante o puxo, a garra nao sofre dano/impacto**.

### Pendente
- [ ] Validacao manual completa do checklist abaixo.
- [ ] Ajustes finos de tuning (velocidade/distancia/timeout) em gameplay real.
- [ ] Decidir quando `temGarraPuxo` passara a ser controlado por skill separada.

## Objetivo
Adicionar uma mecanica de tracao da garra com baixo risco de regressao:
- Se a garra ancorar em tile solido e o botao continuar pressionado, o jogador e puxado.
- Fora desse cenario, o comportamento atual da garra permanece igual.

## Escopo
### Incluido
- Habilidade booleana dedicada: `temGarraPuxo`.
- Ativacao por hold (segurar botao da garra).
- Tracao somente quando a garra prender em solido.
- Cancelamento seguro em condicoes invalidas.

### Excluido
- Puxar inimigos ou itens com essa mecanica.
- Criacao/integracao da skill na arvore de habilidades nesta iteracao.
- Refatoracoes amplas fora dos modulos necessarios.

## Arquitetura Recomendada
Centralizar a mecanica no sistema da garra para evitar duplicidade de logica.

Arquivos principais:
- `src/jogador/garra.js` (implementacao principal)
- `src/jogador/movimento.js` (ajuste minimo de fisica e estado)
- `config/configuracoes.json` (parametrizacao)

## Estados e Flags
Adicionar/usar no controle do jogador:
- `temGarraPuxo`: boolean (habilidade habilitada)
- `garraPuxando`: boolean (estado runtime)
- `garraAncoradaPos`: objeto `{ x, y }` (alvo da tracao)
- `garraPullFrames`: contador para timeout

## Fluxo da Mecanica
1. A garra entra em `esticando`.
2. Ao detectar colisao com solido:
   - Se `temGarraPuxo === true` e botao de garra ativo: entra em `puxando`.
   - Caso contrario: segue fluxo atual (`catching`/`voltando`).
3. Em `puxando`, por frame:
   - Revalida hold (se soltou, cancela).
   - Revalida pre-condicoes de uso da garra.
   - Move jogador em direcao a ancora com velocidade configuravel.
   - Interrompe por distancia minima, colisao bloqueante ou timeout.
4. Ao sair de `puxando`, limpa estado transitivo e volta para `voltando`.

## Alteracoes por Arquivo

### 1) `src/jogador/garra.js`
- Adicionar novo estado `puxando` na maquina de estados da garra.
- No ponto de colisao com solido em `esticando`, decidir entre:
  - iniciar `puxando` (hold + habilidade ativa), ou
  - manter comportamento atual.
- Implementar helper unico para limpar estado de puxo:
  - `garraPuxando = false`
  - `garraAncoradaPos = null`
  - `garraPullFrames = 0`
- Garantir cancelamentos limpos para evitar estado travado.

### 2) `src/jogador/movimento.js`
- Inicializar flags novas no controle do jogador.
- Nao aplicar gravidade quando `garraPuxando === true`.
- Nao duplicar a logica de tracao neste arquivo.

### 3) `config/configuracoes.json`
Adicionar parametros:
- `garraVelocidadePuxo`
- `garraPuxoDistanciaParada`
- `garraPuxoFramesMax`

Observacao:
- Manter fallback para valores antigos para nao quebrar configuracoes/saves.

## Regras de Cancelamento
Cancelar puxo imediatamente quando:
- botao da garra for solto;
- garra ficar indisponivel (ex.: guardada no cinto);
- garra estiver bloqueada por dano;
- houver colisao que impeça progressao;
- timeout de frames for atingido.

## Casos de Borda
- Toque em solido sem hold: comportamento antigo preservado.
- Obstaculo entre jogador e ancora: nao atravessa tile.
- Transicoes (pause, reinicio, morte, queda): limpar flags transitorias.
- Coleta/arrasto de item ou inimigo: sem regressao do fluxo atual.

## Checklist de Verificacao Manual
- [ ] Segurar garra + ancorar em parede/teto puxa continuamente.
- [ ] Encostar sem segurar mantem retorno atual da garra.
- [ ] Soltar botao durante puxo cancela corretamente.
- [ ] Colisao durante tracao nao atravessa bloco.
- [ ] Com garra indisponivel (cinto/estado invalido), puxo nao inicia.
- [ ] Durante puxo, gravidade nao interfere de forma incorreta.

## Decisoes Tecnicas
- Fonte unica da tracao em `src/jogador/garra.js`.
- Ajuste minimo em `src/jogador/movimento.js` apenas para gate de fisica.
- Sem expansao de escopo para entidades ou skill tree nesta entrega.

## Proxima Iteracao (Opcional)
Quando for criar a skill separada no futuro:
1. Conectar somente a origem de `temGarraPuxo` no sistema de skills.
2. Manter toda fisica/estado de tracao no modulo da garra.
3. Evitar mover esta mecanica para mais de um modulo.