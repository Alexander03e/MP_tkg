import * as THREE from 'three';

// Vertex shader с волновым эффектом
export const waveVertexShader = `
  uniform float time;
  uniform float amplitude;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    
    // Создаем волновой эффект
    vec3 newPosition = position;
    float wave = sin(position.x * 3.0 + time) * cos(position.z * 3.0 + time) * amplitude;
    newPosition.y += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader с градиентом и подсветкой
export const waveFragmentShader = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Анимированный градиент
    float mixValue = sin(vUv.y * 3.14159 + time * 0.5) * 0.5 + 0.5;
    vec3 color = mix(color1, color2, mixValue);
    
    // Добавляем освещение на основе нормалей
    vec3 light = normalize(vec3(0.5, 1.0, 0.3));
    float brightness = max(dot(vNormal, light), 0.3);
    
    // Добавляем свечение на краях (Fresnel эффект)
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);
    
    vec3 finalColor = color * brightness + vec3(0.2, 0.5, 1.0) * fresnel * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Создание материала с кастомным шейдером
export function createWaveShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      amplitude: { value: 0.15 },
      color1: { value: new THREE.Color(0x4ecdc4) },
      color2: { value: new THREE.Color(0xff6b6b) }
    },
    vertexShader: waveVertexShader,
    fragmentShader: waveFragmentShader,
    side: THREE.DoubleSide
  });
}
