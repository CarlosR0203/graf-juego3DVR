import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js';
import { scene, physics } from './scene.js';
import { keys } from './controls.js';
import { enemy } from './enemy.js';
import { playHitSound } from './scene.js';

// Ajuste de escala (3x sobre el valor anterior) e indicadores físicos
export const CHAR_SCALE = 0.0333; 
export const CHAR_HEIGHT = 6.0;
export const CHAR_RADIUS = 1.2;
const GROUND_OFFSET = 0.02;

export let player = {
    mesh: null,
    speed: 12, // Velocidad ajustada a la nueva escala
    health: 100,
    energy: 0,
    isBlocking: false,
    currentState: 'idle',
    attackCooldown: 0,
    mixer: null,
    actions: {},
    currentAction: null
};

export function initPlayer() {
    const loader = new FBXLoader();
    loader.load('./assets/models/Standing Idle To Fight Idle.fbx', (object) => {
        player.mesh = object;
        player.mesh.scale.setScalar(CHAR_SCALE);
        player.mesh.position.set(-3, 20, 0);
        
        player.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
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
        anim.tracks.forEach(track => {
            track.name = track.name.replace(/.*mixamorig/i, 'mixamorig');
        });
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

export function updatePlayer(delta) {
    if (!player.mesh) return;
    if (player.mixer) player.mixer.update(delta);
    if (player.attackCooldown > 0) player.attackCooldown -= delta;

    let targetAnimation = 'idle';
    let canAct = player.attackCooldown <= 0;

    player.isBlocking = keys['b'];
    if (player.isBlocking) {
        targetAnimation = 'block';
        player.currentState = 'block';
        canAct = false;
    } else if (canAct) {
        if (keys['k']) {
            executeAttack(10, 0.65);
            targetAnimation = 'punch';
            player.currentState = 'punch';
            canAct = false;
        } else if (keys['l']) {
            executeAttack(20, 0.85);
            targetAnimation = 'kick';
            player.currentState = 'kick';
            canAct = false;
        }
    }

    const move = new THREE.Vector3();
    if (canAct) {
        if (keys['w']) move.z -= 1;
        if (keys['s']) move.z += 1;
        if (keys['a']) move.x -= 1;
        if (keys['d']) move.x += 1;
    }

    if (move.length() > 0) {
        move.normalize();
        targetAnimation = 'walk';
        player.currentState = 'walk';
        let speed = player.speed;
        if (keys['shift']) speed *= 1.5;

        const next = player.mesh.position.clone().add(
            move.clone().multiplyScalar(speed * delta)
        );

        if (physics?.canMove(player.mesh.position, move, speed * delta)) {
            player.mesh.position.copy(next);
        }

        const targetRotation = Math.atan2(move.x, move.z);
        // Suavizado de rotación incrementado (0.2) para mayor fluidez
        player.mesh.rotation.y += (targetRotation - player.mesh.rotation.y) * 0.2;
    }

    fadeToAction(targetAnimation);
    groundSnap(player.mesh);
}

export function groundSnap(mesh) {
    if (!physics?.raycaster) return;
    const origin = mesh.position.clone();
    origin.y += 2;
    physics.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    const hits = physics.raycaster.intersectObjects(physics.getColliders(), true);
    if (hits.length > 0) {
        mesh.position.y = hits[0].point.y;
    }
}

function executeAttack(damageValue, cooldownTime) {
    player.attackCooldown = cooldownTime;
    playHitSound();
    if (enemy?.mesh) {
        const attackReach = CHAR_RADIUS * 2 + 0.8;
        const dist = player.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < attackReach) {
            if (!enemy.isBlocking) {
                enemy.health -= damageValue;
            }
        }
    }
}