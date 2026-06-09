# Plano de Implementacao - Pagina de Edicao de Fundo da Fase

Objetivo: criar uma nova pagina do servidor para editar somente o fundo de frente da fase (fundo mais proximo do jogador, sem paralax distante), reaproveitando a base visual atual (palco a direita e menu de itens a esquerda), com escopo restrito, sem duplicidade e sem alterar blocos com fisica ou entidades.

## Escopo fechado
- Editar apenas itens de fundo de frente da fase.
- Ler e salvar posicoes de fundo dentro dos dados da fase.
- Usar apenas sprites da pasta `assets/fundo` para selecao inicial.
- Itens de fundo colocados nessa pagina nao possuem fisica.
- Fase carregada completa visualmente, mas somente fundo pode ser alterado.
- Blocos com fisica e entidades ficam bloqueados para edicao nessa pagina.

## Etapa 1 - Definir contrato de dados do fundo no JSON de fase
Implementar
1. Definir campo dedicado para fundo editavel de frente no JSON da fase (exemplo: `fundoFrente`), sem misturar com blocos fisicos e entidades.
2. Definir estrutura minima por item: `idSprite`, `x`, `y`, e opcionalmente `escala`, `zIndex` (se necessario).
3. Garantir compatibilidade retroativa: se fase antiga nao tiver `fundoFrente`, assumir lista vazia.

Testar
1. Abrir fase sem `fundoFrente` e validar que carrega sem erro.
2. Abrir fase com `fundoFrente` e validar leitura correta da lista.
3. Validar que nenhum sistema de fisica depende desse novo campo.

Criterio de pronto
- Contrato documentado e leitura do novo campo funcionando em fases novas e antigas.

## Etapa 2 - Criar logica de leitura e montagem da fase com fundo posicionado
Implementar
1. Adicionar camada de render para fundo de frente durante montagem da fase.
2. Ao ler fase, instanciar os sprites de `fundoFrente` no palco (sem collider, sem corpo fisico, sem registro em sistemas de colisao).
3. Garantir ordem visual: fundo de frente aparece no plano correto (proximo do jogador, sem entrar no paralax distante).

Testar
1. Carregar fase com multiplos itens em `fundoFrente` e validar posicoes (x/y).
2. Confirmar que itens de fundo nao bloqueiam jogador nem inimigos.
3. Confirmar que camera/scroll nao quebra por causa da nova camada.

Criterio de pronto
- Fase monta com fundo de frente corretamente e sem efeitos colaterais em fisica.

## Etapa 3 - Criar nova pagina dedicada no servidor (editor-fundo)
Implementar
1. Criar nova pagina HTML/JS/CSS reaproveitando estrutura base do editor atual:
   - menu de itens a esquerda
   - palco de edicao a direita
2. Reusar componentes/utilitarios existentes (loader de fase, render base, persistencia), evitando duplicar logica.
3. Definir modo de operacao restrito: `modoEdicao = fundo`.

Testar
1. Acessar rota/pagina nova e validar layout correto.
2. Confirmar que recursos comuns (zoom, camera, grade, selecao basica) continuam operando se forem compartilhados.
3. Verificar no codigo que houve reuso e nao copia desnecessaria de modulos inteiros.

Criterio de pronto
- Nova pagina funcional, integrada ao servidor/editor, mantendo base visual e arquitetura simples.

## Etapa 4 - Implementar seletor de fase existente
Implementar
1. Adicionar UI para selecionar fase existente antes de editar.
2. Ao selecionar, carregar todos os dados da fase para visualizacao completa.
3. Travar edicao de blocos e entidades nessa tela (somente leitura para esses elementos).

Testar
1. Trocar entre fases e validar recarregamento sem lixo visual.
2. Validar que blocos/entidades nao podem ser selecionados, movidos ou removidos.
3. Validar que itens de `fundoFrente` podem ser selecionados para edicao.

Criterio de pronto
- Fluxo de selecao de fase estavel e com bloqueio efetivo de escopo.

## Etapa 5 - Implementar menu de itens com sprites de assets/fundo
Implementar
1. Listar apenas sprites de `assets/fundo` no menu esquerdo.
2. Padronizar metadados minimos para cada item do menu (id, nome, caminho de sprite).
3. Permitir adicionar item ao palco com clique no menu + clique no palco.

Testar
1. Validar que somente itens de `assets/fundo` aparecem no menu.
2. Validar que item adicionado vai para `fundoFrente` (e nao para blocos/entidades).
3. Validar comportamento em caso de sprite faltando (fallback visual e sem crash).

Criterio de pronto
- Menu enxuto e funcional, restrito ao conjunto de fundo.

## Etapa 6 - Ferramentas de edicao de fundo (somente necessario)
Implementar
1. Habilitar apenas operacoes basicas para fundo: adicionar, mover e remover.
2. Opcional de baixo risco: duplicar item selecionado.
3. Manter controles simples e previsiveis, sem introduzir ferramentas fora do escopo.

Testar
1. Adicionar 1 item, mover, remover e confirmar estado final.
2. Testar limites de palco e comportamento de arrasto.
3. Validar que nenhuma acao interfere em camadas nao editaveis.

Criterio de pronto
- Ciclo minimo de edicao completo e confiavel.

## Etapa 7 - Persistencia e exportacao sem impacto lateral
Implementar
1. Salvar somente `fundoFrente` quando alterar nessa pagina (ou salvar fase inteira preservando blocos/entidades sem mutacao).
2. Garantir que dados nao editados sejam mantidos exatamente como estavam.
3. Criar validacoes simples antes de salvar (campos obrigatorios, numeros validos de posicao).

Testar
1. Salvar fase, recarregar e confirmar persistencia dos fundos.
2. Comparar antes/depois do JSON para verificar ausencia de alteracoes indevidas.
3. Testar varias rodadas de salvar/reabrir sem degradacao.

Criterio de pronto
- Salvamento estavel, sem corromper dados fora do escopo.

## Etapa 8 - QA rapido e criterios de aceite final
Implementar
1. Executar checklist final em 2-3 fases diferentes (uma sem fundo, uma com pouco fundo, uma com varios itens).
2. Revisar logs de erro no console durante carga/edicao/salvamento.
3. Ajustar pontos de UX essenciais (mensagens de erro, estado vazio, indicador de modo restrito).

Testar (aceite)
1. Usuario consegue selecionar fase, editar apenas fundo e salvar com sucesso.
2. Itens de fundo nao tem fisica e nao afetam jogabilidade.
3. Blocos/entidades nao sao alterados nessa pagina.
4. Nenhum bug critico de carregamento, render ou salvamento.

Criterio de pronto
- Feature entregue com escopo restrito, codigo simples, reuso maximo e estabilidade basica.

## Riscos e mitigacoes
1. Risco: acoplamento com editor atual causar regressao.
   Mitigacao: isolar modo `fundo` com flags claras e testes manuais por etapa.
2. Risco: salvar sobrescrever dados nao relacionados.
   Mitigacao: merge conservador e comparacao de JSON antes/depois.
3. Risco: ordem de render incorreta com paralax existente.
   Mitigacao: definir camada explicita de `fundoFrente` e validar visualmente em multiplas fases.

## Ordem recomendada de implementacao (para testes incrementais)
1. Etapa 1
2. Etapa 2
3. Etapa 4
4. Etapa 5
5. Etapa 6
6. Etapa 7
7. Etapa 3 (ajustes finais de pagina/integração, se necessario)
8. Etapa 8

Observacao: apesar da criacao da pagina ser central, comecar por dados e leitura reduz risco de retrabalho e facilita testar cada parte de forma objetiva.
