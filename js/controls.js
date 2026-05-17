import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export let keys = {};
export let moveAxes = new THREE.Vector2(0, 0);

export function initControls() {
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
}

export function updateVRControls(renderer) {
    if (!renderer.xr.isPresenting) return;

    keys['k'] = false;
    keys['l'] = false;
    keys['b'] = false;
    keys['shift'] = false;
    moveAxes.set(0, 0);

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        
        const gamepad = source.gamepad;
        const deadzone = 0.15;

        if (source.handedness === 'left') {
            const xAxis = gamepad.axes[2];
            const yAxis = gamepad.axes[3];

            if (Math.abs(xAxis) > deadzone || Math.abs(yAxis) > deadzone) {
                moveAxes.set(xAxis, yAxis);
            }

            if (gamepad.buttons[0].pressed) keys['shift'] = true;
        }

        if (source.handedness === 'right') {
            if (gamepad.buttons[0].pressed) keys['k'] = true; 
            if (gamepad.buttons[1].pressed) keys['l'] = true; 
            if (gamepad.buttons[4].pressed || gamepad.buttons[5].pressed) keys['b'] = true; 
        }
    }
}