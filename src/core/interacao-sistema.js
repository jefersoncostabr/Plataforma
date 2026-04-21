(function () {
    const MAPEAMENTO_INTERACOES_PATH = 'config/interacoes/mapeamento.json';
    let cacheInteracoes = null;
    let overlayAtual = null;
    let onKeyDownAtual = null;

    window.isInteractionMenuOpen = false;
    window.interactionPauseApplied = false;
    window.interactionMenuContext = null;

    function normalizarChave(valor) {
        return String(valor || '').trim().toLowerCase();
    }

    function obterRaizUI() {
        return document.getElementById('jogo-container') || document.body || document.getElementById('layer-ui');
    }

    async function carregarMapeamentoInteracoes(force = false) {
        if (cacheInteracoes && !force) return cacheInteracoes;

        try {
            const resposta = await fetch(MAPEAMENTO_INTERACOES_PATH, { cache: 'no-store' });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const dados = await resposta.json();
            const mapa = new Map();

            (dados.elementos || []).forEach((item) => {
                if (!item?.id) return;
                mapa.set(normalizarChave(item.id), { ...item });
            });

            cacheInteracoes = mapa;
            return mapa;
        } catch (error) {
            console.warn('Interação: falha ao carregar mapeamento.', error);
            cacheInteracoes = new Map();
            return cacheInteracoes;
        }
    }

    function obterRetangulo(entidade = {}, larguraPadrao = 32, alturaPadrao = 32) {
        const x = Number(entidade.x || 0);
        const y = Number(entidade.y || 0);
        const largura = Number(entidade.largura || larguraPadrao);
        const altura = Number(entidade.altura || alturaPadrao);
        return {
            left: x,
            right: x + largura,
            bottom: y,
            top: y + altura
        };
    }

    function estaSobreBase(controle, craft) {
        if (!controle || !craft) return false;

        const jogador = obterRetangulo(controle, controle.largura || 20, controle.altura || 32);
        const base = obterRetangulo(craft, craft.largura || 32, craft.altura || 32);

        const sobrepoeHorizontal = jogador.left < (base.right - 4) && jogador.right > (base.left + 4);
        const sobrepoeVertical = jogador.bottom < (base.top + 8) && jogador.top > (base.bottom + 4);

        return sobrepoeHorizontal && sobrepoeVertical;
    }

    function obterCraftSobJogador(controle) {
        return (window.craftsAtivos || []).find((craft) => estaSobreBase(controle, craft)) || null;
    }

    function montarContextoCraft(craft) {
        return {
            craftId: String(craft?.id || ''),
            nivel: String(craft?.nivel || 1),
            modoRenascimento: String(craft?.modoRenascimento || ''),
            sprite: craft?.elementos?.[Math.max(0, Number(craft?.nivel || 1) - 1)]?.src
                || craft?.elementos?.[0]?.src
                || 'assets/craft/craft_nivel1.png'
        };
    }

    function preencherCampos(container, contexto = {}) {
        container.querySelectorAll('[data-interaction-field]').forEach((node) => {
            const chave = node.getAttribute('data-interaction-field');
            node.textContent = contexto[chave] ?? '-';
        });
    }

    function atualizarEstadoBotoesModo(container, modoAtual = null) {
        container.querySelectorAll('[data-interaction-mode]').forEach((botao) => {
            const ativo = botao.getAttribute('data-interaction-mode') === modoAtual;
            botao.classList.toggle('active', ativo);
            botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
    }

    function atualizarDisponibilidadeBotoesModo(container, nivelAtual = 0) {
        container.querySelectorAll('[data-interaction-mode]').forEach((botao) => {
            const nivelMinimo = Number(botao.getAttribute('data-min-level') || 0);
            const liberado = Number(nivelAtual || 0) >= nivelMinimo;
            botao.disabled = !liberado;
            botao.classList.toggle('is-locked', !liberado);
            botao.title = liberado
                ? ''
                : `Libera no nível ${nivelMinimo}`;
        });
    }

    function obterElementosNavegaveis(container) {
        if (!container) return [];

        return Array.from(container.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
            .filter((elemento) => {
                if (elemento.disabled) return false;
                if (elemento.getAttribute('aria-hidden') === 'true') return false;
                const estilo = window.getComputedStyle(elemento);
                return estilo.display !== 'none' && estilo.visibility !== 'hidden';
            });
    }

    function moverFocoNavegacao(container, direcao = 1) {
        const navegaveis = obterElementosNavegaveis(container);
        if (!navegaveis.length) return;

        const atual = document.activeElement;
        const indiceAtual = navegaveis.indexOf(atual);
        const proximoIndice = indiceAtual >= 0
            ? (indiceAtual + direcao + navegaveis.length) % navegaveis.length
            : 0;

        navegaveis[proximoIndice]?.focus();
    }

    function obterResumoEquipamentoSalvo() {
        const checkpoint = typeof window.carregarCheckpointEquipamentoSalvo === 'function'
            ? window.carregarCheckpointEquipamentoSalvo()
            : null;

        if (!checkpoint || typeof checkpoint !== 'object') {
            return { itens: [], municao: 0, meta: 'Nenhum equipamento salvo nesta base ainda.' };
        }

        const vistos = new Set();
        const itens = [];
        const adicionarItem = (tipo, rotulo) => {
            const chave = String(tipo || '').trim().toLowerCase();
            if (!chave || vistos.has(chave)) return;
            vistos.add(chave);

            const definicao = window.itemDefinitions?.[chave] || null;
            itens.push({
                tipo: chave,
                rotulo: rotulo || definicao?.nome || chave,
                sprite: definicao?.spriteColetavel || definicao?.spriteEquipado || ''
            });
        };

        if (checkpoint.temArma) adicionarItem('revolver', 'Revólver');
        if (checkpoint.temEscudo) adicionarItem('escudo', 'Escudo');
        if (checkpoint.temBota) adicionarItem('bota', 'Bota');
        if (checkpoint.temJetpack) adicionarItem('jetpack', 'Jetpack');
        if (checkpoint.temGarra) adicionarItem('garra', 'Garra');
        if (checkpoint.temCinto) adicionarItem('cinto', 'Cinto');
        if (checkpoint.temColete) adicionarItem('colete', 'Colete');

        const inventario = Array.isArray(checkpoint.inventario) ? checkpoint.inventario : [];
        inventario.forEach((tipo) => adicionarItem(tipo));

        const salvoEm = Number(checkpoint.salvoEm || 0);
        const meta = Number.isFinite(salvoEm) && salvoEm > 0
            ? `Último save: ${new Date(salvoEm).toLocaleString('pt-BR')}`
            : 'Checkpoint pronto para o próximo reinício.';

        return {
            itens,
            municao: Number(checkpoint.municao || 0),
            meta
        };
    }

    function atualizarResumoEquipamentoSalvo(container) {
        if (!container) return;

        const lista = container.querySelector('[data-interaction-saved-equip]');
        const meta = container.querySelector('[data-interaction-saved-meta]');
        if (!lista || !meta) return;

        const resumo = obterResumoEquipamentoSalvo();
        lista.innerHTML = '';

        if (!resumo.itens.length) {
            const vazio = document.createElement('span');
            vazio.className = 'base-saved-empty';
            vazio.textContent = '—';
            lista.appendChild(vazio);
        } else {
            resumo.itens.forEach((item) => {
                const icone = document.createElement('span');
                icone.className = 'base-saved-icon';
                icone.title = item.rotulo || item.tipo;
                icone.setAttribute('aria-label', item.rotulo || item.tipo);

                const img = document.createElement('img');
                img.alt = item.rotulo || item.tipo;
                img.src = item.sprite || '';
                icone.appendChild(img);

                if (item.tipo === 'revolver' && resumo.municao > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'base-saved-count';
                    badge.textContent = String(resumo.municao);
                    icone.appendChild(badge);
                }

                lista.appendChild(icone);
            });
        }

        meta.textContent = resumo.meta;
    }

    function removerEventosAtuais() {
        if (onKeyDownAtual) {
            document.removeEventListener('keydown', onKeyDownAtual);
            onKeyDownAtual = null;
        }
    }

    function definirFeedbackInteracao(mensagem = '', erro = false) {
        const feedback = overlayAtual?.querySelector('[data-interaction-feedback]');
        if (!feedback) return;
        feedback.textContent = mensagem;
        feedback.style.borderLeftColor = erro ? '#ff8f8f' : '#7cc9ff';
        feedback.style.background = erro ? 'rgba(255, 120, 120, 0.14)' : 'rgba(124, 201, 255, 0.12)';
    }

    function fecharTelaInteracao() {
        removerEventosAtuais();

        if (overlayAtual?.remove) {
            overlayAtual.remove();
        }
        overlayAtual = null;

        if (window.interactionPauseApplied && window.isPaused && typeof window.togglePause === 'function') {
            window.togglePause();
        }

        window.isInteractionMenuOpen = false;
        window.interactionPauseApplied = false;
        window.interactionMenuContext = null;
        return true;
    }

    async function abrirTelaInteracao(id, contexto = {}) {
        const mapa = await carregarMapeamentoInteracoes();
        const definicao = mapa.get(normalizarChave(id));
        if (!definicao?.arquivo) {
            console.warn(`Interação: definição não encontrada para ${id}.`);
            return false;
        }

        const resposta = await fetch(definicao.arquivo, { cache: 'no-store' });
        if (!resposta.ok) {
            throw new Error(`Não foi possível carregar a tela ${definicao.arquivo} (HTTP ${resposta.status}).`);
        }

        const corpoHtml = await resposta.text();
        fecharTelaInteracao();

        const overlay = document.createElement('div');
        overlay.className = 'interaction-overlay';
        overlay.innerHTML = `
            <div class="interaction-modal" role="dialog" aria-modal="true" aria-label="${definicao.titulo || 'Interação'}">
                <div class="interaction-header">
                    <img data-interaction-sprite alt="Interação">
                    <div class="interaction-level-badge" aria-label="Nível da base">
                        <span>NV</span>
                        <strong data-interaction-field="nivel">-</strong>
                    </div>
                    <div class="interaction-header-copy">
                        <h2>${definicao.titulo || 'Interação'}</h2>
                        <p>Base ativa detectada no cenário</p>
                    </div>
                    <button type="button" class="interaction-close" data-interaction-close>X</button>
                </div>
                <div class="interaction-body">${corpoHtml}</div>
            </div>
        `;

        window.interactionMenuContext = { id, ...contexto };

        const sprite = overlay.querySelector('[data-interaction-sprite]');
        if (sprite) {
            sprite.src = contexto.sprite || definicao.sprite || '';
        }

        preencherCampos(overlay, contexto);

        const secaoModos = overlay.querySelector('[data-interaction-modes]');
        if (secaoModos) {
            secaoModos.style.display = Number(contexto?.nivel || 0) >= 2 ? 'grid' : 'none';
        }
        atualizarEstadoBotoesModo(overlay, contexto?.modoRenascimento || null);
        atualizarDisponibilidadeBotoesModo(overlay, Number(contexto?.nivel || 0));
        atualizarResumoEquipamentoSalvo(overlay);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                fecharTelaInteracao();
            }
        });

        overlay.querySelectorAll('[data-interaction-close]').forEach((botao) => {
            botao.addEventListener('click', () => fecharTelaInteracao());
        });

        const botaoEquipamento = overlay.querySelector('[data-interaction-action="salvar-equipamento"]');
        if (botaoEquipamento) {
            botaoEquipamento.addEventListener('click', () => {
                if (typeof window.salvarCheckpointEquipamentoAtual !== 'function') {
                    definirFeedbackInteracao('O checkpoint de equipamento ainda não está disponível.', true);
                    return;
                }

                const resultado = window.salvarCheckpointEquipamentoAtual({
                    craftId: contexto.craftId,
                    fase: window.faseAtualNome || '',
                    nivelBase: Number(contexto?.nivel || 1)
                });

                if (!resultado?.ok) {
                    definirFeedbackInteracao(resultado?.motivo || 'Não foi possível salvar o equipamento.', true);
                    return;
                }

                definirFeedbackInteracao(resultado.motivo || 'Checkpoint de equipamento salvo com sucesso.');
                atualizarResumoEquipamentoSalvo(overlay);
            });
        }


        // Atalho: tecla 3 apaga os itens salvos na base
        overlay.addEventListener('keydown', (event) => {
            if (event.key === '3') {
                if (typeof window.limparCheckpointEquipamentoSalvo === 'function') {
                    window.limparCheckpointEquipamentoSalvo();
                }
                atualizarResumoEquipamentoSalvo(overlay);
                definirFeedbackInteracao('Itens salvos na base apagados.');
            }
        });

        const botaoRecolher = overlay.querySelector('[data-interaction-action="recolher-base"]');
        if (botaoRecolher) {
            const atualizarBotao = () => {
                const podeRecolher = typeof window.podeRecolherBasePorId === 'function'
                    ? !!window.podeRecolherBasePorId(contexto.craftId)
                    : true;
                botaoRecolher.disabled = !podeRecolher;
                botaoRecolher.textContent = podeRecolher ? 'Recolher' : 'Sem slot livre';
            };

            botaoRecolher.addEventListener('click', () => {
                if (typeof window.recolherCraftPorId !== 'function') {
                    definirFeedbackInteracao('A ação de recolher ainda não está disponível.', true);
                    return;
                }

                const resultado = window.recolherCraftPorId(contexto.craftId);
                if (!resultado?.ok) {
                    definirFeedbackInteracao(resultado?.motivo || 'Não foi possível recolher a base.', true);
                    atualizarBotao();
                    return;
                }

                definirFeedbackInteracao(resultado.motivo || 'Base recolhida com sucesso.');
                setTimeout(() => fecharTelaInteracao(), 120);
            });

            atualizarBotao();
        }

        overlay.querySelectorAll('[data-interaction-mode]').forEach((botao) => {
            botao.addEventListener('click', () => {
                const modo = botao.getAttribute('data-interaction-mode');
                const nivelAtual = Number(contexto?.nivel || 0);
                const nivelMinimo = modo === 'memoria' ? 2 : 3;

                if (nivelAtual < nivelMinimo) {
                    definirFeedbackInteracao(
                        modo === 'memoria'
                            ? 'Memória libera na base nível 2.'
                            : 'Spawnpoint libera na base nível 3.',
                        true
                    );
                    return;
                }

                if (typeof window.definirModoRenascimentoBasePorId !== 'function') {
                    definirFeedbackInteracao('O modo de renascimento ainda não está disponível.', true);
                    return;
                }

                const resultado = window.definirModoRenascimentoBasePorId(contexto.craftId, modo);
                if (!resultado?.ok) {
                    definirFeedbackInteracao(resultado?.motivo || 'Não foi possível atualizar o modo da base.', true);
                    return;
                }

                contexto.modoRenascimento = resultado.modoRenascimento || '';
                atualizarEstadoBotoesModo(overlay, contexto.modoRenascimento || null);
                definirFeedbackInteracao(resultado.motivo || 'Modo da base atualizado.');
            });
        });

        onKeyDownAtual = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                fecharTelaInteracao();
                return;
            }

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                moverFocoNavegacao(overlay, 1);
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                moverFocoNavegacao(overlay, -1);
                return;
            }

            // Confirmação apenas com a tecla de chute
            if (window.controlesConfig && Array.isArray(window.controlesConfig.chute)) {
                const chuteKeys = window.controlesConfig.chute.map(k => String(k).toLowerCase());
                if (chuteKeys.includes(event.key.toLowerCase())) {
                    const ativo = document.activeElement;
                    if (ativo instanceof HTMLButtonElement && overlay.contains(ativo) && !ativo.disabled) {
                        event.preventDefault();
                        ativo.click();
                        return;
                    }
                    const primaria = overlay.querySelector('[data-primary-action]');
                    if (primaria && !primaria.disabled) {
                        event.preventDefault();
                        primaria.click();
                    }
                }
            }
        };
        document.addEventListener('keydown', onKeyDownAtual);

        const focoInicial = overlay.querySelector('[data-primary-action]') || obterElementosNavegaveis(overlay)[0];
        if (focoInicial?.focus) {
            requestAnimationFrame(() => focoInicial.focus());
        }

        if (!window.isPaused && typeof window.togglePause === 'function') {
            window.togglePause();
            window.interactionPauseApplied = true;
        } else {
            window.interactionPauseApplied = false;
        }

        obterRaizUI().appendChild(overlay);
        overlayAtual = overlay;
        window.isInteractionMenuOpen = true;
        return true;
    }

    function processarInteracaoBaseProxima(opcoes = {}) {
        const {
            controle,
            acaoAtiva = () => false,
            consumirAcao = () => {}
        } = opcoes;

        if (!controle || !acaoAtiva('interagir')) return false;
        if (window.isPaused || window.isMenuOpen || window.isSkillMenuOpen || window.isMochilaMenuOpen || window.isInteractionMenuOpen) {
            return false;
        }
        if (controle.estaAgachado) {
            return false;
        }

        const craft = obterCraftSobJogador(controle);
        if (!craft) return false;

        consumirAcao('interagir');
        abrirTelaInteracao('craft_base', montarContextoCraft(craft)).catch((error) => {
            console.error('Interação: falha ao abrir a tela da base.', error);
        });
        return true;
    }

    window.carregarMapeamentoInteracoes = carregarMapeamentoInteracoes;
    window.abrirTelaInteracao = abrirTelaInteracao;
    window.fecharTelaInteracao = fecharTelaInteracao;
    window.processarInteracaoBaseProxima = processarInteracaoBaseProxima;

    carregarMapeamentoInteracoes().catch(() => {});
})();
