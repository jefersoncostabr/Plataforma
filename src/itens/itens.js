/**
 * Gerencia a criação e o estado dos itens coletáveis no jogo.
 */

// Array global para armazenar todos os itens coletáveis ativos no palco.
// É importante que este array seja acessível globalmente para o loop de atualização do jogo.
window.itensColetaveis = [];
window.itemDefinitions = {};

window.atualizarVisualItemColetavel = function(item, opcoes = {}) {
    if (!item || !item.elemento) return;

    const x = Number(opcoes.x ?? item.x ?? 0);
    const y = Number(opcoes.y ?? item.y ?? 0);
    const elementoOffsetX = Number(item.elementoOffsetX ?? 0);
    const elementoOffsetY = Number(item.elementoOffsetY ?? 0);
    const transform = opcoes.transform ?? null;

    item.elemento.style.left = (x + elementoOffsetX) + 'px';
    item.elemento.style.bottom = (y + elementoOffsetY) + 'px';
    if (transform !== null) item.elemento.style.transform = transform;

    const extras = Array.isArray(item.elementosExtras) ? item.elementosExtras : [];
    extras.forEach((extra) => {
        if (!extra?.elemento) return;
        const offsetX = Number(extra.offsetX ?? 0);
        const offsetY = Number(extra.offsetY ?? 0);
        extra.elemento.style.left = (x + offsetX) + 'px';
        extra.elemento.style.bottom = (y + offsetY) + 'px';
        if (transform !== null) extra.elemento.style.transform = transform;
    });

    if (item.elementoRobot) {
        item.elementoRobot.src = item.robotEstado === 'desativado'
            ? '../../assets/personagem/robo_desativado.png'
            : '../../assets/personagem/per_aberto.png';
    }

    if (item.vidroQuebrado && item.vidroElemento) {
        item.vidroElemento.style.display = 'none';
    }
};

window.danificarVidroCapsula = function(item, dano = 1, opcoes = {}) {
    if (!item || item.tipo !== 'capsula') return false;
    if (item.vidroQuebrado || item.vidroEmDano) return false;

    item.vidroEmDano = true;

    const elementoVidro = item.vidroElemento || item.elemento;
    const duracao = Number(opcoes.duracao ?? 420);
    const velocidade = Number(opcoes.velocidade ?? 10);

    if (typeof flashElement === 'function' && elementoVidro) {
        flashElement(elementoVidro, duracao, velocidade);
    }

    const finalizar = () => {
        item.vidroQuebrado = true;
        item.vidroEmDano = false;
        if (elementoVidro) {
            elementoVidro.style.display = 'none';
        }
    };

    setTimeout(finalizar, duracao);
    return true;
};

window.removerVisualItemColetavel = function(item) {
    if (!item) return;

    const extras = Array.isArray(item.elementosExtras) ? item.elementosExtras : [];
    extras.forEach((extra) => {
        if (extra?.elemento?.parentNode) {
            extra.elemento.parentNode.removeChild(extra.elemento);
        }
    });

    if (item.elemento?.parentNode) {
        item.elemento.parentNode.removeChild(item.elemento);
    }
};

/**
 * Carrega as definições de todos os itens a partir dos arquivos JSON.
 */
window.carregarItemDefinitions = async function() {
    const tipos = ["revolver", "escudo", "bota", "jetpack", "garra", "cinto", "colete", "restauracao", "scrap", "capsula"];
    for (const tipo of tipos) {
        try {
            // Tenta carregar o JSON. O caminho assume que o jogo roda da raiz.
            const resp = await fetch(`config/items/${tipo}.json`);
            if (resp.ok) {
                const data = await resp.json();
                window.itemDefinitions[data.id] = data;
            }
        } catch (e) { console.error(`Erro ao carregar item ${tipo}:`, e); }
    }
};

