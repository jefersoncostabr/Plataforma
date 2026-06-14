# Planejamento: Modo Runner (Side-Scrolling Automático)

## 1. Descrição
Modo de jogo estilo "Infinite Runner" onde o jogador avança automaticamente e o chão é gerado de forma procedural à frente dele. O jogo termina se o jogador encostar na borda esquerda da tela.

## 2. Requisitos de Gameplay
1. ~~**Scroll Automático**: O jogador avança `N` pixels por frame.~~ (CONCLUÍDO)
2. ~~**Liberdade de Movimento**: O jogador ainda pode pular e atirar.~~ (CONCLUÍDO)
3. ~~**Limite Letal**: A borda esquerda da câmera mata o jogador.~~ (CONCLUÍDO)
4. ~~**Chão Infinito**: O script gera novos blocos de colisão à frente do jogador.~~ (CONCLUÍDO)
5. ~~**Expansão de Mundo**: A variável `window.mundoLargura` aumenta dinamicamente.~~ (CONCLUÍDO)
6. ~~**Ativação via Console**: Script para forçar o modo em qualquer fase.~~ (CONCLUÍDO)
7. ~~**Reciclagem de Memória**: Remoção de tiles antigos para performance.~~ (CONCLUÍDO)
8. ~~**Obstáculos Aleatórios**: Injeção de espinhos no chão gerado.~~ (CONCLUÍDO)
9. ~~**Dificuldade Progressiva**: Aumento gradual de velocidade conforme a distância.~~ (CONCLUÍDO)
10. ~~**Ambiente Isolado**: Ao iniciar, limpar todos os elementos da fase anterior (tiles, inimigos, itens).~~ (CONCLUÍDO)
11. ~~**Fase Virtual**: Criar um objeto de fase limpo em memória para não depender de arquivos JSON externos durante o modo.~~ (CONCLUÍDO)
12. ~~**Sincronização de Chaves**: Corrigir formato de coordenadas para compatibilidade com o motor de colisão.~~ (CONCLUÍDO)
13. ~~**Renderização Dinâmica**: Criar elementos visuais (IMG) para o chão e espinhos gerados proceduralmente.~~ (CONCLUÍDO)
14. ~~**Geração por Segmentos**: Implementar áreas configuráveis (planas e perigosas) que se intercalam a cada N blocos.~~ (CONCLUÍDO)
15. ~~**Bioma de Saltos**: Adicionar plataformas de 1 e 2 blocos de altura, com buracos e chão de segurança (altura base).~~ (CONCLUÍDO)
16. ~~**Pilares Empilhados**: Transformar o bioma de saltos em pilares verticais empilhados em vez de plataformas flutuantes.~~ (CONCLUÍDO)
17. ~~**Colisão de Avanço**: Corrigir falha onde o movimento automático ignorava colisões horizontais (clipping).~~ (CONCLUÍDO)

## 3. Implementação Técnica
- **Pasta**: `src/modes/runner/`
- **Ativação**: Flag `"modoRunner": true` no JSON da fase.
- **Variáveis Utilizadas**:
    - `window.playerControle.x`
    - `window.cameraX`
    - `window.prepararMorteJogador()`
    - `window.plataformas`: Objeto de colisões.
    - `window.mundoLargura`: Largura total do nível.

## 4. Ordem de Execução
1. ~~Validar ativação via `faseAtualData`.~~ (CONCLUÍDO)
2. ~~Mover jogador e verificar morte na borda esquerda.~~ (CONCLUÍDO)
3. ~~**Gerador de Chão e Obstáculos**: Monitorar `player.x` e injetar tiles/espinhos.~~ (CONCLUÍDO)
4. ~~**Limpeza**: Remover chaves de `window.plataformas` atrás da câmera.~~ (CONCLUÍDO)
5. ~~**Aceleração**: Incrementar a velocidade base a cada frame até um limite máximo.~~ (CONCLUÍDO)
6. ~~**Inicialização de Modo**: Limpar `window.plataformas`, `window.inimigos` e reposicionar o player.~~ (CONCLUÍDO)
7. ~~**Safe Start**: Aplicar um pequeno atordoamento inicial para garantir que o chão seja processado antes do player cair.~~ (CONCLUÍDO)
8. ~~**Sincronia Visual**: Gerar e destruir elementos DOM (IMG) acompanhando a lógica do mundo.~~ (CONCLUÍDO)
9. ~~**Lógica de Biomas/Áreas**: Alternar entre trechos planos e trechos com obstáculos baseando-se em contadores de blocos.~~ (CONCLUÍDO)
10. ~~**Geração de Plataformas Variadas**: Dentro do bioma de saltos, gerar plataformas com alturas e larguras aleatórias, e buracos.~~ (CONCLUÍDO)

## 6. Comandos de Console
Para ativar o modo manualmente em qualquer fase, use:
```javascript
window.ativarModoRunner(true, 2.5); // Ativar com velocidade 2.5
window.ativarModoRunner(false);     // Desativar
```

## 5. Exemplo de Configuração (JSON da Fase)
```json
{
  "nome": "Fase de Fuga",
  "modoRunner": true,
  "velocidadeRunner": 2.5,
  "alturaChaoRunner": 0
}
```
