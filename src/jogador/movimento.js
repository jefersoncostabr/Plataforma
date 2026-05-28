/**
 * Adiciona controles de movimento ao personagem.
 * 
 * @param {string} id - O ID do elemento HTML do personagem.
 * @param {number} velocidade - Velocidade de movimento em pixels por quadro.
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 * @param {string} spriteNoAr - Caminho da imagem no ar.
 * @param {string} spriteCarregando1 - Sprite de carregamento frame 1.
 * @param {string} spriteCarregando2 - Sprite de carregamento frame 2.
 * @param {string} spriteCarregando3 - Sprite de carregamento frame 3.
 * @param {string} spriteCarregando4 - Sprite de carregamento frame 4.
 * @param {string} spriteCarregando5 - Sprite de carregamento frame 5.
 * @param {string} spriteCarregando6 - Sprite de carregamento frame 6.
 */
window.iniciarMovimentacao = async function(id, spriteParado, spriteAndando, spriteChute, spriteNoAr, spriteCarregando1, spriteCarregando2, spriteCarregando3, spriteCarregando4, spriteCarregando5, spriteCarregando6) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.style.zIndex = '5'; // Define o jogador na camada 5

    // Usa as configurações globais carregadas no inicial.js
    const config = window.config || {};

    if (typeof window.criarSistemaInventarioJogador !== 'function') {
        throw new Error('Erro ao carregar inventario.js: sistema de inventário indisponível.');
    }

    if (typeof window.criarSistemaControlesJogador !== 'function') {
        throw new Error('Erro ao carregar controles.js: sistema de controles indisponível.');
    }

    if (typeof window.criarSistemaHUDJogador !== 'function') {
        throw new Error('Erro ao carregar hud.js: sistema de HUD indisponível.');
    }

    if (typeof window.criarSistemaMorteInimigo !== 'function') {
        throw new Error('Erro ao carregar morte-inimigo.js: sistema de morte de inimigos indisponível.');
    }

    if (typeof window.criarSistemaGarraJogador !== 'function') {
        throw new Error('Erro ao carregar garra.js: sistema da garra indisponível.');
    }

    if (typeof window.criarSistemaVisuaisEquipamentos !== 'function') {
        throw new Error('Erro ao carregar animacoes-equipamento.js: sistema visual de equipamentos indisponível.');
    }

    if (typeof window.sincronizarAcessoriosEntidade !== 'function') {
        throw new Error('Erro ao carregar sincronizacao-visual.js: sistema de sincronização indisponível.');
    }

    if (typeof window.obterForcaKnockback !== 'function' || typeof window.aplicarKnockback !== 'function') {
        throw new Error('Erro ao carregar inicial.js: funções de knockback unificadas não encontradas.');
    }

    if (typeof window.criarSistemaDanoEstacasJogador !== 'function') {
        throw new Error('Erro ao carregar dano-estacas.js: sistema de dano por estacas indisponível.');
    }

    if (typeof window.criarSistemaJetpackJogador !== 'function') {
        throw new Error('Erro ao carregar jetpack.js: sistema de jetpack indisponível.');
    }

    if (typeof window.criarSistemaAcoesEspeciaisJogador !== 'function') {
        throw new Error('Erro ao carregar acoes-especiais.js: sistema de ações especiais indisponível.');
    }

    if (typeof window.criarSistemaCraftingJogador !== 'function') {
        throw new Error('Erro ao carregar crafting.js: sistema de crafting indisponível.');
    }

    if (typeof window.criarSistemaCombateCorpoACorpoJogador !== 'function') {
        throw new Error('Erro ao carregar combate-corpo-a-corpo.js: sistema de combate corpo a corpo indisponível.');
    }

    if (typeof window.aplicarDesaceleracaoHorizontal !== 'function') {
        throw new Error('Erro ao carregar desaceleracao-horizontal.js: sistema de desaceleração horizontal indisponível.');
    }

    function virarFenoParaFonteDano(inimigo, fonteX) {
        if (!inimigo || !ehInimigoFeno(inimigo) || !inimigo.elemento) return;
        const centroX = inimigo.x + ((inimigo.largura || 32) / 2);
        inimigo.elemento.style.transform = fonteX <= centroX ? 'scaleX(1)' : 'scaleX(-1)';
    }

    function ehInimigoFeno(inimigo) {
        if (!inimigo) return false;
        const idFeno = Number(window.GAME_CONSTANTS?.INIMIGO_FENO_ID ?? 5);
        const tipoNumero = Number(inimigo.tipo);
        const nomeTipo = String(inimigo.tipoNome || inimigo.nome || '').toLowerCase();
        return tipoNumero === idFeno || nomeTipo === 'feno';
    }

    function animarDanoAlvo(inimigo) {
        if (!inimigo || !inimigo.elemento) return;
        if (typeof piscaLeve === 'function') {
            piscaLeve(inimigo.elemento);
        } else if (typeof flashElement === 'function') {
            flashElement(inimigo.elemento, 120, 8);
        }
    }

    const spriteAgachado = window.obterSpriteItem('agachado', config, 'equipado');
    const spriteAgachado2 = window.obterSpriteItem('agachado2', config, 'equipado');

    function atualizarVisualEscudo() {
        const selecao = controle.selecaoCinto || 'todos';
        const participandoDaSelecao = (selecao === 'todos' || selecao === 'escudo');
        const escudoAtivoVisual = !!(controle.temEscudo || controle.escudoVermelho);

        if (escudoAtivoVisual && !controle.itensGuardadosNoCinto && participandoDaSelecao) {
            escudoElemento.style.display = 'block';
        } else {
            escudoElemento.style.display = 'none';
        }

        escudoElemento.src = window.obterSpriteItem('escudo', config, 'equipado');
        escudoElemento.style.filter = controle.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
    }

    function atualizarVisualBota() {
        if (!botaElemento) return;
        const botaAtivaVisual = !!(controle.temBota && !controle.botaVermelha);

        if (botaAtivaVisual && !controle.itensGuardadosNoCinto) {
            botaElemento.style.display = 'block';
        } else {
            botaElemento.style.display = 'none';
        }

        botaElemento.style.filter = controle.botaVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
    }

    function atualizarVisualGarra() {
        if (!garraElemento) return;

        if (!controle.temGarra || controle.itensGuardadosNoCinto) {
            garraElemento.style.display = 'none';
        } else if (!controle.garraAnimEstado || controle.garraAnimEstado === 'idle') {
            garraElemento.style.display = 'block';
        }

        garraElemento.style.filter = controle.garraVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
    }

    // Expose for restart
    window.atualizarVisualEscudo = atualizarVisualEscudo;
    window.atualizarVisualBota = atualizarVisualBota;
    window.atualizarVisualGarra = atualizarVisualGarra;

    const EPSILON = 0.01;

    // Estado interno para rastrear posição e teclas pressionadas
    const controle = {
        id: id,
        elemento: elemento,
        x: parseInt(elemento.style.left) || 0,
        y: parseInt(elemento.style.bottom) || 0,
        largura: config.HITBOX_LARGURA || 20,
        altura: config.HITBOX_ALTURA || 25,
        alturaEmPe: config.HITBOX_ALTURA || 25,
        offsetX: config.HITBOX_OFFSET_X || 6,
        velocidadeY: 0,
        noChao: false,
        movendoHorizontal: false,
        direcao: 'd',
        distanciaPercorridaPasso: 0,
        frequenciaPasso: 24, // Pixels necessários para tocar o próximo som
        chutando: false,
        tempoChute: 0,
        framesImpulsoRestante: 0,
        velocidadeDash: 0,
        dashSolicitado: null,
        dashDirecao: 'd',
        dashFramesRestantes: 0,
        velocidadeDashSkill: 0,
        cooldownDash: 0,
        ultimoToqueDash: { e: 0, d: 0 },
        pesado: false,
        pesadoPorEquipamento: false,
        pesoTemporarioSuperDescida: 0,
        framesKnockbackRestante: 0,
        velocidadeKnockback: 0,
        usandoParaquedas: false,
        pulosRealizados: 0,
        timerPuloDuplo: 0,
        doubleJumpUsedInAir: false, // Nova flag para controlar o cooldown do pulo duplo
        cooldownPuloDuplo: 0, // Cooldown para o pulo duplo
        superPuloFramesRestantes: 0, // Contador para o rastro do pulo duplo (subida)
        minVelocidadePousoSom: -6, // Velocidade mínima de queda (negativa) para tocar o som
        cooldownPosSuperDescida: 0, // Cooldown de 1s após a Super Descida
        superDescidaAtiva: false, // Rastreador de uso da Super Descida
        espacoPressionado: false,
        cooldownChute: 0,
        estaMorrendo: false,
        framesMorrendo: 0,
        cooldownPulo: 0,
        coyoteFramesRestantes: 0,
        jumpBufferFramesRestantes: 0,
        cooldownTiro: 0,
        cooldownDanoEspinho: 0,
        municao: 0, // Inicia sem munição
        temArma: false, // Inicia sem a capacidade de atirar
        temEscudo: false, // Inicia sem escudo
        temGarra: false,
        temGarraPuxo: false,
        garraVermelha: false,
        garraImpactosSolidos: 0,
        garraPuxando: false,
        garraAncoradaPos: null,
        garraPullFrames: 0,
        temCinto: false,
        temBota: false, // Inicia sem bota
        botaVermelha: false,
        botaUsosDash: 0,
        temJetpack: false,
        temColete: false,
        jetpackAtivo: false,
        timerAtivacaoJetpack: 0,
        framesVoando: 0,
        timerVooRestante: 0,
        cooldownVooJetpack: 0,
        jetpackHovering: false, // Nova flag para o modo de pairar
        escudoVermelho: false,
        escudoProtegido: 0,
        dano: 0,
        maxVida: 3,
        danoProjetil: 1, // Default projectile damage
        stunned: false,
        stunTimer: 0,
        vendaEmCurso: false,
        vendaTimer: 0,
        vendaTipo: null,
        vendaVisual: null,
        inventario: [],
        coleteSlots: Array.from({ length: 6 }, () => null),
        cintoSlot: null,
        craftPreviewAtivo: false,
        craftPreviewVisual: null,
        craftPreviewPosicao: null,
        craftPreviewTipo: null,
        airdropUsadoNoNivel: false,
        estaAgachado: false,
        carregando: false,
        eletricidadeTemporariaAtiva: false,
        eletricidadeTemporariaAte: 0,
        ultimoToqueCarregandoMs: 0,
        janelaDuploToqueCarregandoMs: 300,
        timerCarregando: 0,
        frameCarregandoAtual: 0, // Nova propriedade para o contador de frames da animação de carregamento
        debugVelocidadeAtivo: false,
        visualFrameCounter: 0, // Contador para sincronizar frequência de efeitos
        ultimoLogVelocidadeMs: 0, 
        velocidadeHorizontalAtual: 0, // Nova propriedade para a desaceleração gradual
        velocidadeXAtual: 0,
        velocidadeTotalAtual: 0,
        teclas: {},
        ePressionado: false, // Trava para toggle de um clique no 'E'
        acoesDiscretas: {}
    };

    /**
     * Inicia a sequência de morte do jogador (estilo cartoon).
     */
    window.prepararMorteJogador = (direcaoX) => {
        // Se o fluxo novo de resgate já bloqueou o jogador, não deixa cair na morte antiga.
        if (controle.bloqueadoPorResgateBB) {
            return;
        }

        // Mecanica temporariamente desabilitada: resgate de morte com BB (paraquedas).
        const resgateMorteComBBAtivo = false;
        if (resgateMorteComBBAtivo && typeof window.iniciarResgateMorteComBB === 'function') {
            const ativouResgateBB = window.iniciarResgateMorteComBB({
                controle,
                elemento,
                config,
                direcaoX
            });
            if (ativouResgateBB) return;
        }

        if (controle.estaMorrendo) return;

        controle.estaMorrendo = true;
        controle.framesMorrendo = 35;
        controle.velocidadeY = 10;
        
        // Direção oposta ao dano ou baseada na face
        const dir = direcaoX !== undefined ? Math.sign(direcaoX) : (controle.direcao === 'd' ? -1 : 1);
        controle.velocidadeKnockback = dir * 5;

        if (controle._jetpackLoop) {
            controle._jetpackLoop.pause();
            controle._jetpackLoop = null;
        }

        if (elemento) {
            // Força o sprite de "no ar" (pulo) para a animação de voo
            const estaArmadoMorte = controle.temArma && !controle.itensGuardadosNoCinto;
            elemento.src = estaArmadoMorte ? 'assets/personagem/per_armado/per_pul_armado.png' : (config.spriteNoArPlayer || spriteNoAr);
            elemento.style.filter = 'brightness(2) grayscale(0.5)';
            elemento.style.pointerEvents = 'none';
        }

        // Desativa controles
        controle.stunned = true;
        controle.stunTimer = 100;
        window.AudioManager?.playSFX('impacto', 0.8);
    };

    if (typeof window.inicializarEstadoCinto === 'function') {
        window.inicializarEstadoCinto(controle);
    }

    const inventarioSistema = window.criarSistemaInventarioJogador({
        controle,
        config,
        atualizarVisualEscudo,
        atualizarVisualBota,
        getElementos: () => ({
            armaElemento,
            escudoElemento,
            botaElemento,
            coleteElemento,
            jetpackElemento,
            jetFogoElemento,
            garraElemento,
            cintoElemento
        })
    });

    const {
        salvarInventario,
        limparInventarioSalvo,
        droparItemJogador,
        droparItensInimigo,
        aplicarInventarioSalvo
    } = inventarioSistema;

    const sistemaMorteInimigo = window.criarSistemaMorteInimigo({
        droparItensInimigo
    });

    const {
        removerInimigoDerrotado,
        processarMorteFeno
    } = sistemaMorteInimigo;

    // Expõe para que outros sistemas (IA, Combate) usem a mesma lógica de limpeza
    window.removerInimigoDerrotado = removerInimigoDerrotado;
    window.processarMorteFeno = processarMorteFeno;
    window.verificarColisaoComVidroCapsula = verificarColisaoComVidroCapsula;
    window.obterHitboxCapsula = obterHitboxCapsula;

    aplicarInventarioSalvo();

    window.isPaused = false;
    window.togglePause = () => {
        window.isPaused = !window.isPaused;
        if (elemento.parentElement) {
            elemento.parentElement.style.filter = window.isPaused ? 'brightness(0.3) grayscale(0.6)' : 'none';
        }
    };

    window.playerControle = controle;
    window.logVelocidadePlayer = () => {
        const velocidadeX = Number(controle.velocidadeXAtual || 0);
        const velocidadeY = Number(controle.velocidadeY || 0);
        const velocidadeTotal = Math.hypot(velocidadeX, velocidadeY);
        // Removido console.log de debug de velocidade
        /* console.log('[DEBUG PLAYER] Velocidade atual', {
            posicaoX: Number(controle.x.toFixed(2)),
            posicaoY: Number(controle.y.toFixed(2)),
            velocidadeX: Number(velocidadeX.toFixed(2)),
            velocidadeY: Number(velocidadeY.toFixed(2)),
            velocidadeTotal: Number(velocidadeTotal.toFixed(2)),
            temBota: !!controle.temBota,
            bonusBotaAtivo: !!controle.temBota && !controle.botaVermelha && !controle.itensGuardadosNoCinto,
            dashAtivo: Number(controle.dashFramesRestantes || 0) > 0
        });
        */
        return velocidadeTotal;
    };
    window.toggleDebugVelocidadePlayer = (ativo = !controle.debugVelocidadeAtivo) => {
        controle.debugVelocidadeAtivo = !!ativo;
        if (controle.debugVelocidadeAtivo) {
            window.logVelocidadePlayer();
        }
        return controle.debugVelocidadeAtivo;
    };

    function atualizarEstadoPesoJogador() {
        const itensGuardadosNoCinto = !!controle.itensGuardadosNoCinto;
        const botaAtiva = !!((controle.temBota && !controle.botaVermelha) || controle.eletricidadeTemporariaAtiva) && !itensGuardadosNoCinto;
        const totalEquipamentosSemBota = [
            !!controle.temArma && !itensGuardadosNoCinto,
            !!(controle.temEscudo || controle.escudoVermelho) && !itensGuardadosNoCinto,
            !!controle.temJetpack && !itensGuardadosNoCinto,
            !!controle.temGarra && !itensGuardadosNoCinto
        ].filter(Boolean).length;

        controle.pesadoPorEquipamento = totalEquipamentosSemBota >= 3;
        const pesoTemporarioAtivo = Number(controle.pesoTemporarioSuperDescida || 0) > 0;
        controle.pesado = controle.pesadoPorEquipamento || pesoTemporarioAtivo;
        controle.leveComBota = botaAtiva && totalEquipamentosSemBota <= 1 && !controle.pesado;
        return controle.pesado;
    }

    atualizarEstadoPesoJogador();

    // Aplica os efeitos das skills agora que o objeto de controle foi criado
    if (typeof window.aplicarEfeitosSkills === 'function') {
        window.aplicarEfeitosSkills();
    }

    window.projeteis = [];
    window.itensColetaveis = [];

    // Centraliza a criação de acessórios visuais
    window.inicializarVisualEquipamentoEntidade(controle, elemento.parentElement, config);

    // Referências locais para compatibilidade com o restante do arquivo (agora vêm do controle)
    const { armaElemento, escudoElemento, botaElemento, coleteElemento, jetpackElemento, jetFogoElemento, garraElemento, cintoElemento } = controle;

    const sistemaDanoEstacas = window.criarSistemaDanoEstacasJogador({
        controle,
        config,
        elemento,
        escudoElemento,
        atualizarVisualEscudo,
        salvarInventario
    });

    const {
        temEscudoAtivo,
        aplicarDanoEspinho,
        detectarContatoEspinho
    } = sistemaDanoEstacas;

    atualizarVisualEscudo();
    atualizarVisualBota(); // Chamada para garantir que o visual da bota seja atualizado
    atualizarVisualGarra(); // Chamada para garantir que o visual da garra seja atualizado

    const { paraquedasElemento } = window.criarElementosSuporteEquipamentos({
        elemento,
        config,
        controle
    });

    // Sincronização imediata de posição caso o jogador já nasça com a garra no inventário
    if (controle.temGarra) {
        garraElemento.style.left = controle.x + 'px';
        garraElemento.style.bottom = controle.y + 'px';
        garraElemento.style.transform = (controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)');
    }

    const sistemaGarra = window.criarSistemaGarraJogador({
        controle,
        config,
        elemento,
        garraElemento,
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        cintoElemento,
        coleteElemento,
        atualizarVisualEscudo,
        salvarInventario,
        animarDanoAlvo,
            obterKnockback: window.obterKnockbackPadrao,
        virarFenoParaFonteDano,
        processarMorteFeno,
        removerInimigoDerrotado,
        flashComVibacao: typeof flashComVibacao === 'function' ? flashComVibacao : undefined
    });

    const { acionarGarra, coletarItemGarra, atualizarAnimacaoGarra } = sistemaGarra;

        function podeAgacharSemBloqueio() {
            return controle.itensGuardadosNoCinto || obterEquipamentosDoCinto().length === 0;
    }

    function temEspacoParaLevantar() {
        if (!controle.estaAgachado) return true;
        if (typeof verificarColisaoComTiles !== 'function') return true;

        return !verificarColisaoComTiles(
            controle.x + (controle.offsetX || 0),
            controle.y,
            controle.largura,
            controle.alturaEmPe,
            window.plataformas
        );
    }

    function tentarLevantarJogador() {
        if (!controle.estaAgachado) return true;

        if (temEspacoParaLevantar()) {
            controle.estaAgachado = false;
            return true;
        }

        

        if (typeof flashElement === 'function') {
            flashElement(elemento, 120, 4);
        }
        return false;
    }

    const sistemaVisuaisEquipamentos = window.criarSistemaVisuaisEquipamentos({
        controle,
        elemento,
        config,
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        jetFogoElemento,
        garraElemento,
        cintoElemento,
        coleteElemento,
        paraquedasElemento,
        atualizarVisualEscudo,
        tentarLevantarJogador,
        flashElement: typeof flashElement === 'function' ? flashElement : undefined
    });

    const {
        obterEquipamentosDoCinto,
        sincronizarCintoComJogador,
        atualizarVisibilidadeEquipamentosCinto,
        alternarItensNoCinto,
        sincronizarVisuaisEquipamentos
    } = sistemaVisuaisEquipamentos;

    const hudSistema = window.criarSistemaHUDJogador({
        controle,
        elemento,
        config,
        temEscudoAtivo
    });

    const { atualizarHUD } = hudSistema;

    const sistemaControles = window.criarSistemaControlesJogador({
        controle,
        callbacks: {
            onAgachar: () => {
                if (window.controlandoCao || window.controlandoBB) return; // Bloqueia agachar enquanto controla o cão/bb
                if (controle.estaoAberto || controle.abrindo || controle.fechando) return;
                if (controle.estaAgachado) {
                    tentarLevantarJogador();
                } else if (podeAgacharSemBloqueio()) {
                    controle.estaAgachado = true;
                } else if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4);
                }
            },
            onLevantar: () => {
                if (window.controlandoCao || window.controlandoBB) return; // Bloqueia levantar enquanto controla o cão/bb
                tentarLevantarJogador();
            },
            onDebugApagarEquipamento: () => {
                if (typeof window.apagarBasePersistidaDev === 'function') {
                    window.apagarBasePersistidaDev();
                }
            },
            onTogglePauseMenu: () => {
                if (typeof window.togglePauseMenu === 'function') {
                    window.togglePauseMenu();
                } else {
                    console.error("Menu: Erro! A função window.togglePauseMenu não foi encontrada.");
                }
            },
            onGanharXP: (valor) => {
                if (typeof window.ganharXP === 'function') window.ganharXP(valor);
            },
            onToggleSkillMenu: () => {
                if (typeof window.toggleSkillMenu === 'function') {
                    // Removida a trava de !window.isPaused para permitir fechar o menu
                    window.toggleSkillMenu();
                } else if (typeof window.toggleSkillMenu !== 'function') {
                    console.error("Erro: A função 'toggleSkillMenu' não foi encontrada. Verifique se o arquivo skills.js foi carregado corretamente.");
                }
            },
            onDebugProximoNivel: () => {
                if (typeof window.proximoNivel === 'function') window.proximoNivel();
            },
            onDebugSpawnInimigo: () => {
                if (typeof criarInimigoAleatorio === 'function' && window.plataformas) {
                    const coordsArray = Object.keys(window.plataformas);
                    const tipoAleatorio = Math.floor(Math.random() * 3);
                    criarInimigoAleatorio(coordsArray, tipoAleatorio);
                }
            },
            onAcionarGarra: () => {
                acionarGarra();
            },
            onToggleDebugGrade: () => {
                if (typeof window.configurarGrade === 'function') {
                    window.configurarGrade(); // Aciona o toggle da grade centralizado
                }
            },
            onDebugResetSkills: () => {
                window.playerSkills = [];
                window.skillPoints = 0;
                window.playerXP = 0;
                if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();
                if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
                console.log("[DEBUG] Skills resetadas! XP e Pontos zerados.");
                if (typeof window.atualizarHUD === 'function') window.atualizarHUD();
            },
            onAlternarCinto: () => {
                if (controle.estaoAberto || controle.abrindo || controle.fechando) return;
                alternarItensNoCinto();
            },
            onToggleMochila: () => {
                if (typeof window.toggleMochilaMenu !== 'function') return;
                const temUtilidades = !!controle.temColete || !!controle.temCinto || !!controle.cintoSlot;
                if (!temUtilidades && !window.isMochilaMenuOpen) return;
                if ((window.isMenuOpen || window.isSkillMenuOpen) && !window.isMochilaMenuOpen) return;
                if (controle.stunned || controle.vendaEmCurso) return;
                window.toggleMochilaMenu(controle);
            },
            onDebugReset: () => {
                limparInventarioSalvo();
                if (typeof window.limparCraftPersistido === 'function') {
                    window.limparCraftPersistido();
                }

                if (typeof window.resetarJogadorParaZeroMantendoSkills === 'function') {
                    window.resetarJogadorParaZeroMantendoSkills();
                }
                
                if (typeof limparPreviewCraft === 'function') limparPreviewCraft();
                if (typeof removerTodosCrafts === 'function') removerTodosCrafts();

                // console.log('[DEBUG] Sistema resetado via botão 0.'); // Removido console.log de debug
                
                if (typeof atualizarHUD === 'function') {
                    atualizarHUD();
                }
            },
            onEliminarInimigos: () => {
                if (window.inimigos) {
                    for (let i = window.inimigos.length - 1; i >= 0; i--) {
                        const inimigo = window.inimigos[i];
                        removerInimigoDerrotado(inimigo);
                    }
                }
            }
        }
    });

    const { teclaEhAcao, acaoAtiva, consumirAcao } = sistemaControles;
    await sistemaControles.inicializar();

    const sistemaAcoesEspeciais = window.criarSistemaAcoesEspeciaisJogador({
        controle,
        config,
        elemento,
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        jetFogoElemento,
        garraElemento,
        cintoElemento,
        coleteElemento,
        atualizarVisualEscudo,
        salvarInventario,
        acaoAtiva,
        consumirAcao
    });

    const { processarAcoesEspeciais } = sistemaAcoesEspeciais;

    const sistemaCrafting = window.criarSistemaCraftingJogador({
        controle,
        config,
        elemento,
        salvarInventario,
        acaoAtiva,
        consumirAcao,
        flashElement: typeof flashElement === 'function' ? flashElement : undefined
    });
    controle.craftingSystem = sistemaCrafting; // Registra o sistema no controle para ser acessível pelo interator

    const {
        processarInteracaoCraft,
        limparPreviewCraft,
        removerTodosCrafts
    } = sistemaCrafting;

    const sistemaJetpack = window.criarSistemaJetpackJogador({
        controle,
        config,
        acaoAtiva,
        aplicarFisica
    });

    const {
        atualizarCooldownJetpack,
        atualizarJetpack
    } = sistemaJetpack;

    const sistemaCombateCorpoACorpo = window.criarSistemaCombateCorpoACorpoJogador({
        controle,
        config,
        acaoAtiva,
        detectarColisaoHitbox,
        obterKnockback: window.obterKnockbackPadrao,
        animarDanoAlvo,
        virarFenoParaFonteDano,
        processarMorteFeno,
        removerInimigoDerrotado
    });

    const {
        atualizarEstadoChute: atualizarEstadoChuteCorpoACorpo,
        processarEntradaChute,
        aplicarImpulsoChute,
        obterHitboxAtaque,
        processarAcertoChuteEmInimigo,
        atualizarTemporizadores: atualizarTemporizadoresCorpoACorpo
    } = sistemaCombateCorpoACorpo;

    function obterHitboxRoboAberto(robo) {
        if (!robo || !robo.ativo || typeof robo.x !== 'number' || typeof robo.y !== 'number') return null;
        // Ajuste: hitbox do "teto" do robô aberto
        return {
            x: robo.x,
            y: robo.y + robo.altura - 4, // só a parte superior fina
            largura: robo.largura,
            altura: 4
        };
    }
    window.obterHitboxRoboAberto = obterHitboxRoboAberto;

    function obterHitboxCapsula(item) {
        if (!item || item.tipo !== 'capsula') return null;

        const vidroOffsetY = Number(item.vidroOffsetY ?? item.elementoOffsetY ?? 0);
        const vidroAltura = Number(item.vidroAltura ?? 31);

        return {
            x: Number(item.x || 0),
            y: Number(item.y || 0) + vidroOffsetY,
            largura: 32,
            altura: vidroAltura
        };
    }

    function verificarColisaoComVidroCapsula(hitboxPlayer) {
        if (!window.itensColetaveis || typeof window.detectarColisaoHitbox !== 'function') return null;
        
        for (const item of Object.values(window.itensColetaveis)) {
            if (!item || item.tipo !== 'capsula' || item.vidroQuebrado) continue;
            
            const hitboxVidro = obterHitboxCapsula(item);
            if (!hitboxVidro) continue;
            
            if (window.detectarColisaoHitbox(hitboxPlayer, hitboxVidro, 0, 0, 0)) {
                return hitboxVidro;
            }
        }
        
        return null;
    }

    function aplicarDanoEmCapsula(item, origem = 'ataque', hitboxImpacto = null) {
        if (!item || item.tipo !== 'capsula' || item.vidroQuebrado) return false;

        const hitboxCapsula = obterHitboxCapsula(item);

        const sucesso = typeof window.danificarVidroCapsula === 'function'
            ? window.danificarVidroCapsula(item, 1, {
                duracao: origem === 'projetil' ? 500 : 420,
                velocidade: origem === 'projetil' ? 12 : 10
            })
            : false;

        if (sucesso && typeof window.criarAnimacaoImpacto2Frames === 'function') {
            const pontoImpacto = (hitboxCapsula && hitboxImpacto && typeof window.calcularCentroColisaoHitboxes === 'function')
                ? window.calcularCentroColisaoHitboxes(hitboxImpacto, hitboxCapsula)
                : null;

            const impactoX = pontoImpacto?.x ?? (hitboxCapsula ? (hitboxCapsula.x + (hitboxCapsula.largura / 2)) : (Number(item.x || 0) + 16));
            const impactoY = pontoImpacto?.y ?? (hitboxCapsula ? (hitboxCapsula.y + (hitboxCapsula.altura / 2)) : (Number(item.y || 0) + 16));

            window.criarAnimacaoImpacto2Frames({
                x: impactoX,
                y: impactoY,
                largura: 40,
                altura: 40,
                offsetY: 6,
                opacidade: 1,
                frameDurationMs: 130
            });
        }

        return sucesso;
    }

    // Inicializa o sistema de abertura
    if (typeof window.criarSistemaAberturaJogador !== 'function') {
        console.error('[ERRO] Sistema de abertura não foi carregado! Verifique se abertura-animacao.js está no HTML.');
    } else {
        window.criarSistemaAberturaJogador({
            controle,
            config,
            acaoAtiva,
            consumirAcao
        });
    }

    const {
        processarEntrada: processarEntradaAbertura,
        atualizarTemporizadores: atualizarTemporizadoresAbertura
    } = window.sistemaAbertura || {};

    function atualizar() {
        // Garante que o Player use a configuração global atualizada a cada frame
        const config = window.config || {};
        const agoraMsEletricidade = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        controle.eletricidadeTemporariaAtiva = Number(controle.eletricidadeTemporariaAte || 0) > agoraMsEletricidade;
        
        // Lógica de Sprites Armados: seleciona o conjunto de sprites baseado no revólver equipado
        const estaComRevolver = controle.temArma && !controle.itensGuardadosNoCinto;
        
        // AJUSTE: O sprite parado quando armado deve ser o de pernas abertas (per_par_armado.png) para manter a pose ociosa correta
        const sParado = estaComRevolver ? 'assets/personagem/per_armado/per_par_armado.png' : (config.spriteParadoPlayer || spriteParado);
        const sAndando = estaComRevolver ? 'assets/personagem/per_armado/per_and_armado.png' : (config.spriteAndandoPlayer || spriteAndando);
        const sNoAr = estaComRevolver ? 'assets/personagem/per_armado/per_pul_armado.png' : (config.spriteNoArPlayer || spriteNoAr);
        const sAgachado = estaComRevolver ? 'assets/personagem/per_armado/per_agachado_armado.png' : (config.spriteAgachadoPlayer || spriteAgachado);
        const sAgachadoAndando = estaComRevolver ? 'assets/personagem/per_armado/per_agachado2_armado.png' : (config.spriteAgachadoAndandoPlayer || spriteAgachado2);
        const sChute = estaComRevolver ? 'assets/personagem/per_armado/per_chu_armado.png' : (config.spriteChutePlayer || spriteChute);

        // --- BLOQUEIO QUANDO ABERTO ---
        if (controle.estaoAberto && controle.noChao && !window.controlandoBB) {
            if (typeof processarEntradaAbertura === 'function') {
                processarEntradaAbertura();
            }

            // BLOQUEIO INTENCIONAL: este trecho mantém o personagem parado (sem andar e sem pular)
            // enquanto estiver no estado "aberto".
            // Bloqueia movimento e pulo
            controle.movendoHorizontal = false;
            controle.velocidadeX = 0;
            controle.velocidadeHorizontalAtual = 0;
            controle.estaAgachado = false;
            // Não permite pulo
            controle.cooldownPulo = 1;

            if (typeof atualizarAnimacao === 'function') {
                atualizarAnimacao(
                    controle,
                    elemento,
                    sParado,
                    sAndando,
                    sNoAr,
                    sAgachado,
                    sAgachadoAndando
                );
            }
            
            // Apenas atualiza HUD e sincroniza visual
            atualizarHUD();
            elemento.style.left = controle.x + 'px';
            elemento.style.bottom = controle.y + 'px';
            elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
            
            // Sincroniza acessórios
            window.sincronizarAcessoriosEntidade(controle, {
                armaElemento,
                escudoElemento,
                botaElemento,
                jetpackElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            });
            
            requestAnimationFrame(atualizar);
            return;
        }

        // --- BLOQUEIO DURANTE ANIMAÇÃO DE ABERTURA ---
        if ((controle.abrindo || controle.fechando || (controle.tempoAbertura || 0) > 0) && !window.controlandoBB) {
            // Atualiza os temporizadores da animação de abertura PRIMEIRO
            if (typeof atualizarTemporizadoresAbertura === 'function') {
                atualizarTemporizadoresAbertura();
            }
            
            // Bloqueia movimento e pulo
            controle.movendoHorizontal = false;
            controle.velocidadeX = 0;
            controle.velocidadeHorizontalAtual = 0;
            controle.estaAgachado = false;
            controle.cooldownPulo = 1;

            // Durante a animação, congela a física vertical para manter o personagem parado no ar.
            if (!controle.noChao) {
                controle.velocidadeY = 0;
            }

            if (typeof atualizarAnimacao === 'function') {
                atualizarAnimacao(
                    controle,
                    elemento,
                    sParado,
                    sAndando,
                    sNoAr,
                    sAgachado,
                    sAgachadoAndando
                );
            }
            
            // Apenas atualiza HUD e sincroniza visual
            atualizarHUD();
            elemento.style.left = controle.x + 'px';
            elemento.style.bottom = controle.y + 'px';
            elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
            
            // Sincroniza acessórios
            window.sincronizarAcessoriosEntidade(controle, {
                armaElemento,
                escudoElemento,
                botaElemento,
                jetpackElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            });
            
            requestAnimationFrame(atualizar);
            return;
        }
        
        // DEBUG: Logar estado das ações de movimento e teclas virtuais
        // if (window.DEBUG_CONTROLE_MOVIMENTO) { // Removido bloco de debug de controle
        //     const acoes = ['esquerda', 'direita', 'cima', 'baixo'];
        //     window.__DEBUG_CONTROLE_LAST = window.__DEBUG_CONTROLE_LAST || {};
        //     acoes.forEach(acao => {
        //         const ativa = acaoAtiva(acao);
        //         if (window.__DEBUG_CONTROLE_LAST[acao] !== ativa) {
        //             window.__DEBUG_CONTROLE_LAST[acao] = ativa;
        //             console.log(`[DEBUG CONTROLE] ${acao}: ${ativa}`);
        //         }
        //     });
        //     // ...
        // }

        // --- LÓGICA DE MORTE (FLYING DEATH) ---
        if (controle.estaMorrendo) {
            const gravMorte = config.gravidadeUniversal ? (config.forcaGravidade?.gravidade ?? 0.5) : (config.gravidadePlayer ?? 0.5);
            controle.velocidadeY -= gravMorte;
            controle.y += controle.velocidadeY;
            controle.x += controle.velocidadeKnockback;

            elemento.style.left = controle.x + 'px';
            elemento.style.bottom = controle.y + 'px';
            
            // Rotação cartoon baseada no tempo de voo
            const rot = (35 - controle.framesMorrendo) * 15 * (controle.velocidadeKnockback > 0 ? 1 : -1);
            const flip = controle.velocidadeKnockback > 0 ? 1 : -1;
            elemento.style.transform = `scaleX(${flip}) rotate(${rot}deg)`;

            // Sincroniza acessórios voados usando o helper centralizado
            window.sincronizarAcessoriosEntidade(controle, {
                armaElemento,
                escudoElemento,
                botaElemento,
                jetpackElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            }, { forçarSincroniaGarra: true });

            controle.framesMorrendo--;
            if (controle.framesMorrendo <= 0 || controle.y < -128) {
                controle.estaMorrendo = false;
                elemento.style.filter = 'none';
                elemento.style.transform = 'none';
                alert("Game Over!");
                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
            }
            requestAnimationFrame(atualizar);
            return;
        }

        // Lógica de Stun do Jogador (quando capturado pela garra inimiga)
        // Durante controle do BB (resgate), não interrompe o loop para manter câmera/follow do BB.
        if (controle.stunned && !window.controlandoBB) {
            if (controle.stunTimer > 0) {
                controle.stunTimer--;
                // Visual de atordoamento (olhando para os lados)
                if (controle.stunTimer % 15 === 0) {
                    controle.direcao = (controle.direcao === 'd' ? 'e' : 'd');
                }
                // Sincroniza visual do player enquanto é arrastado
                elemento.style.left = controle.x + 'px';
                elemento.style.bottom = controle.y + 'px';
                elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                
                // Sincroniza acessórios via helper global (unificando o código que era manual)
                window.sincronizarAcessoriosEntidade(controle, {
                    armaElemento,
                    escudoElemento,
                    botaElemento,
                    jetpackElemento,
                    garraElemento,
                    cintoElemento,
                    coleteElemento
                });

                // Mantém o HUD atualizado
                atualizarHUD();
                requestAnimationFrame(atualizar);
                return; // Bloqueia comandos enquanto estiver atordoado
            } else {
                controle.stunned = false;
                elemento.style.filter = 'none';
            }
        }

        // --- LÓGICA DE TROCA DE PERSONAGEM (PRIORIDADE MÁXIMA) ---
        // Verifica se o jogador quer assumir o controle do cachorro (Abaixar + Colisão + 'Q')
        const apertouQ = (controle.teclas['q'] || controle.teclas['Q']);
        
        if (!window.controlandoCao && !window.controlandoGato && !window.controlandoBB && apertouQ) {
            // Verifica se o jogador possui a habilidade necessária para controlar pets
            if (window.PetAbilities && !window.PetAbilities.podeSerControlado(true)) {
                // Trava de Habilidade: Se não tiver a skill, apenas sinaliza o erro e continua o loop
                if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4); // Feedback visual de erro
                }
                // Consome a tecla para evitar que o flash se repita sem parar enquanto segura o botão
                controle.teclas['q'] = false;
                controle.teclas['Q'] = false;
            } else {
                // Tenta a troca se houver pet e o jogador estiver agachado
                if (controle.estaAgachado) {
                    const hitboxPlayer = { 
                        x: controle.x + (controle.offsetX || 0), 
                        y: controle.y, 
                        largura: controle.largura, 
                        altura: controle.altura 
                    };

                    // Função para verificar troca por pet
                    const tentarTroca = (pet, flag) => {
                        if (!pet) return false;
                        // Colisão dos pets: usa a hitbox própria de cada pet (largura/altura).
                        // Ex.: BB já entra aqui com colisão lateral reduzida (largura 10, offsetX 10).
                        const hitboxPet = { x: pet.x, y: pet.y, largura: pet.largura, altura: pet.altura };
                        if (window.detectarColisaoHitbox(hitboxPlayer, hitboxPet, -15, -15, -15)) {
                            window[flag] = true;
                            window.retornoControlePetParaBB = false;
                            controle.teclas['q'] = false;
                            controle.teclas['Q'] = false;
                            window.AudioManager?.playSFX('engrenagem', 0.5);
                            return true;
                        }
                        return false;
                    };

                    if (tentarTroca(window.caoEntidade, 'controlandoCao') || 
                        tentarTroca(window.gatoEntidade, 'controlandoGato') ||
                        tentarTroca(window.bbEntidade, 'controlandoBB')) {
                        window.cameraZoomFactor = 1.5;
                        requestAnimationFrame(atualizar);
                        return;
                    }
                }
            }
        }

        if (Number(controle.cooldownInteracaoRoboAposMusgo || 0) > 0) {
            controle.cooldownInteracaoRoboAposMusgo--;
        }

        if (Number(controle.cooldownInteracaoAlavanca || 0) > 0) {
            controle.cooldownInteracaoAlavanca--;
        }

        // --- LÓGICA DE TOGGLE ARMA/ESCUDO (TECLA E) ---
        const apertouE = !!(controle.teclas['e'] || controle.teclas['E']);
        if (apertouE && !controle.ePressionado) {
            const interagiuComMusgo = (!window.controlandoCao && !window.controlandoGato && !window.controlandoBB)
                ? !!window.interagirComMusgoAlvo?.(controle, controle.teclas)
                : false;

            const interagiuComAlavanca = (!interagiuComMusgo && !window.controlandoCao && !window.controlandoGato && !window.controlandoBB)
                ? !!window.interagirComAlavanca?.(controle, controle.teclas, { exigeAgachado: true })
                : false;

            const interagiuComRoboDesativado = (!interagiuComMusgo && !interagiuComAlavanca
                && Number(controle.cooldownInteracaoRoboAposMusgo || 0) <= 0
                && !window.controlandoCao && !window.controlandoGato && !window.controlandoBB)
                ? !!window.interagirComRoboDesativado?.(controle, controle.teclas)
                : false;

            if (!interagiuComMusgo && !interagiuComAlavanca && !interagiuComRoboDesativado && !window.controlandoCao && !window.controlandoGato && !window.controlandoBB && !controle.estaAgachado && controle.temCinto) {
                if (typeof sistemaVisuaisEquipamentos.alternarEquipamentoSelecao === 'function') {
                    sistemaVisuaisEquipamentos.alternarEquipamentoSelecao();
                }
            }
        }
        controle.ePressionado = apertouE;

        if (window.controlandoCao || window.controlandoGato || window.controlandoBB) {
            processarEsperaJogador();
            requestAnimationFrame(atualizar);
            return;
        }

        if (processarAcoesEspeciais()) {
            atualizarHUD();
            requestAnimationFrame(atualizar);
            return;
        }

        processarInteracaoCraft();
        atualizarAnimacaoGarra();

        // --- LÓGICA DE ÁUDIO DE PASSOS ---
        if (controle.noChao && controle.movendoHorizontal && !controle.dashFramesRestantes) {
            const velX = Math.abs(controle.velocidadeXAtual);
            controle.distanciaPercorridaPasso += velX;

            // Se estiver agachado, os passos são mais lentos (frequencia maior)
            const freqAtual = controle.estaAgachado ? controle.frequenciaPasso * 1.5 : controle.frequenciaPasso;

            if (controle.distanciaPercorridaPasso >= freqAtual) {
                window.AudioManager?.playPasso();
                controle.distanciaPercorridaPasso = 0;
            }
        } else {
            controle.distanciaPercorridaPasso = 0;
            window.AudioManager?.stopPasso();
        }

        // --- LÓGICA DE COMBINAÇÕES DE ENTRADA ---
        const segurandoBaixo = acaoAtiva('baixo');

        // Combinação: Dropar Item
        if (segurandoBaixo && acaoAtiva('pulo') && controle.noChao) {
            consumirAcao('pulo'); 
            droparItemJogador();
        }

        // Debug/Teste: dispara manualmente o VFX de impacto no centro do jogador.


        // Atualiza a interface de visão
        atualizarHUD();

        // Sistema de auto-reparo de itens Plus
        if (typeof window.verificarAutoReparoEquipamentos === 'function') window.verificarAutoReparoEquipamentos();

        if (window.isPaused) {
            requestAnimationFrame(atualizar);
            return;
        }

        // Função auxiliar para manter o jogador no chão enquanto o cachorro se move
        function processarEsperaJogador() {
            controle.movendoHorizontal = false;
            controle.velocidadeHorizontalAtual = 0;
            
            if (typeof aplicarFisica === 'function') { // A gravidade é aplicada aqui para o jogador quando o cão está sendo controlado
                const gravEspera = config.gravidadeUniversal ? (config.forcaGravidade?.gravidade ?? 0.15) : (config.gravidadePlayer ?? 0.5);
                aplicarFisica(controle, {}, 0, gravEspera, 0);
            }
            const hitV = typeof verificarColisaoComTiles === 'function' ? verificarColisaoComTiles(controle.x + controle.offsetX, controle.y, controle.largura, controle.altura, window.plataformas) : null;
            if (hitV && controle.velocidadeY < 0) {
                controle.noChao = true;
                controle.velocidadeY = 0;
                if (typeof window.aplicarSnapColisaoPadrao === 'function') {
                    controle.y = window.aplicarSnapColisaoPadrao(controle.y, 0, controle.altura, hitV, 'cima');
                }
            }
            elemento.style.left = controle.x + 'px';
            elemento.style.bottom = controle.y + 'px';
            if (typeof atualizarAnimacao === 'function') {
                atualizarAnimacao(controle, elemento, sParado, sAndando, sNoAr, sAgachado, sAgachadoAndando);
            }
            sincronizarVisuaisEquipamentos();
            const petFoco = window.controlandoCao ? window.caoEntidade : (window.controlandoGato ? window.gatoEntidade : window.bbEntidade);
            if (typeof window.atualizarCamera === 'function' && petFoco) {
                // Enquanto o BB estiver sob controle, força o mesmo zoom de pet em todo frame.
                if (window.controlandoBB) {
                    window.cameraZoomFactor = 1.5;
                }

                // Usa centro da hitbox com pequeno ajuste à esquerda para enquadramento melhor (configurável).
                const ajusteEsquerdaPet = Number(config.cameraAjusteEsquerdaPetBB ?? 32);
                const centroFocoX = Number(petFoco.x || 0) + Number(petFoco.offsetX || 0) + (Number(petFoco.largura || 20) / 2) + ajusteEsquerdaPet;
                const centroFocoY = Number(petFoco.y || 0) + (Number(petFoco.altura || 20) / 2);
                window.atualizarCamera(centroFocoX, centroFocoY, window.mundoLargura, window.mundoAltura);
            }
        }

        // Resetamos o estado horizontal, mas o noChao será validado pelas colisões abaixo
        const noChaoAnterior = controle.noChao;

        // Ajusta a hitbox de acordo com o estado agachado (muda altura a cada frame)
        controle.altura = controle.estaAgachado
            ? (config.agachadoHitboxAltura ?? 16)
            : controle.alturaEmPe;
        
        // Sincroniza o estado de chute com o timer
        atualizarEstadoChuteCorpoACorpo();

        controle.carregando = acaoAtiva('carregando');
        controle.garra2Ativa = !!(controle.temGarra2 && acaoAtiva('garra') && !controle.stunned && !controle.estaMorrendo);

        controle.movendoHorizontal = false;
        const xAnterior = controle.x;
        const yAnterior = controle.y;

        const velBase = config.velocidadePlayer || 2;

        const selecao = controle.selecaoCinto || 'todos';
        const escudoNoToggle = (selecao === 'todos' || selecao === 'escudo');

        const escudoFisicoAtivoSemPenalidadeEletrica = !!(controle.temEscudo && !controle.escudoVermelho && !controle.itensGuardadosNoCinto);
        let velAtiva = (escudoFisicoAtivoSemPenalidadeEletrica && escudoNoToggle)
            ? Math.max(0, velBase - (config.escudoVelocidadeReduzida ?? 2))
            : velBase;

        // Aplica o bônus de velocidade se estiver usando a bota
        if (((controle.temBota && !controle.botaVermelha) || controle.eletricidadeTemporariaAtiva) && !controle.itensGuardadosNoCinto) {
            velAtiva += Number(config.bonusVelocidadeBota ?? 2);
        }

        if (controle.estaAgachado) {
            const multiplicadorAgachado = Number(config.agachadoMultiplicadorVelocidade ?? 0.55);
            velAtiva *= Math.max(0, multiplicadorAgachado);
        }

        atualizarEstadoPesoJogador();

        const dashDisponivel = !!controle.dashHabilitado && window.temSkill?.((window.SKILLS || {}).DASH);
        if (dashDisponivel && controle.dashSolicitado && (controle.cooldownDash || 0) === 0 && !controle.estaAgachado) {
            window.AudioManager?.playSFX('dash', 0.5);
            const duracaoDash = Math.max(1, Number(config.dashDuracao ?? 8));
            const distanciaDashBase = Math.max(0, Number(config.distanciaDash ?? 64)); // CONFIGURAÇÃO DASH PADRÃO: 64 pixels (valor de fallback se não definido no JSON)
            const multiplicadorDashBota = controle.leveComBota ? 2 : 1;
            const distanciaDash = controle.pesado
                ? (distanciaDashBase / 2)
                : (distanciaDashBase * multiplicadorDashBota); // Distância total do dash
            controle.dashDirecao = controle.dashSolicitado;
            controle.dashFramesRestantes = duracaoDash;
            controle.velocidadeDashSkill = distanciaDash / duracaoDash; // Velocidade por frame do dash
            controle.cooldownDash = Math.max(1, Number(config.cooldownDashPlayer ?? 45));

            // Ao iniciar um dash, zera a velocidade horizontal atual para o dash assumir o controle
            controle.velocidadeHorizontalAtual = 0;
            
            // Se o dash for para a esquerda, a direção do player deve ser 'e'
            if (controle.dashDirecao === 'e') controle.direcao = 'e';
            
            if (controle.temBota && !controle.itensGuardadosNoCinto && !controle.botaVermelha) {
                const maxUsosBota = Math.max(1, Number(config.botaDashsAteDesgastar ?? 3));
                controle.botaUsosDash = Number(controle.botaUsosDash || 0) + 1;
                if (controle.botaUsosDash >= maxUsosBota) {
                    controle.botaUsosDash = maxUsosBota;
                    controle.botaVermelha = true;
                }
                atualizarVisualBota();
                if (typeof window.salvarInventario === 'function') {
                    window.salvarInventario();
                }
            }

            controle.dashSolicitado = null;
        }

        // Movimentação Horizontal (Input do Jogador)
        let inputHorizontalAtivo = false;
        if (acaoAtiva('esquerda')) {
            controle.velocidadeHorizontalAtual = -velAtiva;
            if (!controle.chutando) controle.direcao = 'e';
            controle.movendoHorizontal = true;
            inputHorizontalAtivo = true;
        }
        if (acaoAtiva('direita')) {
            controle.velocidadeHorizontalAtual = velAtiva;
            if (!controle.chutando) controle.direcao = 'd';
            controle.movendoHorizontal = true;
            inputHorizontalAtivo = true;
        }

        // Aplica a velocidade horizontal atual (se não houver dash ou knockback)
        // Dash e Knockback têm prioridade e movem o personagem diretamente
        if (!inputHorizontalAtivo && (controle.dashFramesRestantes || 0) === 0 && (controle.framesKnockbackRestante || 0) === 0) {
            // Se não há input ativo, aplica desaceleração
            window.aplicarDesaceleracaoHorizontal(controle, config);
            // Atualiza movendoHorizontal com base na velocidade residual
            controle.movendoHorizontal = Math.abs(controle.velocidadeHorizontalAtual) > (config.limiteVelocidadeMinimaHorizontal ?? 0.1);
        } else if (inputHorizontalAtivo) {
            // Se há input ativo, aplica a velocidade calculada
            controle.x += controle.velocidadeHorizontalAtual;
        }
        
        if ((controle.dashFramesRestantes || 0) > 0) {
            const direcaoDashSkill = controle.dashDirecao === 'd' ? 1 : -1;
            controle.x += (controle.velocidadeDashSkill || 0) * direcaoDashSkill;

            // Lógica do SuperDash: Atordoa inimigos ao passar por eles
            if (controle.superDashHabilitado && window.inimigos) {
                const hitboxPlayer = { 
                    x: controle.x + (controle.offsetX || 0), 
                    y: controle.y, 
                    largura: controle.largura, 
                    altura: controle.altura 
                };
                
                window.inimigos.forEach(inimigo => {
                    if (inimigo.estaMorto || inimigo.stunned || inimigo.ehBBInimigo) return;
                    
                    const hitboxInimigo = {
                        x: inimigo.x + (inimigo.offsetX || 0),
                        y: inimigo.y,
                        largura: inimigo.largura,
                        altura: inimigo.altura
                    };

                    if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxPlayer, hitboxInimigo, 0, 0, 0)) {
                        inimigo.stunned = true;
                        inimigo.stunTimer = Number(config.superDescidaStunDuracaoInimigos ?? 180);
                        // Efeito visual opcional: flash rápido no inimigo atingido
                        if (typeof window.flashRapido === 'function') window.flashRapido(inimigo.elemento);
                    }
                });
            }

            // Aplica o efeito de sombra a cada 2 frames do dash para rastro de velocidade
            if (typeof window.criarSombraDash === 'function' && controle.dashFramesRestantes % 1 === 0) {
                window.criarSombraDash(elemento);
            }

            if (!controle.chutando) controle.direcao = controle.dashDirecao;
            controle.movendoHorizontal = true;
            controle.dashFramesRestantes--;
            controle.velocidadeHorizontalAtual = 0; // Zera a velocidade horizontal para o dash ter controle total
        }

        // Sistema de combate corpo a corpo
        processarEntradaChute(window.inimigos);
        aplicarImpulsoChute();

        // Sistema de abertura
        if (typeof processarEntradaAbertura === 'function') {
            processarEntradaAbertura();
        }

        // Aplica knockback se o jogador foi atingido (executa o movimento calculado)
        if (controle.framesKnockbackRestante > 0) {
            window.aplicarDeslocamentoHorizontalComColisaoPadrao(controle, controle.velocidadeKnockback, window.plataformas, {
                largura: controle.largura,
                altura: controle.altura,
                offsetX: controle.offsetX || 0,
                maxPasso: Number(config.playerKnockbackPassoMax ?? 1),
                cancelarKnockbackAoColidir: true
            });
            controle.velocidadeHorizontalAtual = 0; // Zera a velocidade horizontal para o knockback ter controle total
            controle.framesKnockbackRestante--;
        }

        // Lógica de Disparo (tecla I)
        const armaNaMao = !controle.temCinto || (controle.selecaoCinto !== 'escudo');
        if (acaoAtiva('tiro') && controle.cooldownTiro === 0 && controle.temArma && !controle.itensGuardadosNoCinto && controle.municao > 0 && armaNaMao) {
            controle.cooldownTiro = config.cooldownTiro; 
            controle.municao--;
            window.AudioManager?.playSFX('disparo', 0.5);
            const dir = controle.direcao === 'd' ? 1 : -1;
            
            // Inicia na frente do personagem (considerando 32px de largura do sprite)
            const xPartida = (controle.direcao === 'd') ? controle.x + 36 : controle.x - 8;
            const yPartida = controle.y + 16; // Alinhado verticalmente com o centro

            const armaEquipada = controle.heldWeaponType || 'revolver';

            // Efeito visual de flash de cano (muzzle flash)
            if (typeof window.criarAnimacaoImpacto2Frames === 'function' && typeof window.obterSpriteItem === 'function') {
                const escalaFlash = (armaEquipada === 'doze') ? 1.5 : 1.0;
                // Obtém o caminho do sprite definido no inventário/config
                const spriteFlash = window.obterSpriteItem('muzzle_flash', config, 'equipado');
                const ajusteMuzzleDirecional = (controle.direcao === 'd') ? 6 : -6;
                const ajusteMuzzleVertical = -4;

                window.criarAnimacaoImpacto2Frames({
                    x: ((controle.direcao === 'd') ? controle.x + 32 + (config.muzzleFlashOffsetX ?? 8) : controle.x - (config.muzzleFlashOffsetX ?? 8)) + ajusteMuzzleDirecional,
                    y: controle.y + 16 + (config.muzzleFlashOffsetY ?? 0) + ajusteMuzzleVertical,
                    largura: (config.muzzleFlashWidth ?? 32) * escalaFlash,
                    altura: (config.muzzleFlashHeight ?? 32) * escalaFlash,
                    flipX: controle.direcao !== 'd',
                    frameDurationMs: 40, // Duração bem curta para o efeito de piscar
                    opacidade: 0.6, // Transparência suave
                    frames: [
                        spriteFlash, 
                        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Frame transparente para o "blink"
                        spriteFlash
                    ]
                });
            }

            // Padrão de tiro: Revolver = 1 tiro reto | Doze = 3 tiros (1 reto + 2 diagonais)
            const tiros = armaEquipada === 'doze' 
                ? [
                    { dx: 0, dy: 0, dir: dir },      // Tiro reto no meio
                    { dx: 0, dy: 16, dir: dir },     // Tiro diagonal para cima
                    { dx: 0, dy: -16, dir: dir }     // Tiro diagonal para baixo
                ]
                : [
                    { dx: 0, dy: 0, dir: dir }       // Tiro reto (revolver)
                ];

            tiros.forEach((tiro, indice) => {
                // Para o doze, adiciona pequeno delay para efeito cascata
                const delay = armaEquipada === 'doze' ? indice * 30 : 0;

                setTimeout(() => {
                    const projElemento = document.createElement('img');
                    projElemento.src = config.spriteProjetil;
                    projElemento.style.position = 'absolute';
                    projElemento.style.width = config.PROJETIL_LARGURA + 'px';
                    projElemento.style.height = config.PROJETIL_ALTURA + 'px';
                    projElemento.style.left = (xPartida + tiro.dx) + 'px';
                    projElemento.style.bottom = (yPartida + tiro.dy) + 'px';
                    projElemento.style.imageRendering = 'pixelated';
                    projElemento.style.pointerEvents = 'none'; // Não interfere com cliques
                    adicionarAoLayer(projElemento, window.LAYERS.PROJETEIS);

                    window.projeteis.push({
                        x: xPartida + tiro.dx,
                        y: yPartida + tiro.dy,
                        direcao: tiro.dir,
                        elemento: projElemento,
                        origem: 'player'
                    });
                }, delay);
            });
            
            // Efeito visual de disparo na arma do jogador
            if (typeof window.flashRapido === 'function' && armaElemento) {
                if (armaEquipada === 'doze') {
                    // Para doze: efeito mais potente com vibração
                    if (typeof window.flashComVibacao === 'function') {
                        window.flashComVibacao(armaElemento);
                    } else {
                        window.flashRapido(armaElemento);
                    }
                } else {
                    // Para revolver: flash simples
                    window.flashRapido(armaElemento);
                }
            }
            
            // Aciona a nova animação de inclinação
            if (armaElemento && typeof aplicarRecuoRevolver === 'function') {
                if (armaEquipada === 'doze') {
                    // Para doze: recuo mais acentuado
                    aplicarRecuoRevolver(armaElemento, 150);
                } else {
                    // Para revolver: recuo padrão
                    aplicarRecuoRevolver(armaElemento, 100);
                }
            }
            
            // console.log(`Jogador disparou! Munição restante: ${controle.municao}`); // Removido console.log de debug
        }

        atualizarTemporizadoresCorpoACorpo();

        // Atualiza temporizadores de abertura
        if (typeof atualizarTemporizadoresAbertura === 'function') {
            atualizarTemporizadoresAbertura();
        }

        // Diminui o cooldown do tiro
        if (controle.cooldownTiro > 0) {
            controle.cooldownTiro--;
        }

        if (controle.cooldownDanoEspinho > 0) {
            controle.cooldownDanoEspinho--;
        }

        if ((controle.cooldownDash || 0) > 0) {
            controle.cooldownDash--;
        }

        // Diminui o cooldown do pulo
        if (controle.cooldownPulo > 0) {
            controle.cooldownPulo--;
        }

        atualizarCooldownJetpack();

        // 📍 RASTREAMENTO DE DIREÇÃO PARA CÂMERA GRANDE
        // Mantém a última direção horizontal ao parar e ignora microvariações,
        // evitando o leve balanço da câmera quando o personagem fica imóvel.
        const movimentoFrameX = controle.x - xAnterior;
        const movimentoFrameY = controle.y - yAnterior;
        const LIMIAR_CAMERA_X = 0.1;
        const LIMIAR_CAMERA_Y = 0.1;
        
        if (movimentoFrameX > LIMIAR_CAMERA_X) {
            window.ultimaDirecaoX = 1; // Movendo para direita
        } else if (movimentoFrameX < -LIMIAR_CAMERA_X) {
            window.ultimaDirecaoX = -1; // Movendo para esquerda
        }
        
        if (movimentoFrameY > LIMIAR_CAMERA_Y) {
            window.ultimaDirecaoY = 1; // Movendo para cima
        } else if (movimentoFrameY < -LIMIAR_CAMERA_Y) {
            window.ultimaDirecaoY = -1; // Movendo para baixo
        } else {
            window.ultimaDirecaoY = 0; // Sem movimento vertical relevante
        }

        // ITEM 6: Limites do Palco (Horizontal) - Aplicar antes da colisão com tiles
        const limitePalcoX = limitarPosicaoAoPalco(controle.x + controle.offsetX, controle.y, controle.largura, controle.altura);
        controle.x = limitePalcoX.x - controle.offsetX;

        // Verifica colisão com vidro da cápsula (movimento horizontal e vertical)
        const hitboxPlayerFinal = {
            x: controle.x + (controle.offsetX || 0),
            y: controle.y,
            largura: controle.largura,
            altura: controle.altura
        };
        const vidroColidido = verificarColisaoComVidroCapsula(hitboxPlayerFinal);
        if (vidroColidido) {
            // Se colidiu com vidro, tenta fazer snap a partir da direção anterior
            if (controle.x > xAnterior) {
                // Estava se movendo para direita, recua
                controle.x = vidroColidido.x - (controle.largura + controle.offsetX);
            } else if (controle.x < xAnterior) {
                // Estava se movendo para esquerda, avança
                controle.x = (vidroColidido.x + vidroColidido.largura) - controle.offsetX;
            }
            if (controle.y > yAnterior) {
                // Estava se movendo para cima, recua
                controle.y = vidroColidido.y - controle.altura;
            } else if (controle.y < yAnterior) {
                // Estava se movendo para baixo, avança
                controle.y = vidroColidido.y + vidroColidido.altura;
            }
        }

        // ⚠️ ITEM 4: Sub-stepping Horizontal (Linha 1390) - DETECTA COLISÕES ESTACAS
        // Quebra movimento em passos de 16px para detectar colisões com estacas
        // Se colidir com estaca DIREITA/ESQUERDA, usa esquerdaReal/direitaReal para posicionar
        const distTotalX = controle.x - xAnterior;
        if (!controle.garraPuxando) {
        if (Math.abs(distTotalX) > 16) { // Se mover mais de meio bloco (16px) em um frame
            const passos = Math.ceil(Math.abs(distTotalX) / 16);
            const incrementoX = distTotalX / passos;
            controle.x = xAnterior;
            
            for (let i = 0; i < passos; i++) {
                controle.x += incrementoX;
                const hitH = typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(controle.x + controle.offsetX, controle.y, controle.largura, controle.altura, window.plataformas);
                
                if (hitH) {
                    // Ignora colisões que não têm efeito horizontal
                    if (hitH.tipo !== 'solido' && hitH.temColisaoLateral === false) {
                        continue; // Continua o movimento horizontal
                    }
                    
                    if (incrementoX > 0) { // Indo para Direita
                        const novoX = aplicarSnapColisao(controle.x, controle.offsetX, controle.largura, hitH, 'direita');
                        controle.x = novoX;
                    } else { // Indo para Esquerda
                        const novoX = aplicarSnapColisao(controle.x, controle.offsetX, controle.largura, hitH, 'esquerda');
                        controle.x = novoX;
                    }
                    break; // Parar o movimento horizontal após o snap
                }
            }
        } else {
            // ⚠️ ITEM 5: Colisão Horizontal em baixas velocidades (Linha 1425)
            // Quando movimento é menor que 16px, verifica colisão direto
            const hitH = typeof verificarColisaoComTiles === 'function' && 
                verificarColisaoComTiles(controle.x + controle.offsetX, controle.y, controle.largura, controle.altura, window.plataformas);
            
            if (hitH) {
                // Ignora colisões que não têm efeito horizontal
                if (hitH.tipo !== 'solido' && hitH.temColisaoLateral === false) {
                    // Continua movimento
                } else {
                    if (controle.x > xAnterior) { // Indo para Direita
                        const novoX = aplicarSnapColisao(controle.x, controle.offsetX, controle.largura, hitH, 'direita');
                        controle.x = novoX;
                    } else if (controle.x < xAnterior) { // Indo para Esquerda
                        const novoX = aplicarSnapColisao(controle.x, controle.offsetX, controle.largura, hitH, 'esquerda');
                        controle.x = novoX;
                    }
                }
            }
        }
        } // fim !garraPuxando

        // Calcula a força do pulo final: se tiver a bota, soma o bônus definido nas configurações
        const baseForcaPulo = config.gravidadeUniversal ? (config.forcaGravidade?.forcaPulo ?? 10) : (config.forcaPuloPlayer || 10);
        const forcaPuloFinal = (((controle.temBota && !controle.botaVermelha) || controle.eletricidadeTemporariaAtiva) && !controle.itensGuardadosNoCinto)
            ? (baseForcaPulo + (config.bonusPuloBota || 1.5)) 
            : baseForcaPulo; // Clique duplo (timing para a skill Salto)
        if (controle.timerPuloDuplo > 0) controle.timerPuloDuplo--;

        // Decrementa o cooldown do pulo duplo
        if (controle.cooldownPuloDuplo > 0) controle.cooldownPuloDuplo--;

        // Decrementa cooldown da skill Saltitar (salto automático em sequência)
        if (controle.cooldownSaltitar > 0) controle.cooldownSaltitar--;

        // Decrementa o cooldown pós Super Descida
        if (controle.cooldownPosSuperDescida > 0) controle.cooldownPosSuperDescida--;
        if (controle.pesoTemporarioSuperDescida > 0) controle.pesoTemporarioSuperDescida--;

        // Lógica da Skill Passiva "Salto" - Pulo Duplo
        const coyoteTimeSegundos = Math.max(0, Number(config.coyoteTimeSegundos ?? 0.1));
        const coyoteFramesMax = Math.max(0, Math.round(coyoteTimeSegundos * 60));
        if (controle.noChao) {
            controle.coyoteFramesRestantes = coyoteFramesMax;
        } else if (controle.coyoteFramesRestantes > 0) {
            controle.coyoteFramesRestantes--;
        }

        const teclaPuloAtiva = acaoAtiva('pulo') && controle.cooldownPosSuperDescida === 0;
        const puloAcabouDeSerPressionado = teclaPuloAtiva && !controle.espacoPressionado;
        controle.espacoPressionado = teclaPuloAtiva;

        const jumpBufferSegundos = Math.max(0, Number(config.jumpBufferSegundos ?? 0.1));
        const jumpBufferFramesMax = Math.max(0, Math.round(jumpBufferSegundos * 60));
        if (puloAcabouDeSerPressionado) {
            controle.jumpBufferFramesRestantes = jumpBufferFramesMax;
        } else if (controle.jumpBufferFramesRestantes > 0) {
            controle.jumpBufferFramesRestantes--;
        }

        const podePuloInicial = controle.noChao || controle.coyoteFramesRestantes > 0;
        const deveConsumirPuloInicial = puloAcabouDeSerPressionado || controle.jumpBufferFramesRestantes > 0;

        // Skill Saltitar: enquanto segura pulo, cria sequência automática SOMENTE ao tocar o chão
        // (não usa coyote/buffer para iniciar no ar)
        const saltitarAtivo = !!controle.saltitarHabilitado && acaoAtiva('pulo');
        const podeSaltitar = saltitarAtivo && controle.noChao && (controle.cooldownPulo === 0 || controle.cooldownPulo == null);

        if (podePuloInicial) {
            // Se o pulo duplo foi usado no ar, inicia o cooldown agora que o jogador tocou o chão
            if (controle.doubleJumpUsedInAir) {
                controle.cooldownPuloDuplo = 30; // Inicia o cooldown de 0.5 segundos
                controle.doubleJumpUsedInAir = false; // Reseta a flag
            }

            if (controle.cooldownPulo === 0 && (deveConsumirPuloInicial || podeSaltitar)) { // Adicionado cooldownPulo para evitar pulo imediato
                window.AudioManager?.playSFX('pulo', 0.5);
                controle.pulosRealizados = 1;
                controle.velocidadeY = forcaPuloFinal; // CORREÇÃO: Aplica a força do pulo no chão
                controle.noChao = false;
                controle.coyoteFramesRestantes = 0;
                controle.jumpBufferFramesRestantes = 0;
                controle.timerPuloDuplo = config.janelaPuloDuplo ?? 12; // Janela de tempo mais rigorosa: 10 frames (aprox. 0.16s)
                
                // Se estiver saltitando, garante que o cooldown do pulo não dispare novamente no mesmo toque
                if (saltitarAtivo) {
                    const cdSaltitar = Number(config.cooldownSaltitarFrames ?? 6);
                    controle.cooldownPulo = Math.max(0, cdSaltitar);
                }
            } else {
                controle.pulosRealizados = 0;
                // O cooldown do pulo duplo não é resetado aqui, ele deve contar até o fim.
            }
        } else if (puloAcabouDeSerPressionado && window.temSkill?.((window.SKILLS || {}).SALTO) && controle.pulosRealizados === 1 && controle.timerPuloDuplo > 0 && controle.cooldownPuloDuplo === 0) {
            // Segundo salto: agora com 1.25x da força (um quarto a mais) e com timing mais exigente
            controle.velocidadeY = forcaPuloFinal * (config.multiplicadorPuloDuplo ?? 1.25);
            window.AudioManager?.playSFX('pulo', 0.5);
            window.AudioManager?.playSFX('dash', 0.5);
            
            // Ativa rastro de sombras na subida (Super Pulo) por 10 frames
            controle.superPuloFramesRestantes = 10;

            controle.pulosRealizados = 2; // Consome o segundo salto até tocar o chão novamente
            controle.doubleJumpUsedInAir = true; // Marca que o pulo duplo foi usado no ar
        }

        // Processa o rastro de sombras do Super Pulo (Subida)
        if ((controle.superPuloFramesRestantes || 0) > 0) {
            if (typeof window.criarSombraDash === 'function' && controle.visualFrameCounter % 2 === 0) {
                window.criarSombraDash(elemento);
            }
            controle.superPuloFramesRestantes--;
        }

        // Gravidade e Física Vertical (Sempre ativa, exceto se jetpack ativo)
        if (typeof aplicarFisica === 'function' && !controle.jetpackAtivo && !controle.garraPuxando) {
            const gravidadePlayerAtual = config.gravidadeUniversal ? (config.forcaGravidade?.gravidade ?? 0.5) : (config.gravidadePlayer ?? 0.5);
            // Passamos a intenção de pulo para a física para garantir sincronia total
            aplicarFisica(controle, { ' ': puloAcabouDeSerPressionado }, forcaPuloFinal, gravidadePlayerAtual, 0);
        }

        atualizarJetpack({
            teclaPuloAtiva,
            puloAcabouDeSerPressionado,
            forcaPuloFinal
        });

        // Mecânica de Super Descida e Paraquedas
        if (!controle.noChao && controle.velocidadeY < 0 && acaoAtiva('pulo') && !controle.usandoParaquedas && controle.pulosRealizados === 2) {
            controle.velocidadeY = config.superDescidaVelocidadeInicial ?? -20; 
            
            // Rastro contínuo durante a Super Descida (a cada 2 frames)
            if (typeof window.criarSombraDash === 'function' && controle.visualFrameCounter % 2 === 0) {
                window.criarSombraDash(elemento);
            }

            if (!controle.superDescidaAtiva) {
                window.AudioManager?.playSFX('dash', 0.5);
                const jaEraPesado = !!controle.pesado;
                controle.superDescidaAtiva = true;
                if (!jaEraPesado) {
                    controle.pesoTemporarioSuperDescida = Math.max(1, Number(config.tempoPesoSuperDescida ?? 60));
                    controle.pesado = true;
                    controle.leveComBota = false;
                }
            }
        }
        if (controle.usandoParaquedas && controle.velocidadeY < -1.5) {
            controle.velocidadeY = -1.5; 
        }

        // ITEM 5: Resolução Diagonal (Verifica colisão vertical usando a posição X JÁ CORRIGIDA)
        controle.noChao = false;
        const distTotalY = controle.y - yAnterior;
        
        // Armazena a velocidade de queda antes de processar as colisões que podem zerá-la
        const velocidadeAntesImpacto = controle.velocidadeY;

        // Sub-stepping Vertical para Super Descida
        const passosY = Math.ceil(Math.abs(distTotalY) / 16);
        const incrementoY = distTotalY / passosY;
        
        if (passosY > 1) {
            controle.y = yAnterior;
            for (let j = 0; j < passosY; j++) {
                controle.y += incrementoY;
                if (verificarColisaoVertical(controle, yAnterior, incrementoY)) break;
            }
        } else {
            verificarColisaoVertical(controle, yAnterior, distTotalY);
        }

        // ⚠️ TRATAMENTO DE COLISÃO VERTICAL - ESTACAS (Linha 1598)
        // Responsável por aplicar colisão com spikes ao cair/pular
        // Se colidir com estaca: direita/esquerda/cima/baixo, usa coordenadas precisas
        function verificarColisaoVertical(ctrl, yAnt, incY) {
            const hit = typeof verificarColisaoComTiles === 'function' ? verificarColisaoComTiles(ctrl.x + ctrl.offsetX, ctrl.y, ctrl.largura, ctrl.altura, window.plataformas) : null;
            if (hit && hit.tipo !== 'solido' && hit.temColisaoVertical === false) {
                return false;
            }

            // Se for colisão com o teto de um robô aberto e o jogador estiver subindo, ignora.
            if (hit && hit.tipo === 'meio' && hit.direcao === 'superior' && incY > 0) {
                return false;
            }

            if (hit) {
                if (incY < 0) { // Caindo
                    ctrl.noChao = true;
                    if (ctrl.superDescidaAtiva) {
                        aplicarImpactoSuperDescida(ctrl);
                        ctrl.superDescidaAtiva = false;
                        ctrl.cooldownPosSuperDescida = config.cooldownPosSuperDescida ?? 60;
                    }
                    ctrl.velocidadeY = 0;
                    // Usa função centralizada de snap
                    const novoY = aplicarSnapColisao(ctrl.y, 0, ctrl.altura, hit, 'cima');
                    ctrl.y = novoY;
                } else if (incY > 0) { // Subindo
                    const permiteCorrecaoQuina = hit.tipo !== 'estaca';
                    if (permiteCorrecaoQuina && typeof window.tentarCorrecaoQuinaSubida === 'function') {
                        const corrigiuQuina = window.tentarCorrecaoQuinaSubida(ctrl, window.plataformas, {
                            maxDeslocamento: Math.max(0, Number(config.cornerCorrectionPxPlayer ?? 6)),
                            passo: 1
                        });
                        if (corrigiuQuina) {
                            return false;
                        }
                    }

                    ctrl.velocidadeY = 0;
                    // Usa função centralizada de snap
                    const novoY = aplicarSnapColisao(ctrl.y, 0, ctrl.altura, hit, 'baixo');
                    ctrl.y = novoY;
                }
                return true;
            }
            return false;
        }

        function aplicarImpactoSuperDescida(ctrl) {
            const raioStun = Number(config.superDescidaRaioStunInimigos ?? 56);
            const raioStunY = Number(config.superDescidaRaioStunInimigosY ?? raioStun);
            if (window.inimigos) {
                window.inimigos.forEach(inimigo => {
                    const distanciaX = Math.abs((ctrl.x + 16) - (inimigo.x + 16));
                    const distanciaY = Math.abs((ctrl.y + 16) - (inimigo.y + 16));
                    if (distanciaX <= raioStun && distanciaY <= raioStunY) {
                        inimigo.stunned = true;
                        inimigo.stunTimer = Number(config.superDescidaStunDuracaoInimigos ?? 180);
                    }
                });
            }
            const impacto = document.createElement('img');
            impacto.src = window.obterSpriteItem('impacto', config);
            impacto.style.position = 'absolute';
            impacto.style.width = '64px'; impacto.style.height = '32px';
            impacto.style.left = (ctrl.x - 16) + 'px'; impacto.style.bottom = ctrl.y + 'px';
            impacto.style.imageRendering = 'pixelated';
            adicionarAoLayer(impacto, window.LAYERS.EFEITOS);
            requestAnimationFrame(() => { impacto.style.transform = 'scale(.2)'; impacto.style.opacity = '0'; });
            setTimeout(() => impacto.remove(), 400);

            // Aciona o tremor de câmera no impacto da Super Descida
            if (typeof window.ativarTremorCamera === 'function') {
                const duracao = Number(config.superDescidaTremorDuracao ?? 250);
                const intensidade = Number(config.superDescidaTremorIntensidade ?? 10);
                window.ativarTremorCamera(duracao, intensidade);
            }
        }

        // Detecta toque no chão: APENAS se houver colisão real com tiles de plataforma
        if (controle.noChao && controle.velocidadeY <= 0) {
            if (!noChaoAnterior) {
                // Só reproduz o som se a velocidade de queda for maior que o limite definido
                if (velocidadeAntesImpacto < (config.minVelocidadePousoSom ?? -6)) {
                    window.AudioManager?.playSFX('pouso', 0.3);
                }
            }
            controle.velocidadeY = 0;
        }

        const hitEspinho = !controle.garraPuxando ? detectarContatoEspinho() : null;
        if (!controle.garraPuxando && hitEspinho && hitEspinho.tipo === 'estaca') {
            aplicarDanoEspinho(hitEspinho);
        }

        // Condição de Game Over por queda (buraco)
        if (controle.y < -64) {
            // Transforma em Skill Passiva: Verifica se o player possui a skill Resgate
            if (window.temSkill?.((window.SKILLS || {}).RESGATE)) { // Removido console.log de debug
                const larguraPalco = window.mundoLargura || 640; // Removido console.log de debug
                const alturaPalco = window.mundoAltura || 480;
                const larguraPlayer = 32;

                controle.x = Math.random() * (larguraPalco - larguraPlayer);
                controle.y = alturaPalco - 64; 
                controle.velocidadeY = 0; 
                controle.usandoParaquedas = true; // Removido console.log de debug

                // Lógica de dano ao cair (Mantida comentada conforme solicitado):
                // controle.dano = (controle.dano || 0) + 1;
                // console.log("Resgate: Dano de queda aplicado.");
            } else {
                // Se não tiver a skill, o player morre como no comportamento original
                controle.y = 0; 
                alert("Você caiu em um buraco!");
                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                requestAnimationFrame(atualizar); 
                return; 
            }
        }

        // Removido verificação de teto duplicada aqui, já tratada na colisão vertical

        // Gerencia a animação baseada no estado atual
        if (typeof atualizarAnimacao === 'function') {
            atualizarAnimacao(
                controle, 
                elemento, 
                sParado, 
                sAndando,
                sNoAr,
                sAgachado,
                sAgachadoAndando,
                spriteCarregando1, // Passa todos os 6 sprites
                spriteCarregando2,
                spriteCarregando3,
                spriteCarregando4,
                spriteCarregando5,
                spriteCarregando6
            );
        }

        // Sobrescreve o sprite se estiver chutando
        if (controle.chutando) {
            elemento.src = sChute;
        }

        // Verifica colisão com o objetivo final
        const hitboxPlayer = { 
            x: controle.x + controle.offsetX, 
            y: controle.y, 
            largura: controle.largura, 
            altura: controle.altura 
        };
        if (window.objetivoData && typeof detectarColisaoHitbox === 'function') {
            if (detectarColisaoHitbox(hitboxPlayer, window.objetivoData, 0, 0, 0)) {
                window.objetivoData = null; // Evita disparar a transição múltiplas vezes
                if (typeof window.proximoNivel === 'function') {
                    window.proximoNivel();
                }
            }
        }

        // Verifica colisão de Dano com Inimigos
        if (window.inimigos && Array.isArray(window.inimigos) && typeof detectarColisaoHitbox === 'function') {
            // Percorremos o array de trás para frente para remover inimigos mortos com segurança
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];

                // Ignora inimigos que estão no processo de reset (Alvo de Feno morto)
                if (inimigo.estaMorto) continue;

                processarAcertoChuteEmInimigo(inimigo);
            }
        }

        if (controle.chutando && typeof obterHitboxAtaque === 'function' && typeof detectarColisaoHitbox === 'function' && Array.isArray(window.itensColetaveis)) {
            const hitboxAtaque = obterHitboxAtaque();
            for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                const item = window.itensColetaveis[i];
                if (!item || item.tipo !== 'capsula' || item.vidroQuebrado) continue;

                const hitboxCapsula = obterHitboxCapsula(item);
                if (hitboxCapsula && detectarColisaoHitbox(hitboxAtaque, hitboxCapsula, 0, 0, 0)) {
                    aplicarDanoEmCapsula(item, 'ataque', hitboxAtaque);
                    break;
                }
            }
        }


        // 4. Atualização de Projéteis
        if (window.projeteis) {
            for (let i = window.projeteis.length - 1; i >= 0; i--) {
                const proj = window.projeteis[i];
                proj.x += (config.velocidadeProjetil ?? 8) * proj.direcao;
                proj.elemento.style.left = proj.x + 'px';

                let hitAlvo = false;

                if (proj.origem === 'player' && window.inimigos) {
                    for (let j = window.inimigos.length - 1; j >= 0; j--) {
                        const inimigo = window.inimigos[j];
                        
                        if (inimigo.estaMorto) continue;

                        const hitboxInimigo = {
                            x: inimigo.x + (inimigo.offsetX || 0),
                            y: inimigo.y,
                            largura: inimigo.largura,
                            altura: inimigo.altura
                        };

                        const hitboxProjetil = {
                            x: proj.x,
                            y: proj.y,
                            largura: config.PROJETIL_LARGURA,
                            altura: config.PROJETIL_ALTURA
                        };

                        if (detectarColisaoHitbox(hitboxProjetil, hitboxInimigo, 0, 0, 0)) {
                            const pontoImpactoProjetilInimigo = (typeof window.calcularCentroColisaoHitboxes === 'function')
                                ? window.calcularCentroColisaoHitboxes(hitboxProjetil, hitboxInimigo)
                                : null;

                            const fx = pontoImpactoProjetilInimigo?.x ?? (hitboxInimigo.x + (hitboxInimigo.largura / 2));
                            const fy = pontoImpactoProjetilInimigo?.y ?? (hitboxInimigo.y + (hitboxInimigo.altura / 2));

                            if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
                                window.criarAnimacaoImpacto2Frames({
                                    x: fx,
                                    y: fy,
                                    largura: 40,
                                    altura: 40,
                                    offsetY: 6,
                                    opacidade: 1,
                                    frameDurationMs: 130
                                });
                            } else {
                                console.warn('[VFX] criarAnimacaoImpacto2Frames indisponivel no hit de projetil.');
                            }

                            // Lógica de escudo para o inimigo (absorção de dano)
                            // Interrompe a coleta mesmo que o escudo bloqueie o dano
                            inimigo.estaColetando = false;
                            inimigo.timerColeta = 0;

                            let bloqueouEscudoInimigo = false;
                            if (typeof window.aplicarImpactoEscudoPadrao === 'function') {
                                bloqueouEscudoInimigo = !!window.aplicarImpactoEscudoPadrao(inimigo, config, {
                                    alvoVisual: inimigo.escudoElemento,
                                    flashElement: typeof flashElement === 'function' ? flashElement : null,
                                    duracaoFlash: 150,
                                    intensidadeFlash: 6
                                })?.bloqueou;
                            } else if (window.temEscudoAtivoPadrao(inimigo)) {
                                bloqueouEscudoInimigo = true;
                                inimigo.escudoProtegido = (inimigo.escudoProtegido || 0) + 1;
                                const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                                
                                if (typeof flashElement === 'function' && inimigo.escudoElemento) {
                                    flashElement(inimigo.escudoElemento, 150, 6);
                                }

                                if (inimigo.escudoProtegido >= tirosProtegidos) {
                                    inimigo.escudoVermelho = true;
                                }
                            }

                            const limiteVidaInimigo = inimigo.vidaMax ?? (
                                typeof window.obterLimiteVidaInimigo === 'function'
                                    ? window.obterLimiteVidaInimigo(config)
                                    : 3);

                            if (!bloqueouEscudoInimigo) {
                                const danoTomado = (controle.danoProjetil || 1);
                                inimigo.vida = (inimigo.vida || 0) + danoTomado;
                                if (inimigo.vida < limiteVidaInimigo) animarDanoAlvo(inimigo);
                                // Inimigo tipo 5 é Feno (alvo de treino) - você verá dano no comportamento
                            }
                            
                            // Knockback unificado via frames (permite que o cão detecte o acerto e solte o inimigo)
                            const forcaRecuo = window.obterKnockbackPadrao(config, 'playerProjetil');
                            window.aplicarKnockback(inimigo, forcaRecuo, proj.direcao, 15);

                            virarFenoParaFonteDano(inimigo, proj.x);

                            inimigo.elemento.style.left = inimigo.x + 'px';

                            if (inimigo.vida >= limiteVidaInimigo) {
                                if (ehInimigoFeno(inimigo)) {
                                    processarMorteFeno(inimigo);
                                } else {
                                    if (typeof flashComVibacao === 'function') {
                                        flashComVibacao(inimigo.elemento);
                                    }

                                    if (typeof window.prepararMorteInimigo === 'function') {
                                        window.prepararMorteInimigo(inimigo, proj.direcao);
                                    } else {
                                        removerInimigoDerrotado(inimigo);
                                    }
                                }
                            }
                            hitAlvo = true;
                            break;
                        }
                    }

                    if (!hitAlvo && Array.isArray(window.itensColetaveis)) {
                        for (let j = window.itensColetaveis.length - 1; j >= 0; j--) {
                            const item = window.itensColetaveis[j];
                            if (!item || item.tipo !== 'capsula' || item.vidroQuebrado) continue;

                            const hitboxCapsula = obterHitboxCapsula(item);
                            const hitboxProjetil = {
                                x: proj.x,
                                y: proj.y,
                                largura: config.PROJETIL_LARGURA,
                                altura: config.PROJETIL_ALTURA
                            };

                            if (hitboxCapsula && detectarColisaoHitbox(hitboxProjetil, hitboxCapsula, 0, 0, 0)) {
                                aplicarDanoEmCapsula(item, 'projetil', hitboxProjetil);
                                hitAlvo = true;
                                break;
                            }
                        }
                    }
                } else if (proj.origem === 'inimigo' && window.playerControle && !window.playerControle.garraPuxando) {
                    const hitboxPlayer = { 
                        x: window.playerControle.x + (window.playerControle.offsetX || 0), 
                        y: window.playerControle.y, 
                        largura: window.playerControle.largura, 
                        altura: window.playerControle.altura 
                    };
                    const hitboxProjetil = { x: proj.x, y: proj.y, largura: config.PROJETIL_LARGURA, altura: config.PROJETIL_ALTURA };

                    if (detectarColisaoHitbox(hitboxProjetil, hitboxPlayer, 0, 0, 0)) {
                        if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
                            const pontoImpactoProjetilPlayer = (typeof window.calcularCentroColisaoHitboxes === 'function')
                                ? window.calcularCentroColisaoHitboxes(hitboxProjetil, hitboxPlayer)
                                : null;

                            window.criarAnimacaoImpacto2Frames({
                                x: pontoImpactoProjetilPlayer?.x ?? (hitboxPlayer.x + (hitboxPlayer.largura / 2)),
                                y: pontoImpactoProjetilPlayer?.y ?? (hitboxPlayer.y + (hitboxPlayer.altura / 2)),
                                largura: 40,
                                altura: 40,
                                offsetY: 6,
                                opacidade: 1,
                                frameDurationMs: 130
                            });
                        }

                        if (window.temEscudoAtivoPadrao(controle)) {
                            if (typeof window.aplicarImpactoEscudoPadrao === 'function') {
                                window.aplicarImpactoEscudoPadrao(controle, config, {
                                    alvoVisual: escudoElemento,
                                    flashElement: typeof flashElement === 'function' ? flashElement : null,
                                    atualizarVisualEscudo,
                                    salvarInventario,
                                    duracaoFlash: 150,
                                    intensidadeFlash: 6
                                });
                            } else {
                                controle.escudoProtegido = (controle.escudoProtegido || 0) + 1;
                                const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                                
                                // Efeito visual no escudo ao receber dano
                                if (typeof flashElement === 'function' && escudoElemento) {
                                    flashElement(escudoElemento, 150, 6);
                                }
                                
                                if (controle.escudoProtegido >= tirosProtegidos) {
                                    controle.escudoVermelho = true;
                                }
                                atualizarVisualEscudo();
                                salvarInventario();
                            }
                        } else {
                            controle.dano = (controle.dano || 0) + 1;
                            // console.log(`Dano: Jogador atingido por projétil! Total: ${controle.dano}/3`);

                            // Efeito visual no jogador ao receber dano
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(elemento);
                            }

                            const limiteVida = controle.maxVida || 3;
                            if (controle.dano >= limiteVida) {
                                if (typeof window.prepararMorteJogador === 'function') {
                                    window.prepararMorteJogador(proj.direcao);
                                }
                            }
                        }

                        // Knockback no Jogador baseado na direção do tiro (com subpassos para evitar atravessar blocos)
                        const forcaRecuo = window.obterForcaKnockback(config, 'inimigoProjetil');
                        window.aplicarDeslocamentoHorizontalComColisaoPadrao(controle, forcaRecuo * proj.direcao, window.plataformas, {
                            largura: controle.largura,
                            altura: controle.altura,
                            offsetX: controle.offsetX || 0,
                            maxPasso: Number(config.playerKnockbackPassoMax ?? 1),
                            cancelarKnockbackAoColidir: true
                        });

                        hitAlvo = true;
                    }

                }

                const hitCenario = verificarColisaoComTiles(proj.x, proj.y, config.PROJETIL_LARGURA, config.PROJETIL_ALTURA, window.plataformas);

                // Remove o projétil se bater em algo ou sair muito longe dos limites do mundo
                const limiteDireito = (window.mundoLargura || 640) + 100;
                if (hitCenario || hitAlvo || proj.x < -100 || proj.x > limiteDireito) {
                    proj.elemento.remove();
                    window.projeteis.splice(i, 1);
                }
            }
        }

        // Atualiza a lógica de todas as gaiolas ativas (Cão ou Gato)
        if (typeof window.atualizarGaiola === 'function') {
            window.atualizarGaiola();
        }

        // 5. Atualização de Itens Coletáveis (Gravidade e Colisão)
        if (window.itensColetaveis && Array.isArray(window.itensColetaveis)) {
            for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                const item = window.itensColetaveis[i];
                const itemNaoColetavel = item?.coletavel === false || window.itemDefinitions?.[item?.tipo]?.coletavel === false;
                
                // Para coleta de itens, usamos uma hitbox do jogador que abrange todo o sprite visual (32x32)
                const hitboxPlayerParaItem = {
                    x: controle.x,
                    y: controle.y,
                    largura: 32, // Removido console.log de debug
                    altura: 32 // Removido console.log de debug
                };
                // Lógica de Coleta pelo Jogador
                const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 };
                // console.log(`[DEBUG ITEM] Player (x:${hitboxPlayerParaItem.x}, y:${hitboxPlayerParaItem.y}, w:${hitboxPlayerParaItem.largura}, h:${hitboxPlayerParaItem.altura})`);
                // console.log(`[DEBUG ITEM] Item ${item.tipo} (x:${hitboxItem.x}, y:${hitboxItem.y}, w:${hitboxItem.largura}, h:${hitboxItem.altura})`);
                if (!itemNaoColetavel && typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxPlayerParaItem, hitboxItem, 0, 0, 0)) {
                    const foiColetado = coletarItemGarra(item);
                    if (foiColetado) {
                        if (typeof window.removerVisualItemColetavel === 'function') {
                            window.removerVisualItemColetavel(item);
                        } else {
                            item.elemento.remove();
                        }
                        window.itensColetaveis.splice(i, 1);
                    }
                    continue; // Pula para o próximo item após processar a tentativa de coleta
                }

                // Aplica Gravidade
                const gravidadeItem = config.gravidadeUniversal ? (config.forcaGravidade?.gravidade ?? 0.5) : (config.inimigoGravidade ?? 0.5);
                item.velocidadeY -= gravidadeItem;
                item.y += item.velocidadeY;

                // Colisão Vertical (Chão e Plataformas)
                if (typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(item.x, item.y, 32, 32, window.plataformas)) {
                    
                    if (item.velocidadeY < 0) { // Caindo
                        item.velocidadeY = 0;
                        item.y = Math.floor((item.y + 0.1) / 32 + 1) * 32;
                    }
                }

                // Passo 5: Física de Limite do Palco e Remoção por Queda
                if (typeof limitarPosicaoAoPalco === 'function') {
                    // Ajustamos apenas o X para manter o item dentro das paredes laterais
                    const posAjustada = limitarPosicaoAoPalco(item.x, item.y, 32, 32);
                    item.x = posAjustada.x;

                    // Se o item cair em um buraco (abaixo de -64px), removemos o elemento para otimização
                    if (item.y < -64) {
                        if (typeof window.removerVisualItemColetavel === 'function') {
                            window.removerVisualItemColetavel(item);
                        } else {
                            item.elemento.remove();
                        }
                        window.itensColetaveis.splice(i, 1);
                        continue;
                    }
                }

                // Atualiza visual do item
                if (typeof window.atualizarVisualItemColetavel === 'function') {
                    window.atualizarVisualItemColetavel(item, { x: item.x, y: item.y });
                } else {
                    item.elemento.style.left = item.x + 'px';
                    item.elemento.style.bottom = item.y + 'px';
                }
            }
        }

        controle.velocidadeXAtual = Number((controle.x - xAnterior).toFixed(2));
        controle.velocidadeTotalAtual = Number(Math.hypot(controle.velocidadeXAtual, Number(controle.velocidadeY || 0)).toFixed(2));

        if (controle.debugVelocidadeAtivo) {
            const agoraLog = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                ? performance.now()
                : Date.now();
            if (agoraLog - (controle.ultimoLogVelocidadeMs || 0) >= 120) {
                controle.ultimoLogVelocidadeMs = agoraLog;
                window.logVelocidadePlayer();
            }
        }

        // Aplica os valores ao elemento (reutilizando a lógica de direção)
        elemento.style.left = controle.x + 'px';
        elemento.style.bottom = controle.y + 'px';
        elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        sincronizarVisuaisEquipamentos();
        
        // Incrementa o contador de frames (necessário para logs e efeitos visuais)
        controle.visualFrameCounter++;

        // ATUALIZAÇÃO DA CÂMERA: Mantém o jogador centralizado
        if (typeof window.atualizarCamera === 'function') {
            // Calcula o centro da hitbox do personagem (não apenas o canto do sprite)
            const centroPelayerX = controle.x + controle.offsetX + (controle.largura / 2);
            const centroPelayerY = controle.y + (controle.altura / 2);
            window.atualizarCamera(centroPelayerX, centroPelayerY, window.mundoLargura, window.mundoAltura);
        }

        requestAnimationFrame(atualizar);
    }

    // Inicia o loop de atualização
    requestAnimationFrame(atualizar);
};
