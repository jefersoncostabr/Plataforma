/**
 * Demonstração da melhoria na IA do inimigo
 *
 * Quando o inimigo fica muito próximo do jogador (distância X e Y <= 20px),
 * ele automaticamente se afasta por 30 frames antes de voltar ao ataque normal.
 *
 * Configurações relacionadas:
 * - inimigoDistanciaMinimaAtaque: 20 (distância mínima para acionar afastamento)
 * - inimigoTempoAfastamento: 22 (frames que o inimigo fica se afastando)
 * - inimigoVelocidadeAfastamento: 3 (velocidade do movimento de afastamento)
 * - inimigoCooldownAfastamento: 60 (frames de cooldown entre afastamentos)
 *
 * Sistema de Cooldown:
 * - Após terminar um ciclo de afastamento, o inimigo aguarda 60 frames (1 segundo)
 * - Isso evita o "flickering" onde o inimigo ficava alternando rapidamente entre afastar e aproximar
 * - Torna o comportamento mais previsível e menos irritante visualmente
 *
 * Benefícios:
 * - Evita que o inimigo fique "preso" na mesma posição do jogador
 * - Melhora a precisão dos ataques, já que o inimigo se posiciona melhor
 * - Torna o combate mais dinâmico e realista
 */