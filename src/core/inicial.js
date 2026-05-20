/**
 * Gerenciador central de fases e inicialização.
 */


window.niveis = []; // Será preenchido dinamicamente pelo index.json

window.nivelAtual = 0;
window.isTraining = false; // Flag para identificar se o jogador está no modo treino
window.controlandoCao = false; // Flag para identificar se o jogador está controlando o cachorro
window.controlandoGato = false; // Flag para identificar se o jogador está controlando o gato
window.intervalInimigoAleatorio = null; // Armazena o ID do setInterval para inimigo aleatório
window.timeoutPrimeiroInimigoAleatorio = null; // Armazena o timeout do primeiro inimigo

function obterIndiceFaseInicial(valorFaseInicial) {
    const faseNumero = Number(valorFaseInicial);

    if (!Number.isFinite(faseNumero) || faseNumero < 1) {
        console.warn('faseInicial inválida. Usando fase 1 como padrão.');
        return 0;
    }

    const indiceNormalizado = Math.floor(faseNumero) - 1;
    return Math.max(0, Math.min(indiceNormalizado, window.niveis.length - 1));
}

function obterIndiceFasePorNome(identificador = '') {
    const alvo = String(identificador || '').trim().toLowerCase();
    if (!alvo) return -1;

    return window.niveis.findIndex((caminho) => {
        const pathRelativo = String(caminho || '').replace('../../config/fases/', '').toLowerCase();
        if (alvo.includes('/')) return pathRelativo === alvo;
        return pathRelativo === alvo || pathRelativo.endsWith('/' + alvo);
    });
}

function obterConfigRenascimentoBaseAtiva() {
    if (typeof window.obterConfigRenascimentoBase !== 'function') return null;
    const craft = window.obterConfigRenascimentoBase();
    const modo = String(craft?.modoRenascimento || '').trim().toLowerCase();
    // Suporta 'spawnpoint', 'memoria' e 'ambos' (nível 4)
    return (craft && (modo === 'spawnpoint' || modo === 'memoria' || modo === 'ambos')) ? craft : null;
}

function resetarJogadorParaZeroMantendoSkills(opcoes = {}) {
    const controle = window.playerControle;
    if (!controle) return;

    const preservarEstadoSalvo = !!opcoes?.preservarEstadoSalvo;

    controle.temEscudo = false;
    controle.escudoVermelho = false;
    controle.escudoProtegido = 0;
    controle.temArma = false;
    controle.municao = 0;
    controle.temBota = false;
    controle.botaVermelha = false;
    controle.botaUsosDash = 0;
    controle.temJetpack = false;
    controle.temCinto = false;
    controle.temGarra = false;
    controle.garraVermelha = false;
    controle.garraImpactosSolidos = 0;
    controle.temColete = false;
    controle.inventario = [];
    controle.coleteSlots = Array.from({ length: Math.max(1, Number(window.coleteConfig?.capacidade ?? 6)) }, () => null);
    controle.cintoSlot = null;
    controle.municao = 0;
    // Nota: Limpeza de flags de movimento movida para função dedicada para garantir execução em transições.

    ['player-weapon', 'player-shield', 'player-boots', 'player-jetpack', 'player-claw', 'player-belt', 'player-vest', 'player-jet-fire']
        .forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

    if (typeof window.atualizarVisualEscudo === 'function') window.atualizarVisualEscudo();
    if (typeof window.atualizarVisualBota === 'function') window.atualizarVisualBota();
    if (typeof window.atualizarVisualGarra === 'function') window.atualizarVisualGarra();
    
    if (!preservarEstadoSalvo && typeof window.limparInventarioSalvo === 'function') {
        window.limparInventarioSalvo();
    }
    if (!preservarEstadoSalvo && typeof window.resetarResgatePets === 'function') {
        window.resetarResgatePets();
    } else if (!preservarEstadoSalvo && typeof window.resetarResgateCao === 'function') {
        window.resetarResgateCao();
    }
}

/**
 * Destrava completamente o personagem e a interface, limpando estados de menus e ações.
 * Deve ser executado em toda transição de fase ou reinício.
 */
