# Documentação de Configurações Gerais (`configuracoesGerais.json`)

Este documento descreve cada campo presente no arquivo de configuração central do jogo. Alterar estes valores permite ajustar o balanço, a dificuldade e os recursos visuais sem modificar o código-fonte.

## 1. Jogador e Movimentação

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `faseInicial` | Number | Índice da fase por onde o jogo começa (ex: 0 para fase 1). |
| `velocidadePlayer` | Number | Velocidade de caminhada horizontal do jogador. |
| `inimigoForcaPulo` | Number | Força do impulso para cima (valor negativo sobe mais). |
| `inimigoGravidade` | Number | Força que puxa os personagens para baixo a cada frame. |
| `inimigoPuloCooldown` | Number | Tempo de espera entre um pulo e outro. |

## 2. Combate e Física (Knockback)

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `knockbackBase` | Number | Distância padrão que um personagem é empurrado ao ser atingido. |
| `knockbackAjustes` | Object | Ajustes finos de knockback por fonte: `playerChute`, `playerProjetil`, `inimigoChute`, `inimigoProjetil`. |
| `tempoChute` | Number | Duração (em frames) da animação e da hitbox ativa do chute. |
| `cooldownChute` | Number | Tempo de espera para poder chutar novamente. |
| `impulsoChute` | Number | Pequeno "dash" que o personagem dá para frente ao chutar. |
| `cooldownTiro` | Number | Intervalo entre disparos de projéteis. |
| `maxMunicao` | Number | Quantidade de munição recebida ao coletar o revólver. |

## 3. Equipamentos (Escudo e Arma)

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `escudoKnockbackMultiplicador` | Number | Multiplicador de empuxo recebido quando o escudo está ativo (ex: 0.5 reduz em 50%). |
| `escudoVelocidadeReduzida` | Number | Valor subtraído da velocidade do player quando ele carrega um escudo funcional. |
| `escudoTirosProtegidos` | Number | Quantos ataques o escudo aguenta antes de quebrar (ficar vermelho). |
| `bonusVelocidadeBota` | Number | Velocidade adicional concedida ao personagem (jogador ou inimigo) que estiver usando botas. |
| `bonusPuloBota` | Number | Força extra adicionada ao pulo quando as botas estão equipadas. |

## 4. Inteligência Artificial (Inimigos)

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `distanciaTiroInimigo` | Number | Distância máxima em pixels para o inimigo começar a atirar. |
| `distanciaAtaqueInimigo` | Number | Distância mínima para o inimigo tentar um chute. |
| `inimigoPuloDistanciaAlerta` | Number | Distância de detecção de projéteis vindo na direção do inimigo. |
| `inimigoPuloDelayMin` / `Max` | Number | Range de frames aleatórios que o inimigo espera antes de pular para desviar de um tiro. |
| `debugInimigosParados` | Boolean | Se `true`, os inimigos não se movem (útil para testes). |
| `inimigoDistanciaMinimaAtaque` | Number | Distância mínima permitida entre o inimigo e o jogador antes de forçar um afastamento. |
| `inimigoTempoAfastamento` | Number | Duração (em frames) do estado de recuo do inimigo. |
| `inimigoVelocidadeAfastamento` | Number | Velocidade com que o inimigo se afasta do jogador. |
| `inimigoCooldownAfastamento` | Number | Tempo de espera para o inimigo poder se afastar novamente por proximidade. |

## 5. Projéteis

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `velocidadeProjetil` | Number | Velocidade de deslocamento horizontal do tiro. |
| `PROJETIL_LARGURA` | Number | Largura da imagem/hitbox do projétil. |
| `PROJETIL_ALTURA` | Number | Altura da imagem/hitbox do projétil. |

## 6. Hitboxes e Ajustes Técnicos

| Chave | Tipo | Descrição |
| :--- | :--- | :--- |
| `HITBOX_LARGURA` | Number | Largura real do corpo para colisões. |
| `escalaPalco` | Number | Fator de zoom visual do jogo (ex: 1.5 aumenta em 50%, 2.0 dobra o tamanho). |
| `HITBOX_ALTURA` | Number | Altura real do corpo para colisões. |
| `HITBOX_OFFSET_X` | Number | Ajuste horizontal para centralizar a hitbox no sprite. |
| `ATAQUE_LARGURA` | Number | Largura da área de dano do chute. |
| `ATAQUE_ALTURA` | Number | Altura da área de dano do chute. |
| `ATAQUE_OFFSET_X` | Number | Distância horizontal do início do chute em relação ao corpo. |
| `ATAQUE_OFFSET_Y` | Number | Ajuste vertical da altura do chute. |

## 7. Caminhos de Sprites (Assets)

| Chave | Descrição |
| :--- | :--- |
| `spriteParadoPlayer` / `Inimigo` | Imagem do personagem estático. |
| `spriteAndandoPlayer` / `Inimigo` | Imagem/Sprite sheet de caminhada. |
| `spriteChutePlayer` / `Inimigo` | Imagem da pose de ataque. |
| `spriteEscudoPlayer` | Escudo azul/normal. |
| `spriteEscudoVermelho` | Escudo danificado. |
| `spriteArmaPlayer` | Revólver normal. |
| `spriteArmaVermelha` | Revólver sem munição. |
| `spriteProjetil` | Imagem da bala no ar. |
| `spriteItemEscudo` | Item coletável no chão. |
| `spriteItemBota` | Item de bota coletável no chão. |
| `spriteItemRevolver` | Item de arma coletável no chão. |
| `spriteBotaParado` | Visual da bota equipada em estado estático. |
| `spriteBotaAndando` | Visual da bota equipada durante o movimento. |
| `spriteBotaChutando` | Visual da bota equipada durante o ataque de chute. |