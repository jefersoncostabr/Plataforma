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
        let blockTypeSelect = null;

        function configurarPaleta() {
            const items = document.querySelectorAll('.palette-item');
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

        function addBlocks(coordsArray) {
            const faseData = getFaseData();
            const tipo = blockTypeSelect?.value;
            coordsArray.forEach(coord => {
                if (tipo === 'neve') {
                    if (!faseData.plataformasNeve.includes(coord)) faseData.plataformasNeve.push(coord);
                } else if (tipo === 'terraInferior') {
                    if (!faseData.plataformasTerraInferior.includes(coord)) faseData.plataformasTerraInferior.push(coord);
                } else if (tipo === 'terraSuperior') {
                    if (!faseData.plataformasTerraSuperior.includes(coord)) faseData.plataformasTerraSuperior.push(coord);
                } else {
                    if (!faseData.plataformas.includes(coord)) faseData.plataformas.push(coord);
                }
            });
            setFaseData(faseData);
        }

        function removeBlocks(coordsArray) {
            const faseData = getFaseData();
            faseData.plataformas = faseData.plataformas.filter(coord => !coordsArray.includes(coord));
            faseData.plataformasNeve = faseData.plataformasNeve.filter(coord => !coordsArray.includes(coord));
            faseData.plataformasTerraInferior = faseData.plataformasTerraInferior.filter(coord => !coordsArray.includes(coord));
            faseData.plataformasTerraSuperior = faseData.plataformasTerraSuperior.filter(coord => !coordsArray.includes(coord));
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

            fillBottomCheckbox.checked = getFaseData().plataformas.some(c => c.startsWith('a'));
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
                arquivosCandidatos = []
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

                    marcarAtiva(arquivo);
                    alert(`${formatarNome(arquivo)} carregada com sucesso!`);
                } catch (erro) {
                    alert(`Erro ao carregar ${formatarNome(arquivo)}: ${erro.message}`);
                }
            };

            const verificarArquivoExiste = async (arquivo) => {
                const url = `${basePath}${arquivo}`;

                try {
                    const respostaHead = await fetch(url, { method: 'HEAD', cache: 'no-store' });
                    if (respostaHead.ok) return true;
                    if (![405, 501].includes(respostaHead.status)) return false;
                } catch (e) {
                    // tenta fallback abaixo
                }

                try {
                    const respostaGet = await fetch(url, { cache: 'no-store' });
                    return respostaGet.ok;
                } catch (e) {
                    return false;
                }
            };

            const detectarExistentes = async () => {
                phaseList.innerHTML = '<div class="phase-list-empty">Detectando fases existentes...</div>';

                const encontrados = [];
                for (const arquivo of arquivosCandidatos) {
                    const existe = await verificarArquivoExiste(arquivo);
                    if (existe) {
                        encontrados.push(arquivo);
                    }
                }

                phaseList.innerHTML = '';

                if (encontrados.length === 0) {
                    phaseList.innerHTML = '<div class="phase-list-empty">Nenhuma fase detectada.</div>';
                    return encontrados;
                }

                encontrados.forEach((arquivo) => {
                    const botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'phase-entry';
                    botao.dataset.phaseFile = arquivo;
                    botao.textContent = formatarNome(arquivo);
                    botao.onclick = () => carregarFaseArquivo(arquivo);
                    phaseList.appendChild(botao);
                });

                return encontrados;
            };

            if (refreshButton) {
                refreshButton.onclick = () => detectarExistentes();
            }

            return detectarExistentes();
        }

        return {
            configurarPaleta,
            configurarPaletaDinamicaItens,
            configurarFerramentasAutomaticas,
            configurarControlesDimensoes,
            configurarTooltip,
            configurarStage,
            configurarTeclasGlobais,
            configurarSpawnAleatorio,
            configurarSeletorFases,
            fillBottomLayer
        };
    }

    window.criarUIEditor = criarUIEditor;
})();