function forcarDestravamentoGeral(entidade) {
    if (!entidade) return;
    
    // Limpa estados lógicos de bloqueio
    entidade.stunned = false;
    entidade.stunTimer = 0;
    entidade.vendaEmCurso = false;
    entidade.vendaTimer = 0;
    entidade.garraAnimEstado = 'idle';
    entidade.garraItemCarregado = null;
    if (Array.isArray(entidade.garraBracos)) {
        entidade.garraBracos.forEach(b => b.remove?.());
        entidade.garraBracos = [];
    }
    entidade.estaAgachado = false;
    entidade.estaMorrendo = false;

    // Limpa flags globais de UI que travam o input
    window.isPaused = false;
    window.isMenuOpen = false;
    window.isSkillMenuOpen = false;
    window.isMochilaMenuOpen = false;
    window.isInteractionMenuOpen = false;
}

// ⭐ Escala atual do jogo
window.escalaAtual = 1;

// 📍 Rastreamento de direção para câmera grande
window.ultimaDirecaoX = 0; // -1 = esquerda, 0 = parado, 1 = direita
window.ultimaDirecaoY = 0; // -1 = baixo, 0 = parado, 1 = cima

function limparAnimacaoDanoJogador() {
    const playerEl = document.getElementById('player');
    if (!playerEl) return;

    if (typeof window.limparEfeitosTemporarios === 'function') {
        window.limparEfeitosTemporarios(playerEl, { restaurarFiltro: true, restaurarTransform: false });
    }

    // Remove qualquer resíduo visual de flash/vibração de dano.
    playerEl.style.filter = 'none';
    playerEl.style.transition = '';
    playerEl.style.opacity = '1';

    // Reaplica apenas o espelhamento padrão do sprite.
    const direcao = window.playerControle?.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    playerEl.style.transform = direcao;
}  

/**
 * Retorna a força de knockback baseada no tipo de dano e configurações.
 * Centraliza o item 3.1 da auditoria.
 */
window.obterForcaKnockback = function(config, tipo) {
    const cfg = config || window.config || {};
    if (tipo === 'playerChute') return Number(cfg.knockbackInimigo ?? 150);
    if (tipo === 'playerProjetil') return Number(cfg.knockbackProjetilInimigo ?? cfg.knockbackProjetil ?? 100);
    if (tipo === 'inimigoChute') return Number(cfg.knockbackPlayer ?? 120);
    if (tipo === 'inimigoProjetil') return Number(cfg.knockbackProjetilPlayer ?? 80);
    if (tipo === 'espinho') return Number(cfg.knockbackEspinhoInimigo ?? cfg.knockbackEspinho ?? 70);
    return 0;
};

/**
 * Aplica fisicamente o recuo a uma entidade.
 * @param {Object} entidade - Jogador ou Inimigo.
 * @param {number} forca - Valor total do empurrão.
 * @param {number} direcao - 1 para direita, -1 para esquerda.
 * @param {number} duracao - Quantidade de frames que o recuo dura.
 */
window.aplicarKnockback = function(entidade, forca, direcao, duracao = 15) {
    if (!entidade) return;
    
    // Se já houver um knockback em curso, respeitamos o maior tempo restante
    entidade.framesKnockbackRestante = Math.max(entidade.framesKnockbackRestante || 0, duracao);
    
    // O deslocamento por frame é a força total distribuída pelo tempo
    entidade.velocidadeKnockback = (forca / duracao) * direcao;
};

// Aliases para manter compatibilidade com sistemas legados (ex: gravidade.js)
window.obterKnockbackPadrao = (config, tipo) => window.obterForcaKnockback(config, tipo);
window.obterKnockbackRecebidoPadrao = (ent, config, tipo) => window.obterForcaKnockback(config, tipo);


