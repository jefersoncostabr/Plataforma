// Debug de Gamepad: Mostra no console o índice e estado de cada botão ao ser pressionado/solto
(function () {
    let lastState = [];
    function logGamepadButtons() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (!gp) {
            if (lastState.length) {
                console.clear();
                lastState = [];
            }
            return;
        }
        gp.buttons.forEach((btn, idx) => {
            if (btn.pressed && !lastState[idx]) {
                console.log(`[GAMEPAD] Botão ${idx} PRESSIONADO`);
            }
            if (!btn.pressed && lastState[idx]) {
                console.log(`[GAMEPAD] Botão ${idx} SOLTO`);
            }
            lastState[idx] = btn.pressed;
        });
        // D-pad e analógicos também podem ser monitorados
        gp.axes.forEach((axis, idx) => {
            if (Math.abs(axis) > 0.2) {
                console.log(`[GAMEPAD] Eixo ${idx}: ${axis.toFixed(2)}`);
            }
        });
    }
    if (!window.__gamepadDebugInterval) {
        window.__gamepadDebugInterval = setInterval(logGamepadButtons, 50);
        console.log('[GAMEPAD DEBUG] Ativo. Aperte botões do controle para ver os índices no console.');
    }
})();
