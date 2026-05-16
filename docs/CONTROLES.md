# Controles do Jogo

Este documento descreve os comandos atuais do jogo, como o remapeamento e salvo e os atalhos de debug.

## Onde configurar

- Arquivo base: `config/controles.json`
- Salvo do jogador: `localStorage` na chave `plataformaControles`
- Menu no jogo: `Pause -> CONTROLES`

## Acoes do gameplay

Estas acoes sao lidas continuamente pelo jogo:

- `esquerda`
- `direita`
- `cima`
- `baixo`
- `pulo`
- `chute`
- `tiro`
- `garra`
- `cinto`
- `mochila`
- `interagir`
- `airdrop`
- `debugImpacto`
- `abertura`

## Remapeamento pelo menu de pause

O menu `CONTROLES` remapeia de forma confiavel as acoes base abaixo:

- `esquerda`
- `direita`
- `cima`
- `baixo`
- `pulo`
- `chute`
- `tiro`
- `garra`
- `cinto`
- `mochila`
- `interagir`

Passos:

1. Abra o pause (`Esc`).
2. Entre em `CONTROLES`.
3. Selecione a acao e pressione `Enter` ou `Espaco`.
4. Pressione a nova tecla.
5. Use `SALVAR E VOLTAR`.

Observacoes:

- A tecla escolhida e removida das outras acoes para evitar conflito direto.
- `RESTAURAR PADRAO` volta para os binds padrao do menu.
- O novo bind passa a valer sem reiniciar o jogo.

## Controles da mochila (quando aberta)

- `WASD` ou setas: navega pelos slots.
- `Enter` ou `Espaco`: aciona o slot atual.
- Tecla de `chute`: dropa item do slot selecionado.
- `Esc`: fecha a mochila.

Na linha do cinto:

- Em `item-corpo`, `Enter` guarda no slot central do cinto.
- No `slot-cinto`, `Enter` usa (ou dropa se nao puder usar).

## Atalhos fixos e debug

Algumas teclas continuam hardcoded no motor de entrada:

- `Escape`, `Pause` ou `Break`: abre/fecha pause (ou fecha mochila, se aberta).
- `2`: apagar base persistida (debug).
- `3`: ganhar XP (debug).
- `5`: log de input (debug).
- `6`: abrir/fechar menu de skills.
- `7`: reset de skills (debug).
- `8`: pulo debug do inimigo.
- `9`: eliminar inimigos.
- `0`: reset total (inventario/base), mantendo skills.

## Mapeamento padrao (arquivo)

Padrao atual em `config/controles.json`:

```json
{
	"esquerda": ["ArrowLeft", "a", "A"],
	"direita": ["ArrowRight", "d", "D"],
	"cima": ["ArrowUp", "w", "W"],
	"baixo": ["ArrowDown", "s", "S"],
	"pulo": [" "],
	"chute": ["k", "K"],
	"tiro": ["i", "I"],
	"garra": ["j", "J"],
	"cinto": ["l", "L"],
	"mochila": ["Enter"],
	"interagir": ["e", "E"],
	"debugApagarEquipamento": ["2"],
	"debugXP": ["3"],
	"debugProximoNivel": ["4"],
	"airdrop": ["5"],
	"debugSpawnInimigo": ["6"],
	"debugImpacto": ["h", "H"],
	"debugResetSkills": ["7"],
	"debugPuloInimigo": ["8"],
	"debugKillInimigos": ["9"],
	"debugReset": ["0"],
	"pause": ["Escape"],
	"debugGrade": ["g", "G"]
}
```
