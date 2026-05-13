export let keys = {};

export function initControls() {
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
}

export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    // Reseteo preventivo de inputs
    const actions = ['w', 's', 'a', 'd', 'k', 'l', 'b', 'shift'];
    actions.forEach(k => keys[k] = false);

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        
        const gamepad = source.gamepad;
        const deadzone = 0.15; // Evita movimiento por drift del joystick

        if (source.handedness === 'left') {
            const xAxis = gamepad.axes[2];
            const yAxis = gamepad.axes[3];

            // Movimiento suave con umbral de activación
            if (yAxis < -deadzone) keys['w'] = true;
            if (yAxis > deadzone) keys['s'] = true;
            if (xAxis < -deadzone) keys['a'] = true;
            if (xAxis > deadzone) keys['d'] = true;

            // Trigger izquierdo para correr
            if (gamepad.buttons[0].pressed) keys['shift'] = true;
        }

        if (source.handedness === 'right') {
            // Gatillo (Ataque 1)
            if (gamepad.buttons[0].pressed) keys['k'] = true; 
            // Grip (Ataque 2)
            if (gamepad.buttons[1].pressed) keys['l'] = true; 
            // Botón A o B para bloquear
            if (gamepad.buttons[4].pressed || gamepad.buttons[5].pressed) keys['b'] = true; 
        }
    }
}