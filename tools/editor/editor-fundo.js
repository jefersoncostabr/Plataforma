(function () {
    const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
    const PHASES_BASE_PATH = '../../config/fases/';
    const PHASE_DISCOVERY_CANDIDATES = [
        'treino.json',
        ...Array.from({ length: 50 }, (_, i) => `nivel_1/fase${i + 1}.json`),
        ...Array.from({ length: 50 }, (_, i) => `nivel_2/fase${i + 1}.json`)
    ];

    const stage = document.getElementById('game-stage');
    const stageArea = document.getElementById('stage-area');
    const phaseSelect = document.getElementById('phase-select');
    const btnRefreshPhases = document.getElementById('btn-refresh-phases');
    const btnLoadPhase = document.getElementById('btn-load-phase');
    const btnSavePhase = document.getElementById('btn-save-phase');
    const btnRemoveSelected = document.getElementById('btn-remove-selected');
    const saveStatus = document.getElementById('save-status');
    const spriteList = document.getElementById('fundo-sprite-list');

    const state = {
        faseData: window.EditorConfig?.createEmptyFaseData?.() || {},
        faseOriginal: null,
        arquivoAtual: '',
        sprites: [],
        spriteSelecionado: '',
        fundoSelecionadoIndex: -1,
        drag: null
    };

    const renderizador = window.criarRenderizadorEditor({
        stage,
        getFaseData: () => state.faseData,
        getItemDefinitions: () => ({})
    });

    const canonizarIdSpriteFundo = window.EditorUtils?.canonizarIdSpriteFundo || ((valor) => String(valor || '').trim().replace(/\\/g, '/'));

    function setStatus(mensagem, tipo = 'info') {
        if (!saveStatus) return;
        const cores = {
            info: '#9ec5fe',
            success: '#28a745',
            warning: '#ffc107',
            error: '#ff6b6b'
        };
        saveStatus.innerHTML = `<p><strong>Status</strong>: ${mensagem}</p>`;
        saveStatus.style.color = cores[tipo] || cores.info;
    }

    function parseProporcao(proporcao = '1x1') {
        const [multHRaw, multWRaw] = String(proporcao || '1x1').split('x');
        const multH = Math.max(1, Number(multHRaw) || 1);
        const multW = Math.max(1, Number(multWRaw) || 1);
        return { multH, multW };
    }

    function aplicarTamanhoPalco() {
        const { multH, multW } = parseProporcao(state.faseData?.proporcao || '1x1');
        const largura = 640 * multW;
        const altura = 480 * multH;

        stage.style.width = `${largura}px`;
        stage.style.height = `${altura}px`;
        stageArea.scrollTop = 0;
        stageArea.scrollLeft = 0;

        const cols = Math.max(1, Math.round(largura / TILE_SIZE));
        const rows = Math.max(1, Math.round(altura / TILE_SIZE));
        renderizador.configurarGrade(cols, rows, true);
    }

    function normalizarFase(data = {}) {
        const normalizar = window.EditorUtils?.normalizeFaseData;
        if (typeof normalizar !== 'function') return data;
        return normalizar(data);
    }

    function desenharHandlesFundo() {
        const antigos = stage.querySelectorAll('.fundo-handle');
        antigos.forEach((el) => el.remove());

        const lista = Array.isArray(state.faseData.fundoFrente) ? state.faseData.fundoFrente : [];
        lista.forEach((item, index) => {
            const x = Number(item?.x);
            const y = Number(item?.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;

            const escala = Number(item?.escala || 1);
            const largura = Number(item?.largura || (TILE_SIZE * escala));
            const altura = Number(item?.altura || (TILE_SIZE * escala));

            const handle = document.createElement('div');
            handle.className = 'fundo-handle' + (state.fundoSelecionadoIndex === index ? ' is-selected' : '');
            handle.style.left = `${Math.round(x)}px`;
            handle.style.bottom = `${Math.round(y)}px`;
            handle.style.width = `${Math.max(8, Math.round(largura))}px`;
            handle.style.height = `${Math.max(8, Math.round(altura))}px`;
            handle.dataset.index = String(index);

            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                event.stopPropagation();

                state.fundoSelecionadoIndex = index;
                const stageRect = stage.getBoundingClientRect();
                const mouseX = event.clientX - stageRect.left;
                const mouseBottom = stageRect.bottom - event.clientY;
                const offsetX = mouseX - x;
                const offsetY = mouseBottom - y;

                state.drag = { index, offsetX, offsetY };
                atualizarVisualCompleto();
            });

            stage.appendChild(handle);
        });
    }

    function atualizarVisualCompleto() {
        renderizador.atualizarVisual();
        desenharHandlesFundo();
    }

    function toStageAssetPath(pathRelativo = '') {
        const texto = canonizarIdSpriteFundo(pathRelativo || '');
        if (!texto) return '';
        if (texto.startsWith('../../')) return texto;
        if (texto.startsWith('assets/')) return `../../${texto}`;
        return `../../assets/fundo/${texto}`;
    }

    function renderizarPaletteSprites() {
        spriteList.innerHTML = '';

        if (!Array.isArray(state.sprites) || state.sprites.length === 0) {
            spriteList.innerHTML = '<div class="phase-list-empty">Nenhum sprite encontrado em assets/fundo.</div>';
            return;
        }

        state.sprites.forEach((sprite) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fundo-sprite-btn' + (state.spriteSelecionado === sprite.id ? ' is-selected' : '');
            btn.title = sprite.id;

            const img = document.createElement('img');
            img.src = toStageAssetPath(sprite.path || sprite.id);
            img.alt = sprite.id;
            btn.appendChild(img);

            btn.addEventListener('click', () => {
                state.spriteSelecionado = sprite.id;
                renderizarPaletteSprites();
                setStatus(`sprite selecionado: ${sprite.id}`, 'info');
            });

            spriteList.appendChild(btn);
        });
    }

    async function carregarSpritesFundo() {
        try {
            const resposta = await fetch('/editor-fundo-sprites', { cache: 'no-store' });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const payload = await resposta.json();
            state.sprites = Array.isArray(payload?.sprites)
                ? payload.sprites.map((sprite) => ({
                    ...sprite,
                    id: canonizarIdSpriteFundo(sprite?.id || ''),
                    path: `assets/fundo/${canonizarIdSpriteFundo(sprite?.id || sprite?.path || '')}`
                }))
                : [];
            renderizarPaletteSprites();
        } catch (erro) {
            state.sprites = [];
            renderizarPaletteSprites();
            setStatus(`falha ao carregar sprites de fundo: ${erro.message}`, 'warning');
        }
    }

    async function descobrirFasesExistentes() {
        try {
            const resposta = await fetch('/editor-phase-list', { cache: 'no-store' });
            if (resposta.ok) {
                const payload = await resposta.json();
                const fases = Array.isArray(payload?.fases) ? payload.fases : [];
                if (fases.length > 0) return fases;
            }
        } catch (erro) {
            // Fallback para varredura local de candidatos.
        }

        const encontradas = [];

        for (const arquivo of PHASE_DISCOVERY_CANDIDATES) {
            try {
                const resposta = await fetch(PHASES_BASE_PATH + arquivo, {
                    method: 'GET',
                    cache: 'no-store'
                });
                if (!resposta.ok) continue;
                const data = await resposta.json();
                if (data && typeof data === 'object') {
                    encontradas.push(arquivo);
                }
            } catch (erro) {
                // Ignora e continua varrendo candidatos.
            }
        }

        return [...new Set(encontradas)];
    }

    async function atualizarListaFases() {
        phaseSelect.innerHTML = '';
        const fases = await descobrirFasesExistentes();

        if (fases.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Nenhuma fase encontrada';
            phaseSelect.appendChild(opt);
            setStatus('nenhuma fase detectada.', 'warning');
            return;
        }

        fases.forEach((arquivo) => {
            const opt = document.createElement('option');
            opt.value = arquivo;
            opt.textContent = arquivo;
            phaseSelect.appendChild(opt);
        });

        setStatus(`${fases.length} fase(s) detectada(s).`, 'info');
    }

    async function carregarFaseSelecionada() {
        const arquivo = String(phaseSelect.value || '').trim();
        if (!arquivo) {
            setStatus('selecione uma fase valida.', 'warning');
            return;
        }

        try {
            const resposta = await fetch(PHASES_BASE_PATH + arquivo, { cache: 'no-store' });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const data = await resposta.json();
            state.faseOriginal = data && typeof data === 'object'
                ? JSON.parse(JSON.stringify(data))
                : {};
            state.faseData = normalizarFase(data || {});
            state.arquivoAtual = arquivo;
            state.fundoSelecionadoIndex = -1;

            aplicarTamanhoPalco();
            atualizarVisualCompleto();
            setStatus(`fase carregada: ${arquivo}.`, 'success');
        } catch (erro) {
            setStatus(`falha ao carregar fase: ${erro.message}`, 'error');
        }
    }

    function obterPosicaoCliqueNoPalco(event) {
        const rect = stage.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localYFromBottom = rect.bottom - event.clientY;

        const x = Math.max(0, Math.floor(localX / TILE_SIZE) * TILE_SIZE);
        const y = Math.max(0, Math.floor(localYFromBottom / TILE_SIZE) * TILE_SIZE);

        return { x, y };
    }

    function adicionarFundoNoClique(event) {
        if (state.drag) return;
        if (!state.arquivoAtual) return;
        if (!state.spriteSelecionado) return;

        if (event.target && event.target.classList.contains('fundo-handle')) return;

        const { x, y } = obterPosicaoCliqueNoPalco(event);
        if (!Array.isArray(state.faseData.fundoFrente)) {
            state.faseData.fundoFrente = [];
        }

        state.faseData.fundoFrente.push({
            idSprite: state.spriteSelecionado,
            x,
            y,
            escala: 1
        });

        state.fundoSelecionadoIndex = state.faseData.fundoFrente.length - 1;
        state.faseData = normalizarFase(state.faseData);
        atualizarVisualCompleto();
        setStatus('item de fundo adicionado.', 'success');
    }

    function moverFundoSelecionado(clientX, clientY) {
        if (!state.drag) return;
        const index = Number(state.drag.index);
        const lista = Array.isArray(state.faseData.fundoFrente) ? state.faseData.fundoFrente : [];
        const item = lista[index];
        if (!item) return;

        const rect = stage.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseBottom = rect.bottom - clientY;

        const x = Math.max(0, Math.floor((mouseX - state.drag.offsetX) / TILE_SIZE) * TILE_SIZE);
        const y = Math.max(0, Math.floor((mouseBottom - state.drag.offsetY) / TILE_SIZE) * TILE_SIZE);

        item.x = x;
        item.y = y;
        atualizarVisualCompleto();
    }

    function removerSelecionado(indexForcado = null) {
        const index = Number.isInteger(indexForcado) ? Number(indexForcado) : Number(state.fundoSelecionadoIndex);
        const lista = Array.isArray(state.faseData.fundoFrente) ? state.faseData.fundoFrente : [];
        if (!Number.isInteger(index) || index < 0 || index >= lista.length) {
            setStatus('nenhum item de fundo selecionado.', 'warning');
            return;
        }

        lista.splice(index, 1);
        state.fundoSelecionadoIndex = -1;
        state.faseData = normalizarFase(state.faseData);
        atualizarVisualCompleto();
        setStatus('item de fundo removido.', 'success');
    }

    async function salvarFase() {
        if (!state.arquivoAtual) {
            setStatus('carregue uma fase antes de salvar.', 'warning');
            return;
        }

        try {
            const limpar = window.EditorUtils?.limparCamposVazios || ((d) => d);
            const normalizarFundo = window.EditorUtils?.normalizeFundoFrenteData || ((lista) => Array.isArray(lista) ? lista : []);

            const fundoNormalizado = normalizarFundo(state.faseData.fundoFrente || []);
            const baseOriginal = state.faseOriginal && typeof state.faseOriginal === 'object'
                ? JSON.parse(JSON.stringify(state.faseOriginal))
                : {};

            baseOriginal.fundoFrente = fundoNormalizado;

            const conteudo = JSON.stringify(limpar(baseOriginal), null, 4);

            const resposta = await fetch('/save-phase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: state.arquivoAtual,
                    content: conteudo
                })
            });

            if (!resposta.ok) {
                let erro = `HTTP ${resposta.status}`;
                try {
                    const data = await resposta.json();
                    if (data?.error) erro = data.error;
                } catch (parseErro) {
                    // Mantem erro HTTP.
                }
                throw new Error(erro);
            }

            state.faseOriginal = baseOriginal;
            state.faseData = normalizarFase(baseOriginal);
            state.fundoSelecionadoIndex = -1;
            atualizarVisualCompleto();

            setStatus(`fundo salvo em ${state.arquivoAtual}.`, 'success');
        } catch (erro) {
            setStatus(`falha ao salvar: ${erro.message}`, 'error');
        }
    }

    function bindEventos() {
        btnRefreshPhases?.addEventListener('click', atualizarListaFases);
        btnLoadPhase?.addEventListener('click', carregarFaseSelecionada);
        btnRemoveSelected?.addEventListener('click', removerSelecionado);
        btnSavePhase?.addEventListener('click', salvarFase);

        stage.addEventListener('click', adicionarFundoNoClique);
        stage.addEventListener('contextmenu', (event) => {
            const handle = event.target?.closest?.('.fundo-handle');
            if (!handle) return;

            event.preventDefault();
            const index = Number(handle.dataset.index);
            removerSelecionado(Number.isInteger(index) ? index : null);
        });

        window.addEventListener('mousemove', (event) => {
            if (!state.drag) return;
            moverFundoSelecionado(event.clientX, event.clientY);
        });

        window.addEventListener('mouseup', () => {
            if (!state.drag) return;
            state.drag = null;
            state.faseData = normalizarFase(state.faseData);
            atualizarVisualCompleto();
        });
    }

    async function init() {
        bindEventos();
        aplicarTamanhoPalco();
        atualizarVisualCompleto();
        await Promise.all([
            atualizarListaFases(),
            carregarSpritesFundo()
        ]);
        setStatus('pronto para editar fundoFrente.', 'info');
    }

    init();
})();
