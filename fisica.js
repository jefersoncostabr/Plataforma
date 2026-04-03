/**
 * Aplica gravidade e processa a lógica de pulo em uma entidade.
 * 
 * @param {Object} controle - O objeto de estado da entidade (x, y, velocidadeY, etc).
 * @param {Object} teclas - O mapa de teclas pressionadas.
 * @param {number} forcaPulo - A força aplicada no pulo (padrão 12).
 * @param {number} gravidade - A força da gravidade por quadro (padrão 0.6).
 * @param {number} cooldownValor - O tempo de espera para o próximo pulo.
 */
function aplicarFisica(controle, teclas, forcaPulo = 12, gravidade = 0.6, cooldownValor = 0) {
    // Inicializa variáveis de física se não existirem
    if (controle.velocidadeY === undefined) {
        console.log("Fisica: Inicializando variáveis de física.");
        controle.velocidadeY = 0;
        controle.noChao = false;
        controle.cooldownPulo = 0;
    }

    // Verifica o comando de pulo (Somente Espaço)
    const querPular = teclas[' '];

    // Só permite iniciar o pulo se estiver no chão, não estiver chutando e o cooldown acabou
    if (querPular && controle.noChao && !controle.chutando && (controle.cooldownPulo || 0) === 0) {
        console.log("Fisica: Pulo executado! Força aplicada:", forcaPulo);
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