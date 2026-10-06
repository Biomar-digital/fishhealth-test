// Pellet_SinDeformacion.jsx
// Quita la deformación de gran angular de algunas capas 3D (p. ej. pellet + anillo)
// SIN tocar la cámara principal del proyecto.
//
// Cómo funciona: precompone las capas seleccionadas y, dentro de la precomposición,
// crea una "Cam tele" que sigue a la cámara principal por expresiones, pero alejada
// m veces y con m veces más zoom. En el punto del pellet el encuadre y el tamaño son
// los mismos; lo que cambia es que la perspectiva queda más plana (sin deformar).
//
// Uso: abrí la composición principal, seleccioná las capas 3D a corregir
// (primero el pellet; si el anillo lo cruza, seleccionalo también) y ejecutá
// Archivo > Secuencias de comandos > Ejecutar archivo de script...

(function () {
    function esc(s) { return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Abrí la composición principal antes de ejecutar el script."); return; }
    var sel = comp.selectedLayers;
    if (sel.length === 0) { alert("Seleccioná el pellet (y el anillo si lo cruza)."); return; }
    var cam = comp.activeCamera;
    if (!cam) { alert("La composición no tiene una cámara activa."); return; }

    var m = parseFloat(prompt("Factor de teleobjetivo\n2 = suave, 3 = recomendado, 5 = casi sin perspectiva", "3"));
    if (isNaN(m) || m < 1) { return; }

    app.beginUndoGroup("Pellet sin deformación");

    var mainName = comp.name, camName = cam.name, refName = sel[0].name;
    var idx = [], minIdx = 99999;
    for (var i = 0; i < sel.length; i++) { idx.push(sel[i].index); if (sel[i].index < minIdx) { minIdx = sel[i].index; } }

    // luces de la composición principal (se copian a la precomp para que el pellet se ilumine igual)
    var lights = [];
    for (var j = 1; j <= comp.numLayers; j++) { if (comp.layer(j) instanceof LightLayer) { lights.push(comp.layer(j)); } }

    var pre = comp.layers.precompose(idx, refName + " (tele)", true);
    var preLayer = comp.layer(minIdx);
    try { preLayer.threeDLayer = false; } catch (e) {}
    try { preLayer.collapseTransformation = false; } catch (e) {}

    for (var k = 0; k < lights.length; k++) { try { lights[k].copyToComp(pre); } catch (e) {} }

    var c2 = pre.layers.addCamera("Cam tele", [pre.width / 2, pre.height / 2]);
    c2.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST;

    var head = 'var m=' + m + ';' +
        'var cam=comp("' + esc(mainName) + '").layer("' + esc(camName) + '");' +
        'var ref=thisComp.layer("' + esc(refName) + '");' +
        'var T=ref.toWorld(ref.transform.anchorPoint);' +
        'var C=cam.toWorld([0,0,0]);';

    c2.transform.position.expression = head + 'T+(C-T)*m;';
    c2.transform.pointOfInterest.expression = head + 'var F=normalize(cam.toWorldVec([0,0,1]));T+(C-T)*m+F*1000;';
    // giro (roll) de la cámara principal, por si lo tiene
    c2.transform.zRotation.expression = head +
        'var F=normalize(cam.toWorldVec([0,0,1]));var Uc=normalize(cam.toWorldVec([0,-1,0]));' +
        'var W=[0,-1,0];var U0=normalize(W-F*dot(F,W));' +
        'radiansToDegrees(Math.atan2(dot(cross(U0,Uc),F),dot(U0,Uc)));';
    c2.cameraOption.zoom.expression = 'comp("' + esc(mainName) + '").layer("' + esc(camName) + '").cameraOption.zoom*' + m + ';';
    try {
        c2.cameraOption.depthOfField.setValue(cam.cameraOption.depthOfField.value);
        c2.cameraOption.focusDistance.expression = 'comp("' + esc(mainName) + '").layer("' + esc(camName) + '").cameraOption.focusDistance*' + m + ';';
        c2.cameraOption.aperture.expression = 'comp("' + esc(mainName) + '").layer("' + esc(camName) + '").cameraOption.aperture;';
    } catch (e) {}

    app.endUndoGroup();
    alert("Listo. Se creó la precomposición \"" + pre.name + "\" con la \"Cam tele\" (factor " + m + ").\n" +
          "Si querés más o menos corrección, cambiá el número 'm' en las expresiones de la Cam tele.");
})();
