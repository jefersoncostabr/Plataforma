> **Pra quem chegou agora:** bloco novo = declara no JSON da fase, registra a colisao, diz qual sprite desenhar, testa.
> Se o bloco machuca/empurra, tem um passo extra de regra. Detalhe abaixo.

## Resumo em 30 segundos (linguagem humana)

- Bloco em chave existente (`plataformas` com `coord` + `type`) ou chave propria (`plataformasLava: ["b4","c4"]`).
- Registra a colisao em `src/core/inicial.js` (`true` = solido cheio; objeto = colisao especial).
- Diz o sprite: chamada `renderizarPlataformas()` em `inicial.js` ou mapeia o `type` em `SPRITE_POR_TIPO_PLATAFORMA` (`cenario.js`).
- Regra especial (dano/empurrao)? Vai em `colisoes.js` / `estacas.js` / `dano-estacas.js`.
- Valida: poe na fase, recarrega, confere sprite + colisao + que nada antigo quebrou.

---
# 🧱 Como adicionar bloco novo no jogo (runtime) — Passo a passo

> **Em 30 segundos:** bloco novo = 1) declara no JSON da fase → 2) registra a colisão em `src/core/inicial.js` → 3) diz qual sprite desenhar → 4) se dá dano/empurra, põe a regra em `colisoes.js`/`estacas.js`. Depois testa: sprite certo? colide certo? não quebrou os antigos?
> O editor de fases tem doc própria — aqui é só o lado do jogo rodando.

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
