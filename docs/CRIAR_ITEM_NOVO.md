# Como criar item novo (Editor + Jogo)

Guia atualizado para o fluxo real do projeto.

Objetivo: criar item novo sem quebrar paleta, salvamento de fase, spawn no mapa e coleta.

---

## Fluxo correto

1. Criar sprite(s) em assets/personagem/...
2. Criar o JSON do item em config/items/<id>.json
3. Adicionar o id do item nos carregadores de itens
4. Testar no editor (paleta e salvamento)
5. Testar no jogo (spawn e coleta)
6. Se for item não-equipável, liberar armazenamento na whitelist do colete/cinto

---

## 1) Sprites

Use sprite principal para o item coletável no mapa.

Exemplo:
- ../../assets/personagem/objetos/bateria_coletavel.png

Opcional:
- spriteMenu para paleta/menu

Observação:
- o editor usa fallback para spriteColetavel em vários itens, então spriteMenu é opcional.

---

## 2) JSON do item

Arquivo:
- config/items/<id>.json

Modelo simples (item coletável sem efeito direto):

```json
{
  "id": "bateria",
  "nome": "Bateria",
  "spriteMenu": "../../assets/personagem/objetos/bateria.png",
  "spriteColetavel": "../../assets/personagem/objetos/bateria_coletavel.png",
  "coletavel": true,
  "consumivel": false,
  "efeitos": {
    "jogador": {},
    "inimigo": {}
  }
}
```

Campos importantes:
- id: identificador único do item
- nome: nome exibido
- spriteColetavel: sprite usado no mapa
- coletavel: deve ser true para permitir coleta

Campos opcionais:
- spriteMenu
- efeitos

---

## 3) Carregadores de item (obrigatório)

Hoje o projeto mantém lista explícita de ids em dois pontos.

Adicione seu id em:
- src/itens/loadAllItems.js
- src/itens/itens.js

Se esquecer um dos dois, o item pode aparecer em parte do fluxo e falhar em outra.

---

## 4) Formato correto no JSON da fase

O formato usado atualmente nao é itensColetaveis com x/y.

Formato correto:

```json
"itens": {
  "bateria": "b7",
  "novelo": ["c3", "d4"],
  "capsula": [{ "pos": "e8", "robotEstado": "aberto" }]
}
```

Regras:
- chave do objeto = tipo do item (igual ao id)
- valor pode ser string unica, array de strings, ou objeto com pos (casos especiais)

---

## 5) Editor: o que validar

Checklist:
1. O item aparece na paleta
2. Ao clicar no mapa, grava em faseData.itens
3. Ao exportar/salvar, o JSON final manteve a chave itens no formato acima

---

## 6) Coleta no jogo: o que validar

Checklist:
1. O item aparece no mapa durante a fase
2. Ao encostar no item, ele some do mundo
3. Nao ocorre erro de sprite ou tipo indefinido

Fluxo atual:
- o loop do jogador tenta coleta e chama coletarItemGarra(item)
- a lógica de inventário decide se coleta de fato ou nao

---

## 7) Regra importante para item novo nao-equipável

Se o item nao for equipamento direto (ex.: material), ele precisa poder ser guardado.

Garanta permissão em:
- config/colete-itens.json
- fallback interno em src/jogador/inventario.js (COLETE_CONFIG_PADRAO)

Se nao estiver permitido, a tentativa de coleta pode retornar false e o item ficar no chao.

---

## 8) Erros comuns

### Item aparece no editor e nao aparece no jogo
- id nao adicionado nos dois carregadores
- spriteColetavel com caminho errado
- id do JSON diferente da chave usada na fase

### Encosta no item e nao coleta
- coletavel = false
- item nao permitido na whitelist de armazenamento
- tipo salvo na fase nao bate com id

---

## 9) Passo a passo rapido

1. Criar config/items/<id>.json
2. Adicionar <id> em src/itens/loadAllItems.js
3. Adicionar <id> em src/itens/itens.js
4. Se for material/nao-equipável, liberar em config/colete-itens.json
5. (Opcional de robustez) refletir tambem no fallback de src/jogador/inventario.js
6. Colocar item no editor
7. Salvar fase e conferir bloco itens no JSON
8. Rodar jogo e testar coleta

---

## Exemplo final (bateria)

- config/items/bateria.json criado
- bateria adicionada nos dois carregadores
- bateria permitida para armazenamento
- fase salva com:

```json
"itens": {
  "bateria": "b7"
}
```

Com isso, o item tende a funcionar em editor, spawn e coleta.

