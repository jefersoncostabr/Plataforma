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

