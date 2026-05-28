/**
 * Define o comportamento lógico de cada habilidade adquirida.
 */
window.aplicarEfeitosSkills = () => {
    const controle = window.playerControle;
    if (!controle || !window.playerSkills) return;

    // Define os valores base (padrão) antes de aplicar bônus
    controle.maxVida = 3;
    controle.danoProjetil = 1; // Dano base do projétil
    controle.danoChute = 1;    // Dano base do chute
    controle.multiplicadorCooldownChute = 1;
    controle.dashHabilitado = false;
    controle.superDashHabilitado = false;
    controle.cooldownDashMax = 0;
    controle.dashDuracao = 0;
    controle.distanciaDash = 0;
    controle.janelaDuploToqueDash = 250;
    controle.temGarraPuxo = false;
    controle.temGarra2 = false;

    const itensGuardadosNoCinto = !!controle.itensGuardadosNoCinto;
    const totalEquipamentosSemBota = [
        !!controle.temArma && !itensGuardadosNoCinto,
        !!(controle.temEscudo || controle.escudoVermelho) && !itensGuardadosNoCinto,
        !!controle.temJetpack && !itensGuardadosNoCinto,
        !!controle.temGarra && !itensGuardadosNoCinto
    ].filter(Boolean).length;
    const pesoTemporarioAtivo = Number(controle.pesoTemporarioSuperDescida || 0) > 0;
    controle.pesado = totalEquipamentosSemBota >= 3 || pesoTemporarioAtivo;
    controle.leveComBota = !!controle.temBota && !controle.botaVermelha && !itensGuardadosNoCinto && totalEquipamentosSemBota <= 1 && !controle.pesado;

    const skills = window.SKILLS || {};

    // Percorre todas as habilidades que o jogador já possui
    window.playerSkills.forEach((skillNome) => {
        switch (skillNome) {
            case skills.VIDA:
                // Habilidade Vida: aumenta a resistência máxima em +1
                controle.maxVida += 1;
                break;
            
            case skills.ATIRADOR:
                // Habilidade Atirador: aumenta o dano do tiro em +1 (Total 2)
                controle.danoProjetil += 1;
                break;

            case skills.KICKBOXING:
                // Habilidade kickboxing: reduz o cooldown do chute pela metade
                controle.multiplicadorCooldownChute = 0.5;
                break;

            case skills.DASH:
                // Habilidade Dash: duplo toque para frente com impulso e cooldown
                controle.dashHabilitado = true;
                controle.cooldownDashMax = 45;
                controle.dashDuracao = 8;
                controle.distanciaDash = 128; // CONFIGURAÇÃO DASH PADRÃO: define 128px como base ao adquirir a skill
                controle.janelaDuploToqueDash = 250;
                break;
            
            case skills.SUPERDASH:
                controle.superDashHabilitado = true;
                break;

            case skills.KNOCKOUT:
                // Habilidade Knockout: aumenta o dano do chute em +1 (Total 2)
                controle.danoChute += 1;
                break;

            case skills.PRECISAO:
                // Habilidade Precisão: aumenta o dano do projétil em +1 (Cumulativo com Atirador)
                controle.danoProjetil += 1;
                break;

            case skills.DROPAR:
                // Espaço reservado para efeitos futuros
                break;

            case skills.VISAO:
                // Espaço reservado para efeitos futuros
                break;

            case skills.ADESTRAMENTO:
                // Habilita o controle manual do cão aliado (Lógica processada no movimento.js)
                break;

            case skills.GARRA:
                // Libera a tração avançada da garra (passagem estreita e estado de puxo).
                controle.temGarraPuxo = true;
                break;

            case skills.SALTITAR:
                // Enquanto estiver segurando pulo, começa saltos automáticos em sequência (apenas ao tocar o chão)
                controle.saltitarHabilitado = true;
                controle.cooldownSaltitar = 0;
                break;

            case skills.GARRA2:
                // Habilita a funcionalidade de carga da Garra 2
                controle.temGarra2 = true;
                break;
        }
    });
};
