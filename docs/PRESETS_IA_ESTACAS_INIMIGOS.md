# Presets de IA - Estacas dos Inimigos

Este arquivo traz presets prontos para ajustar como os inimigos evitam estacas.

Veja tambem o menu de controles e remapeamento em `docs/CONTROLES.md`.

## Campos de Configuracao

Adicione/edite estes campos em `config/configuracoes.json`:

- `inimigoEstacaLookaheadMin`
- `inimigoEstacaLookaheadBonus`
- `inimigoEstacaLookaheadPatrulha`
- `inimigoEstacaDownProbeFrenteX`
- `inimigoEstacaDownProbeYInicial`
- `inimigoEstacaDownProbeYPasso`
- `inimigoEstacaDownProbeNiveis`
- `inimigoKnockbackPassoMax`

## Preset Balanceado (atual)

```json
{
  "inimigoEstacaLookaheadMin": 10,
  "inimigoEstacaLookaheadBonus": 8,
  "inimigoEstacaLookaheadPatrulha": 14,
  "inimigoEstacaDownProbeFrenteX": 8,
  "inimigoEstacaDownProbeYInicial": 8,
  "inimigoEstacaDownProbeYPasso": 8,
  "inimigoEstacaDownProbeNiveis": 3,
  "inimigoKnockbackPassoMax": 1
}
```

## Preset Cauteloso

Detecta estacas mais cedo e evita mais saltos perigosos.

```json
{
  "inimigoEstacaLookaheadMin": 14,
  "inimigoEstacaLookaheadBonus": 12,
  "inimigoEstacaLookaheadPatrulha": 20,
  "inimigoEstacaDownProbeFrenteX": 12,
  "inimigoEstacaDownProbeYInicial": 8,
  "inimigoEstacaDownProbeYPasso": 8,
  "inimigoEstacaDownProbeNiveis": 4,
  "inimigoKnockbackPassoMax": 0.75
}
```

## Preset Agressivo

Inimigo arrisca mais, detecta mais perto, e movimenta mais rapido no knockback.

```json
{
  "inimigoEstacaLookaheadMin": 8,
  "inimigoEstacaLookaheadBonus": 6,
  "inimigoEstacaLookaheadPatrulha": 10,
  "inimigoEstacaDownProbeFrenteX": 6,
  "inimigoEstacaDownProbeYInicial": 10,
  "inimigoEstacaDownProbeYPasso": 10,
  "inimigoEstacaDownProbeNiveis": 2,
  "inimigoKnockbackPassoMax": 1.5
}
```

## Dicas Rapidas

- Se ainda atravessar bloco no knockback: reduza `inimigoKnockbackPassoMax`.
- Se pular de cabeca em estaca down: aumente `inimigoEstacaDownProbeNiveis`.
- Se entrar em estaca lateral: aumente `inimigoEstacaLookaheadMin` e `inimigoEstacaLookaheadPatrulha`.