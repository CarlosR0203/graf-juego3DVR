// controls.js
export let keys = {};
export let stateToggle = false;
let ePressedLastFrame = false;

// Objeto unificado que consume player.js para WebXR de manera nativa
export let vrInput = {
    moveX: 0,
    moveY: 0,
    run: false,
    attack: false,
    kick: false,
    block: false
};

export function initControls(renderer) {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'e') {
            stateToggle = !stateToggle;
        }
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    // Limpieza interna del mapa de teclado clásico en cada cuadro
    keys['w'] = false;
    keys['s'] = false;
    keys['a'] = false;
    keys['d'] = false;
    keys['k'] = false;
    keys['l'] = false;
    keys['b'] = false;
    keys['shift'] = false;

    // Reinicio de los valores de entrada de realidad virtual
    vrInput.moveX = 0;
    vrInput.moveY = 0;
    vrInput.run = false;
    vrInput.attack = false;
    vrInput.kick = false;
    vrInput.block = false;

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const gp = source.gamepad;

        // MANO IZQUIERDA → Control de movimiento analógico y esprintar
        if (source.handedness === 'left') {
            const xAxis = gp.axes[2] ?? 0;
            const yAxis = gp.axes[3] ?? 0;
            const deadzone = 0.25;

            // Sincronización con el mapa de teclas convencional
            if (yAxis < -deadzone) keys['w'] = true;
            if (yAxis > deadzone) keys['s'] = true;
            if (xAxis < -deadzone) keys['a'] = true;
            if (xAxis > deadzone) keys['d'] = true;

            // Mapeo analógico real para evitar transiciones bruscas en VR
            vrInput.moveX = Math.abs(xAxis) > deadzone ? xAxis : 0;
            vrInput.moveY = Math.abs(yAxis) > deadzone ? yAxis : 0;

            // Trigger izquierdo asignado a correr (sprint)
            if (gp.buttons[0]?.pressed) {
                keys['shift'] = true;
                vrInput.run = true;
            }

            // Botón X (button[3]) → Ataque de puño (K)
            if (gp.buttons[3]?.pressed) {
                keys['k'] = true;
                vrInput.attack = true;
            }

            // Botón Y (button[4]) → Patada (L)
            if (gp.buttons[4]?.pressed) {
                keys['l'] = true;
                vrInput.kick = true;
            }
        }

        // MANO DERECHA → Acciones defensivas y estados de juego
        if (source.handedness === 'right') {
            // Botón A (button[3]) → Toggle de estado especial (E)
            const aPressed = gp.buttons[3]?.pressed ?? false;
            if (aPressed && !ePressedLastFrame) {
                stateToggle = !stateToggle;
                keys['e'] = true;
            } else {
                keys['e'] = false;
            }
            ePressedLastFrame = aPressed;

            // Botón B (button[4]) → Acción de bloquear por defecto
            if (gp.buttons[4]?.pressed) {
                keys['b'] = true;
                vrInput.block = true;
            }

            // Grip derecho (button[1]) como alternativa ergonómica de defensa
            if (gp.buttons[1]?.pressed) {
                keys['b'] = true;
                vrInput.block = true;
            }
        }
    }
}

export function getControlsDebugInfo(renderer) {
    if (!renderer.xr.isPresenting) return null;
    const session = renderer.xr.getSession();
    if (!session) return null;
    const info = {};
    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        info[source.handedness] = {
            axes: Array.from(source.gamepad.axes).map(v => v.toFixed(2)),
            buttons: source.gamepad.buttons.map((b, i) => b.pressed ? i : null).filter(i => i !== null)
        };
    }
    return info;
}