var camera, scene, renderer, user_options, orbit_ctrl, trfm_ctrl, orig_geom,smooth_geom;
const exportButton = document.getElementById("export");
const canvas = document.getElementById("canvas");
// Subdivision surface
var MIN_SUBD_LEVEL = 0;
var MAX_SUBD_LEVEL = 4;
var subd_level = 2;
var smooth_mesh;
var smooth_verts_undeformed = [];
var model_index = 1;
var model_scale;

// FFD: control points of a lattice
var ffd = new FFD();
var MIN_SPAN_COUNT = 1;
var MAX_SPAN_COUNT = 8;
var span_counts = [2, 2, 2];
var ctrl_pt_geom = new THREE.SphereGeometry(5);
var ctrl_pt_material = new THREE.MeshLambertMaterial({ color: 0x4d4dff });
var ctrl_pt_meshes = [];
var ctrl_pt_mesh_selected = null;
var lattice_lines = [];
var lattice_line_material = new THREE.LineBasicMaterial({ color: 0x4d4dff });

// Evaluated points
var eval_pt_spans = new THREE.Vector3(16, 16, 16);
var eval_pt_counts = new THREE.Vector3(
  eval_pt_spans.x + 1,
  eval_pt_spans.y + 1,
  eval_pt_spans.z + 1
);
var eval_pts_geom = new THREE.Geometry();
var eval_pts_mesh;
var show_eval_pts_checked = false;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

const exporter = new THREE.STLExporter();
var createSomething = function (klass, args) {
  var F = function (klass, args) {
    return klass.apply(this, args);
  };
  F.prototype = klass.prototype;
  return new F(klass, args);
};

