// variables
let camera,
  scene,
  renderer,
  orbit_ctrl,
  trfm_ctrl,
  orig_geom,
  smooth_geom,
  smooth_materials,
  jaw_material,
  smooth_mesh,
  exporter_grp,
  group,
  selected_model;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let subd_level = 0;
let smooth_verts_undeformed = [];
let ffd = new FFD();
let span_counts = [2, 2, 2];
let ctrl_pt_geom = new THREE.SphereGeometry(5, 32, 32);
let ctrl_pt_material = new THREE.MeshLambertMaterial({ color: 0xfff000 });
let ctrl_pt_meshes = [];
let ctrl_pt_mesh_selected = null;
let lattice_lines = [];
let lattice_line_material = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
});
const objects = [];
const loaderObj = new THREE.OBJLoader();
// const loaderSTL = new THREE.STLLoader();
let exporter = new THREE.STLExporter();
const model_names = ["jaw", "t6", "t7", "t8", "t9", "t10", "t11"];

// document selection
const exportButton = document.getElementById("exportSTL");
const exportSelect = document.getElementById("exportSelect");
const import_modal_button = document.getElementById("import-modal");
const close = document.getElementById("close");
const modal = document.querySelector(".modal");
const uploadFile_button = document.getElementById("uploadFile");
const uploadLink_button = document.getElementById("uploadLink");
const holder = document.getElementById("holder");

