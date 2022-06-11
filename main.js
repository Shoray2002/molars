import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
let camera, scene, renderer, controls;
const importButton = document.getElementById("import");

const stlLoader = new STLLoader();
init();
animate();
function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(-400, 300, 200);
  scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  // scene.add(ambientLight);
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(100, 100, 100),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  scene.add(cube);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
importButton.addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function (event) {
    const data = event.target.result;
    const geometry = stlLoader.parse(data);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.scale.set(5, 5, 5);
    scene.add(mesh);
  };
  reader.readAsArrayBuffer(file);
});

function animate() {
  controls.update();
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
