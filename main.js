// variables
let camera,
  scene,
  renderer,
  orbit_ctrl,
  trfm_ctrl,
  orig_geom,
  smooth_geom,
  smooth_materials_teeth,
  smooth_materials_jaw,
  smooth_mesh,
  exporter_grp,
  group,
  selected_model,
  last_model;
let latesttap;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let subd_level = 0;
let smooth_verts_undeformed = [];
let ffd = new FFD();
let span_counts = [2, 2, 2];
let ctrl_pt_geom = new THREE.SphereGeometry(4, 32, 32);
let ctrl_pt_material = new THREE.MeshLambertMaterial({ color: 0x00ffff });
let ctrl_pt_meshes = [];
let ctrl_pt_mesh_selected = null;
let lattice_lines = [];
let edited_models = [];
let lattice_line_material = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
});
let models_loaded = false;
const objects = [];
const loaderObj = new THREE.OBJLoader();
const loaderSTL = new THREE.STLLoader();
let exporter = new THREE.STLBinaryExporter();
// document selection
const exportButton = document.getElementById("exportSTL");
const testButton = document.getElementById("TEST_M");
const span_dropdown = document.getElementById("span-dropdown");
const opacity_slider = document.getElementById("opacity");
const wireframe_check = document.getElementById("wireframe-check");
const webgl = document.getElementById("webgl");
// materials
smooth_materials_teeth = [
  new THREE.MeshPhongMaterial({
    color: 0xe9e7e8,
    specular: 0xc4c2c2,
    shininess:0.5,
    side: THREE.DoubleSide,
  }),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    opacity: 0.1,
    transparent: true,
    side: THREE.DoubleSide,
  }),
];
smooth_materials_jaw = [
  new THREE.MeshPhongMaterial({
    color: 0xe2bfb9,
    specular: 0x888688,
    transparent: true,
    shininess: 1,
    side: THREE.DoubleSide,
  }),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    side: THREE.DoubleSide,
    opacity: 0.1,
    transparent: true,
  }),
];

// function calls
init();
animate();
// main function
function init() {
  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );
  camera.position.set(0, -100, 1800);
  camera.lookAt(0, -100, 0);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x23262a);
  group = new THREE.Group();
  group.rotation.x = Math.PI / 3;
  scene.add(group);
  // lights

  let light = new THREE.PointLight(0x6c6b6b, 1);
  light.position.set(50, 500, 2000);
  scene.add(light);
  let light2 = new THREE.PointLight(0x969696, 0.5);
  light2.position.set(-50, -250, -1000);
  scene.add(light2);
  let light3 = new THREE.PointLight(0x969696, 0.5);
  light3.position.set(50, -250, 1000);
  scene.add(light3);

  let ambientLight = new THREE.AmbientLight(0x6c6b6b, 1);
  scene.add(ambientLight);
  // renderer
  renderer = new THREE.WebGLRenderer({
    canvas: webgl,
    antialias: true,
  });
  renderer.setClearColor(0x313339);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // controls
  orbit_ctrl = new THREE.OrbitControls(camera, renderer.domElement);
  orbit_ctrl.enableDamping = true;
  orbit_ctrl.dampingFactor = 0.5;
  orbit_ctrl.minDistance = 200;
  orbit_ctrl.maxDistance = 3400;
  orbit_ctrl.addEventListener("change", render);
  trfm_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  trfm_ctrl.size = 0.4;
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
  webgl.addEventListener("touchend", touchEndHandle, false);
  webgl.addEventListener("touchstart", touchStartHandle, false);
  webgl.addEventListener("dblclick", handleDblclick, false);
  // addModels();
}

