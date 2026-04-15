(function () {
    function removerDoArrayInimigos(inimigo) {
        const index = Array.isArray(window.inimigos) ? window.inimigos.indexOf(inimigo) : -1;
        if (index > -1) {
            window.inimigos.splice(index, 1);
        }
    }

    function limparEquipamentosVisuaisInimigo(inimigo) {
        if (!inimigo) return;

        if (typeof window.limparVisuaisInimigo === 'function') {
            window.limparVisuaisInimigo(inimigo);
            return;
        }

        const elementos = [
            'armaElemento',
            'botaElemento',
            'escudoElemento',
            'jetpackElemento',
            'jetFogoElemento',
            'garraElemento',
            'cintoElemento'
        ];

        elementos.forEach((chave) => {
            const el = inimigo[chave];
            if (el && typeof el.remove === 'function') el.remove();
            inimigo[chave] = null;
        });

        if (Array.isArray(inimigo.garraBracos)) {
            inimigo.garraBracos.forEach((braco) => {
                if (braco && typeof braco.remove === 'function') braco.remove();
            });
        }
        inimigo.garraBracos = [];

        inimigo.temArma = false;
        inimigo.temBota = false;
        inimigo.temEscudo = false;
        inimigo.temJetpack = false;
        inimigo.temGarra = false;
        inimigo.temCinto = false;
        inimigo.jetpackAtivo = false;
    }

    function processarMorteFeno(inimigo, opcoes = {}) {
        if (!inimigo || inimigo.tipo !== 5) return false;

        const {
            tempoMs = 800,
            spriteDestruido = '../../assets/personagem/feno_quebrado.png'
        } = opcoes;

        inimigo.estaMorto = true;
        inimigo.framesKnockbackRestante = 0;
        inimigo.velocidadeKnockback = 0;
        inimigo.velocidadeY = 0;

        if (window.isTraining) {
            if (inimigo.elemento) {
                inimigo.elemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
            }

            removerDoArrayInimigos(inimigo);

            setTimeout(() => {
                inimigo.vida = 0;
                inimigo.x = inimigo.startX ?? inimigo.x;
                inimigo.y = inimigo.startY ?? inimigo.y;
                inimigo.estaMorto = false;
                inimigo.noChao = false;
                inimigo.velocidadeY = 0;

                if (inimigo.elemento) {
                    inimigo.elemento.style.filter = 'none';
                    inimigo.elemento.style.left = inimigo.x + 'px';
                    inimigo.elemento.style.bottom = inimigo.y + 'px';
                }

                if (Array.isArray(window.inimigos) && !window.inimigos.includes(inimigo)) {
                    window.inimigos.push(inimigo);
                }
            }, tempoMs);

            return true;
        }

        if (inimigo.elemento) {
            inimigo.elemento.src = spriteDestruido;
        }

        setTimeout(() => {
            if (inimigo.elemento && typeof inimigo.elemento.remove === 'function') {
                inimigo.elemento.remove();
            }
            removerDoArrayInimigos(inimigo);
        }, tempoMs);

        return true;
    }

    function criarSistemaMorteInimigo(opcoes = {}) {
        const {
            droparItensInimigo = () => {}
        } = opcoes;

        function removerInimigoDerrotado(inimigo, removerOpcoes = {}) {
            if (!inimigo) return;

            const {
                droparItens = true,
                darXP = true
            } = removerOpcoes;

            inimigo.estaMorto = true;

            if (droparItens) {
                droparItensInimigo(inimigo);
            }

            if (darXP && typeof window.ganharXP === 'function') {
                window.ganharXP(1);
            }

            limparEquipamentosVisuaisInimigo(inimigo);
            if (Array.isArray(inimigo.inventario)) inimigo.inventario = [];

            if (inimigo.elemento && typeof inimigo.elemento.remove === 'function') {
                inimigo.elemento.remove();
            }

            removerDoArrayInimigos(inimigo);
        }

        return {
            limparEquipamentosVisuaisInimigo,
            removerInimigoDerrotado,
            processarMorteFeno
        };
    }

    window.criarSistemaMorteInimigo = criarSistemaMorteInimigo;
})();
