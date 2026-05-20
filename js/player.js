import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js';
import { scene, physics } from './scene.js';
import { keys } from './controls.js';
import { enemy } from './enemy.js';
import { playHitSound } from './scene.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE PERSONAJE
// ─────────────────────────────────────────────────────────────
export const CHAR_SCALE  = 0.0333;
export const CHAR_HEIGHT = 6.0;
export const CHAR_RADIUS = 1.2;

export let player = {
    mesh: null,
    speed: 5,
    health: 100,
    energy: 0,

    isBlocking:    false,
    attackCooldown: 0,

    currentState: 'idle',

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
                child.castShadow    = true;
                child.receiveShadow = true;
            }
        });

        scene.add(player.mesh);

        player.mixer = new THREE.AnimationMixer(player.mesh);
        const idleAction = player.mixer.clipAction(object.animations[0]);
        player.actions['idle']   = idleAction;
        player.currentAction     = idleAction;
        idleAction.play();

        loadAnimation(loader, './assets/models/Walking.fbx',    'walk');
        loadAnimation(loader, './assets/models/Punching.fbx',   'punch', true);
        loadAnimation(loader, './assets/models/Side Kick.fbx',  'kick',  true);
        loadAnimation(loader, './assets/models/Center Block.fbx', 'block');
    });
}

function loadAnimation(loader, path, name, isAttack = false) {
    loader.load(path, (animObject) => {
        if (!animObject.animations?.length) return;

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

export function updatePlayer(delta, isPlaying = true) {
    if (!player.mesh) return;
    if (player.mixer) player.mixer.update(delta);

    if (!isPlaying) {
        fadeToAction('idle');
        groundSnap(player.mesh);
        return;
    }

    if (player.attackCooldown > 0) player.attackCooldown -= delta;

    let targetAnimation = 'idle';
    let canAct = player.attackCooldown <= 0;

    if (!canAct && (player.currentState === 'punch' || player.currentState === 'kick')) {
        targetAnimation = player.currentState;
    } else {
        player.currentState = 'idle';
    }

    // ── Bloquear (B en teclado / Botón B en Quest 3) ──────────
    player.isBlocking = keys['b'];

    if (player.isBlocking) {
        targetAnimation         = 'block';
        player.currentState     = 'block';
        canAct                  = false;
    } else if (canAct) {
        // ── Atacar (K en teclado / Botón X en Quest 3) ─────────
        if (keys['k']) {
            executeAttack(10, 0.65);
            targetAnimation     = 'punch';
            player.currentState = 'punch';
            canAct              = false;

        // ── Patada (L en teclado / Botón Y en Quest 3) ─────────
        } else if (keys['l']) {
            executeAttack(20, 0.85);
            targetAnimation     = 'kick';
            player.currentState = 'kick';
            canAct              = false;
        }
        // ── Estado/Especial (E en teclado / Botón A en Quest 3) ─
        // El toggle de estado ya se maneja en controls.js (stateToggle)
        // Aquí solo registramos el keypress si hace falta para efectos visuales
    }

    // ── Movimiento (WASD / Joystick izquierdo Quest 3) ────────
    const move = new THREE.Vector3();

    if (canAct) {
        if (keys['w']) move.z -= 1;
        if (keys['s']) move.z += 1;
        if (keys['a']) move.x -= 1;
        if (keys['d']) move.x += 1;
    }

    if (move.length() > 0) {
        move.normalize();
        targetAnimation     = 'walk';
        player.currentState = 'walk';

        let speed = player.speed;
        if (keys['shift']) speed *= 1.5;

        const next = player.mesh.position.clone().add(
            move.clone().multiplyScalar(speed * delta)
        );

        if (physics && typeof physics.canMove === 'function') {
            if (physics.canMove(player.mesh.position, move, speed * delta)) {
                player.mesh.position.copy(next);
            }
        } else {
            player.mesh.position.copy(next);
        }

        const targetRotation = Math.atan2(move.x, move.z);
        player.mesh.rotation.y += (targetRotation - player.mesh.rotation.y) * 0.15;
    }

    fadeToAction(targetAnimation);
    groundSnap(player.mesh);
}

export function groundSnap(mesh) {
    if (!physics?.raycaster && typeof physics?.getColliders !== 'function') return;

    const origin = mesh.position.clone();
    origin.y += 2;

    physics.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    physics.raycaster.far = 100;

    const hits = physics.raycaster.intersectObjects(physics.getColliders(), true);
    if (hits.length > 0) {
        mesh.position.y = hits[0].point.y;
    }
}

export function getPlayerAABB() {
    if (!player.mesh) return null;
    const pos = player.mesh.position;
    return new THREE.Box3(
        new THREE.Vector3(pos.x - CHAR_RADIUS, pos.y,               pos.z - CHAR_RADIUS),
        new THREE.Vector3(pos.x + CHAR_RADIUS, pos.y + CHAR_HEIGHT, pos.z + CHAR_RADIUS)
    );
}

function executeAttack(damageValue, cooldownTime) {
    player.attackCooldown = cooldownTime;
    playHitSound();

    if (enemy?.mesh) {
        const attackReach = CHAR_RADIUS * 2 + 0.5;
        const dist = player.mesh.position.distanceTo(enemy.mesh.position);

        if (dist < attackReach) {
            if (enemy.isBlocking) {
                player.energy += 3;
            } else {
                enemy.health  -= damageValue;
                player.energy += 8;
            }
        }
    }
}
