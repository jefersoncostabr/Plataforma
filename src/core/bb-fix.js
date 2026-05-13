/**
 * Fix para BB - Reaplica colisão e zoom
 * Soluciona problemas de cache ou inicialização
 */

(function () {
    /**
     * Reaplica a colisão reduzida ao BB
     */
    window.repararColisaoBB = function () {
        const bb = window.bbEntidade;
        if (!bb) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('🔧 Reparando colisão do BB...');
        console.log(`   ANTES: largura=${bb.largura}, offsetX=${bb.offsetX}`);

        bb.largura = 9;
        bb.offsetX = 11;

        console.log(`   DEPOIS: largura=${bb.largura}, offsetX=${bb.offsetX}`);
        console.log('✅ Colisão reparada!');
    };

    /**
     * Reaplica o zoom ao BB durante o próximo pulo
     */
    window.testarZoomBBAgora = function () {
        const bb = window.bbEntidade;
        if (!bb) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('🔧 Testando zoom do BB...');
        console.log(`Função aplicarRotacaoVerticalPet: ${typeof window.aplicarRotacaoVerticalPet}`);
        
        // Simula pulo
        console.log('\n📌 Simulando pulo...');
        bb.velocidadeY = -12;
        bb.noChao = false;

        // Aplica rotação
        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            window.aplicarRotacaoVerticalPet(bb);
            console.log(`Transform: ${bb.elemento.style.transform}`);
            
            if (bb.elemento.style.transform.includes('rotate')) {
                console.log('✅ Zoom/Rotação FUNCIONANDO!');
            } else {
                console.error('❌ Zoom/Rotação NÃO funcionando');
            }
        } else {
            console.error('❌ Função aplicarRotacaoVerticalPet não encontrada');
        }
    };

    /**
     * Reinicializa o BB completamente
     */
    window.reinicializarBB = function (x, y) {
        if (!window.inicializarBB) {
            console.error('❌ Função inicializarBB não encontrada');
            return;
        }

        const posX = x || (window.playerControle?.x || 100);
        const posY = y || (window.playerControle?.y || 100);

        console.log(`🔄 Reinicializando BB em (${posX}, ${posY})...`);
        
        // Remove BB antigo
        if (window.bbEntidade && window.bbEntidade.elemento) {
            window.bbEntidade.elemento.remove();
            window.bbEntidade = null;
        }

        // Cria novo
        window.inicializarBB(posX, posY, window.config);
        console.log('✅ BB reinicializado!');
    };

    /**
     * Verifica tudo de uma vez
     */
    window.verificarTudoBB = function () {
        console.clear();
        console.log('╔════════════════════════════════════════╗');
        console.log('║   VERIFICAÇÃO COMPLETA DO BB           ║');
        console.log('╚════════════════════════════════════════╝\n');

        const bb = window.bbEntidade;
        
        // 1. Existe?
        if (!bb) {
            console.error('❌ BB não inicializado');
            console.log('\n💡 Execute: window.controlarBB()');
            return;
        }
        console.log('✅ BB inicializado');

        // 2. Colisão
        console.log('\n📦 Colisão Lateral:');
        console.log(`   largura: ${bb.largura} (esperado: 9)`);
        console.log(`   offsetX: ${bb.offsetX} (esperado: 11)`);
        if (bb.largura === 9 && bb.offsetX === 11) {
            console.log('   ✅ CORRETO');
        } else {
            console.log('   ❌ ERRADO - Execute: window.repararColisaoBB()');
        }

        // 3. Zoom
        console.log('\n🎬 Zoom/Rotação:');
        console.log(`   Função existe: ${typeof window.aplicarRotacaoVerticalPet === 'function' ? '✅' : '❌'}`);
        console.log(`   Transform atual: ${bb.elemento.style.transform}`);
        
        // 4. Player parado
        console.log('\n⏸️ Player Parado:');
        console.log(`   Controlando BB: ${window.controlandoBB}`);
        if (window.playerControle) {
            console.log(`   Velocidade player: ${window.playerControle.velocidadeHorizontalAtual || 0}`);
            if (window.controlandoBB && (!window.playerControle.movendoHorizontal)) {
                console.log('   ✅ Player parado');
            } else if (window.controlandoBB) {
                console.log('   ⚠️ Player ainda se move');
            }
        }

        console.log('\n════════════════════════════════════════');
        console.log('💡 Se houver problemas:');
        console.log('   window.repararColisaoBB() - Colisão');
        console.log('   window.testarZoomBBAgora() - Zoom');
        console.log('   window.reinicializarBB() - Reiniciar tudo');
    };

})();
