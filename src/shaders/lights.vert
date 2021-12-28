uniform mat4 mModelView; // model-view transformation
uniform mat4 mProjection; // projection

attribute vec4 vPosition;

uniform vec3 uColor;

varying vec3 fColor;

void main() {
	gl_Position = mProjection * mModelView * vPosition;
	fColor = uColor;
}
