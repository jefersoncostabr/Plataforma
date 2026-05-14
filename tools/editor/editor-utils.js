(function () {
    const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
    const createEmptyFaseData = window.EditorConfig?.createEmptyFaseData || (() => ({}));
    const COORD_ARRAY_KEYS = window.EditorConfig?.COORD_ARRAY_KEYS || [];

    function rowToLetters(row) {
        if (row < 26) return String.fromCharCode(97 + row);
        return String.fromCharCode(97 + Math.floor(row / 26) - 1) + String.fromCharCode(97 + (row % 26));
    }

    function lettersToRow(letters) {
        if (!letters) return 0;
        if (letters.length === 1) {
            return letters.charCodeAt(0) - 97;
        }
        return (letters.charCodeAt(0) - 97 + 1) * 26 + (letters.charCodeAt(1) - 97);
    }

    function pointToCoord(x, y, tileSize = TILE_SIZE) {
        const col = Math.floor(x / tileSize) + 1;
        const row = Math.floor(y / tileSize);
        return rowToLetters(row) + col;
    }

    function coordToParts(coord) {
        const match = String(coord || '').match(/^([a-z]+)(\d+)$/i);
        if (!match) return null;

        const letters = match[1].toLowerCase();
        const number = Number(match[2]);
        return {
            letters,
            number,
            row: lettersToRow(letters),
            col: number - 1
        };
    }

    function coordToPixels(coord, tileSize = TILE_SIZE) {
        const parts = coordToParts(coord);
        if (!parts) return null;
        return {
            left: parts.col * tileSize,
            bottom: parts.row * tileSize,
            row: parts.row,
            col: parts.col
        };
    }

    function sortCoords(a, b) {
        const aParts = coordToParts(a) || { row: 0, col: 0 };
        const bParts = coordToParts(b) || { row: 0, col: 0 };
        if (aParts.row !== bParts.row) return aParts.row - bParts.row;
        return aParts.col - bParts.col;
    }

    function uniqueCoords(coords = []) {
        return [...new Set((coords || []).filter(Boolean))];
    }

    function normalizarEntradaItem(tipo, entrada) {
        if (typeof entrada === 'string') {
            const pos = entrada.trim();
            return pos ? pos : null;
        }

        if (!entrada || typeof entrada !== 'object') return null;

        const pos = String(entrada.pos || entrada.coord || entrada.position || '').trim();
        if (!pos) return null;

        const itemTipo = String(entrada.tipo || tipo || '').trim() || tipo;
        const normalizado = { ...entrada, tipo: itemTipo, pos };
        delete normalizado.coord;
        delete normalizado.position;

        const chavesExtras = Object.keys(normalizado).filter((key) => !['tipo', 'pos'].includes(key));
        if (chavesExtras.length === 0) return pos;
        return normalizado;
    }

    function normalizeCoordList(coords = []) {
        return uniqueCoords(coords).sort(sortCoords);
    }

    function normalizeItensData(itens = {}) {
        const normalized = {};

        if (Array.isArray(itens)) {
            itens
                .filter(item => item && item.tipo && item.pos)
                .forEach((item) => {
                    if (!Array.isArray(normalized[item.tipo])) normalized[item.tipo] = [];
                    normalized[item.tipo].push(normalizarEntradaItem(item.tipo, item));
                });
        } else if (itens && typeof itens === 'object') {
            Object.entries(itens).forEach(([tipo, posicoes]) => {
                const lista = Array.isArray(posicoes) ? posicoes : [posicoes];
                const entradas = lista
                    .map((entrada) => normalizarEntradaItem(tipo, entrada))
                    .filter(Boolean);
                if (entradas.length > 0) normalized[tipo] = entradas;
            });
        }

        Object.keys(normalized).forEach((tipo) => {
            const entradas = normalized[tipo].filter(Boolean);
            const simples = entradas.every((entrada) => typeof entrada === 'string');
            if (simples) {
                normalized[tipo] = normalizeCoordList(entradas);
            } else {
                const entradasNormalizadas = entradas
                    .map((entrada) => (typeof entrada === 'string' ? { tipo, pos: entrada } : entrada))
                    .filter((entrada) => entrada && entrada.pos);
                const porPosicao = new Map();
                entradasNormalizadas.forEach((entrada) => {
                    porPosicao.set(entrada.pos, entrada);
                });
                normalized[tipo] = [...porPosicao.values()].sort((a, b) => sortCoords(a.pos, b.pos));
            }

            if (normalized[tipo].length === 0) delete normalized[tipo];
        });

        return normalized;
    }

    function iterarItensData(itens = {}) {
        return Object.entries(normalizeItensData(itens)).flatMap(([tipo, coords]) => {
            return coords.map((entrada) => {
                if (typeof entrada === 'string') return { tipo, pos: entrada };
                return { tipo: entrada.tipo || tipo, ...entrada, pos: entrada.pos };
            });
        });
    }

    function exportarItensData(itens = {}) {
        const exported = {};

        Object.entries(normalizeItensData(itens)).forEach(([tipo, coords]) => {
            const serializados = coords.map((entrada) => {
                if (typeof entrada === 'string') return entrada;
                const { tipo: tipoItem, pos, coord, position, ...extras } = entrada;
                if (Object.keys(extras).length === 0) return pos;
                return { pos, ...extras };
            });

            if (serializados.length === 1) exported[tipo] = serializados[0];
            else if (serializados.length > 1) exported[tipo] = serializados;
        });

        return exported;
    }

    function limparCamposVazios(data) {
        if (Array.isArray(data)) {
            return data
                .map(limparCamposVazios)
                .filter((item) => {
                    if (Array.isArray(item)) return item.length > 0;
                    if (item && typeof item === 'object') return Object.keys(item).length > 0;
                    return item !== undefined && item !== null;
                });
        }

        if (data && typeof data === 'object') {
            const limpo = {};

            Object.entries(data).forEach(([key, value]) => {
                const valorLimpo = limparCamposVazios(value);
                const ehArrayVazio = Array.isArray(valorLimpo) && valorLimpo.length === 0;
                const ehObjetoVazio = valorLimpo && typeof valorLimpo === 'object' && !Array.isArray(valorLimpo) && Object.keys(valorLimpo).length === 0;

                if (!ehArrayVazio && !ehObjetoVazio && valorLimpo !== undefined) {
                    limpo[key] = valorLimpo;
                }
            });

            return limpo;
        }

        return data;
    }

    function normalizeFaseData(data = {}) {
        const defaults = createEmptyFaseData();
        const merged = { ...defaults, ...data };

        COORD_ARRAY_KEYS.forEach((key) => {
            const coords = normalizeCoordList(merged[key] || []);
            if (coords.length > 0) merged[key] = coords;
            else delete merged[key];
        });

        merged.itens = normalizeItensData(merged.itens);
        if (Object.keys(merged.itens).length === 0) delete merged.itens;

        merged.inimigoAleatorio = Array.isArray(merged.inimigoAleatorio) && merged.inimigoAleatorio.length >= 2
            ? [Number(merged.inimigoAleatorio[0] || 0), Number(merged.inimigoAleatorio[1] || 0)]
            : [1, 0];

        return limparCamposVazios(merged);
    }

    window.EditorUtils = {
        rowToLetters,
        lettersToRow,
        pointToCoord,
        coordToParts,
        coordToPixels,
        sortCoords,
        uniqueCoords,
        normalizeCoordList,
        normalizeItensData,
        iterarItensData,
        exportarItensData,
        limparCamposVazios,
        normalizeFaseData
    };
})();