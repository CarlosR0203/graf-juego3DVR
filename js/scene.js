import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { PhysicsWorld } from './PhysicsWorld.js';

// Variables globales del entorno gráfico
export let scene, camera, renderer, physics;

// Elementos del HUD de Realidad Virtual
export let vrHUD;
let playerHealthBar, playerEnergyBar, enemyHealthBar;

// Almacenamiento de objetos con colisión para el PhysicsWorld
const colliders = [];

export function initScene() {
    // 1. Creación de la escena y fondo
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e); // Color oscuro para ambientación de arena
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.015);

    // 2. Configuración de la cámara básica (WebXR controlará el rig en VR)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    // 3. Inicialización del renderizador con soporte de sombras y WebXR
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // 4. Iluminación dinámica de la arena de combate
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Luz de apoyo para acentuar el relieve de los luchadores
    const rimLight = new THREE.DirectionalLight(0x00aaff, 0.4);
    rimLight.position.set(-10, 10, -10);
    scene.add(rimLight);

    // 5. Creación de una superficie de suelo base provisional (en caso de que falte el escenario)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x2e2e3e, 
        roughness: 0.8, 
        metalness: 0.2 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    colliders.push(floor); // El suelo actúa como colisionador principal

    // 6. Inicialización del motor de físicas analítico
    physics = new PhysicsWorld(scene, () => colliders);

    // Manejo adaptativo del tamaño de la pantalla
    window.addEventListener('resize', onWindowResize);
}

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL HUD 3D DIEGÉTICO PARA WEBXR
// ─────────────────────────────────────────────────────────────
export function initVRHUD(cameraRef) {
    vrHUD = new THREE.Group();
    
    // Posicionamiento ergonómico: centrado, ligeramente abajo y a 1.2 metros del visor
    vrHUD.position.set(0, -0.25, -1.2);
    cameraRef.add(vrHUD);

    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.75 });
    const pHealthMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 }); // Verde neón
    const pEnergyMat = new THREE.MeshBasicMaterial({ color: 0x00aaff }); // Azul eléctrico
    const eHealthMat = new THREE.MeshBasicMaterial({ color: 0xff3333 }); // Rojo carmesí

    // Función interna encargada de construir barras con pivote izquierdo corregido
    function createBar(yPos, colorMat, width = 0.8, height = 0.05) {
        const bgGeo = new THREE.PlaneGeometry(width, height);
        const bgMesh = new THREE.Mesh(bgGeo, bgMaterial);
        bgMesh.position.set(0, yPos, 0);

        const fgGeo = new THREE.PlaneGeometry(width, height);
        fgGeo.translate(width / 2, 0, 0); // Desplazar geometría para fijar el pivote de escalado
        
        const fgMesh = new THREE.Mesh(fgGeo, colorMat);
        fgMesh.position.set(-width / 2, 0, 0.002); // Desplazamiento en Z mínimo para prevenir z-fighting

        bgMesh.add(fgMesh);
        vrHUD.add(bgMesh);
        
        return fgMesh;
    }

    // HUD del Jefe/Enemigo (Superior y prominente)
    enemyHealthBar = createBar(0.20, eHealthMat, 1.1, 0.05); 
    
    // HUD del Jugador (Inferior y compacto)
    playerHealthBar = createBar(-0.08, pHealthMat, 0.7, 0.035);
    playerEnergyBar = createBar(-0.13, pEnergyMat, 0.7, 0.015);
}

export function updateVRPanel(pHealth, pEnergy, eHealth) {
    if (!vrHUD) return;

    // Acotación estricta de parámetros entre 0 y 100%
    const pHP = Math.max(0, Math.min(100, pHealth));
    const pEP = Math.max(0, Math.min(100, pEnergy));
    const eHP = Math.max(0, Math.min(100, eHealth));

    // Modificación de la escala escalar horizontal desde el pivote izquierdo
    if (playerHealthBar) playerHealthBar.scale.x = pHP / 100;
    if (playerEnergyBar) playerEnergyBar.scale.x = pEP / 100;
    if (enemyHealthBar) enemyHealthBar.scale.x = eHP / 100;
}

// ─────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES Y SISTEMA DE AUDIO
// ─────────────────────────────────────────────────────────────
export function updateCamera(player, enemy) {
    // En modo VR nativo, las transformaciones de la cámara se vinculan automáticamente al visor
    // Si no se está presentando en VR, se puede añadir una lógica de seguimiento alternativa aquí
    if (renderer && renderer.xr.isPresenting) return;
}

export function playHitSound() {
    // Sistema nativo de reproducción de ráfagas de sonido sin interrupción de hilos
    const hitAudio = new Audio('./assets/audio/hit.mp3'); 
    hitAudio.volume = 0.6;
    hitAudio.play().catch(err => {
        // Fallback silencioso en consola en caso de restricciones de autoplay del navegador
        console.log('[AUDIO] Interacción previa requerida para reproducir efectos.');
    });
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}