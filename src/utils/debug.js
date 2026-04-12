/**
 * Utilitários de Debug
 * Separação de responsabilidades da função debugGameStage()
 * Acessíveis via window.DebugUtils
 */

window.DebugUtils = {
    /**
     * Obtém informações do stage
     * @returns {object} Objeto com todas as informações do stage
     */
    obterInfoStage() {
        const stage = document.getElementById('game-stage');
        const container = document.getElementById('jogo-container');
        
        if (!stage) {
            return { erro: "#game-stage não encontrado no DOM!" };
        }
        
        const rect = stage.getBoundingClientRect();
        const compStyles = window.getComputedStyle(stage);
        const containerRect = container ? container.getBoundingClientRect() : null;
        
        return {
            posicao: {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                right: `${rect.right}px`,
                bottom: `${rect.bottom}px`,
            },
            dimensoes: {
                largura_stage: `${rect.width}px (inline: ${stage.style.width})`,
                altura_stage: `${rect.height}px (inline: ${stage.style.height})`,
                largura_container: containerRect ? `${containerRect.width}px` : "N/A",
                altura_container: containerRect ? `${containerRect.height}px` : "N/A",
            },
            proporcao_fase: {
                mundo_largura: `${window.mundoLargura}px`,
                mundo_altura: `${window.mundoAltura}px`,
                ratio_largura: window.mundoLargura / 640,
                ratio_altura: window.mundoAltura / 480,
            },
            estilos_computados: {
                position: compStyles.position,
                display: compStyles.display,
                top: compStyles.top,
                left: compStyles.left,
                right: compStyles.right,
                bottom: compStyles.bottom,
                background_color: compStyles.backgroundColor,
                overflow: compStyles.overflow,
                z_index: compStyles.zIndex,
            },
            box_model: {
                margin: compStyles.margin,
                padding: compStyles.padding,
                border: compStyles.border,
                box_sizing: compStyles.boxSizing,
            },
            elemento: stage,
        };
    },

    /**
     * Exibe informações de debug no console
     * @param {string} label - Título para o grupo de debug
     */
    exibirDebugStage(label = "Debug #game-stage") {
        const info = this.obterInfoStage();
        
        if (info.erro) {
            console.error(`❌ ${info.erro}`);
            return;
        }
        
        console.group(`🎮 ${label}`);
        
        console.log("%c📍 POSIÇÃO", "color: #00ff00; font-weight: bold;");
        console.table(info.posicao);
        
        console.log("%c📏 DIMENSÕES", "color: #00ffff; font-weight: bold;");
        console.table(info.dimensoes);
        
        console.log("%c🗺️ PROPORÇÃO DA FASE", "color: #ffff00; font-weight: bold;");
        console.table(info.proporcao_fase);
        console.log("➜ Container é uma 'câmera' (viewport) que recorta o mundo via overflow:hidden");
        
        console.log("%c⚙️ ESTILOS COMPUTADOS", "color: #ffaa00; font-weight: bold;");
        console.table(info.estilos_computados);
        
        console.log("%c📦 BOX MODEL", "color: #ff6600; font-weight: bold;");
        console.table(info.box_model);
        
        console.log("%c🌳 ELEMENTO", "color: #aa00ff; font-weight: bold;");
        console.log(info.elemento);
        
        console.groupEnd();
    },

    /**
     * Exibe estado global do jogo no console
     */
    exibirEstadoGlobal() {
        console.group("🎮 ESTADO GLOBAL DO JOGO");
        
        console.table({
            "Escala atual": window.escalaAtual || "N/A",
            "Nível atual": window.nivelAtual,
            "É treino": window.isTraining,
            "Jogo pausado": window.isPaused || "N/A",
            "Menu aberto": window.isMenuOpen || "N/A",
            "Câmera X": window.cameraX,
            "Câmera Y": window.cameraY,
            "Mundo largura": window.mundoLargura,
            "Mundo altura": window.mundoAltura,
        });
        
        if (window.playerControle) {
            console.log("%c👤 JOGADOR", "color: #00ff00; font-weight: bold;");
            console.table({
                "Posição X": window.playerControle.x,
                "Posição Y": window.playerControle.y,
                "Velocidade Y": window.playerControle.velocidadeY,
                "No chão": window.playerControle.noChao,
                "Vida": window.playerControle.vida,
                "Dano recebido": window.playerControle.dano,
            });
        }
        
        console.groupEnd();
    }
};