// function calls
init();
animate();
// main function
function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(0, -100, 800);
  camera.lookAt(0, -100, 0);
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
  orbit_ctrl.enableDamping = true;
  orbit_ctrl.dampingFactor = 0.5;
  orbit_ctrl.addEventListener("change", render);
  trfm_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  trfm_ctrl.addEventListener("change", render);
  scene.add(trfm_ctrl);
  trfm_ctrl.addEventListener("objectChange", function (e) {
    updateLattice();
    deform();
  });

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("mousemove", onDocumentMouseMove);
  window.addEventListener("mousedown", onDocumentMouseDown);
  window.addEventListener("keydown", keyDown, false);
  addModels();
  exportButton.addEventListener("click", function () {
    removeCtrlPtMeshes();
    removeLatticeLines();
    trfm_ctrl.detach(trfm_ctrl.object);
    selected_model = null;
    let stl = exporter.parse(group);
    let blob = new Blob([stl], { type: "text/plain" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = export_model_namer() + ".stl";
    a.click();
  });
  exportSelect.addEventListener("click", function () {
    if (selected_model) {
      removeCtrlPtMeshes();
      removeLatticeLines();
      trfm_ctrl.detach(trfm_ctrl.object);
      let stl = exporter.parse(selected_model);
      let blob = new Blob([stl], { type: "text/plain" });
      let a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = export_model_namer() + ".stl";
      a.click();
    } else {
      alert("Please select an object first");
    }
  });
}

// event listeners
import_modal_button.addEventListener("click", function () {
  modal.style.display = "flex";
});
close.addEventListener("click", function () {
  modal.style.display = "none";
  holder.innerHTML = "";
});
uploadFile_button.addEventListener("click", function () {
  holder.innerHTML =
    '<label class="area" for="upload"><input type="file" id="upload" /><label>  ';
  let upload = document.getElementById("upload");
  function onFile() {
    let file = upload.files[0];
    let name = file.name;
    console.log("upload code goes here", name);
  }
  upload.addEventListener(
    "dragenter",
    function (e) {
      upload.parentNode.className = "area dragging";
      console.log("dragenter");
    },
    false
  );
  upload.addEventListener(
    "dragleave",
    function (e) {
      upload.parentNode.className = "area";
      console.log("dragleave");
    },
    false
  );
  upload.addEventListener(
    "dragdrop",
    function (e) {
      onFile();
      console.log("dragdrop");
    },
    false
  );
  upload.addEventListener(
    "change",
    function (e) {
      onFile();
    },
    false
  );
});
uploadLink_button.addEventListener("click", function () {
  holder.innerHTML =
    '<input type="text" id="link" name="link" placeholder="Paste link here" autocomplete="off"/><button class="button" id="load-model-from-url">Submit</button>';
  const submit_link = document.getElementById("load-model-from-url");
  submit_link.addEventListener("click", function () {
    const link = document.getElementById("link").value;
    console.log(link);
    close.click();
  });
});

// event handlers
function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObjects(objects, true);
  let hovered_ctrl_points = raycaster.intersectObjects(ctrl_pt_meshes);
  if (
    intersects.length > 0 ||
    (hovered_ctrl_points.length > 0 &&
      ctrl_pt_mesh_selected != hovered_ctrl_points[0].object)
  ) {
    renderer.domElement.style.cursor = "pointer";
  } else {
    renderer.domElement.style.cursor = "auto";
  }
}
function onDocumentMouseDown() {
  let clicked_ctrl_point = raycaster.intersectObjects(ctrl_pt_meshes, false);
  if (
    clicked_ctrl_point.length > 0 &&
    ctrl_pt_mesh_selected != clicked_ctrl_point[0].object
  ) {
    orbit_ctrl.enabled = false;
    console.log(clicked_ctrl_point[0].object.name);
    if (ctrl_pt_mesh_selected) trfm_ctrl.detach(trfm_ctrl.object);
    ctrl_pt_mesh_selected = clicked_ctrl_point[0].object;
    trfm_ctrl.attach(ctrl_pt_mesh_selected);
  } else {
    orbit_ctrl.enabled = true;
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
  // x
  if (event.keyCode == 88) {
    event.preventDefault();
    trfm_ctrl.detach(trfm_ctrl.object);
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(objects, true);
    if (selected_model) {
    }
    if (intersects.length > 0 && intersects[0].object != selected_model) {
      selected_model = intersects[0].object.parent;
      build(selected_model);
    }
  }
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

// helper functions
function export_model_namer() {
  let export_model_name = prompt("Enter model name");
  if (!export_model_name) {
    export_model_name = "model";
  }
  return export_model_name;
}
function build(model) {
  smooth_verts_undeformed.length = 0;
  for (let i = 0; i < model.children[0].geometry.vertices.length; i++) {
    let copy_vertex = new THREE.Vector3();
    copy_vertex.copy(model.children[0].geometry.vertices[i]);
    smooth_verts_undeformed.push(copy_vertex);
  }
  rebuildFFD(model);
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
  jaw_material = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    specular: 0xe5e5e5,
    shininess: 1,
    side: THREE.DoubleSide,
  });
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
      if (i == 0) {
        smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(smooth_geom, [
          jaw_material,
          smooth_materials[1],
        ]);
      } else smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(smooth_geom, smooth_materials);
      if (i == 0) {
        smooth_mesh.position.set(0, 0, 0);
      } else {
        smooth_mesh.position.set(0, 0, 0);
      }
      smooth_mesh.name = "model";
      objects.push(smooth_mesh);
      group.add(smooth_mesh);
    });
  }
}
function render() {
  renderer.render(scene, camera);
}
function animate() {
  requestAnimationFrame(animate);
  raycaster.setFromCamera(mouse, camera);
  orbit_ctrl.update();
  trfm_ctrl.update();
  render();
}
function rebuildFFD(model) {
  removeCtrlPtMeshes();
  removeLatticeLines();
  let bbox;
  bbox = new THREE.Box3();
  let modified_verts = [];
  for (let i = 0; i < model.children[0].geometry.vertices.length; i++) {
    let copy_vertex = new THREE.Vector3();
    copy_vertex.copy(
      model.children[0].geometry.vertices[i].add(model.position)
    );
    modified_verts.push(copy_vertex);
  }

  bbox.setFromPoints(modified_verts);
  console.log(model.children[0].geometry.vertices);
  let span_counts_copy = [span_counts[0], span_counts[1], span_counts[2]];
  ffd.rebuildLattice(bbox, span_counts_copy);
  addCtrlPtMeshes();
  addLatticeLines();
  deform();
}
function removeCtrlPtMeshes() {
  for (let i = 0; i < ctrl_pt_meshes.length; i++)
    group.remove(ctrl_pt_meshes[i]);
  ctrl_pt_meshes.length = 0;
}
function removeLatticeLines() {
  for (let i = 0; i < lattice_lines.length; i++) group.remove(lattice_lines[i]);
  lattice_lines.length = 0;
}
function addCtrlPtMeshes() {
  for (let i = 0; i < ffd.getTotalCtrlPtCount(); i++) {
    let ctrl_pt_mesh = new THREE.Mesh(ctrl_pt_geom, ctrl_pt_material);
    ctrl_pt_mesh.position.copy(ffd.getPosition(i));
    ctrl_pt_mesh.material.ambient = ctrl_pt_mesh.material.color;
    ctrl_pt_mesh.name = "ctrl_pt_mesh" + i;
    ctrl_pt_meshes.push(ctrl_pt_mesh);
    group.add(ctrl_pt_mesh);
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
        group.add(line);
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
        group.add(line);
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
        group.add(line);
      }
    }
  }
}
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
  for (
    let i = 0;
    i < selected_model.children[0].geometry.vertices.length;
    i++
  ) {
    let eval_pt = ffd.evalWorld(smooth_verts_undeformed[i]);
    if (eval_pt.equals(selected_model.children[0].geometry.vertices[i]))
      continue;
    selected_model.children[0].geometry.vertices[i].copy(eval_pt);
  }
  selected_model.children[0].geometry.verticesNeedUpdate = true;
}
