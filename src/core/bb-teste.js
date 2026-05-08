/**
 * Testes do Sistema de Controle do BB
 * Execute no console do navegador
 */

console.log(`
╔════════════════════════════════════════╗
║   Sistema de Controle do BB           ║
╚════════════════════════════════════════╝

📝 COMANDOS DISPONÍVEIS:

1️⃣  Iniciar controle do BB:
    window.controlarBB()
    → Cria o BB na posição do player se não existir
    → Ativa modo de controle

2️⃣  Voltar ao player:
    window.controlarPlayer()
    → Desativa controle do BB

3️⃣  Garantir BB no estado:
    window.garantirBBNoEstado(x, y)
    → Inicializa BB se não existir

4️⃣  Verificar estado:
    window.bbEntidade
    → Mostra objeto do BB
    window.controlandoBB
    → true/false - está controlando?

═══════════════════════════════════════════

🎮 CONTROLES DO BB (quando ativo):

A/D ou Setas ←→   : Andar
ESPAÇO            : Pular
K                 : Interação (bb-interacao.png)
Q 2x (duplo tap)  : Voltar ao player

═══════════════════════════════════════════

🎯 CARACTERÍSTICAS:

✅ Física idêntica ao cao
✅ Colisão com plataformas
✅ Animação de andamento (bb-andando.png)
✅ Sprite de pulo = parado (bb-parado.png)
✅ Rotação ao pular (like pets)
✅ Double-tap Q para retorno
✅ Sem duplicação de código

═══════════════════════════════════════════
`);

// Teste rápido
if (window.controlarBB) {
    console.log('✅ Sistema de BB carregado com sucesso!');
    console.log('💡 Digite: window.controlarBB() para começar');
} else {
    console.error('❌ Erro: Sistema de BB não encontrado');
}
