/**
 * runner-core.js
 * Gerenciador de rolagem automática para o modo Runner.
 * 
 * Desenvolvido para funcionar sem alterar arquivos core do sistema.
 */
(function () {
    const RUNNER_CONFIG = {
        velocidadePadrao: 2,
        velocidadeMaxima: 5,     // Velocidade máxima permitida (Requisito 9)
        incrementoVelocidade: 0.0002, // Aceleração por frame (Requisito 9)
        toleranciaBorda: 2, // Pixels extras para evitar mortes injustas por precisão
        distanciaGerecao: 1200, // Quão longe à frente do player o chão é gerado
        tamanhoChunk: 640, // Quantos pixels de chão gerar por vez
        distanciaLimpeza: 500, // Distância atrás da câmera para apagar tiles
        spriteChao: '../../assets/bloco terra/terra_horizontal.png',
        spriteEspinho: '../../assets/personagem/estacasup.png',
        tamanhoSegmento: 50, // Quantidade de blocos antes de mudar de área (Requisito 14)
        segmentos: ['plano', 'espinhos', 'saltos'], // Áreas que serão intercaladas
        chanceEspinhoNoPerigo: 0.20, // 25% de chance de espinho na área de perigo
        chanceEspinhoOnPlatform: 0.02, // 2% de chance de espinho em plataforma no bioma 'saltos' (Reduzido por pedido)
        saltosConfig: { // Configurações para o bioma 'saltos' (Requisito 15)
            chanceGap: 0.05, // 5% de chance de gerar um buraco
            minGapTiles: 1, maxGapTiles: 2, // Buracos de 1 a 2 tiles de largura (Reduzido por pedido)
            minPlatformTiles: 1, maxPlatformTiles: 2, // Pilares de 1 a 2 tiles de largura (Melhoria: Pilares)
            minPlatformHeightTiles: 1, maxPlatformHeightTiles: 3 // Pilares de 1 a 3 blocos de altura
        }
    };

    let ultimaLimpezaX = 0;
    let originalAtualizarCamera = null; // Backup para restaurar o motor original
    let elementosVisuais = {}; // Mapeia chave -> Elemento DOM para limpeza
    // Variáveis de estado para o gerador de biomas
    let indiceSegmentoAtual = 0; // Controla qual bioma está ativo
    let blocosGeradosNoSegmento = 0; // Contador para saber quando trocar de bioma
    let consecutiveSpikesCount = 0; // Controla o limite de espinhos consecutivos
    let currentSaltosState = { // Estado específico para o bioma 'saltos'
        isGeneratingPlatform: false, // Estamos gerando uma plataforma ou um buraco?
        tilesRemainingInCurrentFeature: 0, // Quantos tiles faltam para a feature atual (plataforma/buraco)
        currentFeatureHeight: 0 // Altura da plataforma atual (em tiles)
    };

    /**
     * Converte coordenadas de grid para o formato de chave do motor (ex: 0,2 -> "c1")
     */
    function converterGridParaChave(gridX, gridY) {
        const r = gridY;
        const c = gridX;
        const letra = r < 26 
            ? String.fromCharCode(97 + r) 
            : String.fromCharCode(97 + Math.floor(r/26) - 1) + String.fromCharCode(97 + (r % 26));
        return letra + (c + 1);
    }

    /**
     * Extrai o valor de X de uma chave de coordenada (ex: "c12" -> 11)
     */
    function extrairGridX(chave) {
        const match = chave.match(/\d+/);
        return match ? parseInt(match[0]) - 1 : 0;
    }

    /**
     * Hijack da função de câmera do motor principal.
     * No modo Runner, o scroll horizontal é independente da posição do player.
     */
    function runnerAtualizarCamera(x, y, mundoW, mundoH) {
        // Respeita bloqueios de menu do motor original
        if (window.isInteractionMenuOpen || window.isMenuOpen) return;

        // Mantém o timer de tremor ativo (aproximadamente 60fps)
        if (typeof window.atualizarTremorCamera === 'function') {
            window.atualizarTremorCamera(16.6);
        }

        const viewportWidth = window.VIEWPORT?.width || 640;
        const viewportHeight = window.VIEWPORT?.height || 480;
        const zoom = window.cameraZoomFactor || 1;

        const viewW = viewportWidth / zoom;
        const viewH = viewportHeight / zoom;

        // Segue o player apenas verticalmente (Y)
        const snapTargetY = mundoH - y - (viewH / 2);
        window.cameraY = Math.max(0, Math.min(snapTargetY, mundoH - viewH));

        // Aplica o deslocamento visual ao palco (game-stage)
        const stage = document.getElementById('game-stage');
        if (stage) {
            stage.style.transformOrigin = "0 0";
            
            let camX = Math.round(window.cameraX);
            let camY = Math.round(window.cameraY);

            // Aplica tremor vertical se houver explosões ou dano (lógica do camera.js)
            if (window.cameraTremorAtivo) {
                camY += (Math.random() * window.cameraTremorIntensidade) - (window.cameraTremorIntensidade / 2);
            }

            // Centralização caso o mundo seja menor que o viewport (ex: no início da fase)
            const offsetX = mundoW < viewW ? (viewW - mundoW) / 2 : 0;
            const offsetY = mundoH < viewH ? (viewH - mundoH) / 2 : 0;

            stage.style.transform = `scale(${zoom}) translate(${Math.round(offsetX - camX)}px, ${Math.round(offsetY - camY)}px)`;
        }
    }

    /**
     * Cria um elemento <img> no palco para representar o bloco ou espinho.
     */
    function criarElementoVisual(chave, gridX, gridY, ehEspinho) {
        const img = document.createElement('img');
        img.src = ehEspinho ? RUNNER_CONFIG.spriteEspinho : RUNNER_CONFIG.spriteChao;
        img.style.position = 'absolute';
        img.style.width = '32px';
        img.style.height = '32px';
        img.style.left = (gridX * 32) + 'px';
        img.style.bottom = (gridY * 32) + 'px';
        img.style.imageRendering = 'pixelated';
        img.style.zIndex = '5'; // Sincroniza com layer-plataformas
        
        // Tenta adicionar ao layer de plataformas oficial ou ao palco principal
        const container = document.getElementById('layer-plataformas') || document.getElementById('game-stage');
        if (container) container.appendChild(img);
        return img;
    }

    /**
     * Loop principal do modo Runner.
     * Executa paralelamente ao motor do jogo.
     */
    function cicloRunner() {
        requestAnimationFrame(cicloRunner);

        // 1. Verificações de Segurança e Estado
        if (window.isPaused || !window.faseAtualData || !window.faseAtualData.modoRunner) {
            return;
        }

        const player = window.playerControle;
        if (!player || player.estaMorrendo || player.stunned) {
            return;
        }

        // 2. Lógica de Movimento Automático e Progressão (Requisito 9)
        let velocidade = Number(window.faseAtualData.velocidadeRunner || RUNNER_CONFIG.velocidadePadrao);
        
        // Aumenta a dificuldade gradualmente se não atingiu o limite
        if (velocidade < RUNNER_CONFIG.velocidadeMaxima) {
            velocidade += RUNNER_CONFIG.incrementoVelocidade;
            window.faseAtualData.velocidadeRunner = velocidade;
        }
        
        // 2.1 Avanço constante da Câmera (Requisito 18)
        window.cameraX += velocidade;

        // Move o player para frente automaticamente com detecção de colisão (Fix: Requisito 17)
        if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
            window.aplicarDeslocamentoHorizontalComColisaoPadrao(player, velocidade, window.plataformas, {
                largura: player.largura,
                altura: player.altura,
                offsetX: player.offsetX || 0
            });
        } else {
            player.x += velocidade;
        }

        // 3. Geração de Chão e Expansão de Mundo (Requisito 4 e 5)
        // Agora baseado na câmera para garantir cenário mesmo se o player travar
        gerenciarChaoInfinito(Math.max(player.x, window.cameraX));

        // 4. Limpeza de Memória (Requisito 7)
        limparTilesAntigos(window.cameraX);

        // 5. Verificação de Limite (Borda Esquerda)
        // O limite da tela na esquerda é o window.cameraX
        const limiteEsquerdo = window.cameraX;
        
        // Consideramos o offsetX da hitbox do jogador para precisão
        const playerXReal = player.x + (player.offsetX || 0);

        if (playerXReal < (limiteEsquerdo - RUNNER_CONFIG.toleranciaBorda)) {
            executarMortePorBorda();
        }
    }

    /**
     * Permite ativar o modo runner via console a qualquer momento.
     * Agora limpa a fase atual para criar um ambiente do zero.
     */
    window.ativarModoRunner = function(ativar, velocidade = RUNNER_CONFIG.velocidadePadrao) {
        if (ativar) {
            console.info(`[Runner] Iniciando Modo Runner... Limpando ambiente anterior.`);

            // 1. Limpeza de Entidades e Cenário (Usando funções do core)
            if (typeof window.limparCenario === 'function') window.limparCenario('game-stage');
            if (typeof window.resetarInimigos === 'function') window.resetarInimigos([]);
            
            window.itensColetaveis = [];
            window.plataformas = {};
            window.arbustosFrente = [];

            // 1.2 Hijack da Câmera (Requisito 18)
            if (!originalAtualizarCamera && typeof window.atualizarCamera === 'function') {
                originalAtualizarCamera = window.atualizarCamera;
                window.atualizarCamera = runnerAtualizarCamera;
            }

            // 1.1 Limpeza de elementos visuais do Runner
            Object.values(elementosVisuais).forEach(el => el.remove());
            elementosVisuais = {};

            // 2. Criação da Fase Virtual (Requisito 11)
            window.faseAtualData = {
                nome: "Zona de Fuga Infinita",
                modoRunner: true,
                velocidadeRunner: velocidade,
                alturaChaoRunner: 64, // Define o chão um pouco acima do fundo do palco
                proporcao: "1x1"
            };

            // 3. Reset de Mundo e Player (Requisito 10)
            window.mundoLargura = 0; // Começa do zero para o gerador preencher o início
            window.cameraX = 0;
            ultimaLimpezaX = 0;
            indiceSegmentoAtual = 0;
            blocosGeradosNoSegmento = 0;
            consecutiveSpikesCount = 0;
            currentSaltosState = { // Resetar estado do bioma de saltos
                isGeneratingPlatform: false,
                tilesRemainingInCurrentFeature: 0,
                currentFeatureHeight: 0
            };
            // Garante que o primeiro segmento seja sempre 'plano' ao iniciar
            RUNNER_CONFIG.segmentos[0] = 'plano';

            if (window.playerControle) {
                const p = window.playerControle;
                p.x = 100;
                p.y = 120; // Um pouco mais alto para cair suavemente no chão
                p.velocidadeY = 0;
                p.estaMorrendo = false;
                p.stunned = true; // "Congela" o player (Requisito 12)
                p.stunTimer = 20; // 20 frames são suficientes para o cenário carregar
            }

            // 4. Inicia a primeira geração de chão imediatamente
            gerenciarChaoInfinito(0); // Força a geração a partir do X:0

        } else {
            if (window.faseAtualData) window.faseAtualData.modoRunner = false;
            
            // Restaura o comportamento original da câmera
            if (originalAtualizarCamera) {
                window.atualizarCamera = originalAtualizarCamera;
                originalAtualizarCamera = null;
            }

            console.info(`[Runner] Modo Runner DESATIVADO.`);
        }
    };

    /**
     * Gera colisões de chão dinamicamente e expande o mundo.
     */
    function gerenciarChaoInfinito(posicaoReferencia) {
        const limiteMundo = window.mundoLargura || 0;
        
        // Se o player estiver chegando perto do fim do mundo conhecido
        if (posicaoReferencia > (limiteMundo - RUNNER_CONFIG.distanciaGerecao)) {
            const novoLimite = limiteMundo + RUNNER_CONFIG.tamanhoChunk;
            
            // Altura do chão definida na fase ou padrão (Y=0)
            const alturaChao = window.faseAtualData.alturaChaoRunner || 0;
            
            for (let x = limiteMundo; x < novoLimite; x += 32) {
                const gridX = Math.floor(x / 32);
                let yOffsetTile = 0;
                let skipTile = false;
                
                if (window.plataformas) {
                    // Lógica de Segmentos Intercalados (Requisito 14)
                    const tipoArea = RUNNER_CONFIG.segmentos[indiceSegmentoAtual];
                    let ehEspinho = false;

                    if (tipoArea === 'saltos') {
                        consecutiveSpikesCount = 0;
                        // Lógica de geração procedural para o bioma 'saltos' (Requisito 15)
                        if (currentSaltosState.tilesRemainingInCurrentFeature <= 0) {
                            const isGap = Math.random() < RUNNER_CONFIG.saltosConfig.chanceGap;
                            if (isGap) {
                                currentSaltosState.isGeneratingPlatform = false;
                                currentSaltosState.tilesRemainingInCurrentFeature = Math.floor(Math.random() * (RUNNER_CONFIG.saltosConfig.maxGapTiles - RUNNER_CONFIG.saltosConfig.minGapTiles + 1)) + RUNNER_CONFIG.saltosConfig.minGapTiles;
                            } else {
                                currentSaltosState.isGeneratingPlatform = true;
                                currentSaltosState.tilesRemainingInCurrentFeature = Math.floor(Math.random() * (RUNNER_CONFIG.saltosConfig.maxPlatformTiles - RUNNER_CONFIG.saltosConfig.minPlatformTiles + 1)) + RUNNER_CONFIG.saltosConfig.minPlatformTiles;
                                currentSaltosState.currentFeatureHeight = Math.floor(Math.random() * (RUNNER_CONFIG.saltosConfig.maxPlatformHeightTiles - RUNNER_CONFIG.saltosConfig.minPlatformHeightTiles + 1)) + RUNNER_CONFIG.saltosConfig.minPlatformHeightTiles;
                            }
                        }

                        if (currentSaltosState.isGeneratingPlatform) {
                            // Empilha blocos para criar o pilar (Requisito 16: Pilares empilhados)
                            const gridYBase = Math.floor(alturaChao / 32);
                            const alturaPilar = currentSaltosState.currentFeatureHeight;
                            
                            for (let h = 0; h <= alturaPilar; h++) {
                                const currentGridY = gridYBase + h;
                                const chavePilar = converterGridParaChave(gridX, currentGridY);
                                const ehTopo = (h === alturaPilar);
                                const pilarEhEspinho = ehTopo ? (Math.random() < RUNNER_CONFIG.chanceEspinhoOnPlatform) : false;

                                if (!window.plataformas[chavePilar]) {
                                    if (pilarEhEspinho) {
                                        window.plataformas[chavePilar] = { tipo: 'estaca', direcao: 'cima', yOffset: 16, height: 16 };
                                    } else {
                                        window.plataformas[chavePilar] = true;
                                    }
                                    elementosVisuais[chavePilar] = criarElementoVisual(chavePilar, gridX, currentGridY, pilarEhEspinho);
                                }
                            }
                        }
                        skipTile = true; // Sempre pula a renderização padrão no bioma de saltos
                        currentSaltosState.tilesRemainingInCurrentFeature--;
                    } else if (tipoArea === 'espinhos') {
                        // Só tem chance de espinho se estivermos na área de perigo
                        ehEspinho = Math.random() < RUNNER_CONFIG.chanceEspinhoNoPerigo;

                        if (ehEspinho) {
                            consecutiveSpikesCount++;
                            if (consecutiveSpikesCount > 3) {
                                ehEspinho = false;
                                consecutiveSpikesCount = 0;
                            }
                        } else {
                            consecutiveSpikesCount = 0;
                        }
                    } else {
                        // Área plana: ehEspinho sempre false
                        consecutiveSpikesCount = 0;
                    }

                    if (!skipTile) {
                        const gridY = Math.floor((alturaChao + yOffsetTile) / 32);
                        const chave = converterGridParaChave(gridX, gridY);
                        
                        if (ehEspinho) {
                            // Define colisão tipo estaca para o motor de dano reconhecer
                            window.plataformas[chave] = { 
                                tipo: 'estaca', direcao: 'cima', yOffset: 16, height: 16 
                            };
                        } else {
                            window.plataformas[chave] = true;
                        }

                        // Cria a representação visual (IMG) para o bloco
                        elementosVisuais[chave] = criarElementoVisual(chave, gridX, gridY, ehEspinho);
                    }
                }

                // Gerencia a troca de segmentos
                blocosGeradosNoSegmento++;
                if (blocosGeradosNoSegmento >= RUNNER_CONFIG.tamanhoSegmento) {
                    blocosGeradosNoSegmento = 0;
                    indiceSegmentoAtual = (indiceSegmentoAtual + 1) % RUNNER_CONFIG.segmentos.length;
                    // Reset do estado das features ao mudar de bioma
                    currentSaltosState.tilesRemainingInCurrentFeature = 0;
                    consecutiveSpikesCount = 0;
                    console.log(`[Runner] Mudando bioma para: ${RUNNER_CONFIG.segmentos[indiceSegmentoAtual]}`);
                }
            }
            
            // Atualiza a largura do mundo para a câmera não travar
            window.mundoLargura = novoLimite;
        }
    }

    /**
     * Remove tiles que já saíram da tela para evitar consumo excessivo de memória.
     */
    function limparTilesAntigos(cameraX) {
        // Executa a limpeza apenas a cada 320px para poupar CPU
        if (cameraX < ultimaLimpezaX + 320) return;
        ultimaLimpezaX = cameraX;

        const limiteXParaApagar = Math.floor((cameraX - RUNNER_CONFIG.distanciaLimpeza) / 32);

        if (window.plataformas) {
            Object.keys(window.plataformas).forEach(chave => {
                const gridX = extrairGridX(chave);
                if (gridX < limiteXParaApagar) {
                    delete window.plataformas[chave];
                    
                    // Remove o elemento visual do DOM
                    if (elementosVisuais[chave]) {
                        elementosVisuais[chave].remove();
                        delete elementosVisuais[chave];
                    }
                }
            });
        }
    }

    /**
     * Aciona o sistema de morte do jogador definido no motor principal.
     */
    function executarMortePorBorda() {
        if (typeof window.prepararMorteJogador === 'function') {
            // Passamos 1 para o knockback ser para a direita (como se a borda o esmagasse)
            window.prepararMorteJogador(1);
            console.log("[Runner] Game Over: Jogador saiu da tela pela esquerda.");
        } else {
            // Fallback de emergência
            if (window.playerControle) {
                window.playerControle.dano = 99;
                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
            }
        }
    }

    // Inicia o monitoramento assim que o script é carregado
    // Ele ficará em "stand-by" até que uma fase com modoRunner seja detectada.
    document.addEventListener('DOMContentLoaded', () => {
        cicloRunner();
        console.log("[Runner] Sistema Runner inicializado. Use window.ativarModoRunner(true) para começar.");
    });

    // Expõe a função imediatamente após a definição do script
    console.log("[Runner] Script carregado e comandos de console disponíveis.");
})();