/**
 * Aplica gravidade e processa a lógica de pulo em uma entidade.
 * 
 * @param {Object} controle - O objeto de estado da entidade (x, y, velocidadeY, etc).
 * @param {Object} teclas - O mapa de teclas pressionadas.
 * @param {number} forcaPulo - A força aplicada no pulo (padrão 12).
 * @param {number} gravidade - A força da gravidade por quadro (padrão 0.6).
 * @param {number} cooldownValor - O tempo de espera para o próximo pulo.
 */
function obterKnockbackPadrao(config = {}, fonte = 'default') {
    const base = Number(config?.knockbackBase ?? config?.knockbackInimigo ?? 150);
    const ajuste = Number(config?.knockbackAjustes?.[fonte] ?? 0);
    return base + ajuste;
}

function temEscudoAtivoPadrao(entidade) {
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

function obterKnockbackRecebidoPadrao(entidade, config = {}, fonte = 'default') {
    const valor = obterKnockbackPadrao(config, fonte);
    if (temEscudoAtivoPadrao(entidade)) {
        return valor * Number(config?.escudoKnockbackMultiplicador ?? 0.5);
    }
    return valor;
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

        if (typeof verificarColisaoComTiles === 'function' &&
            verificarColisaoComTiles(ent.x + offsetX, ent.y, largura, altura, plataformas)) {
            ent.x = xAnterior;

            if (opcoes.cancelarKnockbackAoColidir) {
                ent.framesKnockbackRestante = 0;
                ent.velocidadeKnockback = 0;
            }
            break;
        }

        if (typeof limitarPosicaoAoPalco === 'function') {
            const posAjustada = limitarPosicaoAoPalco(ent.x + offsetX, ent.y, largura, altura);
            ent.x = posAjustada.x - offsetX;
        }
    }
}

window.obterKnockbackPadrao = obterKnockbackPadrao;
window.temEscudoAtivoPadrao = temEscudoAtivoPadrao;
window.obterCapacidadeEscudoPadrao = obterCapacidadeEscudoPadrao;
window.obterProtecaoRestanteEscudoPadrao = obterProtecaoRestanteEscudoPadrao;
window.aplicarImpactoEscudoPadrao = aplicarImpactoEscudoPadrao;
window.obterKnockbackRecebidoPadrao = obterKnockbackRecebidoPadrao;
window.aplicarDeslocamentoHorizontalComColisaoPadrao = aplicarDeslocamentoHorizontalComColisaoPadrao;

function aplicarFisica(controle, teclas, forcaPulo = 12, gravidade = 0.6, cooldownValor = 0) {
    // Inicializa variáveis de física se não existirem
    if (controle.velocidadeY === undefined) {
        controle.velocidadeY = 0;
        controle.noChao = false;
        controle.cooldownPulo = 0;
    }

    // Verifica o comando de pulo (Somente Espaço)
    const querPular = teclas[' '];

    // Só permite iniciar o pulo se estiver no chão, não estiver chutando e o cooldown acabou
    if (querPular && controle.noChao && !controle.chutando && (controle.cooldownPulo || 0) === 0) {
        // console.log("Fisica: Pulo executado! Força aplicada:", forcaPulo);
        controle.velocidadeY = forcaPulo;
        controle.noChao = false;
        
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

