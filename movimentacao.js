/**
 * Adiciona controles de movimento ao personagem.
 * 
 * @param {string} id - O ID do elemento HTML do personagem.
 * @param {number} velocidade - Velocidade de movimento em pixels por quadro.
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 */
async function iniciarMovimentacao(id, velocidade = 4, spriteParado, spriteAndando, spriteChute) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.style.zIndex = '5'; // Define o jogador na camada 5

    // Busca as configurações do arquivo JSON
    const resposta = await fetch('configuracoesGerais.json');
    const config = await resposta.json();

    function obterKnockback(config, fonte = 'default') {
        const base = Number(config.knockbackBase ?? config.knockbackInimigo ?? 150);
        const ajuste = Number(config.knockbackAjustes?.[fonte] ?? 0);
        return base + ajuste;
    }

    function temEscudoAtivo() {
        return controle.temEscudo && !controle.escudoVermelho;
    }

    const INVENTARIO_STORAGE_KEY = 'plataformaInventario';

    function obterKnockbackRecebido(fonte = 'default') {
        const valor = obterKnockback(config, fonte);
        if (temEscudoAtivo()) {
            return valor * Number(config.escudoKnockbackMultiplicador ?? 0.5);
        }
        return valor;
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
            z-index: 15;
            image-rendering: pixelated;
            transform: translateY(0) rotate(-90deg);
            transition: transform 1.0s linear;
        `;
        
        elemento.parentElement.appendChild(sinalizador);

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
            explosao.src = 'personagem/explosao.png';
            explosao.style.position = 'absolute';
            explosao.style.width = '32px';
            explosao.style.height = '32px';
            explosao.style.left = (posX - 12) + 'px';
            explosao.style.bottom = (posY - 12) + 'px';
            explosao.style.zIndex = '16';
            explosao.style.imageRendering = 'pixelated';
            explosao.style.pointerEvents = 'none';
            explosao.style.transform = 'scale(0.1)';
            explosao.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
            
            elemento.parentElement.appendChild(explosao);

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
        // Escolhe uma coluna aleatória entre 0 e 19 (total de 20 colunas no palco de 640px)
        const colAleatoria = Math.floor(Math.random() * 20);
        const xFinal = colAleatoria * 32;
        const yFinal = 448; // Linha "o" no sistema de grid (14 * 32px)

        const airdropImg = document.createElement('img');
        airdropImg.src = 'personagem/airdrop.png';
        airdropImg.style.position = 'absolute';
        airdropImg.style.width = '32px';
        airdropImg.style.height = '32px';
        airdropImg.style.left = xFinal + 'px';
        airdropImg.style.bottom = yFinal + 'px';
        airdropImg.style.zIndex = '5';
        airdropImg.style.imageRendering = 'pixelated';
        
        if (elemento.parentElement) {
            elemento.parentElement.appendChild(airdropImg);
            window.itensColetaveis.push({
                x: xFinal,
                y: yFinal,
                elemento: airdropImg,
                velocidadeY: 0, // Começa parado e a gravidade configurada assume
                tipo: 'airdrop'
            });
            console.log(`AirDrop: Suprimentos detectados na coluna ${colAleatoria + 1}!`);
        }
    }, tempoEspera);
}

    function droparItemJogador() {
        if (!window.playerSkills || !window.playerSkills.includes('skilla')) {
            console.log("Habilidade 'Dropar' não adquirida.");
            return;
        }

        if (!controle.inventario || controle.inventario.length === 0) return;

        const tipo = controle.inventario.pop();
        const itemImg = document.createElement('img');
        let dadosItem = { tipo: tipo, x: 0, y: controle.y, velocidadeY: 5 };

        // Define o sprite e captura o estado atual do jogador para o item
        if (tipo === 'revolver') {
            itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
            dadosItem.municao = controle.municao;
            controle.temArma = false;
            armaElemento.style.display = 'none';
        } else if (tipo === 'escudo') {
            itemImg.src = controle.escudoVermelho ? (config.spriteEscudoVermelho || 'personagem/escudo_vermelho.png') : (config.spriteItemEscudo || 'personagem/escudo_pegavel.png');
            dadosItem.escudoProtegido = controle.escudoProtegido;
            dadosItem.escudoVermelho = controle.escudoVermelho;
            controle.temEscudo = false;
            controle.escudoVermelho = false;
            atualizarVisualEscudo();
        } else if (tipo === 'bota') {
            itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
            controle.temBota = false;
            botaElemento.style.display = 'none'; // Oculta o visual da bota
        } else if (tipo === 'jetpack') {
            itemImg.src = config.spriteItemJetpack || 'personagem/jetpack_pegavel.png';
            controle.temJetpack = false;
            controle.jetpackAtivo = false;
            controle.timerAtivacaoJetpack = 0;
            jetpackElemento.style.display = 'none'; // Oculta o visual do jetpack
            jetFogoElemento.style.display = 'none'; // Oculta o fogo ao dropar
        }

        itemImg.style.position = 'absolute';
        itemImg.style.width = '32px';
        itemImg.style.height = '32px';
        itemImg.style.zIndex = '3';
        itemImg.style.imageRendering = 'pixelated';
        elemento.parentElement.appendChild(itemImg);

        // Posicionamento: 2 blocos (64px) à frente
        const direcaoFace = controle.direcao === 'd' ? 1 : -1;
        let dropX = controle.x + (64 * direcaoFace);
        
        // Garante que o item não saia do palco
        if (typeof limitarPosicaoAoPalco === 'function') {
            const posFina = limitarPosicaoAoPalco(dropX, controle.y, 32, 32);
            dropX = posFina.x;
        }

        dadosItem.x = dropX;
        dadosItem.elemento = itemImg;
        window.itensColetaveis.push(dadosItem);
        salvarInventario();
    }

    function droparItensInimigo(inimigo) {
        if (!inimigo.inventario) return;
        
        // Lógica LIFO: Inverte a ordem para dropar o último item pego primeiro
        const itensParaDropar = [...inimigo.inventario].reverse();
        itensParaDropar.forEach((tipo, index) => {
            const itemImg = document.createElement('img');
            if (tipo === 'revolver') itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
            else if (tipo === 'escudo') itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
            else if (tipo === 'bota') itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
            else if (tipo === 'jetpack') itemImg.src = config.spriteItemJetpack || 'personagem/jetpack_pegavel.png';
            
            itemImg.style.position = 'absolute';
            itemImg.style.width = '32px';
            itemImg.style.height = '32px';
            itemImg.style.zIndex = '3';
            itemImg.style.imageRendering = 'pixelated';
            elemento.parentElement.appendChild(itemImg);

            let dropX = inimigo.x;
            let tentativa = 0;
            const estaOcupado = (checkX) => window.itensColetaveis.some(it => 
                Math.abs(it.x - checkX) < 20 && Math.abs(it.y - inimigo.y) < 20
            );

            // Busca a próxima posição adjacente livre (32px para cada lado)
            while (estaOcupado(dropX)) {
                tentativa++;
                const direcao = tentativa % 2 === 0 ? -1 : 1;
                const multiplier = Math.ceil(tentativa / 2);
                dropX = inimigo.x + (32 * multiplier * direcao);
            }

            window.itensColetaveis.push({
                x: dropX, y: inimigo.y,
                elemento: itemImg, velocidadeY: 5,
                tipo: tipo
            });
        });
    }

    function carregarInventarioSalvo() {
        try {
            const raw = localStorage.getItem(INVENTARIO_STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error('Erro ao ler inventário salvo:', error);
            return null;
        }
    }

    function salvarInventario() {
        try {
            const estado = {
                temEscudo: controle.temEscudo,
                escudoVermelho: controle.escudoVermelho,
                escudoProtegido: controle.escudoProtegido,
                temArma: controle.temArma,
                municao: controle.municao,
                temBota: controle.temBota,
                temJetpack: controle.temJetpack,
                inventario: controle.inventario
            };
            localStorage.setItem(INVENTARIO_STORAGE_KEY, JSON.stringify(estado));
        } catch (error) {
            console.error('Erro ao salvar inventário:', error);
        }
    }

    function limparInventarioSalvo() {
        localStorage.removeItem(INVENTARIO_STORAGE_KEY);
    }

    window.salvarInventario = salvarInventario;
    window.limparInventarioSalvo = limparInventarioSalvo;
    window.carregarInventarioSalvo = carregarInventarioSalvo;

    function atualizarVisualEscudo() {
        if (controle.temEscudo || controle.escudoVermelho) {
            escudoElemento.style.display = 'block';
        } else {
            escudoElemento.style.display = 'none';
        }

        escudoElemento.src = controle.escudoVermelho
            ? (config.spriteEscudoVermelho || 'personagem/escudo_vermelho.png')
            : (config.spriteEscudoPlayer || 'personagem/escudo.png');
    }

    // Expose for restart
    window.atualizarVisualEscudo = atualizarVisualEscudo;

    // Estado interno para rastrear posição e teclas pressionadas
    const controle = {
        x: parseInt(elemento.style.left) || 0,
        y: parseInt(elemento.style.bottom) || 0,
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
        municao: 0, // Inicia sem munição
        temArma: false, // Inicia sem a capacidade de atirar
        temEscudo: false, // Inicia sem escudo
        temBota: false, // Inicia sem bota
        temJetpack: false,
        jetpackAtivo: false,
        timerAtivacaoJetpack: 0,
        framesVoando: 0,
        timerVooRestante: 0,
        cooldownVooJetpack: 0,
        escudoVermelho: false,
        escudoProtegido: 0,
        dano: 0,
        maxVida: 3,
        vendaEmCurso: false,
        vendaTimer: 0,
        vendaTipo: null,
        vendaVisual: null,
        inventario: [],
        airdropUsadoNoNivel: false,
        teclas: {}
    };

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
    window.projeteis = [];
    window.itensColetaveis = [];

    const inventarioSalvo = carregarInventarioSalvo();
    if (inventarioSalvo) {
        controle.temEscudo = Boolean(inventarioSalvo.temEscudo);
        controle.escudoVermelho = Boolean(inventarioSalvo.escudoVermelho);
        controle.escudoProtegido = Number(inventarioSalvo.escudoProtegido ?? 0);
        controle.temArma = Boolean(inventarioSalvo.temArma);
        controle.municao = Number(inventarioSalvo.municao ?? 0);
        controle.temBota = Boolean(inventarioSalvo.temBota);
        controle.temJetpack = Boolean(inventarioSalvo.temJetpack);
        controle.inventario = Array.isArray(inventarioSalvo.inventario) ? inventarioSalvo.inventario : [];
    }

    // Função para resetar/spawnar itens baseados no JSON da fase
    window.resetarItens = (dadosItens) => {
        // O array é limpo aqui; limparCenario já remove as imagens do DOM
        window.itensColetaveis = [];
        if (!dadosItens) return;

        console.log("resetarItens: Dados de itens recebidos:", dadosItens);

        dadosItens.forEach(dado => {
            if ((dado.tipo === 'escudo' && controle.temEscudo) || 
                (dado.tipo === 'revolver' && controle.temArma) ||
                (dado.tipo === 'bota' && controle.temBota) ||
                (dado.tipo === 'jetpack' && controle.temJetpack)) {
                console.log(`resetarItens: Item ${dado.tipo} não gerado porque o jogador já o possui.`);
                return;
            }

            const pos = typeof gridParaPixels === 'function' ? gridParaPixels(dado.pos) : {x: 0, y: 0};
            const itemImg = document.createElement('img');
            
            // Define o sprite baseado no tipo (escudo, bota ou revolver)
            if (dado.tipo === 'escudo') {
                itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
            } else if (dado.tipo === 'bota') {
                itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
            } else if (dado.tipo === 'jetpack') {
                itemImg.src = config.spriteItemJetpack || 'personagem/jetpack_pegavel.png';
            } else {
                itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
            }

            itemImg.style.position = 'absolute';
            itemImg.style.width = '32px';
            itemImg.style.height = '32px';
            itemImg.style.left = pos.x + 'px';
            itemImg.style.bottom = pos.y + 'px';
            console.log(`resetarItens: Tentando adicionar item ${dado.tipo} em x:${pos.x}, y:${pos.y} com src:${itemImg.src}`);
            itemImg.style.zIndex = '3';
            itemImg.style.imageRendering = 'pixelated';
            elemento.parentElement.appendChild(itemImg);

            window.itensColetaveis.push({
                x: pos.x, y: pos.y,
                elemento: itemImg, velocidadeY: 0,
                tipo: dado.tipo
            });
        });
    };
    
    // Elemento da arma
    const armaElemento = document.createElement('img');
    armaElemento.id = 'player-weapon';
    armaElemento.src = config.spriteArmaPlayer || 'personagem/revolver.png';
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
    escudoElemento.src = config.spriteEscudoPlayer || 'personagem/escudo.png';
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
    botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
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
    jetpackElemento.src = config.spriteJetpackPlayer || 'personagem/jetpack.png';
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
    jetFogoElemento.src = config.spriteJetFogo || 'personagem/jet.png';
    jetFogoElemento.style.position = 'absolute';
    jetFogoElemento.style.width = '32px';
    jetFogoElemento.style.height = '32px';
    jetFogoElemento.style.zIndex = '3'; // Atrás do jetpack (4) e jogador (5)
    jetFogoElemento.style.display = 'none';
    jetFogoElemento.style.imageRendering = 'pixelated';
    jetFogoElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(jetFogoElemento);

    // Elemento do Paraquedas
    const paraquedasElemento = document.createElement('img');
    paraquedasElemento.id = 'player-parachute';
    paraquedasElemento.src = 'personagem/paraquedas.png';
    paraquedasElemento.style.position = 'absolute';
    paraquedasElemento.style.width = '32px';
    paraquedasElemento.style.height = '32px';
    paraquedasElemento.style.zIndex = '9'; // Fica acima do personagem e das botas
    paraquedasElemento.style.display = 'none';
    paraquedasElemento.style.imageRendering = 'pixelated';
    paraquedasElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(paraquedasElemento);
    console.log("Sistema: Sprite do paraquedas inicializado. Parent element ID:", elemento.parentElement.id);

    paraquedasElemento.onerror = () => {
        console.error("ERRO: Não foi possível carregar a imagem do paraquedas em 'personagem/paraquedas.png'. Verifique o caminho e o arquivo.");
    };

    // Elemento do HUD (Skill Visão)
    const hudElemento = document.createElement('div');
    hudElemento.id = 'player-hud';
    hudElemento.style.position = 'absolute';
    hudElemento.style.top = '10px';
    hudElemento.style.left = '10px';
    hudElemento.style.display = 'none';
    hudElemento.style.gap = '5px';
    hudElemento.style.alignItems = 'center';
    hudElemento.style.zIndex = '100';
    elemento.parentElement.appendChild(hudElemento);

    function atualizarHUD() {
        if (!window.playerSkills || !window.playerSkills.includes('skillb')) {
            hudElemento.style.display = 'none';
            return;
        }
        hudElemento.style.display = 'flex';
        hudElemento.innerHTML = ''; // Limpa para redesenhar

        // Círculos de Vida
        const vidaAtual = (controle.maxVida || 3) - (controle.dano || 0);
        for (let i = 0; i < (controle.maxVida || 3); i++) {
            const circulo = document.createElement('div');
            circulo.className = 'hud-circle';
            circulo.style.backgroundColor = (i < vidaAtual) ? 'red' : 'white';
            hudElemento.appendChild(circulo);
        }

        // Quadrados de Escudo
        if (controle.temEscudo && !controle.escudoVermelho) {
            const slotsRestantes = (config.escudoTirosProtegidos || 3) - (controle.escudoProtegido || 0);
            for (let i = 0; i < slotsRestantes; i++) {
                const quadrado = document.createElement('div');
                quadrado.className = 'hud-square';
                hudElemento.appendChild(quadrado);
            }
        }
    }

    window.debugInimigoTeclas = {}; // Inicializa o objeto para teclas de debug do inimigo

    // Detecta teclas pressionadas
    window.addEventListener('keydown', (e) => {
        // Log para confirmar o valor de e.key para a barra de espaço
        // if (e.key === ' ') console.log("Movimentação: KeyDown capturado -> Barra de Espaço");
        controle.teclas[e.key] = true;

        // Atalho para Menu de Pause (ESC ou Pause/Break)
        if (e.key === 'Pause' || e.key === 'Break' || e.key === 'Escape' || e.key === 'Esc') {
            if (typeof window.togglePauseMenu === 'function') {
                window.togglePauseMenu();
            } else {
                console.error("Menu: Erro! A função window.togglePauseMenu não foi encontrada.");
            }
        }

        // Atalho de Debug: Ganhar 5 de XP
        if (e.key === '5') {
            if (typeof window.ganharXP === 'function') window.ganharXP(5);
        }

        // Atalho para abrir árvore de habilidades
        if (e.key === '6') {
            // console.log("Comando: Tecla 6 detectada.");
            if (typeof window.toggleSkillMenu === 'function' && !window.isPaused) {
                window.toggleSkillMenu();
            } else if (typeof window.toggleSkillMenu !== 'function') {
                console.error("Erro: A função 'toggleSkillMenu' não foi encontrada. Verifique se o arquivo skills.js foi carregado corretamente.");
            }
        }

        if (e.key === '7' && typeof criarInimigoAleatorio === 'function' && window.plataformas) {
            const coordsArray = Object.keys(window.plataformas);
            const tipoAleatorio = Math.floor(Math.random() * 3); // Sorteia entre 0, 1 e 2
            criarInimigoAleatorio(coordsArray, tipoAleatorio);
        }

        if (e.key === '8') {
            window.debugInimigoTeclas[' '] = true;
        }

        if (e.key === '0') {
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
            botaElemento.style.display = 'none';
            controle.inventario = [];
            // Novas linhas para remover o Jetpack
            controle.temJetpack = false;
            controle.jetpackAtivo = false;
            controle.timerAtivacaoJetpack = 0;
            controle.timerVooRestante = 0;
            controle.cooldownVooJetpack = 0;
            atualizarVisualEscudo();
            if (typeof armaElemento !== 'undefined') {
                armaElemento.style.display = 'none';
            }
        }

        if (e.key === '9' && window.inimigos) {
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];
                droparItensInimigo(inimigo);
                if (typeof window.ganharXP === 'function') window.ganharXP(1);
                if (inimigo.armaElemento) inimigo.armaElemento.remove();
                if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                if (inimigo.botaElemento) inimigo.botaElemento.remove();
                inimigo.elemento.remove();
                window.inimigos.splice(i, 1);
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        controle.teclas[e.key] = false;
        if (e.key === '8') {
            window.debugInimigoTeclas[' '] = false;
        }
    });

    function atualizar() {
        // Lógica da Skill "AirDrop" (Combo: Cima + I)
        const segurandoCima = controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W'];
        const apertouI = controle.teclas['i'] || controle.teclas['I'];

        // Log de teste para debug (remova ou comente após testar)
        if (apertouI) {
            console.log("Teclas detectadas: Cima:", segurandoCima, "| I:", apertouI, "| Skill 'skilla2' possui?", window.playerSkills?.includes('skilla2'), "| Já usado?", controle.airdropUsadoNoNivel);
        }

        // Alterado de 'airdrop' para 'skilla2' para coincidir com o ID no skillsData.json
        if (segurandoCima && apertouI && window.playerSkills?.includes('skilla2') && !controle.airdropUsadoNoNivel) {
            dispararSinalizador();
            controle.airdropUsadoNoNivel = true;
            console.log("Skill AirDrop: Suporte aéreo solicitado!");
            
            // Consome a tecla para evitar que o personagem atire no mesmo frame
            controle.teclas['i'] = false;
            controle.teclas['I'] = false;
        }

        // Lógica da Skill "Vender" (Combo: Baixo + I)
        const segurandoBaixoVenda = controle.teclas['ArrowDown'] || controle.teclas['s'] || controle.teclas['S'];
        const apertouVenda = controle.teclas['i'] || controle.teclas['I'];

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

            // Cria o item flutuante
            const visual = document.createElement('img');
            visual.style = `position: absolute; width: 32px; height: 32px; z-index: 20; image-rendering: pixelated;`;
            if (tipo === 'revolver') visual.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
            else if (tipo === 'escudo') visual.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
            else if (tipo === 'bota') visual.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
            
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
            if (controle.teclas[' ']) {
                // console.log("Venda cancelada pelo pulo!");
                controle.inventario.push(controle.vendaTipo);
                // Devolve os itens logicamente
                if (controle.vendaTipo === 'revolver') { controle.temArma = true; armaElemento.style.display = 'block'; }
                else if (controle.vendaTipo === 'escudo') { controle.temEscudo = true; atualizarVisualEscudo(); }
                else if (controle.vendaTipo === 'bota') { controle.temBota = true; botaElemento.style.display = 'block'; }
                
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

        // Detecta combinação de Drop: S ou Seta Baixo + Pulo
        const segurandoBaixo = controle.teclas['ArrowDown'] || controle.teclas['s'] || controle.teclas['S'];
        
        // Debug de teclas combinadas (Dropar)
        if (segurandoBaixo && controle.teclas[' ']) {
            console.log("Debug: Tentativa de Drop detectada. No chão?", controle.noChao);
        }

        if (segurandoBaixo && controle.teclas[' '] && controle.noChao) {
            controle.teclas[' '] = false; // Consome o pulo para não pular e dropar ao mesmo tempo
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
        if (controle.temBota) {
            velAtiva += Number(config.bonusVelocidadeBota || 2);
        }

        // Movimentação Horizontal
        if (controle.teclas['ArrowLeft'] || controle.teclas['a'] || controle.teclas['A']) {
            controle.x -= velAtiva;
            if (!controle.chutando) controle.direcao = 'e';
            controle.movendoHorizontal = true;
        }
        if (controle.teclas['ArrowRight'] || controle.teclas['d'] || controle.teclas['D']) {
            controle.x += velAtiva;
            if (!controle.chutando) controle.direcao = 'd';
            controle.movendoHorizontal = true;
        }

        // Lógica de Chute (tecla K)
        if ((controle.teclas['k'] || controle.teclas['K']) && controle.cooldownChute === 0) {
            controle.tempoChute = config.tempoChute;
            controle.cooldownChute = config.cooldownChute;

            // Configura o deslocamento suave em vez de teleporte
            const duracaoDash = 10; // O avanço levará 10 frames para completar
            const multiplicadorChute = controle.temBota ? 2 : 1;
            
            controle.framesImpulsoRestante = duracaoDash;
            // Calcula quanto o personagem deve andar por frame durante o dash
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
            controle.x += controle.velocidadeKnockback;
            controle.framesKnockbackRestante--;
        }

        // Lógica de Disparo (tecla I)
        if ((controle.teclas['i'] || controle.teclas['I']) && controle.cooldownTiro === 0 && controle.temArma && controle.municao > 0) {
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
            projElemento.style.zIndex = '10'; // Garante que fique à frente do cenário
            projElemento.style.left = xPartida + 'px';
            projElemento.style.bottom = yPartida + 'px';
            projElemento.style.imageRendering = 'pixelated';
            projElemento.style.pointerEvents = 'none'; // Não interfere com cliques
            elemento.parentElement.appendChild(projElemento);

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

        // Diminui o cooldown do pulo
        if (controle.cooldownPulo > 0) {
            controle.cooldownPulo--;
        }

        // Diminui o cooldown do Jetpack
        if (controle.cooldownVooJetpack > 0) {
            controle.cooldownVooJetpack--;
        }

        const hitboxX = controle.x + config.HITBOX_OFFSET_X;
        const hitboxY = controle.y;
        const hitboxWidth = config.HITBOX_LARGURA;
        const hitboxHeight = config.HITBOX_ALTURA;

        // 1. Colisão Horizontal com as laterais das plataformas
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(hitboxX, hitboxY, hitboxWidth, hitboxHeight, window.plataformas)) {
            controle.x = xAnterior;
        }

        // Calcula a força do pulo final: se tiver a bota, soma o bônus definido nas configurações
        const forcaPuloFinal = controle.temBota 
            ? (config.inimigoForcaPulo + (config.bonusPuloBota || 1.5)) 
            : config.inimigoForcaPulo;

        // Decrementa o timer da janela de clique duplo (timing para a skill Salto)
        if (controle.timerPuloDuplo > 0) controle.timerPuloDuplo--;

        // Decrementa o cooldown do pulo duplo
        if (controle.cooldownPuloDuplo > 0) controle.cooldownPuloDuplo--;

        // Decrementa o cooldown pós Super Descida
        if (controle.cooldownPosSuperDescida > 0) controle.cooldownPosSuperDescida--;

        // Lógica da Skill Passiva "Salto" (skillb2) - Pulo Duplo
        const teclaPuloAtiva = controle.teclas[' '] && controle.cooldownPosSuperDescida === 0;
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
        if (controle.temJetpack) {
            const segurandoCimaAtivacao = controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W'];
            
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
            else if (controle.teclas[' '] && controle.cooldownVooJetpack === 0) {
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
        if (controle.jetpackAtivo) {
            controle.timerVooRestante--;
            controle.framesVoando++;

            if (controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W']) {
                controle.velocidadeY = config.jetpackForcaVoo || 2; // Sobe lentamente
            } else {
                controle.velocidadeY = -1; // Desce lentamente ao soltar as teclas
            }
            controle.y += controle.velocidadeY;

            // Lógica de Desativação 1: Esgotamento de Combustível.
            // Quando o timer zera, o motor desliga forçadamente e entra em estado de recarga (cooldown), ativando o filtro visual vermelho.
            if (controle.timerVooRestante <= 0) {
                controle.jetpackAtivo = false;
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

        // Mecânica de Queda Rápida: Agora restrita apenas após a execução do Pulo Duplo (pulosRealizados === 2)
        if (!controle.noChao && controle.velocidadeY < 0 && controle.teclas[' '] && !controle.usandoParaquedas && controle.pulosRealizados === 2) {
            console.log("Física: Super Descida ativa | VelY:", controle.velocidadeY.toFixed(2));
            controle.velocidadeY = -20; // Regule aqui a velocidade fixa de descida
            controle.superDescidaAtiva = true;
        }

    // Mecânica de Paraquedas: Limita a velocidade de queda para criar o efeito de flutuação
    if (controle.usandoParaquedas && controle.velocidadeY < -1.5) {
        controle.velocidadeY = -1.5; // Impede que o player caia mais rápido que 1.5 pixels por frame
    }

        // Resetamos o estado para ser revalidado pelas colisões verticais abaixo
        controle.noChao = false;

        // 2. Colisão Vertical para cima/baixo contra as plataformas
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(controle.x + config.HITBOX_OFFSET_X, controle.y, hitboxWidth, hitboxHeight, window.plataformas)) {
            
            if (controle.velocidadeY < 0) { // Caindo: toca o topo da plataforma
                controle.noChao = true;
                
                // Se o player pousou usando a Super Descida, aplica o cooldown de 1s (60 frames)
                if (controle.superDescidaAtiva) {
                    controle.cooldownPosSuperDescida = 60;
                    controle.superDescidaAtiva = false;

                    // Aplica stun aos inimigos próximos
                    if (window.inimigos && Array.isArray(window.inimigos)) {
                        window.inimigos.forEach(inimigo => {
                            // Verifica se o inimigo está a 32px do player (considerando o centro do player)
                            // Player largura 32px, inimigo largura 32px.
                            // Distância entre os centros: abs((controle.x + 16) - (inimigo.x + 16))
                            // Se a distância for <= 32, significa que eles estão bem próximos.
                            const distanciaX = Math.abs((controle.x + 16) - (inimigo.x + 16));
                            if (distanciaX <= 32 && inimigo.noChao) {
                                inimigo.stunned = true;
                                inimigo.stunTimer = 120; // 2 segundos de stun (120 frames)
                                console.log(`Inimigo em x:${inimigo.x} atordoado pela Super Descida!`);
                            }
                        });
                    }
                    // Criação do efeito visual de impacto
                    const impacto = document.createElement('img');
                    impacto.src = 'personagem/impacto.png';
                    impacto.style.position = 'absolute';
                    impacto.style.width = '64px'; // Um pouco maior para destaque
                    impacto.style.height = '32px'; // Ajustado para o tamanho real do sprite
                    impacto.style.left = (controle.x - 16) + 'px'; // Centraliza nos pés
                    impacto.style.bottom = controle.y + 'px'; // Alinha com a base do personagem (base do player)
                    impacto.style.zIndex = '11'; // Garante que apareça acima de todos os outros elementos do player
                    impacto.style.imageRendering = 'pixelated';
                    impacto.style.pointerEvents = 'none';
                    impacto.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
                    elemento.parentElement.appendChild(impacto);

                    requestAnimationFrame(() => {
                        impacto.style.transform = 'scale(.2)';
                        impacto.style.opacity = '0';
                    });

                    setTimeout(() => impacto.remove(), 400);
                    console.log("Mecânica: Pouso pesado! Pulo bloqueado por 1s.");
                }

                controle.velocidadeY = 0;
                controle.y = Math.floor((controle.y + 0.1) / 32 + 1) * 32;
            } else if (controle.velocidadeY > 0) { // Subindo: bate a cabeça
                controle.velocidadeY = 0;
                controle.y = Math.floor((controle.y + hitboxHeight) / 32) * 32 - hitboxHeight;
            }
        }

        // Aplica a lógica de colisão com os limites do palco
        const yHitboxAntes = controle.y;
        const posicaoAjustada = limitarPosicaoAoPalco(controle.x + config.HITBOX_OFFSET_X, controle.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
        
        controle.x = posicaoAjustada.x - config.HITBOX_OFFSET_X;
        // Não aplicamos o ajuste automático de Y do limitarPosicaoAoPalco para permitir que o player caia
        // controle.y = posicaoAjustada.y; 

        // Detecta toque no chão: APENAS se houver colisão real com tiles de plataforma
        if (controle.noChao && controle.velocidadeY <= 0) {
            // if (!noChaoAnterior && controle.noChao) console.log("Movimentação: Personagem tocou o chão.");
            controle.velocidadeY = 0;
        }

        // Condição de Game Over por queda (buraco)
        if (controle.y < -64) {
            // Transforma em Skill Passiva: Verifica se o player possui a skill 'skillb1' (Resgate)
            if (window.playerSkills?.includes('skillb1')) {
                console.log("Habilidade Passiva: Resgate Ativado!");
                const larguraPalco = 640;
                const alturaPalco = 480;
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

        if (yHitboxAntes > posicaoAjustada.y) {
            // Bateu no teto
            controle.velocidadeY = 0;
        }

        // Gerencia a animação baseada no estado atual
        if (typeof atualizarAnimacao === 'function') {
            atualizarAnimacao(
                controle, 
                elemento, 
                config.spriteParadoPlayer || spriteParado, 
                config.spriteAndandoPlayer || spriteAndando
            );
        }

        // Sobrescreve o sprite se estiver chutando
        if (controle.chutando) {
            elemento.src = config.spriteChutePlayer || spriteChute;
        }

        // Verifica colisão com o objetivo final
        const hitboxPlayer = { 
            x: controle.x + config.HITBOX_OFFSET_X, 
            y: controle.y, 
            largura: config.HITBOX_LARGURA, 
            altura: config.HITBOX_ALTURA 
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

                // 2. Attackbox (Ativa apenas durante o chute)
                if (controle.chutando) {
                    // Calcula o X da attackbox baseado na direção (espelhamento)
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
                        x: inimigo.x + config.HITBOX_OFFSET_X,
                        y: inimigo.y,
                        largura: config.HITBOX_LARGURA,
                        altura: config.HITBOX_ALTURA
                    };

                    // Só aplica o dano se o inimigo ainda não foi atingido por este chute específico
                    if (!inimigo.foiAtingidoNesteChute && detectarColisaoHitbox(hitboxAtaque, hitboxInimigo, 0, 0, 0)) {
                        inimigo.foiAtingidoNesteChute = true;
                        
                        // Interrompe a coleta de item se levar um golpe
                        inimigo.estaColetando = false;
                        inimigo.timerColeta = 0;

                        inimigo.vida = (inimigo.vida || 0) + 1; // Incrementa a vida do inimigo (dano)

                        // Efeito visual no inimigo ao receber dano por chute
                        if (typeof piscaLeve === 'function') {
                            piscaLeve(inimigo.elemento);
                        }

                        // Knockback: Lança o inimigo para trás com base na direção do jogador
                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        const valorKnockbackInimigo = obterKnockback(config, 'playerChute');
                        const duracaoRecuoInimigo = 15; // Duração do recuo em frames
                        inimigo.framesKnockbackRestante = duracaoRecuoInimigo;
                        inimigo.velocidadeKnockback = (valorKnockbackInimigo / duracaoRecuoInimigo) * direcaoKnockback;

                        // console.log(`Ataque: Inimigo atingido! Vida restante: ${3 - inimigo.vida}`);

                        // Se atingir 3 golpes, o inimigo morre e desaparece
                        if (inimigo.vida >= 3) {
                            // console.log("Ataque: Inimigo derrotado!");
                            droparItensInimigo(inimigo);
                            if (typeof window.ganharXP === 'function') window.ganharXP(1);
                            if (inimigo.armaElemento) inimigo.armaElemento.remove();
                            if (inimigo.botaElemento) inimigo.botaElemento.remove();
                            if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                            if (inimigo.jetpackElemento) inimigo.jetpackElemento.remove();
                            if (inimigo.jetFogoElemento) inimigo.jetFogoElemento.remove();
                            inimigo.elemento.remove();
                            window.inimigos.splice(i, 1);
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
                        const hitboxInimigo = {
                            x: inimigo.x + config.HITBOX_OFFSET_X,
                            y: inimigo.y,
                            largura: config.HITBOX_LARGURA,
                            altura: config.HITBOX_ALTURA
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
                                inimigo.vida = (inimigo.vida || 0) + 1;
                            }

                            // Efeito visual no inimigo ao receber dano
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(inimigo.elemento);
                            }

                            // Knockback: Lança o inimigo para trás com base na direção do projétil
                            inimigo.x += obterKnockback(config, 'playerProjetil') * proj.direcao;

                            // Limita a posição para o inimigo não sair do palco no momento do impacto
                            if (typeof limitarPosicaoAoPalco === 'function') {
                                const posAjustada = limitarPosicaoAoPalco(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
                                inimigo.x = posAjustada.x - config.HITBOX_OFFSET_X;
                            }

                            inimigo.elemento.style.left = inimigo.x + 'px';

                            if (inimigo.vida >= 3) {
                                droparItensInimigo(inimigo);
                                if (typeof window.ganharXP === 'function') window.ganharXP(1);
                                if (inimigo.armaElemento) inimigo.armaElemento.remove();
                                if (inimigo.botaElemento) inimigo.botaElemento.remove();
                                if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                                if (inimigo.jetpackElemento) inimigo.jetpackElemento.remove();
                                if (inimigo.jetFogoElemento) inimigo.jetFogoElemento.remove();
                                inimigo.elemento.remove();
                                window.inimigos.splice(j, 1);
                            }
                            hitAlvo = true;
                            break;
                        }
                    }
                } else if (proj.origem === 'inimigo' && window.playerControle) {
                    const hitboxPlayer = { 
                        x: window.playerControle.x + config.HITBOX_OFFSET_X, 
                        y: window.playerControle.y, 
                        largura: config.HITBOX_LARGURA, 
                        altura: config.HITBOX_ALTURA 
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
                                controle.temEscudo = false;
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

                // Remove o projétil se bater em algo ou sair da tela (limite de 700px)
                if (hitCenario || hitAlvo || proj.x < -50 || proj.x > 700) {
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
                const collisionDetected = detectarColisaoHitbox(hitboxPlayerParaItem, hitboxItem, 0, 0, 0); // Mantém a detecção, apenas remove o log
                // console.log(`[DEBUG ITEM] Collision with ${item.tipo}: ${collisionDetected}`);

                if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxPlayerParaItem, hitboxItem, 0, 0, 0)) {
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
                        console.log("Jogador coletou o jetpack!"); // Adicionado console.log
                        if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack');
                        // Refinamento: Garante que o item coletado venha com carga e pronto para uso
                        controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                        controle.cooldownVooJetpack = 0;
                        jetpackElemento.style.display = 'block';
                        salvarInventario();
                    } else if (item.tipo === 'airdrop') {
                        // Lógica de Recompensa Aleatória baseada no JSON
                        const conteudos = config.airdrop1?.conteudos || ['xp'];
                        const sorteio = conteudos[Math.floor(Math.random() * conteudos.length)];
                        console.log("AirDrop resgatado! Conteúdo: " + sorteio);
                        
                        if (sorteio === 'skillpoint') {
                            window.skillPoints += 1;
                        } else if (sorteio === 'xp') {
                            if (typeof window.ganharXP === 'function') window.ganharXP(6);
                        } else if (sorteio === 'restauracao') {
                            // Restaura todos os equipamentos do jogador
                            controle.municao = config.maxMunicao || 5; 
                            controle.escudoProtegido = 0;
                            controle.escudoVermelho = false;
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
                            const itensDisponiveis = ['revolver', 'escudo', 'bota', 'jetpack']; // Inclui jetpack
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
                            } else if (itemSorteado === 'revolver') { // Tratamento explícito para revolver
                                controle.temArma = true; 
                                controle.municao = config.maxMunicao || 5; 
                                if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver'); // Garante que o item seja adicionado ao inventário
                                armaElemento.style.display = 'block';
                            }
                        }
                        salvarInventario();
                    } else if (item.tipo === 'revolver') { // Este bloco é para coleta de revólver *não* via airdrop
                        // console.log("Jogador coletou o revólver!");
                        controle.temArma = true;
                        controle.municao = item.municao !== undefined ? item.municao : (config.maxMunicao || 5);
                        if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver');
                        armaElemento.style.display = 'block';
                        salvarInventario();
                    }
                    item.elemento.remove();
                    window.itensColetaveis.splice(i, 1);
                    continue; // Pula o processamento de física para este item removido
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

        // Sincroniza a posição da arma com o jogador (mesma lógica do inimigo)
        armaElemento.style.left = controle.x + 'px';
        armaElemento.style.bottom = controle.y + 'px';
        armaElemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        // Atualiza o sprite da arma baseado na munição
        armaElemento.src = (controle.municao <= 0)
            ? (config.spriteArmaVermelha || 'personagem/revolver_vermelho.png')
            : (config.spriteArmaPlayer || 'personagem/revolver.png');

        // Sincroniza a posição do escudo com o jogador
        escudoElemento.style.left = controle.x + 'px';
        escudoElemento.style.bottom = controle.y + 'px';
        escudoElemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        // Sincroniza a posição e sprite da bota
        if (controle.temBota) {
            botaElemento.style.left = controle.x + 'px';
            botaElemento.style.bottom = controle.y + 'px';
            // Garante que o espelhamento (lado para o qual olha) seja idêntico ao do personagem
            botaElemento.style.transform = elemento.style.transform;
            
            // Melhoria da lógica de animação: a bota deve seguir o frame exato do personagem
            if (controle.chutando) {
                botaElemento.src = config.spriteBotaChutando || 'personagem/bota_chutando.png';
            } else if (!controle.noChao) {
                // Se estiver no ar, usa o sprite parado
                botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
            } else if (controle.movendoHorizontal) {
                // Se estiver andando no chão, sincroniza com o frameAtual (1 é o frame de caminhada)
                botaElemento.src = (controle.frameAtual === 1)
                    ? (config.spriteBotaAndando || 'personagem/bota_andando.png')
                    : (config.spriteBotaParado || 'personagem/bota_parado.png');
            } else {
                // Totalmente parado
                botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
            }
        }

        // Sincroniza a posição e visibilidade do Jetpack e do Fogo
        if (controle.temJetpack) {
            jetpackElemento.style.display = 'block';
            jetpackElemento.style.left = controle.x + 'px';
            jetpackElemento.style.bottom = controle.y + 'px';
            jetpackElemento.style.transform = elemento.style.transform;

            // Indicação visual de recarga: Aplica um filtro CSS de cor vermelha para sinalizar que o Jetpack está em tempo de espera (cooldown) e indisponível para uso.
            if (controle.cooldownVooJetpack > 0) {
                jetpackElemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
            } else {
                jetpackElemento.style.filter = 'none';
            }

            // Lógica do Fogo: aparece apenas quando voando e subindo com efeito de cintilação (piscar)
            const subindo = (controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W']);
            const efeitoPisca = (controle.timerVooRestante % 4 < 2); // Alterna visibilidade a cada 2 frames (rápido)
            const tremorFogo = (Math.random() * 3) - 1.5; // Pequeno tremor vertical para as chamas

            if (controle.jetpackAtivo && subindo && efeitoPisca) {
                jetFogoElemento.style.display = 'block';
                jetFogoElemento.style.left = controle.x + 'px';
                jetFogoElemento.style.bottom = (controle.y - 4 + tremorFogo) + 'px'; // Ajuste com tremor
                jetFogoElemento.style.transform = elemento.style.transform;
            } else {
                jetFogoElemento.style.display = 'none';
            }
        } else {
            jetpackElemento.style.display = 'none';
            jetFogoElemento.style.display = 'none';
        }

        // Sincroniza a posição e visibilidade do Paraquedas
        if (controle.usandoParaquedas) {
            // Segurança: Re-anexa ao palco caso o limpador de cenário o tenha removido
            if (!document.getElementById('player-parachute') && elemento.parentElement) {
                elemento.parentElement.appendChild(paraquedasElemento);
            }

            paraquedasElemento.style.display = 'block';
            paraquedasElemento.style.left = controle.x + 'px';
            paraquedasElemento.style.bottom = (controle.y + 32) + 'px';
            console.log(`Paraquedas: Active. Player Y: ${controle.y}, Parachute Bottom: ${controle.y + 32}, Parachute Left: ${controle.x}. Display: ${paraquedasElemento.style.display}`);
            
            // Segue o espelhamento (direção) do personagem
            paraquedasElemento.style.transform = elemento.style.transform;

            // O paraquedas some assim que o jogador toca o chão (plataforma)
            if (controle.noChao) {
                console.log("Mecânica: Player pousou. Removendo paraquedas.");
                controle.usandoParaquedas = false;
                paraquedasElemento.style.display = 'none';
            }
        } else {
            if (paraquedasElemento.style.display !== 'none') {
                paraquedasElemento.style.display = 'none';
                console.log("Paraquedas: Inactive. Display set to none.");
            }
        }

        requestAnimationFrame(atualizar);
    }

    // Inicia o loop de atualização
    requestAnimationFrame(atualizar);
}