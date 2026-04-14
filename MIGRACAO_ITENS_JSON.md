# Migração para Sistema de Itens Baseado em JSON

Este guia descreve o passo a passo para migrar o sistema de itens do jogo para um modelo flexível, baseado em arquivos JSON e funções utilitárias genéricas. O objetivo é facilitar a manutenção, expansão e customização dos itens, centralizando suas definições e efeitos.

---

## 1. Estrutura dos Arquivos de Itens

- Crie a pasta `config/items/`.
- Para cada item, crie um arquivo JSON, por exemplo: `cinto.json`, `revolver.json`, `escudo.json`.
- Exemplo de arquivo:

```json
{
  "id": "cinto",
  "nome": "Cinto",
  "spriteColetavel": "../../assets/personagem/cinto_coletavel.png",
  "spriteEquipado": "../../assets/personagem/cinto.png",
  "zIndex": 6,
  "efeitos": {
    "jogador": {
      "temCinto": true,
      "inventarioAdd": "cinto"
    },
    "inimigo": {
      "temCinto": true,
      "inventarioAdd": "cinto"
    }
  },
  "dropConfig": {
    "tipo": "cinto",
    "sprite": "../../assets/personagem/cinto_coletavel.png"
  }
}
```

---

## 2. Carregamento Centralizado dos Itens

- Implemente uma função para ler todos os arquivos JSON da pasta `config/items/`.
- Armazene os dados em um objeto global, por exemplo: `window.itemDefinitions = { cinto: {...}, revolver: {...} }`.
- Execute esse carregamento antes de iniciar o jogo.

---

## 3. Função Unificada de Criação de Item

- Crie `src/itens/criarItem.js`.
- Implemente `criarItemColetavel(itemData, x, y)`:
  - Cria o elemento visual (`<img>`) usando `itemData.spriteColetavel`.
  - Define propriedades como posição, tamanho, zIndex, etc.
  - Cria o objeto do item para `window.itensColetaveis`.
  - Retorna o objeto criado.

---

## 4. Função Unificada de Coleta de Item

- Crie `src/itens/coletarItem.js`.
- Implemente `aplicarEfeitoColeta(entidade, item)`:
  - Lê os efeitos do JSON (`item.efeitos.jogador` ou `item.efeitos.inimigo`).
  - Aplica as propriedades na entidade (ex: `entidade.temCinto = true`).
  - Atualiza inventário e visuais.
  - Salva inventário se for o jogador.

---

## 5. Refatoração dos Pontos de Uso

- **Jogador (`movimento.js`):**
  - Refatore `droparItemJogador` e coleta para usar as funções genéricas e os dados dos JSONs.
- **Inimigos (`ia-inimigo.js`):**
  - Refatore `droparItensInimigo` e coleta para usar as funções genéricas e os dados dos JSONs.
- **Inicialização Visual:**
  - Crie função auxiliar para criar elementos visuais de equipamentos lendo o JSON do item.
- **Editor de Fases (`editor.js`):**
  - Ajuste para ler o `spriteColetavel` do JSON ao renderizar itens.

---

## 6. Considerações Finais

- Permita que o campo `efeitos` aceite funções ou nomes de funções para efeitos especiais.
- Adicione validações para campos obrigatórios e fallbacks para sprites/efeitos.
- Documente o formato dos JSONs e o uso das funções utilitárias.

---

## Resumo da Ordem Recomendada

1. Definir/criar os JSONs dos itens.
2. Implementar o carregamento centralizado.
3. Criar função unificada de criação de item.
4. Criar função unificada de coleta de item.
5. Refatorar pontos de uso (jogador, inimigos, editor).
6. Ajustes finais, validações e documentação.

---

**Dica:**

- Teste cada etapa separadamente antes de avançar para a próxima.
- Use logs para depurar o carregamento e aplicação dos efeitos.
- Comente e documente os campos dos JSONs para facilitar futuras expansões.
