// Módulo de IAs reutilizáveis para NPCs
module.exports = {
    agressivo: function(npc, dt) {
        // Exemplo: IA agressiva
        npc.estado = "atacando";
    },
    passivo: function(npc, dt) {
        // Exemplo: IA passiva
        npc.estado = "idle";
    },
    // Adicione outras IAs reutilizáveis aqui
};
