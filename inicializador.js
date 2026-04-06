/**
 * Gerenciador central de fases e inicialização.
 */
window.niveis = ["fase1.json", "fase2.json", "fase3.json", "fase4.json"];
window.nivelAtual = 0;
window.intervalInimigoAleatorio = null; // Armazena o ID do setInterval para inimigo aleatório
window.timeoutPrimeiroInimigoAleatorio = null; // Armazena o timeout do primeiro inimigo

async function carregarFase(nomeArquivo) {
    // console.log(`Carregando nível: ${nomeArquivo}`);
    
    // Força a limpeza de qualquer animação ou transição residual no palco
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
    
    const resposta = await fetch(nomeArquivo);
    const fase = await resposta.json();

    // 1. Limpa o cenário anterior (tiles, inimigos e itens)
    const idPalco = 'game-stage';
    if (typeof limparCenario === 'function') limparCenario(idPalco);

    // 2. Renderiza as novas plataformas e o objetivo
    if (typeof renderizarPlataformas === 'function') {
        renderizarPlataformas(idPalco, 'personagem/chao.png', fase.plataformas);
    }
    if (typeof renderizarObjetivo === 'function') {
        renderizarObjetivo(idPalco, 'personagem/objetivo.png', fase.objetivo);
    }

    // Exibe o palco novamente após a montagem
    if (palcoElemento) {
        palcoElemento.style.display = 'block';
    }

    // 3. Posiciona o jogador
    if (window.playerControle) {
        const pos = typeof fase.posicaoInicialJogador === 'string' 
            ? gridParaPixels(fase.posicaoInicialJogador) 
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
        
        resetarInimigos(inimigosParaReset);
    }

    // 5. Cria os itens iniciais da fase (como o escudo)
    if (typeof resetarItens === 'function') {
        resetarItens(fase.itens || []);
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
        window.playerControle.dano = 0;
        window.playerControle.teclas = {};
        window.playerControle.movendoHorizontal = false;
        window.playerControle.chutando = false;
        window.playerControle.tempoChute = 0;
        window.playerControle.cooldownChute = 0;
        window.playerControle.cooldownTiro = 0;
        window.playerControle.cooldownPulo = 0;
        window.playerControle.velocidadeY = 0;
        window.playerControle.framesKnockbackRestante = 0;
        window.playerControle.velocidadeKnockback = 0;
        window.playerControle.airdropUsadoNoNivel = false;
        window.playerControle.noChao = false;
        window.playerControle.direcao = 'd';
        
        // Reseta itens coletados para o máximo e restaura o escudo se estiver quebrado
        if (window.playerControle.temEscudo || window.playerControle.escudoVermelho) {
            window.playerControle.temEscudo = true; // Garante que volte a ser funcional
            window.playerControle.escudoVermelho = false; // Volta para a cor azul
            window.playerControle.escudoProtegido = 0; // Reseta a vida do escudo
        }
        if (window.playerControle.temArma) {
            window.playerControle.municao = window.config.maxMunicao || 5;
        }
        // Mantém a bota se ela já foi coletada
        if (window.playerControle.temBota) {
            window.playerControle.temBota = true;
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
    // Busca a configuração para saber por qual fase começar
    const respostaConfig = await fetch('configuracoesGerais.json');
    const config = await respostaConfig.json();
    window.config = config; // Torna config global
    window.nivelAtual = (config.faseInicial !== undefined) ? config.faseInicial : 0;

    // Carrega o progresso de habilidades e XP antes de iniciar o jogo
    if (typeof window.carregarDadosSkills === 'function') {
        await window.carregarDadosSkills();
    }

    // Aplica a escala ao palco de forma simples via CSS
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (palco && config.escalaPalco) {
        palco.style.transform = `scale(${config.escalaPalco})`;
        palco.style.transformOrigin = 'top left'; // Mantém o alinhamento no canto superior esquerdo
        palco.style.imageRendering = 'pixelated'; // Garante que os pixels fiquem nítidos ao crescer
    }

    // Inicia os sistemas básicos (apenas uma vez)
    await iniciarMovimentacao('player', config.velocidadePlayer || 4, 'personagem/Personagem_parado.png', 'personagem/Personagem_andando.png', 'personagem/personagem_chute2.png');
    await iniciarIAInimigos(1, 'personagem/Personagem_parado.png', 'personagem/Personagem_andando.png', 'personagem/personagem_chute2.png');
    
    // Carrega a primeira fase
    await carregarFase(window.niveis[window.nivelAtual]);
}