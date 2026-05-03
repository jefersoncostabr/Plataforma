(function () {
    function criarUIEditor(opcoes = {}) {
        const {
            stage,
            palette,
            proportionSelect,
            spawnRandomCheck,
            randomDiffSelect,
            randomTypeSelect,
            getFaseData,
            setFaseData,
            atualizarTamanhoStage,
            atualizarVisual,
            adicionarElemento,
            removerElemento,
            setItemSelecionado,
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
                    setItemSelecionado(item.getAttribute('data-type'));
                };
            });
        }

        function configurarPaletaDinamicaItens() {
            const itemDefinitions = typeof getItemDefinitions === 'function' ? getItemDefinitions() : {};
            const oldItens = palette.querySelectorAll('.palette-item[data-type^="item_"]');
            oldItens.forEach(el => el.remove());

            const catItens = Array.from(palette.querySelectorAll('.category')).find(cat => {
                const texto = cat.querySelector('h4')?.innerText.trim().toLowerCase();
                return texto === 'itens' || texto === 'items';
            });

            if (catItens) {
                for (const tipo in itemDefinitions) {
                    const def = itemDefinitions[tipo];
                    const img = document.createElement('img');
                    img.src = def.spriteColetavel;
                    img.className = 'palette-item';
                    img.setAttribute('data-type', 'item_' + def.id);
                    img.title = def.nome || def.id;
                    catItens.appendChild(img);
                }
            }

            configurarPaleta();
        }

        function configurarPaletaGaiola() {
            console.group("[EditorUI] Injeção de Itens Especiais");
            const categorias = Array.from(palette.querySelectorAll('.category'));
            console.log("Categorias encontradas na paleta:", categorias.map(c => c.querySelector('h4')?.innerText));

            const catSistemas = categorias.find(cat => {
                const texto = (cat.querySelector('h4')?.innerText || "").trim().toLowerCase();
                // Adicionado 'sistema' para suportar o título exato encontrado no seu log
                return ['sistema', 'sistemas', 'configuração', 'especial', 'npcs', 'geral'].some(termo => texto.includes(termo));
            });

            if (catSistemas) {
                console.log("Categoria alvo identificada:", catSistemas.querySelector('h4')?.innerText);
                
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
                    console.log("Item 'gaiola' injetado com sucesso.");
                }

                // Injeção do Cão (NPC) livre
                if (!catSistemas.querySelector('[data-type="cachorro"]')) {
                    const imgCao = document.createElement('img');
                    imgCao.src = '../../assets/personagem/cao_parado.png';
                    imgCao.className = 'palette-item';
                    imgCao.setAttribute('data-type', 'cachorro');
                    imgCao.title = 'Cachorro (NPC)';
                    catSistemas.appendChild(imgCao);
                    console.log("Item 'cachorro' injetado com sucesso.");
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
                    console.log("Item 'gaiolaGato' injetado com sucesso.");
                }

                // Injeção do Gato (NPC) livre
                if (!catSistemas.querySelector('[data-type="gato"]')) {
                    const imgGato = document.createElement('img');
                    imgGato.src = '../../assets/personagem/gato_parado.png';
                    imgGato.className = 'palette-item';
                    imgGato.setAttribute('data-type', 'gato');
                    imgGato.title = 'Gato (NPC)';
                    catSistemas.appendChild(imgGato);
                    console.log("Item 'gato' injetado com sucesso.");
                }

                configurarPaleta(); // Re-vincula os eventos de clique para os novos itens
            } else {
                console.warn("[EditorUI] Categoria de sistemas não encontrada na paleta. Verifique os títulos H4 no HTML.");
            }
            console.groupEnd();
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
                        <option value="padrao">Padrão (Grama)</option>
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
                const semExt = String(arquivo || '').replace(/\.json$/i, '');
                if (semExt.toLowerCase() === 'treino') return 'Treino';
                return semExt.replace(/fase(\d+)/i, 'Fase $1');
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

                    console.debug('[Editor] fase carregada do arquivo', {
                        arquivo,
                        proporcao: carregado.proporcao,
                        posicaoInicialJogador: carregado.posicaoInicialJogador,
                        objetivo: carregado.objetivo
                    });

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

                arquivos.forEach((arquivo) => {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'phase-entry';
                    botao.dataset.phaseFile = arquivo;
                    botao.textContent = formatarNome(arquivo);
                    botao.onclick = () => carregarFaseArquivo(arquivo);
                    phaseList.appendChild(botao);
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