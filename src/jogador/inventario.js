(function () {
    const INVENTARIO_STORAGE_KEY = 'plataformaInventario';

    function carregarInventarioSalvo() {
        try {
            const raw = localStorage.getItem(INVENTARIO_STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error('Erro ao ler inventário salvo:', error);
            return null;
        }
    }

    function salvarInventarioDoControle(controle) {
        if (!controle) return;
        try {
            const estado = {
                temEscudo: controle.temEscudo,
                escudoVermelho: controle.escudoVermelho,
                escudoProtegido: controle.escudoProtegido,
                temArma: controle.temArma,
                municao: controle.municao,
                temBota: controle.temBota,
                temJetpack: controle.temJetpack,
                temCinto: controle.temCinto,
                temGarra: controle.temGarra,
                temColete: controle.temColete,
                inventario: Array.isArray(controle.inventario) ? [...controle.inventario] : []
            };
            localStorage.setItem(INVENTARIO_STORAGE_KEY, JSON.stringify(estado));
        } catch (error) {
            console.error('Erro ao salvar inventário:', error);
        }
    }

    function limparInventarioSalvo() {
        localStorage.removeItem(INVENTARIO_STORAGE_KEY);
    }

    function aplicarInventarioSalvoNoControle(controle, inventarioSalvo = carregarInventarioSalvo()) {
        if (!controle || !inventarioSalvo || typeof inventarioSalvo !== 'object') return;

        controle.temEscudo = !!inventarioSalvo.temEscudo;
        controle.escudoVermelho = !!inventarioSalvo.escudoVermelho;
        controle.escudoProtegido = Number(inventarioSalvo.escudoProtegido || 0);
        controle.temArma = !!inventarioSalvo.temArma;
        controle.municao = Number(inventarioSalvo.municao || 0);
        controle.temBota = !!inventarioSalvo.temBota;
        controle.temJetpack = !!inventarioSalvo.temJetpack;
        controle.temCinto = !!inventarioSalvo.temCinto;
        controle.temGarra = !!inventarioSalvo.temGarra;
        controle.temColete = !!inventarioSalvo.temColete;
        controle.inventario = Array.isArray(inventarioSalvo.inventario) ? [...inventarioSalvo.inventario] : [];

        if (controle.inventario.includes('revolver')) controle.temArma = true;
        if (controle.inventario.includes('escudo')) controle.temEscudo = true;
        if (controle.inventario.includes('bota')) controle.temBota = true;
        if (controle.inventario.includes('jetpack')) controle.temJetpack = true;
        if (controle.inventario.includes('garra')) controle.temGarra = true;
        if (controle.inventario.includes('cinto')) controle.temCinto = true;
        if (controle.inventario.includes('colete')) controle.temColete = true;
    }

    function obterSpriteItem(tipo, config) {
        if (tipo === 'revolver') return config.spriteItemRevolver || '../../assets/personagem/revolver_pegavel.png';
        if (tipo === 'escudo') return config.spriteItemEscudo || '../../assets/personagem/escudo_pegavel.png';
        if (tipo === 'bota') return config.spriteItemBota || '../../assets/personagem/bota_pegavel.png';
        if (tipo === 'jetpack') return config.spriteItemJetpack || '../../assets/personagem/jetpack_pegavel.png';
        if (tipo === 'garra') return config.spriteItemGarra || '../../assets/personagem/garra_coletavel.png';
        if (tipo === 'cinto') return config.spriteItemCinto || '../../assets/personagem/cinto_coletavel.png';
        if (tipo === 'colete') return config.spriteItemColete || '../../assets/personagem/colete_coletavel.png';
        return '';
    }

    function criarSistemaInventarioJogador(opcoes = {}) {
        const {
            controle,
            config,
            atualizarVisualEscudo = () => {},
            getElementos = () => ({})
        } = opcoes;

        if (!controle) {
            throw new Error('Controle do jogador é obrigatório para inicializar o inventário.');
        }

        function salvarInventario() {
            salvarInventarioDoControle(controle);
        }

        function aplicarInventarioSalvo() {
            aplicarInventarioSalvoNoControle(controle);
        }

        function droparItemJogador() {
            if (!window.temSkill?.((window.SKILLS || {}).DROPAR)) {
                console.log("Habilidade 'Dropar' não adquirida.");
                return;
            }
            if (!controle.inventario || controle.inventario.length === 0) return;

            const {
                armaElemento,
                botaElemento,
                jetpackElemento,
                jetFogoElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            } = getElementos();

            const tipo = controle.inventario.pop();

            if (window.itemDefinitions && window.itemDefinitions[tipo]) {
                const itemData = window.itemDefinitions[tipo];
                if (itemData.efeitos && itemData.efeitos.jogador) {
                    for (const [chave, valor] of Object.entries(itemData.efeitos.jogador)) {
                        if (chave !== 'inventarioAdd' || !Array.isArray(controle.inventario)) {
                            controle[chave] = valor;
                        }
                    }
                }

                if (tipo === 'revolver' && armaElemento) {
                    armaElemento.style.display = 'none';
                } else if (tipo === 'escudo') {
                    atualizarVisualEscudo();
                } else if (tipo === 'bota' && botaElemento) {
                    botaElemento.style.display = 'none';
                } else if (tipo === 'jetpack') {
                    if (jetpackElemento) jetpackElemento.style.display = 'none';
                    if (jetFogoElemento) jetFogoElemento.style.display = 'none';
                } else if (tipo === 'garra' && garraElemento) {
                    garraElemento.style.display = 'none';
                } else if (tipo === 'cinto' && cintoElemento) {
                    cintoElemento.style.display = 'none';
                } else if (tipo === 'colete' && coleteElemento) {
                    controle.temColete = false;
                    coleteElemento.style.display = 'none';
                }

                const direcaoFace = controle.direcao === 'd' ? 1 : -1;
                let dropX = controle.x + (64 * direcaoFace);
                if (typeof limitarPosicaoAoPalco === 'function') {
                    const posFinal = limitarPosicaoAoPalco(dropX, controle.y, 32, 32);
                    dropX = posFinal.x;
                }

                window.itensColetaveis.push(window.criarItemColetavel(itemData, dropX, controle.y));
                salvarInventario();
                return;
            }

            const itemImg = document.createElement('img');
            itemImg.src = obterSpriteItem(tipo, config);

            const dadosItem = { tipo, x: 0, y: controle.y, velocidadeY: 5 };
            if (tipo === 'revolver') {
                dadosItem.municao = controle.municao;
                controle.temArma = false;
                if (armaElemento) armaElemento.style.display = 'none';
            } else if (tipo === 'escudo') {
                if (controle.escudoVermelho) {
                    itemImg.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
                }
                dadosItem.escudoProtegido = controle.escudoProtegido;
                dadosItem.escudoVermelho = controle.escudoVermelho;
                controle.temEscudo = false;
                controle.escudoVermelho = false;
                atualizarVisualEscudo();
            } else if (tipo === 'bota') {
                controle.temBota = false;
                if (botaElemento) botaElemento.style.display = 'none';
            } else if (tipo === 'jetpack') {
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                controle.timerAtivacaoJetpack = 0;
                if (jetpackElemento) jetpackElemento.style.display = 'none';
                if (jetFogoElemento) jetFogoElemento.style.display = 'none';
            } else if (tipo === 'garra') {
                controle.temGarra = false;
                if (garraElemento) garraElemento.style.display = 'none';
            } else if (tipo === 'cinto') {
                controle.temCinto = false;
                if (cintoElemento) cintoElemento.style.display = 'none';
            } else if (tipo === 'colete') {
                controle.temColete = false;
                if (coleteElemento) coleteElemento.style.display = 'none';
            }

            itemImg.style.position = 'absolute';
            itemImg.style.width = '32px';
            itemImg.style.height = '32px';
            itemImg.style.imageRendering = 'pixelated';
            adicionarAoLayer(itemImg, window.LAYERS.ITENS);

            const direcaoFace = controle.direcao === 'd' ? 1 : -1;
            let dropX = controle.x + (64 * direcaoFace);
            if (typeof limitarPosicaoAoPalco === 'function') {
                const posFinal = limitarPosicaoAoPalco(dropX, controle.y, 32, 32);
                dropX = posFinal.x;
            }

            dadosItem.x = dropX;
            dadosItem.elemento = itemImg;
            window.itensColetaveis.push(dadosItem);
            salvarInventario();
        }

        function droparItensInimigo(inimigo) {
            if (!inimigo?.inventario) return;

            const itensParaDropar = [...inimigo.inventario].reverse();
            itensParaDropar.forEach((tipo) => {
                const itemImg = document.createElement('img');
                itemImg.src = obterSpriteItem(tipo, config);
                itemImg.style.position = 'absolute';
                itemImg.style.width = '32px';
                itemImg.style.height = '32px';
                itemImg.style.imageRendering = 'pixelated';
                adicionarAoLayer(itemImg, window.LAYERS.ITENS);

                let dropX = inimigo.x;
                let tentativa = 0;
                const estaOcupado = (checkX) => window.itensColetaveis.some(it =>
                    Math.abs(it.x - checkX) < 20 && Math.abs(it.y - inimigo.y) < 20
                );

                while (estaOcupado(dropX)) {
                    tentativa++;
                    const direcao = tentativa % 2 === 0 ? -1 : 1;
                    const multiplier = Math.ceil(tentativa / 2);
                    dropX = inimigo.x + (32 * multiplier * direcao);
                }

                window.itensColetaveis.push({
                    x: dropX,
                    y: inimigo.y,
                    elemento: itemImg,
                    velocidadeY: 5,
                    tipo
                });
            });
        }

        window.salvarInventario = salvarInventario;
        window.limparInventarioSalvo = limparInventarioSalvo;
        window.carregarInventarioSalvo = carregarInventarioSalvo;

        return {
            carregarInventarioSalvo,
            salvarInventario,
            limparInventarioSalvo,
            aplicarInventarioSalvo,
            droparItemJogador,
            droparItensInimigo
        };
    }

    window.carregarInventarioSalvo = carregarInventarioSalvo;
    window.limparInventarioSalvo = limparInventarioSalvo;
    window.aplicarInventarioSalvoNoControle = aplicarInventarioSalvoNoControle;
    window.criarSistemaInventarioJogador = criarSistemaInventarioJogador;
})();
