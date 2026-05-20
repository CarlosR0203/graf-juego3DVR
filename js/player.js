import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js';
import { scene, camera, physics, playHitSound } from './scene.js'; // Asegúrate de importar la cámara
import { vrInput } from './controls.js';
import { enemy } from './enemy.js';

// 3 veces más pequeño en proporción
export const CHAR_SCALE = 0.0037; 
export const CHAR_HEIGHT = 1.6; // Altura de los ojos
export const CHAR_RADIUS = 0.2; 

export let player = {
    mesh: null,
    rig: new THREE.Group(), // El nuevo contenedor para la Realidad Virtual
    speed: 5, health: 100, energy: 0, isBlocking: false,
    attackCooldown: 0, currentState: 'idle', mixer: null, actions: {}, currentAction: null
};

export function initPlayer() {
    const loader = new FBXLoader();
    
    // Configurar la primera persona
    scene.add(player.rig);
    player.rig.add(camera); // La cámara es la cabeza del jugador
    player.rig.position.set(0, CHAR_HEIGHT, 5); 

    loader.load('./assets/models/Standing Idle To Fight Idle.fbx', (object) => {
        player.mesh = object;
        player.mesh.scale.setScalar(CHAR_SCALE);
        
        // Hacer invisible el cuerpo del jugador para que no tape tu propia vista
        player.mesh.traverse((child) => {
            if (child.isMesh) {
                child.visible = false; 
            }
        });
        
        scene.add(player.mesh);
        
        player.mixer = new THREE.AnimationMixer(player.mesh);
        const idleAction = player.mixer.clipAction(object.animations[0]);
        player.actions['idle'] = idleAction;
        player.currentAction = idleAction;
        idleAction.play();
        
        loadAnimation(loader, './assets/models/Walking.fbx', 'walk');
        loadAnimation(loader, './assets/models/Punching.fbx', 'punch', true);
        loadAnimation(loader, './assets/models/Side Kick.fbx', 'kick', true);
        loadAnimation(loader, './assets/models/Center Block.fbx', 'block');
    });
}

function loadAnimation(loader, path, name, isAttack = false) {
    loader.load(path, (animObject) => {
        if (!animObject.animations || animObject.animations.length === 0) return;
        const anim = animObject.animations[0];
        anim.tracks.forEach(track => { track.name = track.name.replace(/.*mixamorig/i, 'mixamorig'); });
        const action = player.mixer.clipAction(anim);
        if (isAttack) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
        }
        player.actions[name] = action;
    });
}

function fadeToAction(name, duration = 0.2) {
    const nextAction = player.actions[name];
    if (!nextAction || player.currentAction === nextAction) return;
    nextAction.reset().fadeIn(duration).play();
    if (player.currentAction) player.currentAction.fadeOut(duration);
    player.currentAction = nextAction;
}

export function updatePlayer(playerRef, cameraRef, delta) {
    if (!playerRef || !playerRef.mesh) return;
    if (playerRef.mixer) playerRef.mixer.update(delta);

    const speed = vrInput.run ? playerRef.speed * 2 : playerRef.speed;
    const moveSpeed = speed * delta;

    // Movimiento direccional basado hacia donde mira tu cabeza (casco VR)
    const direction = new THREE.Vector3();
    cameraRef.getWorldDirection(direction);
    direction.y = 0; 
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    // Movemos el Rig completo en lugar de solo el mesh
    playerRef.rig.position.addScaledVector(direction, -vrInput.moveY * moveSpeed);
    playerRef.rig.position.addScaledVector(right, vrInput.moveX * moveSpeed);

    // El hitbox del jugador sigue a tu cabeza
    playerRef.mesh.position.copy(playerRef.rig.position);
    playerRef.mesh.position.y = 0; // El hitbox se mantiene en el suelo

    if (playerRef.attackCooldown > 0) playerRef.attackCooldown -= delta;

    let targetAnimation = 'idle';
    let canAct = playerRef.attackCooldown <= 0;

    playerRef.isBlocking = vrInput.block;

    if (playerRef.isBlocking) {
        targetAnimation = 'block';
        canAct = false;
    } else if (canAct) {
        if (vrInput.attack) {
            executeAttack(10, 0.65);
            targetAnimation = 'punch';
            canAct = false;
        } else if (vrInput.kick) {
            executeAttack(20, 0.85);
            targetAnimation = 'kick';
            canAct = false;
        }
    }

    if (canAct && (Math.abs(vrInput.moveX) > 0 || Math.abs(vrInput.moveY) > 0)) {
        targetAnimation = 'walk';
    }

    fadeToAction(targetAnimation);
}

export function groundSnap(mesh) {
    // Lógica simplificada para evitar bloqueos
    if (mesh.position.y < 0) mesh.position.y = 0;
}

export function getPlayerAABB() {
    if (!player.mesh) return null;
    const pos = player.mesh.position;
    return new THREE.Box3(
        new THREE.Vector3(pos.x - CHAR_RADIUS, pos.y, pos.z - CHAR_RADIUS),
        new THREE.Vector3(pos.x + CHAR_RADIUS, pos.y + CHAR_HEIGHT, pos.z + CHAR_RADIUS)
    );
}

function executeAttack(damageValue, cooldownTime) {
    player.attackCooldown = cooldownTime;
    playHitSound();

    if (enemy && enemy.mesh) {
        const attackReach = CHAR_RADIUS * 2 + 1.5; // Rango aumentado para compensar el nuevo tamaño
        const dist = player.mesh.position.distanceTo(enemy.mesh.position);
        
        if (dist < attackReach) {
            if (enemy.isBlocking) {
                player.energy += 3;
            } else {
                enemy.health -= damageValue;
                player.energy += 8;
            }
        }
    }
}