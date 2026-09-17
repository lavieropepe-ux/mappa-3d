import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Coordinate precise San Marzano di San Giuseppe (Longitudine, Latitudine)
const modelOrigin = [17.5028, 40.4556]; 
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, 0, 0];

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

// Inizializza mappa con Zoom 18.5 (molto vicino)
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

        // Luci forte intensità per evitare che il modello appaia nero
        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(0, -70, 100).normalize();
        this.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        const loader = new GLTFLoader();
        loader.load(
            './models/SMarzano_3ds.glb',
            (gltf) => {
                const model = gltf.scene;
                // Aumentiamo la scala del modello nel caso sia stato esportato piccolo
                model.scale.set(10, 10, 10); 
                this.scene.add(model);
            },
            undefined,
            (error) => {
                console.error('Errore nel caricamento del file SMarzano_3ds.glb:', error);
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
