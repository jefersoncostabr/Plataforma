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

        function criarIconePosicionado(x, y, src, classe = '', opcoes = {}) {
            const img = document.createElement('img');
            img.src = src;
            img.onerror = () => {
                console.error(`[EditorRender] Erro ao carregar imagem: ${src}`);
            };

            if (classe) {
                const classes = String(classe).trim().split(/\s+/).filter(Boolean);
                if (classes.length) img.classList.add(...classes);
            }

            const escala = Number(opcoes.escala ?? 1);
            const largura = Number(opcoes.largura ?? (TILE_SIZE * escala));
            const altura = Number(opcoes.altura ?? (TILE_SIZE * escala));
            const offsetX = Number(opcoes.offsetX ?? 0);
            const offsetY = Number(opcoes.offsetY ?? 0);
            img.style = `position:absolute; left:${Math.round(Number(x) + offsetX)}px; bottom:${Math.round(Number(y) + offsetY)}px; width:${Math.round(largura)}px; height:${Math.round(altura)}px; image-rendering:pixelated; pointer-events:none;`;
            if (opcoes.zIndex !== undefined) {
                img.style.zIndex = String(opcoes.zIndex);
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

            const defaultTypeByStateKey = new Map();
            PLATFORM_DEFS.forEach((def) => {
                if (!def?.stateKey || !def?.type) return;
                if (!defaultTypeByStateKey.has(def.stateKey)) {
                    defaultTypeByStateKey.set(def.stateKey, def.type);
                }
            });

            const elementos = stage.querySelectorAll('img');
            elementos.forEach(el => el.remove());
            const marcadoresChefe = stage.querySelectorAll('.editor-boss-marker');
            marcadoresChefe.forEach(el => el.remove());

            const fundoFrente = Array.isArray(faseData.fundoFrente) ? faseData.fundoFrente : [];
            fundoFrente.forEach((entrada) => {
                if (!entrada || typeof entrada !== 'object') return;

                const x = Number(entrada.x);
                const y = Number(entrada.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;

                const sprite = (window.EditorUtils?.canonizarIdSpriteFundo || ((valor) => String(valor || '').trim().replace(/\\/g, '/')))(entrada.idSprite || entrada.sprite || entrada.src || '');
                if (!sprite) return;

                const src = sprite.startsWith('assets/')
                    ? `../../${sprite}`
                    : sprite.startsWith('../../assets/')
                        ? sprite
                        : `../../assets/fundo/${sprite.replace(/^\/+/, '')}`;

                criarIconePosicionado(x, y, src, '', {
                    escala: Number(entrada.escala || 1),
                    zIndex: Number.isFinite(Number(entrada.zIndex)) ? Number(entrada.zIndex) : 12,
                    largura: entrada.largura,
                    altura: entrada.altura
                });
            });

            [...PLATFORM_DEFS, ...ENEMY_DEFS].forEach((def) => {
                (faseData[def.stateKey] || []).forEach((entrada) => {
                    const coord = typeof entrada === 'string'
                        ? entrada
                        : String(entrada?.coord || entrada?.pos || '').trim();
                    if (!coord) return;

                    // Quando múltiplos tipos compartilham stateKey, usamos o type salvo na entrada.
                    if (entrada && typeof entrada === 'object' && entrada.type && entrada.type !== def.type) {
                        return;
                    }

                    // Compatibilidade com fases antigas (entrada string sem type explícito).
                    if (typeof entrada === 'string') {
                        const defaultType = defaultTypeByStateKey.get(def.stateKey);
                        if (defaultType && def.type !== defaultType) return;
                    }

                    // (Removido inimigo_bb do render)

                    criarIcone(coord, def.sprite, def.className || '');
                });
            });

            const chefes = Array.isArray(faseData.chefes) ? faseData.chefes : [];
            chefes.forEach((chefe) => {
                const coord = String(chefe?.coord || '').trim();
                const partes = typeof coordToParts === 'function' ? coordToParts(coord) : null;
                if (!partes) return;

                const marker = document.createElement('div');
                marker.className = 'editor-boss-marker';
                marker.textContent = '★';
                marker.title = `Chefe (${Array.isArray(chefe.etapas) ? chefe.etapas.length : 0} etapas)`;
                marker.style.position = 'absolute';
                marker.style.left = (partes.col * TILE_SIZE) + 'px';
                marker.style.bottom = (partes.row * TILE_SIZE) + 'px';
                marker.style.width = `${TILE_SIZE}px`;
                marker.style.height = `${TILE_SIZE}px`;
                marker.style.display = 'flex';
                marker.style.alignItems = 'center';
                marker.style.justifyContent = 'center';
                marker.style.fontSize = '24px';
                marker.style.fontWeight = '700';
                marker.style.color = '#ffd84a';
                marker.style.textShadow = '0 0 8px rgba(255, 216, 74, 0.6)';
                marker.style.pointerEvents = 'none';
                marker.style.zIndex = '42';
                stage.appendChild(marker);
            });

            console.debug('[EditorRender] Render itens - itemDefinitions keys:', Object.keys(itemDefinitions || {}), 'itens raw:', faseData.itens);

            iterarItensData(faseData.itens).forEach((item) => {
                console.debug('[EditorRender] Item:', item);
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
                    } else if (itemDefinitions[item.tipo]) {
                        const defItem = itemDefinitions[item.tipo];
                        src = window.EditorDefinitions?.resolveSpritePath?.(defItem, 'stage')
                            || defItem.spriteColetavel
                            || defItem.spriteMenu
                            || '';
                    }

                if (!src) {
                    console.warn(`[EditorRender] Sprite não encontrado para item=${item.tipo} pos=${item.pos}`);
                    return;
                }

                criarIcone(item.pos, src, '', { zIndex: 30 });
            });

            SYSTEM_DEFS.forEach((def) => {
                const coord = faseData[def.stateKey];
                if (coord) {
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
        }

        return {
            configurarGrade,
            criarIcone,
            criarIconePosicionado,
            atualizarVisual
        };
    }

    window.criarRenderizadorEditor = criarRenderizadorEditor;
})();