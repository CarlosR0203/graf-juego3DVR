export let keys = {};

// Estado del botón E (estado/especial) - toggle
let ePressedLastFrame = false;
export let stateToggle = false;

export function initControls(renderer) {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;

        // Toggle para tecla E (estado)
        if (e.key.toLowerCase() === 'e') {
            stateToggle = !stateToggle;
        }
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
}

/**
 * Mapa de botones Meta Quest 3 (WebXR Gamepad API):
 *
 * MANO IZQUIERDA:
 *   buttons[0] = Trigger (índice)
 *   buttons[1] = Grip (agarre)
 *   buttons[2] = Joystick (clic)
 *   buttons[3] = X
 *   buttons[4] = Y
 *   axes[2]    = Joystick X (izquierda/derecha)
 *   axes[3]    = Joystick Y (adelante/atrás)
 *
 * MANO DERECHA:
 *   buttons[0] = Trigger (índice)
 *   buttons[1] = Grip (agarre)
 *   buttons[2] = Joystick (clic)
 *   buttons[3] = A
 *   buttons[4] = B
 *   axes[2]    = Joystick X
 *   axes[3]    = Joystick Y
 */
export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    // Limpiar teclas VR cada frame
    keys['w']     = false;
    keys['s']     = false;
    keys['a']     = false;
    keys['d']     = false;
    keys['k']     = false;  // atacar (puño)
    keys['l']     = false;  // patada
    keys['b']     = false;  // bloquear
    keys['shift'] = false;  // correr

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;

        const gp = source.gamepad;

        // ── MANO IZQUIERDA → Movimiento ──────────────────────────
        if (source.handedness === 'left') {
            const xAxis = gp.axes[2] ?? 0;
            const yAxis = gp.axes[3] ?? 0;
            const deadzone = 0.25;

            if (yAxis < -deadzone) keys['w'] = true;  // Joystick adelante
            if (yAxis >  deadzone) keys['s'] = true;  // Joystick atrás
            if (xAxis < -deadzone) keys['a'] = true;  // Joystick izquierda
            if (xAxis >  deadzone) keys['d'] = true;  // Joystick derecha

            // Trigger izquierdo = correr (sprint)
            if (gp.buttons[0]?.pressed) keys['shift'] = true;

            // Botón X (button[3]) → Atacar (puño) — mapeado como K
            if (gp.buttons[3]?.pressed) keys['k'] = true;

            // Botón Y (button[4]) → Patada — mapeado como L
            if (gp.buttons[4]?.pressed) keys['l'] = true;
        }

        // ── MANO DERECHA → Acciones ───────────────────────────────
        if (source.handedness === 'right') {
            // Botón A (button[3]) → Estado/Especial — mapeado como E (toggle)
            const aPressed = gp.buttons[3]?.pressed ?? false;
            if (aPressed && !ePressedLastFrame) {
                stateToggle = !stateToggle;
                keys['e'] = true;
            } else {
                keys['e'] = false;
            }
            ePressedLastFrame = aPressed;

            // Botón B (button[4]) → Bloquear — mapeado como B
            if (gp.buttons[4]?.pressed) keys['b'] = true;

            // Grip derecho (button[1]) como alternativa de bloqueo
            if (gp.buttons[1]?.pressed) keys['b'] = true;
        }
    }
}

/**
 * Devuelve un resumen del estado de los controles para debug en VR.
 */
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
