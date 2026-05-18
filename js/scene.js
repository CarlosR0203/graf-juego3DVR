import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/XRControllerModelFactory.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { CHAR_HEIGHT } from './player.js';

export let scene, camera, renderer, physics, vrRig;
export let worldColliders = [];
export let controller1, controller2;
export let controllerGrip1, controllerGrip2;

export function getPhysics() { return physics; }

let listener, audioLoader, bgSound, hitSound;
let audioUnlocked = false, bgReady = false;

export function playHitSound() {
    if (hitSound?.buffer) {
        hitSound.stop();
        hitSound.play();
    }
}

export function initScene() {
    scene = new THREE.Scene();
    
    vrRig = new THREE.Group();
    vrRig.scale.setScalar(3.0); // Tu altura real se multiplica x3 para que sientas la escala correcta
    scene.add(vrRig);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.35, 1500);
    camera.position.set(0, CHAR_HEIGHT * 0.92, 0); 
    vrRig.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    controller1 = renderer.xr.getController(0);
    vrRig.add(controller1);

    controller2 = renderer.xr.getController(1);
    vrRig.add(controller2);

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    vrRig.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    vrRig.add(controllerGrip2);

    physics = new PhysicsWorld(scene, () => worldColliders);
    
    initLights();
    initAudio();
    loadHDR();
    loadMap();
}

function initLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 40, 10);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
}

function loadHDR() {
    new RGBELoader().load('./assets/textures/sky.hdr', (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = tex;
        scene.environment = tex;
    });
}

function initAudio() {
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();
    bgSound = new THREE.Audio(listener);
    hitSound = new THREE.Audio(listener);

    audioLoader.load('./assets/audio/bg.mp3', (buffer) => {
        bgSound.setBuffer(buffer);
        bgSound.setLoop(true);
        bgSound.setVolume(0.4);
        bgReady = true;
        if (audioUnlocked) bgSound.play();
    });

    audioLoader.load('./assets/audio/hit.mp3', (buffer) => {
        hitSound.setBuffer(buffer);
        hitSound.setVolume(0.8);
    });
}

export function unlockAudio() {
    const ctx = listener?.context;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            audioUnlocked = true;
            if (bgReady) bgSound.play();
        });
    } else {
        audioUnlocked = true;
        if (bgReady) bgSound.play();
    }
}

function loadMap() {
    const loader = new GLTFLoader();
    loader.load('./assets/models/escenario.glb', (gltf) => {
        const map = gltf.scene;
        const box = new THREE.Box3().setFromObject(map);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxSize = Math.max(size.x, size.z);
        const TARGET_SIZE = 120; 
        const scale = TARGET_SIZE / maxSize;
        map.scale.setScalar(scale);

        const center = new THREE.Vector3();
        box.getCenter(center);
        map.position.sub(center.multiplyScalar(scale));

        worldColliders.length = 0;
        map.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                worldColliders.push(o);
            }
        });
        scene.add(map);
    });
}

export function updateCamera(player) {
    if (!player?.mesh) return;

    if (renderer.xr.isPresenting) {
        // En VR, tu avatar (el mesh) es arrastrado hacia la posición real de tu cabeza
        const headPos = new THREE.Vector3();
        camera.getWorldPosition(headPos);
        
        player.mesh.position.x = headPos.x;
        player.mesh.position.z = headPos.z;
        
        // Hacemos que el cuerpo apunte hacia donde tú miras
        const headDir = new THREE.Vector3();
        camera.getWorldDirection(headDir);
        player.mesh.rotation.y = Math.atan2(headDir.x, headDir.z);
        
        player.mesh.visible = true; 
        return;
    }

    // Cámara clásica de PC (Tercera Persona)
    const offset = new THREE.Vector3(0, CHAR_HEIGHT * 0.8, 12);
    offset.applyQuaternion(player.mesh.quaternion);
    const target = player.mesh.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(player.mesh.position.clone().add(new THREE.Vector3(0, CHAR_HEIGHT * 0.7, 0)));
}