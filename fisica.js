/**
 * Aplica gravidade e processa a lógica de pulo em uma entidade.
 * 
 * @param {Object} controle - O objeto de estado da entidade (x, y, velocidadeY, etc).
 * @param {Object} teclas - O mapa de teclas pressionadas.
 * @param {number} forcaPulo - A força aplicada no pulo (padrão 12).
 * @param {number} gravidade - A força da gravidade por quadro (padrão 0.6).
 */
function aplicarFisica(controle, teclas, forcaPulo = 12, gravidade = 0.6) {
    // Inicializa variáveis de física se não existirem
    if (controle.velocidadeY === undefined) {
        console.log("Fisica: Inicializando variáveis de física.");
        controle.velocidadeY = 0;
        controle.noChao = false;
    }
    // Verifica o comando de pulo (Somente Espaço)
    // Só permite pular se estiver encostado no chão
    const querPular = teclas[' '];

    if (querPular) {
        console.log("Fisica: Tecla Espaço detectada. noChao:", controle.noChao);
    }
    
    // Só permite iniciar o pulo se não estiver chutando
    if (querPular && controle.noChao && !controle.chutando) {
        console.log("Fisica: Pulo executado! Força aplicada:", forcaPulo);
        controle.velocidadeY = forcaPulo;
        controle.noChao = false;
    }

    // Aplica a gravidade e atualiza a posição DEPOIS de verificar o pulo
    // Isso garante que a nova velocidade do pulo seja aplicada ao Y neste quadro
    controle.velocidadeY -= gravidade;
    controle.y += controle.velocidadeY;
}