/**
 * Gerenciador central de fases e inicialização.
 */


const listaArquivosFases = ["fase1.json", "fase2.json", "fase3.json", "fase4.json", "fase5.json", "fase6.json", "fase7.json", "fase8.json", "fase9.json"];
window.niveis = listaArquivosFases.map(nome => `../../config/fases/${nome}`);
window.nivelAtual = 0;
window.isTraining = false; // Flag para identificar se o jogador está no modo treino
window.intervalInimigoAleatorio = null; // Armazena o ID do setInterval para inimigo aleatório
window.timeoutPrimeiroInimigoAleatorio = null; // Armazena o timeout do primeiro inimigo

// ⭐ Escala atual do jogo
window.escalaAtual = 1;

// 📍 Rastreamento de direção para câmera grande
window.ultimaDirecaoX = 0; // -1 = esquerda, 0 = parado, 1 = direita
window.ultimaDirecaoY = 0; // -1 = baixo, 0 = parado, 1 = cima

function limparAnimacaoDanoJogador() {
    const playerEl = document.getElementById('player');
    if (!playerEl) return;

    // Remove qualquer resíduo visual de flash/vibração de dano.
    playerEl.style.filter = 'none';
    playerEl.style.transition = '';

    // Reaplica apenas o espelhamento padrão do sprite.
    const direcao = window.playerControle?.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    playerEl.style.transform = direcao;
}



