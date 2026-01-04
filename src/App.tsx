import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './App.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    directionalLight: THREE.DirectionalLight;
    pointLight: THREE.PointLight;
    pyramid: THREE.Mesh;
  } | null>(null);
  
  const [lightIntensity, setLightIntensity] = useState(1);
  const [lightColor, setLightColor] = useState('#ffffff');
  const [objectColor, setObjectColor] = useState('#ff6b6b');

  // Создание сцены один раз
  useEffect(() => {
    if (!containerRef.current) return;

    // Создание сцены, камеры и рендерера
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // OrbitControls для навигации камеры
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Источники света (3 источника, 2 типа)
    // 1. Направленный свет (DirectionalLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // 2. Точечный свет (PointLight)
    const pointLight = new THREE.PointLight(0xff9500, 1, 50);
    pointLight.position.set(-3, 3, -3);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // 3. Амбиентный свет (AmbientLight)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Плоскость (BufferGeometry #1)
    const planeGeometry = new THREE.BufferGeometry();
    const planeVertices = new Float32Array([
      -5, 0, -5,
      5, 0, -5,
      5, 0, 5,
      -5, 0, -5,
      5, 0, 5,
      -5, 0, 5,
    ]);
    planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3));
    planeGeometry.computeVertexNormals();
    
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    scene.add(plane);

    // Треугольная пирамида (BufferGeometry #2)
    const pyramidGeometry = new THREE.BufferGeometry();
    const pyramidVertices = new Float32Array([
      // Основание треугольника
      0, 0, 0,
      1, 0, 0,
      0.5, 0, 0.866,
      // Боковые грани
      0, 0, 0,
      0.5, 1, 0.433,
      1, 0, 0,
      
      1, 0, 0,
      0.5, 1, 0.433,
      0.5, 0, 0.866,
      
      0.5, 0, 0.866,
      0.5, 1, 0.433,
      0, 0, 0,
    ]);
    pyramidGeometry.setAttribute('position', new THREE.BufferAttribute(pyramidVertices, 3));
    pyramidGeometry.computeVertexNormals();
    
    const pyramidMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    pyramid.position.set(-2, 0, -2);
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    scene.add(pyramid);

    // Куб с текстурой (объект #3)
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      '/src/assets/image.png',
      () => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
      }
    );
    
    const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
      map: texture,
      color: 0xffffff
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(2, 1, 0);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    // Сфера (объект #4)
    const sphereGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4ecdc4,
      metalness: 0.5,
      roughness: 0.2
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 2, 2);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);

    // Сохраняем ссылки для обновления параметров
    sceneRef.current = {
      directionalLight,
      pointLight,
      pyramid,
    };

    // Анимация
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Вращение объектов
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      sphere.rotation.y += 0.005;
      pyramid.rotation.y += 0.005;

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Обработка изменения размера окна
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Очистка
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []); // Выполняется только один раз!

  // Обновление параметров сцены при изменении состояния
  useEffect(() => {
    if (!sceneRef.current) return;

    // Обновляем интенсивность света
    sceneRef.current.directionalLight.intensity = lightIntensity;
    sceneRef.current.pointLight.intensity = lightIntensity;
    
    // Обновляем цвет света
    const color = new THREE.Color(lightColor);
    sceneRef.current.directionalLight.color = color;
    
    // Обновляем цвет пирамиды
    const objColor = new THREE.Color(objectColor);
    (sceneRef.current.pyramid.material as THREE.MeshStandardMaterial).color = objColor;
  }, [lightIntensity, lightColor, objectColor]);

  return (
    <div className="scene-container" ref={containerRef}>
      <div className="controls-panel">
        <h3 style={{ marginTop: 0 }}>Управление сценой</h3>
        
        <div className="control-group">
          <label>Интенсивность света: {lightIntensity.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={lightIntensity}
            onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>Цвет света:</label>
          <input
            type="color"
            value={lightColor}
            onChange={(e) => setLightColor(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Цвет пирамиды:</label>
          <input
            type="color"
            value={objectColor}
            onChange={(e) => setObjectColor(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
