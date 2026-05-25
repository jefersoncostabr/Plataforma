// Classe base genérica para NPCs
class NPCBase {
    constructor(config) {
        this.nome = config.nome || "NPC";
        this.vida = config.vida || 10;
        this.dano = config.dano || 1;
        this.sprite = config.sprite || null;
        this.ia = config.ia || null;
        this.drops = config.drops || [];
        this.comportamentos = config.comportamentos || [];
        this.estado = "idle";
        this.x = config.x || 0;
        this.y = config.y || 0;
    }

    update(dt) {
        if (this.ia) this.ia(this, dt);
        this.comportamentos.forEach(fn => fn(this, dt));
    }

    tomarDano(qtd) {
        this.vida -= qtd;
        if (this.vida <= 0) this.morrer();
    }

    morrer() {
        this.estado = "morto";
        // Lógica de drop, animação, etc.
    }
}

module.exports = NPCBase;
