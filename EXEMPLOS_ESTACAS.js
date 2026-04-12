/**
 * EXEMPLOS DE USO - estacas.js
 * 
 * Copie e cole estes exemplos no console (F12) enquanto teste_estacas.html está aberto
 * para testar diferentes cenários da lógica de estacas.
 */

// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 1: Testar colisão manualmente
// ═══════════════════════════════════════════════════════════════════════

// Criar uma estaca apontando para cima
const estaca1 = {
    tipo: 'estaca',
    direcao: 'cima',
    width: 16,
    height: 16,
    xOffset: 0,
    yOffset: 0
};

// Verificar colisão com jogador em posição específica
const resultado1 = verificarColisaoEstaca(
    1,      // r (linha) = tile Y / 32
    1,      // c (coluna) = tile X / 32
    estaca1,
    30,     // x (posição X do jogador)
    40,     // y (posição Y do jogador)
    16,     // largura do jogador
    16      // altura do jogador
);

console.log("Teste 1 - Estaca CIMA:", resultado1);
// Esperado: { tipo: 'estaca', direcao: 'cima', topoReal: 64, baseReal: 48 } ou false


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 2: Testar snap após colisão
// ═══════════════════════════════════════════════════════════════════════

if (resultado1) {
    const novaY = aplicarSnapEstaca(
        40,              // posição Y atual
        0,               // offsetY do jogador
        16,              // altura do jogador
        resultado1,      // dados da colisão
        'cima'           // direção do movimento que causou colisão
    );
    console.log("Snap Y após colisão CIMA:", novaY);
    // Esperado: 64 (posição acima da estaca)
}


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 3: Testar todas as 4 direções
// ═══════════════════════════════════════════════════════════════════════

const direcoes = ['cima', 'baixo', 'direita', 'esquerda'];

direcoes.forEach(direcao => {
    const estaca = {
        tipo: 'estaca',
        direcao: direcao,
        width: 16,
        height: 16,
        xOffset: direcao === 'direita' ? 16 : 0,
        yOffset: 0
    };
    
    const colisao = verificarColisaoEstaca(1, 1, estaca, 40, 40, 16, 16);
    console.log(`Estaca ${direcao.toUpperCase()}:`, colisao ? '✓ Colisão' : '✗ Sem colisão');
});


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 4: Testar com tamanhos diferentes
// ═══════════════════════════════════════════════════════════════════════

const tamanhos = [8, 12, 16, 20, 24];

tamanhos.forEach(tamanho => {
    const estaca = {
        tipo: 'estaca',
        direcao: 'cima',
        width: tamanho,
        height: tamanho,
        xOffset: 0,
        yOffset: 0
    };
    
    const colisao = verificarColisaoEstaca(1, 1, estaca, 40, 40, 16, 16);
    console.log(`Tamanho ${tamanho}px:`, colisao ? 'Colisão' : 'Sem colisão');
});


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 5: Simular movimento com detecção de colisão
// ═══════════════════════════════════════════════════════════════════════

function simularMovimento(direcaoEstaca) {
    console.log(`\n=== Simulação de movimento contra estaca ${direcaoEstaca.toUpperCase()} ===`);
    
    const estaca = {
        tipo: 'estaca',
        direcao: direcaoEstaca,
        width: 16,
        height: 16,
        xOffset: direcaoEstaca === 'direita' ? 16 : 0,
        yOffset: 0
    };
    
    let posicaoX = 0;
    let posicaoY = 0;
    
    // Simular 100 passos de movimento
    for (let passo = 0; passo < 100; passo++) {
        // Tentar mover para direita (exemplo)
        let novaX = posicaoX + 2;
        let novaY = posicaoY;
        
        // Verificar colisão
        const colisao = verificarColisaoEstaca(1, 1, estaca, novaX, novaY, 16, 16);
        
        if (colisao) {
            // Se colidiu, aplicar snap
            novaX = aplicarSnapEstaca(novaX, 0, 16, colisao, 'direita');
            console.log(`Passo ${passo}: Colisão! X: ${posicaoX.toFixed(1)} → ${novaX.toFixed(1)}`);
            break;
        }
        
        posicaoX = novaX;
    }
    
    console.log(`Final X: ${posicaoX.toFixed(1)}`);
}

