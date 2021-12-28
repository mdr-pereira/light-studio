import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../libs/utils.js";
import { ortho, perspective, lookAt, flatten, vec3, vec4, inverse, mult, cross, dot, normalMatrix } from "../libs/MV.js";
import { modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ, loadIdentity } from "../libs/stack.js";

import * as SPHERE from "../libs/sphere.js";
import * as CUBE from "../libs/cube.js";
import * as CYLINDER from "../libs/cylinder.js";
import * as PYRAMID from "../libs/pyramid.js";
import * as TORUS from "../libs/torus.js";

import * as dat from "../libs/dat.gui.module.js";

const PRIMITIVES = [SPHERE, CUBE, CYLINDER, PYRAMID, TORUS];

const MAX_FOVY = 100;
const MIN_FOVY = 1;

const MAX_LIGHTS = 8;

/** @type WebGLRenderingContext */
let gl;

/* Shader Programs */
let objectProgram;
let lightProgram;

let cameraOptions;
let generalOptions;

/* Matrices */
let mProjection;
let mView;

/* GLSL */
let uObjectColor;
let uLightColor;

let uMaterialInfo;
let uLights;
let uNLights;

/* Global Vars */
let time = 0; // Global simulation time in days
let speed = 1 / 60; // Speed (how many days added to time on each render pass
let animation = true; // Animation is running

let lights;

let objectOptions;
let materialOptions;

//=========================================================================

class Light {
	constructor (position, Ia, Id, Is, isDirectional, isActive) {
		this.position = position;

		this.Ia = Ia;
		this.Id = Id;
		this.Is = Is;

		this.isDirectional = isDirectional
		this.isActive = isActive;
	} 
}

class DirectionalLight extends Light {
	constructor (position, Ia, Id, Is, origin, isActive) {
		super(position, Ia, Id, Is, false, isActive);

		this.origin = origin;
	}
}

//=========================================================================

function setup(shaders) {
  // Setup
  let canvas = document.getElementById("gl-canvas");

	// GL focused setup
  gl = setupWebGL(canvas);
  objectProgram = buildProgramFromSources(gl, shaders["objects.vert"], shaders["objects.frag"]);
	lightProgram = buildProgramFromSources(gl, shaders["lights.vert"], shaders["lights.frag"]);

  cameraOptions = {
    eye: vec3(0, 0, -5),
    at: vec3(0, 0, 0),
    up: vec3(0, 1, 0),
    fovy: 45,
    aspect: 1,
    near: 0.1,
    far: 20,
  };

  generalOptions = {
    wireframe: false,
    normals: true,
  };

	objectOptions = {
		currentPrimitive: 0,
		zBufferEnabled: true
	}

	materialOptions = {
		materialAmb: vec3(1.0, 0.0, 0.0),
		materialDif: vec3(0.0, 1.0, 0.0),
		materialSpe: vec3(1.0, 0.0, 1.0),
		materialShy: 6.0
	}

	lights = [];

	// Setup calls
	resize_canvas();
	setupGUI();

	//==========
	// WebGl
	uObjectColor = gl.getUniformLocation(objectProgram, "uColor");
	uLightColor = gl.getUniformLocation(lightProgram, "uColor");
	uNLights = gl.getUniformLocation(objectProgram, "uNLights");

	uMaterialInfo = {
		materialAmb: gl.getUniformLocation(objectProgram, "uMaterial.Ka"),
		materialDif: gl.getUniformLocation(objectProgram, "uMaterial.Kd"),
		materialSpe: gl.getUniformLocation(objectProgram, "uMaterial.Ks"),
		materialShy: gl.getUniformLocation(objectProgram, "uMaterial.shininess")
	}

	uLights = [];
	for (let i = 0; i < MAX_LIGHTS; i++) {
		uLights.push({
			position: gl.getUniformLocation(objectProgram, "uLight[" + i + "].position"),
			Ia: gl.getUniformLocation(objectProgram, "uLight[" + i + "].Ia"),
			Id: gl.getUniformLocation(objectProgram, "uLight[" + i + "].Id"),
			Is: gl.getUniformLocation(objectProgram, "uLight[" + i + "].Is"),
			isDirectional: gl.getUniformLocation(objectProgram, "uLight[" + i + "].isDirectional"),
			isActive: gl.getUniformLocation(objectProgram, "uLight[" + i + "].isActive")
		});
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// Initialization of library objects
	SPHERE.init(gl);
	CUBE.init(gl);
	CYLINDER.init(gl); 
	PYRAMID.init(gl);
	TORUS.init(gl);
	
	changeZBufferState(false);

	window.requestAnimationFrame(render);

	//Temporary lights
	const RED = vec3(1.0, 1.0, 1.0);
	lights.push(new Light(vec3(0.0, 2.0, 0.0), RED, RED, RED, true, true));

  function resize_canvas(event) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    cameraOptions.aspect = canvas.width / canvas.height;

		updatePerspective();

		loadMatrix(mProjection);

		updateCamera();
  }

	//Event listeners

	window.addEventListener("resize", resize_canvas)
	window.addEventListener("wheel", zoom);

	window.addEventListener('keydown', (event) => {
		switch (event.key) {
			case '+':
				changePrimitive();
				break;

			case 'b':
				changeZBufferState();
				break;
				
			case ' ':
				if (event.ctrlKey) {
					addLight();
				}
				break;
		}
	})
}


