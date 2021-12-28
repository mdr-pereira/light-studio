uniform mat4 mModelView; // model-view transformation
uniform mat4 mProjection; // projection

uniform mat4 mNormals; // TODO. (flatten(normalMatrix(stack.modelView())))
uniform mat4 mViewNormals; // normalMatrix(mView) TODO.
uniform mat4 mView; // view transformation for points TODO.
// TODOs acima: enviar estas cenas para aqui.

uniform vec3 uMaterialAmb; // ambient
uniform vec3 uMaterialDif; // difuse
uniform vec3 uMaterialSpe; // specular
uniform vec3 uMaterialShy; // shininess

attribute vec4 vPosition;
attribute vec3 vNormal;

uniform vec3 uColor;

varying vec3 fColor;
varying vec3 fNormal;

varying vec3 fPosC;
varying mat4 fMViewNormals;
varying mat4 fMView;

void main() {
	gl_Position = mProjection * mModelView * vPosition;
	fColor = uColor;

	fNormal = (mNormals * vec4(vNormal, 1.0)).xyz;
	fPosC = (mModelView * vPosition).xyz;
	fMViewNormals = mViewNormals;
	fMView = mView;
}
