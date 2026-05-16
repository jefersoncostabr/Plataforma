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
            x: craft?.x,
            y: craft?.y,
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
            const modoBotao = botao.getAttribute('data-interaction-mode');
            const ativo = modoBotao === modoAtual || modoAtual === 'ambos';
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
            
            // Tenta obter o sprite via função global para suportar itens dinâmicos (como _plus)
            let sprite = definicao?.spriteColetavel || definicao?.spriteEquipado || '';
            if (!sprite && typeof window.obterSpriteItem === 'function') {
                sprite = window.obterSpriteItem(chave, window.config || {});
            }

            itens.push({
                tipo: chave,
                rotulo: rotulo || definicao?.nome || chave,
                sprite: sprite,
                quantidade: quantidade
            });
        };

        if (checkpoint.temArma) {
            const tipoArma = checkpoint.heldWeaponType || (checkpoint.inventario.includes('doze') ? 'doze' : 'revolver');
            const nomeArma = tipoArma === 'doze' ? 'Doze' : 'Revólver';
            adicionarItem(tipoArma, nomeArma);
        }
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

                // Adiciona o sinal azul de "+" se for item melhorado (plus)
                if (item.tipo && item.tipo.endsWith('_plus')) {
                    const plusLabel = document.createElement('span');
                    plusLabel.textContent = '+';
                    plusLabel.style.cssText = `
                        position: absolute; top: -1px; left: 2px; 
                        color: #0088ff; font-weight: 900; font-size: 14px; 
                        text-shadow: 0 0 2px #000; pointer-events: none; z-index: 3;
                    `;
                    icone.appendChild(plusLabel);
                }

                // Exibe badge de quantidade para itens empilháveis (quantidade > 1)
                const ehEmpilhavel = ['scrap'].includes(item.tipo) || (item.tipo && item.tipo.endsWith('_plus'));
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

    /**
     * Injeta o ícone do cão resgatado na linha superior (header) do menu da base.
     */
    function injetarIconeCaoNoMenu(container, contexto = {}) {
        const header = container.querySelector('.interaction-header');
        const closeBtn = header?.querySelector('.interaction-close');
        if (!header || !closeBtn) return;

        const petsDisponiveis = [
            { id: 'cao', resgatado: window.isCaoResgatado, naBase: 'caoNaBase', key: 'plataformaCaoNaBase', sprite: 'cao_coletavel.png', spawn: window.iniciarCao, entidade: 'caoEntidade' },
            { id: 'gato', resgatado: window.isGatoResgatado, naBase: 'gatoNaBase', key: 'plataformaGatoNaBase', sprite: 'gato_coletavel.png', spawn: window.iniciarGato, entidade: 'gatoEntidade' }
        ];

        petsDisponiveis.forEach(pet => {
            if (!pet.resgatado) return;

            const badge = document.createElement('div');
            badge.className = 'pet-badge';
            badge.setAttribute('tabindex', '0');
            badge.setAttribute('role', 'button');
            badge.style.cssText = `
                width: 40px; height: 40px; overflow: hidden;
                border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                margin-left: 8px; cursor: pointer; transition: all 0.3s ease; outline: none;
            `;
            if (pet.id === 'cao') badge.style.marginLeft = 'auto'; // O primeiro pet empurra

            const img = document.createElement('img');
            img.src = `../../assets/personagem/${pet.sprite}`;
            img.style.cssText = 'width: 64px; height: 64px; image-rendering: pixelated; object-fit: contain; flex-shrink: 0; transition: filter 0.3s;';
            
            // Aplica filtro e fundo inicial baseado no estado salvo
            const atualizarFiltro = () => {
                img.style.filter = window[pet.naBase] ? 'brightness(0.15) grayscale(1)' : 'none';
                badge.title = window[pet.naBase] ? `${pet.id.toUpperCase()} na Base` : `${pet.id.toUpperCase()} Ativo`;
                badge.style.background = window[pet.naBase] ? 'rgba(0, 255, 0, 0.1)' : 'linear-gradient(45deg, #FFD700, #FFA500)'; // Fundo dourado para ativo
                badge.style.borderColor = window[pet.naBase] ? 'rgba(0, 255, 0, 0.2)' : '#FFD700'; // Borda dourada para ativo
            };
            atualizarFiltro();

            badge.addEventListener('focus', () => {
                badge.style.boxShadow = '0 0 0 2px #fff, 0 0 8px rgba(255,255,255,0.5)';
            });
            badge.addEventListener('blur', () => {
                badge.style.boxShadow = 'none';
            });

            badge.onclick = () => {
                window[pet.naBase] = !window[pet.naBase];
                localStorage.setItem(pet.key, window[pet.naBase]);
                atualizarFiltro();

                if (window[pet.naBase]) {
                    if (window[pet.entidade] && window[pet.entidade].elemento) window[pet.entidade].elemento.remove();
                } else if (typeof pet.spawn === 'function' && contexto.x !== undefined) {
                    pet.spawn({ x: contexto.x, y: contexto.y }, window.config);
                }
            };

            badge.appendChild(img);
            header.insertBefore(badge, closeBtn);
        });
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

        // Adiciona o indicador visual do aliado se disponível
        injetarIconeCaoNoMenu(overlay, contexto);

        if (id === 'menu_crafting') {
            const inventarioContainer = overlay.querySelector('.player-inventory-for-crafting');
            if (inventarioContainer) {
                // Identifica quem abriu o menu (Jogador ou BB) para listar o inventário correto
                const interactor = contexto.interactor || window.playerControle;
                if (interactor) {
                    const slot1 = overlay.querySelector('#craft-slot-1');
                    const slot2 = overlay.querySelector('#craft-slot-2');
                    
                    // Definição de Receitas (Fácil de expandir)
                    const RECEITAS = [
                        { 
                            id: 'upgrade_plus', 
                            resultado: (tipo) => tipo + '_plus',
                            check: (s1, s2) => {
                                const restrito = ['cinto', 'colete', 'scrap', 'revolver', 'doze'];
                                const temScrap = s1.itemTipo === 'scrap' || s2.itemTipo === 'scrap';
                                const itemBase = s1.itemTipo === 'scrap' ? s2 : s1;
                                return temScrap && itemBase.ocupado === "true" && s1.isXP !== "true" && s2.isXP !== "true" && !restrito.includes(itemBase.itemTipo);
                            }
                        },
                        { 
                            id: 'craft_municao_plus', 
                            resultado: () => 'municao_plus',
                            check: (s1, s2) => {
                                const temScrap = s1.itemTipo === 'scrap' || s2.itemTipo === 'scrap';
                                const itemBase = s1.itemTipo === 'scrap' ? s2 : s1;
                                const armas = ['revolver', 'doze'];
                                return temScrap && itemBase.ocupado === "true" && armas.includes(itemBase.itemTipo);
                            }
                        },
                        {
                            id: 'reciclagem',
                            resultado: () => 'scrap',
                            check: (s1, s2) => (s1.ocupado === "true" && s2.ocupado === "true") && (s1.isXP === "true" || s2.isXP === "true") && s1.itemTipo !== 'scrap' && s2.itemTipo !== 'scrap'
                        }
                    ];

                    if (slot1 && slot2) {
                        const atualizarResultadoCrafting = () => {
                            const rSlot = overlay.querySelector('#craft-result') || 
                                         overlay.querySelector('#craft-result-slot') || 
                                         overlay.querySelector('.craft-result') || 
                                         overlay.querySelector('[data-interaction-field="resultado"]');
                            
                            if (!slot1 || !slot2 || !rSlot) return;
                            
                            const s1 = slot1.dataset;
                            const s2 = slot2.dataset;

                            const receita = RECEITAS.find(r => r.check(s1, s2));

                            if (receita) {
                                const itemBase = s1.itemTipo === 'scrap' ? s2 : (s1.isXP === "true" ? s2 : s1);
                                const tipoResultado = receita.resultado(itemBase.itemTipo);
                                
                                rSlot.innerHTML = '';
                                const sprite = typeof window.obterSpriteItem === 'function' ? window.obterSpriteItem(tipoResultado, window.config) : '';
                                
                                const img = document.createElement('img');
                                img.src = sprite;
                                img.style.cssText = 'width: 32px; height: 32px; image-rendering: pixelated;';
                                rSlot.appendChild(img);

                                if (receita.id === 'upgrade_plus') {
                                    const plus = document.createElement('span');
                                    plus.textContent = '+';
                                    plus.style.cssText = 'position: absolute; top: -2px; left: 2px; color: #0088ff; font-weight: 900; font-size: 16px; text-shadow: 0 0 2px #000; pointer-events: none;';
                                    rSlot.appendChild(plus);
                                }
                                
                                rSlot.style.cursor = 'pointer';
                                rSlot.dataset.podeCraftar = "true";
                                rSlot.dataset.tipoResultado = tipoResultado;
                            } else {
                                rSlot.innerHTML = '?';
                                rSlot.style.cursor = 'default';
                                delete rSlot.dataset.podeCraftar;
                                delete rSlot.dataset.tipoResultado;
                            }
                        };

                        const renderizarListaInventario = () => {
                            inventarioContainer.innerHTML = '';
                            const itensParaMostrar = [];

                            // 1. Coleta itens do cinto e colete
                            const slotCinto = interactor.cintoSlot;
                            if (slotCinto) itensParaMostrar.push(slotCinto);

                            const slotsColete = interactor.coleteSlots || [];
                            slotsColete.forEach(slot => { if (slot) itensParaMostrar.push(slot); });

                            // 2. Garante que o Scrap apareça se estiver no inventário lógico
                            if (Array.isArray(interactor.inventario) && interactor.inventario.includes('scrap')) {
                                if (!itensParaMostrar.some(it => it.tipo === 'scrap')) {
                                    itensParaMostrar.push({
                                        tipo: 'scrap',
                                        nome: 'Sucata (Scrap)',
                                        spriteColetavel: window.obterSpriteItem('scrap', window.config)
                                    });
                                }
                            }

                            // 3. Adiciona o XP como o primeiro item (pilha)
                            itensParaMostrar.unshift({
                                tipo: 'xp_display',
                                nome: 'Experiência (XP)',
                                quantidade: Number(window.playerXP || 0),
                                isXP: true
                            });

                            if (itensParaMostrar.length === 0) {
                                inventarioContainer.innerHTML = '<p style="color: #666; text-align: center; width: 100%; font-size: 11px;">Sua mochila está vazia.</p>';
                            } else {
                                itensParaMostrar.forEach(item => {
                                    const itemQuadrado = document.createElement('button');
                                    itemQuadrado.type = 'button';
                                    itemQuadrado.className = 'crafting-inv-item';
                                    itemQuadrado.style.cssText = `width: 42px; height: 42px; background: #222; border: 1px solid #444; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; padding: 0; outline: none;`;

                                    if (item.isXP) {
                                        const xpLabel = document.createElement('div');
                                        xpLabel.textContent = 'XP';
                                        xpLabel.style.cssText = 'font-weight: 900; color: #8e24aa; font-size: 14px; pointer-events: none;';
                                        itemQuadrado.appendChild(xpLabel);
                                    } else {
                                        const img = document.createElement('img');
                                        img.src = item.spriteColetavel || item.spriteEquipado || (typeof window.obterSpriteItem === 'function' ? window.obterSpriteItem(item.tipo, window.config) : '');
                                        img.style.width = '32px'; img.style.height = '32px'; img.style.imageRendering = 'pixelated';
                                        img.style.pointerEvents = 'none';
                                        itemQuadrado.appendChild(img);
                                    }
                                    
                                    // Adiciona o sinal azul de "+" se for item melhorado
                                    if (item.tipo && item.tipo.endsWith('_plus')) {
                                        const plusLabel = document.createElement('span');
                                        plusLabel.textContent = '+';
                                        plusLabel.style.cssText = 'position: absolute; top: -1px; left: 2px; color: #0088ff; font-weight: 900; font-size: 14px; text-shadow: 0 0 2px #000; pointer-events: none;';
                                        itemQuadrado.appendChild(plusLabel);
                                    }

                                    let badgeEl = null;
                                    const ehEmpilhavel = ['scrap'].includes(item.tipo) || item.isXP || (item.tipo && item.tipo.endsWith('_plus'));
                                    if (ehEmpilhavel && item.quantidade > 0) {
                                        badgeEl = document.createElement('span');
                                        badgeEl.style.cssText = `position: absolute; top: 2px; right: 2px; background: ${item.isXP ? '#8e24aa' : '#00ff00'}; color: ${item.isXP ? '#fff' : '#000'}; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 4px; pointer-events: none; line-height: 1.2;`;
                                        badgeEl.textContent = item.quantidade;
                                        itemQuadrado.appendChild(badgeEl);
                                    }

                                    inventarioContainer.appendChild(itemQuadrado);
                                    itemQuadrado.addEventListener('click', () => {
                                        adicionarAoSlotLivre(item, itemQuadrado, badgeEl);
                                    });
                                });
                            }
                        };

                        const adicionarAoSlotLivre = (itemData, btnOrigem, badgeEl) => {
                            const alvo = !slot1.dataset.ocupado ? slot1 : (!slot2.dataset.ocupado ? slot2 : null);
                            if (!alvo) return;

                            const ehEmpilhavel = ['scrap'].includes(itemData.tipo) || itemData.isXP || (itemData.tipo && itemData.tipo.endsWith('_plus'));
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
                            alvo._itemRef = itemData; // Guarda referência para o item sendo usado

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

                            atualizarResultadoCrafting();

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
                                atualizarResultadoCrafting();
                            };
                        };

                        // Adiciona o evento de clique no resultado dinamicamente
                        overlay.addEventListener('click', (e) => {
                            const rBtn = e.target.closest('#craft-result, #craft-result-slot, .craft-result');
                            if (rBtn && rBtn.dataset.podeCraftar === "true") {
                                e.stopPropagation();
                                
                                // Verifica se as funções necessárias existem para evitar crash
                                const ganharXP = typeof window.ganharXP === 'function';
                                const removerItem = typeof window.removerItemDoCorpoSemDropar === 'function';
                                const tipoResultado = rBtn.dataset.tipoResultado;

                                // 1. Consumir XP real
                                if (ganharXP && tipoResultado === 'scrap') {
                                    window.ganharXP(-1);
                                }

                                // 2. Consumir Item real da mochila/corpo
                                [slot1, slot2].forEach(s => {
                                    const item = s._itemRef;
                                   if (item && !item.isXP) {
                                        const ehEmpilhavel = ['scrap'].includes(item.tipo) || (item.tipo && item.tipo.endsWith('_plus'));
                                        const c = interactor;

                                        // Se for equipamento (não empilhável) ou se o stack acabou (quantidade 0)
                                        if (!ehEmpilhavel || (ehEmpilhavel && item.quantidade <= 0)) {
                                            if (c) {
                                                // 1. Remove a referência do slot físico (colete ou cinto)
                                                if (c.cintoSlot === item) c.cintoSlot = null;
                                                if (Array.isArray(c.coleteSlots)) {
                                                    const idxSlot = c.coleteSlots.indexOf(item);
                                                    if (idxSlot !== -1) c.coleteSlots[idxSlot] = null;
                                                }
                                                // 2. Remove do inventário lógico (lista de tipos conquistados)
                                                if (Array.isArray(c.inventario)) {
                                                    const idxInv = c.inventario.indexOf(item.tipo);
                                                    if (idxInv !== -1) c.inventario.splice(idxInv, 1);
                                                }
                                            }
                                        }
                                        
                                    
                                }
                                });

                                // Salva as alterações no inventário imediatamente para persistência
                                if (typeof window.salvarInventario === 'function') {
                                    window.salvarInventario();
                                }
                                // 3. Entregar o resultado
                                const coletado = typeof window.tentarColetarItemJogador === 'function' 
                                    ? window.tentarColetarItemJogador({ tipo: tipoResultado }) 
                                    : false;

                                if (!coletado) {
                                    // Dropa no chão se o inventário estiver cheio
                                    if (window.playerControle && typeof window.obterSpriteItem === 'function') {
                                        const imgItem = document.createElement('img');
                                        imgItem.src = window.obterSpriteItem(tipoResultado.replace('_plus', ''), window.config);
                                        imgItem.style.cssText = 'position: absolute; width: 32px; height: 32px; image-rendering: pixelated;';
                                        if (window.LAYERS?.ITENS) window.adicionarAoLayer(imgItem, window.LAYERS.ITENS);
                                        
                                        window.itensColetaveis.push({
                                            tipo: tipoResultado,
                                            x: window.playerControle.x,
                                            y: window.playerControle.y,
                                            elemento: imgItem,
                                            velocidadeY: 5
                                        });
                                    }
                                }

                                // 4. Finalização visual e sincronia
                                [slot1, slot2].forEach(s => {
                                    s.innerHTML = '?';
                                    delete s.dataset.ocupado;
                                    delete s.dataset.itemTipo;
                                    delete s.dataset.isXP;
                                    s.onclick = null;
                                    delete s._itemRef;
                                });
                                atualizarResultadoCrafting();
                                renderizarListaInventario();
                                window.AudioManager?.playSFX('recarga', 0.8);
                            }
                        });

                        renderizarListaInventario();
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
            btnCrafting.title = "Menu de Crafting";

            const scrapImg = document.createElement('img');
            scrapImg.src = '../../assets/personagem/scrap_coletavel.png';
            scrapImg.style.cssText = 'width: 24px; height: 24px; image-rendering: pixelated; pointer-events: none; vertical-align: middle;';
            
            btnCrafting.appendChild(scrapImg);
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
                const interactor = contexto.interactor || window.playerControle;
                const sistema = interactor?.craftingSystem;
                // Nunca chamar recolherCraftPorId aqui: isso recolhe a base de verdade.
                const podeRecolher = !!(sistema || typeof window.recolherCraftPorId === 'function');
                botaoRecolher.disabled = !podeRecolher;
                botaoRecolher.textContent = podeRecolher ? 'Recolher' : 'Sem slot livre';
            };

            botaoRecolher.addEventListener('click', () => {
                const interactor = contexto.interactor || window.playerControle;
                const sistema = interactor?.craftingSystem;
                if (!sistema && typeof window.recolherCraftPorId !== 'function') {
                    definirFeedbackInteracao('A ação de recolher ainda não está disponível.', true);
                    return;
                }

                const resultado = sistema ? sistema.recolherCraftPorId(contexto.craftId) : window.recolherCraftPorId(contexto.craftId);
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

            const lowKey = event.key.toLowerCase();

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || lowKey === 'd' || lowKey === 's') {
                event.preventDefault();
                moverFocoNavegacao(overlay, 1);
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || lowKey === 'a' || lowKey === 'w') {
                event.preventDefault();
                moverFocoNavegacao(overlay, -1);
                return;
            }

            // Confirmação apenas com a tecla de chute
            if (event.key === 'Enter' || event.key === ' ') { // Usa Enter ou Espaço para ativação geral
                if (ativo && overlay.contains(ativo) && !ativo.disabled) {
                    event.preventDefault();
                    // Dispara o clique se for um botão, slot de craft ou badge de pet
                    if (ativo instanceof HTMLButtonElement || ativo.hasAttribute('tabindex')) {
                        ativo.click();
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

        if (!controle) return false;
        if (!acaoAtiva('interagir')) return false;

        if (window.isPaused || window.isMenuOpen || window.isSkillMenuOpen || window.isMochilaMenuOpen || window.isInteractionMenuOpen) {
            return false;
        }
        
        if (controle.estaAgachado) return false;

        const faseAtual = String(window.faseAtualNome || '').trim() || '(sem fase)';
        const temBase = Array.isArray(window.craftsAtivos) && window.craftsAtivos.length > 0;
        const craft = obterCraftSobJogador(controle);
        const nivelBase = Number(craft?.nivel || 0);
        const localBase = craft ? `x:${Number(craft.x || 0)},y:${Number(craft.y || 0)}` : '(sem local)';
        if (!craft) return false;

        consumirAcao('interagir');
        const ctx = montarContextoCraft(craft);
        ctx.interactor = controle; // Salva o interator no contexto para uso posterior nos menus
        abrirTelaInteracao('craft_base', ctx).catch((error) => {
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