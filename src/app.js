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

const DEFAULT_COLORS = [vec3(179, 140, 180), vec3(183, 145, 140), vec3(197, 164, 138), vec3(221, 198, 123), vec3(248, 242, 114), vec3(247, 177, 171)];

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
let uMNormals;
let uMViewNormals;
let uMView;


/* Global Vars */
let time = 0; // Global simulation time in days
let speed = 1 / 60; // Speed (how many days added to time on each render pass
let animation = true; // Animation is running

let lights;

let objectOptions;
let materialOptions;

/* Some GUI objects need to be global */

const gui = new dat.GUI();
const objectGui = new dat.GUI();
const lightsGUI = new dat.GUI();

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

//=========================================================================

function setup(shaders) {
  // Setup
  let canvas = document.getElementById("gl-canvas");

	// GL focused setup
  gl = setupWebGL(canvas);
  objectProgram = buildProgramFromSources(gl, shaders["objects.vert"], shaders["objects.frag"]);
	lightProgram = buildProgramFromSources(gl, shaders["lights.vert"], shaders["lights.frag"]);

  cameraOptions = {
    eye: vec3(0, 3.5, 5),
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
		lights: true,
  };

	objectOptions = {
		currentPrimitive: 4,
		zBufferEnabled: true,
		backFaceCullingEnabled: true,
	};

	materialOptions = {
		materialAmb: vec3(0.0, 0.0, 0.0),
		materialDif: vec3(95, 95, 95),
		materialSpe: vec3(95, 95, 95),
		materialShy: 40.0
	};

	lights = [];

	// Setup calls
	resize_canvas();
	setupGUI();

	//==========
	// WebGl
	uLightColor = gl.getUniformLocation(lightProgram, "uColor");
	uNLights = gl.getUniformLocation(objectProgram, "uNLights");
	uMNormals = gl.getUniformLocation(objectProgram, "mNormals");
	uMViewNormals = gl.getUniformLocation(objectProgram, "mViewNormals");
	uMView = gl.getUniformLocation(objectProgram, "mView");


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

	//==========
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// Initialization of library objects
	SPHERE.init(gl);
	CUBE.init(gl);
	CYLINDER.init(gl); 
	PYRAMID.init(gl);
	TORUS.init(gl);
	
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	//==========

	window.requestAnimationFrame(render);

	/**
	 * Deals with the change in perspective caused by a canvas resize event, in the case that the user changes the overall window size.
	 * 
	 * @param {*} event 
	 */
  function resize_canvas(event) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    cameraOptions.aspect = canvas.width / canvas.height;

		updatePerspective();

		loadMatrix(mProjection);

		updateCamera();
  }

	
	// Default lights
	const DEFAULT_COLOR = vec3(120, 120 , );
	addLight(vec3(0.0, 0.0, 1.0), vec3(255, 0, 0), vec3(84, 21, 255), vec3(255, 0, 0), false, true);
	addLight(vec3(0, 0, 0), vec3(255, 0, 0), vec3(0, 255, 193), vec3(255, 245, 88), false, true);
	addLight(vec3(0, 3, 0), vec3(0, 0, 0), vec3(255, 0, 189), vec3(0, 0, 0), true, true);

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

			case 'c':
				changeBackFaceCullingState();
				break;
				
			case ' ':
				if (event.ctrlKey) {
					addLight(vec3(0.0, 1.1, 2.0), RED, vec3(0, 9, 1.0), vec3(1.0, 1.0, 1.0), true);
				} else {
					addLight(vec3(0.0, 1.1, 2.0), RED, vec3(0, 9, 1.0), vec3(1.0, 1.0, 1.0), false);
				}
				break;
		}
	})
}


//=============================================================================
//Auxiliary functions

function getRandomColor() {
	return DEFAULT_COLORS[Math.random() * (DEFAULT_COLORS.length)];
}

/**
 * Deals with zoom-in events, in the case of this program, triggered by the scroll wheel.
 * 
 * Updates the perspective as a result.
 * 
 * @param {*} event 
 */
function zoom(event) {
	let newFovy = cameraOptions.fovy + event.deltaY * 0.01;

	if (newFovy >= MIN_FOVY && newFovy <= MAX_FOVY) {
		cameraOptions.fovy = newFovy;
	}

	updatePerspective();
}

