# Mapeamento de botões do gamepad

Você pode usar índices numéricos, arrays ou nomes simbólicos para mapear ações no seu controles.json:

## Nomes simbólicos suportados
- "a": 0
- "b": 1
- "x": 2
- "y": 3
- "lb": 4
- "rb": 5
- "lt": 6
- "rt": 7
- "back": 8
- "start": 9
- "ls": 10
- "rs": 11
- "dpad_up": 12
- "dpad_down": 13
- "dpad_left": 14
- "dpad_right": 15
- "home": 16

## Exemplo de configuração
```json
"gamepad": {
  "mappings": {
    "pulo": [0, "a"],
    "cinto": [9, "start"],
    "mochila": [8, "back", 10],
    "esquerda": [14, "dpad_left"],
    "direita": [15, "dpad_right"],
    "cima": [12, "dpad_up"],
    "baixo": [13, "dpad_down"]
  }
}
```

Você pode misturar índices e nomes. O sistema continua aceitando apenas número único para compatibilidade.

Ative o modo debug para ver o índice de cada botão pressionado:
```js
window.DEBUG_CONTROLE_MOVIMENTO = true;
```
Assim, fica fácil descobrir qual botão corresponde a cada ação no seu controle.