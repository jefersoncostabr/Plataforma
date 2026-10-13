(function () {
    const CONFIG_PATH = 'config/tutorial/controles.json';
    const TECLAS_CONTROLE = {
        ' ': 'ESPAÇO',
        Space: 'ESPAÇO',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
        Enter: 'ENTER',
        Escape: 'ESC'
    };

    let container = null;
    let configuracao = null;
    let progresso = new Map();
    let tutoriaisAtivados = new Set();
    let inicializacaoEmCurso = null;
    let sessaoIniciada = false;
    let intervaloVisibilidade = null;

    function obterLegendaTecla(tutorial) {
        const binds = window.controlesConfig?.[tutorial.id];
        const bind = Array.isArray(binds) && binds.length ? String(binds[0]) : tutorial.teclaPadrao;
        return TECLAS_CONTROLE[bind] || String(bind || tutorial.teclaPadrao || '').toUpperCase();
    }

    function obterContainer() {
        const jogo = document.getElementById('jogo-container');
        if (!jogo) return null;

        if (!container || !container.isConnected) {
            container = document.createElement('div');
            container.id = 'tutorial-controles';
            container.className = 'tutorial-controles';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-label', 'Dicas de controles');
            jogo.appendChild(container);
        }

        return container;
    }

    function renderizar() {
        const raiz = obterContainer();
        if (!raiz || !configuracao) return;

        raiz.replaceChildren();

        configuracao.tutoriais.forEach((tutorial) => {
            if (!tutorial.ativo || !tutoriaisAtivados.has(tutorial.id)
                || (progresso.get(tutorial.id) || 0) >= tutorial.repeticoesNecessarias) return;

            const item = document.createElement('div');
            item.className = 'tutorial-controles-linha';
            item.dataset.tutorialId = tutorial.id;

            const tecla = document.createElement('span');
            tecla.className = 'tutorial-controles-tecla';
            tecla.textContent = obterLegendaTecla(tutorial);

            const seta = document.createElement('span');
            seta.className = 'tutorial-controles-seta';
            seta.setAttribute('aria-hidden', 'true');
            seta.textContent = '→';

            const acao = document.createElement('span');
            acao.className = 'tutorial-controles-acao';
            acao.textContent = tutorial.acao;

            item.append(tecla, seta, acao);
            raiz.appendChild(item);
        });

        sincronizarVisibilidade();
    }

    function obterFaseAtual() {
        const caminho = String(
            window.faseAtualPathRelativo || window.niveis?.[window.nivelAtual] || window.faseAtualNome || ''
        ).replace(/\\/g, '/');
        const nivel = caminho.match(/(?:^|\/)nivel_(\d+)(?:\/|$)/i);
        const fase = caminho.match(/(?:^|\/)fase(\d+)\.json$/i);
        return {
            nivel: nivel ? Number(nivel[1]) : null,
            fase: fase ? Number(fase[1]) : null
        };
    }

    function blocoEstaVisivel(coordenada) {
        if (typeof window.gridParaPixels !== 'function') return false;

        const palco = document.getElementById('game-stage');
        if (!palco) return false;

        const fase = window.faseAtualData || {};
        const blocoExisteNaFase = Object.entries(fase).some(([chave, entradas]) =>
            chave.toLowerCase().startsWith('plataformas')
            && Array.isArray(entradas)
            && entradas.some((entrada) => {
                const coord = typeof entrada === 'string' ? entrada : entrada?.coord;
                return String(coord || '').trim().toLowerCase() === coordenada;
            })
        );
        if (!blocoExisteNaFase) return false;

        const posicao = window.gridParaPixels(coordenada);
        const tamanhoBloco = 32;
        const mundoAltura = Number(window.mundoAltura || palco.offsetHeight || 0);
        const zoom = Math.max(0.01, Number(window.cameraZoomFactor || 1));
        const larguraViewport = Number(window.VIEWPORT?.width || 640) / zoom;
        const alturaViewport = Number(window.VIEWPORT?.height || 480) / zoom;
        const esquerdaViewport = Number(window.cameraX || 0);
        const topoViewport = Number(window.cameraY || 0);
        const esquerdaBloco = Number(posicao.x || 0);
        const topoBloco = mundoAltura - Number(posicao.y || 0) - tamanhoBloco;

        return esquerdaBloco + tamanhoBloco > esquerdaViewport
            && esquerdaBloco < esquerdaViewport + larguraViewport
            && topoBloco + tamanhoBloco > topoViewport
            && topoBloco < topoViewport + alturaViewport;
    }

    function atualizarDisponibilidade() {
        if (!sessaoIniciada || !configuracao) return;
        const faseAtual = obterFaseAtual();
        let ativouTutorial = false;

        configuracao.tutoriais.forEach((tutorial) => {
            if (!tutorial.ativo || tutoriaisAtivados.has(tutorial.id)
                || (progresso.get(tutorial.id) || 0) >= tutorial.repeticoesNecessarias) return;
            if (tutorial.nivel !== faseAtual.nivel || tutorial.fase !== faseAtual.fase) return;
            if (!blocoEstaVisivel(tutorial.blocoVisivel)) return;

            tutoriaisAtivados.add(tutorial.id);
            ativouTutorial = true;
        });

        if (ativouTutorial) renderizar();
    }

    function sincronizarVisibilidade() {
        if (!container) return;
        const algumMenuAberto = !!(
            window.isPaused || window.isMenuOpen || window.isSkillMenuOpen ||
            window.isMochilaMenuOpen || window.isInteractionMenuOpen
        );
        container.hidden = !sessaoIniciada || algumMenuAberto || !container.childElementCount;
    }

    async function carregarConfiguracao() {
        if (configuracao) return configuracao;
        if (inicializacaoEmCurso) return inicializacaoEmCurso;

        inicializacaoEmCurso = fetch(CONFIG_PATH, { cache: 'no-store' })
            .then((resposta) => {
                if (!resposta.ok) throw new Error(`Não foi possível carregar ${CONFIG_PATH} (${resposta.status}).`);
                return resposta.json();
            })
            .then((dados) => {
                const tutoriais = Array.isArray(dados?.tutoriais) ? dados.tutoriais : [];
                const ids = new Set();
                const validos = tutoriais.filter((item) => {
                    const id = String(item?.id || '').trim();
                    const repeticoes = Number(item?.repeticoesNecessarias);
                    const nivel = Number(item?.nivel);
                    const fase = Number(item?.fase);
                    const blocoVisivel = String(item?.blocoVisivel || '').trim().toLowerCase();
                    if (!id || ids.has(id) || !String(item?.acao || '').trim()
                        || !Number.isFinite(repeticoes) || repeticoes < 1
                        || !Number.isInteger(nivel) || nivel < 1
                        || !Number.isInteger(fase) || fase < 1
                        || !/^[a-z]+\d+$/.test(blocoVisivel)) return false;
                    ids.add(id);
                    item.id = id;
                    item.nivel = nivel;
                    item.fase = fase;
                    item.blocoVisivel = blocoVisivel;
                    item.repeticoesNecessarias = Math.floor(repeticoes);
                    item.ativo = item.ativo !== false;
                    return true;
                });

                configuracao = { tutoriais: validos };
                return configuracao;
            })
            .catch((erro) => {
                console.warn('[Tutorial] Instruções desativadas:', erro);
                configuracao = { tutoriais: [] };
                return configuracao;
            })
            .finally(() => {
                inicializacaoEmCurso = null;
            });

        return inicializacaoEmCurso;
    }

    async function iniciarSessao() {
        const dados = await carregarConfiguracao();
        progresso = new Map(dados.tutoriais.map((tutorial) => [tutorial.id, 0]));
        tutoriaisAtivados = new Set();
        sessaoIniciada = true;
        renderizar();
        atualizarDisponibilidade();
        if (intervaloVisibilidade !== null) clearInterval(intervaloVisibilidade);
        intervaloVisibilidade = setInterval(atualizarDisponibilidade, 200);
    }

    function registrarAcao(id) {
        if (!sessaoIniciada || !configuracao) return;
        const tutorial = configuracao.tutoriais.find((item) => item.id === id && item.ativo);
        if (!tutorial || !tutoriaisAtivados.has(id)) return;

        const atual = progresso.get(id) || 0;
        if (atual >= tutorial.repeticoesNecessarias) return;

        progresso.set(id, atual + 1);
        renderizar();
    }

    function atualizarTeclas() {
        if (sessaoIniciada) renderizar();
    }

    window.TutorialControles = {
        iniciarSessao,
        registrarAcao,
        atualizarTeclas,
        sincronizarVisibilidade
    };
})();
