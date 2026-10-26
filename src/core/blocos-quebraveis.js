(function () {
    const TEMPO_PARA_QUEBRAR_MS = [3000, 2000, 1000];
    const DEBUG = false;

    const estadoBlocos = {};
    const blocoQuebrado = new Set();

    function obterNivelPeso(entidade, contexto) {
        let nivel = 0;

        if (!entidade) return 0;

        const tipo = Number(entidade?.tipo);
        const constantes = window.GAME_CONSTANTS || {};
        const tipos = constantes.TIPOS_INIMIGO || {};

        const ehBBJogador = entidade === window.bbEntidade;
        const ehBBInimigo = entidade?.ehBBInimigo === true;
        const ehPet = entidade === window.caoEntidade || entidade === window.gatoEntidade;

        const ehHumano = tipo === Number(constantes.INIMIGO_HUMANO_ID ?? 13);
        const ehNinja = tipo === Number(tipos[15]?.id ?? 15);

        if (ehBBJogador || ehBBInimigo || ehPet || ehHumano || ehNinja) {
            nivel = 0;
        } else if (contexto === 'jogador') {
            const dentroDoRobo = !!(entidade?.jogadorDentroDoRobo || window.controlandoBB || window.bbEntidade === entidade);
            nivel = dentroDoRobo ? 1 : 0;
        } else {
            nivel = 1;
        }

        const temEquipamentoAtivo =
            (entidade?.temArma && !entidade?.itensGuardadosNoCinto) ||
            entidade?.temEscudo ||
            entidade?.temBota ||
            entidade?.temJetpack ||
            entidade?.temGarra ||
            entidade?.temCinto ||
            entidade?.temColete;

        if (temEquipamentoAtivo) {
            nivel = Math.min(2, nivel + 1);
        }

        return nivel;
    }

    function obterEntidadesAtivas() {
        const entidades = [];
        const vistos = new Set();

        function adicionar(entidade, contexto) {
            if (!entidade) return;
            const id = entidade.__blocoQuebravelId || (entidade.__blocoQuebravelId = Math.random().toString(36).slice(2));
            if (vistos.has(id)) return;
            vistos.add(id);
            entidades.push({ entidade, contexto });
        }

        if (window.playerControle) {
            adicionar(window.playerControle, 'jogador');
        }

        if (window.bbEntidade) {
            adicionar(window.bbEntidade, 'pet');
        }

        for (const inimigo of window.inimigos || []) {
            if (inimigo) {
                adicionar(inimigo, 'inimigo');
            }
        }

        for (const pet of [window.caoEntidade, window.gatoEntidade]) {
            if (pet) {
                adicionar(pet, 'pet');
            }
        }

        return entidades;
    }

    function obterElementoPorCoord(coord) {
        if (!coord) return null;
        const alvo = coord.toLowerCase();
        const layer = window.obterLayer ? window.obterLayer(window.LAYERS.PLATAFORMAS) : document.getElementById('layer-plataformas');
        if (!layer) return null;
        const tiles = layer.querySelectorAll('img');
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            if (tile.dataset.gridCoord === alvo && tile.dataset.quebravel === 'true') {
                return tile;
            }
        }
        return null;
    }

    function obterSuperficieTronco(coord, bloco) {
        if (!bloco) return null;
        const partes = typeof window.parseCoordGrid === 'function' ? window.parseCoordGrid(coord) : null;
        if (!partes) return null;
        const tileSize = 32;
        const row = partes.row;
        const col = partes.col;
        const tileBaixo = row * tileSize;
        const tileTopo = (row + 1) * tileSize;

        if (bloco.tipo === 'meio') {
            if (bloco.direcao === 'inferior') {
                const yOffset = bloco.yOffset !== undefined ? bloco.yOffset : 16;
                const height = bloco.height !== undefined ? bloco.height : 16;
                const topoReal = tileTopo - yOffset;
                return { topo: topoReal, esquerda: col * tileSize, direita: (col + 1) * tileSize };
            }
            if (bloco.direcao === 'superior') {
                const yOffset = bloco.yOffset !== undefined ? bloco.yOffset : 0;
                const topoReal = tileTopo - yOffset;
                return { topo: topoReal, esquerda: col * tileSize, direita: (col + 1) * tileSize };
            }
        }

        return { topo: tileTopo, esquerda: col * tileSize, direita: (col + 1) * tileSize };
    }

    function estaApoiado(entidade, coord, bloco) {
        if (!entidade || !bloco) return false;
        if (entidade.noChao !== true) return false;

        const superficie = obterSuperficieTronco(coord, bloco);
        if (!superficie) return false;

        const xEnt = Number(entidade.x || 0);
        const yEnt = Number(entidade.y || 0);
        const larguraEnt = Number(entidade.largura || 20);
        const alturaEnt = Number(entidade.altura || 32);
        const peY = yEnt;
        const margemVertical = 4;

        if (peY < superficie.topo - margemVertical || peY > superficie.topo + margemVertical) {
            return false;
        }

        const entEsq = xEnt + Number(entidade.offsetX || 0);
        const entDir = entEsq + larguraEnt;
        const troncoEsq = superficie.esquerda;
        const troncoDir = superficie.direita;

        if (entDir < troncoEsq || entEsq > troncoDir) {
            return false;
        }

        return true;
    }

    function quebrarBloco(coord, elemento) {
        if (blocoQuebrado.has(coord)) return;
        if (!window.plataformas || !window.plataformas[coord]) return;

        const blocoInfo = window.plataformas[coord];
        if (!blocoInfo || blocoInfo.quebravel !== true) return;

        blocoQuebrado.add(coord);
        delete estadoBlocos[coord];

        if (!elemento) {
            elemento = obterElementoPorCoord(coord);
        }

        if (elemento && elemento.parentNode) {
            elemento.classList.add('bloco-quebravel-flash');
            setTimeout(() => {
                criarFragmentos(coord, elemento);
            }, 120);
        } else {
            delete window.plataformas[coord];
        }
    }

    function criarFragmentos(coord, elemento) {
        if (!elemento || !elemento.parentNode) {
            delete window.plataformas[coord];
            return;
        }

        const src = elemento.src;
        const left = elemento.style.left;
        const bottom = elemento.style.bottom;
        const width = elemento.style.width || '32px';
        const height = elemento.style.height || '32px';
        const layer = elemento.parentNode;

        const fragEsq = document.createElement('img');
        fragEsq.src = src;
        fragEsq.className = 'fragmento-tronco fragmento-tronco-esquerda';
        fragEsq.style.left = left;
        fragEsq.style.bottom = bottom;
        fragEsq.style.width = width;
        fragEsq.style.height = height;

        const fragDir = document.createElement('img');
        fragDir.src = src;
        fragDir.className = 'fragmento-tronco fragmento-tronco-direita';
        fragDir.style.left = left;
        fragDir.style.bottom = bottom;
        fragDir.style.width = width;
        fragDir.style.height = height;

        layer.appendChild(fragEsq);
        layer.appendChild(fragDir);

        elemento.remove();

        setTimeout(() => {
            fragEsq.remove();
            fragDir.remove();
        }, 400);

        delete window.plataformas[coord];
    }

    function atualizar(dtMs) {
        if (!window.plataformas) return;

        const dt = Math.min(dtMs || 16, 50);
        const entidades = obterEntidadesAtivas();
        const blocosAtivos = new Set();

        for (const coord in window.plataformas) {
            if (!Object.prototype.hasOwnProperty.call(window.plataformas, coord)) continue;
            const bloco = window.plataformas[coord];
            if (!bloco || bloco.quebravel !== true) continue;
            if (bloco.tipoQuebravel !== 'tronco') continue;
            if (blocoQuebrado.has(coord)) continue;

            let temApoio = false;
            let maiorNivel = -1;

            for (let i = 0; i < entidades.length; i++) {
                const item = entidades[i];
                if (estaApoiado(item.entidade, coord, bloco)) {
                    temApoio = true;
                    const nivel = obterNivelPeso(item.entidade, item.contexto);
                    if (nivel > maiorNivel) {
                        maiorNivel = nivel;
                    }
                }
            }

            if (temApoio && maiorNivel >= 0) {
                blocosAtivos.add(coord);
                if (!estadoBlocos[coord]) {
                    estadoBlocos[coord] = { tempo: 0, nivel: maiorNivel };
                } else {
                    estadoBlocos[coord].nivel = maiorNivel;
                }

                estadoBlocos[coord].tempo += dt;
                const tempoNecessario = TEMPO_PARA_QUEBRAR_MS[estadoBlocos[coord].nivel] || 3000;

                if (estadoBlocos[coord].tempo >= tempoNecessario) {
                    const elemento = obterElementoPorCoord(coord);
                    quebrarBloco(coord, elemento);
                }
            } else {
                if (estadoBlocos[coord]) {
                    delete estadoBlocos[coord];
                }
            }
        }

        for (const coord in estadoBlocos) {
            if (!Object.prototype.hasOwnProperty.call(estadoBlocos, coord)) continue;
            if (!blocosAtivos.has(coord)) {
                delete estadoBlocos[coord];
            }
        }
    }

    let ultimoTempo = performance.now();
    function loop() {
        const agora = performance.now();
        const dt = agora - ultimoTempo;
        ultimoTempo = agora;
        try {
            atualizar(dt);
        } catch (e) {
            if (DEBUG) console.error(e);
        }
        requestAnimationFrame(loop);
    }

    window.BlocosQuebraveis = {
        obterNivelPeso,
        quebrar: quebrarBloco
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ultimoTempo = performance.now();
            requestAnimationFrame(loop);
        });
    } else {
        ultimoTempo = performance.now();
        requestAnimationFrame(loop);
    }
})();
