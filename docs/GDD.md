# Game Design Document (GDD) - Detalhamento

Este documento serve como um guia abrangente para o desenvolvimento do jogo, detalhando suas mecânicas, sistemas, inimigos, design de níveis e aspectos técnicos.

## Sumário

1.  [Mecânicas de Jogo](#1-mecânicas-de-jogo)
2.  [Sistema de Equipamentos](#2-sistema-de-equipamentos)
3.  [Inimigos](#3-inimigos)
4.  [Design de Níveis](#4-design-de-níveis)
5.  [Interface do Usuário (UI)](#5-interface-do-usuário-ui)
6.  [Progressão do Jogo](#6-progressão-do-jogo)
7.  [Escolha da Engine e Prototipagem Básica](#7-escolha-da-engine-e-prototipagem-básica)

---

## 1. Mecânicas de Jogo

*   **Salto:** Detalhamento do funcionamento do salto (altura, controle no ar, pulo duplo, super descida).
*   **Ataques:** Alcance e dano de ataques corpo a corpo (chute) e à distância (tiro de revólver).
*   **Munição/Energia:** Gerenciamento de munição para tiros e energia para habilidades especiais.

## 2. Sistema de Equipamentos

*   **Tipos de Equipamentos:** Quais equipamentos existem (ex: revólver, escudo, botas, jetpack).
*   **Coleta:** Como os equipamentos são adquiridos no jogo.
*   **Efeitos:** Como cada equipamento afeta o personagem (bônus de status, novas habilidades).
*   **Persistência Pós-Morte:** Detalhamento da "acumulação parcial" após a morte (percentual de retenção, quais tipos de itens são mantidos ou perdidos).

## 3. Inimigos

*   **Tipos:** Definição dos diferentes tipos de inimigos (melee, atiradores, escudados, rápidos, voadores).
*   **Padrões:** Padrões de movimento e ataque específicos para cada tipo de inimigo.
*   **Atributos:** Pontos de vida, vulnerabilidades e recompensas ao serem derrotados.

## 4. Design de Níveis

*   **Ambientes:** Esboço de ideias para os diferentes ambientes e temas das fases.
*   **Obstáculos:** Tipos de obstáculos e desafios presentes no cenário.
*   **Plataformas:** Layout e complexidade das plataformas.
*   **Posicionamento:** Estratégias para o posicionamento de inimigos e itens.

## 5. Interface do Usuário (UI)

*   **Elementos:** Como a vida, munição, equipamentos ativos e pontuação serão exibidos na tela.
*   **Feedback:** Feedback visual e sonoro para ações do jogador e eventos do jogo.

## 6. Progressão do Jogo

*   **Estrutura:** Como o jogo avança (fases lineares, ramificações, áreas desbloqueáveis).
*   **Desafios:** Existência de chefes, mini-chefes ou zonas com desafios únicos.
*   **Recompensas:** Sistema de recompensas por completar fases ou objetivos.

## 7. Escolha da Engine e Prototipagem Básica

*   **Seleção da Engine:** Com base nos requisitos do jogo (pixel art 2D), engines como Godot, GameMaker Studio 2 ou Unity (com foco em 2D) são consideradas escolhas adequadas.
*   **Protótipo do Personagem:** Implementação inicial do movimento básico do personagem (andar, pular) e ações de ataque (chute, tiro) para testar a jogabilidade e a responsividade dos controles.
*   **Colisão:** Implementação da detecção de colisão fundamental com o chão, paredes e outros elementos do cenário.
*   **Escala de Pixels:** Garantia de que a renderização do mundo e dos personagens respeite a proporção de 32x32 pixels, mantendo a estética de pixel art desejada.