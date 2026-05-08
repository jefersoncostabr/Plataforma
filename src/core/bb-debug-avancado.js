/**
 * Debug Avançado para BB - Monitora transformações em tempo real
 */

(function () {
    let monitorandoBB = false;
    let ultimoTransform = null;

    /**
     * Monitora mudanças no transform a cada frame
     */
    window.monitorarBBZoom = function (duracao = 5000) {
        const bb = window.bbEntidade;
        if (!bb || !bb.elemento) {
            console.error('❌ BB não inicializado');
            return;
        }

        monitorandoBB = true;
        ultimoTransform = null;
        const inicio = Date.now();

        console.log('🔍 Monitorando BB Zoom por', duracao, 'ms...');

        const intervalo = setInterval(() => {
            if (!monitorandoBB || (Date.now() - inicio > duracao)) {
                clearInterval(intervalo);
                monitorandoBB = false;
                console.log('⏹️ Monitoramento finalizado');
                return;
            }

            const transform = bb.elemento.style.transform;
            
            if (transform !== ultimoTransform) {
                console.log(`\n📍 Transform MUDOU:`);
                console.log(`   Anterior: ${ultimoTransform || '(vazio)'}`);
                console.log(`   Atual: ${transform}`);
                console.log(`   Velocidade Y: ${bb.velocidadeY.toFixed(2)}`);
                console.log(`   No chão: ${bb.noChao}`);
                
                // Tenta detectar se é rotação ou só escala
                if (transform.includes('rotate')) {
                    console.log('   ✅ ROTAÇÃO DETECTADA');
                } else if (transform.includes('scaleX')) {
                    console.log('   ⚠️ Só escala, sem rotação');
                }
                
                ultimoTransform = transform;
            }
        }, 50); // Verifica a cada 50ms

        console.log('Pulando BB com ESPAÇO para ver rotações...');
    };

    /**
     * Força aplicar a rotação manualmente e mostra resultado
     */
    window.forcarRotacaoBB = function () {
        const bb = window.bbEntidade;
        if (!bb || !bb.elemento) {
            console.error('❌ BB não inicializado');
            return;
        }

        console.log('🔨 Forçando rotação do BB...');
        console.log(`   Estado antes: ${bb.elemento.style.transform}`);

        // Força o estado para simular pulo
        const velocidadeOriginal = bb.velocidadeY;
        const noChaoOriginal = bb.noChao;
        
        bb.velocidadeY = -15;
        bb.noChao = false;

        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            window.aplicarRotacaoVerticalPet(bb);
            console.log(`   Estado depois: ${bb.elemento.style.transform}`);
            
            if (bb.elemento.style.transform.includes('rotate')) {
                console.log('   ✅ ROTAÇÃO APLICADA COM SUCESSO!');
            } else {
                console.error('   ❌ ROTAÇÃO NÃO FOI APLICADA');
            }
        } else {
            console.error('❌ Função aplicarRotacaoVerticalPet não existe');
        }

        // Restaura
        bb.velocidadeY = velocidadeOriginal;
        bb.noChao = noChaoOriginal;
    };

    /**
     * Verifica se animacoes-pets.js foi carregado
     */
    window.verificarAnimacoesPets = function () {
        console.log('\n📋 Verificação de Dependências:');
        
        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            console.log('✅ animacoes-pets.js CARREGADO');
            console.log('   Função: window.aplicarRotacaoVerticalPet');
        } else {
            console.error('❌ animacoes-pets.js NÃO CARREGADO OU FUNÇÃO NÃO EXISTE');
        }

        if (typeof window.atualizarAnimacao === 'function') {
            console.log('✅ animacao.js CARREGADO');
            console.log('   Função: window.atualizarAnimacao');
        } else {
            console.error('❌ animacao.js NÃO CARREGADO OU FUNÇÃO NÃO EXISTE');
        }
    };

    /**
     * Teste completo de zoom
     */
    window.testarZoomBB = function () {
        console.clear();
        console.log('═══════════════════════════════════════');
        console.log('   TESTE COMPLETO DE ZOOM DO BB');
        console.log('═══════════════════════════════════════\n');

        window.verificarAnimacoesPets();
        
        console.log('\n---\n');
        
        window.debugBBZoom();
        
        console.log('\n---\n');
        
        window.forcarRotacaoBB();
        
        console.log('\n═══════════════════════════════════════');
        console.log('💡 Execute: window.monitorarBBZoom()');
        console.log('   e pule (ESPAÇO) para ver mudanças\n');
    };

    console.log('✅ BB-Debug-Avançado carregado. Use:');
    console.log('   window.testarZoomBB() - Teste completo');
    console.log('   window.forcarRotacaoBB() - Força rotação');
    console.log('   window.monitorarBBZoom() - Monitora em tempo real');
    console.log('   window.verificarAnimacoesPets() - Verifica deps');
})();
