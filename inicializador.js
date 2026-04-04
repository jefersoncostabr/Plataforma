/**
 * Gerenciador central de fases e inicialização.
 */
window.niveis = ["fase1.json", "fase2.json"];
window.nivelAtual = 0;

async function carregarFase(nomeArquivo) {
    console.log(`Carregando nível: ${nomeArquivo}`);
    
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

    // 3. Posiciona o jogador
    if (window.playerControle) {
        const pos = typeof fase.posicaoInicialJogador === 'string' 
            ? gridParaPixels(fase.posicaoInicialJogador) 
            : fase.posicaoInicialJogador;
        window.playerControle.x = pos.x;
        window.playerControle.y = pos.y;
        window.playerControle.velocidadeY = 0;
        window.playerControle.noChao = false; // Garante que a física recalcule o chão no novo local
    }

    // 4. Cria os novos inimigos
    if (typeof resetarInimigos === 'function') {
        const inimigosParaReset = [];
        if (fase.inimigos1) fase.inimigos1.forEach(p => inimigosParaReset.push({tipo: 1, pos: p}));
        if (fase.inimigos0) fase.inimigos0.forEach(p => inimigosParaReset.push({tipo: 0, pos: p}));
        
        resetarInimigos(inimigosParaReset);
    }

    // 5. Cria os itens iniciais da fase (como o escudo)
    if (typeof resetarItens === 'function') {
        resetarItens(fase.itens || []);
    }
}

window.proximoNivel = async function() {
    const proximoIndice = window.nivelAtual + 1;

    if (proximoIndice < window.niveis.length) {
        window.nivelAtual = proximoIndice;
        await carregarFase(window.niveis[window.nivelAtual]);
    } else {
        alert("FIM DE JOGO! Você completou todos os níveis.");
        if (typeof reiniciarJogo === 'function') {
            await reiniciarJogo();
        }
    }
};

window.reiniciarJogo = async function() {
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
        window.playerControle.noChao = false;
        window.playerControle.direcao = 'd';
        
        // Reseta itens coletados para o máximo
        if (window.playerControle.temEscudo) {
            window.playerControle.escudoVermelho = false;
            window.playerControle.escudoProtegido = 0;
            if (typeof window.atualizarVisualEscudo === 'function') window.atualizarVisualEscudo();
        }
        if (window.playerControle.temArma) {
            window.playerControle.municao = window.config.maxMunicao || 5;
        }
        if (typeof window.salvarInventario === 'function') {
            window.salvarInventario();
        }
    }
    
    // Volta para a fase 1
    window.nivelAtual = 0;
    await carregarFase(window.niveis[window.nivelAtual]);
    
    // Atualiza visual dos itens após carregar a fase
    if (window.playerControle && window.playerControle.temEscudo && typeof window.atualizarVisualEscudo === 'function') {
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

    // Inicia os sistemas básicos (apenas uma vez)
    await iniciarMovimentacao('player', config.velocidadePlayer || 4, 'personagem/Personagem_parado.png', 'personagem/Personagem_andando.png', 'personagem/personagem_chute2.png');
    await iniciarIAInimigos(1, 'personagem/Personagem_parado.png', 'personagem/Personagem_andando.png', 'personagem/personagem_chute2.png');
    
    // Carrega a primeira fase
    await carregarFase(window.niveis[window.nivelAtual]);
}