/**
 * Changes the currently displayed primitive to the one indicated by the provided index.
 *  
 * @param {int} changeTo - defaults to the next available index, round-robin when reaching the end.
 */
function changePrimitive(changeTo = (++objectOptions.currentPrimitive) % PRIMITIVES.length) {
	objectOptions.currentPrimitive = changeTo;
}

/**
 * Changes the Z buffer depth test's state to that indicated by the parameter.
 * 
 * If positive, the z-buffer depth test is enabled.
 * 
 * @param {bool} changeToEnabled 
 */
function changeZBufferState(changeToEnabled = !objectOptions.zBufferEnabled) {
	if (!changeToEnabled) {
		gl.disable(gl.DEPTH_TEST);
	} else {
		gl.enable(gl.DEPTH_TEST);
	}

	objectOptions.zBufferEnabled = changeToEnabled;
	console.log(objectOptions);
}

/**
 * Changes the back face culling state to that indicated by the parameter.
 * 
 * If positive, back face culling is enabled.
 * 
 * @param {bool} changeToEnabled 
 */
function changeBackFaceCullingState(changeToEnabled = !objectOptions.backFaceCullingEnabled) {
	if (!changeToEnabled) {
		gl.disable(gl.CULL_FACE);
	} else {
		gl.enable(gl.CULL_FACE);
	}

	objectOptions.backFaceCullingEnabled = changeToEnabled;
	console.log(objectOptions);
}

/**
 * Adds a new light, filling in the constructor with parameters.
 * 
 * The light is always initialized as active.
 * 
 * @param {vec3} position - position the new light will assume
 * @param {vec3} Ia - ambient element of the light.
 * @param {vec3} Id - diffuse element of the light.
 * @param {vec3} Is - specular element of the light.
 * @param {bool} isDirectional - 
 */
function addLight(position, Ia, Id, Is, isDirectional) {
	if (lights.length < MAX_LIGHTS) {
		lights.push(new Light(position, Ia, Id, Is, isDirectional, true));	

		addLightGUI();
	}
}

/**
 * For each light added, creates a corresponding GUI.
 */
function addLightGUI() {
	const light = lightsGUI.addFolder("light " + lights.length);
	light.add(lights[lights.length - 1].position, "0").name("X").step(0.1);
	light.add(lights[lights.length - 1].position, "1").name("Y").step(0.1);
	light.add(lights[lights.length - 1].position, "2").name("Z").step(0.1);

	light.addColor(lights[lights.length - 1], "Ia").name("Ia");
	light.addColor(lights[lights.length - 1], "Id").name("Id");
	light.addColor(lights[lights.length - 1], "Is").name("Is"); 

	light.add(lights[lights.length - 1], "isDirectional").name("isDirectional");
	light.add(lights[lights.length - 1], "isActive").name("isActive");
}

//=============================================================================
// WebGL Auxiliary functions

/**
 * Sends the current view model as a GLSL uniform.
 * 
 * @param {GLprogram} program 
 */
function uploadModelView(program = objectProgram) {
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
}

/**
 * Sends the current projection model as a GLSL uniform.
 * 
 * @param {GLprogram} program 
 */
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
 * 
 * Automated initialization is possible, but with much less control over the specifics of each individual GUI.
 */
