import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../libs/utils.js";
import { ortho, perspective, lookAt, flatten, vec3, vec4, inverse, mult, cross, dot } from "../libs/MV.js";
import { modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ, loadIdentity } from "../libs/stack.js";

import * as SPHERE from '../libs/sphere.js';
import * as CUBE from '../libs/cube.js';

import * as dat from '../libs/dat.gui.module.js';

/** @type WebGLRenderingContext */
let gl;

/* Matrices */
let mProjection;
let mView;

/* GLSL */
let uColor;

/* Global Vars */
let time = 0;           // Global simulation time in days
let speed = 1 / 60;     // Speed (how many days added to time on each render pass
let animation = true;   // Animation is running

/* Shader Programs */
let program;

let camera;
let options;

//=========================================================================

function setup(shaders) {
	// Setup
	let canvas = document.getElementById("gl-canvas");

	gl = setupWebGL(canvas);

	// Build Programs
	program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

	camera = {
		eye: vec3(0, 0, -5), 
		at: vec3(0, 0, 0),
		up: vec3(0, 1, 0),
		fovy: 45,
		aspect: 1,
		near: 0.1,
		far: 20
	}

  	options = {
		wireframe: false,
		normals: true
	}

	// Event Listener Setup
	resize_canvas();

	mView = lookAt(camera.eye, camera.at, camera.up);

	window.addEventListener("resize", resize_canvas);

	// Attrib Locations
			
	// Uniform Locations
	uColor = gl.getUniformLocation(program, 'uColor')
		
	// WebGL
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	SPHERE.init(gl);

	gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
	
	let gui = setupGUI(camera, options);

	window.requestAnimationFrame(render);

	function resize_canvas(event) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	
		gl.viewport(0, 0, canvas.width, canvas.height);
	
		camera.aspect = canvas.width/canvas.height;
	
		mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
	}
}

function uploadModelView() {
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
}

function updatePerspective() {
	mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
}

function updateCamera() {
	mView = lookAt(camera.eye, camera.at, camera.up);
}

function setupGUI(camera, options) {

	const gui = new dat.GUI();

	const optionsGUI = gui.addFolder("options");
	optionsGUI.add(options, "wireframe").listen();

	optionsGUI.add(options, "normals").listen();

	const cameraGUI = gui.addFolder("camera");
	cameraGUI.add(camera, "fovy", 1, 100).step(1).onChange(updatePerspective);
	cameraGUI.add(camera, "far", 20, 100).onChange(updatePerspective);
	cameraGUI.add(camera, "near", 0.1, 20).onChange(updatePerspective);

	const eye = cameraGUI.addFolder("eye");
	eye.add(camera.eye, 0).onChange(updateCamera);
	eye.add(camera.eye, 1).onChange(updateCamera);;
	eye.add(camera.eye, 2).onChange(updateCamera);;

	const at = cameraGUI.addFolder("at");
	at.add(camera.at, 0).onChange(updateCamera);;
	at.add(camera.at, 1).onChange(updateCamera);;
	at.add(camera.at, 2).onChange(updateCamera);;

	const up = cameraGUI.addFolder("up");
	up.add(camera.up, 0).onChange(updateCamera);;
	up.add(camera.up, 1).onChange(updateCamera);;
	up.add(camera.up, 2).onChange(updateCamera);;

	return gui
}



//=============================================================================

function render() {
	if (animation) time += speed;
	window.requestAnimationFrame(render);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
	gl.useProgram(program);
	
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
	
	loadMatrix(mView);

	gl.uniform3fv(uColor, flatten(vec3(0.25, 0.25, 0.25)))
	uploadModelView();
	SPHERE.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
}


const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