async function carregarFase(nomeArquivo) {

    limparAnimacaoDanoJogador();

    
    // Tenta encontrar o container para controle de exibição
    const palcoElemento = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (palcoElemento) {
        palcoElemento.style.display = 'none'; // "Esconde" brevemente para forçar o browser a renderizar do zero
    }

    // Limpa o intervalo anterior de inimigo aleatório se existir
    if (window.intervalInimigoAleatorio !== null) {
        clearInterval(window.intervalInimigoAleatorio);
        window.intervalInimigoAleatorio = null;
    }
    
    // Limpa o timeout do primeiro inimigo se existir
    if (window.timeoutPrimeiroInimigoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroInimigoAleatorio);
        window.timeoutPrimeiroInimigoAleatorio = null;
    }
    
    let fase;
    try {
        const resposta = await fetch(nomeArquivo);
        if (!resposta.ok) throw new Error(`Erro ${resposta.status}: ${nomeArquivo} não encontrado.`);
        fase = await resposta.json();
    } catch (erro) {
        console.error("Erro ao carregar nível:", erro);
        alert("Erro técnico: O arquivo da fase não foi encontrado ou está corrompido.");
        return; // Interrompe a função para não quebrar o restante do código
    }

    // Configura as dimensões do mundo baseadas na proporção definida no JSON (ex: "1x2")
    const proporcao = fase.proporcao || "1x1";
    const parts = proporcao.split('x').map(Number);
    const multH = parts[0] || 1;
    const multW = parts[1] || 1;

    window.mundoLargura = 640 * multW;
    window.mundoAltura = 480 * multH;

    // Limpa cenário anterior
    const idPalco = 'game-stage';
    if (typeof limparCenario === 'function') limparCenario(idPalco);

    // Redimensiona stage para o tamanho da fase
    const gameStage = document.getElementById(idPalco);
    if (gameStage) {
        gameStage.style.width = window.mundoLargura + 'px';
        gameStage.style.height = window.mundoAltura + 'px';
    }

    // Registra plataformas para sistema de colisão
    if (typeof renderizarPlataformas === 'function') {
        // Garante que o objeto de colisão global contenha todos os blocos sólidos (Grama + Neve)
        window.plataformas = {};
        
        // Blocos padrão (colisão cheia 32x32)
        const blocosPadrao = [...(fase.plataformas || []), ...(fase.plataformasNeve || [])];
        blocosPadrao.forEach(coord => {
            window.plataformas[coord.trim().toLowerCase()] = true;
        });

        // Estacas (colisão personalizada)
        if (fase.plataformasEstacaSup) {
            fase.plataformasEstacaSup.forEach(coord => {
                // Estaca Superior: colisão na metade superior do bloco
                // yOffset: 16 → Começa a colisão 16px abaixo (na metade do bloco)
                // height: 16 → Colisão tem 16px de altura (metade)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'cima', yOffset: 16, height: 16 };
            });
        }

        // Estacas Direita (colisão personalizada)
        // ⚠️ INICIALIZAÇÃO ESTACAS DIREITA (Linha 93)
        // Spikes apontam para a DIREITA, bloqueiam colisão na ESQUERDA
        if (fase.plataformasEstacaDir) {
            fase.plataformasEstacaDir.forEach(coord => {
                // Estaca Direita: pontas apontando para direita, bloqueia metade ESQUERDA
                // xOffset: 16 → Começa a colisão 16px da esquerda (BLOQUEANTE)
                // width: 16 → Colisão tem 16px de largura (metade esquerda)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'direita', xOffset: 16, width: 16 };
            });
        }

        // ⚠️ INICIALIZAÇÃO ESTACAS ESQUERDA (Linha 103)
        // Spikes apontam para a ESQUERDA, bloqueiam colisão na DIREITA
        if (fase.plataformasEstacaEsq) {
            fase.plataformasEstacaEsq.forEach(coord => {
                // Estaca Esquerda: pontas apontando para esquerda, bloqueia metade DIREITA
                // xOffset: 16 → Começa a colisão 16px da esquerda (BLOQUEANTE)
                // width: 16 → Colisão tem 16px de largura (metade direita)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'esquerda', xOffset: 16, width: 16 };
            });
        }

        // ⚠️ INICIALIZAÇÃO ESTACAS BAIXO (Linha 113)
        // Spikes apontam para BAIXO, bloqueiam colisão na PARTE SUPERIOR
        if (fase.plataformasEstacaBaixo) {
            fase.plataformasEstacaBaixo.forEach(coord => {
                // Estaca Baixo: colisão na metade inferior do bloco
                // yOffset: 0 → Começa na base do bloco
                // height: 16 → Colisão tem 16px de altura (metade)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'baixo', yOffset: 0, height: 16 };
            });
        }

        // Renderiza todas as plataformas da fase
        renderizarPlataformas(idPalco, '../../assets/personagem/chao.png', fase.plataformas || []);
        if (fase.plataformasNeve) {
            renderizarPlataformas(idPalco, '../../assets/personagem/chao_neve.png', fase.plataformasNeve);
        }
        if (fase.plataformasEstacaSup) {
            renderizarPlataformas(idPalco, '../../assets/personagem/estacasup.png', fase.plataformasEstacaSup);
        }
        if (fase.plataformasEstacaDir) {
            renderizarPlataformas(idPalco, '../../assets/personagem/estacadir.png', fase.plataformasEstacaDir);
        }
        if (fase.plataformasEstacaEsq) {
            renderizarPlataformas(idPalco, '../../assets/personagem/estacaesq.png', fase.plataformasEstacaEsq);
        }
        if (fase.plataformasEstacaBaixo) {
            renderizarPlataformas(idPalco, '../../assets/personagem/estacasdown.png', fase.plataformasEstacaBaixo);
        }
    }
    
    // Renderiza objetivo da fase
    if (typeof renderizarObjetivo === 'function') {
        renderizarObjetivo(idPalco, '../../assets/personagem/objetivo.png', fase.objetivo);
    }

    // Reseta câmera para o início
    if (typeof window.resetarCamera === 'function') window.resetarCamera();

    // Mostra o palco
    if (palcoElemento) {
        palcoElemento.style.display = 'block';
    }

    // Inicializa posição do jogador
    if (window.playerControle) {
        const pos = typeof fase.posicaoInicialJogador === 'string' 
            ? (typeof window.gridParaPixels === 'function' ? window.gridParaPixels(fase.posicaoInicialJogador) : {x: 0, y: 0})
            : fase.posicaoInicialJogador;
        window.playerControle.x = pos.x;
        window.playerControle.y = pos.y;
        window.playerControle.velocidadeY = 0;
        
        // Reseta estado de entrada e timers
        window.playerControle.teclas = {};
        window.playerControle.movendoHorizontal = false;
        window.playerControle.chutando = false;
        window.playerControle.tempoChute = 0;
        window.playerControle.cooldownChute = 0;
        window.playerControle.cooldownTiro = 0;
        window.playerControle.cooldownPulo = 0;
        
        window.playerControle.airdropUsadoNoNivel = false;
        window.playerControle.noChao = false;

        // Snap instantâneo da câmera para o spawn do jogador (sem lerp).
        const centroSnapX = window.playerControle.x + ((window.playerControle.largura || 20) / 2);
        const centroSnapY = window.playerControle.y + ((window.playerControle.altura || 30) / 2);
        const snapTargetX = centroSnapX - 320;
        const snapTargetY = window.mundoAltura - centroSnapY - 240;
        window.cameraX = Math.max(0, Math.min(snapTargetX, window.mundoLargura - 640));
        window.cameraY = Math.max(0, Math.min(snapTargetY, window.mundoAltura - 480));
        if (typeof window.atualizarCamera === 'function') {
            window.atualizarCamera(centroSnapX, centroSnapY, window.mundoLargura, window.mundoAltura);
        }
    }

    // Carrega inimigos da fase
    if (typeof resetarInimigos === 'function') {
        const inimigosParaReset = [];
        if (fase.inimigos1) fase.inimigos1.forEach(p => inimigosParaReset.push({tipo: 1, pos: p}));
        if (fase.inimigos0) fase.inimigos0.forEach(p => inimigosParaReset.push({tipo: 0, pos: p}));
        if (fase.inimigos2) fase.inimigos2.forEach(p => inimigosParaReset.push({tipo: 2, pos: p}));
        if (fase.inimigos3) fase.inimigos3.forEach(p => inimigosParaReset.push({tipo: 3, pos: p}));
        if (fase.inimigos4) fase.inimigos4.forEach(p => inimigosParaReset.push({tipo: 4, pos: p}));
        if (fase.inimigos5) fase.inimigos5.forEach(p => inimigosParaReset.push({tipo: 5, pos: p}));
        if (fase.inimigos6) fase.inimigos6.forEach(p => inimigosParaReset.push({tipo: 6, pos: p}));
        
        resetarInimigos(inimigosParaReset);
    }

    // Carrega itens iniciais da fase
    if (typeof window.resetarItens === 'function') {
        window.resetarItens(fase.itens || []);
    }

    // Configura spawn de inimigos aleatórios
    if (Array.isArray(fase.inimigoAleatorio) && fase.inimigoAleatorio.length === 2) {
        const dificuldade = fase.inimigoAleatorio[0]; // 1, 2 ou 3
        const tipoEquipamento = fase.inimigoAleatorio[1]; // 0, 1 ou 2
        
        // Calcula o tempo baseado na dificuldade
        let tempoEmMs = 60000; // padrão: 1 minuto
        if (dificuldade === 1) {
            tempoEmMs = 60000; // 1 minuto
        } else if (dificuldade === 2) {
            tempoEmMs = 45000; // 45 segundos
        } else if (dificuldade === 3) {
            tempoEmMs = 30000; // 30 segundos
        }
        

        
        // Define uma função para criar o inimigo repetidamente
        const criarInimigoRepetido = () => {
            // Verifica se o jogo está pausado antes de prosseguir com o spawn
            if (window.isPaused) return;

            if (typeof criarInimigoAleatorio === 'function') {
                const todasAsPlataformas = [...(fase.plataformas || []), ...(fase.plataformasNeve || [])];
                criarInimigoAleatorio(todasAsPlataformas, tipoEquipamento);
            }
        };
        
        // Cria o primeiro inimigo após o tempo especificado
        window.timeoutPrimeiroInimigoAleatorio = setTimeout(() => {
            criarInimigoRepetido();
            
            // Depois começa o intervalo repetido
            window.intervalInimigoAleatorio = setInterval(() => {
                criarInimigoRepetido();
            }, tempoEmMs);
            
            window.timeoutPrimeiroInimigoAleatorio = null;
        }, tempoEmMs);
    }
}

