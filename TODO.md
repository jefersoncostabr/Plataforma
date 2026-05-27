## [Feature] Criador de Fases: Inserção por Número

### 1. UI/Editor
- [ ] Adicionar opção na UI para escolher entre "criar no fim" ou "inserir por número"
- [ ] Implementar campo/input para número N e validação (numérico, >0, não vazio)

### 2. Lógica de Inserção
- [ ] Se modo "criar no fim": manter comportamento atual
- [ ] Se modo "inserir por número":
	- [ ] Validar N < quantidade de fases no escopo
	- [ ] Se N >= quantidade, forçar "criar no fim" e informar usuário
	- [ ] Se N disponível, criar direto
	- [ ] Se N ocupado, pedir confirmação
		- [ ] Se confirmado: shift/renomeação descendente, criar nova fase, atualizar index
		- [ ] Se cancelado: abortar

### 3. Persistência/Backend
- [ ] Implementar rotina de shift/renomeação e atualização do manifesto/index
- [ ] Garantir ordenação numérica no index após qualquer operação

### 4. Mensagens/UX
- [ ] Mensagens de erro e confirmação conforme regras do plano

### 5. Testes Manuais
- [ ] Testar todos os fluxos e escopos (raiz, nivel_1, nivel_2)
# TODO - Feature: Criador de Fases com Inserção por Número (Planejado)

- [x] Revisar fluxo atual do editor para criação de novas fases (identificar pontos de UI e persistência)
- [x] Atualizar especificação do comportamento: inserir por número **somente se** N < nº de fases existentes no escopo (senão forçar modo padrão 'criar no fim')
- [ ] Definir contrato da rotina de shift/renomeação (renomear k>=N para k+1 sem exclusão)
- [ ] Definir atualização do manifest `config/fases/index.json` para refletir renumeração
- [ ] Definir mensagens/UX de confirmação e casos de erro (N inválido, tentativa fora do limite permitido)
- [ ] Preparar lista de testes manuais (raiz, nivel_1, nivel_2; N em posições válidas e inválidas)


