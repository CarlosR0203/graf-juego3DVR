import * as THREE from 'three';
import { vrInput } from './controls.js';

export const CHAR_SCALE = 1.0;
export const CHAR_HEIGHT = 2.0;
export const CHAR_RADIUS = 0.8;

export function groundSnap(mesh) {
    if (!mesh) return;
    if (mesh.position.y > 0) {
        mesh.position.y = 0;
    }
}

function playAnimation(player, animName) {
    if (player.mixer && player.actions && player.actions[animName]) {
        const action = player.actions[animName];
        action.reset().fadeIn(0.15).play();
    }
}

export function updatePlayer(player, camera, delta) {
    if (!player || !player.mesh) return;

    const speed = vrInput.run ? player.speed * 2 : player.speed;
    const moveSpeed = speed * delta;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; 
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    player.mesh.position.addScaledVector(direction, -vrInput.moveY * moveSpeed);
    player.mesh.position.addScaledVector(right, vrInput.moveX * moveSpeed);

    if (player.attackCooldown > 0) {
        player.attackCooldown -= delta;
    }

    if (vrInput.attack && player.attackCooldown <= 0) {
        playAnimation(player, 'punch');
        player.attackCooldown = 0.8;
    }

    if (vrInput.kick && player.attackCooldown <= 0) {
        playAnimation(player, 'kick');
        player.attackCooldown = 1.2;
    }

    if (vrInput.block) {
        playAnimation(player, 'block');
    }
}