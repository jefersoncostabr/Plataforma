(function () {
    const {
        normalizeFaseData = (data) => data,
        exportarItensData = (itens) => itens,
        limparCamposVazios = (data) => data
    } = window.EditorUtils || {};

    function criarPersistenciaEditor(opcoes = {}) {
        const {
            output,
            getFaseData,
            setFaseData,
            getRandomConfig,
            aplicarEstadoUI,
            onStatusChange
        } = opcoes;

        if (!output || typeof getFaseData !== 'function' || typeof setFaseData !== 'function') {
            throw new Error('Output, getFaseData e setFaseData são obrigatórios para a persistência do editor.');
        }

        const exportador = typeof window.criarExportadorEditor === 'function'
            ? window.criarExportadorEditor({
                output,
                getFaseData,
                getRandomConfig,
                onStatusChange
            })
            : null;

        function exportarJSON() {
            if (exportador && typeof exportador.exportarJSON === 'function') {
                return exportador.exportarJSON();
            }

            const faseData = normalizeFaseData(getFaseData());
            output.value = JSON.stringify(limparCamposVazios({
                ...faseData,
                itens: exportarItensData(faseData.itens)
            }), null, 4);
            output.select();
            document.execCommand('copy');
            alert('JSON copiado!');
            return output.value;
        }

        function carregarJSONTexto(jsonStr, opcoes = {}) {
            const { mostrarMensagem = true, mensagemSucesso = 'Fase carregada com sucesso!' } = opcoes;
            const texto = String(jsonStr || '').trim();
            if (!texto) return null;

            try {
                const data = JSON.parse(texto);
                const normalized = normalizeFaseData(data);
                console.debug('[Editor] carregarJSONTexto', {
                    proporcao: normalized.proporcao,
                    posicaoInicialJogador: normalized.posicaoInicialJogador || '',
                    objetivo: normalized.objetivo || '',
                    tamanhoTexto: texto.length
                });
                setFaseData(normalized, { autoSave: false, origem: 'carregamento-json' });
                if (typeof aplicarEstadoUI === 'function') aplicarEstadoUI(normalized);
                output.value = JSON.stringify(limparCamposVazios({
                    ...normalized,
                    itens: exportarItensData(normalized.itens)
                }), null, 4);
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
            carregarJSONTexto,
            setArquivoFaseAtual: (arquivo) => exportador?.setArquivoFaseAtual?.(arquivo),
            getArquivoFaseAtual: () => exportador?.getArquivoFaseAtual?.() || '',
            vincularArquivoAtual: () => exportador?.vincularArquivoAtual?.(),
            salvarAutomaticamenteAgora: () => exportador?.salvarAutomaticamenteAgora?.(),
            agendarAutoSave: (delay) => exportador?.agendarAutoSave?.(delay)
        };
    }

    window.criarPersistenciaEditor = criarPersistenciaEditor;
})();