# Controles do Jogo

Este documento descreve os comandos do jogo, o menu de controles e como o remapeamento e salvo.

## Onde configurar

- Arquivo base: `config/controles.json`
- Salvo do jogador: `localStorage` na chave `plataformaControles`
- Menu no jogo: Pause -> CONTROLES

## Acoes remapeaveis

- `esquerda`
- `direita`
- `cima`
- `baixo`
- `pulo`
- `chute`
- `tiro`
- `garra`

## Como remapear no jogo

1. Abra o menu de pause (`Esc`).
2. Entre em `CONTROLES`.
3. Selecione a acao e pressione `Enter`/`Espaco`.
4. Pressione a nova tecla.
5. Escolha `SALVAR E VOLTAR`.

Observacoes:

- A tecla escolhida e removida de outras acoes para evitar conflito direto.
- `RESTAURAR PADRAO` volta para os bindings default.
- O jogo aplica o novo binding sem precisar reiniciar.

## Mapeamento padrao

```json
{
  "esquerda": ["ArrowLeft", "a", "A"],
  "direita": ["ArrowRight", "d", "D"],
  "cima": ["ArrowUp", "w", "W"],
  "baixo": ["ArrowDown", "s", "S"],
  "pulo": [" "],
  "chute": ["k", "K"],
  "tiro": ["i", "I"],
  "garra": ["j", "J"]
}
```

## Teclas de debug (nao remapeadas pelo menu)

- `8`: pulo debug do inimigo
- `9`: eliminar inimigos
