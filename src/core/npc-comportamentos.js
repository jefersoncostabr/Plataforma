// Módulo de comportamentos reutilizáveis para NPCs
module.exports = {
    patrulha: function(npc, dt) {
        // Exemplo: patrulha simples
        npc.x += Math.sin(Date.now()/1000) * dt;
    },
    fujao: function(npc, dt) {
        // Exemplo: comportamento de fugir
        npc.x -= dt;
    },
    // Adicione outros comportamentos reutilizáveis aqui
};
