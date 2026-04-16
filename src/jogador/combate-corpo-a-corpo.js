(function () {
    function criarSistemaCombateCorpoACorpoJogador(opcoes = {}) {
        const {
            controle,
            config,
            acaoAtiva = () => false,
            detectarColisaoHitbox,
            obterKnockback = () => Number(config?.knockbackBase ?? config?.knockbackInimigo ?? 150),
            animarDanoAlvo = () => {},
            virarFenoParaFonteDano = () => {},
            processarMorteFeno = () => {},
            removerInimigoDerrotado = () => {}
        } = opcoes;

        if (!controle || !config) {
            throw new Error('Controle e config são obrigatórios para o sistema de combate corpo a corpo.');
        }

        if (typeof detectarColisaoHitbox !== 'function') {
            throw new Error('detectarColisaoHitbox é obrigatório para o sistema de combate corpo a corpo.');
        }

        function cancelarChuteSeAgachado() {
            if (!controle.estaAgachado) return false;

            controle.tempoChute = 0;
            controle.chutando = false;
            controle.framesImpulsoRestante = 0;
            controle.velocidadeDash = 0;
            return true;
        }

        function atualizarEstadoChute() {
            if (cancelarChuteSeAgachado()) {
                return;
            }

            controle.chutando = (controle.tempoChute || 0) > 0;
        }

        function iniciarChute(inimigos = window.inimigos) {
            if (cancelarChuteSeAgachado()) {
                return false;
            }

            controle.tempoChute = Number(config.tempoChute ?? 0);
            const cooldownBaseChute = Number(config.cooldownChute ?? 0);
            const multiplicadorCooldownChute = Number(controle.multiplicadorCooldownChute ?? 1);
            controle.cooldownChute = cooldownBaseChute > 0
                ? Math.max(1, Math.round(cooldownBaseChute * multiplicadorCooldownChute))
                : 0;

            const duracaoDash = 10;
            const multiplicadorChute = (controle.temBota && !controle.itensGuardadosNoCinto) ? 2 : 1;
            controle.framesImpulsoRestante = duracaoDash;
            controle.velocidadeDash = (Number(config.impulsoChute ?? 0) * multiplicadorChute) / duracaoDash;

            if (Array.isArray(inimigos)) {
                inimigos.forEach((inimigo) => {
                    if (inimigo) inimigo.foiAtingidoNesteChute = false;
                });
            }

            atualizarEstadoChute();
            return true;
        }

        function processarEntradaChute(inimigos = window.inimigos) {
            if (controle.estaAgachado) {
                cancelarChuteSeAgachado();
                return false;
            }

            if (acaoAtiva('chute') && (controle.cooldownChute || 0) === 0) {
                return iniciarChute(inimigos);
            }
            return false;
        }

        function aplicarImpulsoChute() {
            if (cancelarChuteSeAgachado()) return;
            if ((controle.framesImpulsoRestante || 0) <= 0) return;

            const direcaoDash = controle.direcao === 'd' ? 1 : -1;
            controle.x += (controle.velocidadeDash || 0) * direcaoDash;
            controle.framesImpulsoRestante--;
        }

        function criarHitboxAtaque() {
            const larguraPlayer = Number(controle.largura || 32);
            const offsetX = Number(config.ATAQUE_OFFSET_X ?? 0);
            const larguraAtaque = Number(config.ATAQUE_LARGURA ?? 0);
            const ataqueX = controle.direcao === 'd'
                ? controle.x + offsetX
                : controle.x + (larguraPlayer - offsetX - larguraAtaque);

            return {
                x: ataqueX,
                y: controle.y + Number(config.ATAQUE_OFFSET_Y ?? 0),
                largura: larguraAtaque,
                altura: Number(config.ATAQUE_ALTURA ?? 0)
            };
        }

        function processarAcertoChuteEmInimigo(inimigo) {
            if (!controle.chutando || !inimigo || inimigo.estaMorto || inimigo.foiAtingidoNesteChute) {
                return false;
            }

            const hitboxAtaque = criarHitboxAtaque();
            const hitboxInimigo = {
                x: inimigo.x + (inimigo.offsetX || 0),
                y: inimigo.y,
                largura: inimigo.largura,
                altura: inimigo.altura
            };

            if (!detectarColisaoHitbox(hitboxAtaque, hitboxInimigo, 0, 0, 0)) {
                return false;
            }

            inimigo.foiAtingidoNesteChute = true;
            inimigo.estaColetando = false;
            inimigo.timerColeta = 0;
            inimigo.vida = (inimigo.vida || 0) + 1;

            if (inimigo.vida < 3) {
                animarDanoAlvo(inimigo);
            }

            const direcaoKnockback = controle.direcao === 'd' ? 1 : -1;
            let valorKnockbackInimigo = Number(obterKnockback(config, 'playerChute') || 0);

            if (inimigo.temEscudo && !inimigo.escudoVermelho && !inimigo.itensGuardadosNoCinto) {
                valorKnockbackInimigo *= Number(config.escudoKnockbackMultiplicador ?? 0.5);
            }

            const duracaoRecuoInimigo = 15;
            inimigo.framesKnockbackRestante = duracaoRecuoInimigo;
            inimigo.velocidadeKnockback = (valorKnockbackInimigo / duracaoRecuoInimigo) * direcaoKnockback;
            virarFenoParaFonteDano(inimigo, controle.x + ((controle.largura || 32) / 2));

            if (inimigo.vida >= 3) {
                if (inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                    processarMorteFeno(inimigo);
                } else {
                    removerInimigoDerrotado(inimigo);
                }
            }

            return true;
        }

        function atualizarTemporizadores() {
            if ((controle.cooldownChute || 0) > 0) {
                controle.cooldownChute--;
            }

            if ((controle.tempoChute || 0) > 0) {
                controle.tempoChute--;
            }

            atualizarEstadoChute();
        }

        return {
            atualizarEstadoChute,
            iniciarChute,
            processarEntradaChute,
            aplicarImpulsoChute,
            processarAcertoChuteEmInimigo,
            atualizarTemporizadores
        };
    }

    window.criarSistemaCombateCorpoACorpoJogador = criarSistemaCombateCorpoACorpoJogador;
})();