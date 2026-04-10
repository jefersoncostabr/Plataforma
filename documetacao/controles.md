# Guia de Controles do Teclado

Este documento detalha todas as teclas mapeadas no jogo e suas respectivas funções, incluindo comandos de movimentação, combate, sistema e debug.

## Sumário

1.  Movimentação do Jogador
2.  Combate e Ações
3.  Comandos de Sistema
4.  Comandos de Debug (Desenvolvedor)
5.  Dicas Técnicas

---



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
| **J** | Ativa a **Garra:** Estica um braço mecânico para capturar itens ou inimigos à distância (requer ter coletado a garra). |
| **Seta Baixo + Espaço** ou **S + Espaço** | **Soltar Item:** Descarta o item mais recente do inventário (requer habilidade `skilla`). O item mantém seu estado original (munição/durabilidade). |
| **I** | Dispara o revólver (requer ter coletado a arma e possuir munição). |
| **Segurar Espaço (aprox. 2s)** | **Ativar Jetpack:** Liga o motor de voo por 6 segundos (requer ter coletado o Jetpack). |
| **W + Espaço** ou **Seta Cima + Espaço** | **Jetpack Instantâneo:** Ativa o voo imediatamente, sem o tempo de espera. |
| **W** ou **Seta Cima** (no ar, com Jetpack ativo) | **Propulsão:** Mantém ou ganha altura enquanto o Jetpack estiver ativo. |
| **S + I** ou **Seta Baixo + I** | **Vender Item:** Converte o último item do inventário em 1 XP (requer habilidade `skilla1`). O processo leva 2 segundos. |
| **Seta Cima + I** ou **W + I** | **AirDrop:** Solicita suprimentos via sinalizador (requer habilidade `skilla2`, limitado a 1x por fase). |

---
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
| **4** | **Pular de Fase:** Avança instantaneamente para o próximo nível da lista. |
| **5** | **Cheat XP:** Adiciona +5 de XP instantaneamente (concede 1 ponto de skill). |
| **7** | **Spawn Inimigo:** Cria um inimigo aleatório em uma plataforma disponível no mapa com equipamento sorteado. |
| **0 (Zero)** | **Reset Total:** Limpa o inventário salvo no LocalStorage e remove todos os equipamentos atuais do jogador (arma, bota, escudo). |
| **8** | **Pulo Forçado da IA:** Enquanto pressionada, simula o comando de pulo para os inimigos (útil para testar física de pulo dos inimigos). |
| **9** | **Extermínio:** Remove todos os inimigos da tela instantaneamente. Cada inimigo dropa seu inventário seguindo a lógica LIFO (último item pego cai primeiro) em posições adjacentes livres. |

---

## Dicas Técnicas

*   **Chute com Botas:** Ao usar o chute (**K**) com as botas equipadas, a força do impulso é multiplicada, permitindo atravessar vãos maiores ou empurrar inimigos com mais eficácia.
*   **Escudo:** O escudo é um item passivo. Enquanto equipado e não "quebrado" (indicado pela cor vermelha), ele reduz automaticamente o knockback recebido e absorve até 3 tiros antes de falhar.
*   **Munição:** Uma arma vermelha indica falta de munição. Inimigos também podem ficar sem munição e, nesse estado, buscarão ativamente revólveres no chão para recarregar.

---
*Última atualização: Abril de 2024*