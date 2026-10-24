# Sistema de Salvamento — Como save/load funciona

> **Em 30 segundos:** 3 slots (slot1/slot2/slot3), salva automatico em localStorage, cada slot tem inventario, equipamentos, skills, fase e dificuldade. Use `SaveSlots` global para interagir.

## Visão Geral

O jogo usa 3 slots de salvamento independentes. Cada slot armazena:
- Inventário e equipamentos checkpoint
- Skills desbloqueadas
- Fase atual
- Dificuldade (easy/normal/hard)
- Estado dos pets resgatados (global)

## Estrutura Técnica

### Arquivo principal
- `src/core/save-slots.js` — Lógica central de slots

### Chaves de storage por slot
```
plataformaInventario_slot1
plataformaCheckpointEquipamento_slot1
plataformaCraftPersistente_slot1
plataformaSkills_slot1
plataformaFaseAtual_slot1
plataformaDificuldade_slot1
```

### Chaves globais (não por slot)
```
plataformaSlotAtual    — slot ativo
plataformaSlotsMigracaoV1 — flag de migração
plataformaCaoResgatado
plataformaGatoResgatado
plataformaCaoNaBase
plataformaGatoNaBase
```

## API Global: `window.SaveSlots`

| Função | Descrição |
|---|---|
| `getActiveSlotId()` | Retorna slot ativo (slot1/slot2/slot3) |
| `setActiveSlotId(id)` | Define slot ativo |
| `getSlotDifficulty(id)` | Retorna dificuldade do slot |
| `setSlotDifficulty(id, diff)` | Define dificuldade (easy/normal/hard) |
| `isDifficultyLocked(id)` | Verifica se dificuldade está travada |
| `isSlotOccupied(id)` | Verifica se slot tem dados salvos |
| `clearSlot(id)` | Apaga todos os dados de um slot |
| `clearAllSaves()` | Apaga todos os slots e progresso global |
| `getStorageKey(baseKey, slotId)` | Monta a key de storage para um slot |
| `init()` | Inicializa o sistema (migra dados legados) |

## Fluxo de Salvamento

1. O jogo salva automaticamente em cada checkpoint
2. Dados são escritos no slot ativo via `SaveSlots.getStorageKey()`
3. Pets resgatados são salvos globalmente (independente do slot)
4. Dificuldade é definida ao iniciar nova campanha e travada após

## Migração de Dados

O sistema migra automaticamente dados legados (sem slot) para slot1 na primeira execução. Isso preserva saves de versões anteriores.

## Reset de Salvamento

- **Tecla 0** (Debug): Reseta todo o progresso e inventário
- **Tecla 2** (Debug): Reseta equipamentos e estado da armadura
- `clearAllSaves()`: Apaga todos os slots e progresso global

## Arquivos Relacionados

- `src/core/save-slots.js` — Sistema de slots
- `src/jogador/inventario.js` — Gerencia inventário (usa SaveSlots)
- `src/jogador/crafting.js` — Estado de crafting (usa SaveSlots)
- `src/skills/skills.js` — Estado de skills (usa SaveSlots)
- `src/core/inicial.js` — Carrega estado ao iniciar fase