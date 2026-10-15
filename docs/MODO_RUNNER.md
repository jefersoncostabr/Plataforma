# Bônus Runner

## Em poucas palavras

Depois de uma fase marcada com bônus, o cenário muda para uma corrida automática. O personagem corre sozinho; o jogador pula para evitar espinhos, buracos e plataformas. É preciso sobreviver por 20 segundos de jogo ativo.

## Como ativar em uma fase

No JSON da fase, configure:

```json
{
  "faseBonus": true,
  "qualBonus": 0,
  "nivelBonus": "a"
}
```

- `faseBonus`: ativa o bônus ao concluir a fase.
- `qualBonus`: use `0` para Runner.
- `nivelBonus`: `a` fácil, `b` médio ou `c` difícil.

A fase 1 do nível 1 está configurada para ativar o Runner ao ser concluída.

## Controles e duração

O personagem avança automaticamente. O pulo usa o controle normal do jogo (Espaço por padrão). Sobreviva aos obstáculos por 20 segundos para seguir à próxima fase. Abrir o menu de pausa suspende a contagem; morrer ou reiniciar cancela o bônus.

## O que acontece com configurações inválidas

Se `faseBonus` estiver ativo com um `qualBonus` diferente de `0`, o jogo avisa no console e continua para a próxima fase sem iniciar o bônus.

## Limites atuais

O Runner não tem tela de apresentação, instruções próprias, cronômetro visível nem recompensa específica. Ele começa automaticamente ao concluir uma fase configurada como bônus.

## Arquivos principais

- `src/modes/runner/runner-core.js`: corrida, câmera e geração de obstáculos.
- `src/core/inicial.js`: inicia o bônus e controla o tempo e o avanço da campanha.
- `config/fases/nivel_1/fase1.json`: exemplo dos campos; o bônus está desativado nessa fase.

## QualBonus ->define qual fase bonus terá neste runner (os bônus serão definidos no futuro)— é o tipo do fase bônus, não a dificuldade.

*****Não tem recompensa por passar na fase bônus
