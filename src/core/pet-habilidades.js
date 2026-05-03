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
            // Log de diagnóstico para saber se o sistema de skills está acessível
            if (!window.temSkill) console.warn("[PetAbilities] Sistema de skills (window.temSkill) não encontrado.");
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
            console.log(`[PetAbilities] [AÇÃO] Executando habilidade ativa para: ${pet?.tipo}. Posição: (${pet?.x?.toFixed(0)}, ${pet?.y?.toFixed(0)})`);
            
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
                pet.inimigoPreso.stunTimer = 60;
                pet.inimigoPreso = null;
                window.AudioManager?.playSFX('pulo', 0.5);
                console.log(`[PetAbilities] Cão soltou o inimigo.`);
            } else if (pet.tipo === 'gato' && pet.itemArrastado) {
                pet.itemArrastado.grabbedByCat = false;
                if (Array.isArray(window.itensColetaveis)) {
                    window.itensColetaveis.push(pet.itemArrastado);
                }
                pet.itemArrastado = null;
                window.AudioManager?.playSFX('pulo', 0.5);
                console.log(`[PetAbilities] Gato soltou o item.`);
            }
        },

        // --- Lógica Interna: Cão (Morder) ---
        _morder: function (pet, config) {
            if (pet.inimigoPreso) {
                console.log(`[PetAbilities] Cão já estava mordendo, soltando carga.`);
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
                        inimigo.stunned = true;
                        inimigo.stunTimer = 100;
                        console.log(`[PetAbilities] Cão mordeu inimigo tipo: ${inimigo.tipo}`);
                        window.AudioManager?.playSFX('madeiraQuebrando', 0.6);
                        alvoEncontrado = true;
                        break;
                    }
                }
                if (!alvoEncontrado) console.log("[PetAbilities] Cão: Nenhum inimigo no alcance da mordida.");
            }
        },

        _manterMordida: function (pet, config) {
            if (!pet.inimigoPreso) return;
            const inimigo = pet.inimigoPreso;
            console.log(`[PetAbilities][_manterMordida] Cão (x: ${pet.x}, y: ${pet.y}) mantendo mordida em inimigo (tipo: ${inimigo.tipo}, x: ${inimigo.x}, y: ${inimigo.y}).`);
            if (inimigo.estaMorto || inimigo.estaMorrendo || (inimigo.framesKnockbackRestante > 0)) {
                if (inimigo.framesKnockbackRestante > 0) { inimigo.stunned = false; inimigo.stunTimer = 0; }
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
                    
                    // Fallback para itens que podem não ter X/Y lógicos atualizados
                    const itemX = item.x !== undefined ? item.x : (parseInt(item.elemento?.style.left) || 0);
                    const itemY = item.y !== undefined ? item.y : (parseInt(item.elemento?.style.bottom) || 0);
                    const hitboxItem = { x: itemX, y: itemY, largura: 32, altura: 32 };
                    
                    if (window.detectarColisaoHitbox(petHitbox, hitboxItem, -15, -15, -15)) {
                        let playerColetou = false;
                        if (window.playerControle && typeof window.tentarColetarItemJogador === 'function') {
                            playerColetou = window.tentarColetarItemJogador(item);
                        }

                        if (playerColetou) {
                            console.log(`[PetAbilities] Gato encontrou item (tipo: ${item.tipo}), jogador coletou.`);
                            item.elemento.remove(); // Remove visualmente o item
                            window.itensColetaveis.splice(i, 1); // Remove da lista global
                            window.AudioManager?.playSFX('coleta', 0.5); // Toca um som de coleta
                        } else {
                            pet.itemArrastado = item; item.grabbedByCat = true;
                            window.itensColetaveis.splice(i, 1);
                            console.log(`[PetAbilities] Gato começou a arrastar:`, item.tipo);
                            window.AudioManager?.playSFX('madeiraQuebrando', 0.6);
                        }
                        itemEncontrado = true;
                        break;
                    }
                }
                if (!itemEncontrado) console.log("[PetAbilities] Gato: Nenhum item no alcance para lootear.");
            }
        },

        _manterLoot: function (pet, config) {
            if (!pet.itemArrastado) return;
            const item = pet.itemArrastado;
            item.x += (pet.x - item.x) * 0.15; item.y += (pet.y - item.y) * 0.15;
            if (item.elemento) { item.elemento.style.left = item.x + 'px'; item.elemento.style.bottom = item.y + 'px'; }
            item.velocidadeY = 0;
        }
    };

    console.log("[PetAbilities] Módulo carregado e registrado no window com sucesso.");
})();