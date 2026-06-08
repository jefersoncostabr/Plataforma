# Como adicionar bloco novo no jogo (runtime)

Este guia cobre apenas o lado do jogo (runtime).
O editor de fases ja esta coberto por documentacao propria.

## 1) Defina o formato no JSON da fase

Escolha se o bloco novo vai:

- Entrar em uma chave existente (ex: `plataformas`), usando objeto com `coord` + `type`.
- Ou usar uma chave propria (ex: `plataformasLava`).

Exemplo com chave propria:

```json
{
  "plataformasLava": ["b4", "c4", "d4"]
}
```

## 2) Carregue a chave no bootstrap da fase

Arquivo: `src/core/inicial.js`

- Inclua a nova chave no registro de colisao (`window.plataformas`).
- Para bloco solido cheio, use `true`.
- Para colisao especial, use objeto com metadados (`tipo`, `direcao`, `xOffset`, `yOffset`, `width`, `height`).

Exemplo (solido):

```js
(fase.plataformasLava || []).forEach((coord) => {
  window.plataformas[coord.trim().toLowerCase()] = true;
});
```

## 3) Renderize o bloco

Arquivo: `src/core/inicial.js`

- Adicione chamada de render para a chave nova:

```js
if (fase.plataformasLava) {
  renderizarPlataformas(idPalco, '../../assets/blocos/lava.png', fase.plataformasLava);
}
```

## 4) Se o bloco usa `type` dentro de `plataformas`

Arquivo: `src/visual/cenario.js`

- Adicione o mapeamento do tipo em `SPRITE_POR_TIPO_PLATAFORMA`.

Exemplo:

```js
plataformaLava: '../../assets/blocos/lava.png'
```

## 5) Se precisar de regra especial (dano, empurrao, etc.)

- Colisao base: `src/core/colisoes.js`
- Regras de estaca: `src/core/estacas.js`
- Dano no jogador por estaca/hazard: `src/jogador/dano-estacas.js`

## 6) Validacao minima

1. Coloque o bloco novo em uma fase.
2. Salve e recarregue a fase.
3. Confirme:
- Sprite correto.
- Colisao correta.
- Sem regressao em blocos antigos.

## Caso aplicado neste repositorio

`plataformasEspinhos` foi integrado no runtime em `src/core/inicial.js`:

- Entrou no conjunto de blocos solidos padrao (`window.plataformas`).
- Ganhou renderizacao dedicada com sprite `../../assets/bloco terra/terra_canto.png`.
