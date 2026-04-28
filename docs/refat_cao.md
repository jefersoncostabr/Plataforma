# Plano de Refatoração e Sistematização: Sistema de Aliados (Pets)

## 1. Abstração e Generalização (Base Pet)
**Objetivo:** Transformar o código específico do cão em uma classe ou factory function genérica.
1.  **Criação do `PetFactory`**: Em vez de `inicializarCaoNPC`, criar um `window.spawnPet(tipo, config)` que aceite parâmetros como sprites, força de pulo e comportamento de IA.
2.  **Mapeamento de Assets**: Mover os caminhos de imagem (`SPRITE_PARADO`, etc.) para um arquivo de configuração (`pets-data.json`) ou passar via parâmetro no spawn.
3.  **Identificação Única**: Substituir `window.caoEntidade` por um sistema de registro de aliados (ex: `window.aliadosAtivos = []`), permitindo ter mais de um pet ao mesmo tempo.

## 2. Unificação de Input e Controle
**Objetivo:** Eliminar a duplicidade de detecção de teclas e facilitar a troca de controle.
1.  **Entidade Controlável**: Alterar a flag `window.controlandoCao` para `window.entidadeSobControle`. Assim, o motor de jogo envia os inputs para qualquer entidade que esteja nesse slot (Player, Cão, Gato, etc).
2.  **Consumo de Input Centralizado**: Mover a lógica de "Double Tap Q" para o gerenciador de controles central (`controles.js`), evitando que cada pet precise monitorar o teclado individualmente.

## 3. Otimização de Performance (Culling e Física)
**Objetivo:** Reduzir o processamento quando o pet não é o foco ou está fora da tela.
1.  **Culling de Lógica**: Pausar o `requestAnimationFrame` ou simplificar a física se o pet estiver a uma distância > 1000px do jogador e não estiver sob controle manual.
2.  **Física Compartilhada**: Atualmente, o pet "emula" a gravidade. O ideal é que ele utilize exatamente as mesmas funções de `gravidade.js` de forma modular, sem recriar variáveis de estado Y manualmente.

## 4. Sistematização da Mecânica de Trampolim
**Objetivo:** Tornar o "pulo na cabeça" uma característica de colisão genérica.
1.  **Hitbox Interativa**: Transformar a mecânica de trampolim em um componente de colisão. Qualquer pet (ou até inimigos) poderia ter a propriedade `isTrampoline: true`.
2.  **Detecção Inversa**: Em vez do cão checar se caiu no player, o player pode checar no seu loop de movimento se algo "pisou" nele, unificando a detecção.

## 5. Modularização do Resgate (Gaiolas Genéricas)
**Objetivo:** Permitir que a gaiola liberte diferentes tipos de pets.
1.  **Gaiola Parametrizada**: O arquivo `gaiola.js` deve ler do JSON da fase qual pet está dentro dela (ex: `{"tipo": "gato", "pos": "a10"}`).
2.  **Callback de Libertação**: A função `window.libertarPet(tipo, pos)` substituiria a `libertarCao`, recebendo as coordenadas e o tipo da entidade a ser spawnada.

---

### Ordem de Execução Recomendada

1.  **Padronização de IDs e Globais**: Renomear variáveis específicas (cão) para nomes genéricos (aliado/pet) para evitar confusão no código.
2.  **Implementação da Factory**: Criar o sistema que gera o pet baseado em um objeto de configuração.
3.  **Refatoração do Sistema de Troca**: Centralizar o "Swap" de personagens para que funcione com qualquer ID de entidade cadastrada.
4.  **Limpeza de Consoles e Debugs**: Remover logs de frames para manter a performance de renderização.
5.  **Extensão para Novo Pet**: Testar o sistema criando um "Pet de Teste" com valores de gravidade e velocidade diferentes apenas alterando o JSON.