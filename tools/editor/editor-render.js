(function () {
    const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
    const {
        PLATFORM_DEFS = [],
        ENEMY_DEFS = [],
        SYSTEM_DEFS = []
    } = window.EditorConfig || {};
    const { coordToParts, rowToLetters } = window.EditorUtils || {};

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
            stage.appendChild(img);
        }

        function atualizarVisual() {
            const faseData = getFaseData();
            const itemDefinitions = typeof getItemDefinitions === 'function' ? getItemDefinitions() : {};
            const elementos = stage.querySelectorAll('img');
            elementos.forEach(el => el.remove());

            [...PLATFORM_DEFS, ...ENEMY_DEFS].forEach((def) => {
                (faseData[def.stateKey] || []).forEach((coord) => {
                    criarIcone(coord, def.sprite, def.className || '');
                });
            });

            (faseData.itens || []).forEach((item) => {
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
                if (coord) criarIcone(coord, def.sprite, def.className || '');
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