precision highp float;

const int MAX_LIGHTS = 8;

struct LightInfo {
	vec3 position;
	vec3 Ia; // ambient
	vec3 Id; // diffuse
	vec3 Is; // specular
	bool isDirectional;
	bool isActive;
};

struct MaterialInfo {
	vec3 Ka; // ambient
	vec3 Kd; // diffuse
	vec3 Ks; // specular
	float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLight[MAX_LIGHTS];
uniform MaterialInfo uMaterial;  

varying vec3 fNormal;

varying vec3 fPosC;
varying mat4 fMViewNormals;
varying mat4 fMView;

void main() {
	vec3 viewer = -fPosC;
	vec3 specular;
	vec3 diffuse;
	vec3 ambientColor;

	for (int i = 0; i < MAX_LIGHTS; i++) {
		if (i == uNLights) break;

		ambientColor += uMaterial.Ka * uLight[i].Ia;
		vec3 diffuseColor = uMaterial.Kd * uLight[i].Id;
		vec3 specularColor = uMaterial.Ks * uLight[i].Is;

		vec3 light;

		if (uLight[i].isDirectional) {
			light = normalize((fMViewNormals * vec4(uLight[i].position, 1.0)).xyz);
		} else {
			light = normalize((fMView * vec4(uLight[i].position, 1.0)).xyz - fPosC);
		}

		vec3 L = normalize(light);
		vec3 V = normalize(viewer);	
		vec3 N = normalize(fNormal);
		vec3 R = normalize(reflect(-L, N));

		float diffuseFactor = max(dot(L, N), 0.0);
		float specularFactor = pow(max(dot(N, R), 0.0), uMaterial.shininess);

		diffuse += diffuseFactor * diffuseColor;
		specular += specularFactor * specularColor;
	}

	if (uNLights == 0) {
		gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	} else {
		gl_FragColor = vec4(ambientColor + diffuse + specular, 1.0);
	}
}