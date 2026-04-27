Aqui está o plano detalhado e profissional para a implementação do sistema de resgate do cão. Este roteiro foca em modularização, performance e reutilização das funções centralizadas que já existem no seu motor de jogo.

Plano de Implementação: Sistema de Resgate do Cão NPC
Este plano descreve a transição do Cão de um NPC automático para um aliado que deve ser libertado de uma gaiola.

1. Definição de Estado e Persistência
Para evitar que o jogador precise resgatar o cão em todas as fases após a primeira vez, utilizaremos o sistema de estado global.

1.1 Flag Global: Criar window.isCaoResgatado (inicializada como false no iniciarJogo).
1.2 Persistência: Adicionar a flag ao sistema de salvamento para que o progresso seja mantido entre sessões.
2. Implementação da Entidade "Gaiola"
A gaiola será um objeto estático no cenário com uma composição visual de camadas.

2.1 Visual de Camadas:
Fundo: Sprite do cão (cao.png) estático.
Frente: Sprite da gaiola (gaiola1.png).
2.2 Posicionamento: A gaiola será posicionada via JSON da fase (ex: posicaoGaiola: "j15").
3. Geometria de Colisão (Hitbox de Precisão)
Conforme solicitado, a colisão será um quadrado de 12x12px posicionado na base.

3.1 Cálculo de Hitbox (Baseado em Tile 32x32):
Eixo X: Inicia no 11º pixel da esquerda.
Largura: 12 pixels (termina no pixel 23).
Eixo Y: Base do sprite (0).
Altura: 12 pixels.
3.2 Helper de Colisão: Utilizaremos a função detectarColisaoHitbox adaptando os paddings para isolar exatamente essa área de 12x12 no centro-inferior do elemento.
4. Fluxo de Lógica e Refatoração de cao.js
O código em cao.js será dividido em dois estados principais: PRE_RESGATE e ATIVO.

4.1 Verificação de Spawn:
Se window.isCaoResgatado === true, o cão spawna livre próximo ao jogador (comportamento atual).
Se false, o sistema verifica se há uma coordenada de gaiola na fase atual e spawna a gaiola.
4.2 O Loop da Gaiola: Enquanto não resgatado, o código apenas monitora a colisão do jogador com a hitbox da gaiola.
4.3 Evento de Libertação:
Ao colidir: Tocar SFX de "madeira quebrando", remover visual da gaiola e disparar a flag isCaoResgatado = true.
Iniciar imediatamente o cicloVidaCao para o seguimento.
5. Detalhes de Profissionalismo e Prevenção de Bugs
5.1 Z-Index Control: A gaiola deve estar no window.LAYERS.ITENS ou similar (Z-index superior ao cão, mas abaixo do HUD).
5.2 Prevenção de Duplicidade: Garantir que se o cão for resgatado em uma fase, a gaiola não apareça na próxima fase (verificação rigorosa da flag no carregarFase).
5.3 Performance: O loop de verificação da gaiola deve rodar apenas se o jogador estiver na mesma "tela" (proximidade < 100px) para economizar processamento.
5.4 Feedback Visual: Adicionar um pequeno efeito de partículas de madeira quando a gaiola sumir.


Resumo Técnico (Pseudocódigo de Apoio)
1-Level Load: if (fase.posicaoGaiola && !window.isCaoResgatado) { spawnGaiola(fase.posicaoGaiola); }
2-Hitbox da Gaiola:

// No loop de atualização:
const hitboxGaiola = { 
    x: gaiola.x + 11, // Offset solicitado
    y: gaiola.y,      // Base
    largura: 12,      // Tamanho 12x12
    altura: 12 
};


3-Trigger: No momento da colisão -> libertarCao().