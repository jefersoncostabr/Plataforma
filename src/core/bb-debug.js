/**
 * Debug para o sistema de BB
 * Monitora o estado do zoom (rotação) e colisão
 */

(function () {
    let debugAtivo = false;
    let frameCount = 0;
    let ultimoFrame = 0;

    /**
     * Ativa o debug do BB
     */
    window.ativarDebugBB = function () {
        debugAtivo = true;
        console.log('🐛 DEBUG BB ativado');
        console.log('Use: window.debugBBFrame() para próximo frame');
        console.log('Use: window.desativarDebugBB() para desativar');
    };

    /**
     * Desativa o debug do BB
     */
    window.desativarDebugBB = function () {
        debugAtivo = false;
        console.log('🐛 DEBUG BB desativado');
    };

    /**
     * Console 1: Debug da Rotação Vertical (Zoom/Zook)
     * Mostra se a rotação está sendo aplicada e qual é o ângulo
     */
    window.debugBBZoom = function () {
        const bb = window.bbEntidade;
        if (!bb || !bb.elemento) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('╔════════════════════════════════════════╗');
        console.log('║  DEBUG BB - ZOOM/ROTAÇÃO VERTICAL      ║');
        console.log('╚════════════════════════════════════════╝');
        
        const transform = bb.elemento.style.transform;
        console.log(`📊 Transform atual: ${transform}`);
        
        console.log(`\n📈 Estado de Física:`);
        console.log(`   velocidadeY: ${bb.velocidadeY.toFixed(2)}`);
        console.log(`   noChao: ${bb.noChao}`);
        console.log(`   direcao: ${bb.direcao}`);
        
        // Calcula o que DEVERIA ser o ângulo
        if (!bb.noChao) {
            const inclinacaoMax = 20;
            const velReferencia = 6;
            const fator = Math.max(-1, Math.min(1, bb.velocidadeY / velReferencia));
            const anguloEsperado = -fator * inclinacaoMax;
            console.log(`\n✅ Ângulo ESPERADO: ${anguloEsperado.toFixed(1)}°`);
        } else {
            console.log(`\n⏸️  Está no chão - rotação desativada`);
        }

        // Verifica se a função de rotação existe
        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            console.log(`✅ window.aplicarRotacaoVerticalPet disponível`);
        } else {
            console.error(`❌ window.aplicarRotacaoVerticalPet NÃO ENCONTRADO`);
        }

        console.log('════════════════════════════════════════');
    };

    /**
     * Console 2: Debug da Colisão Lateral
     * Mostra as dimensões da hitbox de colisão
     */
    window.debugBBColisao = function () {
        const bb = window.bbEntidade;
        if (!bb || !bb.elemento) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('╔════════════════════════════════════════╗');
        console.log('║  DEBUG BB - COLISÃO LATERAL            ║');
        console.log('╚════════════════════════════════════════╝');
        
        console.log(`\n📦 Dimensões da Hitbox:`);
        console.log(`   largura: ${bb.largura}px (ESPERADO: 9px)`);
        console.log(`   altura: ${bb.altura}px (ESPERADO: 15px)`);
        console.log(`   offsetX: ${bb.offsetX}px (ESPERADO: 11px)`);
        
        console.log(`\n📍 Posição:`);
        console.log(`   x: ${bb.x.toFixed(1)}px`);
        console.log(`   y: ${bb.y.toFixed(1)}px`);
        
        console.log(`\n🎯 Hitbox Efetiva:`);
        console.log(`   esquerda: x=${bb.x} + offsetX=${bb.offsetX} = ${bb.x + bb.offsetX}`);
        console.log(`   direita: ${bb.x + bb.offsetX + bb.largura}`);
        console.log(`   largura colisão: ${bb.largura}px`);
        
        // Valores anteriores (se tivesse 20px)
        console.log(`\n📋 Comparação com anterior (20px):`);
        console.log(`   Anterior: largura=20, offsetX=5`);
        console.log(`   Esperado: largura=9 (-1px no lado esquerdo), offsetX=11`);
        
        if (bb.largura === 9 && bb.offsetX === 11) {
            console.log(`✅ Valores corretos!`);
        } else {
            console.error(`❌ Valores INCORRETOS! Verifique o arquivo bb.js`);
        }

        console.log('════════════════════════════════════════');
    };

    /**
     * Console 3: Debug em Tempo Real (próximo frame)
     */
    window.debugBBFrame = function () {
        const bb = window.bbEntidade;
        if (!bb || !bb.elemento) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('\n🎬 [FRAME ATUAL]');
        console.log(`Zoom/Rotação: ${bb.elemento.style.transform}`);
        console.log(`Hitbox: ${bb.largura}px × ${bb.altura}px @ offsetX=${bb.offsetX}`);
        console.log(`Velocidade Y: ${bb.velocidadeY.toFixed(2)}, No chão: ${bb.noChao}`);
    };

    /**
     * Atalho para verificação rápida
     */
    window.verificarBB = function () {
        console.clear();
        window.debugBBZoom();
        window.debugBBColisao();
    };

    console.log('✅ Debug BB carregado. Use:');
    console.log('   window.debugBBZoom() - Debug zoom/rotação');
    console.log('   window.debugBBColisao() - Debug colisão');
    console.log('   window.verificarBB() - Verificação completa');
    console.log('   window.debugBBFrame() - Info do frame atual');
})();
