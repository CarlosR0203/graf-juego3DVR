import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { initScene, scene, camera, renderer, updateCamera } from './scene.js';
import { initPlayer, updatePlayer, player } from './player.js';
import { initEnemy, updateEnemy, enemy } from './enemy.js';
import { initControls, updateVRControls } from './controls.js'; // Importamos updateVRControls
import { updateUI } from './ui.js';

const clock = new THREE.Clock();

initScene();
initControls(renderer); // Pasamos el renderer para inicializar los mandos VR
initPlayer();
initEnemy();

// Habilitar WebXR
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

function animate() {
    const delta = clock.getDelta();

    // Actualizar mandos de Meta Quest 3
    updateVRControls(renderer); 

    // Seguridad por carga async
    if (player?.mesh) updatePlayer(delta);
    if (enemy?.mesh) updateEnemy(delta, player);
    
    updateCamera(player, enemy);
    updateUI();
    
    renderer.render(scene, camera);
}

// Reemplazamos requestAnimationFrame por setAnimationLoop
renderer.setAnimationLoop(animate);