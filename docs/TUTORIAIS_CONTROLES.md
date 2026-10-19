# Guia dos tutoriais de controles

Este guia explica como editar `config/tutorial/controles.json`. Esse arquivo define as dicas de controle e as mensagens curtas que aparecem durante o jogo.

## Onde editar

Abra `config/tutorial/controles.json`. Todos os tutoriais ficam dentro da lista `tutoriais`:

```json
{
  "tutoriais": [
    { "id": "exemplo", "ativo": true }
  ]
}
```

Cada objeto da lista é uma dica. Separe objetos com vírgula e use aspas duplas nas chaves e nos textos, como exige o formato JSON.

## Tipos de tutorial

### Dica de controle

Mostra uma tecla e uma ação enquanto o jogador ainda precisa praticá-la. A dica só fica disponível no nível e na fase indicados, quando o bloco configurado está visível. Ela desaparece depois que a ação é registrada o número de vezes pedido.

```json
{
  "id": "pulo",
  "teclaPadrao": "ESPAÇO",
  "acao": "Pular",
  "nivel": 1,
  "fase": 1,
  "blocoVisivel": "a2",
  "repeticoesNecessarias": 3,
  "ativo": true
}
```

| Campo | Obrigatório? | O que significa |
| --- | --- | --- |
| `id` | Sim | Identificador único. Para dicas de controle, também é usado para procurar uma tecla personalizada em `config/controles.json`. |
| `teclaPadrao` | Sim | Tecla que aparece quando não há uma tecla personalizada para o `id`. |
| `acao` | Sim | Texto mostrado ao lado da tecla. |
| `nivel` | Sim | Número do nível, começando em 1. |
| `fase` | Sim | Número da fase dentro do nível, começando em 1. |
| `blocoVisivel` | Sim | Coordenada de uma célula da fase, como `a2`. A dica é liberada quando essa célula aparece na área visível. |
| `repeticoesNecessarias` | Sim | Quantas vezes o jogo precisa registrar a ação para encerrar a dica. Use um número inteiro positivo. |
| `acaoId` | Não | Nome da ação reconhecida pelo jogo. Se omitido, usa o próprio `id`. Valores já registrados pelo jogo incluem `esquerda`, `direita`, `pulo`, `agachar` e `chute`. |
| `ativo` | Não | `true` deixa a dica habilitada; `false` desliga. Se omitido, fica habilitada. |

`teclaPadrao` é apenas a legenda de reserva: o tutorial usa a primeira tecla personalizada em `config/controles.json` quando encontra uma entrada com o mesmo `id`.

### Mensagem ao coletar um item

Mostra uma mensagem quando o item indicado é coletado. `nivel` e `fase` limitam onde a mensagem pode aparecer. Use `""` para deixar um deles sem restrição.

```json
{
  "id": "revolver_fase3",
  "pegarItem": "revolver",
  "msg": "Canela seca, atire com I",
  "nivel": 1,
  "fase": 3,
  "duracaoMs": 6000,
  "ativo": true
}
```

### Mensagem ao entrar em uma fase

Use `aoEntrarFase: true` para mostrar a mensagem quando o jogo estiver naquela fase. Informe `nivel` e `fase` para escolher o destino.

```json
{
  "id": "corpo_robo_nivel2_fase1",
  "aoEntrarFase": true,
  "msg": "Encontre um corpo robô e interaja com E",
  "nivel": 2,
  "fase": 1,
  "duracaoMs": 10000,
  "ativo": true
}
```

Mensagens de item e de entrada em fase compartilham estes campos:

| Campo | Obrigatório? | O que significa |
| --- | --- | --- |
| `id` | Sim | Identificador único entre todos os tutoriais. |
| `msg` | Sim | Texto da mensagem. |
| `pegarItem` | Para mensagem de item | Tipo do item que dispara a mensagem, por exemplo `cinto`, `gato` ou `revolver`. O tipo não diferencia maiúsculas de minúsculas nem acentos. |
| `aoEntrarFase` | Para mensagem de fase | Use exatamente `true` para disparar pela entrada na fase. |
| `acaoId` | Não | Ação que encerra uma mensagem de fase depois de ser repetida. O valor `interagir` conta cada toque da tecla configurada para interagir. |
| `repeticoesNecessarias` | Não | Quantas vezes a ação precisa ser registrada para a mensagem de fase desaparecer. Use junto com `acaoId`. Quando os dois estão presentes, a mensagem fica na tela até completar a contagem e não expira por tempo. |
| `nivel` | Não | Número do nível. Se ficar vazio ou for omitido, vale para qualquer nível. |
| `fase` | Não | Número da fase. Se ficar vazio ou for omitido, vale para qualquer fase. |
| `duracaoMs` | Não | Tempo na tela, em milissegundos. O padrão é 6000 (6 segundos). |
| `ativo` | Não | `true` habilita a mensagem; `false` desliga. Se omitido, fica habilitada. |

Cada mensagem configurada é exibida no máximo uma vez por sessão de jogo. Mensagens de fase são avaliadas enquanto a sessão está ativa; se a fase atual corresponder, a mensagem aparece. Menus e pausas ocultam as dicas temporariamente.

Para deixar uma mensagem de fase visível até o jogador praticar uma ação, combine `acaoId` e `repeticoesNecessarias`. Por exemplo, `"acaoId": "interagir"` com `"repeticoesNecessarias": 3` mantém a mensagem até três toques da tecla de interação.

## Como escolher o tipo certo

- Quer ensinar um comando que o jogador deve praticar? Use uma **dica de controle**.
- Quer explicar algo depois de pegar um item? Use **`pegarItem`**.
- Quer dar uma instrução assim que uma fase começar? Use **`aoEntrarFase`**.

Não misture `pegarItem` e `aoEntrarFase` no mesmo objeto. Use um `id` diferente para cada tutorial; IDs repetidos são ignorados.

## Cuidados ao editar

1. Preserve a estrutura externa `{ "tutoriais": [...] }`.
2. Coloque vírgula entre objetos, mas não depois do último objeto.
3. Use `true` e `false` sem aspas.
4. Salve o arquivo como UTF-8 para preservar acentos.
5. Em caso de JSON inválido, o carregamento das instruções é desativado. Confira vírgulas, aspas e chaves antes de salvar.
