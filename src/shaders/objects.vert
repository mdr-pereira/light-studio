uniform mat4 mModelView; // model-view transformation
uniform mat4 mProjection; // projection

uniform mat4 mNormals; // TODO. (flatten(normalMatrix(stack.modelView())))
uniform mat4 mViewNormals; // normalMatrix(mView) TODO.
uniform mat4 mView; // view transformation for points TODO.
// TODOs acima: enviar estas cenas para aqui.

attribute vec4 vPosition;
attribute vec3 vNormal;

varying vec3 fNormal;

varying vec3 fPosC;
varying mat4 fMViewNormals;
varying mat4 fMView;

void main() {
	gl_Position = mProjection * mModelView * vPosition;

	fNormal = (mNormals * vec4(vNormal, 1.0)).xyz;
	fPosC = (mModelView * vPosition).xyz;
	fMViewNormals = mViewNormals;
	fMView = mView;
}