// Avança para próxima fase
window.proximoNivel = async function() {
    // Retorna ao menu se em modo treino
    if (window.isTraining) {
        window.isTraining = false;
        alert("Treino Concluído!");
        if (typeof window.togglePauseMenu === 'function') window.togglePauseMenu();
        return;
    }

    const proximoIndice = window.nivelAtual + 1;

    if (proximoIndice < window.niveis.length) {
        alert("Parabéns! Você concluiu esta fase.");
        window.nivelAtual = proximoIndice;
        await carregarFase(window.niveis[window.nivelAtual]);
    } else {
        alert("FIM DE JOGO! Você completou todos os níveis.");
        if (typeof window.reiniciarJogo === 'function') {
            // Ao zerar o jogo, podemos optar por voltar para a fase 1 (índice 0)
            window.nivelAtual = 0; 
            await window.reiniciarJogo(false); // Passa 'false' para indicar que NÃO foi por morte
        }
    }
};

// Reinicia a fase atual
window.reiniciarJogo = async function(porMorte = true) {
    limparAnimacaoDanoJogador();

    // Cancela spawns de inimigos aleatórios
    if (window.intervalInimigoAleatorio !== null) {
        clearInterval(window.intervalInimigoAleatorio);
        window.intervalInimigoAleatorio = null;
    }
    if (window.timeoutPrimeiroInimigoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroInimigoAleatorio);
        window.timeoutPrimeiroInimigoAleatorio = null;
    }
    
    // Reseta estado do jogador
    if (window.playerControle) {
        window.isTraining = false; // Garante que sai do modo treino ao reiniciar o jogo normal
        window.playerControle.dano = 0;
        window.playerControle.teclas = {};
        window.playerControle.movendoHorizontal = false;
        window.playerControle.chutando = false;
        window.playerControle.tempoChute = 0;
        window.playerControle.cooldownChute = 0;
        window.playerControle.cooldownTiro = 0;
        window.playerControle.cooldownPulo = 0;
        window.playerControle.danoProjetil = 1; // Reset projectile damage
        window.playerControle.velocidadeY = 0;
        window.playerControle.framesKnockbackRestante = 0;
        window.playerControle.velocidadeKnockback = 0;
        window.playerControle.airdropUsadoNoNivel = false;
        window.playerControle.noChao = false;
        window.playerControle.direcao = 'd';
        
        window.playerControle.jetpackAtivo = false;
        window.playerControle.timerAtivacaoJetpack = 0;
        window.playerControle.timerVooRestante = 0;
        window.playerControle.cooldownVooJetpack = 0;
        window.playerControle.jetpackHovering = false;

        // Restaura itens coletados
        if (window.playerControle.temEscudo || window.playerControle.escudoVermelho) {
            window.playerControle.temEscudo = true;
            window.playerControle.escudoVermelho = false;
            window.playerControle.escudoProtegido = 0;
        }
        if (window.playerControle.temArma) {
            window.playerControle.municao = window.config.maxMunicao || 5;
        }

        // Reaplicaa bônus das skills
        if (typeof window.aplicarEfeitosSkills === 'function') {
            window.aplicarEfeitosSkills();
        }

        // Mantém equipamentos adquiridos
        if (window.playerControle.temBota) {
            window.playerControle.temBota = true;
        }
        if (window.playerControle.temJetpack) {
            window.playerControle.temJetpack = true;
        }
        if (window.playerControle.temGarra) {
            window.playerControle.temGarra = true;
        }
        if (typeof window.salvarInventario === 'function') {
            window.salvarInventario();
        }
    }
    
    // Reseta progresso apenas se morte
    if (porMorte && typeof window.resetarProgressoParaJson === 'function') {
        await window.resetarProgressoParaJson();
    }

    // Retorna à fase inicial
    window.nivelAtual = (window.config && window.config.faseInicial !== undefined) ? window.config.faseInicial : 0;
    await carregarFase(window.niveis[window.nivelAtual]);
    
    // Atualiza visual dos itens
    if (window.playerControle && typeof window.atualizarVisualEscudo === 'function') {
        window.atualizarVisualEscudo();
    }
};

