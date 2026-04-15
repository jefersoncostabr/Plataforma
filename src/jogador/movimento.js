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

    function obterKnockback(config, fonte = 'default') {
        const base = Number(config.knockbackBase ?? config.knockbackInimigo ?? 150);
        const ajuste = Number(config.knockbackAjustes?.[fonte] ?? 0);
        return base + ajuste;
    }

    function temEscudoAtivo() {
        return controle.temEscudo && !controle.escudoVermelho && !controle.itensGuardadosNoCinto;
    }

    function aplicarDanoEspinho(colisaoEstaca) {
        if (!colisaoEstaca || colisaoEstaca.tipo !== 'estaca') return;

        // Permite passar agachado por baixo da estaca para baixo sem sofrer dano.
        if (
            controle.estaAgachado &&
            colisaoEstaca.direcao === 'baixo' &&
            typeof colisaoEstaca.baseReal === 'number'
        ) {
            const topoJogador = controle.y + controle.altura;
            const tolerancia = Number(config.toleranciaPassarAgachadoEspinho ?? 1);
            if (topoJogador <= colisaoEstaca.baseReal + tolerancia) {
                return;
            }
        }

        if ((controle.cooldownDanoEspinho || 0) > 0) return;

        controle.cooldownDanoEspinho = Number(config.cooldownDanoEspinho ?? 24);

        // Knockback sempre acontece ao tocar espinho, mesmo com escudo.
        if (colisaoEstaca.direcao === 'cima') {
            const impulsoVertical = Number(config.knockbackEspinhoUpY ?? 8);
            controle.velocidadeY = Math.max(controle.velocidadeY || 0, impulsoVertical);
        }

        if (colisaoEstaca.esquerdaReal !== undefined && colisaoEstaca.direitaReal !== undefined) {
            const centroEstaca = (colisaoEstaca.esquerdaReal + colisaoEstaca.direitaReal) / 2;
            const centroPlayer = controle.x + (controle.offsetX || 0) + ((controle.largura || 0) / 2);
            const direcaoKnock = centroPlayer < centroEstaca ? -1 : 1;
            const valorKnock = Number(config.knockbackEspinho ?? 90);
            const duracaoKnock = 10;
            controle.framesKnockbackRestante = Math.max(controle.framesKnockbackRestante || 0, duracaoKnock);
            controle.velocidadeKnockback = (valorKnock / duracaoKnock) * direcaoKnock;
        }

        if (temEscudoAtivo()) {
            controle.escudoProtegido = (controle.escudoProtegido || 0) + 1;
            const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);

            const quebrouEscudoAgora = controle.escudoProtegido >= tirosProtegidos;
            if (quebrouEscudoAgora) {
                controle.escudoVermelho = true;
            } else if (typeof flashElement === 'function' && escudoElemento) {
                flashElement(escudoElemento, 120, 6);
            }

            atualizarVisualEscudo();
            salvarInventario();
            return;
        }

        const dano = Number(config.danoEspinho ?? 1);
        controle.dano = (controle.dano || 0) + dano;

        if (typeof flashComVibacao === 'function') {
            flashComVibacao(elemento);
        }

        const limiteVida = controle.maxVida || 3;
        if (controle.dano >= limiteVida) {
            controle.dano = 0;
            alert('Game Over! Você foi derrotado pelos espinhos.');
            if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
        }
    }

    function detectarContatoEspinho() {
        if (typeof verificarColisaoComTiles !== 'function') return null;

        const xBase = controle.x + (controle.offsetX || 0);
        const yBase = controle.y;
        const largura = controle.largura;
        const altura = controle.altura;

        // 1) Sobreposição direta da hitbox atual
        const hitDireto = verificarColisaoComTiles(xBase, yBase, largura, altura, window.plataformas);
        if (hitDireto && hitDireto.tipo === 'estaca') return hitDireto;

        // 2) Probes de contato nas bordas para detectar toque sem penetração
        const pontos = [
            { x: xBase + 1, y: yBase - 1 },
            { x: xBase + largura - 1, y: yBase - 1 },
            { x: xBase - 1, y: yBase + Math.floor(altura / 2) },
            { x: xBase + largura + 1, y: yBase + Math.floor(altura / 2) },
            { x: xBase - 1, y: yBase + Math.max(2, altura - 2) },
            { x: xBase + largura + 1, y: yBase + Math.max(2, altura - 2) },
            { x: xBase + Math.floor(largura / 2), y: yBase + altura + 1 }
        ];

        for (const p of pontos) {
            const hitProbe = verificarColisaoComTiles(p.x, p.y, 1, 1, window.plataformas);
            if (hitProbe && hitProbe.tipo === 'estaca') {
                return hitProbe;
            }
        }

        return null;
    }

    function virarFenoParaFonteDano(inimigo, fonteX) {
        if (!inimigo || inimigo.tipo !== 5 || !inimigo.elemento) return;
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
        const valor = obterKnockback(config, fonte);
        if (temEscudoAtivo()) {
            return valor * Number(config.escudoKnockbackMultiplicador ?? 0.5);
        }
        return valor;
    }

    function aplicarDeslocamentoHorizontalComColisao(ent, deslocX, opcoes = {}) {
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

    function dispararSinalizador() {
        const xPartida = controle.x + 12; // Centralizado no personagem
        const yPartida = controle.y + 32;
        const alturaSubida = 150; // Definimos a altura como constante para sincronia

        // 1. Cria o projétil do sinalizador
        const sinalizador = document.createElement('img');
        sinalizador.src = config.spriteProjetil;
        sinalizador.style.cssText = `
            position: absolute;
            width: ${config.PROJETIL_LARGURA}px;
            height: ${config.PROJETIL_ALTURA}px;
            left: ${xPartida}px;
            bottom: ${yPartida}px;
            image-rendering: pixelated;
            transform: translateY(0) rotate(-90deg);
            transition: transform 1.0s linear;
        `;
        
        adicionarAoLayer(sinalizador, window.LAYERS.EFEITOS);

        // Inicia a subida usando transform para fluidez via GPU
        requestAnimationFrame(() => {
            sinalizador.style.transform = `translateY(-${alturaSubida}px) rotate(-90deg)`;
        });

        // 2. Lógica da Explosão
        setTimeout(() => {
            const posX = xPartida;
            const posY = yPartida + alturaSubida; // Calculamos a posição final real
            sinalizador.remove();

            const explosao = document.createElement('img');
            explosao.src = '../../assets/personagem/explosao.png';
            explosao.style.position = 'absolute';
            explosao.style.width = '32px';
            explosao.style.height = '32px';
            explosao.style.left = (posX - 12) + 'px';
            explosao.style.bottom = (posY - 12) + 'px';
            explosao.style.imageRendering = 'pixelated';
            explosao.style.pointerEvents = 'none';
            explosao.style.transform = 'scale(0.1)';
            explosao.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
            
            adicionarAoLayer(explosao, window.LAYERS.EFEITOS);

            // Double requestAnimationFrame garante que o navegador processe o scale(0.1) antes de aplicar o scale(4)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    explosao.style.transform = 'scale(4)'; // Estica a explosão
                    explosao.style.opacity = '0';
                });
            });

            // Remove o elemento após a animação
            setTimeout(() => {
            explosao.remove();
        }, 800);

    }, 1050); 

    // Lógica do AirDrop: Após o tempo configurado, o suprimento cai do céu
    const tempoEspera = (config.airdrop1?.espera || 10) * 1000;
    setTimeout(() => {
        // Agora escolhe uma coluna baseada na largura total do mundo atual
        const colunasTotais = Math.floor(window.mundoLargura / 32);
        const colAleatoria = Math.floor(Math.random() * colunasTotais);
        const xFinal = colAleatoria * 32;
        const yFinal = 448; // Linha "o" no sistema de grid (14 * 32px)

        const airdropImg = document.createElement('img');
        airdropImg.src = '../../assets/personagem/airdrop.png';
        airdropImg.style.position = 'absolute';
        airdropImg.style.width = '32px';
        airdropImg.style.height = '32px';
        airdropImg.style.left = xFinal + 'px';
        airdropImg.style.bottom = yFinal + 'px';
        airdropImg.style.imageRendering = 'pixelated';
        
        adicionarAoLayer(airdropImg, window.LAYERS.ITENS);
        window.itensColetaveis.push({
            x: xFinal,
            y: yFinal,
            elemento: airdropImg,
            velocidadeY: 0, // Começa parado e a gravidade configurada assume
            tipo: 'airdrop'
        });
        console.log(`AirDrop: Suprimentos detectados na coluna ${colAleatoria + 1}!`);
    }, tempoEspera);
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

    // Expose for restart
    window.atualizarVisualEscudo = atualizarVisualEscudo;

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
        chutando: false,
        tempoChute: 0,
        framesImpulsoRestante: 0,
        velocidadeDash: 0,
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
        temCinto: false,
        temBota: false, // Inicia sem bota
        temJetpack: false,
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
        airdropUsadoNoNivel: false,
        estaAgachado: false,
        teclas: {}
    };

    if (typeof window.inicializarEstadoCinto === 'function') {
        window.inicializarEstadoCinto(controle);
    }

    const inventarioSistema = window.criarSistemaInventarioJogador({
        controle,
        config,
        atualizarVisualEscudo,
        getElementos: () => ({
            armaElemento,
            botaElemento,
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
        atualizarVisualEscudo,
        salvarInventario,
        animarDanoAlvo,
        obterKnockback,
        virarFenoParaFonteDano,
        processarMorteFeno,
        removerInimigoDerrotado,
        flashComVibacao: typeof flashComVibacao === 'function' ? flashComVibacao : undefined
    });

    const { acionarGarra, atualizarAnimacaoGarra } = sistemaGarra;

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
                if (typeof window.toggleSkillMenu === 'function' && !window.isPaused) {
                    window.toggleSkillMenu();
                } else if (typeof window.toggleSkillMenu !== 'function') {
                    console.error("Erro: A função 'toggleSkillMenu' não foi encontrada. Verifique se o arquivo skills.js foi carregado corretamente.");
                }
            },
            onCriarInimigoAleatorio: () => {
                if (typeof criarInimigoAleatorio === 'function' && window.plataformas) {
                    const coordsArray = Object.keys(window.plataformas);
                    const tipoAleatorio = Math.floor(Math.random() * 3);
                    criarInimigoAleatorio(coordsArray, tipoAleatorio);
                }
            },
            onAcionarGarra: () => {
                acionarGarra();
            },
            onAlternarCinto: () => {
                alternarItensNoCinto();
            },
            onResetDebug: () => {
                limparInventarioSalvo();
                console.log('Inventário salvo zerado.');
                controle.temEscudo = false;
                controle.escudoVermelho = false;
                controle.escudoProtegido = 0;
                controle.temArma = false;
                controle.municao = 0;
                controle.temBota = false;
                controle.framesKnockbackRestante = 0;
                controle.velocidadeKnockback = 0;
                controle.temGarra = false;
                botaElemento.style.display = 'none';
                controle.inventario = [];
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                garraElemento.style.display = 'none';
                controle.temCinto = false;
                cintoElemento.style.display = 'none';
                controle.timerAtivacaoJetpack = 0;
                controle.timerVooRestante = 0;
                controle.cooldownVooJetpack = 0;
                atualizarVisualEscudo();
                if (typeof armaElemento !== 'undefined') {
                    armaElemento.style.display = 'none';
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

    function atualizar() {
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
                const posStyle = { left: elemento.style.left, bottom: elemento.style.bottom, transform: elemento.style.transform };
                if (armaElemento) Object.assign(armaElemento.style, posStyle);
                if (escudoElemento) Object.assign(escudoElemento.style, posStyle);
                if (botaElemento) Object.assign(botaElemento.style, posStyle);
                if (jetpackElemento) Object.assign(jetpackElemento.style, posStyle);
                if (garraElemento) Object.assign(garraElemento.style, posStyle);
                if (cintoElemento && controle.temCinto) sincronizarCintoComJogador();

                // Mantém o HUD atualizado
                atualizarHUD();
                requestAnimationFrame(atualizar);
                return; // Bloqueia comandos enquanto estiver atordoado
            } else {
                controle.stunned = false;
                elemento.style.filter = 'none';
            }
        }

        // Lógica da Skill "AirDrop" (Combo: Cima + I)
        const segurandoCima = acaoAtiva('cima');
        const apertouI = acaoAtiva('tiro');

        // Log de teste para debug (remova ou comente após testar)
        if (apertouI) {
            // console.log("Teclas detectadas: Cima:", segurandoCima, "| I:", apertouI, "| Skill 'skilla2' possui?", window.playerSkills?.includes('skilla2'), "| Já usado?", controle.airdropUsadoNoNivel);
        }

        // Alterado de 'airdrop' para 'skilla2' para coincidir com o ID no skillsData.json
        if (segurandoCima && apertouI && window.playerSkills?.includes('skilla2') && !controle.airdropUsadoNoNivel) {
            dispararSinalizador();
            controle.airdropUsadoNoNivel = true;
            console.log("Skill AirDrop: Suporte aéreo solicitado!");
            
            // Consome a tecla para evitar que o personagem atire no mesmo frame
            consumirAcao('tiro');
        }

        // Lógica da Skill "Vender" (Combo: Baixo + I)
        const segurandoBaixoVenda = acaoAtiva('baixo');
        const apertouVenda = acaoAtiva('tiro');

        // Debug de teclas combinadas (Vender)
        if (segurandoBaixoVenda && apertouVenda) {
            // console.log("Debug: Tentativa de Venda detectada. Skill Vender ativa?", window.playerSkills?.includes('skilla1'));
        }

        if (window.playerSkills?.includes('skilla1') && segurandoBaixoVenda && apertouVenda && !controle.vendaEmCurso && controle.inventario.length > 0) {
            const tipo = controle.inventario.pop();
            controle.vendaEmCurso = true;
            controle.vendaTimer = 0;
            controle.vendaTipo = tipo;

            // Remove visualmente do jogador
            if (tipo === 'revolver') { controle.temArma = false; armaElemento.style.display = 'none'; }
            else if (tipo === 'escudo') { controle.temEscudo = false; atualizarVisualEscudo(); }
            else if (tipo === 'bota') { controle.temBota = false; botaElemento.style.display = 'none'; }
            else if (tipo === 'jetpack') { 
                controle.temJetpack = false; 
                controle.jetpackAtivo = false;
                jetpackElemento.style.display = 'none'; 
                garraElemento.style.display = 'none';
                jetFogoElemento.style.display = 'none';
            }

            // Cria o item flutuante
            const visual = document.createElement('img');
            visual.style = `position: absolute; width: 32px; height: 32px; z-index: 20; image-rendering: pixelated;`;
            if (tipo === 'revolver') visual.src = config.spriteItemRevolver || '../../assets/personagem/revolver_pegavel.png';
            else if (tipo === 'escudo') visual.src = config.spriteItemEscudo || '../../assets/personagem/escudo_pegavel.png';
            else if (tipo === 'bota') visual.src = config.spriteItemBota || '../../assets/personagem/bota_pegavel.png';
            else if (tipo === 'jetpack') visual.src = config.spriteItemJetpack || '../../assets/personagem/jetpack_pegavel.png';
            else if (tipo === 'garra') visual.src = config.spriteItemGarra || '../../assets/personagem/garra_coletavel.png';
            
            elemento.parentElement.appendChild(visual);
            controle.vendaVisual = visual;
            salvarInventario();
        }

        // Processamento da Venda
        if (controle.vendaEmCurso) {
            controle.vendaTimer++;
            
            // Mantém sobre o jogador
            controle.vendaVisual.style.left = controle.x + 'px';
            controle.vendaVisual.style.bottom = (controle.y + 40) + 'px';

            // Fase 2: Fica verde após 1 segundo (60 frames)
            if (controle.vendaTimer > 60) {
                controle.vendaVisual.style.filter = 'sepia(1) saturate(10) hue-rotate(90deg)';
            }

            // Cancelamento por Pulo
            if (acaoAtiva('pulo')) {
                // console.log("Venda cancelada pelo pulo!");
                controle.inventario.push(controle.vendaTipo);
                // Devolve os itens logicamente
                if (controle.vendaTipo === 'revolver') { controle.temArma = true; armaElemento.style.display = 'block'; }
                else if (controle.vendaTipo === 'escudo') { controle.temEscudo = true; atualizarVisualEscudo(); }
                else if (controle.vendaTipo === 'bota') { controle.temBota = true; botaElemento.style.display = 'block'; }
                else if (controle.vendaTipo === 'jetpack') { 
                    controle.temJetpack = true; 
                    jetpackElemento.style.display = 'block'; 
                }
                else if (controle.vendaTipo === 'garra') {
                    controle.temGarra = true;
                    garraElemento.style.display = 'block';
                }
                
                controle.vendaVisual.remove();
                controle.vendaEmCurso = false;
                salvarInventario();
            } 
            // Conclusão da Venda (2 segundos = 120 frames)
            else if (controle.vendaTimer >= 120) {
                if (typeof window.ganharXP === 'function') window.ganharXP(1);
                controle.vendaVisual.remove();
                controle.vendaEmCurso = false;
                // console.log("Item vendido por 1 XP!");
            }
            
            requestAnimationFrame(atualizar);
            return; // Bloqueia outras ações enquanto vende
        }

        atualizarAnimacaoGarra();

        // Detecta combinação de Drop: S ou Seta Baixo + Pulo
        const segurandoBaixo = acaoAtiva('baixo');
        
        // Debug de teclas combinadas (Dropar)
        if (segurandoBaixo && acaoAtiva('pulo')) {
            // console.log("Debug: Tentativa de Drop detectada. No chão?", controle.noChao);
        }

        if (segurandoBaixo && acaoAtiva('pulo') && controle.noChao) {
            consumirAcao('pulo'); // Consome o pulo para não pular e dropar ao mesmo tempo
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
        controle.chutando = controle.tempoChute > 0;

        controle.movendoHorizontal = false;
        const xAnterior = controle.x;
        const yAnterior = controle.y;

        const velBase = config.velocidadePlayer || velocidade;
        let velAtiva = temEscudoAtivo()
            ? Math.max(0, velBase - (config.escudoVelocidadeReduzida ?? 2))
            : velBase;

        // Aplica o bônus de velocidade se estiver usando a bota
        if (controle.temBota && !controle.itensGuardadosNoCinto) {
            velAtiva += Number(config.bonusVelocidadeBota || 2);
        }

        if (controle.estaAgachado) {
            const multiplicadorAgachado = Number(config.agachadoMultiplicadorVelocidade ?? 0.55);
            velAtiva *= Math.max(0, multiplicadorAgachado);
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

        // Lógica de Chute (tecla K)
        if (acaoAtiva('chute') && controle.cooldownChute === 0) {
            controle.tempoChute = config.tempoChute;      // duração da animação → "tempoChute"
            controle.cooldownChute = config.cooldownChute; // espera até o próximo chute → "cooldownChute"

            // Configura o deslocamento suave em vez de teleporte
            const duracaoDash = 10; // O avanço levará 10 frames para completar
            const multiplicadorChute = (controle.temBota && !controle.itensGuardadosNoCinto) ? 2 : 1;
            
            controle.framesImpulsoRestante = duracaoDash;
            // Distância total do avanço → "impulsoChute" (dobra com bota)
            controle.velocidadeDash = (config.impulsoChute * multiplicadorChute) / duracaoDash;

            // Reseta o estado de "atingido" de todos os inimigos para este novo chute
            if (window.inimigos) window.inimigos.forEach(inimigo => inimigo.foiAtingidoNesteChute = false);
        }

        // Aplica o impulso físico do dash durante o chute
        if (controle.framesImpulsoRestante > 0) {
            const direcaoDash = (controle.direcao === 'd' ? 1 : -1);
            controle.x += controle.velocidadeDash * direcaoDash;
            controle.framesImpulsoRestante--;
        }

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

        // Diminui o cooldown global do chute
        if (controle.cooldownChute > 0) {
            controle.cooldownChute--;
        }

        // Diminui o tempo ativo do chute
        if (controle.tempoChute > 0) {
            controle.tempoChute--;
        }

        // Diminui o cooldown do tiro
        if (controle.cooldownTiro > 0) {
            controle.cooldownTiro--;
        }

        if (controle.cooldownDanoEspinho > 0) {
            controle.cooldownDanoEspinho--;
        }

        // Diminui o cooldown do pulo
        if (controle.cooldownPulo > 0) {
            controle.cooldownPulo--;
        }

        // Diminui o cooldown do Jetpack
        if (controle.cooldownVooJetpack > 0) {
            controle.cooldownVooJetpack--;
        }

        // 📍 RASTREAMENTO DE DIREÇÃO PARA CÂMERA GRANDE
        // Calcula em qual direção o jogador se moveu este frame
        // Usado pela câmera grande para adicionar viés (offset) apropriado
        const movimentoFrameX = controle.x - xAnterior;
        const movimentoFrameY = controle.y - yAnterior;
        
        if (movimentoFrameX > 0) {
            window.ultimaDirecaoX = 1; // Movendo para direita
        } else if (movimentoFrameX < 0) {
            window.ultimaDirecaoX = -1; // Movendo para esquerda
        } else {
            window.ultimaDirecaoX = 0; // Sem movimento horizontal
        }
        
        if (movimentoFrameY > 0) {
            window.ultimaDirecaoY = 1; // Movendo para cima
        } else if (movimentoFrameY < 0) {
            window.ultimaDirecaoY = -1; // Movendo para baixo
        } else {
            window.ultimaDirecaoY = 0; // Sem movimento vertical
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
        const forcaPuloFinal = (controle.temBota && !controle.itensGuardadosNoCinto)
            ? (config.inimigoForcaPulo + (config.bonusPuloBota || 1.5)) 
            : config.inimigoForcaPulo;

        // Decrementa o timer da janela de clique duplo (timing para a skill Salto)
        if (controle.timerPuloDuplo > 0) controle.timerPuloDuplo--;

        // Decrementa o cooldown do pulo duplo
        if (controle.cooldownPuloDuplo > 0) controle.cooldownPuloDuplo--;

        // Decrementa o cooldown pós Super Descida
        if (controle.cooldownPosSuperDescida > 0) controle.cooldownPosSuperDescida--;

        // Lógica da Skill Passiva "Salto" (skillb2) - Pulo Duplo
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
                controle.pulosRealizados = 1;
                controle.timerPuloDuplo = 12; // Janela de tempo mais rigorosa: 10 frames (aprox. 0.16s)
            } else {
                controle.pulosRealizados = 0;
                // O cooldown do pulo duplo não é resetado aqui, ele deve contar até o fim.
            }
        } else if (puloAcabouDeSerPressionado && window.playerSkills?.includes('skillb2') && controle.pulosRealizados === 1 && controle.timerPuloDuplo > 0 && controle.cooldownPuloDuplo === 0) {
            // Segundo salto: agora com 1.25x da força (um quarto a mais) e com timing mais exigente
            controle.velocidadeY = forcaPuloFinal * 1.25;
            controle.pulosRealizados = 2; // Consome o segundo salto até tocar o chão novamente
            controle.doubleJumpUsedInAir = true; // Marca que o pulo duplo foi usado no ar
            console.log("Habilidade Salto: Pulo duplo rápido executado!");
        }

        // Lógica de Ativação do Jetpack
        if (controle.temJetpack && !controle.itensGuardadosNoCinto) {
            const segurandoCimaAtivacao = acaoAtiva('cima');
            
            // Ativação Instantânea: Cima + Pulo (Apenas se não houver cooldown)
            if (segurandoCimaAtivacao && puloAcabouDeSerPressionado && !controle.jetpackAtivo && controle.cooldownVooJetpack === 0) {
                controle.jetpackAtivo = true;
                // Só reseta o combustível se ele estiver zerado (início de um novo ciclo)
                if (controle.timerVooRestante <= 0) {
                    controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                }
                controle.framesVoando = 0; // Reseta o tempo de decolagem
                controle.timerAtivacaoJetpack = 0;
            } 
            // Ativação por tempo (Segurar Espaço por 2 segundos) (Apenas se não houver cooldown)
            else if (acaoAtiva('pulo') && controle.cooldownVooJetpack === 0) {
                controle.timerAtivacaoJetpack++;
                if (controle.timerAtivacaoJetpack >= (config.jetpackTempoAtivacao || 120) && !controle.jetpackAtivo) {
                    controle.jetpackAtivo = true;
                    if (controle.timerVooRestante <= 0) {
                        controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                    }
                    controle.framesVoando = 0;
                }
            } else {
                controle.timerAtivacaoJetpack = 0;
            }
        }

        // Gerenciamento de Física e Voo
        if (controle.jetpackAtivo && !controle.itensGuardadosNoCinto) {
            controle.timerVooRestante--;
            controle.framesVoando++;

            const subindo = controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W'];

            // 1. Controle de Voo: Subir ou Toggle do Hover (Pairar)
            if (subindo) {
                controle.velocidadeY = config.jetpackForcaVoo || 2;
                controle.jetpackHovering = false; // Subir cancela o estado de pairar automaticamente
            } else if (puloAcabouDeSerPressionado) {
                controle.jetpackHovering = !controle.jetpackHovering; // Alterna o estado (ON/OFF)
            }

            // 2. Aplica a física baseada no estado de pairar ou descida lenta
            if (controle.jetpackHovering) {
                controle.velocidadeY = 0; // Fica parado no ar
            } else if (!subindo) {
                controle.velocidadeY = -1; // Descida lenta padrão
            }

            controle.y += controle.velocidadeY;

            // Lógica de Desativação 1: Esgotamento de Combustível.
            // Quando o timer zera, o motor desliga forçadamente e entra em estado de recarga (cooldown), ativando o filtro visual vermelho.
            if (controle.timerVooRestante <= 0) {
                controle.jetpackAtivo = false;
                controle.jetpackHovering = false; // Reseta o pairar ao acabar o combustível
                controle.velocidadeY = 0;
                controle.cooldownVooJetpack = config.jetpackCooldown || 180;// Inicia o cooldown ao terminar o voo
            }

        } else {
            // Aplica gravidade e pulo normal (definido em fisica.js)
            aplicarFisica(
                controle, 
                { ...controle.teclas, ' ': teclaPuloAtiva }, 
                forcaPuloFinal, 
                config.inimigoGravidade, 
                config.inimigoPuloCooldown
            );
        }

        // Mecânica de Super Descida e Paraquedas
        if (!controle.noChao && controle.velocidadeY < 0 && acaoAtiva('pulo') && !controle.usandoParaquedas && controle.pulosRealizados === 2) {
            controle.velocidadeY = -20; 
            controle.superDescidaAtiva = true;
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
            // if (!noChaoAnterior && controle.noChao) console.log("Movimentação: Personagem tocou o chão.");
            controle.velocidadeY = 0;
        }

        const hitEspinho = detectarContatoEspinho();
        if (hitEspinho && hitEspinho.tipo === 'estaca') {
            aplicarDanoEspinho(hitEspinho);
        }

        // Condição de Game Over por queda (buraco)
        if (controle.y < -64) {
            // Transforma em Skill Passiva: Verifica se o player possui a skill 'skillb1' (Resgate)
            if (window.playerSkills?.includes('skillb1')) {
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

                // 2. Attackbox (Ativa apenas durante o chute)
                if (controle.chutando) {
                    // Hitbox de ataque — ajuste em configuracoes.json:
                    // "ATAQUE_OFFSET_X" → distância da borda do sprite até a hitbox (menor = começa mais perto)
                    // "ATAQUE_LARGURA"  → largura da hitbox (maior = alcance maior)
                    // "ATAQUE_OFFSET_Y" → deslocamento vertical da hitbox
                    // "ATAQUE_ALTURA"   → altura da hitbox
                    let ataqueX = (controle.direcao === 'd') 
                        ? controle.x + config.ATAQUE_OFFSET_X 
                        : controle.x + (32 - config.ATAQUE_OFFSET_X - config.ATAQUE_LARGURA);

                    const hitboxAtaque = {
                        x: ataqueX,
                        y: controle.y + config.ATAQUE_OFFSET_Y,
                        largura: config.ATAQUE_LARGURA,
                        altura: config.ATAQUE_ALTURA
                    };

                    const hitboxInimigo = {
                        x: inimigo.x + (inimigo.offsetX || 0),
                        y: inimigo.y,
                        largura: inimigo.largura,
                        altura: inimigo.altura
                    };

                    // Só aplica o dano se o inimigo ainda não foi atingido por este chute específico
                    if (!inimigo.foiAtingidoNesteChute && detectarColisaoHitbox(hitboxAtaque, hitboxInimigo, 0, 0, 0)) {
                        inimigo.foiAtingidoNesteChute = true;
                        
                        // Interrompe a coleta de item se levar um golpe
                        inimigo.estaColetando = false;
                        inimigo.timerColeta = 0;
                        
                        inimigo.vida = (inimigo.vida || 0) + 1;
                        if (inimigo.vida < 3) animarDanoAlvo(inimigo);
                        // Inimigo tipo 5 é Feno (alvo de treino) - você verá dano no comportamento

                        // Knockback: Lança o inimigo para trás com base na direção do jogador
                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        let valorKnockbackInimigo = obterKnockback(config, 'playerChute');
                        
                        // Reduz knockback do inimigo se ele estiver com escudo ativo
                        if (inimigo.temEscudo && !inimigo.escudoVermelho) {
                            valorKnockbackInimigo *= Number(config.escudoKnockbackMultiplicador ?? 0.5);
                        }

                        const duracaoRecuoInimigo = 15; // Duração do recuo em frames
                        inimigo.framesKnockbackRestante = duracaoRecuoInimigo;
                        inimigo.velocidadeKnockback = (valorKnockbackInimigo / duracaoRecuoInimigo) * direcaoKnockback;
                        virarFenoParaFonteDano(inimigo, controle.x + ((controle.largura || 32) / 2));

                        // console.log(`Ataque: Inimigo atingido! Vida restante: ${3 - inimigo.vida}`);

                        // Se atingir 3 golpes, o inimigo morre e desaparece
                        if (inimigo.vida >= 3) {
                            if (inimigo.tipo === 5) {
                                processarMorteFeno(inimigo);
                            } else {
                                removerInimigoDerrotado(inimigo);
                            }
                        }
                    }
                }
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

                            if (inimigo.temEscudo && !inimigo.escudoVermelho) {
                                inimigo.escudoProtegido = (inimigo.escudoProtegido || 0) + 1;
                                const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                                
                                if (typeof flashElement === 'function' && inimigo.escudoElemento) {
                                    flashElement(inimigo.escudoElemento, 150, 6);
                                }

                                if (inimigo.escudoProtegido >= tirosProtegidos) {
                                    inimigo.escudoVermelho = true;
                                    // console.log("Escudo do inimigo quebrou!");
                                }
                            } else {
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
                                if (inimigo.tipo === 5) {
                                    processarMorteFeno(inimigo);
                                } else {
                                    if (typeof flashComVibacao === 'function') {
                                        flashComVibacao(inimigo.elemento);
                                    }

                                    removerInimigoDerrotado(inimigo);
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
                            controle.escudoProtegido = (controle.escudoProtegido || 0) + 1;
                            const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                            
                            // Efeito visual no escudo ao receber dano
                            if (typeof flashElement === 'function' && escudoElemento) {
                                flashElement(escudoElemento, 150, 6);
                            }
                            
                            if (controle.escudoProtegido >= tirosProtegidos) {
                                controle.escudoVermelho = true;
                                // console.log('Escudo danificado: agora vermelho e sem proteção.');
                            } else {
                                // console.log(`Escudo bloqueou o tiro! ${controle.escudoProtegido}/${tirosProtegidos}`);
                            }
                            atualizarVisualEscudo();
                            salvarInventario();
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
                    // Remove o item do jogo IMEDIATAMENTE ao tocar
                    item.elemento.remove();
                    window.itensColetaveis.splice(i, 1);

                    // Processa o efeito do item baseado no tipo
                    if (item.tipo === 'escudo') {
                        // console.log("Jogador coletou o escudo!");
                        controle.temEscudo = true;
                        controle.escudoVermelho = item.escudoVermelho || false;
                        controle.escudoProtegido = item.escudoProtegido || 0;
                        if (!controle.inventario.includes('escudo')) controle.inventario.push('escudo');
                        escudoElemento.style.display = 'block';
                        atualizarVisualEscudo();
                        salvarInventario();
                    } else if (item.tipo === 'bota') {
                        console.log("Jogador coletou as botas!");
                        controle.temBota = true;
                        if (!controle.inventario.includes('bota')) controle.inventario.push('bota');
                        botaElemento.style.display = 'block';
                        salvarInventario();
                    } else if (item.tipo === 'jetpack') {
                        controle.temJetpack = true;
                        if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack');
                        // Refinamento: Garante que o item coletado venha com carga e pronto para uso
                        controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                        controle.cooldownVooJetpack = 0;
                        
                        // Sincroniza a posição IMEDIATAMENTE para evitar o "fantasma" no chão
                        jetpackElemento.style.left = controle.x + 'px';
                        jetpackElemento.style.bottom = controle.y + 'px';
                        jetpackElemento.style.display = 'block';
                        salvarInventario();
                    } else if (item.tipo === 'garra') {
                        console.log("Jogador coletou a garra!");
                        controle.temGarra = true;
                        if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                        garraElemento.style.left = controle.x + 'px';
                        garraElemento.style.bottom = controle.y + 'px';
                        garraElemento.style.display = 'block';
                        salvarInventario();
                    } else if (item.tipo === 'cinto') {
                        controle.temCinto = true;
                        if (!controle.inventario.includes('cinto')) controle.inventario.push('cinto');
                        cintoElemento.style.left = controle.x + 'px';
                        cintoElemento.style.bottom = controle.y + 'px';
                        cintoElemento.style.display = 'block';
                        salvarInventario();
                    } else if (item.tipo === 'airdrop') {
                    } else if (item.tipo === 'airdrop') {
                        // Lógica de Recompensa Aleatória baseada no JSON
                        const conteudos = config.airdrop1?.conteudos || ['xp'];
                        const sorteio = conteudos[Math.floor(Math.random() * conteudos.length)];
                        console.log("AirDrop resgatado pela garra! Conteúdo: " + sorteio);

                        if (sorteio === 'skillpoint') {
                            window.skillPoints += 1;
                        } else if (sorteio === 'xp') {
                            if (typeof window.ganharXP === 'function') window.ganharXP(6);
                        } else if (sorteio === 'restauracao') {
                            // Restaura todos os equipamentos do jogador
                            controle.municao = config.maxMunicao || 5; 
                            controle.escudoProtegido = 0;
                            controle.escudoVermelho = false;
                            controle.dano = Math.max(0, (controle.dano || 0) - 1);
                            if (controle.inventario.includes('escudo')) {
                                controle.temEscudo = true;
                            }
                            atualizarVisualEscudo();
                        } else if (sorteio === 'skill') {
                            // Sorteia uma skill que o jogador ainda não tenha
                            if (window.skillsData && Object.keys(window.skillsData).length > 0) {
                                const disponiveis = Object.keys(window.skillsData).filter(s => !window.playerSkills.includes(s) && window.skillsData[s].parent === null); // Apenas skills raiz para simplificar
                                if (disponiveis.length > 0) {
                                    const skillSorteada = disponiveis[Math.floor(Math.random() * disponiveis.length)];
                                    window.playerSkills.push(skillSorteada);
                                    if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
                                    console.log(`Nova Skill Desbloqueada: ${window.skillsData[skillSorteada].nome}`);
                                } else {
                                    if (typeof window.ganharXP === 'function') window.ganharXP(5); // Fallback se já tiver todas
                                }
                            }
                        } else if (sorteio === 'item') {
                            // Sorteio de item físico
                            const itensDisponiveis = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto']; // Inclui garra
                            const itemSorteado = itensDisponiveis[Math.floor(Math.random() * itensDisponiveis.length)];

                            if (itemSorteado === 'escudo') { 
                                controle.temEscudo = true; 
                                controle.escudoVermelho = false; 
                                controle.escudoProtegido = 0; 
                                if (!controle.inventario.includes('escudo')) controle.inventario.push('escudo'); // Garante que o item seja adicionado ao inventário
                                atualizarVisualEscudo(); 
                            }
                            else if (itemSorteado === 'bota') { 
                                controle.temBota = true; 
                                if (!controle.inventario.includes('bota')) controle.inventario.push('bota'); // Garante que o item seja adicionado ao inventário
                                botaElemento.style.display = 'block';
                            }
                            else if (itemSorteado === 'jetpack') { // Adiciona tratamento explícito para jetpack
                                controle.temJetpack = true;
                                if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack'); // Garante que o item seja adicionado ao inventário
                                jetpackElemento.style.display = 'block';
                            } else if (itemSorteado === 'garra') {
                                controle.temGarra = true;
                                if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                                garraElemento.style.display = 'block';
                            } else if (itemSorteado === 'revolver') { // Tratamento explícito para revolver
                                controle.temArma = true; 
                                controle.municao = config.maxMunicao || 5; 
                                if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver'); // Garante que o item seja adicionado ao inventário
                                armaElemento.style.display = 'block';
                            } else if (itemSorteado === 'cinto') {
                                controle.temCinto = true; 
                                if (!controle.inventario.includes('cinto')) controle.inventario.push('cinto'); // Garante que o item seja adicionado ao inventário
                                cintoElemento.style.display = 'block';
                            }
                        }
                        salvarInventario();
                    } else if (item.tipo === 'revolver') { // Este bloco é para coleta de revólver *não* via airdrop
                        // console.log("Jogador coletou o revólver!");
                        
                        // Se já tem a arma, apenas soma a munição (até o limite)
                        const novaMunicao = item.municao !== undefined ? item.municao : (config.maxMunicao || 5);
                        controle.municao = Math.min((controle.municao || 0) + novaMunicao, (config.maxMunicao || 5) * 2);
                        
                        controle.temArma = true;
                        if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver');
                        armaElemento.style.display = 'block';
                        salvarInventario();
                    }
                    else if (item.tipo === 'restauracao') { // NEW: Direct collection of restoration item
                        // console.log("Jogador coletou o item de restauração!");
                        controle.municao = config.maxMunicao || 5; 
                        controle.escudoProtegido = 0;
                        controle.escudoVermelho = false;
                        controle.dano = Math.max(0, (controle.dano || 0) - 1);
                        if (controle.inventario.includes('escudo')) {
                            controle.temEscudo = true;
                        }
                        atualizarVisualEscudo();
                        salvarInventario();
                    }

                    continue; // Pula para o próximo item, já que este foi coletado
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