async function carregarFase(nomeArquivo) {

    // Para todos os sons antes de iniciar a nova fase
    if (window.AudioManager && typeof window.AudioManager.stopAllSounds === 'function') {
        window.AudioManager.stopAllSounds();
    }

    limparAnimacaoDanoJogador();
    if (typeof window.fecharTelaInteracao === 'function') {
        window.fecharTelaInteracao();
    }

    const container = document.getElementById('jogo-container');
    if (container) container.style.filter = 'none';

    forcarDestravamentoGeral(window.playerControle);

    const pathRelativoLocal = String(nomeArquivo || '').replace('../../config/fases/', '');
    window.faseAtualNome = String(nomeArquivo || '').split('/').pop() || String(nomeArquivo || '');
    if (typeof window.removerTodosCrafts === 'function') {
        window.removerTodosCrafts();
    }

    // Bloqueia o reset se houver base instalada, checkpoint, se for a última fase ou se virmos de uma transição de nível.
    const isLastPhase = window.nivelAtual === (window.niveis.length - 1);
    const craftSalvo = typeof window.obterCraftPersistido === 'function' ? window.obterCraftPersistido() : null;
    const temBaseNestaFase = craftSalvo && (craftSalvo.fase === pathRelativoLocal.toLowerCase() || craftSalvo.fase === window.faseAtualNome.toLowerCase());
    
    // Verifica se existe um checkpoint de equipamento para evitar limpeza indevida no reinício
    const temCheckpoint = typeof window.carregarCheckpointEquipamentoSalvo === 'function' && !!window.carregarCheckpointEquipamentoSalvo();
    
    const vindoDeTransicao = !!window.__transicaoFaseAtiva;

    // Regra de Ouro: No reinício (morte ou carregamento), limpamos o jogador para não "vazar" 
    // itens coletados após o save. Apenas transições vitoriosas preservam o estado volátil.
    if (!vindoDeTransicao) {
        const deveLimparTotal = !isLastPhase && !temBaseNestaFase && !temCheckpoint;
        
        if (typeof resetarJogadorParaZeroMantendoSkills === 'function') {
            resetarJogadorParaZeroMantendoSkills({ 
                preservarEstadoSalvo: !deveLimparTotal 
            });
        }
    }

    
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
        
        // Expõe os dados da fase para o AudioManager e outros sistemas
        window.faseAtualData = fase;
        // Armazena o caminho relativo puro para o editor/persistência
        window.faseAtualPathRelativo = String(nomeArquivo).replace('../../config/fases/', '');
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

        // Meio-blocos de terra (sem dano)
        if (fase.plataformasTerraInferior) {
            fase.plataformasTerraInferior.forEach(coord => {
                // Metade inferior sólida (equivalente geométrico da estaca up, sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'inferior', yOffset: 16, height: 16 };
            });
        }

        if (fase.plataformasTerraSuperior) {
            fase.plataformasTerraSuperior.forEach(coord => {
                // Metade superior sólida (equivalente geométrico da estaca down, sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'superior', yOffset: 0, height: 16 };
            });
        }

        if (fase.plataformasTerraInferior2) {
            fase.plataformasTerraInferior2.forEach(coord => {
                // Variante 2: metade inferior sólida (sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'inferior', yOffset: 16, height: 16 };
            });
        }

        if (fase.plataformasTerraSuperior2) {
            fase.plataformasTerraSuperior2.forEach(coord => {
                // Variante 2: metade superior sólida (sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'superior', yOffset: 0, height: 16 };
            });
        }

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
                // xOffset: 0 → Começa a colisão na borda esquerda do tile
                // width: 16 → Colisão tem 16px de largura (metade esquerda)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'direita', xOffset: 0, width: 16 };
            });
        }

        // ⚠️ INICIALIZAÇÃO ESTACAS ESQUERDA (Linha 103)
        // Spikes apontam para a ESQUERDA, bloqueiam colisão na DIREITA
        if (fase.plataformasEstacaEsq) {
            fase.plataformasEstacaEsq.forEach(coord => {
                // Estaca Esquerda: pontas apontando para esquerda, bloqueia metade DIREITA
                // xOffset: 16 → Começa a colisão 16px da esquerda do tile
                // width: 16 → Colisão tem 16px de largura (metade direita)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'esquerda', xOffset: 16, width: 16 };
            });
        }

        // ⚠️ INICIALIZAÇÃO ESTACAS BAIXO (Linha 113)
        // Spikes apontam para BAIXO, bloqueiam colisão na PARTE SUPERIOR
        if (fase.plataformasEstacaBaixo) {
            fase.plataformasEstacaBaixo.forEach(coord => {
                // Estaca Baixo: colisão na metade superior do bloco
                // yOffset: 0 → Começa no topo do tile
                // height: 16 → Colisão tem 16px de altura (metade)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'estaca', direcao: 'baixo', yOffset: 0, height: 16 };
            });
        }

        // Renderiza todas as plataformas da fase
        renderizarPlataformas(idPalco, '../../assets/personagem/chao.png', fase.plataformas || []);
        if (fase.plataformasNeve) {
            renderizarPlataformas(idPalco, '../../assets/personagem/chao_neve.png', fase.plataformasNeve);
        }
        if (fase.plataformasTerraInferior) {
            renderizarPlataformas(idPalco, '../../assets/personagem/terra_inferior.png', fase.plataformasTerraInferior);
        }
        if (fase.plataformasTerraSuperior) {
            renderizarPlataformas(idPalco, '../../assets/personagem/terra_superior.png', fase.plataformasTerraSuperior);
        }
        if (fase.plataformasTerraInferior2) {
            renderizarPlataformas(idPalco, '../../assets/personagem/terra_inferior2.png', fase.plataformasTerraInferior2);
        }
        if (fase.plataformasTerraSuperior2) {
            renderizarPlataformas(idPalco, '../../assets/personagem/terra_superior2.png', fase.plataformasTerraSuperior2);
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

    // Renderiza a alavanca interativa da fase
    if (typeof renderizarAlavanca === 'function' && fase.posicaoAlavanca) {
        renderizarAlavanca(idPalco, '../../assets/personagem/alavanca.png', fase.posicaoAlavanca);
    }

    // Renderiza robô aberto da fase (casco para o BB assumir)
    if (typeof renderizarRoboAberto === 'function' && fase.posicaoRoboAberto) {
        renderizarRoboAberto(idPalco, '../../assets/personagem/per_aberto.png', fase.posicaoRoboAberto);
    }

    // Renderiza robô desativado interativo (abre ao interagir)
    if (typeof renderizarRoboDesativado === 'function' && fase.posicaoRoboDesativado) {
        renderizarRoboDesativado(idPalco, '../../assets/personagem/robo_desativado.png', fase.posicaoRoboDesativado);
    }

    if (typeof renderizarMusgoSobreRoboAberto === 'function' && fase.posicaoMusgoRoboAberto) {
        renderizarMusgoSobreRoboAberto(idPalco, '../../assets/personagem/musgo2.png', fase.posicaoMusgoRoboAberto);
    }

    if (typeof renderizarMusgoSobreRoboDesativado === 'function' && fase.posicaoMusgoRoboDesativado) {
        renderizarMusgoSobreRoboDesativado(idPalco, '../../assets/personagem/musgo1.png', fase.posicaoMusgoRoboDesativado);
    }

    // Reseta câmera para o início
    if (typeof window.resetarCamera === 'function') window.resetarCamera();

    // Mostra o palco
    if (palcoElemento) {
        palcoElemento.style.display = 'block';
    }

    // Inicializa posição do jogador
    if (window.playerControle) {
        const renascimentoBase = obterConfigRenascimentoBaseAtiva();
        const modo = renascimentoBase?.modoRenascimento;
        const usarSpawnpointDaBase = (modo === 'spawnpoint' || modo === 'ambos')
            && String(renascimentoBase?.fase || '').trim().toLowerCase() === String(window.faseAtualNome || '').trim().toLowerCase();

        const pos = usarSpawnpointDaBase
            ? { x: Number(renascimentoBase.x || 0), y: Number(renascimentoBase.y || 0) }
            : (typeof fase.posicaoInicialJogador === 'string'
                ? (typeof window.gridParaPixels === 'function' ? window.gridParaPixels(fase.posicaoInicialJogador) : { x: 0, y: 0 })
                : fase.posicaoInicialJogador);
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

        // Garante visual limpo do jogador após reposicionamento no spawn.
        limparAnimacaoDanoJogador();

        // --- LÓGICA DE PETS ---
        if (typeof window.limparGaiolas === 'function') window.limparGaiolas();

        const processarPet = (tipo, resgatado, naBase, posGaiola, spawnFunc) => {
            if (resgatado && !naBase) {
                if (typeof spawnFunc === 'function') spawnFunc({ x: pos.x - 32, y: pos.y }, window.config);
            } else if (posGaiola && typeof window.criarGaiola === 'function') {
                const posG = window.gridParaPixels(posGaiola);
                window.criarGaiola(posG, window.config, tipo);
            }
        };

        processarPet('cao', window.isCaoResgatado, window.caoNaBase, fase.posicaoGaiola, window.iniciarCao);
        processarPet('gato', window.isGatoResgatado, window.gatoNaBase, fase.posicaoGaiolaGato, window.iniciarGato);

        // Verificação de compatibilidade de gaiolas (log removido)
    }

    // Carrega inimigos da fase
    if (typeof resetarInimigos === 'function') {
        const inimigosParaReset = [];
        
        // Itera sobre todos os tipos de inimigos definidos em constantes
        Object.entries(window.GAME_CONSTANTS.TIPOS_INIMIGO).forEach(([tipoId, tipoConfig]) => {
            const chaveJSON = tipoConfig.chaveJSON;
            if (fase[chaveJSON]) {
                fase[chaveJSON].forEach(p => {
                    if (chaveJSON === 'inimigo_bb') {
                        console.log('[Fase][InimigoBB] Entrada carregada do JSON:', p);
                    }
                    inimigosParaReset.push({tipo: parseInt(tipoId), pos: p});
                });
            }
        });
        
        resetarInimigos(inimigosParaReset);
    }

    // Carrega itens iniciais da fase
    if (typeof window.resetarItens === 'function') {
        window.resetarItens(fase.itens || {});
    }

    if (typeof window.restaurarCraftPersistenteDaFaseAtual === 'function') {
        window.restaurarCraftPersistenteDaFaseAtual();
    }

    // Configura spawn de inimigos aleatórios
    if (Array.isArray(fase.inimigoAleatorio) && fase.inimigoAleatorio.length === 2) {
        const dificuldade = fase.inimigoAleatorio[0]; // 1, 2 ou 3
        const tipoEquipamento = fase.inimigoAleatorio[1]; // 0=sem, 1=revólver, 2=escudo, 3=bota, 4=jetpack, 6=garra, 7=cinto, 8=colete, 9=todos
        
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

    // 1. Recarrega o manifesto para garantir que a fase 11 (ou mais novas) seja detectada
    try {
        const respManifesto = await fetch('../../config/fases/index.json', { cache: 'no-store' });
        if (respManifesto.ok) {
            const manifesto = await respManifesto.json();
            const listaRaw = manifesto.fases || manifesto;
            const listaCampanha = listaRaw.filter(nome => !String(nome).toLowerCase().endsWith('treino.json'));
            window.niveis = listaCampanha.map(nome => `../../config/fases/${nome}`);
        }
    } catch (e) { console.error("Erro ao atualizar lista de fases na transição:", e); }

    // 2. Sincroniza o nivelAtual com o arquivo que acabamos de completar
    // Isso evita que o jogo se perca se a lista for reordenada
    const indiceConfirmado = obterIndiceFasePorNome(window.faseAtualPathRelativo || window.faseAtualNome);
    if (indiceConfirmado >= 0) window.nivelAtual = indiceConfirmado;

    const proximoIndice = window.nivelAtual + 1;

    if (proximoIndice < window.niveis.length) {
        alert("Parabéns! Você concluiu esta fase.");
        

        // Força o salvamento do inventário ao final da fase, independentemente de ter base instalada
        if (window.playerControle && typeof window.salvarInventarioDoControle === 'function') {
            window.__forcarSalvarInventario = true;
            window.salvarInventarioDoControle(window.playerControle);
            window.__forcarSalvarInventario = false;
        }

        window.__transicaoFaseAtiva = true;
        window.nivelAtual = proximoIndice;
        await carregarFase(window.niveis[window.nivelAtual]);
        window.__transicaoFaseAtiva = false;
    } else {
        alert("FIM DE JOGO! Você completou todos os níveis.");
        if (typeof window.reiniciarJogo === 'function') {
            window.nivelAtual = 0;
            // Ao reiniciar, garantir todos os equipamentos
            if (window.playerControle) {
                // Lista de todos os equipamentos possíveis
                window.playerControle.temEscudo = true;
                window.playerControle.temArma = true;
                window.playerControle.temBota = true;
                window.playerControle.temJetpack = true;
                window.playerControle.temCinto = true;
                window.playerControle.temGarra = true;
                window.playerControle.temColete = true;
                // Inventário completo
                window.playerControle.inventario = [
                    'escudo', 'revolver', 'bota', 'jetpack', 'cinto', 'garra', 'colete'
                ];
                // Slots de colete/cinto preenchidos
                window.playerControle.coleteSlots = Array.from({ length: Math.max(1, Number(window.coleteConfig?.capacidade ?? 6)) }, (_,i) => {
                    const tipos = ['escudo','revolver','bota','jetpack','cinto','garra','colete'];
                    return tipos[i] || null;
                });
                window.playerControle.cintoSlot = 'cinto';
                if (typeof window.atualizarVisualEscudo === 'function') window.atualizarVisualEscudo();
                if (typeof window.atualizarVisualBota === 'function') window.atualizarVisualBota();
                if (typeof window.atualizarVisualGarra === 'function') window.atualizarVisualGarra();

                // Salva como checkpoint e inventário persistente
                if (typeof window.salvarCheckpointEquipamentoDoControle === 'function') {
                    window.salvarCheckpointEquipamentoDoControle(window.playerControle, { fase: 'inicio' });
                }
                if (typeof window.salvarInventarioDoControle === 'function') {
                    window.salvarInventarioDoControle(window.playerControle);
                }
            }
            await window.reiniciarJogo(false);
        }
    }
};

// Reinicia a fase atual
window.reiniciarJogo = async function(porMorte = true) {
    limparAnimacaoDanoJogador();

    // A limpeza agora é gerenciada seletivamente dentro de carregarFase para suportar checkpoints e bases. // Removido console.log de debug

    const temCheckpointEquipamento = typeof window.aplicarCheckpointEquipamentoComoInventarioPadrao === 'function'
        ? !!window.aplicarCheckpointEquipamentoComoInventarioPadrao()
        : false;

    const renascimentoBase = obterConfigRenascimentoBaseAtiva();
    const modo = renascimentoBase?.modoRenascimento;
    const usarSpawnpointDaBase = modo === 'spawnpoint' || modo === 'ambos';
    const usarMemoriaDaBase = !!(porMorte && (modo === 'memoria' || modo === 'ambos'));
    const skillsMemorizadas = usarMemoriaDaBase ? [...(window.playerSkills || [])] : [];

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
        window.isTraining = false;
        window.playerControle.dano = 0;
        window.playerControle.teclas = {};
        window.playerControle.movendoHorizontal = false;
        window.playerControle.chutando = false;
        window.playerControle.tempoChute = 0;
        window.playerControle.cooldownChute = 0;
        window.playerControle.cooldownTiro = 0;
        window.playerControle.cooldownPulo = 0;
        window.playerControle.danoProjetil = 1;
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

        forcarDestravamentoGeral(window.playerControle);

        if (window.playerControle.temEscudo || window.playerControle.escudoVermelho) {
            window.playerControle.temEscudo = true;
            window.playerControle.escudoVermelho = false;
            window.playerControle.escudoProtegido = 0;
        }
        if (window.playerControle.temArma) {
            const munReset = (window.playerControle.heldWeaponType === 'doze') ? 2 : 5;
            window.playerControle.municao = munReset;
        }

        if (typeof window.aplicarEfeitosSkills === 'function') {
            window.aplicarEfeitosSkills();
        }
    }

    if (porMorte && typeof window.resetarProgressoParaJson === 'function') {
        await window.resetarProgressoParaJson();

        if (usarMemoriaDaBase) {
            window.playerSkills = [...new Set(skillsMemorizadas.map(skill => String(skill || '')))].filter(Boolean);
            if (typeof window.aplicarEfeitosSkills === 'function') {
                window.aplicarEfeitosSkills();
            }
            if (typeof window.salvarProgressoSkills === 'function') {
                window.salvarProgressoSkills();
            }
        }
    }

    const indiceSpawnpoint = usarSpawnpointDaBase
        ? obterIndiceFasePorNome(renascimentoBase?.faseOriginal || renascimentoBase?.fase)
        : -1;
    window.nivelAtual = indiceSpawnpoint >= 0
        ? indiceSpawnpoint
        : obterIndiceFaseInicial(window.config?.faseInicial);

    await carregarFase(window.niveis[window.nivelAtual]);

    if (temCheckpointEquipamento && window.playerControle && typeof window.aplicarInventarioSalvoNoControle === 'function') {
        window.aplicarInventarioSalvoNoControle(window.playerControle);
    }

    if (window.playerControle && typeof window.atualizarVisualEscudo === 'function') {
        window.atualizarVisualEscudo();
    }
    if (window.playerControle && typeof window.atualizarVisualBota === 'function') {
        window.atualizarVisualBota();
    }
    if (window.playerControle && typeof window.atualizarVisualGarra === 'function') {
        window.atualizarVisualGarra();
    }
};