// event listeners
span_dropdown.addEventListener("change", function () {
  trfm_ctrl.detach(trfm_ctrl.object);
  let span_const = parseInt(span_dropdown.value);
  span_counts = [span_const, span_const, span_const];
  if (selected_model) {
    rebuildFFD(selected_model);
  }
});
opacity_slider.addEventListener("change", function () {
  let jaw_mesh = group.children.find(function (child) {
    return (
      child.name.includes("jaw") || child.name.toLowerCase().includes("origin")
    );
  });
  jaw_mesh.children[0].material.opacity = opacity_slider.value;
});
wireframe_check.addEventListener("change", function () {
  last_model = group.children[0];
  if (wireframe_check.checked) {
    last_model.children[1].material.wireframe = true;
  } else {
    last_model.children[1].material.wireframe = false;
  }
});
exportButton.addEventListener("click", function () {
  removeCtrlPtMeshes();
  removeLatticeLines();
  trfm_ctrl.detach(trfm_ctrl.object);
  selected_model = null;
  if (edited_models.length === 0) {
    alert("No models have been edited yet");
  } else {
    for (let i = 0; i < group.children.length; i++) {
      if (edited_models.includes(group.children[i].name)) {
        let stl = exporter.parse(group.children[i]);
        let blob = new Blob([stl]);
        blobToBase64(blob, function (base64Str, filename) {
          base64Models[group.children[i].name] = base64Str;
          return base64Str;
        });
      }
    }
  }
  // webkit.messageHandlers.callback.postMessage(a.href);
});

