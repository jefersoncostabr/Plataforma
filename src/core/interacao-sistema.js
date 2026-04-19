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

        const secaoNivel3 = overlay.querySelector('[data-interaction-level3]');
        if (secaoNivel3) {
            secaoNivel3.style.display = Number(contexto?.nivel || 0) >= 3 ? 'grid' : 'none';
        }
        atualizarEstadoBotoesModo(overlay, contexto?.modoRenascimento || null);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                fecharTelaInteracao();
            }
        });

        overlay.querySelectorAll('[data-interaction-close]').forEach((botao) => {
            botao.addEventListener('click', () => fecharTelaInteracao());
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
                if (Number(contexto?.nivel || 0) < 3) {
                    definirFeedbackInteracao('Essa configuração só libera na base nível 3.', true);
                    return;
                }

                if (typeof window.definirModoRenascimentoBasePorId !== 'function') {
                    definirFeedbackInteracao('O modo de renascimento ainda não está disponível.', true);
                    return;
                }

                const modo = botao.getAttribute('data-interaction-mode');
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

            if (event.key === 'Enter') {
                const primaria = overlay.querySelector('[data-primary-action]');
                if (primaria && !primaria.disabled) {
                    event.preventDefault();
                    primaria.click();
                }
            }
        };
        document.addEventListener('keydown', onKeyDownAtual);

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
