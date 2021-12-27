precision highp float;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 position;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
    bool isDirectional;
    bool isActive;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLight[MAX_LIGHTS];
uniform MaterialInfo uMaterial;  

varying vec3 fNormal;
varying vec3 fColor;

void main() {
	gl_FragColor = vec4(fColor, 1.0);
    
}


