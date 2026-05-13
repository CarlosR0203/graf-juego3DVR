export let keys = {};

export function initControls(renderer) {
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
}

export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    keys['w'] = false;
    keys['s'] = false;
    keys['a'] = false;
    keys['d'] = false;
    keys['k'] = false;
    keys['l'] = false;
    keys['b'] = false;
    keys['shift'] = false;

    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            
            const gamepad = source.gamepad;

            if (source.handedness === 'left') {
                const xAxis = gamepad.axes[2];
                const yAxis = gamepad.axes[3];

                if (yAxis < -0.2) keys['w'] = true;
                if (yAxis > 0.2) keys['s'] = true;
                if (xAxis < -0.2) keys['a'] = true;
                if (xAxis > 0.2) keys['d'] = true;

                if (gamepad.buttons[0].pressed) keys['shift'] = true;
            }

            if (source.handedness === 'right') {
                if (gamepad.buttons[0].pressed) keys['k'] = true; 
                if (gamepad.buttons[1].pressed) keys['l'] = true; 
                if (gamepad.buttons[4].pressed || gamepad.buttons[5].pressed) keys['b'] = true; 
            }
        }
    }
}