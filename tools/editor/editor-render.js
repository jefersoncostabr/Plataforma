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

        function criarIcone(coord, src, classe = '', opcoes = {}) {
            const partes = typeof coordToParts === 'function' ? coordToParts(coord) : null;
            if (!partes) return;

            const col = partes.col;
            const row = partes.row;
            const offsetY = Number(opcoes.offsetY ?? 0);
            const offsetX = Number(opcoes.offsetX ?? 0);
            let yPos = (row * TILE_SIZE) + offsetY;
            if (src.includes('estacasup.png')) yPos += 2;

            const img = document.createElement('img');
            img.src = src;
            img.onerror = () => {
                console.error(`[EditorRender] Erro ao carregar imagem: ${src}`);
            };
            img.onload = () => {
                console.debug(`[EditorRender] Imagem carregada: ${src}`);
            };
            if (classe) {
                const classes = String(classe).trim().split(/\s+/).filter(Boolean);
                if (classes.length) img.classList.add(...classes);
            }
            const largura = Number(opcoes.largura ?? TILE_SIZE);
            const altura = Number(opcoes.altura ?? TILE_SIZE);
            img.style = `position:absolute; left:${(col * TILE_SIZE) + offsetX}px; bottom:${yPos}px; width:${largura}px; height:${altura}px; image-rendering:pixelated; pointer-events:none;`;
            if (opcoes.zIndex !== undefined) {
                img.style.zIndex = String(opcoes.zIndex);
            }
            if (classe === 'player-filter') img.style.filter = 'hue-rotate(90deg)';
            if (classe.includes('golden-bg')) {
                img.style.background = 'rgba(255, 215, 0, 0.4)';
                img.style.borderRadius = '4px';
                img.style.boxShadow = '0 0 5px gold';
            }
            stage.appendChild(img);
        }

        function criarIconeCapsulaComposto(coord, defCapsula = {}, item = {}) {
            const spriteComposto = defCapsula.spriteComposto || {};
            const srcInferior = spriteComposto.inferior || '../../assets/personagem/capsula/capsula_inferior.png';
            const srcSuperior = spriteComposto.superior || '../../assets/personagem/capsula/capsula_superior.png';
            const srcVidro = spriteComposto.vidro || '../../assets/personagem/capsula/capsula_vidro.png';
            const srcRobot = (item.robotEstado || item.estadoRobo || 'aberto') === 'desativado'
                ? '../../assets/personagem/robo_desativado.png'
                : '../../assets/personagem/per_aberto.png';
            const superiorOffsetY = Number(spriteComposto.superiorOffsetY ?? 32);
            const vidroAltura = Number(spriteComposto.vidroAltura ?? 10);
            const vidroOffsetY = Number(spriteComposto.vidroOffsetY ?? 27);
            const vidroLargura = Number(spriteComposto.vidroLargura ?? 32);
            const vidroOffsetX = Number(spriteComposto.vidroOffsetX ?? 0);
            const robotOffsetY = Number(spriteComposto.robotOffsetY ?? 16);

            criarIcone(coord, srcInferior, '', { zIndex: 10 });
            criarIcone(coord, srcSuperior, '', { zIndex: 11, offsetY: superiorOffsetY });
            criarIcone(coord, srcRobot, '', {
                altura: 32,
                largura: 32,
                offsetX: -4,
                offsetY: robotOffsetY,
                zIndex: 20
            });
            criarIcone(coord, srcVidro, '', {
                altura: vidroAltura,
                offsetY: vidroOffsetY,
                zIndex: 21
            });
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
                if (item.tipo === 'capsula') {
                    criarIconeCapsulaComposto(item.pos, itemDefinitions[item.tipo], item);
                    return;
                }

                let src = '../../assets/personagem/revolver_pegavel.png';
                if (item.tipo === 'restauracao') {
                    src = '../../assets/personagem/restauracao.png';
                } else if (item.tipo === 'municao_plus') {
                    src = '../../assets/personagem/cx_municao.png';
                } else if (item.tipo === 'novelo') {
                    src = '../../assets/personagem/objetos/novelo.png';
                } else if (itemDefinitions[item.tipo] && itemDefinitions[item.tipo].spriteColetavel) {
                    src = itemDefinitions[item.tipo].spriteColetavel;
                }
                console.log(`[EditorRender] Item ${item.tipo} em ${item.pos} -> src: ${src}`);
                criarIcone(item.pos, src, '', { zIndex: 30 });
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

            if (faseData.posicaoMusgoRoboAberto && faseData.posicaoRoboAberto === faseData.posicaoMusgoRoboAberto) {
                criarIcone(faseData.posicaoMusgoRoboAberto, '../../assets/personagem/musgo2.png', '');
            }

            if (faseData.posicaoMusgoRoboDesativado && faseData.posicaoRoboDesativado === faseData.posicaoMusgoRoboDesativado) {
                criarIcone(faseData.posicaoMusgoRoboDesativado, '../../assets/personagem/musgo1.png', '');
            }

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