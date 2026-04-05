/**
 * Define o comportamento lógico de cada habilidade adquirida.
 */
window.aplicarEfeitosSkills = () => {
    const controle = window.playerControle;
    if (!controle || !window.playerSkills) return;

    // Define os valores base (padrão) antes de aplicar bônus
    controle.maxVida = 3;

    // Percorre todas as habilidades que o jogador já possui
    window.playerSkills.forEach(skillId => {
        switch (skillId) {
            case 'skill1':
                // Habilidade Vida: aumenta a resistência máxima em +1
                controle.maxVida += 1;
                break;
            
            case 'skilla':
                // Exemplo futuro: aumentar dano ou knockback
                break;

            case 'skillb':
                // Exemplo futuro: bônus de agilidade
                break;
        }
    });
};