//=============================================================================
//Auxiliary functions

function zoom(event) {
	let newFovy = cameraOptions.fovy + event.deltaY * 0.01;

	if (newFovy >= MIN_FOVY && newFovy <= MAX_FOVY) {
		cameraOptions.fovy = newFovy;
	}

	updatePerspective();
}

function changePrimitive(changeTo = (++objectOptions.currentPrimitive) % PRIMITIVES.length) {
	objectOptions.currentPrimitive = changeTo;
}

function changeZBufferState(changeToDisabled = !objectOptions.zBufferEnabled) {
	if (changeToDisabled) {
		gl.disable(gl.DEPTH_TEST);
	} else {
		gl.enable(gl.DEPTH_TEST);
	}

	objectOptions.zBufferEnabled = changeToDisabled;
}

function addLight(isDirectional) {
	const position = vec3(0.0, 3.0, 0.0);
	const Ia = vec3(1.0, 0.0, 0.0);
	const Id = vec3(0.0, 1.0, 0.0);
	const Is = vec3(0.0, 0.0, 1.0);

	if (lights.length < MAX_LIGHTS) {
		if (!isDirectional) {
			lights.push(new Light(position, Ia, Id, Is, true));	
		} else {
			const from = vec3(0.0, 1.0, 0.0);

			lights.push(new DirectionalLight(position, Ia, Id, Is, from, true));
		}
	}
}

//=============================================================================
// WebGL Auxiliary functions

function uploadModelView(program = objectProgram) {
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
}

function uploadProjection(program = objectProgram) {
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
}

/**
 * Updates the projection matrix with current camera data.
 */
function updatePerspective() {
	mProjection = perspective(cameraOptions.fovy, cameraOptions.aspect, cameraOptions.near, cameraOptions.far);
}

/**
 * Updates the view matrix with current camera data.
 */
function updateCamera() {
	mView = lookAt(cameraOptions.eye, cameraOptions.at, cameraOptions.up); // TODO: Enviar isto para o Vert.
}

/**
 * Setup related to the graphical user interface.
 */
