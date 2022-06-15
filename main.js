import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js";
// import { STLExporter } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js";
let container;
let camera, cameraTarget, scene, renderer, controls;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(0, 0, 2);
  cameraTarget = new THREE.Vector3(0, 0, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 2, 15);
  const loader = new STLLoader();

  const material = new THREE.MeshPhongMaterial({
    color: 0xfff000,
    specular: 0x111111,
    shininess: 200,
  });

  loader.load("./bunny.stl", function (geometry) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-0.1, -0.3, 0);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    mesh.scale.set(0.005, 0.005, 0.005);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
  });

  // Lights

  scene.add(new THREE.HemisphereLight(0x443333, 0x111122));
  addShadowedLight(1, 1, 1, 0xffffff, 1.35);
  addShadowedLight(0.5, 1, -1, 0xffaa00, 1);
  // renderer

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;

  container.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  window.addEventListener("resize", onWindowResize);
}

function addShadowedLight(x, y, z, color, intensity) {
  const directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);
  directionalLight.castShadow = true;
  const d = 1;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 4;
  directionalLight.shadow.bias = -0.002;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  // const timer = Date.now() * 0.0005;
  // camera.position.x = Math.cos(timer) * 3;
  // camera.position.z = Math.sin(timer) * 3;

  camera.lookAt(cameraTarget);
  controls.update();
  renderer.render(scene, camera);
}
