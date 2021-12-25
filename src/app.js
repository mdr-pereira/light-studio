import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../libs/utils.js";
import { ortho, perspective, lookAt, flatten, vec3, vec4, inverse, mult, cross, dot } from "../libs/MV.js";
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
let program;

let cameraOptions;
let generalOptions;

/* Matrices */
let mProjection;
let mView;

/* GLSL */
let uColor;

/* Global Vars */
let time = 0; // Global simulation time in days
let speed = 1 / 60; // Speed (how many days added to time on each render pass
let animation = true; // Animation is running

let lights;

let objectOptions;
let materialOptions;

//=========================================================================

class Light {
	constructor (position, Ia, Id, Is, isActive) {
		this.position = position;

		this.Ia = Ia;
		this.Id = Id;
		this.Is = Is;

		this.isActive = isActive;
	} 
}

class DirectionalLight extends Light {
	constructor (position, Ia, Id, Is, origin, isActive) {
		super(position, Ia, Id, Is, isActive);

		this.origin = origin;
	}
}

//=========================================================================

function setup(shaders) {
  // Setup
  let canvas = document.getElementById("gl-canvas");

	//GL focused setup
  gl = setupWebGL(canvas);
  program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["objects.frag"]);

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
		materialDif: vec3(1.0, 0.0, 0.0),
		materialSpe: vec3(1.0, 1.0, 1.0),
		materialShy: 6.0
	}

	lights = [];

	//Setup calls
	resize_canvas();
	setupGUI();

	// WebGl
  uColor = gl.getUniformLocation(program, "uColor");
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// Initialization of library objects
	SPHERE.init(gl);
	CUBE.init(gl);
	CYLINDER.init(gl); 
	PYRAMID.init(gl);
	TORUS.init(gl);
	

	changeZBufferState(false);

  window.requestAnimationFrame(render);

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
		switch(event.key) {
			case '+':
				changePrimitive();
				break;

			case 'b':
				changeZBufferState();
				break;
				
			case ' ':
				if(event.ctrlKey) console.log("halleluya");
				addLight();
				break;
		}
	})
}


//=============================================================================
//Auxiliary functions

function zoom(event) {
	let newFovy = cameraOptions.fovy + event.deltaY * 0.01;

	if(newFovy >= MIN_FOVY && newFovy <= MAX_FOVY) {
		cameraOptions.fovy = newFovy;
		updatePerspective();
	}
}

function changePrimitive(changeTo = (++objectOptions.currentPrimitive) % PRIMITIVES.length) {
	objectOptions.currentPrimitive = changeTo;
}

function changeZBufferState(changeToDisabled = !objectOptions.zBufferEnabled) {
	if(changeToDisabled) {
		gl.disable(gl.DEPTH_TEST);
	} else {
		gl.enable(gl.DEPTH_TEST);
	}

	objectOptions.zBufferEnabled = changeToDisabled;
}

function addLight(isDirectional) {
	const position = vec3(0.0, 2.0, 0.0);
	const Ia = vec3(1.0, 0.0, 0.0);
	const Id = vec3(0.0, 1.0, 0.0);
	const Is = vec3(0.0, 0.0, 1.0);
	const from = vec3(0.0, 1.0, 0.0);

	if(lights.length < MAX_LIGHTS) {
		if(!isDirectional) {
			lights.push(new Light(position, Ia, Id, Is, true));	
		} else {
			lights.push(new DirectionalLight(position, Ia, Id, Is, from, true));
		}
	}
}

//=============================================================================
// WebGL Auxiliary functions

function uploadModelView() {
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
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
	mView = lookAt(cameraOptions.eye, cameraOptions.at, cameraOptions.up);
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
	cameraGUI.add(cameraOptions, "far", 20, 100).onChange(updatePerspective);
	cameraGUI.add(cameraOptions, "near", 0.1, 20).onChange(updatePerspective);

	const eye = cameraGUI.addFolder("eye");
	eye.add(cameraOptions.eye, 0).onChange(updateCamera);
	eye.add(cameraOptions.eye, 1).onChange(updateCamera);
	eye.add(cameraOptions.eye, 2).onChange(updateCamera);

	const at = cameraGUI.addFolder("at");
	at.add(cameraOptions.at, 0).onChange(updateCamera);
	at.add(cameraOptions.at, 1).onChange(updateCamera);
	at.add(cameraOptions.at, 2).onChange(updateCamera);

	const up = cameraGUI.addFolder("up");
	up.add(cameraOptions.up, 0).onChange(updateCamera);
	up.add(cameraOptions.up, 1).onChange(updateCamera);
	up.add(cameraOptions.up, 2).onChange(updateCamera);

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
	gl.uniform3fv(uColor, flatten(vec3(0.85, 0.68, 0.81)))
	uploadModelView();
	PRIMITIVES[objectOptions.currentPrimitive].draw(gl, program, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);

	pushMatrix();
		gl.uniform3fv(uColor, flatten(vec3(1, 0.68, 0.81)));
		multTranslation([0, -0.5, 0]);
		multScale([3, 0.1, 3]);
		uploadModelView();
		CUBE.draw(gl, program, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);
	popMatrix();
}

function render() {
	if (animation) time += speed;
	window.requestAnimationFrame(render);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
	gl.useProgram(program);
	
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
	
	loadMatrix(mView);

	drawScene();

	for(let aux in lights) {
		// Render às luzes
	}

}

const urls = ["shader.vert", "objects.frag", "lights.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
