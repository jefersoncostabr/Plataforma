# Sistema de Pets — Cão e Gato

> **Em 30 segundos:** Pets são NPCs aliados. Cão (predador) e Gato (coletador). Resgate da gaiola, controle com Q, habilidades com K/V/X. Pets têm ciclo de vida próprio e seguem o jogador.

## Visão Geral

O jogo tem dois tipos de pets:
- **Cão** — Ataca inimigos com a skill "Cãobatente"
- **Gato** — Arrasta itens e inimigos

## Arquivos Principais

| Arquivo | Responsabilidade |
|---|---|
| `src/core/cao.js` | Entidade cão/gato, ciclo de vida, IA |
| `src/core/pet-habilidades.js` | Habilidades passivas dos pets |
| `src/core/gaiola.js` | Entidade gaiola (resgate) |
| `src/visual/animacoes-pets.js` | Renderização dos pets |

## Estado Global

```javascript
window.caoEntidade    // Instância do cão ativo
window.gatoEntidade   // Instância do gato ativo
window.controlandoCao // Flag de controle
window.controlandoGato // Flag de controle
window.caoNaBase      // Cão enviado para base
window.gatoNaBase     // Gato enviado para base
window.isCaoResgatado // Cão resgatado (persistente)
window.isGatoResgatado // Gato resgatado (persistente)
window.idPetsAtivos   // Controle de IDs para múltiplas instâncias
```

## Ciclo de Vida do Pet

1. **Spawn** — `inicializarPetNPC(tipo, x, y, config)` cria a instância
2. **Loop** — `cicloVidaPet(pet, idControle)` roda em requestAnimationFrame
3. **Controle** — Jogador pressiona Q próximo ao pet para assumir controle
4. **Habilidades** — K/V/X ativa habilidades ativas
5. **Retorno** — Duplo Q retorna ao jogador
6. **Base** — Pets podem ser enviados para a base (caem do jogo)

## Habilidades dos Pets

### Cão
- **Cãobatente** (skill): Ataca inimigos próximos automaticamente
- **Mordida** (K/V/X): Segura inimigo preso
- **Trampolim**: Jogador pula na cabeça do cão

### Gato
- **Arrastar** (K/V/X): Segura itens ou inimigos
- **Trampolim**: Jogador pula na cabeça do gato

## Mecânica de Resgate

1. Gaiola aparece na fase
2. Jogador colide com gaiola → `libertarPet(tipo, gaiolaObj)`
3. Pet é adicionado ao jogo e salvo no localStorage
4. Pet aparece próximo ao jogador

## Configuração

Configurações dos pets em `window.config`:
```javascript
config.velocidadeCao          // Velocidade do cão
config.velocidadeGato         // Velocidade do gato
config.forcaPuloCao           // Força do pulo do cão
config.gravidadeCao           // Gravidade do cão
config.petDanoAtaque          // Dano dos ataques do pet
config.petCooldownAtaque      // Cooldown entre ataques
config.petRaioDetecaoInimigoX // Raio de detecção X
config.petRaioDetecaoInimigoY // Raio de detecão Y
```

## Compatibilidade

- `window.inicializarCaoNPC(x, y, cfg)` — Alias para `inicializarPetNPC('cao', ...)`
- `window.iniciarCao(pos, cfg)` — Alias alternativo
- `window.iniciarGato(pos, cfg)` — Alias para gato
- `window.resetarResgateCao()` — Alias para resetar ambos