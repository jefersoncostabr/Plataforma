(function () {
    const { COORD_ARRAY_KEYS = [] } = window.EditorConfig || {};
    const {
        sortCoords,
        normalizeFaseData,
        exportarItensData = (itens) => itens,
        limparCamposVazios = (data) => data
    } = window.EditorUtils || {};

    function criarExportadorEditor(opcoes = {}) {
        const {
            output,
            getFaseData,
            getRandomConfig,
            onStatusChange
        } = opcoes;

        if (!output || typeof getFaseData !== 'function') {
            throw new Error('Output e getFaseData são obrigatórios para a exportação do editor.');
        }

        const SAVE_SERVER_CANDIDATES = (() => {
            const candidates = [];
            const overrideUrl = window.EDITOR_SAVE_SERVER_URL || window.EditorConfig?.SAVE_SERVER_URL || '';
            const currentOrigin = window.location?.origin || '';

            if (overrideUrl) {
                candidates.push(String(overrideUrl).replace(/\/+$/, ''));
            }

            if (/^https?:/i.test(currentOrigin)) {
                candidates.push(currentOrigin.replace(/\/+$/, ''));
            }

            candidates.push('http://127.0.0.1:3210', 'http://localhost:3210');
            return [...new Set(candidates.filter(Boolean))];
        })();

        let saveServerUrl = SAVE_SERVER_CANDIDATES[0] || 'http://127.0.0.1:3210';
        let arquivoFaseAtual = '';
        let handleArquivoAtual = null;
        let autoSaveTimeoutId = null;
        let ultimoJSONSalvo = '';
        let servidorLocalDisponivel = null;

        function atualizarStatus(mensagem, tipo = 'info') {
            if (typeof onStatusChange === 'function') {
                onStatusChange({ mensagem, tipo, arquivo: arquivoFaseAtual || '' });
            }
        }

        function gerarJSONFase() {
            const faseData = normalizeFaseData(getFaseData());
            const randomConfig = typeof getRandomConfig === 'function'
                ? getRandomConfig()
                : { enabled: true, diff: 1, type: 0 };

            faseData.inimigoAleatorio = randomConfig.enabled
                ? [randomConfig.diff, randomConfig.type]
                : [0, 0];

            COORD_ARRAY_KEYS.forEach((key) => {
                faseData[key] = (faseData[key] || []).sort(sortCoords);
            });

            const dadosExportacao = limparCamposVazios({
                ...faseData,
                itens: exportarItensData(faseData.itens)
            });

            let jsonStr = JSON.stringify(dadosExportacao, null, 4);

            const enemyKeys = COORD_ARRAY_KEYS.filter((key) => key.startsWith('inimigo_'));
            const condensedKeys = [...enemyKeys, 'inimigoAleatorio'];
            const condensedPattern = new RegExp(`"(${condensedKeys.join('|')})":\\s*\\[\\s*([\\s\\S]*?)\\s*\\]`, 'g');

            jsonStr = jsonStr.replace(condensedPattern, (match, key, content) => {
                // Preserva arrays de inimigos quando há entradas em objeto (ex: { coord, skills }).
                if (String(key).startsWith('inimigo_') && String(content).includes('{')) {
                    return match;
                }
                const condensed = content.split('\n')
                    .map(linha => linha.trim().replace(/,$/, ''))
                    .filter(linha => linha !== '')
                    .join(', ');
                return `"${key}": [${condensed}]`;
            });

            const formatarListaCoordenadas = (match, key, content) => {
                // Para inimigos, mantém o formato original para não perder metadados (skills, direção, etc.).
                if (key.startsWith('inimigo_')) {
                    return match;
                }

                const items = Array.from(content.matchAll(/"[^"]+"/g), (resultado) => resultado[0]);
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
                jsonStr = jsonStr.replace(regex, (match, content) => formatarListaCoordenadas(match, key, content));
            });

            return jsonStr;
        }

        function preencherOutput(jsonStr) {
            output.value = jsonStr;
        }

        async function copiarTexto(texto) {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(texto);
                return;
            }

            output.focus();
            output.select();
            document.execCommand('copy');
        }

        async function verificarServidorLocal(force = false) {
            if (!force && servidorLocalDisponivel !== null) {
                return servidorLocalDisponivel;
            }

            for (const candidate of SAVE_SERVER_CANDIDATES) {
                try {
                    const resposta = await fetch(`${candidate}/__editor-save-status`, { cache: 'no-store' });
                    if (resposta.ok) {
                        saveServerUrl = candidate;
                        servidorLocalDisponivel = true;
                        return true;
                    }
                } catch (erro) {
                    // tenta o próximo candidato
                }
            }

            servidorLocalDisponivel = false;
            return false;
        }

        async function salvarViaServidorLocal(jsonStr) {
            const resposta = await fetch(`${saveServerUrl}/save-phase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: arquivoFaseAtual,
                    content: jsonStr
                })
            });

            if (!resposta.ok) {
                let erro = `HTTP ${resposta.status}`;
                try {
                    const data = await resposta.json();
                    if (data?.error) erro = data.error;
                } catch (e) {
                    // mantém fallback do status HTTP
                }
                throw new Error(erro);
            }

            ultimoJSONSalvo = jsonStr;
            atualizarStatus(`salvo automaticamente em ${arquivoFaseAtual}.`, 'success');
            return true;
        }

        async function exportarJSON(opcoesExport = {}) {
            const {
                copiar = true,
                mostrarMensagem = true
            } = opcoesExport;

            const jsonStr = gerarJSONFase();
            preencherOutput(jsonStr);

            if (copiar) {
                try {
                    await copiarTexto(jsonStr);
                    if (mostrarMensagem) alert('JSON copiado!');
                } catch (erro) {
                    atualizarStatus('Falha ao copiar automaticamente.', 'warning');
                    if (mostrarMensagem) {
                        alert('JSON gerado no campo de saída. Copie manualmente se necessário.');
                    }
                }
            }

            return jsonStr;
        }

        function definirArquivoFaseAtual(arquivo) {
            const arquivoNormalizado = String(arquivo || '').trim();
            if (arquivoNormalizado !== arquivoFaseAtual) {
                arquivoFaseAtual = arquivoNormalizado;
                handleArquivoAtual = null;
                ultimoJSONSalvo = '';
            }

            if (arquivoFaseAtual) {
                atualizarStatus(`fase ativa: ${arquivoFaseAtual}`, 'info');
            } else {
                atualizarStatus('aguardando fase ativa.', 'warning');
            }
        }

        function getArquivoFaseAtual() {
            return arquivoFaseAtual;
        }

        function suportaSalvamentoNativo() {
            return typeof window.showSaveFilePicker === 'function' || typeof window.showOpenFilePicker === 'function';
        }

        async function vincularArquivoAtual() {
            if (!arquivoFaseAtual) {
                alert('Carregue uma fase antes de ativar o auto-save.');
                return null;
            }

            const servidorAtivo = await verificarServidorLocal(true);
            if (servidorAtivo) {
                atualizarStatus(`auto-save local ativo para ${arquivoFaseAtual}.`, 'success');
                return { tipo: 'server', arquivo: arquivoFaseAtual };
            }

            if (!suportaSalvamentoNativo()) {
                atualizarStatus('serviço local indisponível; usando rascunho no navegador.', 'warning');
                alert('O serviço local de auto-save não está ativo ainda. O editor seguirá com rascunho no navegador até o serviço ser iniciado.');
                return null;
            }

            const pickerOptions = {
                suggestedName: arquivoFaseAtual,
                excludeAcceptAllOption: false,
                types: [{
                    description: 'Arquivo JSON da fase',
                    accept: { 'application/json': ['.json'] }
                }]
            };

            try {
                atualizarStatus('vinculando arquivo para auto-save...', 'info');

                if (typeof window.showSaveFilePicker === 'function') {
                    handleArquivoAtual = await window.showSaveFilePicker(pickerOptions);
                } else {
                    const handles = await window.showOpenFilePicker({
                        multiple: false,
                        types: pickerOptions.types
                    });
                    handleArquivoAtual = handles?.[0] || null;
                }

                if (handleArquivoAtual) {
                    arquivoFaseAtual = handleArquivoAtual.name || arquivoFaseAtual;
                    atualizarStatus(`arquivo vinculado: ${arquivoFaseAtual}`, 'success');
                }

                return handleArquivoAtual;
            } catch (erro) {
                if (erro?.name === 'AbortError') {
                    atualizarStatus('vinculação cancelada.', 'warning');
                    return null;
                }

                atualizarStatus('erro ao vincular arquivo.', 'error');
                alert('Não foi possível vincular o arquivo para auto-save.\n' + erro.message);
                return null;
            }
        }

        function salvarRascunhoLocal(jsonStr) {
            const chave = arquivoFaseAtual ? `editor-fase-autosave:${arquivoFaseAtual}` : 'editor-fase-autosave:rascunho';
            try {
                localStorage.setItem(chave, jsonStr);
                atualizarStatus('rascunho salvo automaticamente no navegador.', 'warning');
            } catch (erro) {
                atualizarStatus('não foi possível salvar o rascunho local.', 'error');
            }
        }

        async function salvarEmArquivo(jsonStr) {
            if (!handleArquivoAtual) return false;

            const writable = await handleArquivoAtual.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            ultimoJSONSalvo = jsonStr;
            atualizarStatus(`salvo automaticamente em ${arquivoFaseAtual || handleArquivoAtual.name}.`, 'success');
            return true;
        }

        async function salvarAutomaticamenteAgora() {
            const jsonStr = gerarJSONFase();
            preencherOutput(jsonStr);

            if (jsonStr === ultimoJSONSalvo) {
                return { saved: false, mode: 'noop' };
            }

            try {
                const servidorAtivo = arquivoFaseAtual ? await verificarServidorLocal() : false;

                if (arquivoFaseAtual && servidorAtivo) {
                    atualizarStatus('salvando alterações...', 'info');
                    await salvarViaServidorLocal(jsonStr);
                    return {
                        saved: true,
                        mode: 'server',
                        arquivo: arquivoFaseAtual
                    };
                }

                if (arquivoFaseAtual && handleArquivoAtual) {
                    atualizarStatus('salvando alterações...', 'info');
                    await salvarEmArquivo(jsonStr);
                    return {
                        saved: true,
                        mode: 'file',
                        arquivo: arquivoFaseAtual || handleArquivoAtual.name || ''
                    };
                }

                salvarRascunhoLocal(jsonStr);
                return {
                    saved: false,
                    mode: 'local-draft',
                    arquivo: arquivoFaseAtual || ''
                };
            } catch (erro) {
                salvarRascunhoLocal(jsonStr);
                atualizarStatus('falha ao salvar no arquivo; rascunho preservado.', 'error');
                return {
                    saved: false,
                    mode: 'error',
                    arquivo: arquivoFaseAtual || '',
                    error: erro
                };
            }
        }

        function agendarAutoSave(delay = 800) {
            if (autoSaveTimeoutId) {
                window.clearTimeout(autoSaveTimeoutId);
            }

            autoSaveTimeoutId = window.setTimeout(() => {
                atualizarStatus('alterações detectadas; clique em Salvar Fase.', 'warning');
            }, delay);
        }

        return {
            gerarJSONFase,
            exportarJSON,
            definirArquivoFaseAtual,
            setArquivoFaseAtual: definirArquivoFaseAtual,
            getArquivoFaseAtual,
            vincularArquivoAtual,
            salvarAutomaticamenteAgora,
            agendarAutoSave,
            suportaSalvamentoNativo
        };
    }

    window.criarExportadorEditor = criarExportadorEditor;
})();