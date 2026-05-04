(function () {
    const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
    const { coordToParts, rowToLetters, iterarItensData = () => [] } = window.EditorUtils || {};

    function criarRenderizadorEditor(opcoes = {}) {
        const { stage, getFaseData, getItemDefinitions } = opcoes;

        if (!stage || typeof getFaseData !== 'function') {
            throw new Error('Stage e getFaseData são obrigatórios para o renderizador do editor.');
        }

        function configurarGrade(cols, rows, gradeVisivel = true) {
            let grade = document.getElementById('grade-auxiliar');
            if (grade) grade.remove();

            grade = document.createElement('div');
            grade.id = 'grade-auxiliar';
            grade.style.position = 'absolute';
            grade.style.width = '100%';
            grade.style.height = '100%';
            grade.style.pointerEvents = 'none';
            grade.style.zIndex = '100';
            grade.style.display = gradeVisivel ? 'block' : 'none';
            grade.style.backgroundImage = `
                linear-gradient(to right, rgba(0, 255, 0, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 255, 0, 0.2) 1px, transparent 1px)
            `;
            grade.style.backgroundSize = `${TILE_SIZE}px ${TILE_SIZE}px`;

            for (let r = 0; r < rows; r++) {
                for (let c = 1; c <= cols; c++) {
                    const label = document.createElement('span');
                    const letra = typeof rowToLetters === 'function' ? rowToLetters(r) : String.fromCharCode(97 + r);
                    label.textContent = letra + c;
                    label.style.position = 'absolute';
                    label.style.left = ((c - 1) * TILE_SIZE) + 'px';
                    label.style.bottom = (r * TILE_SIZE) + 'px';
                    label.style.fontSize = '8px';
                    label.style.color = 'rgba(0, 255, 0, 0.3)';
                    grade.appendChild(label);
                }
            }

            stage.appendChild(grade);
        }

        function criarIcone(coord, src, classe = '') {
            const partes = typeof coordToParts === 'function' ? coordToParts(coord) : null;
            if (!partes) return;

            const col = partes.col;
            const row = partes.row;
            let yPos = row * TILE_SIZE;
            if (src.includes('estacasup.png')) yPos += 2;

            const img = document.createElement('img');
            img.src = src;
            if (classe) img.classList.add(classe);
            img.style = `position:absolute; left:${col * TILE_SIZE}px; bottom:${yPos}px; width:${TILE_SIZE}px; height:${TILE_SIZE}px; image-rendering:pixelated; pointer-events:none;`;
            if (classe === 'player-filter') img.style.filter = 'hue-rotate(90deg)';
            if (classe.includes('golden-bg')) {
                img.style.background = 'rgba(255, 215, 0, 0.4)';
                img.style.borderRadius = '4px';
                img.style.boxShadow = '0 0 5px gold';
            }
            stage.appendChild(img);
        }

        function atualizarVisual() {
            const faseData = getFaseData();
            const itemDefinitions = typeof getItemDefinitions === 'function' ? getItemDefinitions() : {};
            
            // Captura dinâmica das definições para evitar que fiquem vazias no carregamento
            const PLATFORM_DEFS = window.EditorConfig?.PLATFORM_DEFS || [];
            const ENEMY_DEFS = window.EditorConfig?.ENEMY_DEFS || [];
            const SYSTEM_DEFS = window.EditorConfig?.SYSTEM_DEFS || [];

            const elementos = stage.querySelectorAll('img');
            elementos.forEach(el => el.remove());

            console.debug('[EditorRender] iniciar render', {
                proporcao: faseData.proporcao,
                plataformas: Array.isArray(faseData.plataformas) ? faseData.plataformas.length : 0,
                itens: Object.keys(faseData.itens || {}).length,
                imagensRemovidas: elementos.length
            });

            [...PLATFORM_DEFS, ...ENEMY_DEFS].forEach((def) => {
                (faseData[def.stateKey] || []).forEach((coord) => {
                    criarIcone(coord, def.sprite, def.className || '');
                });
            });

            iterarItensData(faseData.itens).forEach((item) => {
                let src = '../../assets/personagem/revolver_pegavel.png';
                if (itemDefinitions[item.tipo]?.spriteColetavel) {
                    src = itemDefinitions[item.tipo].spriteColetavel;
                } else if (item.tipo === 'restauracao') {
                    src = '../../assets/personagem/restauracao.png';
                }
                criarIcone(item.pos, src, '');
            });

            SYSTEM_DEFS.forEach((def) => {
                const coord = faseData[def.stateKey];
                if (coord) {
                    console.log(`[EditorRender] Renderizando sistema: ${def.type} em ${coord}`);
                    // Para a gaiola, renderizamos o cão atrás para feedback visual fiel ao jogo
                    if (def.type === 'gaiola') {
                        criarIcone(coord, '../../assets/personagem/cao_parado.png', 'editor-npc-fundo');
                    } else if (def.type === 'gaiolaGato') {
                        criarIcone(coord, '../../assets/personagem/gato_parado.png', 'editor-npc-fundo');
                    }
                    criarIcone(coord, def.sprite, def.className || '');
                }
            });

            console.debug('[EditorRender] render finalizado', {
                imagensNoPalco: stage.querySelectorAll('img').length
            });
        }

        return {
            configurarGrade,
            criarIcone,
            atualizarVisual
        };
    }

    window.criarRenderizadorEditor = criarRenderizadorEditor;
})();