function setupGUI() {
	const optionsGUI = gui.addFolder("options");
	optionsGUI.add(generalOptions, "wireframe").listen();
	optionsGUI.add(generalOptions, "normals").listen();
	optionsGUI.add(generalOptions, "lights").listen();

	const cameraGUI = gui.addFolder("camera");
	cameraGUI.add(cameraOptions, "fovy", MIN_FOVY, MAX_FOVY).step(1).onChange(updatePerspective).listen();
	cameraGUI.add(cameraOptions, "far", 0, 20).onChange(updatePerspective);
	cameraGUI.add(cameraOptions, "near", 0.1, 20).onChange(updatePerspective);

	const eye = cameraGUI.addFolder("eye");
	eye.add(cameraOptions.eye, 0).step(0.1).onChange(updateCamera).listen();
	eye.add(cameraOptions.eye, 1).step(0.1).onChange(updateCamera).listen();
	eye.add(cameraOptions.eye, 2).step(0.1).onChange(updateCamera).listen();

	const at = cameraGUI.addFolder("at");
	at.add(cameraOptions.at, 0).step(0.1).onChange(updateCamera).listen();
	at.add(cameraOptions.at, 1).step(0.1).onChange(updateCamera).listen();
	at.add(cameraOptions.at, 2).step(0.1).onChange(updateCamera).listen();

	const up = cameraGUI.addFolder("up");
	up.add(cameraOptions.up, 0, -1, 1).onChange(updateCamera).listen();
	up.add(cameraOptions.up, 1, -1, 1).onChange(updateCamera).listen();
	up.add(cameraOptions.up, 2, -1, 1).onChange(updateCamera).listen();

	objectGui.add(objectOptions, "currentPrimitive", {'Sphere': 0, 'Cube': 1, 'Cylinder': 2,'Pyramid': 3, 'Torus': 4}).listen();
	objectGui.add(objectOptions, "zBufferEnabled").listen().onChange(changeZBufferState).name("zBuffer");
	objectGui.add(objectOptions, "backFaceCullingEnabled").listen().onChange(changeBackFaceCullingState).name("backfaceCulling")

	const material = objectGui.addFolder("material");
	material.addColor(materialOptions, 'materialAmb').name('Ka');
	material.addColor(materialOptions, 'materialDif').name('Kd');
	material.addColor(materialOptions, 'materialSpe').name('Ks');
	material.add(materialOptions, 'materialShy', 0, 100).name('Shinyness').step(0.1);

	lightsGUI.domElement.id = 'gui';
}

//=============================================================================

/**
 * Sends all required GLSL uniforms.
 */
function sendSceneUniforms() {
	gl.uniform1i(uNLights, lights.length);
	gl.uniformMatrix4fv(uMNormals, gl.GL_FALSE, flatten(normalMatrix(modelView())));
	gl.uniformMatrix4fv(uMViewNormals, gl.GL_FALSE, flatten(normalMatrix(mView)));
	gl.uniformMatrix4fv(uMView, gl.GL_FALSE, flatten(mView));

	gl.uniform3fv(uMaterialInfo.materialAmb, materialOptions.materialAmb.map((x) => {return x / 255.0}));
	gl.uniform3fv(uMaterialInfo.materialDif, materialOptions.materialDif.map((x) => {return x / 255.0}));
	gl.uniform3fv(uMaterialInfo.materialSpe, materialOptions.materialSpe.map((x) => {return x / 255.0}));
	gl.uniform1f(uMaterialInfo.materialShy, materialOptions.materialShy);

	for (let i in lights) {
		gl.uniform3fv(uLights[i].position, lights[i].position);
		gl.uniform3fv(uLights[i].Ia, lights[i].Ia.map((x) => {return x / 255.0}));
		gl.uniform3fv(uLights[i].Id, lights[i].Id.map((x) => {return x / 255.0}));
		gl.uniform3fv(uLights[i].Is, lights[i].Is.map((x) => {return x / 255.0}));
		gl.uniform1i(uLights[i].isDirectional, lights[i].isDirectional);
		gl.uniform1i(uLights[i].isActive, lights[i].isActive);
	}
}

/**
 * Draws the scene objects, not including lights.
 */
function drawScene() {
	sendSceneUniforms();

	uploadModelView();
	PRIMITIVES[objectOptions.currentPrimitive].draw(gl, objectProgram, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);

	pushMatrix();
		multTranslation([0, -0.6, 0]);
		multScale([3, 0.1, 3]);
		uploadModelView();
		CUBE.draw(gl, objectProgram, generalOptions.wireframe ? gl.LINES : gl.TRIANGLES);
	popMatrix();
}

/**
 * Draws scene lights, not including objects.
 * 
 * @returns none
 */
function drawLights() {
	gl.useProgram(lightProgram);
	uploadProjection(lightProgram);

	if (!generalOptions.lights) return;

	for (let i in lights) {
		pushMatrix();

		if (lights[i].isActive) { 
			gl.uniform3fv(uLightColor, flatten(lights[i].Id.map((x) => {return x / 255.0})));

			multTranslation(lights[i].position);
			multScale([0.05, 0.05, 0.05]);
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