/**
 * Cria um elemento visual para um item coletável e o adiciona ao palco do jogo.
 *
 * @param {object} itemData - Objeto contendo os dados do item (id, nome, spriteColetavel, efeitos, etc.).
 * @param {number} x - Posição X (em pixels) onde o item será criado.
 * @param {number} y - Posição Y (em pixels) onde o item será criado.
 * @returns {object} O objeto do item criado, incluindo seu elemento HTML.
 */
window.criarItemColetavel = function(itemData, x, y, extras = {}) {
    const anexarAoPalco = (elemento, layerPreferido = null) => {
        if (layerPreferido && window.LAYERS && typeof adicionarAoLayer === 'function') {
            adicionarAoLayer(elemento, layerPreferido);
            return;
        }

        if (window.LAYERS && window.LAYERS.ITENS && typeof adicionarAoLayer === 'function') {
            adicionarAoLayer(elemento, window.LAYERS.ITENS);
            return;
        }

        const gameStage = document.getElementById('game-stage');
        if (gameStage) {
            gameStage.appendChild(elemento);
        } else {
            document.body.appendChild(elemento);
        }
    };

    const criarSprite = ({ src, largura = 32, altura = 32, left = x, bottom = y, zIndex = 5, layer = null }) => {
        const img = document.createElement('img');
        img.src = src;
        img.style.position = 'absolute';
        img.style.width = largura + 'px';
        img.style.height = altura + 'px';
        img.style.left = left + 'px';
        img.style.bottom = bottom + 'px';
        img.style.zIndex = String(zIndex);
        img.style.imageRendering = 'pixelated';
        img.style.pointerEvents = 'none';
        anexarAoPalco(img, layer);
        return img;
    };

    if (itemData.id === 'capsula') {
        const spriteComposto = itemData.spriteComposto || {};
        const srcInferior = spriteComposto.inferior || '../../assets/personagem/capsula/capsula_inferior.png';
        const srcSuperior = spriteComposto.superior || '../../assets/personagem/capsula/capsula_superior.png';
        const srcVidro = spriteComposto.vidro || '../../assets/personagem/capsula/capsula_vidro.png';
        const robotEstado = extras.robotEstado || itemData.robotEstado || itemData.estadoRobo || 'aberto';
        const srcRobot = robotEstado === 'desativado'
            ? '../../assets/personagem/robo_desativado.png'
            : '../../assets/personagem/per_aberto.png';
        const superiorOffsetY = Number(spriteComposto.superiorOffsetY ?? 32);
        const vidroAltura = Number(spriteComposto.vidroAltura ?? 10);
        const vidroOffsetY = Number(spriteComposto.vidroOffsetY ?? 27);
        const robotOffsetY = Number(spriteComposto.robotOffsetY ?? 14);

        const parteInferior = criarSprite({
            src: srcInferior,
            layer: window.LAYERS?.DECORACOES,
            zIndex: 12
        });
        const parteSuperior = criarSprite({
            src: srcSuperior,
            bottom: y + superiorOffsetY,
            layer: window.LAYERS?.DECORACOES,
            zIndex: 13
        });
        const parteVidro = criarSprite({
            src: srcVidro,
            altura: vidroAltura,
            bottom: y + vidroOffsetY,
            layer: window.LAYERS?.ITENS,
            zIndex: 24
        });
        const parteRobot = criarSprite({
            src: srcRobot,
            bottom: y + robotOffsetY,
            layer: window.LAYERS?.ITENS,
            zIndex: 20
        });

        const itemCapsula = {
            id: itemData.id,
            tipo: itemData.id,
            nome: itemData.nome,
            x: x,
            y: y,
            elemento: parteVidro,
            vidroElemento: parteVidro,
            elementoOffsetX: 0,
            elementoOffsetY: vidroOffsetY,
            vidroAltura,
            vidroOffsetY,
            elementoRobot: parteRobot,
            robotEstado,
            coletavel: itemData.coletavel !== false,
            elementosExtras: [
                { elemento: parteInferior, offsetX: 0, offsetY: 0 },
                { elemento: parteSuperior, offsetX: 0, offsetY: superiorOffsetY },
                { elemento: parteRobot, offsetX: 0, offsetY: robotOffsetY }
            ],
            velocidadeY: 0,
        };

        window.atualizarVisualItemColetavel(itemCapsula, { x, y });
        return itemCapsula;
    }

    const itemImg = document.createElement('img');
    itemImg.src = itemData.spriteColetavel;
    itemImg.style.position = 'absolute';
    itemImg.style.width = '32px'; // Assumindo tamanho padrão de tile
    itemImg.style.height = '32px'; // Assumindo tamanho padrão de tile
    itemImg.style.left = x + 'px';
    itemImg.style.bottom = y + 'px';
    itemImg.style.zIndex = String(itemData.zIndex ?? 5); // Z-index padrão, pode ser sobrescrito
    itemImg.style.imageRendering = 'pixelated';
    itemImg.style.pointerEvents = 'none'; // Itens não devem bloquear eventos do mouse

    // Adiciona ao layer de itens, se disponível, ou diretamente ao body/game-stage
    if (window.LAYERS && window.LAYERS.ITENS && typeof adicionarAoLayer === 'function') {
        adicionarAoLayer(itemImg, window.LAYERS.ITENS);
    } else {
        // Fallback se o sistema de layers não estiver pronto ou não for usado
        const gameStage = document.getElementById('game-stage');
        if (gameStage) {
            gameStage.appendChild(itemImg);
        } else {
            document.body.appendChild(itemImg);
        }
    }

    // Retorna o objeto do item para ser adicionado a window.itensColetaveis
    const itemPadrao = {
        id: itemData.id,
        tipo: itemData.id,
        nome: itemData.nome,
        x: x,
        y: y,
        elemento: itemImg,
        coletavel: itemData.coletavel !== false,
        velocidadeY: 0, // Inicia sem velocidade vertical, gravidade será aplicada
        // Outras propriedades do item podem ser adicionadas aqui, se necessário
    };

    window.atualizarVisualItemColetavel(itemPadrao, { x, y });
    return itemPadrao;
};

