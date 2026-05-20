// player.js

import * as THREE from 'three';
import { vrInput } from './controls.js';

export function updatePlayer(player, camera, delta) {

    const speed = vrInput.run ? player.speed * 2 : player.speed;
    const moveSpeed = speed * delta;

    // 🔥 Movimiento relativo a la cámara (clave en VR)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    // Adelante / atrás
    player.mesh.position.addScaledVector(direction, vrInput.moveY * moveSpeed);

    // Laterales
    player.mesh.position.addScaledVector(right, vrInput.moveX * moveSpeed);

    // 🔻 ATAQUES
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