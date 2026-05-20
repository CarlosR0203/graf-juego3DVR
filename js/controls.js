export let keys = {};
export let stateToggle = false;

export let vrInput = {
    moveX: 0, moveY: 0, run: false, attack: false, kick: false, block: false
};

export function initControls(renderer) {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
}

export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    // Resetear entradas cada frame
    vrInput.moveX = 0; vrInput.moveY = 0;
    vrInput.run = false; vrInput.attack = false; vrInput.kick = false; vrInput.block = false;

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const gp = source.gamepad;

        // MANO IZQUIERDA
        if (source.handedness === 'left') {
            const xAxis = gp.axes[2] ?? 0;
            const yAxis = gp.axes[3] ?? 0;
            const deadzone = 0.25;

            vrInput.moveX = Math.abs(xAxis) > deadzone ? xAxis : 0;
            vrInput.moveY = Math.abs(yAxis) > deadzone ? yAxis : 0;

            // Botón X (Quest 3: Left button[3]) -> PATADA
            if (gp.buttons[3]?.pressed) vrInput.kick = true;
        }

        // MANO DERECHA
        if (source.handedness === 'right') {
            // Botón A (Quest 3: Right button[3]) -> BLOQUEO
            if (gp.buttons[3]?.pressed) vrInput.block = true;

            // Gatillo Derecho (Quest 3: Right button[0]) -> GOLPE (Puño)
            if (gp.buttons[0]?.pressed) vrInput.attack = true;
        }
    }
}