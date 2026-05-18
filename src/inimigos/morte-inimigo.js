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
            'cintoElemento',
            'coleteElemento',
            'bateriaElemento'
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

        if (inimigo.cintoAnimTimeout) {
            clearTimeout(inimigo.cintoAnimTimeout);
            inimigo.cintoAnimTimeout = null;
        }

        if (Array.isArray(inimigo.cintoAnimClones)) {
            inimigo.cintoAnimClones.forEach((clone) => {
                if (clone && typeof clone.remove === 'function') clone.remove();
            });
        }
        inimigo.cintoAnimClones = [];
        inimigo.cintoAnimando = false;
        inimigo.itensGuardadosNoCinto = false;

        inimigo.temArma = false;
        inimigo.temBota = false;
        inimigo.temEscudo = false;
        inimigo.temJetpack = false;
        inimigo.temGarra = false;
        inimigo.temCinto = false;
        inimigo.temColete = false;
        inimigo.temBateria = false;
        inimigo.jetpackAtivo = false;
    }

    function restaurarFenoNaOrigem(inimigo, spriteOriginal) {
        if (!inimigo) return;

        inimigo.vida = 0;
        inimigo.x = inimigo.startX ?? inimigo.x;
        inimigo.y = inimigo.startY ?? inimigo.y;
        inimigo.estaMorto = false;
        inimigo.noChao = false;
        inimigo.velocidadeY = 0;
        inimigo.framesKnockbackRestante = 0;
        inimigo.velocidadeKnockback = 0;
        inimigo.cooldownDanoEspinho = 0;

        if (inimigo.elemento) {
            inimigo.elemento.src = spriteOriginal;
            inimigo.elemento.style.filter = 'none';
            inimigo.elemento.style.display = 'block';
            inimigo.elemento.style.left = inimigo.x + 'px';
            inimigo.elemento.style.bottom = inimigo.y + 'px';
        }

        if (Array.isArray(window.inimigos) && !window.inimigos.includes(inimigo)) {
            window.inimigos.push(inimigo);
        }
    }

    function processarMorteFeno(inimigo, opcoes = {}) {
        if (!inimigo || inimigo.tipo !== window.GAME_CONSTANTS.INIMIGO_FENO_ID) return false;

        const {
            tempoMs = 800,
            spriteDestruido = '../../assets/personagem/feno_quebrado.png'
        } = opcoes;

        const spriteOriginal = inimigo.spriteBase || window.config?.spriteAlvoFeno || '../../assets/personagem/alvoFeno.png';

        inimigo.estaMorto = true;
        inimigo.framesKnockbackRestante = 0;
        inimigo.velocidadeKnockback = 0;
        inimigo.velocidadeY = 0;

        if (inimigo.morteFenoTimeout) {
            clearTimeout(inimigo.morteFenoTimeout);
            inimigo.morteFenoTimeout = null;
        }

        if (typeof flashComVibacao === 'function' && inimigo.elemento) {
            flashComVibacao(inimigo.elemento);
        }

        if (inimigo.elemento) {
            inimigo.elemento.style.filter = 'none';
            inimigo.elemento.src = spriteDestruido;
        }

        removerDoArrayInimigos(inimigo);

        inimigo.morteFenoTimeout = setTimeout(() => {
            inimigo.morteFenoTimeout = null;

            if (window.isTraining) {
                restaurarFenoNaOrigem(inimigo, spriteOriginal);
                return;
            }

            if (inimigo.elemento && typeof inimigo.elemento.remove === 'function') {
                inimigo.elemento.remove();
            }
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
    window.processarMorteFeno = processarMorteFeno;
})();