// Inicializa o jogo e carrega primeira fase
async function iniciarJogo() {
    window.isFirstStart = true;

    // Carrega configurações globais
    const respostaConfig = await fetch('../../config/configuracoes.json', { cache: 'no-store' });
    const config = await respostaConfig.json();
    window.config = config;
    // console.log("Configurações carregadas:", config); // Removido console.log de debug
    // This is a valid debug log, keeping it.
    // Carrega a lista de fases dinamicamente do manifesto
    try {
        const respManifesto = await fetch('../../config/fases/index.json', { cache: 'no-store' });
        const manifesto = await respManifesto.json();
        const listaRaw = manifesto.fases || manifesto;

        // Filtra o arquivo de treino para que ele não faça parte da progressão normal (campanha)
        const listaCampanha = listaRaw.filter(nome => !String(nome).toLowerCase().endsWith('treino.json'));
        window.niveis = listaCampanha.map(nome => `../../config/fases/${nome}`);
    } catch (e) { console.error("Erro ao carregar lista de fases:", e); }

    window.nivelAtual = obterIndiceFaseInicial(config.faseInicial);

    // Carrega as definições de itens para o jogo usar os sprites dos JSONs
    if (typeof window.carregarItemDefinitions === 'function') await window.carregarItemDefinitions();
    if (typeof window.carregarConfigColete === 'function') await window.carregarConfigColete();

    if (typeof window.limparInventarioSalvo === 'function') {
        window.limparInventarioSalvo();
    }
    if (typeof window.aplicarCheckpointEquipamentoComoInventarioPadrao === 'function') {
        window.aplicarCheckpointEquipamentoComoInventarioPadrao();
    }

    // Carrega dados de skills e progresso
    if (typeof window.carregarDadosSkills === 'function') {
        await window.carregarDadosSkills();
    }

    const baseWidth = 640;
    const baseHeight = 480;
    
    // REVERTIDO: Prioriza o valor exato do JSON (ex: 1.5) em vez do cálculo automático com arredondamento para baixo.
    window.escalaAtual = Number(config.escalaPalco) || 1;

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
        container.style.transform = `scale(${window.escalaAtual})`;
        container.style.transformOrigin = 'center center';
        
        window.autoScaleMultiplier = window.escalaAtual;
    }

    // Função para recalcular escala ao redimensionar a tela
    let resizeTimeout = null;
    window.recalcularTamanhoJogo = function() {
        // Se existir o sistema de ajuste centralizado, utiliza-o para manter a consistência
        if (typeof window.aplicarEscalaJogo === 'function') {
            window.aplicarEscalaJogo();
        }
    };
    
    // Listener para redimensionamento da tela
    window.addEventListener('resize', window.recalcularTamanhoJogo);

    // Inicializa sistemas de movimento, IA e renderização
    await iniciarMovimentacao(
        'player',
        '../../assets/personagem/Personagem_parado.png',
        '../../assets/personagem/Personagem_andando.png',
        '../../assets/personagem/personagem_chute2.png',
        '../../assets/personagem/personagem_no_ar.png'
    );
    await iniciarIAInimigos(
        1, 
        '../../assets/personagem/Personagem_parado.png', 
        '../../assets/personagem/Personagem_andando.png', 
        '../../assets/personagem/personagem_chute2.png',
        '../../assets/personagem/personagem_no_ar.png'
    );
    
    // Carrega fase e abre menu inicial
    await carregarFase(window.niveis[window.nivelAtual]);
    if (typeof window.togglePauseMenu === 'function') {
        window.togglePauseMenu();
    }
}
