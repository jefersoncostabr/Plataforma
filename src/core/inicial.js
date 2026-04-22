/**
 * Gerenciador central de fases e inicialização.
 */


const listaArquivosFases = [
    "fase1.json",
    "fase2.json",
    "fase3.json",
    "fase4.json",
    "fase5.json",
    "fase6.json",
    "fase7.json",
    "fase8.json",
    "fase9.json",
    "fase10.json"
];
window.niveis = listaArquivosFases.map(nome => `../../config/fases/${nome}`);
window.nivelAtual = 0;
window.isTraining = false; // Flag para identificar se o jogador está no modo treino
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

function obterIndiceFasePorNome(nomeArquivo = '') {
    const alvo = String(nomeArquivo || '').split('/').pop().trim().toLowerCase();
    if (!alvo) return -1;

    return window.niveis.findIndex((caminho) => {
        const nome = String(caminho || '').split('/').pop().trim().toLowerCase();
        return nome === alvo;
    });
}

function obterConfigRenascimentoBaseAtiva() {
    if (typeof window.obterConfigRenascimentoBase !== 'function') return null;
    const craft = window.obterConfigRenascimentoBase();
    const modo = String(craft?.modoRenascimento || '').trim().toLowerCase();
    return (craft && (modo === 'spawnpoint' || modo === 'memoria')) ? craft : null;
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



async function carregarFase(nomeArquivo) {

    limparAnimacaoDanoJogador();
    if (typeof window.fecharTelaInteracao === 'function') {
        window.fecharTelaInteracao();
    }
    window.faseAtualNome = String(nomeArquivo || '').split('/').pop() || String(nomeArquivo || '');
    if (typeof window.removerTodosCrafts === 'function') {
        window.removerTodosCrafts();
    }

    // Bloqueia o reset se houver base instalada, se for a última fase ou se virmos de uma transição de nível.
    const isLastPhase = window.nivelAtual === (window.niveis.length - 1);
    const craftSalvo = typeof window.obterCraftPersistido === 'function' ? window.obterCraftPersistido() : null;
    const temBaseNestaFase = craftSalvo && craftSalvo.fase === window.faseAtualNome.toLowerCase();
    const vindoDeTransicao = !!window.__transicaoFaseAtiva;

    // Regra de Ouro: No reinício (morte ou carregamento), limpamos o jogador para não "vazar" 
    // itens coletados após o save. Apenas transições vitoriosas preservam o estado volátil.
    if (!vindoDeTransicao) {
        const deveLimparTotal = !isLastPhase && !temBaseNestaFase;
        
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

    // Reseta câmera para o início
    if (typeof window.resetarCamera === 'function') window.resetarCamera();

    // Mostra o palco
    if (palcoElemento) {
        palcoElemento.style.display = 'block';
    }

    // Inicializa posição do jogador
    if (window.playerControle) {
        const renascimentoBase = obterConfigRenascimentoBaseAtiva();
        const usarSpawnpointDaBase = renascimentoBase?.modoRenascimento === 'spawnpoint'
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
    }

    // Carrega inimigos da fase
    if (typeof resetarInimigos === 'function') {
        const inimigosParaReset = [];
        
        // Itera sobre todos os tipos de inimigos definidos em constantes
        Object.entries(window.GAME_CONSTANTS.TIPOS_INIMIGO).forEach(([tipoId, tipoConfig]) => {
            const chaveJSON = tipoConfig.chaveJSON;
            if (fase[chaveJSON]) {
                fase[chaveJSON].forEach(p => {
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

    if (typeof window.limparInventarioSalvo === 'function') {
        window.limparInventarioSalvo();
    }

    const temCheckpointEquipamento = typeof window.aplicarCheckpointEquipamentoComoInventarioPadrao === 'function'
        ? !!window.aplicarCheckpointEquipamentoComoInventarioPadrao()
        : false;

    const renascimentoBase = obterConfigRenascimentoBaseAtiva();
    const usarSpawnpointDaBase = renascimentoBase?.modoRenascimento === 'spawnpoint';
    const usarMemoriaDaBase = !!(porMorte && renascimentoBase?.modoRenascimento === 'memoria');
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

        if (window.playerControle.temEscudo || window.playerControle.escudoVermelho) {
            window.playerControle.temEscudo = true;
            window.playerControle.escudoVermelho = false;
            window.playerControle.escudoProtegido = 0;
        }
        if (window.playerControle.temArma) {
            window.playerControle.municao = window.config.maxMunicao || 5;
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
    const respostaConfig = await fetch('../../config/configuracoes.json');
    const config = await respostaConfig.json();
    window.config = config;
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
