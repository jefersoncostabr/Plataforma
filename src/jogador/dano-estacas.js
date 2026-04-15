(function () {
    function criarSistemaDanoEstacasJogador(opcoes = {}) {
        const {
            controle,
            config,
            elemento,
            escudoElemento,
            atualizarVisualEscudo = () => {},
            salvarInventario = () => {}
        } = opcoes;

        if (!controle || !config || !elemento) {
            throw new Error('Controle, config e elemento do jogador são obrigatórios para o sistema de dano por estacas.');
        }

        function temEscudoAtivo() {
            return controle.temEscudo && !controle.escudoVermelho && !controle.itensGuardadosNoCinto;
        }

        function aplicarDanoEspinho(colisaoEstaca) {
            if (!colisaoEstaca || colisaoEstaca.tipo !== 'estaca') return;

            if (
                controle.estaAgachado &&
                colisaoEstaca.direcao === 'baixo' &&
                typeof colisaoEstaca.baseReal === 'number'
            ) {
                const topoJogador = controle.y + controle.altura;
                const tolerancia = Number(config.toleranciaPassarAgachadoEspinho ?? 1);
                if (topoJogador <= colisaoEstaca.baseReal + tolerancia) {
                    return;
                }
            }

            if ((controle.cooldownDanoEspinho || 0) > 0) return;

            controle.cooldownDanoEspinho = Number(config.cooldownDanoEspinho ?? 24);

            if (colisaoEstaca.direcao === 'cima') {
                const impulsoVertical = Number(config.knockbackEspinhoUpY ?? 8);
                controle.velocidadeY = Math.max(controle.velocidadeY || 0, impulsoVertical);
            }

            if (colisaoEstaca.esquerdaReal !== undefined && colisaoEstaca.direitaReal !== undefined) {
                const centroEstaca = (colisaoEstaca.esquerdaReal + colisaoEstaca.direitaReal) / 2;
                const centroPlayer = controle.x + (controle.offsetX || 0) + ((controle.largura || 0) / 2);
                const direcaoKnock = centroPlayer < centroEstaca ? -1 : 1;
                const valorKnock = Number(config.knockbackEspinho ?? 90);
                const duracaoKnock = 10;
                controle.framesKnockbackRestante = Math.max(controle.framesKnockbackRestante || 0, duracaoKnock);
                controle.velocidadeKnockback = (valorKnock / duracaoKnock) * direcaoKnock;
            }

            if (temEscudoAtivo()) {
                controle.escudoProtegido = (controle.escudoProtegido || 0) + 1;
                const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);

                const quebrouEscudoAgora = controle.escudoProtegido >= tirosProtegidos;
                if (quebrouEscudoAgora) {
                    controle.escudoVermelho = true;
                } else if (typeof flashElement === 'function' && escudoElemento) {
                    flashElement(escudoElemento, 120, 6);
                }

                atualizarVisualEscudo();
                salvarInventario();
                return;
            }

            const dano = Number(config.danoEspinho ?? 1);
            controle.dano = (controle.dano || 0) + dano;

            if (typeof flashComVibacao === 'function') {
                flashComVibacao(elemento);
            }

            const limiteVida = controle.maxVida || 3;
            if (controle.dano >= limiteVida) {
                controle.dano = 0;
                alert('Game Over! Você foi derrotado pelos espinhos.');
                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
            }
        }

        function detectarContatoEspinho() {
            if (typeof verificarColisaoComTiles !== 'function') return null;

            const xBase = controle.x + (controle.offsetX || 0);
            const yBase = controle.y;
            const largura = controle.largura;
            const altura = controle.altura;

            const hitDireto = verificarColisaoComTiles(xBase, yBase, largura, altura, window.plataformas);
            if (hitDireto && hitDireto.tipo === 'estaca') return hitDireto;

            const pontos = [
                { x: xBase + 1, y: yBase - 1 },
                { x: xBase + largura - 1, y: yBase - 1 },
                { x: xBase - 1, y: yBase + Math.floor(altura / 2) },
                { x: xBase + largura + 1, y: yBase + Math.floor(altura / 2) },
                { x: xBase - 1, y: yBase + Math.max(2, altura - 2) },
                { x: xBase + largura + 1, y: yBase + Math.max(2, altura - 2) },
                { x: xBase + Math.floor(largura / 2), y: yBase + altura + 1 }
            ];

            for (const p of pontos) {
                const hitProbe = verificarColisaoComTiles(p.x, p.y, 1, 1, window.plataformas);
                if (hitProbe && hitProbe.tipo === 'estaca') {
                    return hitProbe;
                }
            }

            return null;
        }

        return {
            temEscudoAtivo,
            aplicarDanoEspinho,
            detectarContatoEspinho
        };
    }

    window.criarSistemaDanoEstacasJogador = criarSistemaDanoEstacasJogador;
})();
