/**
 * Define o comportamento lógico de cada habilidade adquirida.
 */
window.aplicarEfeitosSkills = () => {
    const controle = window.playerControle;
    if (!controle || !window.playerSkills) return;

    // Define os valores base (padrão) antes de aplicar bônus
    controle.maxVida = 3;
    controle.danoProjetil = 1; // Dano base do projétil
    controle.multiplicadorCooldownChute = 1;
    controle.dashHabilitado = false;
    controle.cooldownDashMax = 0;
    controle.dashDuracao = 0;
    controle.distanciaDash = 0;
    controle.janelaDuploToqueDash = 250;

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
                controle.distanciaDash = 128;
                controle.janelaDuploToqueDash = 250;
                break;
            
            case skills.DROPAR:
                // Espaço reservado para efeitos futuros
                break;

            case skills.VISAO:
                // Espaço reservado para efeitos futuros
                break;
        }
    });
};

