import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export class PhysicsWorld {
    constructor(scene, getColliders) {
        this.scene = scene;
        this.getColliders = getColliders;
        this.raycaster = new THREE.Raycaster();
    }

    isGrounded(position, distance = 2.0) {
        const origin = position.clone();
        origin.y += 5; // El rayo debe salir desde más alto por la nueva escala
        this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        const hits = this.raycaster.intersectObjects(this.getColliders(), true);
        return hits.length > 0 && hits[0].distance <= distance;
    }

    forwardCollision(position, direction, distance = 1.5) {
        this.raycaster.set(
            new THREE.Vector3(position.x, position.y + 3, position.z), // Rayo desde el pecho
            direction.clone().normalize()
        );
        const hits = this.raycaster.intersectObjects(this.getColliders(), true);
        return hits.length > 0 && hits[0].distance <= distance;
    }

    canMove(position, direction, step = 0.3) {
        if (!direction || direction.length() === 0) return true;
        const dir = direction.clone().normalize();
        
        const center = this.forwardCollision(position, dir, step);
        const left = this.forwardCollision(position, dir.clone().add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.5)), step);
        const right = this.forwardCollision(position, dir.clone().add(new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(0.5)), step);

        if (center || left || right) return false;

        const nextPos = position.clone().add(dir.clone().multiplyScalar(step));
        const limiteArena = 65; // Límite expandido proporcionalmente al mapa
        const distFromCenter = Math.sqrt(nextPos.x * nextPos.x + nextPos.z * nextPos.z);

        if (distFromCenter > limiteArena) {
            return false; 
        }

        return true;
    }
}