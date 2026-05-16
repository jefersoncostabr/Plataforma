(function () {
    const CONTROLES_STORAGE_KEY = 'plataformaControles';
    const CONTROLES_PADRAO = {
        esquerda: ['ArrowLeft', 'a', 'A'],
        direita: ['ArrowRight', 'd', 'D'],
        cima: ['ArrowUp', 'w', 'W'],
        baixo: ['ArrowDown', 's', 'S'],
        pulo: [' '],
        chute: ['k', 'K'],
        tiro: ['i', 'I'],
        garra: ['j', 'J'],
        cinto: ['l', 'L'],
        airdrop: ['u', 'U'],
        debugImpacto: ['h', 'H'],
        mochila: ['Enter'],
        interagir: ['e', 'E'],
        abertura: ['y', 'Y'],
        troca_pet: ['q', 'Q']
    };

    function normalizarControles(raw) {
        const base = { ...CONTROLES_PADRAO };
        if (!raw || typeof raw !== 'object') return base;

        Object.keys(raw).forEach((acao) => {
            const valor = raw[acao];
            if (Array.isArray(valor) && valor.length > 0) {
                base[acao] = valor.map(v => String(v));
            } else if (typeof valor === 'object' && valor !== null) {
                // ...
            }
        });

        return base;
    }

    async function carregarControles() {
        let doArquivo = {};
        try {
            const resp = await fetch('../../config/controles.json');
            if (resp.ok) doArquivo = await resp.json();
        } catch (_) {
            doArquivo = {};
        }

        let doStorage = {};
        try {
            const raw = localStorage.getItem(CONTROLES_STORAGE_KEY);
            if (raw) doStorage = JSON.parse(raw);
        } catch (_) {
            doStorage = {};
        }

        window.controlesConfig = normalizarControles({ ...doArquivo, ...doStorage });
        return window.controlesConfig;
    }

    function getBinds(acao) {
        const cfg = window.controlesConfig || CONTROLES_PADRAO;
        const binds = cfg[acao];
        return Array.isArray(binds) ? binds : [];
    }

    function teclaEhAcao(tecla, acao) {
        if (!tecla) return false;
        const key = String(tecla);
        return getBinds(acao).some(k => key === k || key.toLowerCase() === String(k).toLowerCase());
    }

    function acaoAtiva(controle, acao) {
        if (!controle?.teclas) return false;
        // Discretas (teclado)
        if (controle.acoesDiscretas?.[acao]) return true;
        // Teclado
        const tecladoAtivo = getBinds(acao).some(k => {
            const key = String(k);
            return !!(controle.teclas[key] || controle.teclas[key.toLowerCase()] || controle.teclas[key.toUpperCase()]);
        });
        if (tecladoAtivo) return true;
        // ...
        return false;
    }

    function consumirAcao(controle, acao) {
        if (!controle?.teclas) return;
        
        // Limpar estado discreto (teclado)
        if (controle.acoesDiscretas) {
            controle.acoesDiscretas[acao] = false;
        }

        // Limpar todas as variações de teclas do teclado
        getBinds(acao).forEach((k) => {
            const key = String(k);
            controle.teclas[key] = false;
            controle.teclas[key.toLowerCase()] = false;
            controle.teclas[key.toUpperCase()] = false;
        });
        
        // ...
    }

    function criarSistemaControlesJogador(opcoes = {}) {
        const { controle, callbacks = {} } = opcoes;
        if (!controle) throw new Error('Controle do jogador é obrigatório para inicializar os controles.');

        window.debugInimigoTeclas = window.debugInimigoTeclas || {};

        const handleKeyDown = (e) => {
            // Bloqueia comandos se o jogo está pausado, exceto teclas de menu/pause
            const ehTeclaMenu = e.key === '6' || e.key === 'Escape' || e.key === 'Esc' || 
                                e.key === 'Pause' || teclaEhAcao(e.key, 'mochila');
            
            if (window.isPaused && !ehTeclaMenu) return;

            // Se a tecla for Escape, permite que ela seja processada mais abaixo para fechar menus.
            // Outras teclas são redirecionadas ou bloqueadas se um menu estiver aberto.
            const isEscapeKey = (e.key === 'Escape' || e.key === 'Esc');

            // Se algum menu estiver aberto, redirecionamos as teclas WASD/Ação para as setas.
            // Isso permite que o menu navegue mesmo que tenha sido programado apenas para as setas físicas.
            if (window.isInteractionMenuOpen || window.isMochilaMenuOpen || window.isSkillMenuOpen || window.isMenuOpen) {
                let seta = null;
                let code = 0;
                if (teclaEhAcao(e.key, 'cima')) { seta = 'ArrowUp'; code = 38; }
                else if (teclaEhAcao(e.key, 'baixo')) { seta = 'ArrowDown'; code = 40; }
                else if (teclaEhAcao(e.key, 'esquerda')) { seta = 'ArrowLeft'; code = 37; }
                else if (teclaEhAcao(e.key, 'direita')) { seta = 'ArrowRight'; code = 39; }

                if (seta && !e.key.startsWith('Arrow')) {
                    window.dispatchEvent(new KeyboardEvent('keydown', { 
                        key: seta, 
                        keyCode: code, 
                        which: code, 
                        bubbles: true 
                    }));
                    return;
                }
                // Se um menu está aberto e não é uma tecla de navegação redirecionada,
                // e não é a tecla Escape, então bloqueia o processamento adicional.
                if (!isEscapeKey) return;
            }

                        // Debug: Próxima Fase
                        if (!e.repeat && typeof window.proximoNivel === 'function' && teclaEhAcao(e.key, 'debugProximoNivel')) {
                            window.proximoNivel();
                            return;
                        }
            const teclaAbertura = teclaEhAcao(e.key, 'abertura');
            if (teclaAbertura && e.repeat) {
                return;
            }

            controle.teclas[e.key] = !teclaAbertura;
            controle.acoesDiscretas = controle.acoesDiscretas || {};

            if (teclaAbertura) {
                controle.acoesDiscretas.abertura = true;
            }

            if (!e.repeat && teclaEhAcao(e.key, 'interagir')) {
                controle.acoesDiscretas.interagir = true;
            }

            if (!e.repeat && window.temSkill?.((window.SKILLS || {}).DASH)) {
                const apertouEsquerda = teclaEhAcao(e.key, 'esquerda');
                const apertouDireita = teclaEhAcao(e.key, 'direita');

                if (apertouEsquerda || apertouDireita) {
                    const direcaoDash = apertouEsquerda ? 'e' : 'd';
                    const agora = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                        ? performance.now()
                        : Date.now();

                    controle.ultimoToqueDash = controle.ultimoToqueDash || { e: 0, d: 0 };
                    const ultimaBatida = Number(controle.ultimoToqueDash[direcaoDash] || 0);
                    const janelaDash = Number(controle.janelaDuploToqueDash ?? 250);
                    controle.ultimoToqueDash[direcaoDash] = agora;

                    const podeSolicitarDash = !window.isPaused
                        && !window.isMenuOpen
                        && !window.isSkillMenuOpen
                        && !window.isMochilaMenuOpen
                        && !controle.estaAgachado
                        && !controle.stunned
                        && !controle.vendaEmCurso
                        && (controle.cooldownDash || 0) === 0
                        && (agora - ultimaBatida) > 0
                        && (agora - ultimaBatida) <= janelaDash;

                    if (podeSolicitarDash) {
                        controle.dashSolicitado = direcaoDash;
                    }
                }
            }

            if (!e.repeat) {
                const apertouBaixo = teclaEhAcao(e.key, 'baixo');
                const apertouCima = teclaEhAcao(e.key, 'cima');

                if (apertouBaixo) {
                    callbacks.onAgachar?.();
                } else if (apertouCima) {
                    callbacks.onLevantar?.();
                }
            }

            if (e.key === 'Pause' || e.key === 'Break' || e.key === 'Escape' || e.key === 'Esc') {
                // Prioridade: se menus de interação (base) estiverem abertos, não aciona o toggle do pause aqui.
                // Isso evita conflitos com os tratadores internos desses menus.
                if (window.isInteractionMenuOpen) return;

                if (window.isMochilaMenuOpen) {
                    callbacks.onToggleMochila?.();
                } else {
                    callbacks.onTogglePauseMenu?.();
                }
            }

            if (e.key === '2') {
                console.log("[DEBUG] Tecla 2 detectada: Executando limpeza total de equipamentos e base.");
                callbacks.onDebugApagarEquipamento?.();
            }

            if (e.key === '3') {
                console.log("[DEBUG] Tecla 3 detectada: Concedendo XP ao jogador.");
                callbacks.onGanharXP?.(10);
            }

            if (e.key === '6') {
                callbacks.onToggleSkillMenu?.();
            }

            if (e.key === '7') {
                callbacks.onDebugResetSkills?.();
            }

            if (e.key === '8') {
                window.debugInimigoTeclas[' '] = true;
            }

            if (teclaEhAcao(e.key, 'garra')) {
                callbacks.onAcionarGarra?.();
            }

            if (!e.repeat && teclaEhAcao(e.key, 'cinto')) {
                callbacks.onAlternarCinto?.();
            }

            if (!e.repeat && teclaEhAcao(e.key, 'mochila') && !window.isMochilaMenuOpen) {
                callbacks.onToggleMochila?.();
            }

            if (e.key === '0') {
                callbacks.onDebugReset?.();
            }

            if (e.key === '9') {
                callbacks.onEliminarInimigos?.();
            }
        };

        const handleKeyUp = (e) => {
            controle.teclas[e.key] = false;
            if (e.key === '8') {
                window.debugInimigoTeclas[' '] = false;
            }
        };

        const api = {
            async inicializar() {
                await carregarControles();

                // ...

                const handlersAtuais = window.__playerControlsHandlers;
                if (handlersAtuais?.keydown) window.removeEventListener('keydown', handlersAtuais.keydown);
                if (handlersAtuais?.keyup) window.removeEventListener('keyup', handlersAtuais.keyup);

                window.addEventListener('keydown', handleKeyDown);
                window.addEventListener('keyup', handleKeyUp);
                window.__playerControlsHandlers = { keydown: handleKeyDown, keyup: handleKeyUp };
                return api;
            },
            getBinds,
            teclaEhAcao,
            acaoAtiva: (acao) => acaoAtiva(controle, acao),
            consumirAcao: (acao) => consumirAcao(controle, acao),
            destruir() {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                if (window.__playerControlsHandlers?.keydown === handleKeyDown) {
                    delete window.__playerControlsHandlers;
                }
            }
        };

        return api;
    }

    window.criarSistemaControlesJogador = criarSistemaControlesJogador;
})();
