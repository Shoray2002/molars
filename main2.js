let camera,
  scene,
  renderer,
  orbit_ctrl,
  trfm_ctrl,
  orig_geom,
  smooth_geom,
  smooth_materials,
  smooth_mesh,
  group;

const exportButton = document.getElementById("export");
const model_names = ["jaw", "t6", "t7", "t8", "t9", "t10", "t11"];
const loaderObj = new THREE.OBJLoader();
let exporter = new THREE.STLExporter();
init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(0, 0, 650);
  camera.lookAt(0, 0, 0);
  scene = new THREE.Scene();
  group = new THREE.Group();
  group.rotation.x = Math.PI / 3;
  scene.add(group);
  // lights
  let light = new THREE.PointLight(0x6c6b6b, 1.5);
  light.position.set(1000, 1000, 2000);
  scene.add(light);

  let ambientLight = new THREE.AmbientLight(0x6c6b6b, 1.5);
  scene.add(ambientLight);
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  // controls
  orbit_ctrl = new THREE.OrbitControls(camera, renderer.domElement);
  orbit_ctrl.damping = 0.2;
  orbit_ctrl.addEventListener("change", render);
  trfm_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  trfm_ctrl.addEventListener("change", render);
  scene.add(trfm_ctrl);
  //   trfm_ctrl.addEventListener("objectChange", function (e) {
  //     updateLattice();
  //     deform();
  //   });

  window.addEventListener("resize", onWindowResize);

  addModels();

  exportButton.addEventListener("click", function () {
    let stl = exporter.parse(group);
    let blob = new Blob([stl], { type: "text/plain" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mesh.stl";
    a.click();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}
function addModels() {
  smooth_materials = [
    new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0xe5e5e5,
      shininess: 1,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      opacity: 0.1,
      transparent: true,
    }),
  ];
  for (let i = 0; i < model_names.length; i++) {
    loaderObj.load("./models/" + model_names[i] + ".obj", function (object) {
      let subd_modifier = new THREE.SubdivisionModifier(0);
      let orig_geom = object.children[0].geometry;
      orig_geom = new THREE.Geometry().fromBufferGeometry(orig_geom);
      smooth_geom = orig_geom.clone();
      smooth_geom.mergeVertices();
      smooth_geom.computeFaceNormals();
      smooth_geom.computeVertexNormals();
      subd_modifier.modify(smooth_geom);
      smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
        smooth_geom,
        smooth_materials
      );
      if (i == 0) {
        smooth_mesh.position.set(0, 100, 0);
      } else {
        smooth_mesh.position.set(0, 65, 75);
      }
      smooth_mesh.name = model_names[i];
      console.log(smooth_mesh);
      group.add(smooth_mesh);
    });
  }
}
function render() {
  renderer.render(scene, camera);
}
function animate() {
  requestAnimationFrame(animate);
  orbit_ctrl.update();
  trfm_ctrl.update();
  render();
}
