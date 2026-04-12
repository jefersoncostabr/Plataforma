# 🔬 Sistema de Testes de Estacas

Este conjunto de arquivos isolados permite estudar e debugar a lógica de colisão com estacas (spikes) de forma independente do resto do jogo.

## 📁 Arquivos

### `estacas.js`
**Módulo isolado com toda a lógica de estacas**

Contém:
- `verificarColisaoEstaca()` - Função principal
- `verificarEstacaCima()` - Lógica específica para estacas apontando para cima
- `verificarEstacaBaixo()` - Lógica específica para estacas apontando para baixo
- `verificarEstacaDireita()` - Lógica específica para estacas apontando para direita
- `verificarEstacaEsquerda()` - Lógica específica para estacas apontando para esquerda
- `aplicarSnapEstaca()` - Cálculo de snap (ajuste de posição) ao colidir
- `calcularCoordenadosEstaca()` - Funções auxiliares

**Cada função possui:**
- 📝 Documentação detalhada
- 🎨 Visualização ASCII de como funciona
- 💡 Explicação do sistema de coordenadas

### `teste_estacas.html`
**Interface visual interativa para testar estacas**

Abra no navegador com `Alt+L` (VS Code) ou duplo-clique.

**Dois painéis:**

1. **Painel Esquerdo - Teste Individual**
   - Selecione uma direção de estaca
   - Mova o quadrado rosa com **Setas** ou **WASD**
   - Observe como colide
   - Log em tempo real mostrando cada colisão
   - Botões para movimento precisos

2. **Painel Direito - Comparativo**
   - Visualiza os 4 tipos de estaca simultaneamente
   - Controle o tamanho da zona de colisão
   - Entenda as diferenças visuais

## 🎯 Como Usar para Estudar

### Passo 1: Entender a Estrutura
Abra `estacas.js` e leia os comentários ASCII em cada função:
```javascript
/**
 * ⚠️ ESTACA PARA CIMA
 * Pontas apontando para cima...
 * 
 * Visualização:
 * ```
 *    32    64 (X)
 * +-----+
 * | /\  |  <- Estacas apontando para CIMA
 * |/  \ |
 * +-----+  32
 * ```
 */
```

### Passo 2: Testar Visualmente
1. Abra `teste_estacas.html` no navegador
2. Selecione **CIMA** no dropdown
3. Use **Setas** para mover o jogador (quadrado rosa)
4. Observe quando e como ele para
5. Repita para BAIXO, DIREITA, ESQUERDA

### Passo 3: Verificar o Console
Abra DevTools (F12) → Console para ver logs de:
- Posição atual
- Valor de colisão
- Cálculos de snap

### Passo 4: Ajustar Parâmetros
No painel comparativo, mude o tamanho da estaca e veja como afeta a colisão.

## 🔍 Estrutura de uma Estaca

```javascript
// Formato JSON para uma estaca na grade
{
  tipo: 'estaca',           // Tipo de bloco
  direcao: 'cima',          // Direção: 'cima' | 'baixo' | 'direita' | 'esquerda'
  width: 16,                // Largura da zona de colisão (padrão: 16)
  height: 16,               // Altura da zona de colisão (padrão: 16)
  xOffset: 0,               // Deslocamento horizontal
  yOffset: 0                // Deslocamento vertical
}
```

## 📊 Sistemas de Coordenadas

Cada tile é 32x32 pixels:

```
Coluna:  0    1    2   (c)
         +----+----+----+
Linha 0  |    |    |    |
         | a1 | b1 | c1 |
         +----+----+----+
Linha 1  |    |    |    |
         | a2 | b2 | c2 |
         +----+----+----+
(r)
```

Para uma célula em `r=1, c=1`:
- **tileEsquerda** = 1 × 32 = 32
- **tileDireita** = 2 × 32 = 64
- **tileBaixo** = 1 × 32 = 32
- **tileTopo** = 2 × 32 = 64

## ⚙️ Direções de Estaca

### ⬆️ ESTACA CIMA
```
+-----+
| /\  |  Pontas apontando UP
|/  \ |  Bloqueia: topo do tile
+-----+
```
- Jogador colide vindo de CIMA
- Função: `verificarEstacaCima()`
- Snap: Empurra para cima do topo

### ⬇️ ESTACA BAIXO
```
+-----+
|\  / |  Pontas apontando DOWN
| \/ |  Bloqueia: base do tile
+-----+
```
- Jogador colide vindo de BAIXO
- Função: `verificarEstacaBaixo()`
- Snap: Empurra para baixo da base

### ➡️ ESTACA DIREITA
```
+-----+
|  > |  Pontas apontando RIGHT
| > <|  Bloqueia: esquerda do tile (xOffset: 16)
+-----+
```
- Jogador colide vindo de ESQUERDA
- Função: `verificarEstacaDireita()`
- Snap: Empurra para esquerda da zona

### ⬅️ ESTACA ESQUERDA
```
+-----+
| <  |  Pontas apontando LEFT
|> < |  Bloqueia: direita do tile (xOffset: 0)
+-----+
```
- Jogador colide vindo de DIREITA
- Função: `verificarEstacaEsquerda()`
- Snap: Empurra para direita da zona

## 🐛 Debugging

### Se a colisão não acontecer:
1. Verifique se o bloco está marcado como `tipo: 'estaca'`
2. Confirme se a `direcao` é uma das 4 válidas
3. Teste no `teste_estacas.html` primeiro

### Se o snap for errado:
1. Abra DevTools (F12)
2. Cheque o valor de `aplicarSnapEstaca()`
3. Compare com os valores esperados nos comentários

### Se há imprecisão:
- Ajuste `ESTACA_EPSILON = 0.01` em `estacas.js`
- Valores menores = mais preciso, mas pode causar tremores
- Valores maiores = mais tolerante, mas pode deixar "gaps"

## 🔗 Integração com colisao.js

Quando entender tudo funcionando aqui, substitua a lógica em `colisao.js`:

**ANTES** (muitas linhas de código):
```javascript
if (bloco.tipo === 'estaca') {
    // ... 80 linhas de lógica complexa ...
}
```

**DEPOIS** (limpo):
```javascript
if (bloco.tipo === 'estaca') {
    const resultado = verificarColisaoEstaca(r, c, bloco, x, y, largura, altura);
    if (resultado) return resultado;
}
```

## 💡 Dicas de Estudo

1. **Comece simples**: Teste uma direção por vez
2. **Use o comparativo**: Veja as 4 simultaneamente
3. **Varie tamanhos**: Teste com width/height diferentes
4. **Teste limites**: Move até o jogador ficar fora do canvas
5. **Leia o console**: Os logs dizem exatamente o que aconteceu

## 📖 Conceitos Importantes

### Colisão (Detecção)
Responde: **"O jogador está tocando a estaca agora?"**
- Usa comparação de retângulos
- Retorna dados precisos sobre onde/como colidiu

### Snap (Ajuste)
Responde: **"Para onde o jogador deve ir para não atravessar?"**
- Usa os dados da colisão
- Calcula a posição "exata" onde parar

### EPSILON
Pequeno valor (0.01) para corrigir erros de ponto flutuante:
- Sem: Pode ficar "preso" em geometrias
- Com: Suaviza o movimento

## 🚀 Próximos Passos

1. ✅ Entender cada direção (você está aqui)
2. ⏳ Testar com diferentes tamanhos/offsets
3. ⏳ Integrar em `colisao.js`
4. ⏳ Testar no jogo completo
5. ⏳ Adicionar efeitos de som/particle quando colidir

---

**Dúvidas?** Releia os comentários em `estacas.js` - cada função tem documentação detalhada!
