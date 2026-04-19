/**
 * firefox-scaling-fix.js
 *
 * Detecta quando o navegador é Firefox e a escala desejada (config.escalaPalco)
 * não foi aplicada pelo mecanismo padrão (ex.: código usa Math.floor e aplicou 1
 * em vez de 1.5). Esse script aplica um ajuste CSS apenas nesses casos, sem
 * alterar a lógica original do jogo. Carrega como utilitário e espera a
 * inicialização do jogo (polling curto) antes de atuar.
 *
 * Requisitos do design:
 * - Não altera a lógica existente; apenas aplica CSS quando detecta um
 *   mismatch entre a escala desejada e a escala efetiva em Firefox.
 * - Roda de forma resiliente (tenta por um tempo limitado) e não lança erros
 *   visíveis ao console exceto para debug/erro.
 */
(function () {
    'use strict';

    function isFirefox() {
        try {
            return /firefox/i.test(navigator.userAgent);
        } catch (e) {
            return false;
        }
    }

    function tryApplyFix() {
        try {
            var cfg = window.config || {};
            var desired = Number(cfg.escalaPalco);
            var container = document.getElementById('jogo-container');

            if (!container || !desired || isNaN(desired)) return;

            // Quando o inicializador calcula a escala automática ele guarda
            // em window.autoScaleMultiplier. Se não existir, tratamos como 0.
            var auto = (typeof window.autoScaleMultiplier === 'number') ? window.autoScaleMultiplier : 0;

            // Se estamos no Firefox e existe discrepância relevante entre a
            // escala desejada e a escala aplicada, aplicamos uma correção CSS.
            var EPS = 0.05; // tolerância para comparações de float
            if (isFirefox() && Math.abs(auto - desired) > EPS) {
                // Aplica exatamente a escala desejada no container.
                // Mantemos transformOrigin igual ao usado pelo código principal.
                container.style.transform = 'scale(' + desired + ')';
                container.style.transformOrigin = 'center center';

                // Reafirma largura/altura base para manter comportamento esperado
                // (o inicializador define 640x480; reafirmamos para evitar que
                // browsers com diferenças interpretativas causem deslocamento).
                container.style.width = '640px';
                container.style.height = '480px';

                // Marca no DOM para facilitar debug e evitar re-aplicar desnecessariamente.
                container.setAttribute('data-firefox-scale-applied', String(desired));
                console.info('[firefox-scaling-fix] Applied Firefox scale:', desired);
            }
        } catch (err) {
            // Não interrompe a página; apenas registra para diagnostico.
            console.error('[firefox-scaling-fix] error', err);
        }
    }

    // Polling leve: aguarda até que window.config exista e que o container
    // seja criado/medido pelo inicializador. Timeout curto para não ficar
    // executando indefinidamente (máx ~3s).
    var attempts = 0;
    var maxAttempts = 60; // 60 * 50ms = 3000ms
    var interval = setInterval(function () {
        attempts++;
        var ready = !!(window.config && document.getElementById('jogo-container'));
        if (ready) {
            clearInterval(interval);
            // Pequeno atraso para garantir que inicialização que altere
            // estilos (resize debounce) tenha terminado.
            setTimeout(tryApplyFix, 60);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            // Última tentativa mesmo sem configuração completa.
            tryApplyFix();
        }
    }, 50);

})();
