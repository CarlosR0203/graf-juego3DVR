import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { initScene, scene, camera, renderer, updateCamera, updateVRPanel } from './scene.js';
import { initPlayer, updatePlayer, player } from './player.js';
import { initEnemy, updateEnemy, enemy } from './enemy.js';
import { initControls, updateVRControls } from './controls.js';
import { updateUI } from './ui.js';

const clock = new THREE.Clock();

initScene();
initControls(renderer);
initPlayer();
initEnemy();

// ── WebXR ────────────────────────────────────────────────────
renderer.xr.enabled = true;

const vrButton = VRButton.createButton(renderer);
vrButton.style.cssText += '; bottom: 60px; z-index: 1000;'; // no tapar footer
document.body.appendChild(vrButton);

// Cuando entra en VR, ocultar la UI HTML (se usa el panel 3D)
renderer.xr.addEventListener('sessionstart', () => {
    document.getElementById('ui').classList.add('hidden');
    console.log('[VR] Sesión VR iniciada - Meta Quest 3');
});

renderer.xr.addEventListener('sessionend', () => {
    if (gameState === 'playing') {
        document.getElementById('ui').classList.remove('hidden');
    }
    console.log('[VR] Sesión VR finalizada');
});

// ── Estado de juego ─────────────────────────────────────────
let gameState = 'loading';

const loadingScreen  = document.getElementById('loadingScreen');
const loadingProgress = document.getElementById('loadingProgress');
const startScreen    = document.getElementById('startScreen');
const playBtn        = document.getElementById('playBtn');
const volumeSlider   = document.getElementById('volumeSlider');
const bgMusic        = document.getElementById('bgMusic');
const uiLayer        = document.getElementById('ui');

// Marcador persistente
let playerWins = parseInt(localStorage.getItem('arena_playerWins') || '0');
let enemyWins  = parseInt(localStorage.getItem('arena_enemyWins')  || '0');

function updateScoreDisplay() {
    const text = `Victorias: ${playerWins} - Derrotas: ${enemyWins}`;
    document.getElementById('winScoreDisplay').innerText  = text;
    document.getElementById('loseScoreDisplay').innerText = text;
}
updateScoreDisplay();

// Simular carga

export const loadingManager = new THREE.LoadingManager();

// El gestor actualiza la barra automáticamente según los archivos descargados
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    const actualProgress = (itemsLoaded / itemsTotal) * 100;
    loadingProgress.style.width = `${actualProgress}%`;
};

// Solo cuando TODO se haya descargado se oculta la pantalla de carga
loadingManager.onLoad = function () {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        gameState = 'menu';
    }, 500);
};

// Captura errores útiles para debuggear en GitHub Pages
loadingManager.onError = function (url) {
    console.error('Error de red al intentar cargar:', url);
};

// ── Loop principal ───────────────────────────────────────────
function animate() {
    const delta = clock.getDelta();

    // Leer mandos Meta Quest 3
    updateVRControls(renderer);

    if (player?.mesh) updatePlayer(delta, gameState === 'playing');
    if (enemy?.mesh)  updateEnemy(delta, player, gameState === 'playing');

    if (gameState === 'playing') {

        // UI: HTML en desktop, panel 3D en VR
        if (renderer.xr.isPresenting) {
            updateVRPanel(player.health, player.energy, enemy.health);
        } else {
            updateUI();
        }

        // Victoria / Derrota
        if (enemy.health <= 0) {
            gameState = 'gameover';
            playerWins++;
            localStorage.setItem('arena_playerWins', playerWins);
            updateScoreDisplay();
            document.getElementById('ui').classList.add('hidden');
            document.getElementById('winScreen').classList.remove('hidden');

        } else if (player.health <= 0) {
            gameState = 'gameover';
            enemyWins++;
            localStorage.setItem('arena_enemyWins', enemyWins);
            updateScoreDisplay();
            document.getElementById('ui').classList.add('hidden');
            document.getElementById('loseScreen').classList.remove('hidden');
        }
    }

    updateCamera(player, enemy);
    renderer.render(scene, camera);
}

// setAnimationLoop es obligatorio para WebXR
renderer.setAnimationLoop(animate);
