import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js';
import { scene, getPhysics } from './scene.js';
import { CHAR_SCALE } from './player.js';

export let enemy = {
    mesh: null,
    health: 100,
    isBlocking: false,
    mixer: null
};

export function initEnemy() {
    const loader = new FBXLoader();
    
    // Usando el archivo de tu captura de pantalla
    loader.load('./assets/models/Enemy_Standing Idle To Fight Idle.fbx', (object) => {
        enemy.mesh = object;
        
        // Aplicamos la misma escala gigante del jugador
        enemy.mesh.scale.setScalar(CHAR_SCALE);
        
        // Lo spawneamos del otro lado de la arena
        enemy.mesh.position.set(3, 2, 0); 
        
        enemy.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(enemy.mesh);

        enemy.mixer = new THREE.AnimationMixer(enemy.mesh);
        const idleAction = enemy.mixer.clipAction(object.animations[0]);
        idleAction.play();
    });
}

export function updateEnemy(delta, player) {
    if (!enemy.mesh) return;
    
    if (enemy.mixer) enemy.mixer.update(delta);

    // Físicas de gravedad para el enemigo
    const physics = getPhysics();
    if (physics?.raycaster) {
        const origin = enemy.mesh.position.clone();
        origin.y += 5;
        physics.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        const hits = physics.raycaster.intersectObjects(physics.getColliders(), true);
        
        if (hits.length > 0) {
            enemy.mesh.position.y = hits[0].point.y;
        }
    }

    // Que el enemigo siempre rote para mirar al jugador
    if (player?.mesh) {
        enemy.mesh.lookAt(player.mesh.position.x, enemy.mesh.position.y, player.mesh.position.z);
    }
}