# Guia de Controles do Teclado

Este documento lista todas as teclas mapeadas no jogo e suas respectivas funções.

## 1. Movimentação do Jogador

| Tecla | Ação |
| :--- | :--- |
| **A** ou **Seta Esquerda** | Move o personagem para a esquerda. |
| **D** ou **Seta Direita** | Move o personagem para a direita. |
| **Espaço (Space)** | Pula (requer estar no chão). |

## 2. Combate e Ações

| Tecla | Ação |
| :--- | :--- |
| **K** | Executa um chute. Ativa a hitbox de ataque e fornece um pequeno impulso (dash) para frente. |
| **Seta Baixo + Espaço** ou **S + Espaço** | **Soltar Item:** Descarta o item mais recente do inventário (requer habilidade `skilla`). O item mantém seu estado original (munição/durabilidade). |
| **I** | Dispara o revólver (requer ter coletado a arma e possuir munição). |

## 3. Comandos de Sistema

| Tecla | Ação |
| :--- | :--- |
| **Pause / Break** | Alterna o estado de Pausa do jogo. Escurece a tela e interrompe toda a física e IA. |
| **6** | Abre a **Árvore de Habilidades**. Pausa o jogo automaticamente. |
| **Enter** | Fecha o menu de habilidades e retoma o jogo. |
| **G** | Alterna a exibição da Grade Auxiliar (Grid) e as coordenadas de cada bloco (ex: a1, b2). |

## 4. Comandos de Debug (Desenvolvedor)

| Tecla | Ação |
| :--- | :--- |
| **5** | **Cheat XP:** Adiciona +5 de XP instantaneamente (concede 1 ponto de skill). |
| **7** | **Spawn Inimigo:** Cria um inimigo aleatório em uma plataforma disponível no mapa com equipamento sorteado. |
| **0 (Zero)** | **Reset Total:** Limpa o inventário salvo no LocalStorage e remove todos os equipamentos atuais do jogador (arma, bota, escudo). |
| **8** | **Pulo Forçado da IA:** Enquanto pressionada, simula o comando de pulo para os inimigos (útil para testar física de pulo dos inimigos). |
| **9** | **Extermínio:** Remove todos os inimigos da tela instantaneamente. Cada inimigo dropa seu inventário seguindo a lógica LIFO (último item pego cai primeiro) em posições adjacentes livres. |

---

## Dicas Técnicas

*   **Sincronização de Itens:** Ao usar o chute (**K**) enquanto estiver com a bota equipada, a força do impulso é multiplicada, permitindo atravessar vãos maiores.
*   **Uso do Escudo:** O escudo é passivo. Enquanto estiver equipado e não estiver "vermelho" (quebrado), ele reduzirá automaticamente o knockback recebido e absorverá até 3 tiros antes de falhar.
*   **Munição:** Se a arma ficar vermelha, você está sem munição. É necessário encontrar um novo item de revólver no mapa ou derrotar um inimigo armado para coletar o drop.

---
*Última atualização: Abril de 2024*