/**
 * Limpa todos os itens coletáveis existentes no palco e cria novos baseados nos dados da fase.
 *
 * @param {Array<object>|Object<string, string|string[]>} itensFase - Estrutura legada ou mapa por tipo de item.
 */
window.resetarItens = function(itensFase) {
    const itensNormalizados = Array.isArray(itensFase)
        ? itensFase
            .filter(item => item && item.tipo && item.pos)
            .map(item => ({ ...item, tipo: item.tipo, pos: item.pos }))
        : Object.entries(itensFase || {}).flatMap(([tipo, posicoes]) => {
            const lista = Array.isArray(posicoes) ? posicoes : [posicoes];
            return lista
                .filter(Boolean)
                .map((entrada) => {
                    if (typeof entrada === 'string') return { tipo, pos: entrada };
                    return { ...entrada, tipo: entrada.tipo || tipo, pos: entrada.pos || entrada.coord || entrada.position };
                })
                .filter((item) => item.pos);
        });

    // Remove todos os elementos visuais dos itens antigos
    window.itensColetaveis.forEach(item => {
        if (typeof window.removerVisualItemColetavel === 'function') {
            window.removerVisualItemColetavel(item);
        } else if (item.elemento && item.elemento.parentNode) {
            item.elemento.parentNode.removeChild(item.elemento);
        }
    });
    window.itensColetaveis = []; // Limpa o array de itens

    // Cria novos itens baseados nos dados da fase
    itensNormalizados.forEach(itemDataFase => {
        const itemDef = window.itemDefinitions[itemDataFase.tipo];
        if (itemDef) {
            const posPixels = window.gridParaPixels(itemDataFase.pos);
            const novoItem = window.criarItemColetavel(itemDef, posPixels.x, posPixels.y, {
                robotEstado: itemDataFase.robotEstado || itemDataFase.estadoRobo || 'aberto'
            });
            window.itensColetaveis.push(novoItem);
        } else {
            console.warn(`Definição de item não encontrada para o tipo: ${itemDataFase.tipo}. Item não será criado.`);
        }
    });
};