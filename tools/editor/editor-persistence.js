(function () {
    const { COORD_ARRAY_KEYS = [] } = window.EditorConfig || {};
    const { sortCoords, normalizeFaseData } = window.EditorUtils || {};

    function criarPersistenciaEditor(opcoes = {}) {
        const {
            output,
            getFaseData,
            setFaseData,
            getRandomConfig,
            aplicarEstadoUI
        } = opcoes;

        if (!output || typeof getFaseData !== 'function' || typeof setFaseData !== 'function') {
            throw new Error('Output, getFaseData e setFaseData são obrigatórios para a persistência do editor.');
        }

        function exportarJSON() {
            const faseData = getFaseData();
            const randomConfig = typeof getRandomConfig === 'function' ? getRandomConfig() : { enabled: true, diff: 1, type: 0 };
            faseData.inimigoAleatorio = randomConfig.enabled ? [randomConfig.diff, randomConfig.type] : [0, 0];

            COORD_ARRAY_KEYS.forEach((key) => {
                faseData[key] = (faseData[key] || []).sort(sortCoords);
            });

            let jsonStr = JSON.stringify(faseData, null, 4);

            jsonStr = jsonStr.replace(/"(inimigos\d|inimigoAleatorio)":\s*\[\s*([\s\S]*?)\s*\]/g, (match, key, content) => {
                const condensed = content.split('\n')
                    .map(l => l.trim().replace(/,$/, ''))
                    .filter(l => l !== '')
                    .join(', ');
                return `"${key}": [${condensed}]`;
            });

            const formatarPlataformas = (match, key, content) => {
                const items = content.split('\n').map(l => l.trim()).filter(l => l !== '').map(v => v.replace(/,/g, ''));
                if (items.length === 0) return `"${key}": []`;

                const rows = [];
                let currentLine = [];
                let lastLetter = '';

                items.forEach((item) => {
                    const val = item.trim();
                    const letterMatch = val.match(/"([a-z]+)\d+"/);
                    const letter = letterMatch ? letterMatch[1] : '';

                    if (lastLetter && letter !== lastLetter) {
                        rows.push('        ' + currentLine.join(', '));
                        currentLine = [];
                    }
                    currentLine.push(val);
                    lastLetter = letter;
                });

                if (currentLine.length > 0) rows.push('        ' + currentLine.join(', '));
                return `"${key}": [\n${rows.join(',\n')}\n    ]`;
            };

            COORD_ARRAY_KEYS.forEach((key) => {
                const regex = new RegExp(`"${key}":\\s*\\[\\s*([\\s\\S]*?)\\s*\\]`, 'g');
                jsonStr = jsonStr.replace(regex, (m, c) => formatarPlataformas(m, key, c));
            });

            output.value = jsonStr;
            output.select();
            document.execCommand('copy');
            alert('JSON copiado!');
        }

        function carregarJSONTexto(jsonStr, opcoes = {}) {
            const { mostrarMensagem = true, mensagemSucesso = 'Fase carregada com sucesso!' } = opcoes;
            const texto = String(jsonStr || '').trim();
            if (!texto) return null;

            try {
                const data = JSON.parse(texto);
                const normalized = normalizeFaseData(data);
                setFaseData(normalized);
                if (typeof aplicarEstadoUI === 'function') aplicarEstadoUI(normalized);
                output.value = JSON.stringify(normalized, null, 4);
                if (mostrarMensagem) alert(mensagemSucesso);
                return normalized;
            } catch (e) {
                alert('Erro ao importar JSON: Verifique se o código está correto.\n' + e.message);
                return null;
            }
        }

        function importarJSON() {
            return carregarJSONTexto(output.value.trim(), { mostrarMensagem: true });
        }

        return {
            exportarJSON,
            importarJSON,
            carregarJSONTexto
        };
    }

    window.criarPersistenciaEditor = criarPersistenciaEditor;
})();