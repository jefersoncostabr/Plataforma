/**
 * Gerenciador central de fases e inicialização.
 */


window.niveis = []; // Será preenchido dinamicamente sem index.json

window.nivelAtual = 0;
window.isTraining = false; // Flag para identificar se o jogador está no modo treino
window.controlandoCao = false; // Flag para identificar se o jogador está controlando o cachorro
window.controlandoGato = false; // Flag para identificar se o jogador está controlando o gato
window.intervalInimigoAleatorio = null; // Armazena o ID do setInterval para inimigo aleatório
window.timeoutPrimeiroInimigoAleatorio = null; // Armazena o timeout do primeiro inimigo
window.intervalHumanoAleatorio = null; // Ciclo para humano aleatório
window.timeoutPrimeiroHumanoAleatorio = null; // Delay inicial do humano
window.intervalCabecaoAleatorio = null;
window.timeoutPrimeiroCabecaoAleatorio = null;
window.intervalNinjaAleatorio = null;
window.timeoutPrimeiroNinjaAleatorio = null;

function obterIndiceFaseInicial(valorFaseInicial) {
    if (typeof valorFaseInicial === 'string' && valorFaseInicial.trim()) {
        const identificador = valorFaseInicial.trim().replace(/\\/g, '/');
        const indicePorNome = obterIndiceFasePorNome(identificador);
        if (indicePorNome >= 0) return indicePorNome;
        console.warn(`faseInicial "${identificador}" não encontrada. Usando fase 1 como padrão.`);
        return 0;
    }

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

function baseEstaNaFase(craft, faseAtual) {
    const faseBase = String(craft?.faseResumo || craft?.faseOriginal || craft?.fase || '')
        .trim().replace(/\\/g, '/').replace(/^\.\.\/\.\.\/config\/fases\//i, '').toLowerCase();
    const faseAlvo = String(faseAtual || '')
        .trim().replace(/\\/g, '/').replace(/^\.\.\/\.\.\/config\/fases\//i, '').toLowerCase();
    if (!faseBase || !faseAlvo) return false;

    // Caminho completo distingue, por exemplo, nivel_1/fase2 de nivel_2/fase2.
    if (faseBase.includes('/')) return faseBase === faseAlvo;
    // Compatibilidade com saves antigos, que armazenavam apenas faseN.json.
    return faseBase === faseAlvo.split('/').pop();
}

function obterChaveFaseSalva() {
    const baseKey = 'plataformaFaseAtual';
    if (window.SaveSlots && typeof window.SaveSlots.getStorageKey === 'function') {
        return window.SaveSlots.getStorageKey(baseKey, window.SaveSlots.getActiveSlotId?.());
    }
    return baseKey;
}

function lerFaseSalva() {
    try {
        return localStorage.getItem(obterChaveFaseSalva()) || '';
    } catch (_) {
        return '';
    }
}

function salvarFaseAtual(pathFase) {
    const caminho = String(pathFase || '').trim().replace(/\\/g, '/').replace(/^\.\.\/\.\.\/config\/fases\//i, '');
    if (!caminho) return;
    try {
        localStorage.setItem(obterChaveFaseSalva(), caminho);
    } catch (_) {
        // O jogo continua usando a fase inicial configurada se o armazenamento estiver indisponível.
    }
}

function resetarJogadorParaZeroMantendoSkills(opcoes = {}) {
    const controle = window.playerControle;
    if (!controle) return;

    const preservarEstadoSalvo = !!opcoes?.preservarEstadoSalvo;
    const temBaseNoChao = !!opcoes?.temBaseNestaFase;

    // CAPTURA DE RESGATE: Busca a base portátil para implantação automática no spawn.
    // Regra: Só resgatamos se NÃO houver uma base instalada no cenário (Caso 2).
    if (!temBaseNoChao) {
        let baseParaResgatar = null;
        if (controle.cintoSlot === 'base_portatil' || controle.cintoSlot?.tipo === 'base_portatil') {
            baseParaResgatar = controle.cintoSlot;
            controle.cintoSlot = null; // Remove do slot para evitar duplicidade
        } else if (Array.isArray(controle.coleteSlots)) {
            const idx = controle.coleteSlots.findIndex(s => s === 'base_portatil' || s?.tipo === 'base_portatil');
            if (idx !== -1) {
                baseParaResgatar = controle.coleteSlots[idx];
                controle.coleteSlots[idx] = null; // Remove do slot
            }
        }

        if (baseParaResgatar) {
            window.__basePendenteAutoSpawn = JSON.parse(JSON.stringify(baseParaResgatar));
            // Sincroniza o inventário para salvar a remoção da base do bolso
            if (typeof window.salvarInventarioDoControle === 'function') window.salvarInventarioDoControle(controle);
        }
    }

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

    if (typeof window.despawnBB === 'function') window.despawnBB();
    window.controlandoBB = false;
    const elementoJogador = document.getElementById('player');
    if (elementoJogador) elementoJogador.style.visibility = '';

    if (typeof window.desativarVooInfinitoTeste === 'function') {
        window.desativarVooInfinitoTeste();
    } else if (window.playerControle) {
        window.playerControle.vooInfinitoCheat = false;
    }

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
    window.isTraining = window.faseAtualNome.toLowerCase().includes('treino');
    if (typeof window.removerTodosCrafts === 'function') {
        window.removerTodosCrafts();
    }

    // Bloqueia o reset se houver base instalada, checkpoint, se for a última fase ou se virmos de uma transição de nível.
    const isLastPhase = window.nivelAtual === (window.niveis.length - 1);
    const craftSalvo = typeof window.obterCraftPersistido === 'function' ? window.obterCraftPersistido() : null;
    const temBaseNestaFase = craftSalvo && baseEstaNaFase(craftSalvo, pathRelativoLocal);
    
    // Verifica se existe um checkpoint de equipamento para evitar limpeza indevida no reinício
    const temCheckpoint = typeof window.carregarCheckpointEquipamentoSalvo === 'function' && !!window.carregarCheckpointEquipamentoSalvo();
    
    const vindoDeTransicao = !!window.__transicaoFaseAtiva;
    // Regra de Ouro: No reinício (morte ou carregamento), limpamos o jogador para não "vazar" 
    // itens coletados após o save. Apenas transições vitoriosas preservam o estado volátil.
    if (!vindoDeTransicao) {
        const deveLimparTotal = !isLastPhase && !temBaseNestaFase && !temCheckpoint;
        
        if (typeof resetarJogadorParaZeroMantendoSkills === 'function') {
            resetarJogadorParaZeroMantendoSkills({ 
                preservarEstadoSalvo: !deveLimparTotal,
                temBaseNestaFase: !!temBaseNestaFase
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
    if (window.intervalHumanoAleatorio !== null) {
        clearInterval(window.intervalHumanoAleatorio);
        window.intervalHumanoAleatorio = null;
    }
    if (window.intervalCabecaoAleatorio !== null) {
        clearInterval(window.intervalCabecaoAleatorio);
        window.intervalCabecaoAleatorio = null;
    }
    if (window.intervalNinjaAleatorio !== null) {
        clearInterval(window.intervalNinjaAleatorio);
        window.intervalNinjaAleatorio = null;
    }
    
    // Limpa o timeout do primeiro inimigo se existir
    if (window.timeoutPrimeiroInimigoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroInimigoAleatorio);
        window.timeoutPrimeiroInimigoAleatorio = null;
    }
    if (window.timeoutPrimeiroHumanoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroHumanoAleatorio);
        window.timeoutPrimeiroHumanoAleatorio = null;
    }
    if (window.timeoutPrimeiroCabecaoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroCabecaoAleatorio);
        window.timeoutPrimeiroCabecaoAleatorio = null;
    }
    if (window.timeoutPrimeiroNinjaAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroNinjaAleatorio);
        window.timeoutPrimeiroNinjaAleatorio = null;
    }
    
    let fase;
    try {
        const resposta = await fetch(nomeArquivo);
        if (!resposta.ok) throw new Error(`Erro ${resposta.status}: ${nomeArquivo} não encontrado.`);
        fase = await resposta.json();
        window.inicioComoBB = !!fase.posicaoInicialBB;
        window.posicaoInicialBBPixels = null;

        if (window.inicioComoBB) {
            resetarJogadorParaZeroMantendoSkills({ preservarEstadoSalvo: true, temBaseNestaFase: true });
            window.__basePendenteAutoSpawn = null;
            window.removerTodosCrafts?.();
            window.limparCheckpointEquipamentoSalvo?.();
            window.limparInventarioSalvo?.();
        }
        
        // Expõe os dados da fase para o AudioManager e outros sistemas
        window.faseAtualData = fase;
        // Armazena o caminho relativo puro para o editor/persistência
        window.faseAtualPathRelativo = String(nomeArquivo).replace('../../config/fases/', '');
        salvarFaseAtual(window.faseAtualPathRelativo);
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
        // Garante que o objeto de colisão global contenha todos os blocos sólidos (Terra + Neve)
        window.plataformas = {};
        window.arbustosFrente = []; // Inicializa o array global para arbustos

        function obterCoordEntradaPlataforma(entrada) {
            if (typeof entrada === 'string') return entrada.trim().toLowerCase();
            return String(entrada?.coord || entrada?.pos || '').trim().toLowerCase();
        }

        const tiposPlataformaSemColisao = new Set(['plataformaMetalFundo', 'plataformaFundoMisto', 'plataformaFundoTerraPedra', 'plataformaMeiaPedra', 'plataformaArbustoPequeno']);

        function registrarColisao(entrada) {
            const coord = obterCoordEntradaPlataforma(entrada);
            if (!coord) return;
            // Se for bloco metálico de fundo, não registra colisão (apenas visual)
            const tipo = typeof entrada === 'object' ? String(entrada?.type || '').trim() : '';
            if (tiposPlataformaSemColisao.has(tipo)) return;
            window.plataformas[coord] = true;
        }
        
        // Blocos padrão (colisão cheia 32x32)
        const blocosPadrao = [
            ...(fase.plataformas || []),
            ...(fase.plataformasNeve || []),
            ...(fase.plataformasEspinhos || []),
            ...(fase.plataformasGramaPico4 || []),
            ...(fase.plataformasGramaPico5 || []),
            ...(fase.plataformasPedra || []) // New: Pedra
        ];
        blocosPadrao.forEach(registrarColisao);

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

        if (fase.plataformasTerraPico) {
            fase.plataformasTerraPico.forEach(coord => {
                // Pico: metade superior sólida (sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'superior', yOffset: 16, height: 16 };
            });
        }

        if (fase.plataformasTerraPicoInvertido) {
            fase.plataformasTerraPicoInvertido.forEach(coord => {
                // Pico Invertido: metade inferior sólida (sem dano)
                window.plataformas[coord.trim().toLowerCase()] = { tipo: 'meio', direcao: 'inferior', yOffset: 0, height: 16 };
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
        renderizarPlataformas(idPalco, '../../assets/bloco terra/terra_horizontal.png', fase.plataformas || []);
        if (fase.plataformasNeve) {
            renderizarPlataformas(idPalco, '../../assets/personagem/chao_neve.png', fase.plataformasNeve);
        }
        if (fase.plataformasEspinhos) {
            renderizarPlataformas(idPalco, '../../assets/bloco terra/terra_canto.png', fase.plataformasEspinhos);
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
        if (fase.plataformasGramaPico4) {
            renderizarPlataformas(idPalco, '../../assets/bloco terra/terra_pico3.png', fase.plataformasGramaPico4);
        }
        if (fase.plataformasGramaPico5) {
            renderizarPlataformas(idPalco, '../../assets/bloco terra/terra_pico4.png', fase.plataformasGramaPico5);
        }
        if (fase.plataformasPedra) {
            renderizarPlataformas(idPalco, '../../assets/personagem/objetos/pedra.png', fase.plataformasPedra);
        }
        if (fase.plataformasArbustoFrente) {
            renderizarPlataformas(idPalco, '../../assets/personagem/objetos/arbusto.png', fase.plataformasArbustoFrente);
            // Armazena os arbustos para detecção de colisão
            fase.plataformasArbustoFrente.forEach(entrada => {
                const coord = obterCoordEntradaPlataforma(entrada);
                if (!coord) return;
                const pos = window.gridParaPixels(coord); // Converte coordenada de grade para pixels
                window.arbustosFrente.push({
                    x: pos.x,
                    y: pos.y,
                    largura: 32, // Arbusto é um tile 32x32
                    altura: 32,
                });
            });
        }
        if (fase.plataformasTerraPico) {
            renderizarPlataformas(idPalco, '../../assets/meio_bloco/meiograma_pico.png', fase.plataformasTerraPico);
        }
        if (fase.plataformasTerraPicoInvertido) {
            renderizarPlataformas(idPalco, '../../assets/meio_bloco/meiograma_pico_inv.png', fase.plataformasTerraPicoInvertido);
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

    // Fundo de frente da fase (nao participa de fisica/colisao).
    if (typeof renderizarFundoFrente === 'function') {
        renderizarFundoFrente(idPalco, fase.fundoFrente || []);
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
            && baseEstaNaFase(renascimentoBase, window.faseAtualPathRelativo || window.faseAtualNome);

        const pos = usarSpawnpointDaBase
            ? { x: Number(renascimentoBase.x || 0), y: Number(renascimentoBase.y || 0) }
            : (fase.posicaoInicialBB
                ? window.gridParaPixels(fase.posicaoInicialBB)
                : (typeof fase.posicaoInicialJogador === 'string'
                    ? (typeof window.gridParaPixels === 'function' ? window.gridParaPixels(fase.posicaoInicialJogador) : { x: 0, y: 0 })
                    : fase.posicaoInicialJogador));
        window.playerControle.x = pos.x;
        window.playerControle.y = pos.y;
        window.posicaoInicialBBPixels = fase.posicaoInicialBB
            ? { x: Number(pos.x), y: Number(pos.y) }
            : null;
        window.playerControle.velocidadeY = 0;

        // Auto-implantação da base resgatada no ponto de respawn (Caso 2)
        if (window.__basePendenteAutoSpawn) {
            // Limpa qualquer registro de base antigo no armazenamento para evitar que a trava de segurança bloqueie a instalação
            if (typeof window.limparCraftPersistido === 'function') {
                window.limparCraftPersistido();
            }

            if (typeof window.instalarBasePortatilDoSlot === 'function') {
                window.instalarBasePortatilDoSlot(window.__basePendenteAutoSpawn);
            }
            /* else {
                console.error('[AUTO-SPAWN] ❌ Erro: window.instalarBasePortatilDoSlot não está acessível.');
            } */
            window.__basePendenteAutoSpawn = null;
        }
        
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
        const viewportWidth = window.VIEWPORT?.width || 640;
        const viewportHeight = window.VIEWPORT?.height || 480;
        const snapTargetX = centroSnapX - (viewportWidth / 2);
        const snapTargetY = window.mundoAltura - centroSnapY - (viewportHeight / 2);
        window.cameraX = Math.max(0, Math.min(snapTargetX, window.mundoLargura - viewportWidth));
        window.cameraY = Math.max(0, Math.min(snapTargetY, window.mundoAltura - viewportHeight));
        if (typeof window.atualizarCamera === 'function') {
            window.atualizarCamera(centroSnapX, centroSnapY, window.mundoLargura, window.mundoAltura);
        }

        // Garante visual limpo do jogador após reposicionamento no spawn.
        limparAnimacaoDanoJogador();

        // --- LÓGICA DE PETS ---
        if (typeof window.limparGaiolas === 'function') window.limparGaiolas();

        if (fase.posicaoInicialBB && typeof window.inicializarBB === 'function') {
            window.inicializarBB(pos.x, pos.y, window.config);
            window.controlarBB?.();
            if (elementoJogador) elementoJogador.style.visibility = 'hidden';
        }

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
        const tipoPorChave = {};
        Object.entries(window.GAME_CONSTANTS?.TIPOS_INIMIGO || {}).forEach(([id, cfg]) => {
            if (cfg?.chaveJSON) tipoPorChave[cfg.chaveJSON] = Number(id);
        });
        
        // Itera sobre todos os tipos de inimigos definidos em constantes
        Object.entries(window.GAME_CONSTANTS.TIPOS_INIMIGO).forEach(([tipoId, tipoConfig]) => {
            const chaveJSON = tipoConfig.chaveJSON;
            if (fase[chaveJSON]) {
                fase[chaveJSON].forEach(p => {
                    inimigosParaReset.push({tipo: parseInt(tipoId), pos: p});
                });
            }
        });

        const chefes = Array.isArray(fase.chefes) ? fase.chefes : [];
        chefes.forEach((chefe, indexChefe) => {
            if (!chefe || typeof chefe !== 'object') return;

            const coordChefe = String(chefe.coord || '').trim();
            const etapas = Array.isArray(chefe.etapas) ? chefe.etapas : [];
            const primeiraEtapa = etapas[0];
            if (!coordChefe || !primeiraEtapa) return;

            const baseNpc = String(primeiraEtapa.baseNpc || 'inimigo_comum').trim().toLowerCase();
            const chaveJSON = ({
                humano: 'humano',
                cabecao: 'cabecao',
                ninja: 'ninja'
            })[baseNpc] || 'inimigo_comum';
            const tipoInicial = Number(tipoPorChave[chaveJSON] ?? window.GAME_CONSTANTS?.INIMIGO_COMUM_ID ?? 0);

            inimigosParaReset.push({
                tipo: tipoInicial,
                pos: { coord: coordChefe, direcao: 'e' },
                bossId: String(chefe.id || `chefe-${indexChefe + 1}`),
                bossStageIndex: 0,
                bossEtapas: etapas,
                bossAtivaBooleanoAoDerrotar: !!chefe.ativaBooleanoAoDerrotar
            });
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
    if (Array.isArray(fase.inimigoAleatorio) && fase.inimigoAleatorio.length === 2 && fase.inimigoAleatorio[0] > 0) {
        const dificuldade = fase.inimigoAleatorio[0]; // 1, 2 ou 3
        const tipoEquipamento = fase.inimigoAleatorio[1]; // 0=sem, 1=revólver, 2=escudo, 3=bota, 4=jetpack, 6=garra, 7=cinto, 8=colete, 9=todos
        
        // console.log(`[Spawn] Ativando Robôs Aleatórios: Dificuldade ${dificuldade}, Equip: ${tipoEquipamento}`);

        // Calcula o tempo baseado na dificuldade
        let tempoEmMs = 60000; // padrão: 1 minuto
        if (dificuldade === 1) tempoEmMs = 60000;
        else if (dificuldade === 2) tempoEmMs = 45000;
        else if (dificuldade === 3) tempoEmMs = 30000;

        // Define uma função para criar o inimigo repetidamente
        const criarInimigoRepetido = () => {
            if (window.isPaused) {
                console.debug("[Spawn] Jogo pausado, pulando criação de robô.");
                return;
            }

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
    } else {
        // console.log("[Spawn] Robôs Aleatórios desativados para esta fase.");
    }

    // Configura spawn de humanos aleatórios (Pode rodar junto com o anterior)
    if (Array.isArray(fase.humanoAleatorio) && fase.humanoAleatorio.length >= 1 && fase.humanoAleatorio[0] > 0) {
        const dificuldade = fase.humanoAleatorio[0];
        // console.log(`[Spawn] Configurando spawn de humanos: Dificuldade ${dificuldade}`);
        // console.log(`[Spawn] Ativando Humanos Aleatórios: Dificuldade ${dificuldade}`);
        
        let tempoEmMs = 60000;
        if (dificuldade === 1) tempoEmMs = 60000;
        else if (dificuldade === 2) tempoEmMs = 45000;
        else if (dificuldade === 3) tempoEmMs = 30000;

        const criarHumanoRepetido = () => {
            if (window.isPaused) return;

            // console.log(`[Spawn] Gerando Humano Aleatório (Dificuldade ${dificuldade})`);
            if (typeof criarInimigoAleatorio === 'function') {
                const todasAsPlataformas = [...(fase.plataformas || []), ...(fase.plataformasNeve || [])];
                // Spawna o humano (ID 13 definido no ia-inimigo.js)
                criarInimigoAleatorio(todasAsPlataformas, 13);
            }
        };
        
        window.timeoutPrimeiroHumanoAleatorio = setTimeout(() => {
            criarHumanoRepetido();
            window.intervalHumanoAleatorio = setInterval(criarHumanoRepetido, tempoEmMs);
            window.timeoutPrimeiroHumanoAleatorio = null;
        }, tempoEmMs);
    } else {
        // console.log("[Spawn] Humanos Aleatórios desativados para esta fase.");
    }

    if (Array.isArray(fase.cabecaoAleatorio) && fase.cabecaoAleatorio[0] > 0) {
        const dificuldade = Number(fase.cabecaoAleatorio[0]);
        const tempoEmMs = dificuldade === 3 ? 30000 : dificuldade === 2 ? 45000 : 60000;
        const criarCabecaoRepetido = () => {
            if (window.isPaused || typeof criarInimigoAleatorio !== 'function') return;
            const todasAsPlataformas = [...(fase.plataformas || []), ...(fase.plataformasNeve || [])];
            criarInimigoAleatorio(todasAsPlataformas, Number(window.GAME_CONSTANTS?.INIMIGO_CABECAO_ID ?? 14));
        };
        window.timeoutPrimeiroCabecaoAleatorio = setTimeout(() => {
            criarCabecaoRepetido();
            window.intervalCabecaoAleatorio = setInterval(criarCabecaoRepetido, tempoEmMs);
            window.timeoutPrimeiroCabecaoAleatorio = null;
        }, tempoEmMs);
    }

    if (Array.isArray(fase.ninjaAleatorio) && Number(fase.ninjaAleatorio[0]) > 0) {
        const dificuldade = Number(fase.ninjaAleatorio[0]);
        const tempoEmMs = dificuldade === 3 ? 30000 : dificuldade === 2 ? 45000 : 60000;
        const criarNinjaRepetido = () => {
            if (window.isPaused || typeof criarInimigoAleatorio !== 'function') return;
            const todasAsPlataformas = [...(fase.plataformas || []), ...(fase.plataformasNeve || [])];
            criarInimigoAleatorio(todasAsPlataformas, 15);
        };
        window.timeoutPrimeiroNinjaAleatorio = setTimeout(() => {
            criarNinjaRepetido();
            window.intervalNinjaAleatorio = setInterval(criarNinjaRepetido, tempoEmMs);
            window.timeoutPrimeiroNinjaAleatorio = null;
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

    // Lista de fases já está em window.niveis (sem depender de config/fases/index.json)


    // 2. Sincroniza o nivelAtual com o arquivo que acabamos de completar
    // Isso evita que o jogo se perca se a lista for reordenada
    const indiceConfirmado = obterIndiceFasePorNome(window.faseAtualPathRelativo || window.faseAtualNome);
    if (indiceConfirmado >= 0) window.nivelAtual = indiceConfirmado;

    // Intercepta se a fase concluída possui fase bônus definida no JSON (Requisito: faseBonus)
    const dataFase = window.faseAtualData || {};
    const qualBonus = Number(dataFase.qualBonus ?? 0);
    const runnerBonusValido = dataFase.faseBonus && qualBonus === 0;

    if (dataFase.faseBonus && qualBonus !== 0) {
        console.warn(`[Runner] Bônus ${dataFase.qualBonus} não é suportado; seguindo para a próxima fase.`);
    }

    if (runnerBonusValido && typeof window.ativarModoRunner === 'function' && !window.__emModoRunnerTransicao) {
        window.__emModoRunnerTransicao = true;

        // Guarda os recursos antes do bônus para devolver o que for gasto durante o Runner.
        const controleAntesDoBonus = window.playerControle;
        const recursosAntesDoBonus = controleAntesDoBonus ? {
            dano: controleAntesDoBonus.dano,
            temEscudo: controleAntesDoBonus.temEscudo,
            escudoVermelho: controleAntesDoBonus.escudoVermelho,
            escudoProtegido: controleAntesDoBonus.escudoProtegido,
            temArma: controleAntesDoBonus.temArma,
            municao: controleAntesDoBonus.municao,
            heldWeaponType: controleAntesDoBonus.heldWeaponType
        } : null;

        const caminhoFaseBonus = String(window.faseAtualPathRelativo || window.faseAtualNome || '');
        const nivelCampanha = caminhoFaseBonus.match(/nivel_(\d+)/i)?.[1] || '1';
        window.TutorialControles?.mostrarMensagem?.(
            `Fase bônus — nível ${nivelCampanha}. Pule para sobreviver!`
        );
        
        // Determina dificuldade do Runner (a=easy, b=normal/medium, c=hard. Vazio = easy)
        let dificuldade = "easy";
        const nivelBonus = String(dataFase.nivelBonus || 'a').trim().toLowerCase();
        if (nivelBonus === 'b') dificuldade = "medium";
        else if (nivelBonus === 'c') dificuldade = "hard";

        window.ativarModoRunner(true, dificuldade);
        
        // Conta 20 segundos de jogo ativo; o pause suspende a contagem.
        await new Promise(resolve => {
            let intervaloRunner = null;
            let tempoRunnerRestante = 20000;
            const concluirEsperaRunner = () => {
                if (intervaloRunner !== null) {
                    if (window.__timerRunnerTimeout === intervaloRunner) {
                        window.__timerRunnerTimeout = null;
                    }
                    clearInterval(intervaloRunner);
                    intervaloRunner = null;
                }
                if (window.__cancelarRunnerPromise === concluirEsperaRunner) {
                    window.__cancelarRunnerPromise = null;
                }
                resolve();
            };

            intervaloRunner = setInterval(() => {
                if (window.isPaused) return;
                if (!window.__emModoRunnerTransicao
                    || !window.faseAtualData?.modoRunner
                    || !window.playerControle
                    || window.playerControle.estaMorrendo) {
                    concluirEsperaRunner();
                    return;
                }

                tempoRunnerRestante -= 100;
                if (tempoRunnerRestante <= 0) concluirEsperaRunner();
            }, 100);

            window.__cancelarRunnerPromise = concluirEsperaRunner;
            window.__timerRunnerTimeout = intervaloRunner;
        });

        const jogador = window.playerControle;
        const sobreviveu = Boolean(
            window.__emModoRunnerTransicao
            && window.faseAtualData?.modoRunner
            && jogador
            && !jogador.estaMorrendo
        );
        const morreuNoBonus = Boolean(
            window.__emModoRunnerTransicao
            && window.faseAtualData?.modoRunner
            && jogador?.estaMorrendo
        );

        window.__emModoRunnerTransicao = false;
        if (window.__timerRunnerTimeout) clearInterval(window.__timerRunnerTimeout);
        window.__timerRunnerTimeout = null;

        if (!sobreviveu && !morreuNoBonus) {
            window.ativarModoRunner(false);
            return; // Interrupções que não foram conclusão nem morte não avançam a fase.
        }

        window.ativarModoRunner(false);

        // Restaura os recursos da campanha tanto na vitória quanto na morte.
        if (controleAntesDoBonus && recursosAntesDoBonus) {
            Object.assign(controleAntesDoBonus, recursosAntesDoBonus);

            // Cancela o estado e a animação de morte antes de carregar a próxima fase.
            controleAntesDoBonus.estaMorrendo = false;
            controleAntesDoBonus.framesMorrendo = 0;
            controleAntesDoBonus.velocidadeY = 0;
            controleAntesDoBonus.velocidadeKnockback = 0;
            controleAntesDoBonus.framesKnockbackRestante = 0;

            window.atualizarVisualEscudo?.();
            window.atualizarHUD?.();

            const armaElemento = document.getElementById('player-weapon');
            if (armaElemento) {
                armaElemento.style.filter = controleAntesDoBonus.municao <= 0
                    ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)'
                    : 'none';
            }

            if (typeof window.salvarInventarioDoControle === 'function') {
                window.salvarInventarioDoControle(controleAntesDoBonus);
            }
        }

        let animacaoRecompensaXP = Promise.resolve();

        // Somente quem sobreviveu recebe a recompensa.
        if (
            sobreviveu
            && !dataFase.bonusXPPremiado
            && typeof window.ganharXP === 'function'
        ) {
            const dificuldadeXP = String(window.gameDifficulty || 'normal')
                .trim()
                .toLowerCase();

            const recompensaXP = dificuldadeXP === 'easy'
                ? 4
                : dificuldadeXP === 'hard'
                    ? 12
                    : 8;

            dataFase.bonusXPPremiado = true;
            animacaoRecompensaXP = Promise.resolve(window.ganharXP(recompensaXP));
        }

        // Vitória e morte aguardam o mesmo segundo antes de avançar.
        await Promise.all([
            animacaoRecompensaXP,
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);
    }

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
            const dificuldadeFim = String(window.gameDifficulty || 'normal').trim().toLowerCase();
            const reiniciarPreservandoSkills = dificuldadeFim === 'normal' || dificuldadeFim === 'easy';

            if (reiniciarPreservandoSkills) {
                const proximaDificuldade = dificuldadeFim === 'easy' ? 'normal' : 'hard';
                window.gameDifficulty = proximaDificuldade;
                const slotAtivo = window.SaveSlots?.getActiveSlotId?.() || window.slotAtualID;
                if (slotAtivo && typeof window.SaveSlots?.setSlotDifficulty === 'function') {
                    window.SaveSlots.setSlotDifficulty(slotAtivo, proximaDificuldade, true);
                }

                // Nova campanha: limpa a run anterior e conserva apenas as skills adquiridas.
                window.__basePendenteAutoSpawn = null;
                window.removerTodosCrafts?.();
                window.limparCraftPersistido?.();
                window.limparCheckpointEquipamentoSalvo?.();
                window.limparInventarioSalvo?.();
                window.resetarResgatePets?.();
                window.playerXP = 0;
                window.skillPoints = 0;
                if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();
                if (window.playerControle) resetarJogadorParaZeroMantendoSkills({ preservarEstadoSalvo: false });
                const indiceFaseInicial = obterIndiceFaseInicial(window.config?.faseInicial);
                window.nivelAtual = indiceFaseInicial;
                salvarFaseAtual(window.niveis[window.nivelAtual]);
                await window.reiniciarJogo(false, { indiceFaseInicialSlot: indiceFaseInicial });
                return;
            }
            // Suporte para Novo Jogo+: Busca a base no inventário antes de reiniciar a campanha
            const slotsNG = [window.playerControle?.cintoSlot, ...(window.playerControle?.coleteSlots || [])];
            const baseNoBolsoNG = slotsNG.find(s => s === 'base_portatil' || s?.tipo === 'base_portatil');
            
            if (baseNoBolsoNG) window.__basePendenteAutoSpawn = JSON.parse(JSON.stringify(baseNoBolsoNG));

            const indiceFaseInicial = obterIndiceFaseInicial(window.config?.faseInicial);
            window.nivelAtual = indiceFaseInicial;
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
            salvarFaseAtual(window.niveis[indiceFaseInicial]);
            await window.reiniciarJogo(false, { indiceFaseInicialSlot: indiceFaseInicial });
        }
    }
};

// Reinicia a fase atual
window.reiniciarJogo = async function(porMorte = true, opcoes = {}) {
    limparAnimacaoDanoJogador();

    // Captura a fase visível antes do reset. Reinícios manuais devem permanecer
    // nela; o spawnpoint salvo só se aplica ao renascimento após morte.
    const indiceFaseAtual = Number.isInteger(opcoes.indiceFaseInicialSlot)
        && opcoes.indiceFaseInicialSlot >= 0
        ? opcoes.indiceFaseInicialSlot
        : obterIndiceFasePorNome(window.faseAtualPathRelativo || window.faseAtualNome);

    // Cancela qualquer transição de Runner em curso ao reiniciar
    if (typeof window.__cancelarRunnerPromise === 'function') {
        window.__cancelarRunnerPromise();
    }
    window.__emModoRunnerTransicao = false;

    const eraModoTreino = window.isTraining;
    window.__transicaoFaseAtiva = false; // Garante que a transição não trave o próximo reset por morte

    // A limpeza agora é gerenciada seletivamente dentro de carregarFase para suportar checkpoints e bases. // Removido console.log de debug

    const temCheckpointEquipamento = typeof window.aplicarCheckpointEquipamentoComoInventarioPadrao === 'function'
        ? !!window.aplicarCheckpointEquipamentoComoInventarioPadrao()
        : false;

    const renascimentoBase = obterConfigRenascimentoBaseAtiva();
    const modo = renascimentoBase?.modoRenascimento;
    const usarMemoriaDaBase = !!(porMorte && (modo === 'memoria' || modo === 'ambos'));
    const spawnpointHabilitadoNaBase = modo === 'spawnpoint' || modo === 'ambos';
    const usarSpawnpointDaBase = opcoes.usarSpawnpointDaBase ?? (porMorte && spawnpointHabilitadoNaBase);
    const skillsMemorizadas = usarMemoriaDaBase ? [...(window.playerSkills || [])] : [];

    // Cancela spawns de inimigos aleatórios
    if (window.intervalInimigoAleatorio !== null) {
        clearInterval(window.intervalInimigoAleatorio);
        window.intervalInimigoAleatorio = null;
    }
    if (window.intervalHumanoAleatorio !== null) {
        clearInterval(window.intervalHumanoAleatorio);
        window.intervalHumanoAleatorio = null;
    }
    if (window.intervalCabecaoAleatorio !== null) {
        clearInterval(window.intervalCabecaoAleatorio);
        window.intervalCabecaoAleatorio = null;
    }
    if (window.intervalNinjaAleatorio !== null) {
        clearInterval(window.intervalNinjaAleatorio);
        window.intervalNinjaAleatorio = null;
    }
    if (window.timeoutPrimeiroInimigoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroInimigoAleatorio);
        window.timeoutPrimeiroInimigoAleatorio = null;
    }
    if (window.timeoutPrimeiroHumanoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroHumanoAleatorio);
        window.timeoutPrimeiroHumanoAleatorio = null;
    }
    if (window.timeoutPrimeiroCabecaoAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroCabecaoAleatorio);
        window.timeoutPrimeiroCabecaoAleatorio = null;
    }
    if (window.timeoutPrimeiroNinjaAleatorio !== null) {
        clearTimeout(window.timeoutPrimeiroNinjaAleatorio);
        window.timeoutPrimeiroNinjaAleatorio = null;
    }

    // Reseta estado do jogador
    if (window.playerControle) {
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

    if (eraModoTreino) {
        await carregarFase('../../config/fases/treino.json');
    } else {
        const renascimentoBase = obterConfigRenascimentoBaseAtiva();
        const indiceFaseBase = renascimentoBase
            ? obterIndiceFasePorNome(renascimentoBase?.faseResumo || renascimentoBase?.faseOriginal || renascimentoBase?.fase)
            : -1;
        const spawnpointValido = porMorte
            && usarSpawnpointDaBase
            && spawnpointHabilitadoNaBase
            && indiceFaseBase >= 0;
        const indiceFaseInicial = obterIndiceFaseInicial(window.config?.faseInicial);

        // Na morte, o spawnpoint pode estar em uma fase anterior. Sem spawnpoint,
        // a campanha recomeça da fase inicial configurada. Reinício manual mantém a fase atual.
        window.nivelAtual = spawnpointValido
            ? indiceFaseBase
            : (porMorte && !opcoes.manterFaseAtual
                ? indiceFaseInicial
                : (indiceFaseAtual >= 0 ? indiceFaseAtual : indiceFaseInicial));

        await carregarFase(window.niveis[window.nivelAtual]);
    }

    if (temCheckpointEquipamento && !window.inicioComoBB && window.playerControle && typeof window.aplicarInventarioSalvoNoControle === 'function') {
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

    if (window.SaveSlots && typeof window.SaveSlots.init === 'function') {
        window.SaveSlots.init();
        window.slotAtualID = window.SaveSlots.getActiveSlotId();
        window.gameDifficulty = window.SaveSlots.getSlotDifficulty(window.slotAtualID);
    }

    // Carrega configurações globais
    const respostaConfig = await fetch('../../config/configuracoes.json', { cache: 'no-store' });
    const config = await respostaConfig.json();
    window.config = config;
    // console.log("Configurações carregadas:", config); // Removido console.log de debug

    // Configurações para o efeito de flash de cano (muzzle flash) - Define o caminho padrão do sprite
    window.config.spriteMuzzleFlash = window.config.spriteMuzzleFlash || '../../assets/vfx/efeito_disparo.png';
    window.config.muzzleFlashOffsetX = window.config.muzzleFlashOffsetX ?? 8; // Offset X do centro do flash em relação ao ponto de disparo
    window.config.muzzleFlashOffsetY = window.config.muzzleFlashOffsetY ?? 0; // Offset Y do centro do flash em relação ao ponto de disparo
    window.config.muzzleFlashWidth = window.config.muzzleFlashWidth ?? 32;
    window.config.muzzleFlashHeight = window.config.muzzleFlashHeight ?? 32;
    // This is a valid debug log, keeping it.

    // Carrega a lista explícita de fases para não gerar requisições 404 ao sondar lacunas.
    window.niveis = [];
    try {
        const basePathRoot = '../../config/fases/';
        const respostaIndice = await fetch(`${basePathRoot}manifesto-fases.json`, { cache: 'no-store' });
        if (!respostaIndice.ok) throw new Error(`Manifesto de fases indisponível (${respostaIndice.status}).`);

        const manifesto = await respostaIndice.json();
        const fases = Array.isArray(manifesto) ? manifesto : manifesto.fases;
        if (!Array.isArray(fases)) throw new Error('Manifesto de fases inválido.');

        const fasesValidas = fases
            .filter((rel) => typeof rel === 'string' && /^nivel_\d+\/fase\d+\.json$/i.test(rel))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        window.niveis = fasesValidas.map((rel) => `${basePathRoot}${rel}`);

    } catch (e) {
        window.niveis = [];
        console.error('Erro ao montar lista de fases:', e);
    }

    // Segurança para instalação incompleta: mantém uma fase inicial conhecida.
    if (!Array.isArray(window.niveis) || window.niveis.length === 0) {
        window.niveis = ['../../config/fases/nivel_1/fase1.json'];
    }

    const indiceFaseInicial = obterIndiceFaseInicial(config.faseInicial);
    const indiceFaseSalva = obterIndiceFasePorNome(lerFaseSalva());
    window.nivelAtual = indiceFaseSalva >= 0 ? indiceFaseSalva : indiceFaseInicial;


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
    const viewportInicial = window.VIEWPORT || { width: baseWidth, height: baseHeight };

    let escalaPersistida = NaN;
    try {
        escalaPersistida = Number(localStorage.getItem('game.screenScale'));
    } catch (_) {
        // Mantém fallback para config quando storage não estiver disponível.
    }

    // Prioriza a escala persistida do jogador quando disponível.
    const escalaInicial = Number.isFinite(escalaPersistida) && escalaPersistida > 0
        ? escalaPersistida
        : (Number(config.escalaPalco) || 1);

    window.escalaAtual = escalaInicial;
    if (window.config && Number.isFinite(escalaInicial) && escalaInicial > 0) {
        window.config.escalaPalco = escalaInicial;
    }

    const container = document.getElementById('jogo-container');
    if (container) {
        container.style.overflow = 'hidden';

        if (typeof window.aplicarEscalaJogo === 'function') {
            window.aplicarEscalaJogo();
        } else {
            // Fallback para casos raros em que ajuste-tela.js ainda não foi carregado.
            container.style.width = viewportInicial.width + 'px';
            container.style.height = viewportInicial.height + 'px';
            container.style.position = 'relative';
            container.style.display = 'block';
            container.style.margin = '0 auto';
            container.style.top = '0';
            container.style.left = '0';
            container.style.transform = `scale(${window.escalaAtual})`;
            container.style.transformOrigin = 'center center';
            window.autoScaleMultiplier = window.escalaAtual;
        }
    }

    // Função pública para recálculo manual; resize fica centralizado em ajuste-tela.js
    window.recalcularTamanhoJogo = function() {
        if (typeof window.aplicarEscalaJogo === 'function') {
            window.aplicarEscalaJogo();
        }
    };

    // Inicializa sistemas de movimento, IA e renderização
    await iniciarMovimentacao(
        'player',
        '../../assets/personagem/Personagem_parado.png',
        '../../assets/personagem/Personagem_andando.png',
        '../../assets/personagem/personagem_chute2.png',
        '../../assets/personagem/personagem_no_ar.png',
        '../../assets/personagem/carregando/carregando1.png',
        '../../assets/personagem/carregando/carregando2.png',
        '../../assets/personagem/carregando/carregando3.png',
        '../../assets/personagem/carregando/carregando4.png',
        '../../assets/personagem/carregando/carregando5.png',
        '../../assets/personagem/carregando/carregando6.png'
    );
    // Corrigido: sprites do humano para NPC inimigo
    const spriteParadoHumano = '../../assets/personagem/humano/humano.png';
    const spriteAndandoHumano = '../../assets/personagem/humano/humano_andando.png';
    const spriteParadoAgachadoHumano = '../../assets/personagem/humano/humano_agachado.png';
    const spriteAndandoAgachadoHumano = '../../assets/personagem/humano/humano_agachado_andando.png';
    // console.log('[JOGO] Sprites do NPC humano:', { spriteParadoHumano, spriteAndandoHumano, spriteParadoAgachadoHumano, spriteAndandoAgachadoHumano });
    await iniciarIAInimigos(
        1,
        spriteParadoHumano, // sprite parado humano
        spriteAndandoHumano, // sprite andando humano
        '../../assets/personagem/personagem_chute2.png',
        '../../assets/personagem/personagem_no_ar.png'
    );
    
    // Carrega fase e abre menu inicial
    await carregarFase(window.niveis[window.nivelAtual]);
    if (typeof window.togglePauseMenu === 'function') {
        window.togglePauseMenu();
    }
}