// Testar movimento contra cada tipo de estaca
simularMovimento('cima');
// simularMovimento('baixo');
// simularMovimento('direita');
// simularMovimento('esquerda');


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 6: Visualizar cálculo de coordenadas
// ═══════════════════════════════════════════════════════════════════════

const bloco = {
    tipo: 'estaca',
    direcao: 'direita',
    width: 16,
    height: 16,
    xOffset: 16,
    yOffset: 0
};

const coords = calcularCoordenadosEstaca(2, 3, bloco);
console.log("Coordenadas do tile [r=2, c=3]:", coords);
// Esperado:
// {
//   tileEsquerda: 96,
//   tileDireita: 128,
//   tileBaixo: 64,
//   tileTopo: 96,
//   width: 16,
//   height: 16,
//   xOffset: 16,
//   yOffset: 0
// }


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 7: Testar edge cases
// ═══════════════════════════════════════════════════════════════════════

console.log("\n=== EDGE CASES ===");

// Bloco inválido
const blocoInvalido = { tipo: 'platform' };
const resultadoInvalido = verificarColisaoEstaca(1, 1, blocoInvalido, 40, 40, 16, 16);
console.log("Bloco não é estaca:", resultadoInvalido); // false

// Direção inválida
const espiãoInvalida = { tipo: 'estaca', direcao: 'diagonal' };
const resultadoInvalida = verificarColisaoEstaca(1, 1, espiãoInvalida, 40, 40, 16, 16);
console.log("Direção inválida:", resultadoInvalida); // false ou warning


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 8: Comparar diferentes yOffset
// ═══════════════════════════════════════════════════════════════════════

console.log("\n=== Teste yOffset ===");

const yOffsets = [0, 4, 8, 12, 16];

yOffsets.forEach(yOff => {
    const estaca = {
        tipo: 'estaca',
        direcao: 'cima',
        width: 16,
        height: 16,
        xOffset: 0,
        yOffset: yOff
    };
    
    const coords = calcularCoordenadosEstaca(1, 1, estaca);
    const topoReal = coords.tileTopo - yOff;
    const baseReal = topoReal - 16;
    
    console.log(`yOffset=${yOff}: Colisão entre Y=${baseReal.toFixed(1)} e Y=${topoReal.toFixed(1)}`);
});


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 9: Comparar diferentes xOffset
// ═══════════════════════════════════════════════════════════════════════

console.log("\n=== Teste xOffset ===");

const xOffsets = [0, 4, 8, 16];

xOffsets.forEach(xOff => {
    const estaca = {
        tipo: 'estaca',
        direcao: 'direita',
        width: 16,
        height: 16,
        xOffset: xOff,
        yOffset: 0
    };
    
    const coords = calcularCoordenadosEstaca(1, 1, estaca);
    const direitaReal = coords.tileDireita - xOff;
    const esquerdaReal = direitaReal - 16;
    
    console.log(`xOffset=${xOff}: Colisão entre X=${esquerdaReal.toFixed(1)} e X=${direitaReal.toFixed(1)}`);
});


// ═══════════════════════════════════════════════════════════════════════
// EXEMPLO 10: Teste de performance
// ═══════════════════════════════════════════════════════════════════════

console.log("\n=== TESTE DE PERFORMANCE ===");

const estaca = {
    tipo: 'estaca',
    direcao: 'cima',
    width: 16,
    height: 16,
    xOffset: 0,
    yOffset: 0
};

const iteracoes = 10000;
console.time('10000 verificações');

for (let i = 0; i < iteracoes; i++) {
    verificarColisaoEstaca(1, 1, estaca, Math.random() * 64, Math.random() * 64, 16, 16);
}

console.timeEnd('10000 verificações');


// ═══════════════════════════════════════════════════════════════════════
// DICAS DE DEBUG
// ═══════════════════════════════════════════════════════════════════════

/*
1. Use console.log() para imprimir resultados
   console.log("Variável:", variavel);

2. Use console.table() para dados estruturados
   console.table(resultado);

3. Use debugger; para pausar execução
   debugger; // Abre DevTools quando executa

4. Use console.time() / console.timeEnd() para performance
   console.time('teste');
   // ... código ...
   console.timeEnd('teste');

5. Use console.assert() para verificações
   console.assert(colisao.tipo === 'estaca', 'Tipo incorreto!');

6. Inspecione valores com JSON.stringify()
   console.log(JSON.stringify(resultado, null, 2));
*/
