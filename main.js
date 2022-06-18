let camera,
  scene,
  renderer,
  user_options,
  orbit_ctrl,
  trfm_ctrl,
  orig_geom,
  smooth_geom,
  temp_mesh,
  upper_jaw,
  lower_jaw;
const exportButton = document.getElementById("export");
const canvas = document.getElementById("canvas");
let subd_level = 0;
let smooth_mesh;
let smooth_verts_undeformed = [];
let model_scale;
let model_names = ["jaw", "t6", "t7", "t8", "t9", "t10", "t11"];
// FFD: control points of a lattice
let ffd = new FFD();
let span_counts = [2, 2, 3];
let ctrl_pt_geom = new THREE.SphereGeometry(2.5, 32, 32);
let ctrl_pt_material = new THREE.MeshLambertMaterial({ color: 0xfff000 });
let ctrl_pt_meshes = [];
let ctrl_pt_mesh_selected = null;
let lattice_lines = [];
let lattice_line_material = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
});
let models = [];
let selected_model = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

const exporter = new THREE.STLExporter();
const loaderOBJ = new THREE.OBJLoader();
// start scene
init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.z = 650;
  scene = new THREE.Scene();
  // Group
  upper_jaw = new THREE.Group();
  upper_jaw.translateY(100);
  upper_jaw.rotation.x = Math.PI / 3;
  scene.add(upper_jaw);
  lower_jaw = new THREE.Group();
  lower_jaw.translateY(20);
  lower_jaw.rotation.x = Math.PI / 3;
  scene.add(lower_jaw);
  // Light
  let light = new THREE.PointLight(0x6c6b6b, 1.5);
  light.position.set(1000, 1000, 2000);
  scene.add(light);

  let ambientLight = new THREE.AmbientLight(0x6c6b6b, 1.5);
  scene.add(ambientLight);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.addEventListener("mousemove", onDocumentMouseMove, false);
  renderer.domElement.addEventListener("mousedown", onDocumentMouseDown, false);

  // Orbit controls
  orbit_ctrl = new THREE.OrbitControls(camera, renderer.domElement);
  orbit_ctrl.damping = 0.2;
  orbit_ctrl.addEventListener("change", render);
  trfm_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  trfm_ctrl.addEventListener("change", render);
  scene.add(trfm_ctrl);
  trfm_ctrl.addEventListener("objectChange", function (e) {
    updateLattice();
    deform();
  });

  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousedown", modelSelection, false);
  window.addEventListener("keydown", keyDown, false);
  // createEvalPtsMesh();
  addModel();
  exportButton.addEventListener("click", function () {
    let lower = exporter.parse(lower_jaw);
    let blob = new Blob([lower], { type: "application/octet-stream" });
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
}

function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObjects(ctrl_pt_meshes);
  if (intersects.length > 0 && ctrl_pt_mesh_selected != intersects[0].object) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "auto";
  }
}

function onDocumentMouseDown(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObjects(ctrl_pt_meshes, false);
  if (intersects.length > 0 && ctrl_pt_mesh_selected != intersects[0].object) {
    orbit_ctrl.enabled = false;
    console.log(intersects[0].object.name);
    if (ctrl_pt_mesh_selected) trfm_ctrl.detach(trfm_ctrl.object);
    ctrl_pt_mesh_selected = intersects[0].object;
    trfm_ctrl.attach(ctrl_pt_mesh_selected);
  } else {
    orbit_ctrl.enabled = true;
  }
}

function modelSelection(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObjects(models);
  if (intersects.length > 0 && intersects[0].object != selected_model) {
    console.log(intersects[0].object);
    selected_model = intersects[0].object;
    smooth_verts_undeformed.length = 0;
    for (let i = 0; i < selected_model.geometry.vertices.length; i++) {
      let copy_vertex = new THREE.Vector3();
      copy_vertex.copy(selected_model.geometry.vertices[i]);
      smooth_verts_undeformed.push(copy_vertex);
    }
    rebuildFFD(false);
  }
}
function keyDown(event) {
  // esc
  if (event.keyCode == 27) {
    removeCtrlPtMeshes();
    removeLatticeLines();
    trfm_ctrl.detach(trfm_ctrl.object);
    selected_model = null;
  }
}