// Models
var modelLibrary = [{ type: "BoxGeometry", args: [400, 200, 200, 2, 2, 2] }];
const loaderSTL = new THREE.STLLoader();

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
  camera.position.z = 500;

  scene = new THREE.Scene();

  // Light
  var light = new THREE.PointLight(0xffffff, 1.5);
  light.position.set(1000, 1000, 2000);
  scene.add(light);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0xf0f0f0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.addEventListener("mousemove", onDocumentMouseMove, false);
  renderer.domElement.addEventListener("mousedown", onDocumentMouseDown, false);

  // Orbit controls
  orbit_ctrl = new THREE.OrbitControls(camera, renderer.domElement);
  orbit_ctrl.damping = 0.2;
  orbit_ctrl.addEventListener("change", render);

  // Transform control (a triad)
  trfm_ctrl = new THREE.TransformControls(camera, renderer.domElement);
  trfm_ctrl.addEventListener("change", render);
  scene.add(trfm_ctrl);

  trfm_ctrl.addEventListener("objectChange", function (e) {
    updateLattice();
    deform();
  });

  window.addEventListener("resize", onWindowResize, false);

  createEvalPtsMesh();
  addModel();

  exportButton.addEventListener("click", function () {
    var stl = exporter.parse(smooth_mesh);
    var blob = new Blob([stl], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "smooth_mesh.stl";
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
  var intersects = raycaster.intersectObjects(ctrl_pt_meshes);
  // If the mouse cursor is hovering over a new control point...
  if (intersects.length > 0 && ctrl_pt_mesh_selected != intersects[0].object) {
    // Temporarily change the cursor shape to a fingering cursor.
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
  var intersects = raycaster.intersectObjects(ctrl_pt_meshes);
  // If a new control point is selected...
  if (intersects.length > 0 && ctrl_pt_mesh_selected != intersects[0].object) {
    // Temporarily disable the orbit control. This prevents the user from
    // getting surprised or annoyed by the scene rotation as soon as a new
    // control point is selected.
    orbit_ctrl.enabled = false;
    // If a control point was selected before, detach it from the transform control.
    if (ctrl_pt_mesh_selected) trfm_ctrl.detach(trfm_ctrl.object);
    // Remember the new selection to avoid reselecting the same one.
    ctrl_pt_mesh_selected = intersects[0].object;
    // Attach the newly selected control point to the transform control.
    trfm_ctrl.attach(ctrl_pt_mesh_selected);
  } else {
    // Enable the orbit control so that the user can pan/rotate/zoom.
    orbit_ctrl.enabled = true;
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

function nextSubdivisionLevel(step) {
  var old_level = subd_level;

  // Cap the subdivision level to the bounds of [ MIN_SUBD_LEVEL, MAX_SUBD_LEVEL ].
  subd_level = Math.max(
    MIN_SUBD_LEVEL,
    Math.min(subd_level + step, MAX_SUBD_LEVEL)
  );

  if (subd_level != old_level) addModel();
}

function addModel() {
  loaderSTL.load("./mesh.stl", function (geometry) {
    orig_geom = geometry;
    if (smooth_mesh) {
      scene.remove(group);
      scene.remove(smooth_mesh);
    }

    var subd_modifier = new THREE.SubdivisionModifier(subd_level);
    // var model = modelLibrary[model_index];
    // orig_geom = createSomething(THREE[model.type], model.args);

    // // Scale geometry.
    // if (model.scale) orig_geom.scale(model.scale, model.scale, model.scale);

    // Cloning original geometry for debuging
    smooth_geom = orig_geom.clone();

    // Merge duplicate vertices.
    smooth_geom.mergeVertices();
    smooth_geom.computeFaceNormals();
    smooth_geom.computeVertexNormals();

    subd_modifier.modify(smooth_geom);

    var faceABCD = "abcd";
    var color, f, p, n, vertexIndex;

    for (let i = 0; i < smooth_geom.faces.length; i++) {
      f = smooth_geom.faces[i];
      n = f instanceof THREE.Face3 ? 3 : 4;

      for (var j = 0; j < n; j++) {
        vertexIndex = f[faceABCD.charAt(j)];

        p = smooth_geom.vertices[vertexIndex];

        color = new THREE.Color(0xffffff);
        color.setHSL(p.y / 200 + 0.5, 1.0, 0.5);

        f.vertexColors[j] = color;
      }
    }

    const group = new THREE.Group();
    scene.add(group);

    // Mesh for the original model
    var display_orig_mesh = false;
    if (display_orig_mesh) {
      var orig_material = new THREE.MeshBasicMaterial({
        color: 0xfefefe,
        wireframe: true,
        opacity: 0.5,
      });
      var orig_mesh = new THREE.Mesh(orig_geom, orig_material);
      group.add(orig_mesh);
    }

    // Mesh for the smooth model
    var smooth_materials = [
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading,
        vertexColors: THREE.VertexColors,
        shininess: 0,
      }),
      new THREE.MeshBasicMaterial({
        color: 0x405040,
        wireframe: true,
        opacity: 0.8,
        transparent: true,
      }),
    ];
    smooth_mesh = THREE.SceneUtils.createMultiMaterialObject(
      smooth_geom,
      smooth_materials
    );

    model_scale = 1;
    smooth_mesh.scale.x = model_scale;
    smooth_mesh.scale.y = model_scale;
    smooth_mesh.scale.z = model_scale;

    scene.add(smooth_mesh);

    group.scale.copy(smooth_mesh.scale);

    // Store the vert positions of the smooth model. Empty the storage first.
    smooth_verts_undeformed.length = 0;
    for (let i = 0; i < smooth_geom.vertices.length; i++) {
      var copy_pt = new THREE.Vector3();
      copy_pt.copy(smooth_geom.vertices[i]);
      smooth_verts_undeformed.push(copy_pt);
    }

    rebuildFFD(false);
  });
}

function rebuildFFD(span_count_change_only) {
  removeCtrlPtMeshes();
  removeLatticeLines();

  var bbox;
  if (span_count_change_only) {
    bbox = ffd.getBoundingBox();
  } else {
    bbox = new THREE.Box3();
    // Compute the bounding box that encloses all vertices of the smooth model.
    bbox.setFromPoints(smooth_geom.vertices);
    // Scale the bounding box if necessary.
    if (model_scale != 1)
      bbox.set(
        bbox.min.multiplyScalar(model_scale),
        bbox.max.multiplyScalar(model_scale)
      );
  }

  // Do not pass span_counts to ffd.
  var span_counts_copy = [span_counts[0], span_counts[1], span_counts[2]];

  // Rebuild the lattice with new control points.
  ffd.rebuildLattice(bbox, span_counts_copy);

  addCtrlPtMeshes();
  addLatticeLines();

  deform();
}

function removeCtrlPtMeshes() {
  for (var i = 0; i < ctrl_pt_meshes.length; i++)
    scene.remove(ctrl_pt_meshes[i]);
  ctrl_pt_meshes.length = 0;
}

function removeLatticeLines() {
  for (var i = 0; i < lattice_lines.length; i++) scene.remove(lattice_lines[i]);
  lattice_lines.length = 0;
}

function addCtrlPtMeshes() {
  for (var i = 0; i < ffd.getTotalCtrlPtCount(); i++) {
    var ctrl_pt_mesh = new THREE.Mesh(ctrl_pt_geom, ctrl_pt_material);
    ctrl_pt_mesh.position.copy(ffd.getPosition(i));
    ctrl_pt_mesh.material.ambient = ctrl_pt_mesh.material.color;

    ctrl_pt_meshes.push(ctrl_pt_mesh);
    scene.add(ctrl_pt_mesh);
  }
}

function addLatticeLines() {
  // Lines in S direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0) - 1; i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2); k++) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i + 1, j, k)].position
        );
        var line = new THREE.Line(geometry, lattice_line_material);

        lattice_lines.push(line);
        scene.add(line);
      }
    }
  }
  // Lines in T direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1) - 1; j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2); k++) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i, j + 1, k)].position
        );
        var line = new THREE.Line(geometry, lattice_line_material);

        lattice_lines.push(line);
        scene.add(line);
      }
    }
  }
  // Lines in U direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2) - 1; k++) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(ctrl_pt_meshes[ffd.getIndex(i, j, k)].position);
        geometry.vertices.push(
          ctrl_pt_meshes[ffd.getIndex(i, j, k + 1)].position
        );
        var line = new THREE.Line(geometry, lattice_line_material);

        lattice_lines.push(line);
        scene.add(line);
      }
    }
  }
}

