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
        mochila: ['Enter']
    };

    function normalizarControles(raw) {
        const base = { ...CONTROLES_PADRAO };
        if (!raw || typeof raw !== 'object') return base;

        Object.keys(base).forEach((acao) => {
            const valor = raw[acao];
            if (Array.isArray(valor) && valor.length > 0) {
                base[acao] = valor.map(v => String(v));
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
        return getBinds(acao).some(k => {
            const key = String(k);
            return !!(controle.teclas[key] || controle.teclas[key.toLowerCase()] || controle.teclas[key.toUpperCase()]);
        });
    }

    function consumirAcao(controle, acao) {
        if (!controle?.teclas) return;
        getBinds(acao).forEach((k) => {
            const key = String(k);
            controle.teclas[key] = false;
            controle.teclas[key.toLowerCase()] = false;
            controle.teclas[key.toUpperCase()] = false;
        });
    }

    function criarSistemaControlesJogador(opcoes = {}) {
        const { controle, callbacks = {} } = opcoes;
        if (!controle) throw new Error('Controle do jogador é obrigatório para inicializar os controles.');

        window.debugInimigoTeclas = window.debugInimigoTeclas || {};

        const handleKeyDown = (e) => {
            controle.teclas[e.key] = true;

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
                if (window.isMochilaMenuOpen) {
                    callbacks.onToggleMochila?.();
                } else {
                    callbacks.onTogglePauseMenu?.();
                }
            }

            if (e.key === '5') {
                callbacks.onGanharXP?.(5);
            }

            if (e.key === '6') {
                callbacks.onToggleSkillMenu?.();
            }

            if (e.key === '7') {
                callbacks.onCriarInimigoAleatorio?.();
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
                callbacks.onResetDebug?.();
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
