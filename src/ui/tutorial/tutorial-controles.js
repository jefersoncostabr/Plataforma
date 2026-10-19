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
    let mensagensAtivas = new Map();
    let tutoriaisItensExibidos = new Set();
    let tutoriaisFaseExibidos = new Set();
    let progressoMensagensFase = new Map();

    function ehTutorialInformativo(tutorial) {
        return Object.prototype.hasOwnProperty.call(tutorial, 'pegarItem')
            || Object.prototype.hasOwnProperty.call(tutorial, 'msg');
    }

    function ehTutorialDeControle(tutorial) {
        return !ehTutorialInformativo(tutorial);
    }

    function normalizarTipoItem(tipo) {
        const normalizado = String(tipo || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        return normalizado === 'municao_plus' ? 'municao' : normalizado;
    }

    function normalizarEscopoFase(valor) {
        const texto = String(valor ?? '').trim();
        if (!texto) return null;
        const numero = Number(texto);
        return Number.isInteger(numero) && numero >= 1 ? numero : null;
    }

    function correspondeAoEscopo(tutorial, faseAtual) {
        return (tutorial.nivel === null || tutorial.nivel === faseAtual.nivel)
            && (tutorial.fase === null || tutorial.fase === faseAtual.fase);
    }

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
            if (!ehTutorialDeControle(tutorial) || !tutorial.ativo || !tutoriaisAtivados.has(tutorial.id)
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

        mensagensAtivas.forEach(({ elemento }) => raiz.appendChild(elemento));

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

        const posicao = window.gridParaPixels(coordenada);
        const tamanhoBloco = 32;
        const mundoLargura = Number(window.mundoLargura || palco.offsetWidth || 0);
        const mundoAltura = Number(window.mundoAltura || palco.offsetHeight || 0);
        const esquerdaBloco = Number(posicao.x || 0);
        const baseBloco = Number(posicao.y || 0);
        if (esquerdaBloco < 0 || esquerdaBloco + tamanhoBloco > mundoLargura
            || baseBloco < 0 || baseBloco + tamanhoBloco > mundoAltura) return false;

        const zoom = Math.max(0.01, Number(window.cameraZoomFactor || 1));
        const larguraViewport = Number(window.VIEWPORT?.width || 640) / zoom;
        const alturaViewport = Number(window.VIEWPORT?.height || 480) / zoom;
        const esquerdaViewport = Number(window.cameraX || 0);
        const topoViewport = Number(window.cameraY || 0);
        const topoBloco = mundoAltura - Number(posicao.y || 0) - tamanhoBloco;

        return esquerdaBloco + tamanhoBloco > esquerdaViewport
            && esquerdaBloco < esquerdaViewport + larguraViewport
            && topoBloco + tamanhoBloco > topoViewport
            && topoBloco < topoViewport + alturaViewport;
    }

    function atualizarDisponibilidade() {
        if (!sessaoIniciada || !configuracao) return;
        const faseAtual = obterFaseAtual();
        let alterouTutoriais = false;

        configuracao.tutoriais.forEach((tutorial) => {
            if (tutorial.aoEntrarFase && tutorial.ativo
                && !tutoriaisFaseExibidos.has(tutorial.id)
                && correspondeAoEscopo(tutorial, faseAtual)) {
                tutoriaisFaseExibidos.add(tutorial.id);
                const exigeAcoes = Number(tutorial.repeticoesNecessarias) > 0;
                mostrarMensagem(tutorial.msg, tutorial.duracaoMs, {
                    id: tutorial.id,
                    persistente: exigeAcoes
                });
                if (exigeAcoes) progressoMensagensFase.set(tutorial.id, 0);
            }
            if (!ehTutorialDeControle(tutorial) || !tutorial.ativo || tutoriaisAtivados.has(tutorial.id)
                || (progresso.get(tutorial.id) || 0) >= tutorial.repeticoesNecessarias) return;
            if (tutorial.nivel === null || tutorial.fase === null
                || tutorial.nivel !== faseAtual.nivel || tutorial.fase !== faseAtual.fase) return;
            if (!blocoEstaVisivel(tutorial.blocoVisivel)) return;

            tutoriaisAtivados.add(tutorial.id);
            alterouTutoriais = true;
        });

        if (alterouTutoriais) renderizar();
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
                    const nivel = normalizarEscopoFase(item?.nivel);
                    const fase = normalizarEscopoFase(item?.fase);
                    if (!id || ids.has(id)) return false;

                    if (ehTutorialInformativo(item)) {
                        const pegarItem = String(item?.pegarItem || '').trim().toLowerCase();
                        const msg = String(item?.msg || '').trim();
                        if ((!pegarItem && item?.aoEntrarFase !== true) || !msg) return false;
                        if (item?.aoEntrarFase === true) {
                            const repeticoes = Number(item?.repeticoesNecessarias);
                            const acaoId = String(item?.acaoId || '').trim().toLowerCase();
                            if ((item.repeticoesNecessarias !== undefined || item.acaoId !== undefined)
                                && (!acaoId || !Number.isFinite(repeticoes) || repeticoes < 1)) return false;
                            if (acaoId) item.acaoId = acaoId;
                            if (Number.isFinite(repeticoes) && repeticoes >= 1) {
                                item.repeticoesNecessarias = Math.floor(repeticoes);
                            }
                        }
                        if (pegarItem) item.pegarItem = pegarItem;
                        item.msg = msg;
                        const duracao = Number(item.duracaoMs);
                        item.duracaoMs = Number.isFinite(duracao) && duracao > 0 ? duracao : 6000;
                    } else {
                        if (nivel === null || fase === null) return false;
                        const repeticoes = Number(item?.repeticoesNecessarias);
                        const blocoVisivel = String(item?.blocoVisivel || '').trim().toLowerCase();
                        const acaoId = String(item?.acaoId || item?.id || '').trim().toLowerCase();
                        if (!String(item?.acao || '').trim()
                            || !Number.isFinite(repeticoes) || repeticoes < 1
                            || !/^[a-z]+\d+$/.test(blocoVisivel)
                            || !acaoId) return false;
                        item.blocoVisivel = blocoVisivel;
                        item.repeticoesNecessarias = Math.floor(repeticoes);
                        item.acaoId = acaoId;
                    }

                    ids.add(id);
                    item.id = id;
                    item.nivel = nivel;
                    item.fase = fase;
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
        mensagensAtivas.forEach(({ timeout }) => clearTimeout(timeout));
        mensagensAtivas = new Map();
        tutoriaisItensExibidos = new Set();
        tutoriaisFaseExibidos = new Set();
        progressoMensagensFase = new Map();
        progresso = new Map(dados.tutoriais
            .filter(ehTutorialDeControle)
            .map((tutorial) => [tutorial.id, 0]));
        tutoriaisAtivados = new Set();
        sessaoIniciada = true;
        renderizar();
        atualizarDisponibilidade();
        if (intervaloVisibilidade !== null) clearInterval(intervaloVisibilidade);
        intervaloVisibilidade = setInterval(atualizarDisponibilidade, 200);
    }

    function registrarAcao(id) {
        if (!sessaoIniciada || !configuracao) return;
        const acaoNormalizada = String(id || '').trim().toLowerCase();
        let alterouProgresso = false;

        configuracao.tutoriais.forEach((tutorial) => {
            if (tutorial.aoEntrarFase !== true || !tutorial.ativo
                || tutorial.acaoId !== acaoNormalizada
                || !Number.isFinite(tutorial.repeticoesNecessarias)
                || !mensagensAtivas.has(tutorial.id)) return;

            const progressoAtual = (progressoMensagensFase.get(tutorial.id) || 0) + 1;
            progressoMensagensFase.set(tutorial.id, progressoAtual);
            if (progressoAtual < tutorial.repeticoesNecessarias) return;

            const mensagem = mensagensAtivas.get(tutorial.id);
            if (mensagem?.timeout) clearTimeout(mensagem.timeout);
            mensagem?.elemento?.remove();
            mensagensAtivas.delete(tutorial.id);
            alterouProgresso = true;
        });

        configuracao.tutoriais.forEach((tutorial) => {
            if (
                ehTutorialDeControle(tutorial)
                && tutorial.acaoId === acaoNormalizada
                && tutorial.ativo
                && tutoriaisAtivados.has(tutorial.id)
            ) {
                const atual = progresso.get(tutorial.id) || 0;
                if (atual >= tutorial.repeticoesNecessarias) return;
                progresso.set(tutorial.id, atual + 1);
                alterouProgresso = true;
            }
        });

        if (alterouProgresso) renderizar();
    }

    function registrarItemColetado(tipoItem) {
        if (!sessaoIniciada || !configuracao || !tipoItem) return;
        const tipoNormalizado = normalizarTipoItem(tipoItem);
        const faseAtual = obterFaseAtual();

        configuracao.tutoriais.forEach((tutorial) => {
            if (!ehTutorialInformativo(tutorial) || !tutorial.ativo
                || !tutorial.pegarItem
                || tutoriaisItensExibidos.has(tutorial.id)
                || normalizarTipoItem(tutorial.pegarItem) !== tipoNormalizado
                || !correspondeAoEscopo(tutorial, faseAtual)) return;

            tutoriaisItensExibidos.add(tutorial.id);
            const raiz = obterContainer();
            if (!raiz) return;

            const elemento = document.createElement('div');
            elemento.className = 'tutorial-controles-linha tutorial-controles-mensagem';
            elemento.dataset.tutorialId = tutorial.id;
            elemento.textContent = tutorial.msg;
            mensagensAtivas.set(tutorial.id, { elemento, timeout: null });

            const timeout = setTimeout(() => {
                mensagensAtivas.delete(tutorial.id);
                elemento.remove();
                sincronizarVisibilidade();
            }, tutorial.duracaoMs);
            mensagensAtivas.get(tutorial.id).timeout = timeout;

            renderizar();
        });
    }

    function mostrarMensagem(msg, duracaoMs = 6000, opcoes = {}) {
        const texto = String(msg || '').trim();
        const raiz = obterContainer();
        if (!texto || !raiz) return;

        const id = String(opcoes.id || `mensagem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const elemento = document.createElement('div');
        elemento.className = 'tutorial-controles-linha tutorial-controles-mensagem';
        elemento.dataset.tutorialId = id;
        elemento.textContent = texto;
        mensagensAtivas.set(id, { elemento, timeout: null });

        if (opcoes.persistente) {
            renderizar();
            return;
        }

        const duracao = Number(duracaoMs);
        const timeout = setTimeout(() => {
            mensagensAtivas.delete(id);
            elemento.remove();
            sincronizarVisibilidade();
        }, Number.isFinite(duracao) && duracao > 0 ? duracao : 6000);
        mensagensAtivas.get(id).timeout = timeout;

        renderizar();
    }

    function atualizarTeclas() {
        if (sessaoIniciada) renderizar();
    }

    window.TutorialControles = {
        iniciarSessao,
        registrarAcao,
        registrarItemColetado,
        mostrarMensagem,
        atualizarTeclas,
        sincronizarVisibilidade
    };
})();