function animate() {
  requestAnimationFrame(animate);
  orbit_ctrl.update();
  trfm_ctrl.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

function addModel() {
  for (let i = 0; i < model_names.length; i++) {
    loaderOBJ.load(`/models/${model_names[i]}.obj`, function (object) {
      let mesh = object.children[0];
      orig_geom = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
      let subd_modifier = new THREE.SubdivisionModifier(subd_level);
      smooth_geom = orig_geom.clone();
      smooth_geom.mergeVertices();
      smooth_geom.computeFaceNormals();
      smooth_geom.computeVertexNormals();
      subd_modifier.modify(smooth_geom);
      let smooth_materials = [
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
      smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
        smooth_geom,
        smooth_materials
      );
      temp_mesh = new THREE.Mesh(smooth_geom, smooth_materials[0]);
      model_scale = 1;
      smooth_mesh.scale.x = model_scale;
      smooth_mesh.scale.y = model_scale;
      smooth_mesh.scale.z = model_scale;
      models.push(temp_mesh);
      if (i > 0) {
        lower_jaw.add(smooth_mesh);
      } else {
        upper_jaw.add(smooth_mesh);
      }
    });
  }
}

function rebuildFFD() {
  // removeCtrlPtMeshes();
  // removeLatticeLines();

  let bbox;
  bbox = new THREE.Box3();
  bbox.setFromPoints(smooth_geom.vertices);
  if (model_scale != 1)
    bbox.set(
      bbox.min.multiplyScalar(model_scale),
      bbox.max.multiplyScalar(model_scale)
    );

  let span_counts_copy = [span_counts[0], span_counts[1], span_counts[2]];
  ffd.rebuildLattice(bbox, span_counts_copy);
  addCtrlPtMeshes();
  addLatticeLines();
  deform();
}

function removeCtrlPtMeshes() {
  for (let i = 0; i < ctrl_pt_meshes.length; i++)
    upper_jaw.remove(ctrl_pt_meshes[i]);
  ctrl_pt_meshes.length = 0;
}

function removeLatticeLines() {
  for (let i = 0; i < lattice_lines.length; i++)
    upper_jaw.remove(lattice_lines[i]);
  lattice_lines.length = 0;
}

function addCtrlPtMeshes() {
  for (let i = 0; i < ffd.getTotalCtrlPtCount(); i++) {
    let ctrl_pt_mesh = new THREE.Mesh(ctrl_pt_geom, ctrl_pt_material);
    ctrl_pt_mesh.position.copy(ffd.getPosition(i));
    ctrl_pt_mesh.material.ambient = ctrl_pt_mesh.material.color;
    ctrl_pt_mesh.name = "ctrl_pt_mesh" + i;
    ctrl_pt_meshes.push(ctrl_pt_mesh);
    upper_jaw.add(ctrl_pt_mesh);
  }
}

function addLatticeLines() {
  for (let i = 0; i < ffd.getCtrlPtCount(0) - 1; i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2); k++) {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i + 1, j, k)].position
        );
        let line = new THREE.Line(geometry, lattice_line_material);

        lattice_lines.push(line);
        upper_jaw.add(line);
      }
    }
  }
  for (let i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1) - 1; j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2); k++) {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i, j + 1, k)].position
        );
        let line = new THREE.Line(geometry, lattice_line_material);
        lattice_lines.push(line);
        upper_jaw.add(line);
      }
    }
  }
  for (let i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2) - 1; k++) {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i, j, k + 1)].position
        );
        let line = new THREE.Line(geometry, lattice_line_material);

        lattice_lines.push(line);
        upper_jaw.add(line);
      }
    }
  }
}

// function createEvalPtsMesh() {
//   let total_eval_pts_count =
//     eval_pt_counts.x * eval_pt_counts.y * eval_pt_counts.z;
//   for (let i = 0; i < total_eval_pts_count; i++)
//     eval_pts_geom.vertices.push(new THREE.Vector3());
//   eval_pts_mesh = new THREE.Points(
//     eval_pts_geom.clone(),
//     new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
//   );
//   group.add(eval_pts_mesh);
// }

function updateLattice() {
  for (let i = 0; i < ffd.getTotalCtrlPtCount(); i++)
    ffd.setPosition(i, ctrl_pt_meshes[i].position);
  let line_index = 0;
  for (let i = 0; i < ffd.getCtrlPtCount(0) - 1; i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2); k++) {
        let line = lattice_lines[line_index++];
        line.geometry.vertices[0] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k)].position;
        line.geometry.vertices[1] =
          ctrl_pt_meshes[ffd.getIndex(i + 1, j, k)].position;
        line.geometry.verticesNeedUpdate = true;
      }
    }
  }
  for (let i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1) - 1; j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2); k++) {
        let line = lattice_lines[line_index++];
        line.geometry.vertices[0] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k)].position;
        line.geometry.vertices[1] =
          ctrl_pt_meshes[ffd.getIndex(i, j + 1, k)].position;
        line.geometry.verticesNeedUpdate = true;
      }
    }
  }
  for (let i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (let j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (let k = 0; k < ffd.getCtrlPtCount(2) - 1; k++) {
        let line = lattice_lines[line_index++];
        line.geometry.vertices[0] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k)].position;
        line.geometry.vertices[1] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k + 1)].position;
        line.geometry.verticesNeedUpdate = true;
      }
    }
  }
}

function deform() {
  for (let i = 0; i < smooth_geom.vertices.length; i++) {
    let eval_pt = ffd.evalWorld(smooth_verts_undeformed[i]);
    if (eval_pt.equals(smooth_geom.vertices[i])) continue;
    smooth_geom.vertices[i].copy(eval_pt);
  }
  smooth_geom.verticesNeedUpdate = true;
}
