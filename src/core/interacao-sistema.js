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
        const adicionarItem = (tipo, rotulo, quantidade = 1) => {
            const chave = String(tipo || '').trim().toLowerCase();
            if (!chave) return;

            if (vistos.has(chave)) {
                // Se o item já foi visto (ex: scrap em vários slots), soma a quantidade no resumo
                const existente = itens.find(it => it.tipo === chave);
                if (existente) existente.quantidade += quantidade;
                return;
            }

            vistos.add(chave);
            const definicao = window.itemDefinitions?.[chave] || null;
            itens.push({
                tipo: chave,
                rotulo: rotulo || definicao?.nome || chave,
                sprite: definicao?.spriteColetavel || definicao?.spriteEquipado || '',
                quantidade: quantidade
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
        
        const slotsColete = Array.isArray(checkpoint.coleteSlots) ? checkpoint.coleteSlots : [];
        slotsColete.forEach(s => { if (s?.tipo) adicionarItem(s.tipo, s.nome, s.quantidade || 1); });

        if (checkpoint.cintoSlot?.tipo) adicionarItem(checkpoint.cintoSlot.tipo, checkpoint.cintoSlot.nome, checkpoint.cintoSlot.quantidade || 1);

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
                icone.style.position = 'relative'; // Garante que as badges fiquem presas ao ícone
                icone.title = item.rotulo || item.tipo;
                icone.setAttribute('aria-label', item.rotulo || item.tipo);

                const img = document.createElement('img');
                img.alt = item.rotulo || item.tipo;
                img.src = item.sprite || '';
                icone.appendChild(img);

                // Exibe badge de quantidade para itens empilháveis (quantidade > 1)
                const ehEmpilhavel = ['scrap'].includes(item.tipo);
                if (item.quantidade > 1 && ehEmpilhavel) {
                    const badge = document.createElement('span');
                    badge.style.cssText = `
                        position: absolute; top: 1px; right: 1px;
                        background: #00ff00; color: #000; font-size: 9px;
                        font-weight: bold; padding: 0 4px; border-radius: 3px;
                        pointer-events: none; line-height: 1.2; z-index: 3;
                        box-shadow: 0 0 2px rgba(0,0,0,0.5);
                    `;
                    badge.textContent = String(item.quantidade);
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
            <style>
                .interaction-modal, .interaction-body, [data-interaction-saved-equip], .player-inventory-for-crafting {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
                .interaction-modal::-webkit-scrollbar, .interaction-body::-webkit-scrollbar, [data-interaction-saved-equip]::-webkit-scrollbar, .player-inventory-for-crafting::-webkit-scrollbar {
                    display: none !important;
                }
            </style>
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

        // Lógica para popular o inventário no menu de Crafting
        if (id === 'menu_crafting') {
            const inventarioContainer = overlay.querySelector('.player-inventory-for-crafting');
            if (inventarioContainer) {
                inventarioContainer.innerHTML = ''; // Remove a mensagem de "Seus itens aparecerão aqui"

                const controle = window.playerControle;
                if (controle) {
                    const itensParaMostrar = [];

                    // 1. Busca o item que está no slot do Cinto
                    const slotCinto = typeof window.obterSlotCinto === 'function' ? window.obterSlotCinto() : controle.cintoSlot;
                    if (slotCinto) itensParaMostrar.push(slotCinto);

                    // 2. Busca os itens que estão nos slots do Colete
                    const slotsColete = typeof window.obterSlotsColete === 'function' ? window.obterSlotsColete() : (controle.coleteSlots || []);
                    slotsColete.forEach(slot => {
                        if (slot) itensParaMostrar.push(slot);
                    });

                    // 3. Fallback: Se houver 'scrap' no inventário lógico mas não nos slots, adiciona para garantir visibilidade
                    if (Array.isArray(controle.inventario) && controle.inventario.includes('scrap')) {
                        const jaEstaNaLista = itensParaMostrar.some(it => it.tipo === 'scrap');
                        if (!jaEstaNaLista) {
                            itensParaMostrar.push({
                                tipo: 'scrap',
                                nome: 'Sucata (Scrap)',
                                spriteColetavel: window.obterSpriteItem('scrap', window.config)
                            });
                        }
                    }

                    // Adiciona a Experiência (XP) como um item visual empilhável
                    const xpTotal = Number(window.playerXP || 0);
                    itensParaMostrar.unshift({
                        tipo: 'xp_display',
                        nome: 'Experiência (XP)',
                        quantidade: xpTotal,
                        isXP: true
                    });

                    if (itensParaMostrar.length === 0) {
                        inventarioContainer.innerHTML = '<p style="color: #666; text-align: center; width: 100%; font-size: 11px;">Sua mochila está vazia.</p>';
                    } else {
                        const slot1 = overlay.querySelector('#craft-slot-1');
                        const slot2 = overlay.querySelector('#craft-slot-2');

                        const adicionarAoSlotLivre = (itemData, btnOrigem, badgeEl) => {
                            const alvo = !slot1.dataset.ocupado ? slot1 : (!slot2.dataset.ocupado ? slot2 : null);
                            if (!alvo) return;

                            const ehEmpilhavel = ['scrap'].includes(itemData.tipo) || itemData.isXP;
                            if (ehEmpilhavel) {
                                if (itemData.quantidade <= 0) return;
                                itemData.quantidade--;
                                if (badgeEl) badgeEl.textContent = itemData.quantidade;
                                if (itemData.quantidade <= 0) {
                                    btnOrigem.style.opacity = '0.3';
                                    btnOrigem.style.pointerEvents = 'none';
                                }
                            } else {
                                btnOrigem.style.opacity = '0.3';
                                btnOrigem.style.pointerEvents = 'none';
                            }

                            alvo.innerHTML = '';
                            alvo.dataset.ocupado = "true";
                            alvo.dataset.itemTipo = itemData.tipo;
                            alvo.dataset.isXP = itemData.isXP ? "true" : "false";

                            if (itemData.isXP) {
                                // Representação visual do XP no slot de crafting
                                const xpLabel = document.createElement('div');
                                xpLabel.textContent = '1 XP';
                                xpLabel.style.cssText = 'font-weight: 900; color: #8e24aa; font-size: 11px; pointer-events: none;';
                                alvo.appendChild(xpLabel);
                            } else {
                                const imgClone = btnOrigem.querySelector('img').cloneNode();
                                imgClone.style.width = '32px'; imgClone.style.height = '32px';
                                alvo.appendChild(imgClone);
                            }

                            // Clique no slot para devolver o item
                            alvo.onclick = () => {
                                if (ehEmpilhavel) {
                                    itemData.quantidade++;
                                    if (badgeEl) badgeEl.textContent = itemData.quantidade;
                                    btnOrigem.style.opacity = '1';
                                    btnOrigem.style.pointerEvents = 'all';
                                } else {
                                    btnOrigem.style.opacity = '1';
                                    btnOrigem.style.pointerEvents = 'all';
                                }
                                alvo.innerHTML = '?';
                                delete alvo.dataset.ocupado;
                                delete alvo.dataset.itemTipo;
                                delete alvo.dataset.isXP;
                                btnOrigem.style.opacity = '1';
                                btnOrigem.style.pointerEvents = 'all';
                                alvo.onclick = null;
                            };
                        };

                        itensParaMostrar.forEach(item => {
                            const itemQuadrado = document.createElement('button');
                            itemQuadrado.type = 'button';
                            itemQuadrado.className = 'crafting-inv-item';
                            itemQuadrado.style.cssText = `
                                width: 42px; height: 42px; background: #222; border: 1px solid #444;
                                display: flex; align-items: center; justify-content: center;
                                border-radius: 4px; cursor: pointer; transition: border-color 0.2s, background 0.2s;
                                position: relative;
                                padding: 0; outline: none;
                            `;

                            // Efeitos de foco para navegação visual
                            itemQuadrado.onfocus = () => { itemQuadrado.style.borderColor = '#0f0'; itemQuadrado.style.background = '#2a2a2a'; };
                            itemQuadrado.onblur = () => { itemQuadrado.style.borderColor = '#444'; itemQuadrado.style.background = '#222'; };

                            if (item.isXP) {
                                const xpLabel = document.createElement('div');
                                xpLabel.textContent = 'XP';
                                xpLabel.style.cssText = 'font-weight: 900; color: #8e24aa; font-size: 14px; pointer-events: none;';
                                itemQuadrado.appendChild(xpLabel);
                                itemQuadrado.style.cursor = 'default';
                                itemQuadrado.title = 'Sua experiência atual';
                            } else {
                                const img = document.createElement('img');
                                img.src = item.spriteColetavel || item.spriteEquipado || (typeof window.obterSpriteItem === 'function' ? window.obterSpriteItem(item.tipo, window.config) : '');
                                img.style.width = '32px'; img.style.height = '32px'; img.style.imageRendering = 'pixelated';
                                img.style.pointerEvents = 'none';
                                itemQuadrado.appendChild(img);
                            }

                            // Exibe a quantidade da pilha no menu de Crafting
                            let badgeEl = null;
                            const ehEmpilhavel = ['scrap'].includes(item.tipo) || item.isXP;
                            if (ehEmpilhavel && item.quantidade > 0) {
                                badgeEl = document.createElement('span');
                                badgeEl.style.cssText = `
                                    position: absolute; top: 2px; right: 2px;
                                    background: ${item.isXP ? '#8e24aa' : '#00ff00'}; color: ${item.isXP ? '#fff' : '#000'}; font-size: 10px;
                                    font-weight: bold; padding: 0 4px; border-radius: 4px;
                                    pointer-events: none; line-height: 1.2;
                                `;
                                badgeEl.textContent = item.quantidade;
                                itemQuadrado.appendChild(badgeEl);
                            }

                            // Adiciona o item ao DOM antes de adicionar o event listener,
                            // para que o itemQuadrado seja um elemento válido no DOM
                            // quando o event listener for adicionado.
                            // Isso é importante para a navegação por teclado.
                            inventarioContainer.appendChild(itemQuadrado);

                            itemQuadrado.addEventListener('click', () => {
                                // Agora permite clicar no XP para enviar para o slot
                                adicionarAoSlotLivre(item, itemQuadrado, badgeEl);
                            });
                        });
                    }
                }
            }
        }

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

        // Insere o botão 'Crafting' dinamicamente antes do botão 'Recolher' no menu da base
        if (id === 'craft_base' && botaoRecolher && !overlay.querySelector('[data-interaction-action="abrir-crafting"]')) {
            const btnCrafting = document.createElement('button');
            btnCrafting.type = 'button';
            btnCrafting.textContent = 'Crafting';
            btnCrafting.setAttribute('data-interaction-action', 'abrir-crafting');
            botaoRecolher.before(btnCrafting);
            
            btnCrafting.addEventListener('click', () => abrirTelaInteracao('menu_crafting', contexto));
        }

        // Gerencia o botão "Voltar para Base" se ele existir no HTML carregado (ex: no menu de crafting)
        const btnVoltar = overlay.querySelector('#btn-voltar-base');
        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                abrirTelaInteracao('craft_base', contexto);
            });
        }

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
            const ativo = document.activeElement;
            if (event.key === 'Escape') {
                event.preventDefault();

                // Se estivermos no menu de crafting, o ESC volta para o menu principal da base
                if (id === 'menu_crafting') {
                    abrirTelaInteracao('craft_base', contexto);
                } else {
                    fecharTelaInteracao();
                }
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
            if (event.key === 'Enter' || event.key === ' ') { // Usa Enter ou Espaço para ativação geral
                if (ativo && overlay.contains(ativo) && !ativo.disabled) {
                    event.preventDefault();
                    // Verifica se é um slot de crafting (div com tabindex) ou um botão
                    if (ativo.classList.contains('crafting-slot') && ativo.id.startsWith('craft-slot-')) {
                        ativo.click(); // Dispara o manipulador de clique do slot
                    } else if (ativo instanceof HTMLButtonElement) {
                        ativo.click(); // Dispara o manipulador de clique de botões
                    }
                    return;
                }
            } else if (window.controlesConfig && Array.isArray(window.controlesConfig.chute)) { // Lógica original para a tecla de 'chute'
                const chuteKeys = window.controlesConfig.chute.map(k => String(k).toLowerCase());
                if (chuteKeys.includes(event.key.toLowerCase())) { 
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
