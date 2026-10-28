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

        const fragCima = document.createElement('img');
        fragCima.src = src;
        fragCima.className = 'fragmento-tronco fragmento-tronco-cima';
        fragCima.style.left = left;
        fragCima.style.bottom = bottom;
        fragCima.style.width = width;
        fragCima.style.height = height;

        const fragBaixo = document.createElement('img');
        fragBaixo.src = src;
        fragBaixo.className = 'fragmento-tronco fragmento-tronco-baixo';
        fragBaixo.style.left = left;
        fragBaixo.style.bottom = bottom;
        fragBaixo.style.width = width;
        fragBaixo.style.height = height;

        layer.appendChild(fragCima);
        layer.appendChild(fragBaixo);

        elemento.remove();

        setTimeout(() => {
            fragCima.remove();
            fragBaixo.remove();
        }, 400);

        delete window.plataformas[coord];
    }

    function receberDano(coord, dano = 1, origem = 'desconhecida') {
        const chave = String(coord || '').trim().toLowerCase();
        const bloco = window.plataformas?.[chave];

        if (!bloco || bloco.quebravel !== true || bloco.tipoQuebravel !== 'troncoVertical') {
            console.warn('[TroncoVertical] Dano ignorado: coordenada não aponta para tronco vertical quebrável.', {
                coord: chave,
                bloco
            });
            return false;
        }

        const vidaAntes = Number(bloco.vidaAtual ?? bloco.vidaMax ?? 6);
        const danoAplicado = Math.max(1, Number(dano) || 1);
        bloco.vidaMax = Number(bloco.vidaMax ?? 6);
        bloco.vidaAtual = Math.max(0, vidaAntes - danoAplicado);

        const elemento = obterElementoPorCoord(chave);
        window.AudioManager?.playSFX('impacto', 0.65);

        const partesCoord = typeof window.parseCoordGrid === 'function'
            ? window.parseCoordGrid(chave)
            : null;
        const impactoX = partesCoord
            ? (partesCoord.col * 32) + 16
            : (parseFloat(elemento?.style.left) || 0) + 16;
        const impactoY = partesCoord
            ? (partesCoord.row * 32) + 16
            : (parseFloat(elemento?.style.bottom) || 0) + 16;

        if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
            window.criarAnimacaoImpacto2Frames({
                x: impactoX,
                y: impactoY,
                largura: 28,
                altura: 28,
                frameDurationMs: 55,
                opacidade: 1
            });
        } else {
            console.warn('[TroncoVertical] VFX de impacto indisponível: criarAnimacaoImpacto2Frames não foi carregada.');
        }

        if (elemento) {
            elemento.classList.remove('bloco-quebravel-flash');
            void elemento.offsetWidth;
            elemento.classList.add('bloco-quebravel-flash');
        } else {
            console.warn(`[TroncoVertical] Não encontrei o elemento visual para ${chave}.`, {
                seletorEsperado: 'img[data-grid-coord][data-quebravel="true"]'
            });
        }

        if (bloco.vidaAtual <= 0) {
            window.AudioManager?.playSFX('madeira_quebrando.mp3', 0.75);
            quebrarBloco(chave, elemento);
        }

        return true;
    }

    function receberDanoPorHitbox(hitbox, dano = 1, atingidosNesteAtaque) {
        if (!hitbox || !window.plataformas || typeof window.parseCoordGrid !== 'function') return false;

        for (const [coord, bloco] of Object.entries(window.plataformas)) {
            if (
                !bloco
                || bloco.tipo !== 'tronco'
                || bloco.quebravel !== true
                || bloco.tipoQuebravel !== 'troncoVertical'
            ) continue;

            if (atingidosNesteAtaque instanceof Set && atingidosNesteAtaque.has(coord)) continue;

            const partes = window.parseCoordGrid(coord);
            if (!partes) continue;

            const esquerdaBloco = partes.col * 32 + Number(bloco.xOffset || 0);
            const direitaBloco = esquerdaBloco + Number(bloco.width || 32);
            const baixoBloco = partes.row * 32;
            const topoBloco = baixoBloco + Number(bloco.height || 32);
            const esquerdaAtaque = Number(hitbox.x || 0);
            const direitaAtaque = esquerdaAtaque + Number(hitbox.largura || 0);
            const baixoAtaque = Number(hitbox.y || 0);
            const topoAtaque = baixoAtaque + Number(hitbox.altura || 0);
            const sobrepoe = direitaAtaque > esquerdaBloco
                && esquerdaAtaque < direitaBloco
                && topoAtaque > baixoBloco
                && baixoAtaque < topoBloco;

            if (!sobrepoe) continue;

            if (atingidosNesteAtaque instanceof Set) atingidosNesteAtaque.add(coord);
            receberDano(coord, dano, 'chute');
            return true;
        }

        return false;
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

    function reiniciarFase() {
        for (const coord of Object.keys(estadoBlocos)) delete estadoBlocos[coord];
        blocoQuebrado.clear();
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
        quebrar: quebrarBloco,
        receberDano,
        receberDanoPorHitbox,
        reiniciarFase
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
