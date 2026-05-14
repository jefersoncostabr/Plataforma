(function () {
    /**
     * Sistema centralizado de habilidades de Pets.
     * Módulo que isola as lógicas de controle, combate e utilidade de cada pet.
     */
    window.PetAbilities = {
        /**
         * Verifica se o pet pode ser assumido pelo jogador.
         */
        podeSerControlado: function (pet) {
            if (!pet) return false;
            // Centraliza a verificação da skill de adestramento
            return !!window.temSkill?.((window.SKILLS || {}).ADESTRAMENTO);
        },

        /**
         * Executa a habilidade ativa do pet baseada no seu tipo.
         * Cão: Morder (prender inimigos)
         * Gato: Lootear (arrastar itens)
         */
        executarHabilidadeAtiva: function (pet, config) {
            if (pet.tipo === 'cao') {
                this._morder(pet, config);
            } else if (pet.tipo === 'gato') {
                this._lootear(pet, config);
            }
        },

        /**
         * Atualiza os efeitos contínuos das habilidades (manter preso ou arrastar).
         */
        atualizarEfeitosHabilidades: function (pet, config) {
            if (pet.tipo === 'cao') {
                this._manterMordida(pet, config);
            } else if (pet.tipo === 'gato') {
                this._manterLoot(pet, config);
            }
        },

        /**
         * Solta qualquer carga (inimigo ou item) que o pet esteja carregando.
         */
        soltarCarga: function (pet) {
            if (pet.tipo === 'cao' && pet.inimigoPreso) {
                pet.inimigoPreso.presoPorPet = false;
                pet.inimigoPreso.presoPorPetTipo = null;
                pet.inimigoPreso.stunTimer = 60;
                pet.inimigoPreso = null;
                window.AudioManager?.playSFX('pulo', 0.5);
            } else if (pet.tipo === 'gato' && pet.itemArrastado) {
                pet.itemArrastado.grabbedByCat = false;
                if (Array.isArray(window.itensColetaveis)) {
                    window.itensColetaveis.push(pet.itemArrastado);
                }
                pet.itemArrastado = null;
                window.AudioManager?.playSFX('pulo', 0.5);
            }
        },

        // --- Lógica Interna: Cão (Morder) ---
        _morder: function (pet, config) {
            if (pet.inimigoPreso) {
                this.soltarCarga(pet);
            } else if (window.inimigos && typeof window.detectarColisaoHitbox === 'function') {
                const petHitbox = { x: pet.x + (pet.offsetX || 0), y: pet.y, largura: pet.largura, altura: pet.altura };
                const fenoId = window.GAME_CONSTANTS?.INIMIGO_FENO_ID ?? 5;
                let alvoEncontrado = false;

                for (let inimigo of window.inimigos) {
                    if (!inimigo || inimigo.estaMorto || inimigo.estaMorrendo || inimigo.tipo === fenoId) continue;
                    
                    const targetHitbox = { x: inimigo.x + (inimigo.offsetX || 0), y: inimigo.y, largura: inimigo.largura, altura: inimigo.altura };

                    if (window.detectarColisaoHitbox(petHitbox, targetHitbox, -15, -15, -15)) {
                        pet.inimigoPreso = inimigo;
                        inimigo.presoPorPet = true;
                        inimigo.presoPorPetTipo = pet.tipo;
                        inimigo.stunned = true;
                        inimigo.stunTimer = 100;
                        window.AudioManager?.playSFX('madeiraQuebrando', 0.6);
                        alvoEncontrado = true;
                        break;
                    }
                }
            }
        },

        _manterMordida: function (pet, config) {
            if (!pet.inimigoPreso) return;
            const inimigo = pet.inimigoPreso;
            if (inimigo.estaMorto || inimigo.estaMorrendo || inimigo.emAberturaPorBB || (inimigo.framesKnockbackRestante > 0)) {
                if (inimigo.framesKnockbackRestante > 0) { inimigo.stunned = false; inimigo.stunTimer = 0; }
                inimigo.presoPorPet = false;
                inimigo.presoPorPetTipo = null;
                pet.inimigoPreso = null;
            } else {
                inimigo.x = pet.x; inimigo.y = pet.y; inimigo.stunned = true;
                if (inimigo.stunTimer < 30) inimigo.stunTimer = 60;
                inimigo.noChao = pet.noChao; inimigo.velocidadeY = pet.velocidadeY;
                if (inimigo.elemento) { inimigo.elemento.style.left = inimigo.x + 'px'; inimigo.elemento.style.bottom = inimigo.y + 'px'; }
                if (typeof window.sincronizarAcessoriosEntidade === 'function') {
                    window.sincronizarAcessoriosEntidade(inimigo, { armaElemento: inimigo.armaElemento, escudoElemento: inimigo.escudoElemento, botaElemento: inimigo.botaElemento, jetpackElemento: inimigo.jetpackElemento, garraElemento: inimigo.garraElemento, cintoElemento: inimigo.cintoElemento, coleteElemento: inimigo.coleteElemento });
                }
            }
        },

        // --- Lógica Interna: Gato (Lootear) ---
        _lootear: function (pet, config) {
            if (typeof window.detectarColisaoHitbox !== 'function') {
                console.error("[PetAbilities] Erro: detectarColisaoHitbox não encontrada.");
                return;
            }

            if (pet.itemArrastado) {
                this.soltarCarga(pet);
            } else if (window.itensColetaveis && typeof window.detectarColisaoHitbox === 'function') {
                const petHitbox = { x: pet.x + pet.offsetX, y: pet.y, largura: pet.largura, altura: pet.altura };
                let itemEncontrado = false;
                
                for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                    const item = window.itensColetaveis[i];
                    if (!item) continue;
                    if (item.coletavel === false || window.itemDefinitions?.[item.tipo]?.coletavel === false) continue;
                    
                    // Fallback para itens que podem não ter X/Y lógicos atualizados
                    const itemX = item.x !== undefined ? item.x : (parseInt(item.elemento?.style.left) || 0);
                    const itemY = item.y !== undefined ? item.y : (parseInt(item.elemento?.style.bottom) || 0);
                    const hitboxItem = { x: itemX, y: itemY, largura: 32, altura: 32 };
                    
                    if (window.detectarColisaoHitbox(petHitbox, hitboxItem, -15, -15, -15)) {
                        pet.itemArrastado = item; 
                        item.grabbedByCat = true;
                        window.itensColetaveis.splice(i, 1);
                        window.AudioManager?.playSFX('madeiraQuebrando', 0.6);

                        itemEncontrado = true;
                        break;
                    }
                }
            }
        },

        _manterLoot: function (pet, config) {
            if (!pet.itemArrastado) return;
            const item = pet.itemArrastado;
            
            // Segue o gato com suavização
            item.x += (pet.x - item.x) * 0.15; 
            item.y += (pet.y - item.y) * 0.15;
            
            if (typeof window.atualizarVisualItemColetavel === 'function') {
                window.atualizarVisualItemColetavel(item, { x: item.x, y: item.y });
            } else if (item.elemento) {
                item.elemento.style.left = item.x + 'px';
                item.elemento.style.bottom = item.y + 'px';
            }
            item.velocidadeY = 0;

            // Verifica se o jogador toca no item sendo arrastado para coletar
            const player = window.playerControle;
            if (player && typeof window.detectarColisaoHitbox === 'function' && typeof window.tentarColetarItemJogador === 'function') {
                const hitboxPlayer = { x: player.x, y: player.y, largura: 32, altura: 32 };
                const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 };

                if (window.detectarColisaoHitbox(hitboxPlayer, hitboxItem, 0, 0, 0)) {
                    if (window.tentarColetarItemJogador(item)) {
                        if (typeof window.removerVisualItemColetavel === 'function') {
                            window.removerVisualItemColetavel(item);
                        } else {
                            item.elemento?.remove();
                        }
                        pet.itemArrastado = null;
                        window.AudioManager?.playSFX('coleta', 0.5);
                    }
                }
            }
        }
    };
})();