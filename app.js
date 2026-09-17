import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. COORDINATE CENTRATE SULLA SAGOMA GRIGIA [Longitudine, Latitudine]
const modelOrigin = [17.48585, 40.47512]; 
const modelAltitude = 0;

// 2. ROTAZIONE MAPPA (Gradi per l'allineamento bussola)
const degrees = 100; 
const modelRotate = [Math.PI / 2, 0, degrees * (Math.PI / 180)];

const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
);

const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
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

const customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        // Luci
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        directionalLight.position.set(0, -70, 100).normalize();
        this.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);

        // Caricamento e correzione orientamento Mesh
        const loader = new GLTFLoader();
        loader.load(
            './models/SMarzano_3ds.glb', // Verificare maiuscole/minuscole dei file su GitHub Pages
            (gltf) => {
                const model = gltf.scene;
                
               
                model.rotation.y = Math.PI / 2; 

                this.scene.add(model);

                // Forza il ridisegno della mappa appena il download del file 3D è completato
                if (this.map) {
                    this.map.triggerRepaint();
                }
            },
            (xhr) => {
                // Monitoraggio percentuale di caricamento in console
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    console.log(`Caricamento modello 3D: ${Math.round(percentComplete)}%`);
                }
            },
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
        const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
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
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }
};

map.on('style.load', () => {
    map.addLayer(customLayer);
});

// Tracciamento coordinate al movimento del mouse
map.on('mousemove', (e) => {
    const lng = e.lngLat.lng.toFixed(6);
    const lat = e.lngLat.lat.toFixed(6);
    const info = document.getElementById('info');
    if (info) {
        info.innerHTML = `Longitudine: <b>${lng}</b> | Latitudine: <b>${lat}</b>`;
    }
});
