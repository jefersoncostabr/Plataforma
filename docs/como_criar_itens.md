# Como criar novos itens (JSON)

Este guia explica como adicionar novos itens ao jogo usando o sistema baseado em arquivos JSON.

## 1. Estrutura do arquivo
Crie um arquivo para cada item em `config/items/` com o nome do tipo do item, por exemplo: `cinto.json`, `revolver.json`, etc.

### Exemplo de arquivo: `cinto.json`
```json
{
  "id": "cinto",
  "nome": "Cinto de Utilidades",
  "spriteColetavel": "../../assets/personagem/cinto_coletavel.png",
  "zIndex": 5,
  "efeitos": {
    "jogador": {
      "temCinto": true
    },
    "inimigo": {
      "temCinto": true
    }
  }
}
```

## 2. Campos obrigatórios
- `id`: identificador único do item (string, igual ao nome do arquivo)
- `nome`: nome exibido do item
- `spriteColetavel`: caminho da imagem do item coletável
- `zIndex`: camada de exibição (número)
- `efeitos`: objeto com efeitos para `jogador` e/ou `inimigo`

## 3. Efeitos
- `jogador`: define as propriedades que serão aplicadas ao coletar o item
- `inimigo`: define as propriedades aplicadas ao inimigo ao coletar

Exemplo de efeito para jogador:
```json
"efeitos": {
  "jogador": {
    "temJetpack": true,
    "jetpackAtivo": false
  }
}
```

## 4. Adicionando o item ao jogo
1. Crie o arquivo JSON em `config/items/`.
2. Adicione o sprite na pasta `assets/personagem/`.
3. O sistema irá carregar automaticamente todos os itens válidos ao iniciar o jogo.

## 5. Testando
- Inicie o jogo e use comandos de debug ou scripts para adicionar o item ao inventário do jogador ou inimigo.
- Verifique se o efeito e o visual funcionam corretamente.

---

Dúvidas? Consulte exemplos em outros arquivos de `config/items/` ou peça ajuda ao time.