function createEvalPtsMesh() {
  var total_eval_pts_count =
    eval_pt_counts.x * eval_pt_counts.y * eval_pt_counts.z;
  for (var i = 0; i < total_eval_pts_count; i++)
    eval_pts_geom.vertices.push(new THREE.Vector3());
  // Red dot
  eval_pts_mesh = new THREE.Points(
    eval_pts_geom.clone(),
    new THREE.PointsMaterial({ color: 0xff0000, size: 2 })
  );
  scene.add(eval_pts_mesh);
}

function updateLattice() {
  // Update the positions of all control point in the FFD object.
  for (var i = 0; i < ffd.getTotalCtrlPtCount(); i++)
    ffd.setPosition(i, ctrl_pt_meshes[i].position);

  // Update the positions of all lines of the lattice.
  var line_index = 0;
  // Lines in S direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0) - 1; i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2); k++) {
        var line = lattice_lines[line_index++];
        line.geometry.vertices[0] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k)].position;
        line.geometry.vertices[1] =
          ctrl_pt_meshes[ffd.getIndex(i + 1, j, k)].position;
        line.geometry.verticesNeedUpdate = true;
      }
    }
  }
  // Lines in T direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1) - 1; j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2); k++) {
        var line = lattice_lines[line_index++];
        line.geometry.vertices[0] =
          ctrl_pt_meshes[ffd.getIndex(i, j, k)].position;
        line.geometry.vertices[1] =
          ctrl_pt_meshes[ffd.getIndex(i, j + 1, k)].position;
        line.geometry.verticesNeedUpdate = true;
      }
    }
  }
  // Lines in U direction.
  for (var i = 0; i < ffd.getCtrlPtCount(0); i++) {
    for (var j = 0; j < ffd.getCtrlPtCount(1); j++) {
      for (var k = 0; k < ffd.getCtrlPtCount(2) - 1; k++) {
        var line = lattice_lines[line_index++];
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
  // Update the model vertices.
  for (let i = 0; i < smooth_geom.vertices.length; i++) {
    var eval_pt = ffd.evalWorld(smooth_verts_undeformed[i]);
    if (eval_pt.equals(smooth_geom.vertices[i])) continue;
    smooth_geom.vertices[i].copy(eval_pt);
  }
  smooth_geom.verticesNeedUpdate = true;
}
