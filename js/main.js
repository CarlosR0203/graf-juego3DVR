import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { initScene, scene, camera, renderer, updateCamera } from './scene.js';
import { initPlayer, updatePlayer, player } from './player.js';
import { initEnemy, updateEnemy, enemy } from './enemy.js';
import { initControls, updateVRControls } from './controls.js';
import { updateUI } from './ui.js';

const clock = new THREE.Clock();

initScene();
initControls(renderer);
initPlayer();
initEnemy();

document.body.appendChild(VRButton.createButton(renderer));

function animate() {
    const delta = clock.getDelta();

    updateVRControls(renderer);

    if (player?.mesh) updatePlayer(delta);
    if (enemy?.mesh) updateEnemy(delta, player);
    
    updateCamera(player, enemy);
    updateUI();
    
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);