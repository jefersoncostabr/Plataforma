# Feature: Criador de Fases com Inserção por Número (sem exclusão)

## 1. Objetivo
Adicionar ao editor de fases a opção, durante a criação de uma nova fase:
- **(A)** Criar **no fim** das fases (comportamento atual)
- **(B)** Criar **em uma posição específica informando o número** da fase

Quando o número informando já existir no escopo selecionado, o editor deve:
- pedir **confirmação**;
- inserir a nova fase na posição desejada;
- **renumerar as fases existentes em sequência** (sem exclusão), para abrir espaço na posição escolhida.

---

## 2. Escopo de renumeração
- A inserção e o shift/renumeração devem ocorrer **somente na pasta do nível escolhida** no editor:
  - `config/fases/` (raiz), ou
  - `config/fases/nivel_1/`, ou
  - `config/fases/nivel_2/`.

---

## 3. Regras de decisão (modo fim vs inserir por número)
### 3.1 Modo “Criar no fim”
- Mantém o comportamento atual:
  - cria no próximo número disponível do conjunto,
  - atualiza o manifesto/index (`config/fases/index.json`) para refletir a ordem numérica.

### 3.2 Modo “Criar na posição (número informado)”
- O editor deve solicitar ao usuário um número **N**.
- Antes de permitir a inserção por N, aplicar a regra:
  - **Permitir inserção apenas se N for menor do que a quantidade de fases que já existem no escopo selecionado.**
  - Se **N for >= quantidade atual**, o editor deve **forçar o modo padrão “criar no fim”** (sem shift/renumeração).

> Justificativa UX: se o usuário quer inserir após/na última posição disponível, o caminho correto é criar no fim (sem operação de renumeração).

---

## 4. Comportamento detalhado ao inserir por N
### 4.1 Se `faseN.json` NÃO existir
- Criar diretamente o arquivo `faseN.json` na pasta do nível selecionado.
- Atualizar `config/fases/index.json` (ou a lista consumida pelo jogo) garantindo ordenação numérica.

### 4.2 Se `faseN.json` EXISTIR
- Exibir confirmação (modal/dialog/alert coerente com o editor):
  - Mensagem: a fase `fase{N}` já existe. Deseja **inserir** a nova fase aqui e **renumerar** as fases seguintes?
- Se o usuário confirmar:
  1. Renomear as fases existentes para abrir espaço:
     - Para todo `k` onde `k >= N` e existir `fase{k}.json`, renomear `fase{k}.json -> fase{k+1}.json`.
  2. Realizar as renomeações em **ordem decrescente** (de trás pra frente) para evitar sobrescrita por colisão de nomes.
  3. Criar a nova fase em `faseN.json`.
  4. Recalcular a ordem e salvar o manifesto/index (garantir sequência sem buracos).
- Se o usuário cancelar:
  - abortar a criação (nenhuma alteração de arquivos/manifestos).

---

## 5. Contrato do algoritmo de shift/renomeação (especificação)
### Entradas
- `scope`: pasta do nível (raiz / nivel_1 / nivel_2)
- `N`: número informado pelo usuário

### Operação
1. Determinar a lista numérica de arquivos existentes na pasta do scope:
   - extrair `fase{n}.json` -> número `n`.
2. Ordenar numericamente.
3. Calcular o conjunto de índices afetados:
   - todo `k >= N` que exista.
4. Renomear em ordem decrescente:
   - `k = max ... N`:
     - renomear `fase{k} -> fase{k+1}`.
5. Criar a nova fase em `fase{N}`.

### Garantias
- Não excluir arquivos.
- Não deixar buracos na sequência numérica final dentro do escopo.
- Evitar colisões usando renomeação descendente.

---

## 6. UX/Mensagens necessárias
- Quando modo posição estiver ativo:
  - Prompt/campo para N.
- Ao detectar tentativa fora do limite (N >= quantidade atual):
  - Mensagem informando que a inserção por posição não será aplicada e será usada a criação no fim.
- Quando `faseN.json` existir:
  - confirmação explícita antes do shift.
- Erros:
  - N inválido (não numérico, <= 0, vazio)
  - falha ao salvar arquivos (mostrar status/erro técnico amigável)

---

## 7. Casos de teste (manual)
Para cada escopo (raiz, nivel_1, nivel_2):
1. Inserir com N válido no meio (ex.: existe fase2, fase3…; inserir N=2)
2. Inserir com N=1
3. Inserir com N no último número existente (deve forçar “criar no fim” por regra)
4. Inserir repetidas vezes no mesmo N (deve continuar fazendo shift corretamente)
5. Cancelar confirmação quando `faseN.json` existir (deve abortar sem alterações)
6. Verificar atualização do `index.json` após cada operação

---

## 8. Arquivos a ajustar (alto nível)
- `tools/editor/editor.js`
  - fluxo da UI do “criar nova fase”
  - coletar modo e N
  - chamar rotina de shift/renomeação quando aplicável
- `tools/editor/editor-save-server.js` (ou persistência equivalente)
  - fornecer endpoint/rotina para renomear em série e atualizar manifesto
- `config/fases/editor.js`
  - caso gere candidatos/limites do editor, ajustar para refletir regra de inserção limitada
- Manifest/índice:
  - `config/fases/index.json` (garantir ordenação numérica)

---

## 9. Critério de pronto (Definition of Done)
- UI oferece duas opções (fim vs posição)
- Inserção por número só ocorre quando N < quantidade existente no escopo
- Se `faseN` existir, confirma e renumera sem exclusão
- Manifest/index é atualizado corretamente após operação
- Casos de teste manuais aprovados

