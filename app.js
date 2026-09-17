import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. COORDINATE PERFETTAMENTE CENTRATE SULLA SAGOMA GRIGIA [Longitudine, Latitudine]
const modelOrigin = [17.48590, 40.47510]; 
const modelAltitude = 0;

// Converti coordinate per MapLibre
const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
);

// Manteniamo la trasformazione MapLibre standard (senza rotazioni complesse qui)
const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};

// Inizializzazione della mappa
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: modelOrigin,
    zoom: 18.5,
    pitch: 60,
    bearing: -17
});

// Layer 3D Three.js
const customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        // Luci
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, -70, 100).normalize();
        this.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        // Caricamento Modello GLB
        const loader = new GLTFLoader();
        loader.load(
            './models/SMarzano_3ds.glb',
            (gltf) => {
                const model = gltf.scene;

                // --- ROTAZIONE DIRETTA DEL MODELLO 3D ---
                // Ruota di 90° attorno all'asse Y per metterlo in piedi/orizzontale
                model.rotation.y = Math.PI / 2; // (90 gradi)

                // Regola questo valore per allinearlo alla sagoma sulla mappa (in gradi)
                const angolodibussola = 10; 
                model.rotation.z = angolodibussola * (Math.PI / 180);

                this.scene.add(model);
            },
            undefined,
            (error) => {
                console.error('Errore nel caricamento del file GLB:', error);
            }
        );
        this.map = map;

        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialiasing: true
        });
        this.renderer.autoClear = false;
    },
    render: function (gl, matrix) {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
            .makeTranslation(
                modelTransform.translateX,
                modelTransform.translateY,
                modelTransform.translateZ
            )
            .scale(
                new THREE.Vector3(
                    modelTransform.scale,
                    -modelTransform.scale,
                    modelTransform.scale
                )
            )
            .multiply(rotationX);

        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }
};

map.on('style.load', () => {
    map.addLayer(customLayer);
});

// Evento movimento mouse per le coordinate
map.on('mousemove', (e) => {
    const lng = e.lngLat.lng.toFixed(6);
    const lat = e.lngLat.lat.toFixed(6);
    const info = document.getElementById('info');
    if (info) {
        info.innerHTML = `Longitudine: <b>${lng}</b> | Latitudine: <b>${lat}</b>`;
    }
});
