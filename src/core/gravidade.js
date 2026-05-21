/**
 * Aplica gravidade e processa a lógica de pulo em uma entidade.
 * 
 * @param {Object} controle - O objeto de estado da entidade (x, y, velocidadeY, etc).
 * @param {Object} teclas - O mapa de teclas pressionadas.
 * @param {number} forcaPulo - A força aplicada no pulo (padrão 12).
 * @param {number} gravidade - A força da gravidade por quadro (padrão 0.6).
 * @param {number} cooldownValor - O tempo de espera para o próximo pulo.
 */

/**
 * Centraliza a lógica de "Snap" (ajuste fino de posição) após uma colisão horizontal ou vertical.
 * Resolve o item 5.2 da auditoria.
 * 
 * @param {number} valor - Coordenada atual (x ou y).
 * @param {number} offset - Offset da hitbox no eixo correspondente.
 * @param {number} dimensao - Largura ou altura da hitbox.
 * @param {Object} hit - O objeto de colisão retornado por verificarColisaoComTiles.
 * @param {string} direcao - 'direita', 'esquerda', 'cima' ou 'baixo'.
 * @returns {number} A nova coordenada ajustada.
 */
window.aplicarSnapColisaoPadrao = function(valor, offset, dimensao, hit, direcao) {
    const EPSILON = 0.01;
    const tamanhoTile = 32;

    if (direcao === 'direita') {
        const bordaEsquerda = (hit && hit.esquerdaReal !== undefined) 
            ? hit.esquerdaReal 
            : Math.floor((valor + offset + dimensao) / tamanhoTile) * tamanhoTile;
        return bordaEsquerda - dimensao - offset - EPSILON;
    }

    if (direcao === 'esquerda') {
        const bordaDireita = (hit && hit.direitaReal !== undefined)
            ? hit.direitaReal
            : (Math.floor((valor + offset) / tamanhoTile) + 1) * tamanhoTile;
        return bordaDireita - offset + EPSILON;
    }

    if (direcao === 'cima') {
        return (hit && hit.topoReal !== undefined)
            ? hit.topoReal
            : Math.floor((valor + EPSILON) / tamanhoTile + 1) * tamanhoTile;
    }

    if (direcao === 'baixo') {
        const bordaInferior = (hit && hit.baseReal !== undefined)
            ? hit.baseReal
            : Math.floor((valor + dimensao) / tamanhoTile) * tamanhoTile;
        return bordaInferior - dimensao;
    }

    return valor;
};

// Alias global para compatibilidade com sistema de movimento e IA
window.aplicarSnapColisao = window.aplicarSnapColisaoPadrao;

function temEscudoAtivoPadrao(entidade) {
    if (entidade?.eletricidadeTemporariaAtiva) return true;
    return !!(entidade?.temEscudo && !entidade?.escudoVermelho && !entidade?.itensGuardadosNoCinto);
}

function obterCapacidadeEscudoPadrao(config = {}) {
    return Math.max(1, Number(config?.escudoTirosProtegidos ?? 3));
}

function obterProtecaoRestanteEscudoPadrao(entidade, config = {}) {
    const total = obterCapacidadeEscudoPadrao(config);
    const usado = Math.max(0, Number(entidade?.escudoProtegido || 0));
    return Math.max(0, total - usado);
}

function aplicarImpactoEscudoPadrao(entidade, config = {}, opcoes = {}) {
    const totalProtegido = obterCapacidadeEscudoPadrao(config);

    if (!temEscudoAtivoPadrao(entidade)) {
        return {
            bloqueou: false,
            quebrou: false,
            restante: obterProtecaoRestanteEscudoPadrao(entidade, config),
            total: totalProtegido
        };
    }

    entidade.escudoProtegido = Math.max(0, Number(entidade?.escudoProtegido || 0)) + 1;
    const quebrou = entidade.escudoProtegido >= totalProtegido;

    if (quebrou) {
        entidade.escudoVermelho = true;
    } else if (typeof opcoes.flashElement === 'function' && opcoes.alvoVisual) {
        opcoes.flashElement(
            opcoes.alvoVisual,
            Number(opcoes.duracaoFlash ?? 150),
            Number(opcoes.intensidadeFlash ?? 6)
        );
    }

    if (typeof opcoes.atualizarVisualEscudo === 'function') {
        opcoes.atualizarVisualEscudo();
    }

    if (typeof opcoes.salvarInventario === 'function') {
        opcoes.salvarInventario();
    }

    return {
        bloqueou: true,
        quebrou,
        restante: Math.max(0, totalProtegido - Number(entidade.escudoProtegido || 0)),
        total: totalProtegido
    };
}