function setupGUI() {
	const gui = new dat.GUI();

	const optionsGUI = gui.addFolder("options");
	optionsGUI.add(generalOptions, "wireframe").listen();

	optionsGUI.add(generalOptions, "normals").listen();

	const cameraGUI = gui.addFolder("camera");
	cameraGUI.add(cameraOptions, "fovy", MIN_FOVY, MAX_FOVY).step(1).onChange(updatePerspective).listen();
	cameraGUI.add(cameraOptions, "far", 0, 20).onChange(updatePerspective);
	cameraGUI.add(cameraOptions, "near", 0.1, 20).onChange(updatePerspective);

	const eye = cameraGUI.addFolder("eye");
	eye.add(cameraOptions.eye, 0).onChange(updateCamera).listen();
	eye.add(cameraOptions.eye, 1).onChange(updateCamera).listen();
	eye.add(cameraOptions.eye, 2).onChange(updateCamera).listen();

	const at = cameraGUI.addFolder("at");
	at.add(cameraOptions.at, 0).onChange(updateCamera).listen();
	at.add(cameraOptions.at, 1).onChange(updateCamera).listen();
	at.add(cameraOptions.at, 2).onChange(updateCamera).listen();

	const up = cameraGUI.addFolder("up");
	up.add(cameraOptions.up, 0).onChange(updateCamera).listen();
	up.add(cameraOptions.up, 1).onChange(updateCamera).listen();
	up.add(cameraOptions.up, 2).onChange(updateCamera).listen();

	const objectGui = new dat.GUI();
	objectGui.add(objectOptions, "currentPrimitive", {'Sphere': 0, 'Cube': 1, 'Cylinder': 2,'Pyramid': 3, 'Torus': 4}).listen();

	const material = objectGui.addFolder("material");
	material.addColor(materialOptions, 'materialAmb').name('Ka');
	material.addColor(materialOptions, 'materialDif').name('Kd');
	material.addColor(materialOptions, 'materialSpe').name('Ks');
	material.add(materialOptions, 'materialShy').name('Shinyness');
}

//=============================================================================

function drawScene() {
	const umNormals = gl.getUniformLocation(objectProgram, "mNormals");
	const umViewNormals = gl.getUniformLocation(objectProgram, "mViewNormals");
	const umView = gl.getUniformLocation(objectProgram, "mView");

	gl.uniform1i(uNLights, gl.GL_FALSE, lights.length);
	gl.uniformMatrix4fv(umNormals, gl.GL_FALSE, flatten(normalMatrix(modelView())));
	gl.uniformMatrix4fv(umViewNormals, gl.GL_FALSE, flatten(normalMatrix(mView)));
	gl.uniformMatrix4fv(umView, gl.GL_FALSE, flatten(mView));

	gl.uniform3fv(uObjectColor, flatten(vec3(0.85, 0.68, 0.81)));

	//TODO: switch out for cleaner loop, this is barely functional
	gl.uniform3fv(uMaterialInfo.materialAmb, materialOptions.materialAmb);
	gl.uniform3fv(uMaterialInfo.materialDif, materialOptions.materialDif);
	gl.uniform3fv(uMaterialInfo.materialSpe, materialOptions.materialSpe);
	gl.uniform1f(uMaterialInfo.materialShy, materialOptions.materialShy);

	for (let i in lights) {
		gl.uniform3fv(uLights[i].position, lights[i].position);
		gl.uniform3fv(uLights[i].Ia, lights[i].Ia);
		gl.uniform3fv(uLights[i].Id, lights[i].Id);
		gl.uniform3fv(uLights[i].Is, lights[i].Is);
		gl.uniform1i(uLights[i].isDirectional, lights[i].isDirectional);
		gl.uniform1i(uLights[i].isActive, lights[i].isActive);
	}

	uploadModelView();
	PRIMITIVES[objectOptions.currentPrimitive].draw(gl, objectProgram, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);

	pushMatrix();
		gl.uniform3fv(uObjectColor, flatten(vec3(1, 0.68, 0)));
		multTranslation([0, -0.6, 0]);
		multScale([3, 0.1, 3]);
		uploadModelView();
		CUBE.draw(gl, objectProgram, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);
	popMatrix();
}

function drawLights() {
	gl.useProgram(lightProgram);
	uploadProjection(lightProgram);

	for (let i in lights) {
		pushMatrix();

		if (lights[i].isActive) { 
			gl.uniform3fv(uLightColor, flatten(lights[i].Ia));

			multTranslation(lights[i].position);
			multScale([0.1, 0.1, 0.1]);
			uploadModelView(lightProgram);

			SPHERE.draw(gl, lightProgram, gl.TRIANGLES);
		}
		popMatrix();
	}
}

function render() {
	if (animation) time += speed;
	window.requestAnimationFrame(render);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
	gl.useProgram(objectProgram);
	
	uploadProjection();
	
	loadMatrix(mView);

	drawScene();

	gl.useProgram(lightProgram);

	drawLights();
}

const urls = ["objects.vert", "objects.frag", "lights.frag", "lights.vert"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
