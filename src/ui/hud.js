(function () {
    function criarSistemaHUDJogador(opcoes = {}) {
        const {
            controle,
            elemento,
            config = {},
            temEscudoAtivo = () => false
        } = opcoes;

        if (!controle || !elemento) {
            throw new Error('Controle e elemento do jogador são obrigatórios para inicializar o HUD.');
        }

        const hudElemento = document.createElement('div');
        hudElemento.id = 'player-hud';
        hudElemento.style.position = 'absolute';
        hudElemento.style.top = '10px';
        hudElemento.style.left = '10px';
        hudElemento.style.display = 'none';
        hudElemento.style.gap = '5px';
        hudElemento.style.alignItems = 'center';
        hudElemento.style.zIndex = '100';

        const containerFixo = document.getElementById('jogo-container') || elemento.parentElement;
        if (containerFixo) {
            containerFixo.appendChild(hudElemento);
        }

        function atualizarHUD() {
            if (!window.temSkill?.((window.SKILLS || {}).VISAO)) {
                hudElemento.style.display = 'none';
                return;
            }

            hudElemento.style.display = 'flex';
            hudElemento.innerHTML = '';

            const vidaAtual = (controle.maxVida || 3) - (controle.dano || 0);
            for (let i = 0; i < (controle.maxVida || 3); i++) {
                const coracao = document.createElement('span');
                coracao.textContent = '♥';
                coracao.className = i < vidaAtual ? 'hud-heart' : 'hud-heart hud-heart-lost';
                hudElemento.appendChild(coracao);
            }

            if (temEscudoAtivo()) {
                const slotsRestantes = (config.escudoTirosProtegidos || 3) - (controle.escudoProtegido || 0);
                for (let i = 0; i < slotsRestantes; i++) {
                    const iconeEscudo = document.createElement('img');
                    iconeEscudo.className = 'hud-shield';
                    iconeEscudo.src = config.spriteEscudoPlayer || 'assets/personagem/escudo.png';
                    iconeEscudo.alt = 'Escudo';
                    hudElemento.appendChild(iconeEscudo);
                }
            }

            const pontosLivres = Math.max(0, Number(window.skillPoints || 0));
            const xpNumero = document.createElement('span');
            xpNumero.className = 'hud-xp-numero';
            xpNumero.textContent = String(pontosLivres);
            hudElemento.appendChild(xpNumero);
        }

        function destruir() {
            if (hudElemento.parentElement) {
                hudElemento.remove();
            }
        }

        window.atualizarHUD = atualizarHUD;

        return {
            elemento: hudElemento,
            atualizarHUD,
            destruir
        };
    }

    window.criarSistemaHUDJogador = criarSistemaHUDJogador;
})();