function aplicarDeslocamentoHorizontalComColisaoPadrao(ent, deslocX, plataformas = window.plataformas, opcoes = {}) {
    if (!ent || !deslocX) return;

    const largura = Number(opcoes.largura ?? ent.largura ?? 32);
    const altura = Number(opcoes.altura ?? ent.altura ?? 32);
    const offsetX = Number(opcoes.offsetX ?? ent.offsetX ?? 0);
    const config = opcoes.config || window.config || {};
    const maxPasso = Math.max(0.25, Number(opcoes.maxPasso ?? config.playerKnockbackPassoMax ?? config.inimigoKnockbackPassoMax ?? 1));
    const passos = Math.max(1, Math.ceil(Math.abs(deslocX) / maxPasso));
    const passoX = deslocX / passos;

    for (let i = 0; i < passos; i++) {
        const xAnterior = ent.x;
        ent.x += passoX;

        const hit = typeof verificarColisaoComTiles === 'function' ?
            verificarColisaoComTiles(ent.x + offsetX, ent.y, largura, altura, plataformas) : null;

        if (hit) {
            // Ignora colisões que não têm efeito horizontal (ex: teto de robôs abertos)
            if (hit.tipo !== 'solido' && hit.temColisaoLateral === false) {
                // Continua o movimento horizontal normalmente
            } else {
                ent.x = xAnterior;
                if (opcoes.cancelarKnockbackAoColidir) {
                    ent.framesKnockbackRestante = 0;
                    ent.velocidadeKnockback = 0;
                }
                break;
            }
        }

        if (typeof limitarPosicaoAoPalco === 'function') {
            const posAjustada = limitarPosicaoAoPalco(ent.x + offsetX, ent.y, largura, altura);
            ent.x = posAjustada.x - offsetX;
        }
    }
}

window.temEscudoAtivoPadrao = temEscudoAtivoPadrao;
window.aplicarImpactoEscudoPadrao = aplicarImpactoEscudoPadrao;
window.aplicarDeslocamentoHorizontalComColisaoPadrao = aplicarDeslocamentoHorizontalComColisaoPadrao;

function aplicarFisica(controle, teclas, forcaPulo = 12, gravidade = 0.6, cooldownValor = 0) {
    // Inicializa variáveis de física se não existirem
    if (controle.velocidadeY === undefined) {
        controle.velocidadeY = 0;
        controle.noChao = false;
        controle.cooldownPulo = 0;
    }

    // Verifica o comando de pulo (Somente Espaço)
    const querPular = !!teclas[' '];

    // Jump Buffer opcional por entidade (opt-in): guarda o input por poucos frames.
    const jumpBufferAtivo = !!controle.jumpBufferAtivo;
    if (jumpBufferAtivo) {
        const jumpBufferSegundos = Math.max(0, Number(controle.jumpBufferSegundos ?? 0.06));
        const jumpBufferFramesMax = Math.max(0, Math.round(jumpBufferSegundos * 60));
        const apertouPuloAgora = querPular && !controle.jumpBufferTeclaAnterior;
        controle.jumpBufferTeclaAnterior = querPular;

        if (apertouPuloAgora) {
            controle.jumpBufferFramesRestantes = jumpBufferFramesMax;
        } else if ((controle.jumpBufferFramesRestantes || 0) > 0) {
            controle.jumpBufferFramesRestantes--;
        }
    }

    const querPularComBuffer = querPular || (jumpBufferAtivo && (controle.jumpBufferFramesRestantes || 0) > 0);

    // Coyote Time opcional por entidade (opt-in) para evitar impacto global.
    const coyoteAtivo = !!controle.coyoteAtivo;
    if (coyoteAtivo) {
        const coyoteTimeSegundos = Math.max(0, Number(controle.coyoteTimeSegundos ?? 0.06));
        const coyoteFramesMax = Math.max(0, Math.round(coyoteTimeSegundos * 60));
        if (controle.noChao) {
            controle.coyoteFramesRestantes = coyoteFramesMax;
        } else if ((controle.coyoteFramesRestantes || 0) > 0) {
            controle.coyoteFramesRestantes--;
        }
    }

    const podePularDoChao = controle.noChao || (coyoteAtivo && (controle.coyoteFramesRestantes || 0) > 0);

    // Só permite iniciar o pulo se estiver no chão, não estiver chutando e o cooldown acabou
    if (querPularComBuffer && podePularDoChao && !controle.chutando && (controle.cooldownPulo || 0) === 0) {
        // console.log("Fisica: Pulo executado! Força aplicada:", forcaPulo);
        controle.velocidadeY = forcaPulo;
        controle.noChao = false;
        if (coyoteAtivo) {
            controle.coyoteFramesRestantes = 0;
        }
        if (jumpBufferAtivo) {
            controle.jumpBufferFramesRestantes = 0;
        }
        
        // Define o cooldown se houver um valor
        if (cooldownValor > 0) {
            controle.cooldownPulo = cooldownValor;
        }
    }

    // Aplica a gravidade e atualiza a posição DEPOIS de verificar o pulo
    // Isso garante que a nova velocidade do pulo seja aplicada ao Y neste quadro
    controle.velocidadeY -= gravidade;
    controle.y += controle.velocidadeY;
}
