/**
 * Gerenciador central de fases e inicialização.
 */


const listaArquivosFases = ["fase1.json", "fase2.json", "fase3.json", "fase4.json", "fase5.json", "fase6.json", "fase7.json", "fase8.json", "fase9.json"];
window.niveis = listaArquivosFases.map(nome => `fases/${nome}`);
window.nivelAtual = 0;
window.isTraining = false; // Flag para identificar se o jogador está no modo treino
window.intervalInimigoAleatorio = null; // Armazena o ID do setInterval para inimigo aleatório
window.timeoutPrimeiroInimigoAleatorio = null; // Armazena o timeout do primeiro inimigo

// Dimensões globais do mundo atual
window.mundoLargura = 640;
window.mundoAltura = 480;

async function carregarFase(nomeArquivo) {
    // console.log(`Carregando nível: ${nomeArquivo}`);
    
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

    console.log(`[DEBUG CAMERA] Fase: ${nomeArquivo} | Proporção: ${proporcao} | Mundo: ${window.mundoLargura}x${window.mundoAltura}`);

    // 1. Limpa o cenário anterior (tiles, inimigos e itens)
    const idPalco = 'game-stage';
    if (typeof limparCenario === 'function') limparCenario(idPalco);

    // Ajusta o tamanho do palco para as dimensões do novo mundo
    const gameStage = document.getElementById(idPalco);
    if (gameStage) {
        gameStage.style.width = window.mundoLargura + 'px';
        gameStage.style.height = window.mundoAltura + 'px';
        console.log(`[DEBUG CAMERA] Palco (#game-stage) redimensionado: ${window.mundoLargura}x${window.mundoAltura}`);
    }

    // 2. Renderiza as novas plataformas e o objetivo
    if (typeof renderizarPlataformas === 'function') {
        renderizarPlataformas(idPalco, 'personagem/chao.png', fase.plataformas);
    }
    if (typeof renderizarObjetivo === 'function') {
        renderizarObjetivo(idPalco, 'personagem/objetivo.png', fase.objetivo);
    }

    // Reseta a posição da câmera para o início da fase
    if (typeof window.resetarCamera === 'function') window.resetarCamera();

    // Exibe o palco novamente após a montagem
    if (palcoElemento) {
        palcoElemento.style.display = 'block';
    }

    // 3. Posiciona o jogador
    if (window.playerControle) {
        const pos = typeof fase.posicaoInicialJogador === 'string' 
            ? (typeof window.gridParaPixels === 'function' ? window.gridParaPixels(fase.posicaoInicialJogador) : {x: 0, y: 0})
            : fase.posicaoInicialJogador;
        window.playerControle.x = pos.x;
        window.playerControle.y = pos.y;
        window.playerControle.velocidadeY = 0;
        
        // CORREÇÃO: Reseta o estado de entrada e timers para evitar que o personagem ande/pule sozinho
        window.playerControle.teclas = {};
        window.playerControle.movendoHorizontal = false;
        window.playerControle.chutando = false;
        window.playerControle.tempoChute = 0;
        window.playerControle.cooldownChute = 0;
        window.playerControle.cooldownTiro = 0;
        window.playerControle.cooldownPulo = 0;
        
        window.playerControle.airdropUsadoNoNivel = false;
        window.playerControle.noChao = false; // Garante que a física recalcule o chão no novo local
    }

    // 4. Cria os novos inimigos
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

    // 5. Cria os itens iniciais da fase (como o escudo)
    if (typeof window.resetarItens === 'function') {
        window.resetarItens(fase.itens || []);
    }

    // 6. Configura o intervalo para inimigo aleatório (se habilitado)
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
        
        let nomeEquipamento = 'sem equipamento';
        if (tipoEquipamento === 1) nomeEquipamento = 'revólver';
        else if (tipoEquipamento === 2) nomeEquipamento = 'escudo';
        
        const tempoSegundos = tempoEmMs / 1000;
        // console.log(`Inimigo aleatório habilitado! Equipamento: ${nomeEquipamento}. Aparecerá a cada ${tempoSegundos}s.`);
        
        // Define uma função para criar o inimigo repetidamente
        const criarInimigoRepetido = () => {
            // Verifica se o jogo está pausado antes de prosseguir com o spawn
            if (window.isPaused) return;

            if (typeof criarInimigoAleatorio === 'function') {
                criarInimigoAleatorio(fase.plataformas, tipoEquipamento);
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

window.proximoNivel = async function() {
    // Se estiver no modo treino, volta para o menu ao atingir o objetivo
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

window.reiniciarJogo = async function(porMorte = true) {
    // Limpa o intervalo de inimigo aleatório se existir
    if (window.intervalInimigoAleatorio !== null) {
        clearInterval(window.intervalInimigoAleatorio);
        window.intervalInimigoAleatorio = null;
    }
    
    // Limpa o timeout do primeiro inimigo aleatório se existir
    if (window.timeoutPrimeiroInimigoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroInimigoAleatorio);
        window.timeoutPrimeiroInimigoAleatorio = null;
    }
    
    // Reseta o dano do jogador e o estado de controle
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
        window.playerControle.jetpackHovering = false; // Reseta o estado de pairar

        // Reseta itens coletados para o máximo e restaura o escudo se estiver quebrado
        if (window.playerControle.temEscudo || window.playerControle.escudoVermelho) {
            window.playerControle.temEscudo = true; // Garante que volte a ser funcional
            window.playerControle.escudoVermelho = false; // Volta para a cor azul
            window.playerControle.escudoProtegido = 0; // Reseta a vida do escudo
        }
        if (window.playerControle.temArma) {
            window.playerControle.municao = window.config.maxMunicao || 5;
        }

        // Re-aplica os bônus das habilidades adquiridas após resetar os valores base
        if (typeof window.aplicarEfeitosSkills === 'function') {
            window.aplicarEfeitosSkills();
        }

        // Mantém a bota se ela já foi coletada
        if (window.playerControle.temBota) {
            window.playerControle.temBota = true;
        }
        // Mantém o jetpack se ele já foi coletado
        if (window.playerControle.temJetpack) {
            window.playerControle.temJetpack = true;
        }
        // Mantém a garra se ela já foi coletada
        if (window.playerControle.temGarra) {
            window.playerControle.temGarra = true;
        }
        if (typeof window.salvarInventario === 'function') {
            window.salvarInventario();
        }
    }
    
    // Reseta o progresso (XP e Skills) apenas se o reinício for causado por morte
    if (porMorte && typeof window.resetarProgressoParaJson === 'function') {
        await window.resetarProgressoParaJson();
    }

    // Volta para a fase definida nas configurações (ou 0 por padrão)
    window.nivelAtual = (window.config && window.config.faseInicial !== undefined) ? window.config.faseInicial : 0;
    await carregarFase(window.niveis[window.nivelAtual]);
    
    // Atualiza visual dos itens após carregar a fase
    if (window.playerControle && typeof window.atualizarVisualEscudo === 'function') {
        window.atualizarVisualEscudo();
    }
};

// Função para iniciar o jogo pela primeira vez
async function iniciarJogo() {
    // Marca que o jogo está iniciando agora para ajustar o menu inicial
    window.isFirstStart = true;

    // Busca a configuração para saber por qual fase começar
    const respostaConfig = await fetch('configuracoesGerais.json');
    const config = await respostaConfig.json();
    window.config = config; // Torna config global
    window.nivelAtual = (config.faseInicial !== undefined) ? config.faseInicial : 0;

    // Carrega o progresso de habilidades e XP antes de iniciar o jogo
    if (typeof window.carregarDadosSkills === 'function') {
        await window.carregarDadosSkills();
    }

    // Configura o Viewport (A janela de 640x480 por onde vemos o jogo)
    const container = document.getElementById('jogo-container');
    if (container) {
        container.style.width = '640px';
        container.style.height = '480px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.style.display = 'block';
        
        console.log(`[DEBUG VIEWPORT] Container encontrado! Tamanho: ${container.style.width}x${container.style.height} | Overflow: ${container.style.overflow}`);
        
        if (config.escalaPalco) {
            container.style.transform = `scale(${config.escalaPalco})`;
            container.style.transformOrigin = 'top left';
        }
    } else {
        const stage = document.getElementById('game-stage');
        console.error("[DEBUG VIEWPORT] ERRO CRÍTICO: #jogo-container não encontrado no HTML!");
        if (stage) {
            console.log("[DEBUG VIEWPORT] Dica: O #game-stage existe.");
            console.log("[DEBUG VIEWPORT] O pai do #game-stage atualmente é:", stage.parentElement.tagName, "ID:", stage.parentElement.id || "Nenhum");
            console.log("[DEBUG VIEWPORT] Para a câmera funcionar, o pai do #game-stage DEVE ter o ID 'jogo-container'.");
        }
    }

    // Inicia os sistemas básicos (apenas uma vez)
    await iniciarMovimentacao(
        'player', 
        config.velocidadePlayer || 4, 
        'personagem/Personagem_parado.png', 
        'personagem/Personagem_andando.png', 
        'personagem/personagem_chute2.png',
        'personagem/personagem_no_ar.png'
    );
    await iniciarIAInimigos(1, 'personagem/Personagem_parado.png', 'personagem/Personagem_andando.png', 'personagem/personagem_chute2.png');
    
    // Carrega a fase atual e abre o menu de pause interativo imediatamente
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