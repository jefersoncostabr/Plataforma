(function () {
    function criarUIEditor(opcoes = {}) {
        const {
            stage,
            palette,
            proportionSelect,
            spawnRandomCheck,
            randomDiffSelect,
            randomTypeSelect,
            spawnHumanoCheck,
            humanoFreqSelect,
            getFaseData,
            setFaseData,
            atualizarTamanhoStage,
            atualizarVisual,
            adicionarElemento,
            removerElemento,
            setItemSelecionado,
            onSelecionarItem = () => {},
            getItemDefinitions,
            tileSize = 32,
            pointToCoord = () => 'a1',
            getLegendaCoord = () => ''
        } = opcoes;

        if (!stage || !palette || typeof getFaseData !== 'function' || typeof setFaseData !== 'function') {
            throw new Error('Stage, palette, getFaseData e setFaseData são obrigatórios para a UI do editor.');
        }

        let tooltipElement = null;
        let fillBottomCheckbox = null;
        let funcaoDetectarFases = null; // Referência interna
        let blockTypeSelect = null;

        function configurarPaleta() {
            const items = palette.querySelectorAll('.palette-item');
            items.forEach(item => {
                item.onclick = () => {
                    items.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
            const tipo = item.getAttribute('data-type');
                    setItemSelecionado(tipo);
                    onSelecionarItem(tipo);
                };
            });
        }

        async function configurarPaletaBlocos() {
            const container = palette.querySelector('#palette-blocks');
            if (!container) return;

            container.innerHTML = '';

            let menuDef = null;
            try {
                if (window.EditorMenuBlocosLoader?.carregarMenuBlocosJson) {
                    menuDef = await window.EditorMenuBlocosLoader.carregarMenuBlocosJson();
                } else {
                    // fallback (caso o loader não exista)
                    const resp = await fetch('../../tools/editor/menu_blocos.json', { cache: 'no-store' });
                    menuDef = resp.ok ? await resp.json() : null;
                }
                console.log('[EditorUI] menu_blocos.json carregado:', menuDef);
            } catch (e) {
                console.error('[EditorUI] Falha ao carregar menu_blocos.json', e);
            }

            const menus = menuDef?.paletteBlocks?.menus;
            if (!Array.isArray(menus) || menus.length === 0) {
                console.warn('[EditorUI] menu_blocos.json não veio no formato esperado. Paleta de blocos não será montada.', menuDef);
                return;
            }

            // Cria os botões de ciclo com base no menu_blocos.json.
            function criarBotaoCiclo(list, menuLabel = '') {
                if (list.length === 0) {
                    console.warn(`[EditorUI] O menu "${menuLabel}" resultou em uma lista vazia de itens válidos.`);
                }
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'palette-cycle-btn';
                btn.style.cssText = 'display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; padding:0; cursor:pointer; border:none; background:transparent; color:#eee;';

                const img = document.createElement('img');
                img.style.width = '32px';
                img.style.height = '32px';
                img.style.imageRendering = 'pixelated';
                btn.appendChild(img);

                if (!list || list.length === 0) {
                    btn.style.display = 'none';
                    return { btn, render: () => {} };
                }

                let idx = 0;
                const render = () => {
                    const current = list[idx];
                    img.src = current.img;
                    setItemSelecionado(current.type);

                    const labelAtual = current.label || current.type;
                    btn.title = labelAtual ? `Bloco: ${labelAtual}` : menuLabel;
                };

                btn.addEventListener('click', () => {
                    idx = (idx + 1) % list.length;
                    render();
                });

                // Clique direito volta o ciclo para o item anterior.
                btn.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    idx = (idx - 1 + list.length) % list.length;
                    render();
                });

                render();
                return { btn, render };
            }

            menus.forEach(menu => {
                const items = Array.isArray(menu?.cycle?.items) ? menu.cycle.items : [];
                console.log(`[EditorUI] Montando menu ciclo [${menu.id || menu.label}]:`, items.length, 'itens');
                const list = items
                    .map(it => {
                        const type = it?.type;
                        if (!type) return null;
                        const img = it?.sprite;
                        if (!img) return null;
                        return { type, img, label: it?.label };
                    })
                    .filter(Boolean);

                const created = criarBotaoCiclo(list, menu?.label || 'Blocos');
                container.appendChild(created.btn);
            });
        }


        function configurarPaletaDinamicaItens() {
            const itemDefinitions = typeof getItemDefinitions === 'function' ? getItemDefinitions() : {};

            const catItens = Array.from(palette.querySelectorAll('.category')).find(cat => {
                const texto = cat.querySelector('h4')?.innerText.trim().toLowerCase();
                return texto === 'itens' || texto === 'items';
            });

            if (catItens) {
                // Remove apenas itens que foram gerados dinamicamente antes, para evitar duplicatas
                const oldItens = catItens.querySelectorAll('.palette-item[data-dynamic="true"]');
                oldItens.forEach(el => el.remove());

                Object.keys(itemDefinitions).forEach(tipo => {
                    const def = itemDefinitions[tipo];
                    const img = document.createElement('img');
                    
                    // Força o caminho correto dos sprites para garantir visibilidade na paleta
                    // resolveSpritePath: centraliza caminhos do sprite para evitar duplicidade de ifs.
                    if (tipo === 'municao_plus') img.src = '../../assets/personagem/cx_municao.png';
                    else if (tipo === 'novelo') img.src = '../../assets/personagem/objetos/novelo.png';
                    else if (tipo === 'restauracao') img.src = '../../assets/personagem/restauracao.png';
                    else {
                        const sprite = window.EditorDefinitions?.resolveSpritePath?.(def, 'menu');
                        img.src = sprite || def.spriteColetavel || def.spriteMenu || '';
                    }



                    img.className = 'palette-item';
                    img.setAttribute('data-type', 'item_' + tipo);
                    img.setAttribute('data-dynamic', 'true');
                    img.title = (tipo === 'municao_plus') ? 'Caixa de Munição' : (tipo === 'novelo' ? 'Novelo de Lã' : (def.nome || tipo));
                    catItens.appendChild(img);
                });
            } else {
                console.error("[EditorUI] ERRO: Não foi encontrada uma categoria com título 'Itens' ou 'Items' na paleta HTML.");
            }

            configurarPaleta();
        }

        function configurarPaletaGaiola() {
            const categorias = Array.from(palette.querySelectorAll('.category'));

            const catSistemas = categorias.find(cat => {
                const texto = (cat.querySelector('h4')?.innerText || "").trim().toLowerCase();
                // Adicionado 'sistema' para suportar o título exato encontrado no seu log
                return ['sistema', 'sistemas', 'configuração', 'especial', 'npcs', 'geral'].some(termo => texto.includes(termo));
            });

            if (catSistemas) {
                
                // Injeção da Gaiola
                if (!catSistemas.querySelector('[data-type="gaiola"]')) {
                    const container = document.createElement('div');
                    container.className = 'palette-item';
                    container.setAttribute('data-type', 'gaiola');
                    container.title = 'Gaiola com Cão';
                    container.style.position = 'relative';
                    container.style.display = 'inline-block';
                    container.style.width = '32px';
                    container.style.height = '32px';

                    container.innerHTML = `
                        <img src="../../assets/personagem/cao_parado.png" style="position:absolute; left:0; top:0; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;">
                        <img src="../../assets/personagem/gaiola1.png" style="position:absolute; left:0; top:0; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;">
                    `;
                    
                    catSistemas.appendChild(container);
                }

                // Injeção do Cão (NPC) livre
                if (!catSistemas.querySelector('[data-type="cachorro"]')) {
                    const imgCao = document.createElement('img');
                    imgCao.src = '../../assets/personagem/cao_parado.png';
                    imgCao.className = 'palette-item';
                    imgCao.setAttribute('data-type', 'cachorro');
                    imgCao.title = 'Cachorro (NPC)';
                    catSistemas.appendChild(imgCao);
                }

                // Injeção da Gaiola com Gato
                if (!catSistemas.querySelector('[data-type="gaiolaGato"]')) {
                    const container = document.createElement('div');
                    container.className = 'palette-item';
                    container.setAttribute('data-type', 'gaiolaGato');
                    container.title = 'Gaiola com Gato';
                    container.style.position = 'relative';
                    container.style.display = 'inline-block';
                    container.style.width = '32px';
                    container.style.height = '32px';

                    container.innerHTML = `
                        <img src="../../assets/personagem/gato_parado.png" style="position:absolute; left:0; top:0; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;">
                        <img src="../../assets/personagem/gaiola1.png" style="position:absolute; left:0; top:0; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;">
                    `;

                    catSistemas.appendChild(container);
                }

                // Injeção do Gato (NPC) livre
                if (!catSistemas.querySelector('[data-type="gato"]')) {
                    const imgGato = document.createElement('img');
                    imgGato.src = '../../assets/personagem/gato_parado.png';
                    imgGato.className = 'palette-item';
                    imgGato.setAttribute('data-type', 'gato');
                    imgGato.title = 'Gato (NPC)';
                    catSistemas.appendChild(imgGato);
                }

                // Ajuste do Inimigo Completo (Fundo Dourado + Sprite Parado)
                const catInimigos = categorias.find(cat => {
                    const texto = (cat.querySelector('h4')?.innerText || "").trim().toLowerCase();
                    return ['inimigos', 'inimigo', 'enemies'].some(termo => texto.includes(termo));
                });

                if (catInimigos) {
                    let itemCompleto = catInimigos.querySelector('[data-type="inimigo_completo"]');
                    const containerInimigo = document.createElement('div');
                    containerInimigo.className = 'palette-item';
                    containerInimigo.setAttribute('data-type', 'inimigo_completo');
                    containerInimigo.title = 'Inimigo Completo';
                    containerInimigo.style.cssText = `position:relative; display:inline-block; width:32px; height:32px; background:linear-gradient(45deg, #FFD700, #FFA500); border-radius:4px;`;

                    containerInimigo.innerHTML = `<img src="../../assets/personagem/Personagem_parado.png" style="position:absolute; left:0; top:0; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;">`;

                    if (itemCompleto) {
                        itemCompleto.replaceWith(containerInimigo);
                    } else {
                        catInimigos.appendChild(containerInimigo);
                    }

                    // (Removido inimigo_bb da paleta)

                    const enemyDefs = window.EditorConfig?.ENEMY_DEFS || [];
                    const tiposNoDOM = new Set(
                        Array.from(catInimigos.querySelectorAll('.palette-item[data-type]'))
                            .map((el) => el.getAttribute('data-type'))
                            .filter(Boolean)
                    );

                    enemyDefs.forEach((def) => {
                        if (!def?.type || tiposNoDOM.has(def.type)) return;

                        const img = document.createElement('img');
                        img.src = def.sprite || '../../assets/personagem/Personagem_parado.png';
                        img.className = 'palette-item';
                        img.setAttribute('data-type', def.type);
                        img.title = def.label || def.type;
                        catInimigos.appendChild(img);
                    });

                }

                configurarPaleta(); // Re-vincula os eventos de clique para os novos itens
            } else {
                console.warn("[EditorUI] Categoria de sistemas não encontrada na paleta. Verifique os títulos H4 no HTML.");
            }
        }

        function addBlocks(coordsArray) {
            const faseData = getFaseData();
            const tipo = blockTypeSelect?.value;
            const garantirArray = (chave) => {
                if (!Array.isArray(faseData[chave])) faseData[chave] = [];
                return faseData[chave];
            };

            coordsArray.forEach(coord => {
                if (tipo === 'neve') {
                    const lista = garantirArray('plataformasNeve');
                    if (!lista.includes(coord)) lista.push(coord);
                } else if (tipo === 'terraInferior') {
                    const lista = garantirArray('plataformasTerraInferior');
                    if (!lista.includes(coord)) lista.push(coord);
                } else if (tipo === 'terraSuperior') {
                    const lista = garantirArray('plataformasTerraSuperior');
                    if (!lista.includes(coord)) lista.push(coord);
                } else {
                    const lista = garantirArray('plataformas');
                    if (!lista.includes(coord)) lista.push(coord);
                }
            });
            setFaseData(faseData);
        }

        function removeBlocks(coordsArray) {
            const faseData = getFaseData();
            ['plataformas', 'plataformasNeve', 'plataformasTerraInferior', 'plataformasTerraSuperior'].forEach((key) => {
                const filtradas = (faseData[key] || []).filter(coord => !coordsArray.includes(coord));
                if (filtradas.length > 0) faseData[key] = filtradas;
                else delete faseData[key];
            });
            setFaseData(faseData);
        }

        function fillBottomLayer(fill) {
            const faseData = getFaseData();
            const [hMult, wMult] = faseData.proporcao.split('x').map(Number);
            const cols = 20 * (wMult || 1);
            const bottomRowCoords = [];
            for (let c = 1; c <= cols; c++) {
                bottomRowCoords.push('a' + c);
            }
            if (fill) addBlocks(bottomRowCoords);
            else removeBlocks(bottomRowCoords);
        }

        function configurarFerramentasAutomaticas() {
            const toolsContainer = document.createElement('div');
            toolsContainer.className = 'editor-tools';
            toolsContainer.innerHTML = `
                <strong>Automação</strong>
                <label>
                    <input type="checkbox" id="fill-bottom-checkbox"> Preencher Chão (Linha A)
                </label>
                <label>
                    Bloco:
                    <select id="block-type-select">
                        <option value="padrao">Padrão (Terra Horizontal)</option>

                        <option value="neve">Neve</option>

                        <option value="terraInferior">Terra Inferior</option>
                        <option value="terraSuperior">Terra Superior</option>
                    </select>
                </label>
            `;
            palette.appendChild(toolsContainer);

            fillBottomCheckbox = document.getElementById('fill-bottom-checkbox');
            blockTypeSelect = document.getElementById('block-type-select');

            fillBottomCheckbox.checked = (getFaseData().plataformas || []).some(c => c.startsWith('a'));
            fillBottomCheckbox.onchange = (e) => {
                fillBottomLayer(e.target.checked);
                atualizarVisual();
            };
        }

        function configurarControlesDimensoes() {
            if (!proportionSelect) return;
            proportionSelect.onchange = (e) => {
                const faseData = getFaseData();
                faseData.proporcao = e.target.value;
                setFaseData(faseData);
                atualizarTamanhoStage();
            };
        }

        function obterCoordEventoStage(e) {
            const rect = stage.getBoundingClientRect();
            const scrollLeft = stage.parentElement?.scrollLeft || 0;
            const scrollTop = stage.parentElement?.scrollTop || 0;
            const x = (e.clientX - rect.left) + scrollLeft;
            const y = (rect.bottom - e.clientY) + scrollTop;
            return pointToCoord(x, y, tileSize);
        }

        function configurarTooltip() {
            tooltipElement = document.createElement('div');
            tooltipElement.id = 'editor-tooltip';
            document.body.appendChild(tooltipElement);

            stage.addEventListener('mousemove', (e) => {
                const coord = obterCoordEventoStage(e);
                const legenda = getLegendaCoord(coord);

                if (legenda) {
                    tooltipElement.innerText = legenda;
                    tooltipElement.style.display = 'block';
                    tooltipElement.style.left = (e.clientX + 15) + 'px';
                    tooltipElement.style.top = (e.clientY + 15) + 'px';
                } else {
                    tooltipElement.style.display = 'none';
                }
            });

            // Legendas de hover na paleta de Blocos
            // Importante: a paleta de blocos é gerada por JS e usa <button> e <img> (sem data-type),
            // então precisamos setar o tooltip diretamente nos botões no momento em que eles são criados.
            // (Aqui fica apenas um fallback: se algum item já tiver data-type, tenta configurar.)
            const paintPaletaLegendasBlocos = () => {
                const defs = window.EditorConfig?.PLATFORM_DEFS || [];
                const containerBlocks = palette.querySelector('#palette-blocks');
                if (!containerBlocks) return;

                containerBlocks.querySelectorAll('.palette-item[data-type]').forEach((el) => {
                    const type = el.getAttribute('data-type');
                    const realType = type?.startsWith('block_') ? type.slice('block_'.length) : type;
                    const def = defs.find(d => d.type === realType);
                    const legenda = def?.label ? `Bloco: ${def.label}` : '';
                    if (!legenda) return;
                    el.title = legenda;
                });
            };

            paintPaletaLegendasBlocos();

            stage.addEventListener('mouseleave', () => {

                tooltipElement.style.display = 'none';
            });
        }

        function configurarStage() {
            stage.addEventListener('mousedown', (e) => {
                const coord = obterCoordEventoStage(e);
                if (e.button === 0) adicionarElemento(coord);
                else if (e.button === 2) removerElemento(coord);
                atualizarVisual();
            });

            stage.oncontextmenu = (e) => e.preventDefault();
        }

        function configurarTeclasGlobais() {
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'g') {
                    const grade = document.getElementById('grade-auxiliar');
                    if (grade) {
                        grade.style.display = grade.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
        }

        function configurarSpawnAleatorio() {
            if (!spawnRandomCheck) return;
            spawnRandomCheck.onchange = (e) => {
                document.getElementById('random-config-fields').style.opacity = e.target.checked ? '1' : '0.3';
                document.getElementById('random-config-fields').style.pointerEvents = e.target.checked ? 'auto' : 'none';
            };

            // Injeta dinamicamente a UI de spawn de humanos se não existir no editor.html
            let humanoFields = document.getElementById('humano-config-fields');
            if (!humanoFields) {
                const randomFields = document.getElementById('random-config-fields');
                const parent = randomFields?.parentElement;
                if (parent) {
                    const container = document.createElement('div');
                    container.style.marginTop = '10px';
                    container.style.borderTop = '1px solid #444';
                    container.style.paddingTop = '10px';
                    container.innerHTML = `
                        <label title="Habilita o surgimento de humanos aleatórios durante a fase">
                            <input type="checkbox" id="spawn-humano"> Humano Aleatório
                        </label>
                        <div id="humano-config-fields" style="opacity: 0.3; transition: opacity 0.3s; pointer-events: none; margin-left: 20px; font-size: 11px;">
                            <label>Frequência: 
                                <select id="humano-freq">
                                    <option value="1">Baixa (1 min)</option>
                                    <option value="2">Média (45 seg)</option>
                                    <option value="3">Alta (30 seg)</option>
                                </select>
                            </label>
                        </div>
                    `;
                    parent.appendChild(container);
                }
            }

            const humanoCheck = document.getElementById('spawn-humano');
            if (humanoCheck) {
                humanoCheck.onchange = (e) => {
                    const fields = document.getElementById('humano-config-fields');
                    if (fields) {
                        fields.style.opacity = e.target.checked ? '1' : '0.3';
                        fields.style.pointerEvents = e.target.checked ? 'auto' : 'none';
                    }
                    // Atualiza o estado da fase imediatamente
                    const fase = getFaseData();
                    const freq = parseInt(document.getElementById('humano-freq').value);
                    fase.humanoAleatorio = e.target.checked ? [freq] : [0];
                    setFaseData(fase);
                };
            }
        }

        async function configurarSeletorFases(opcoes = {}) {
            const {
                persistencia,
                basePath = '../../config/fases/',
                manifestPath = '',
                arquivosCandidatos = [],
                aoCarregarFase = null
            } = opcoes;

            const phaseList = document.getElementById('phase-list');
            const refreshButton = document.getElementById('btn-refresh-phases');
            if (!phaseList || !persistencia) return [];

            const formatarNome = (arquivo) => {
                const partes = String(arquivo || '').split('/');
                const nomeOriginal = partes.pop().replace(/\.json$/i, '');
                if (nomeOriginal.toLowerCase() === 'treino') return 'Treino (Raiz)';
                return nomeOriginal.replace(/fase(\d+)/i, 'Fase $1');
            };

            const marcarAtiva = (arquivoAtivo) => {
                phaseList.querySelectorAll('.phase-entry').forEach((botao) => {
                    botao.classList.toggle('active', botao.dataset.phaseFile === arquivoAtivo);
                });
            };

            const carregarFaseArquivo = async (arquivo) => {
                try {
                    const resp = await fetch(`${basePath}${arquivo}`, { cache: 'no-store' });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

                    const texto = await resp.text();
                    const carregado = persistencia.carregarJSONTexto(texto, {
                        mostrarMensagem: false
                    });

                    if (!carregado) {
                        throw new Error('Falha ao aplicar os dados da fase.');
                    }

                    if (typeof persistencia.setArquivoFaseAtual === 'function') {
                        persistencia.setArquivoFaseAtual(arquivo);
                    }
                    if (typeof aoCarregarFase === 'function') {
                        aoCarregarFase(arquivo, carregado);
                    }

                    marcarAtiva(arquivo);
                    alert(`${formatarNome(arquivo)} carregada com sucesso!`);
                } catch (erro) {
                    alert(`Erro ao carregar ${formatarNome(arquivo)}: ${erro.message}`);
                }
            };

            const renderizarListaFases = (arquivos = []) => {
                phaseList.innerHTML = '';

                if (arquivos.length === 0) {
                    phaseList.innerHTML = '<div class="phase-list-empty">Nenhuma fase detectada.</div>';
                    return [];
                }

                    // Agrupar por pastas
                const grupos = {};
                arquivos.forEach(arq => {
                    const pasta = arq.includes('/') ? arq.split('/')[0] : 'Raiz';
                    if (!grupos[pasta]) grupos[pasta] = [];
                    grupos[pasta].push(arq);
                });

                Object.keys(grupos).sort().forEach(grupo => {
                    const header = document.createElement('div');
                    header.className = 'phase-group-header';
                    header.textContent = grupo.toUpperCase().replace('_', ' ');
                    header.style.cssText = "padding: 5px; background: #333; color: #eee; font-size: 10px; margin-top: 5px;";
                    phaseList.appendChild(header);

                    grupos[grupo].forEach((arquivo) => {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'phase-entry';
                    botao.dataset.phaseFile = arquivo;
                    botao.textContent = formatarNome(arquivo);
                    botao.onclick = () => carregarFaseArquivo(arquivo);
                    phaseList.appendChild(botao);
                    });
                });

                return arquivos;
            };

            const carregarManifestoFases = async () => {
                if (!manifestPath) return [];

                try {
                    const resposta = await fetch(manifestPath, { cache: 'no-store' });
                    if (!resposta.ok) return [];

                    const data = await resposta.json();
                    if (Array.isArray(data)) return data.filter(Boolean);
                    if (Array.isArray(data?.fases)) return data.fases.filter(Boolean);
                    return [];
                } catch (e) {
                    return [];
                }
            };

            const verificarArquivoExiste = async (arquivo) => {
                const url = `${basePath}${arquivo}`;

                try {
                    const resposta = await fetch(url, { cache: 'no-store' });
                    return resposta.ok;
                } catch (e) {
                    return false;
                }
            };

            const detectarExistentes = async () => {
                phaseList.innerHTML = '<div class="phase-list-empty">Detectando fases existentes...</div>';

                // Tenta carregar o que está no index.json
                let arquivosEncontrados = await carregarManifestoFases();

                // Varre os candidatos para encontrar arquivos que existam na pasta mas não no index.json
                for (const arquivo of arquivosCandidatos) {
                    if (arquivosEncontrados.includes(arquivo)) continue;

                    const existe = await verificarArquivoExiste(arquivo);
                    if (existe) {
                        arquivosEncontrados.push(arquivo);
                    }
                }

                // Renderiza a lista combinada e sem duplicatas
                return renderizarListaFases([...new Set(arquivosEncontrados)]);
            };

            funcaoDetectarFases = detectarExistentes;

            if (refreshButton) {
                refreshButton.onclick = () => detectarExistentes();
            }

            return detectarExistentes();
        }

        return {
            configurarPaleta,
            configurarPaletaBlocos,
            configurarPaletaDinamicaItens,

            configurarPaletaGaiola,
            configurarFerramentasAutomaticas,
            configurarControlesDimensoes,
            configurarTooltip,
            configurarStage,
            configurarTeclasGlobais,
            configurarSpawnAleatorio,
            configurarSeletorFases,
            detectarExistentes: () => (typeof funcaoDetectarFases === 'function' ? funcaoDetectarFases() : []),
            fillBottomLayer
        };
    }

    window.criarUIEditor = criarUIEditor;
})();