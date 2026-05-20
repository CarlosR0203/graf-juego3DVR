import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/FBXLoader.js';
import { scene, physics } from './scene.js';
import { playHitSound } from './scene.js';
import { CHAR_HEIGHT, CHAR_RADIUS, groundSnap } from './player.js';

export let enemy = {
    mesh: null, speed: 3.5, health: 100, isBlocking: false, attackCooldown: 0,
    currentState: 'idle', mixer: null, actions: {}, currentAction: null
};

export function initEnemy(manager = null) {
    const loader = new FBXLoader(manager);
    
    loader.load('./assets/models/Enemy_Standing Idle To Fight Idle.fbx', (object) => {
        enemy.mesh = object;
        const box = new THREE.Box3().setFromObject(enemy.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // CORRECCIÓN DE PROPORCIÓN: Ajustado a 2.0 metros de altura para simular un oponente real.
        // Esto elimina la desproporción masiva anterior que te hacía sentir pequeño.
        const targetHeight = 2.0; 
        const scale = targetHeight / size.y;
        
        enemy.mesh.scale.setScalar(scale);
        enemy.mesh.position.set(0, 0, -2); // Posición inicial frente a tus ojos
        
        enemy.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        enemy.mixer = new THREE.AnimationMixer(enemy.mesh);
        if (object.animations && object.animations.length > 0) {
            const idleAction = enemy.mixer.clipAction(object.animations[0]);
            enemy.actions['idle'] = idleAction;
            enemy.currentAction = idleAction;
            idleAction.play();
        }

        scene.add(enemy.mesh);

        loadAnimation(loader, './assets/models/Enemy_Walking.fbx', 'walk');
        loadAnimation(loader, './assets/models/Enemy_Punching.fbx', 'punch', true);
        loadAnimation(loader, './assets/models/Enemy_Side Kick.fbx', 'kick', true);
        loadAnimation(loader, './assets/models/Enemy_Center Block.fbx', 'block');
    });
}

function loadAnimation(loader, path, name, isAttack = false) {
    loader.load(path, (animObject) => {
        if (!animObject.animations || animObject.animations.length === 0) return;
        const anim = animObject.animations[0];
        anim.tracks.forEach(t => { t.name = t.name.replace(/.*mixamorig/i, 'mixamorig'); });
        const action = enemy.mixer.clipAction(anim);
        if (isAttack) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
        }
        enemy.actions[name] = action;
    });
}

function fadeToAction(name, duration = 0.2) {
    const nextAction = enemy.actions[name];
    if (!nextAction || enemy.currentAction === nextAction) return;
    nextAction.reset().fadeIn(duration).play();
    if (enemy.currentAction) enemy.currentAction.fadeOut(duration);
    enemy.currentAction = nextAction;
}

export function updateEnemy(delta, playerRef, isPlaying = true) {
    if (!enemy.mesh) return;
    if (enemy.mixer) enemy.mixer.update(delta);
    
    if (!isPlaying) {
        fadeToAction('idle');
        return;
    }
    
    if (enemy.attackCooldown > 0) enemy.attackCooldown -= delta;
    let targetAnimation = 'idle';
    let canAct = enemy.attackCooldown <= 0;
    
    if (!canAct && (enemy.currentState === 'punch' || enemy.currentState === 'kick' || enemy.currentState === 'block')) {
        targetAnimation = enemy.currentState;
    } else {
        enemy.isBlocking = false;
    }
    
    if (playerRef && playerRef.mesh && canAct && enemy.health > 0) {
        // Localización directa dirigida al Rig (posición real del jugador en el mapa)
        const dist = enemy.mesh.position.distanceTo(playerRef.rig.position);
        const dir = new THREE.Vector3().subVectors(playerRef.rig.position, enemy.mesh.position);
        dir.y = 0;
        if (dir.length() > 0) dir.normalize();
        
        const targetRotation = Math.atan2(dir.x, dir.z);
        enemy.mesh.rotation.y += (targetRotation - enemy.mesh.rotation.y) * 0.10;
        
        // Rango de alcance de golpe optimizado para escala de proporciones idénticas
        const attackReach = CHAR_RADIUS * 2 + 0.6;
        
        if (dist > attackReach) {
            targetAnimation = 'walk';
            enemy.currentState = 'walk';
            enemy.mesh.position.addScaledVector(dir, enemy.speed * delta);
        } else {
            const actionChoice = Math.random();
            if (actionChoice < 0.4) {
                targetAnimation = 'block';
                enemy.attackCooldown = 0.8;
                enemy.isBlocking = Math.random() > 0.5;
                canAct = false;
            } else {
                const isKick = Math.random() > 0.5;
                targetAnimation = isKick ? 'kick' : 'punch';
                enemy.currentState = targetAnimation;
                executeAttack(isKick ? 15 : 10, isKick ? 0.85 : 0.65, playerRef);
                canAct = false;
            }
        }
    }
    
    fadeToAction(targetAnimation);
}

export function getEnemyAABB() {
    if (!enemy.mesh) return null;
    const pos = enemy.mesh.position;
    return new THREE.Box3(
        new THREE.Vector3(pos.x - 0.5, pos.y, pos.z - 0.5),
        new THREE.Vector3(pos.x + 0.5, pos.y + 2.0, pos.z + 0.5)
    );
}

function executeAttack(damageValue, cooldownTime, playerRef) {
    enemy.attackCooldown = cooldownTime;
    playHitSound();
    if (playerRef && playerRef.health !== undefined) {
        if (playerRef.isBlocking) {
            console.log('[COMBAT] Bloqueaste el golpe del oponente.');
        } else {
            playerRef.health -= damageValue;
        }
    }
}