// Inicializa o jogo e carrega primeira fase
async function iniciarJogo() {
    window.isFirstStart = true;

    // Carrega configurações globais
    const respostaConfig = await fetch('../../config/configuracoes.json');
    const config = await respostaConfig.json();
    window.config = config;
    window.nivelAtual = (config.faseInicial !== undefined) ? config.faseInicial : 0;

    // Carrega dados de skills e progresso
    if (typeof window.carregarDadosSkills === 'function') {
        await window.carregarDadosSkills();
    }

    // Calcula escala máxima proporcionalmente ao tamanho da tela
    const baseWidth = 640;   // Viewport base
    const baseHeight = 480;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    
    // Qual a maior escala que cabe em cada dimensão
    const scaleX = Math.floor(maxWidth / baseWidth);
    const scaleY = Math.floor(maxHeight / baseHeight);
    const maxScale = Math.max(1, Math.min(scaleX, scaleY, 4)); // Limita a 4x e garante mínimo 1x
    
    // Nota: opção 1 - viewport lógico fica fixo em 640x480
    // A ampliação é aplicada no container (wrapper), não na câmera.
    window.escalaAtual = config.escalaPalco; // Mantém zoom conforme config

    // Configura viewport base fixa e aplica escala visual no container
    const container = document.getElementById('jogo-container');
    if (container) {
        container.style.width = baseWidth + 'px';
        container.style.height = baseHeight + 'px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.style.display = 'block';
        container.style.margin = '0 auto';
        container.style.top = '0';
        container.style.left = '0';
        container.style.transform = `scale(${maxScale})`;
        container.style.transformOrigin = 'center center';
        
        // Armazena a escala automática para debug/seleção de modo
        window.autoScaleMultiplier = maxScale;
    }

    // Função para recalcular escala ao redimensionar a tela
    let resizeTimeout = null;
    window.recalcularTamanhoJogo = function() {
        // Debounce: evita recalcular muitas vezes enquanto o usuário arrasta
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
            const baseWidth = 640;
            const baseHeight = 480;
            const maxWidth = window.innerWidth;
            const maxHeight = window.innerHeight;
            
            // Recalcula escala máxima
            const scaleX = Math.floor(maxWidth / baseWidth);
            const scaleY = Math.floor(maxHeight / baseHeight);
            const newMaxScale = Math.max(1, Math.min(scaleX, scaleY, 4));
            
            // Apenas atualiza se a escala mudou
            if (newMaxScale !== window.autoScaleMultiplier) {
                window.autoScaleMultiplier = newMaxScale;
                
                const container = document.getElementById('jogo-container');
                if (container) {
                    container.style.width = baseWidth + 'px';
                    container.style.height = baseHeight + 'px';
                    container.style.transform = `scale(${newMaxScale})`;
                    container.style.transformOrigin = 'center center';
                }
                
                // Reaplica a câmera com nova escala
                if (typeof window.resetarCamera === 'function') {
                    window.resetarCamera();
                }
            }
        }, 150); // Aguarda 150ms após parar de redimensionar
    };
    
    // Listener para redimensionamento da tela
    window.addEventListener('resize', window.recalcularTamanhoJogo);

    // Inicializa sistemas de movimento, IA e renderização
    await iniciarMovimentacao(
        'player',
        config.velocidadePlayer || 4,
        '../../assets/personagem/Personagem_parado.png',
        '../../assets/personagem/Personagem_andando.png',
        '../../assets/personagem/personagem_chute2.png',
        '../../assets/personagem/personagem_no_ar.png'
    );
    await iniciarIAInimigos(1, '../../assets/personagem/Personagem_parado.png', '../../assets/personagem/Personagem_andando.png', '../../assets/personagem/personagem_chute2.png');
    
    // Carrega fase e abre menu inicial
    await carregarFase(window.niveis[window.nivelAtual]);
    if (typeof window.togglePauseMenu === 'function') {
        window.togglePauseMenu();
    }
}

// Atalho de Debug: Avançar de fase
window.addEventListener('keydown', (e) => {
    if (e.key === '4') {
        if (typeof window.proximoNivel === 'function') window.proximoNivel();
    }
});
