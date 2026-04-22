/**
 * Adiciona controles de movimento ao personagem.
 * 
 * @param {string} id - O ID do elemento HTML do personagem.
 * @param {number} velocidade - Velocidade de movimento em pixels por quadro.
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 * @param {string} spriteNoAr - Caminho da imagem no ar.
 */
async function iniciarMovimentacao(id, velocidade = 4, spriteParado, spriteAndando, spriteChute, spriteNoAr) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.style.zIndex = '5'; // Define o jogador na camada 5

    // Busca as configurações do arquivo JSON
    const resposta = await fetch('../../config/configuracoes.json');
    if (!resposta.ok) throw new Error(`Erro ao carregar configuracoes.json: ${resposta.statusText}`);
    const config = await resposta.json();

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

    function obterKnockback(config, fonte = 'default') {
        if (typeof window.obterKnockbackPadrao === 'function') {
            return window.obterKnockbackPadrao(config, fonte);
        }

        const base = Number(config.knockbackBase ?? config.knockbackInimigo ?? 150);
        const ajuste = Number(config.knockbackAjustes?.[fonte] ?? 0);
        return base + ajuste;
    }


    function virarFenoParaFonteDano(inimigo, fonteX) {
        if (!inimigo || inimigo.tipo !== window.GAME_CONSTANTS.INIMIGO_FENO_ID || !inimigo.elemento) return;
        const centroX = inimigo.x + ((inimigo.largura || 32) / 2);
        inimigo.elemento.style.transform = fonteX <= centroX ? 'scaleX(1)' : 'scaleX(-1)';
    }

    function animarDanoAlvo(inimigo) {
        if (!inimigo || !inimigo.elemento) return;
        if (typeof piscaLeve === 'function') {
            piscaLeve(inimigo.elemento);
        } else if (typeof flashElement === 'function') {
            flashElement(inimigo.elemento, 120, 8);
        }
    }

    const spriteAgachado = '../../assets/personagem/per_agachado.png';
    const spriteAgachado2 = '../../assets/personagem/per_agachado2.png';

    function obterKnockbackRecebido(fonte = 'default') {
        if (typeof window.obterKnockbackRecebidoPadrao === 'function') {
            return window.obterKnockbackRecebidoPadrao(controle, config, fonte);
        }

        const valor = obterKnockback(config, fonte);
        if (temEscudoAtivo()) {
            return valor * Number(config.escudoKnockbackMultiplicador ?? 0.5);
        }
        return valor;
    }

    function aplicarDeslocamentoHorizontalComColisao(ent, deslocX, opcoes = {}) {
        if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
            return window.aplicarDeslocamentoHorizontalComColisaoPadrao(ent, deslocX, window.plataformas, {
                config,
                ...opcoes
            });
        }

        if (!ent || !deslocX) return;

        const largura = Number(opcoes.largura ?? ent.largura ?? 32);
        const altura = Number(opcoes.altura ?? ent.altura ?? 32);
        const offsetX = Number(opcoes.offsetX ?? ent.offsetX ?? 0);
        const maxPasso = Math.max(0.25, Number(opcoes.maxPasso ?? config.playerKnockbackPassoMax ?? config.inimigoKnockbackPassoMax ?? 1));
        const passos = Math.max(1, Math.ceil(Math.abs(deslocX) / maxPasso));
        const passoX = deslocX / passos;

        for (let i = 0; i < passos; i++) {
            const xAnterior = ent.x;
            ent.x += passoX;

            if (typeof verificarColisaoComTiles === 'function' &&
                verificarColisaoComTiles(ent.x + offsetX, ent.y, largura, altura, window.plataformas)) {
                ent.x = xAnterior;

                if (opcoes.cancelarKnockbackAoColidir) {
                    ent.framesKnockbackRestante = 0;
                    ent.velocidadeKnockback = 0;
                }
                break;
            }

            if (typeof limitarPosicaoAoPalco === 'function') {
                const posAjustada = limitarPosicaoAoPalco(ent.x + offsetX, ent.y, largura, altura);
                ent.x = posAjustada.x - offsetX;
            }
        }
    }

    function atualizarVisualEscudo() {
        if ((controle.temEscudo || controle.escudoVermelho) && !controle.itensGuardadosNoCinto) {
            escudoElemento.style.display = 'block';
        } else {
            escudoElemento.style.display = 'none';
        }

        escudoElemento.src = config.spriteEscudoPlayer || '../../assets/personagem/escudo.png';
        escudoElemento.style.filter = controle.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
    }

    function atualizarVisualBota() {
        if (!botaElemento) return;

        if (controle.temBota && !controle.itensGuardadosNoCinto) {
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
        cooldownPuloDuplo: 0, // Novo cooldown para o pulo duplo
        cooldownPosSuperDescida: 0, // Cooldown de 1s após a Super Descida
        superDescidaAtiva: false, // Rastreador de uso da Super Descida
        espacoPressionado: false,
        cooldownChute: 0,
        cooldownPulo: 0,
        cooldownTiro: 0,
        cooldownDanoEspinho: 0,
        municao: 0, // Inicia sem munição
        temArma: false, // Inicia sem a capacidade de atirar
        temEscudo: false, // Inicia sem escudo
        temGarra: false,
        garraVermelha: false,
        garraImpactosSolidos: 0,
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
        debugVelocidadeAtivo: false,
        ultimoLogVelocidadeMs: 0,
        velocidadeXAtual: 0,
        velocidadeTotalAtual: 0,
        teclas: {},
        acoesDiscretas: {}
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

    aplicarInventarioSalvo();

    window.isPaused = false;
    window.togglePause = () => {
        window.isPaused = !window.isPaused;
        if (window.isPaused) {
            // console.log("Jogo Pausado");
            if (elemento.parentElement) {
                elemento.parentElement.style.filter = 'brightness(0.3) grayscale(0.6)';
            }
        } else {
            // console.log("Jogo Retomado");
            if (elemento.parentElement) {
                elemento.parentElement.style.filter = 'none';
            }
        }
    };

    window.playerControle = controle;
    window.logVelocidadePlayer = () => {
        const velocidadeX = Number(controle.velocidadeXAtual || 0);
        const velocidadeY = Number(controle.velocidadeY || 0);
        const velocidadeTotal = Math.hypot(velocidadeX, velocidadeY);
        console.log('[DEBUG PLAYER] Velocidade atual', {
            posicaoX: Number(controle.x.toFixed(2)),
            posicaoY: Number(controle.y.toFixed(2)),
            velocidadeX: Number(velocidadeX.toFixed(2)),
            velocidadeY: Number(velocidadeY.toFixed(2)),
            velocidadeTotal: Number(velocidadeTotal.toFixed(2)),
            temBota: !!controle.temBota,
            bonusBotaAtivo: !!controle.temBota && !controle.botaVermelha && !controle.itensGuardadosNoCinto,
            dashAtivo: Number(controle.dashFramesRestantes || 0) > 0
        });
        return velocidadeTotal;
    };
    window.toggleDebugVelocidadePlayer = (ativo = !controle.debugVelocidadeAtivo) => {
        controle.debugVelocidadeAtivo = !!ativo;
        controle.ultimoLogVelocidadeMs = 0;
        console.log(`Debug de velocidade do player ${controle.debugVelocidadeAtivo ? 'ativado' : 'desativado'}.`);
        if (controle.debugVelocidadeAtivo) {
            window.logVelocidadePlayer();
        }
        return controle.debugVelocidadeAtivo;
    };

    function atualizarEstadoPesoJogador() {
        const itensGuardadosNoCinto = !!controle.itensGuardadosNoCinto;
        const totalEquipamentosSemBota = [
            !!controle.temArma && !itensGuardadosNoCinto,
            !!(controle.temEscudo || controle.escudoVermelho) && !itensGuardadosNoCinto,
            !!controle.temJetpack && !itensGuardadosNoCinto,
            !!controle.temGarra && !itensGuardadosNoCinto
        ].filter(Boolean).length;

        controle.pesadoPorEquipamento = totalEquipamentosSemBota >= 3;
        const pesoTemporarioAtivo = Number(controle.pesoTemporarioSuperDescida || 0) > 0;
        controle.pesado = controle.pesadoPorEquipamento || pesoTemporarioAtivo;
        controle.leveComBota = !!controle.temBota && !controle.botaVermelha && !itensGuardadosNoCinto && totalEquipamentosSemBota <= 1 && !controle.pesado;
        return controle.pesado;
    }

    atualizarEstadoPesoJogador();

    // Aplica os efeitos das skills agora que o objeto de controle foi criado
    if (typeof window.aplicarEfeitosSkills === 'function') {
        window.aplicarEfeitosSkills();
    }

    window.projeteis = [];
    window.itensColetaveis = [];

    
    // Elemento da arma
    const armaElemento = document.createElement('img');
    armaElemento.id = 'player-weapon';
    armaElemento.src = config.spriteArmaPlayer || '../../assets/personagem/revolver.png';
    armaElemento.style.position = 'absolute';
    armaElemento.style.width = '32px';
    armaElemento.style.height = '32px';
    armaElemento.style.zIndex = '6';
    armaElemento.style.display = 'none';
    armaElemento.style.imageRendering = 'pixelated';
    armaElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(armaElemento);
    armaElemento.style.display = controle.temArma ? 'block' : 'none';

    // Elemento do escudo
    const escudoElemento = document.createElement('img');
    escudoElemento.id = 'player-shield';
    escudoElemento.src = config.spriteEscudoPlayer || '../../assets/personagem/escudo.png';
    escudoElemento.style.position = 'absolute';
    escudoElemento.style.width = '32px';
    escudoElemento.style.height = '32px';
    escudoElemento.style.zIndex = '7'; // À frente da arma
    escudoElemento.style.display = 'none';
    escudoElemento.style.imageRendering = 'pixelated';
    escudoElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(escudoElemento);

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

    // Elemento da bota
    const botaElemento = document.createElement('img');
    botaElemento.id = 'player-boots';
    botaElemento.src = config.spriteBotaParado || '../../assets/personagem/bota_parado.png';
    botaElemento.style.position = 'absolute';
    botaElemento.style.width = '32px';
    botaElemento.style.height = '32px';
    botaElemento.style.zIndex = '8'; // Garantir que fique acima do personagem e outros itens
    botaElemento.style.display = controle.temBota ? 'block' : 'none';
    botaElemento.style.imageRendering = 'pixelated';
    botaElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(botaElemento);
    atualizarVisualBota();

    // Elemento do Colete
    const coleteElemento = document.createElement('img');
    coleteElemento.id = 'player-vest';
    coleteElemento.src = config.spriteColeteParado || '../../assets/personagem/colete.png';
    coleteElemento.style.position = 'absolute';
    coleteElemento.style.width = '32px';
    coleteElemento.style.height = '32px';
    coleteElemento.style.zIndex = '6';
    coleteElemento.style.display = controle.temColete ? 'block' : 'none';
    coleteElemento.style.imageRendering = 'pixelated';
    coleteElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(coleteElemento);

    // Elemento do Jetpack (Equipado)
    const jetpackElemento = document.createElement('img');
    jetpackElemento.id = 'player-jetpack';
    jetpackElemento.src = config.spriteJetpackPlayer || '../../assets/personagem/jetpack.png';
    jetpackElemento.style.position = 'absolute';
    jetpackElemento.style.width = '32px';
    jetpackElemento.style.height = '32px';
    jetpackElemento.style.zIndex = '4'; // Camada 4: Atrás do jogador (5), mas à frente do cenário (1-2)
    jetpackElemento.style.display = controle.temJetpack ? 'block' : 'none';
    jetpackElemento.style.imageRendering = 'pixelated';
    jetpackElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(jetpackElemento);

    // Elemento do Fogo do Jetpack
    const jetFogoElemento = document.createElement('img');
    jetFogoElemento.id = 'player-jet-fire';
    jetFogoElemento.src = config.spriteJetFogo || '../../assets/personagem/jet.png';
    jetFogoElemento.style.position = 'absolute';
    jetFogoElemento.style.width = '32px';
    jetFogoElemento.style.height = '32px';
    jetFogoElemento.style.zIndex = '3'; // Atrás do jetpack (4) e jogador (5)
    jetFogoElemento.style.display = 'none';
    jetFogoElemento.style.imageRendering = 'pixelated';
    jetFogoElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(jetFogoElemento);

    // Elemento da Garra
    const garraElemento = document.createElement('img');
    garraElemento.id = 'player-claw';
    garraElemento.src = config.spriteGarraPlayer || '../../assets/personagem/garra.png';
    garraElemento.style.position = 'absolute';
    garraElemento.style.width = '32px';
    garraElemento.style.height = '32px';
    garraElemento.style.zIndex = '9'; // Acima do personagem
    garraElemento.style.display = controle.temGarra ? 'block' : 'none';
    garraElemento.style.imageRendering = 'pixelated';
    garraElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(garraElemento);

    const { cintoElemento, paraquedasElemento } = window.criarElementosSuporteEquipamentos({
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
        obterKnockback,
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
                if (controle.estaAgachado) {
                    tentarLevantarJogador();
                } else if (podeAgacharSemBloqueio()) {
                    controle.estaAgachado = true;
                } else if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4);
                }
            },
            onLevantar: () => {
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

                console.log('[DEBUG] Sistema resetado via botão 0.');
                
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
        obterKnockback,
        animarDanoAlvo,
        virarFenoParaFonteDano,
        processarMorteFeno,
        removerInimigoDerrotado
    });

    const {
        atualizarEstadoChute: atualizarEstadoChuteCorpoACorpo,
        processarEntradaChute,
        aplicarImpulsoChute,
        processarAcertoChuteEmInimigo,
        atualizarTemporizadores: atualizarTemporizadoresCorpoACorpo
    } = sistemaCombateCorpoACorpo;

    function atualizar() {
        // DEBUG: Logar estado das ações de movimento e teclas virtuais
        if (window.DEBUG_CONTROLE_MOVIMENTO) {
            const acoes = ['esquerda', 'direita', 'cima', 'baixo'];
            window.__DEBUG_CONTROLE_LAST = window.__DEBUG_CONTROLE_LAST || {};
            acoes.forEach(acao => {
                const ativa = acaoAtiva(acao);
                if (window.__DEBUG_CONTROLE_LAST[acao] !== ativa) {
                    window.__DEBUG_CONTROLE_LAST[acao] = ativa;
                    console.log(`[DEBUG CONTROLE] ${acao}: ${ativa}`);
                }
            });
            // ...
        }
        // ...

        // Lógica de Stun do Jogador (quando capturado pela garra inimiga)
        if (controle.stunned) {
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
                
                // Sincroniza itens acessórios
                if (typeof window.sincronizarAcessoriosPortador === 'function') {
                    window.sincronizarAcessoriosPortador(controle, elemento, {
                        armaElemento,
                        escudoElemento,
                        botaElemento,
                        jetpackElemento,
                        garraElemento,
                        cintoElemento,
                        coleteElemento
                    });
                } else {
                    const posStyle = { left: elemento.style.left, bottom: elemento.style.bottom, transform: elemento.style.transform };
                    if (armaElemento) Object.assign(armaElemento.style, posStyle);
                    if (escudoElemento) Object.assign(escudoElemento.style, posStyle);
                    if (botaElemento) Object.assign(botaElemento.style, posStyle);
                    if (jetpackElemento) Object.assign(jetpackElemento.style, posStyle);
                    if (garraElemento) Object.assign(garraElemento.style, posStyle);
                    if (coleteElemento) Object.assign(coleteElemento.style, posStyle);
                    if (cintoElemento && controle.temCinto) sincronizarCintoComJogador();
                }

                // Mantém o HUD atualizado
                atualizarHUD();
                requestAnimationFrame(atualizar);
                return; // Bloqueia comandos enquanto estiver atordoado
            } else {
                controle.stunned = false;
                elemento.style.filter = 'none';
            }
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

        // Combinação: Dropar Item (Baixo + Pulo no chão)
        if (segurandoBaixo && acaoAtiva('pulo') && controle.noChao) {
            consumirAcao('pulo'); 
            droparItemJogador();
        }


        // Atualiza a interface de visão
        atualizarHUD();

        if (window.isPaused) {
            requestAnimationFrame(atualizar);
            return;
        }

        // Resetamos o estado horizontal, mas o noChao será validado pelas colisões abaixo
        const noChaoAnterior = controle.noChao;

        // Ajusta a hitbox de acordo com o estado agachado (muda altura a cada frame)
        controle.altura = controle.estaAgachado
            ? (config.agachadoHitboxAltura ?? 16)
            : controle.alturaEmPe;
        
        // Sincroniza o estado de chute com o timer
        atualizarEstadoChuteCorpoACorpo();

        controle.movendoHorizontal = false;
        const xAnterior = controle.x;
        const yAnterior = controle.y;

        const velBase = config.velocidadePlayer || velocidade;
        let velAtiva = temEscudoAtivo()
            ? Math.max(0, velBase - (config.escudoVelocidadeReduzida ?? 2))
            : velBase;

        // Aplica o bônus de velocidade se estiver usando a bota
        if (controle.temBota && !controle.botaVermelha && !controle.itensGuardadosNoCinto) {
            velAtiva += Number(config.bonusVelocidadeBota || 2);
        }

        if (controle.estaAgachado) {
            const multiplicadorAgachado = Number(config.agachadoMultiplicadorVelocidade ?? 0.55);
            velAtiva *= Math.max(0, multiplicadorAgachado);
        }

        atualizarEstadoPesoJogador();

        const dashDisponivel = !!controle.dashHabilitado && window.temSkill?.((window.SKILLS || {}).DASH);
        if (dashDisponivel && controle.dashSolicitado && (controle.cooldownDash || 0) === 0) {
            const duracaoDash = Math.max(1, Number(controle.dashDuracao ?? 8));
            const distanciaDashBase = Math.max(0, Number(controle.distanciaDash ?? 64));
            const multiplicadorDashBota = controle.leveComBota ? 2 : 1;
            const distanciaDash = controle.pesado
                ? (distanciaDashBase / 2)
                : (distanciaDashBase * multiplicadorDashBota);
            controle.dashDirecao = controle.dashSolicitado;
            controle.dashFramesRestantes = duracaoDash;
            controle.velocidadeDashSkill = distanciaDash / duracaoDash;
            controle.cooldownDash = Math.max(1, Number(controle.cooldownDashMax ?? 45));

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

        // Movimentação Horizontal
        if (acaoAtiva('esquerda')) {
            controle.x -= velAtiva;
            if (!controle.chutando) controle.direcao = 'e';
            controle.movendoHorizontal = true;
        }
        if (acaoAtiva('direita')) {
            controle.x += velAtiva;
            if (!controle.chutando) controle.direcao = 'd';
            controle.movendoHorizontal = true;
        }

        if ((controle.dashFramesRestantes || 0) > 0) {
            const direcaoDashSkill = controle.dashDirecao === 'd' ? 1 : -1;
            controle.x += (controle.velocidadeDashSkill || 0) * direcaoDashSkill;
            if (!controle.chutando) controle.direcao = controle.dashDirecao;
            controle.movendoHorizontal = true;
            controle.dashFramesRestantes--;
        }

        // Sistema de combate corpo a corpo
        processarEntradaChute(window.inimigos);
        aplicarImpulsoChute();

        // Aplica knockback se o jogador foi atingido (executa o movimento calculado)
        if (controle.framesKnockbackRestante > 0) {
            aplicarDeslocamentoHorizontalComColisao(controle, controle.velocidadeKnockback, {
                largura: controle.largura,
                altura: controle.altura,
                offsetX: controle.offsetX || 0,
                maxPasso: Number(config.playerKnockbackPassoMax ?? 1),
                cancelarKnockbackAoColidir: true
            });
            controle.framesKnockbackRestante--;
        }

        // Lógica de Disparo (tecla I)
        if (acaoAtiva('tiro') && controle.cooldownTiro === 0 && controle.temArma && !controle.itensGuardadosNoCinto && controle.municao > 0) {
            controle.cooldownTiro = config.cooldownTiro; 
            controle.municao--;
            const dir = controle.direcao === 'd' ? 1 : -1;
            
            // Inicia na frente do personagem (considerando 32px de largura do sprite)
            const xPartida = (controle.direcao === 'd') ? controle.x + 36 : controle.x - 8;
            const yPartida = controle.y + 16; // Alinhado verticalmente com o centro

            const projElemento = document.createElement('img');
            projElemento.src = config.spriteProjetil;
            projElemento.style.position = 'absolute';
            projElemento.style.width = config.PROJETIL_LARGURA + 'px';
            projElemento.style.height = config.PROJETIL_ALTURA + 'px';
            projElemento.style.left = xPartida + 'px';
            projElemento.style.bottom = yPartida + 'px';
            projElemento.style.imageRendering = 'pixelated';
            projElemento.style.pointerEvents = 'none'; // Não interfere com cliques
            adicionarAoLayer(projElemento, window.LAYERS.PROJETEIS);

            window.projeteis.push({
                x: xPartida,
                y: yPartida,
                direcao: dir,
                elemento: projElemento,
                origem: 'player'
            });
            
            // Efeito visual de disparo na arma do jogador
            if (typeof flashRapido === 'function' && armaElemento) {
                flashRapido(armaElemento);
            }
            // Aciona a nova animação de inclinação
            if (armaElemento) {
                if (typeof aplicarRecuoRevolver === 'function') {
                    aplicarRecuoRevolver(armaElemento);
                } else {
                    console.error("[ERRO] Função aplicarRecuoRevolver não encontrada! Verifique se o script foi carregado no HTML.");
                }
            }
            
            // console.log(`Jogador disparou! Munição restante: ${controle.municao}`);
        }

        atualizarTemporizadoresCorpoACorpo();

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

        // ⚠️ ITEM 4: Sub-stepping Horizontal (Linha 1390) - DETECTA COLISÕES ESTACAS
        // Quebra movimento em passos de 16px para detectar colisões com estacas
        // Se colidir com estaca DIREITA/ESQUERDA, usa esquerdaReal/direitaReal para posicionar
        const distTotalX = controle.x - xAnterior;
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

        // Calcula a força do pulo final: se tiver a bota, soma o bônus definido nas configurações
        const forcaPuloFinal = (controle.temBota && !controle.botaVermelha && !controle.itensGuardadosNoCinto)
            ? (config.inimigoForcaPulo + (config.bonusPuloBota || 1.5)) 
            : config.inimigoForcaPulo;

        // Decrementa o timer da janela de clique duplo (timing para a skill Salto)
        if (controle.timerPuloDuplo > 0) controle.timerPuloDuplo--;

        // Decrementa o cooldown do pulo duplo
        if (controle.cooldownPuloDuplo > 0) controle.cooldownPuloDuplo--;

        // Decrementa o cooldown pós Super Descida
        if (controle.cooldownPosSuperDescida > 0) controle.cooldownPosSuperDescida--;
        if (controle.pesoTemporarioSuperDescida > 0) controle.pesoTemporarioSuperDescida--;

        // Lógica da Skill Passiva "Salto" - Pulo Duplo
        const teclaPuloAtiva = acaoAtiva('pulo') && controle.cooldownPosSuperDescida === 0;
        const puloAcabouDeSerPressionado = teclaPuloAtiva && !controle.espacoPressionado;
        controle.espacoPressionado = !!teclaPuloAtiva;

        if (controle.noChao) {
            // Se o pulo duplo foi usado no ar, inicia o cooldown agora que o jogador tocou o chão
            if (controle.doubleJumpUsedInAir) {
                controle.cooldownPuloDuplo = 30; // Inicia o cooldown de 0.5 segundos
                controle.doubleJumpUsedInAir = false; // Reseta a flag
            }

            if (puloAcabouDeSerPressionado) {
                window.AudioManager?.playSFX('pulo', 0.5);
                controle.pulosRealizados = 1;
                controle.timerPuloDuplo = 12; // Janela de tempo mais rigorosa: 10 frames (aprox. 0.16s)
            } else {
                controle.pulosRealizados = 0;
                // O cooldown do pulo duplo não é resetado aqui, ele deve contar até o fim.
            }
        } else if (puloAcabouDeSerPressionado && window.temSkill?.((window.SKILLS || {}).SALTO) && controle.pulosRealizados === 1 && controle.timerPuloDuplo > 0 && controle.cooldownPuloDuplo === 0) {
            // Segundo salto: agora com 1.25x da força (um quarto a mais) e com timing mais exigente
            controle.velocidadeY = forcaPuloFinal * 1.25;
            window.AudioManager?.playSFX('pulo', 0.5);
            controle.pulosRealizados = 2; // Consome o segundo salto até tocar o chão novamente
            controle.doubleJumpUsedInAir = true; // Marca que o pulo duplo foi usado no ar
            console.log("Habilidade Salto: Pulo duplo rápido executado!");
        }

        atualizarJetpack({
            teclaPuloAtiva,
            puloAcabouDeSerPressionado,
            forcaPuloFinal
        });

        // Mecânica de Super Descida e Paraquedas
        if (!controle.noChao && controle.velocidadeY < 0 && acaoAtiva('pulo') && !controle.usandoParaquedas && controle.pulosRealizados === 2) {
            controle.velocidadeY = -20; 
            if (!controle.superDescidaAtiva) {
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
            if (hit) {
                if (incY < 0) { // Caindo
                    ctrl.noChao = true;
                    if (ctrl.superDescidaAtiva) {
                        aplicarImpactoSuperDescida(ctrl);
                        ctrl.superDescidaAtiva = false;
                        ctrl.cooldownPosSuperDescida = 60;
                    }
                    ctrl.velocidadeY = 0;
                    // Usa função centralizada de snap
                    const novoY = aplicarSnapColisao(ctrl.y, 0, ctrl.altura, hit, 'cima');
                    ctrl.y = novoY;
                } else if (incY > 0) { // Subindo
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
            impacto.src = '../../assets/personagem/impacto.png';
            impacto.style.position = 'absolute';
            impacto.style.width = '64px'; impacto.style.height = '32px';
            impacto.style.left = (ctrl.x - 16) + 'px'; impacto.style.bottom = ctrl.y + 'px';
            impacto.style.imageRendering = 'pixelated';
            adicionarAoLayer(impacto, window.LAYERS.EFEITOS);
            requestAnimationFrame(() => { impacto.style.transform = 'scale(.2)'; impacto.style.opacity = '0'; });
            setTimeout(() => impacto.remove(), 400);
        }

        // Detecta toque no chão: APENAS se houver colisão real com tiles de plataforma
        if (controle.noChao && controle.velocidadeY <= 0) {
            if (!noChaoAnterior) {
                window.AudioManager?.playSFX('pouso', 0.3);
            }
            controle.velocidadeY = 0;
        }

        const hitEspinho = detectarContatoEspinho();
        if (hitEspinho && hitEspinho.tipo === 'estaca') {
            aplicarDanoEspinho(hitEspinho);
        }

        // Condição de Game Over por queda (buraco)
        if (controle.y < -64) {
            // Transforma em Skill Passiva: Verifica se o player possui a skill Resgate
            if (window.temSkill?.((window.SKILLS || {}).RESGATE)) {
                console.log("Habilidade Passiva: Resgate Ativado!");
                const larguraPalco = window.mundoLargura || 640;
                const alturaPalco = window.mundoAltura || 480;
                const larguraPlayer = 32;

                controle.x = Math.random() * (larguraPalco - larguraPlayer);
                controle.y = alturaPalco - 64; 
                controle.velocidadeY = 0; 
                controle.usandoParaquedas = true; 
                console.log(`Teleporte concluído para X: ${controle.x.toFixed(0)}, Y: ${controle.y}. Paraquedas ativado.`);

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
                config.spriteParadoPlayer || spriteParado, 
                config.spriteAndandoPlayer || spriteAndando,
                config.spriteNoArPlayer || spriteNoAr,
                config.spriteAgachadoPlayer || spriteAgachado,
                config.spriteAgachadoAndandoPlayer || spriteAgachado2
            );
        }

        // Sobrescreve o sprite se estiver chutando
        if (controle.chutando) {
            elemento.src = config.spriteChutePlayer || spriteChute;
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


        // 4. Atualização de Projéteis
        if (window.projeteis) {
            for (let i = window.projeteis.length - 1; i >= 0; i--) {
                const proj = window.projeteis[i];
                proj.x += config.velocidadeProjetil * proj.direcao;
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
                            } else if (inimigo.temEscudo && !inimigo.escudoVermelho && !inimigo.itensGuardadosNoCinto) {
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

                            if (!bloqueouEscudoInimigo) {
                                const danoTomado = (controle.danoProjetil || 1);
                                inimigo.vida = (inimigo.vida || 0) + danoTomado;
                                if (inimigo.vida < 3) animarDanoAlvo(inimigo);
                                // Inimigo tipo 5 é Feno (alvo de treino) - você verá dano no comportamento
                            }
                            
                            // Knockback por subpassos para impedir atravessar blocos em impactos fortes.
                            aplicarDeslocamentoHorizontalComColisao(
                                inimigo,
                                obterKnockback(config, 'playerProjetil') * proj.direcao,
                                {
                                    largura: inimigo.largura,
                                    altura: inimigo.altura,
                                    offsetX: inimigo.offsetX || 0,
                                    maxPasso: Number(config.inimigoKnockbackPassoMax ?? 1)
                                }
                            );

                            virarFenoParaFonteDano(inimigo, proj.x);

                            inimigo.elemento.style.left = inimigo.x + 'px';

                            if (inimigo.vida >= 3) {
                                if (inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
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
                } else if (proj.origem === 'inimigo' && window.playerControle) {
                    const hitboxPlayer = { 
                        x: window.playerControle.x + (window.playerControle.offsetX || 0), 
                        y: window.playerControle.y, 
                        largura: window.playerControle.largura, 
                        altura: window.playerControle.altura 
                    };
                    const hitboxProjetil = { x: proj.x, y: proj.y, largura: config.PROJETIL_LARGURA, altura: config.PROJETIL_ALTURA };

                    if (detectarColisaoHitbox(hitboxProjetil, hitboxPlayer, 0, 0, 0)) {
                        if (temEscudoAtivo()) {
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
                                controle.dano = 0; // Reset imediato para evitar repetição do alert
                                alert("Game Over! Você foi derrotado pelos projéteis inimigos.");
                                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                            }
                        }

                        // Knockback no Jogador baseado na direção do tiro
                        const valorKnockback = obterKnockbackRecebido('inimigoProjetil');
                        const duracaoRecuo = 12; // O recuo durará 12 frames
                        controle.framesKnockbackRestante = duracaoRecuo;
                        // A velocidade por frame é o valor total dividido pela duração
                        controle.velocidadeKnockback = (valorKnockback / duracaoRecuo) * proj.direcao;
                        
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

        // 5. Atualização de Itens Coletáveis (Gravidade e Colisão)
        if (window.itensColetaveis && Array.isArray(window.itensColetaveis)) {
            for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                const item = window.itensColetaveis[i];
                
                // Para coleta de itens, usamos uma hitbox do jogador que abrange todo o sprite visual (32x32)
                const hitboxPlayerParaItem = {
                    x: controle.x,
                    y: controle.y,
                    largura: 32,
                    altura: 32
                };
                // Lógica de Coleta pelo Jogador
                const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 };
                // console.log(`[DEBUG ITEM] Player (x:${hitboxPlayerParaItem.x}, y:${hitboxPlayerParaItem.y}, w:${hitboxPlayerParaItem.largura}, h:${hitboxPlayerParaItem.altura})`);
                // console.log(`[DEBUG ITEM] Item ${item.tipo} (x:${hitboxItem.x}, y:${hitboxItem.y}, w:${hitboxItem.largura}, h:${hitboxItem.altura})`);
                if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxPlayerParaItem, hitboxItem, 0, 0, 0)) {
                    const foiColetado = coletarItemGarra(item);
                    if (foiColetado) {
                        item.elemento.remove();
                        window.itensColetaveis.splice(i, 1);
                    }
                    continue; // Pula para o próximo item após processar a tentativa de coleta
                }

                // Aplica Gravidade
                item.velocidadeY -= config.inimigoGravidade || 0.6;
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
                        item.elemento.remove();
                        window.itensColetaveis.splice(i, 1);
                        continue;
                    }
                }

                // Atualiza visual do item
                item.elemento.style.left = item.x + 'px';
                item.elemento.style.bottom = item.y + 'px';
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
}