var blobToBase64 = function (blob, cb) {
  var reader = new FileReader();
  reader.onload = function () {
    var dataUrl = reader.result;
    var base64 = dataUrl.split(",")[1];
    console.log(base64);
    cb(base64, blob.type);
  };
  reader.readAsDataURL(blob);
};
testButton.addEventListener("click", function () {
  if (!models_loaded) {
    addModels();
    models_loaded = true;
  }
});
// event handlers
function touchEndHandle(e) {
  e.preventDefault();
  mouse.x = (e.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
  console.log(mouse);
  raycaster.setFromCamera(mouse, camera);
  if (selected_model) {
    let clicked_ctrl_point = raycaster.intersectObjects(ctrl_pt_meshes, false);
    if (
      clicked_ctrl_point.length > 0 &&
      ctrl_pt_mesh_selected != clicked_ctrl_point[0].object
    ) {
      orbit_ctrl.enabled = false;
      if (ctrl_pt_mesh_selected) {
        trfm_ctrl.detach(trfm_ctrl.object);
      }
      ctrl_pt_mesh_selected = clicked_ctrl_point[0].object;
      trfm_ctrl.attach(ctrl_pt_mesh_selected);
    } else {
      orbit_ctrl.enabled = true;
    }
  } else {
    trfm_ctrl.detach(trfm_ctrl.object);
    let intersects = raycaster.intersectObjects(objects, true);
    if (intersects.length > 0 && intersects[0].object != selected_model) {
      selected_model = intersects[0].object.parent;
      if (!edited_models.includes(selected_model.name)) {
        edited_models.push(selected_model.name);
      }
      console.log(selected_model);
      build(selected_model);
    }
  }
  doubletap();
}
function touchStartHandle() {
  if (selected_model || ctrl_pt_mesh_selected) {
    orbit_ctrl.enabled = false;
  }
}
// handlers
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
  if (selected_model) {
    let clicked_ctrl_point = raycaster.intersectObjects(ctrl_pt_meshes, false);
    if (
      clicked_ctrl_point.length > 0 &&
      ctrl_pt_mesh_selected != clicked_ctrl_point[0].object
    ) {
      orbit_ctrl.enabled = false;
      if (ctrl_pt_mesh_selected) trfm_ctrl.detach(trfm_ctrl.object);
      ctrl_pt_mesh_selected = clicked_ctrl_point[0].object;
      trfm_ctrl.attach(ctrl_pt_mesh_selected);
    } else {
      orbit_ctrl.enabled = true;
    }
  } else if (trfm_ctrl.object !== group) {
    trfm_ctrl.detach(trfm_ctrl.object);
    let intersects = raycaster.intersectObjects(objects, true);
    if (
      intersects.length > 0 &&
      intersects[0].object != selected_model &&
      intersects[0].object.parent.name !== "jaw.obj" &&
      intersects[0].object.parent.name.toLowerCase() !== "origin.stl"
    ) {
      selected_model = intersects[0].object.parent;
      if (!edited_models.includes(selected_model.name)) {
        edited_models.push(selected_model.name);
      }
      build(selected_model);
    }
  }
}
function handleDblclick() {
  unSelect();
}
function keyDown(event) {
  // esc
  if (event.keyCode == 27) {
    unSelect();
  }
  // x
  if (event.keyCode == 88) {
    event.preventDefault();
    trfm_ctrl.detach(trfm_ctrl.object);
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(objects, true);
    if (
      intersects.length > 0 &&
      intersects[0].object != selected_model &&
      intersects[0].object.parent.name !== "jaw.obj" &&
      intersects[0].object.parent.name.toLowerCase() !== "origin.stl"
    ) {
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
  for (let i = 0; i < filenames.length; i++) {
    let properPath = folderpath + "/" + filenames[i];
    let subd_modifier = new THREE.SubdivisionModifier(0);
    let orig_geom = new THREE.Geometry();
    if (filenames[i].toLowerCase().includes(".obj")) {
      loaderObj.load(
        properPath,
        function (object) {
          orig_geom = object.children[0].geometry;
          orig_geom = new THREE.Geometry().fromBufferGeometry(orig_geom);
          smooth_geom = orig_geom.clone();
          smooth_geom.mergeVertices();
          smooth_geom.computeFaceNormals();
          smooth_geom.computeVertexNormals();
          subd_modifier.modify(smooth_geom);
          if (
            filenames[i].includes("jaw") ||
            filenames[i].toLowerCase().includes("origin")
          ) {
            smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
              smooth_geom,
              [smooth_materials_jaw[0], smooth_materials_teeth[1]]
            );
          } else
            smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
              smooth_geom,
              smooth_materials_teeth
            );
          smooth_mesh.position.set(0, 0, 0);
          smooth_mesh.name = filenames[i];
          objects.push(smooth_mesh);
          group.add(smooth_mesh);
        },
        function (xhr) {
          console.log(
            filenames[i] +
              " " +
              Math.round((xhr.loaded / xhr.total) * 100) +
              "% loaded"
          );
        },
        function (error) {
          console.log("Error loading model: " + error);
        }
      );
    }
    if (filenames[i].toLowerCase().includes(".stl")) {
      loaderSTL.load(
        properPath,
        function (geometry) {
          orig_geom = geometry;
          orig_geom = new THREE.Geometry().fromBufferGeometry(orig_geom);
          smooth_geom = orig_geom.clone();
          smooth_geom.mergeVertices();
          smooth_geom.computeFaceNormals();
          smooth_geom.computeVertexNormals();
          subd_modifier.modify(smooth_geom);
          if (
            filenames[i].includes("jaw") ||
            filenames[i].toLowerCase().includes("origin")
          ) {
            smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
              smooth_geom,
              [smooth_materials_jaw[0], smooth_materials_teeth[1]]
            );
          } else
            smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
              smooth_geom,
              smooth_materials_teeth
            );
          smooth_mesh.position.set(0, 0, 0);
          smooth_mesh.name = filenames[i];
          objects.push(smooth_mesh);
          group.add(smooth_mesh);
        },
        function (xhr) {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        },
        function (error) {
          console.log("Error loading model: " + error);
        }
      );
    }
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
        // group.add(line);
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
        // group.add(line);
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
        // group.add(line);
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
function unSelect() {
  if (ctrl_pt_mesh_selected) {
    ctrl_pt_mesh_selected = null;
    trfm_ctrl.detach(trfm_ctrl.object);
  } else if (selected_model) {
    removeCtrlPtMeshes();
    removeLatticeLines();
    selected_model = null;
    trfm_ctrl.detach(trfm_ctrl.object);
  }
}
function doubletap() {
  var now = new Date().getTime();
  var timesince = now - latesttap;
  if (timesince < 600 && timesince > 0) {
    unSelect();
  } else {
    latesttap = new Date().getTime();
  }
  latesttap = new Date().getTime();
}
