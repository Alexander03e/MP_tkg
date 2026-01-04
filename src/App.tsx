import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ControlPanel } from './components/ControlPanel';
import { createWaveShaderMaterial } from './shaders/waveShader';
import './App.css';

interface SceneObject {
  id: string;
  name: string;
  mesh: THREE.Object3D;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbitControls: OrbitControls;
    transformControls: TransformControls;
    directionalLight: THREE.DirectionalLight;
    pointLight: THREE.PointLight;
    pyramid: THREE.Mesh;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    objects: Map<string, SceneObject>;
  } | null>(null);
  
  const [lightIntensity, setLightIntensity] = useState(1);
  const [lightColor, setLightColor] = useState('#ffffff');
  const [objectColor, setObjectColor] = useState('#ff6b6b');
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isDragging, setIsDragging] = useState(false);
  
  // Параметры выбранного объекта
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });

  const objectIdCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Функция для добавления объекта в сцену
  const addObjectToScene = useCallback((object: THREE.Object3D, name: string) => {
    if (!sceneRef.current) return;

    const id = `object-${objectIdCounter.current++}`;
    object.userData.id = id;
    object.userData.selectable = true;
    
    // Включаем тени
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    sceneRef.current.scene.add(object);
    
    const sceneObj: SceneObject = { id, name, mesh: object };
    sceneRef.current.objects.set(id, sceneObj);
    
    setSceneObjects(prev => [...prev, sceneObj]);
  }, []);

  // Загрузка модели из файла
  const loadModelFromFile = useCallback((file: File) => {
    if (!sceneRef.current) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      const content = e.target?.result;
      if (!content) {
        alert('Ошибка чтения файла');
        return;
      }

      try {
        if (extension === 'gltf') {
          // GLTF - текстовый формат
          const loader = new GLTFLoader();
          
          // Настройка DRACOLoader для сжатых моделей
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
          dracoLoader.setDecoderConfig({ type: 'js' });
          loader.setDRACOLoader(dracoLoader);
          
          const gltfData = JSON.parse(content as string);
          loader.parse(JSON.stringify(gltfData), '', (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 1, 0);
            // Нормализуем размер модели
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            addObjectToScene(model, file.name);
            dracoLoader.dispose();
          }, (error) => {
            console.error('Ошибка парсинга GLTF:', error);
            alert('Не удалось загрузить GLTF модель. Проверьте формат файла.');
            dracoLoader.dispose();
          });
        } else if (extension === 'glb') {
          // GLB - бинарный формат
          const loader = new GLTFLoader();
          
          // Настройка DRACOLoader для сжатых моделей
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
          dracoLoader.setDecoderConfig({ type: 'js' });
          loader.setDRACOLoader(dracoLoader);
          
          loader.parse(content as ArrayBuffer, '', (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 1, 0);
            // Нормализуем размер модели
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            addObjectToScene(model, file.name);
            dracoLoader.dispose();
          }, (error) => {
            console.error('Ошибка парсинга GLB:', error);
            alert('Не удалось загрузить GLB модель. Проверьте формат файла.');
            dracoLoader.dispose();
          });
        } else if (extension === 'obj') {
          const loader = new OBJLoader();
          const model = loader.parse(content as string);
          model.position.set(0, 1, 0);
          // Нормализуем размер модели
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          addObjectToScene(model, file.name);
        } else if (extension === 'fbx') {
          const loader = new FBXLoader();
          const model = loader.parse(content as ArrayBuffer, '');
          model.position.set(0, 1, 0);
          // Нормализуем размер модели
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          addObjectToScene(model, file.name);
        } else {
          alert(`Неподдерживаемый формат: ${extension}`);
        }
      } catch (error) {
        console.error('Ошибка загрузки модели:', error);
        alert(`Не удалось загрузить модель. Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    };

    reader.onerror = () => {
      alert('Ошибка чтения файла');
    };

    // Читаем файл в зависимости от формата
    if (extension === 'obj' || extension === 'gltf') {
      reader.readAsText(file);
    } else if (extension === 'glb' || extension === 'fbx') {
      reader.readAsArrayBuffer(file);
    } else {
      alert(`Неподдерживаемый формат файла: ${extension}`);
    }
  }, [addObjectToScene]);

  // Обработка выбора файла
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      loadModelFromFile(files[0]);
    }
  };

  // Обработка drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      loadModelFromFile(files[0]);
    }
  };

  // Выбор объекта из списка
  const handleObjectSelect = useCallback((obj: SceneObject) => {
    if (!sceneRef.current) return;
    
    setSelectedObject(obj);
    sceneRef.current.transformControls.attach(obj.mesh);
    
    // Обновляем параметры трансформации
    setPosition({
      x: parseFloat(obj.mesh.position.x.toFixed(2)),
      y: parseFloat(obj.mesh.position.y.toFixed(2)),
      z: parseFloat(obj.mesh.position.z.toFixed(2))
    });
    
    setRotation({
      x: parseFloat((obj.mesh.rotation.x * 180 / Math.PI).toFixed(2)),
      y: parseFloat((obj.mesh.rotation.y * 180 / Math.PI).toFixed(2)),
      z: parseFloat((obj.mesh.rotation.z * 180 / Math.PI).toFixed(2))
    });
    
    setScale({
      x: parseFloat(obj.mesh.scale.x.toFixed(2)),
      y: parseFloat(obj.mesh.scale.y.toFixed(2)),
      z: parseFloat(obj.mesh.scale.z.toFixed(2))
    });
  }, []);

  // Создание сцены один раз
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

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
    container.appendChild(renderer.domElement);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // TransformControls
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    
    transformControls.addEventListener('change', () => {
      if (selectedObject) {
        setPosition({
          x: parseFloat(selectedObject.mesh.position.x.toFixed(2)),
          y: parseFloat(selectedObject.mesh.position.y.toFixed(2)),
          z: parseFloat(selectedObject.mesh.position.z.toFixed(2))
        });
        setRotation({
          x: parseFloat((selectedObject.mesh.rotation.x * 180 / Math.PI).toFixed(2)),
          y: parseFloat((selectedObject.mesh.rotation.y * 180 / Math.PI).toFixed(2)),
          z: parseFloat((selectedObject.mesh.rotation.z * 180 / Math.PI).toFixed(2))
        });
        setScale({
          x: parseFloat(selectedObject.mesh.scale.x.toFixed(2)),
          y: parseFloat(selectedObject.mesh.scale.y.toFixed(2)),
          z: parseFloat(selectedObject.mesh.scale.z.toFixed(2))
        });
      }
    });
    
    scene.add(transformControls as unknown as THREE.Object3D);

    // Raycaster для выбора объектов
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Источники света
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff9500, 1, 50);
    pointLight.position.set(-3, 3, -3);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Плоскость
    const planeGeometry = new THREE.BufferGeometry();
    const planeVertices = new Float32Array([
      -5, 0, -5, 5, 0, -5, 5, 0, 5,
      -5, 0, -5, 5, 0, 5, -5, 0, 5,
    ]);
    planeGeometry.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3));
    planeGeometry.computeVertexNormals();
    
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.userData.selectable = false;
    scene.add(plane);

    // Треугольная пирамида
    const pyramidGeometry = new THREE.BufferGeometry();
    const pyramidVertices = new Float32Array([
      0, 0, 0, 1, 0, 0, 0.5, 0, 0.866,
      0, 0, 0, 0.5, 1, 0.433, 1, 0, 0,
      1, 0, 0, 0.5, 1, 0.433, 0.5, 0, 0.866,
      0.5, 0, 0.866, 0.5, 1, 0.433, 0, 0, 0,
    ]);
    pyramidGeometry.setAttribute('position', new THREE.BufferAttribute(pyramidVertices, 3));
    pyramidGeometry.computeVertexNormals();
    
    const pyramidMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    pyramid.position.set(-2, 0, -2);
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    pyramid.userData.selectable = true;
    pyramid.userData.id = 'pyramid';
    scene.add(pyramid);

    // Куб с текстурой
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVQYV2NkYGD4z8DAwMgABXAGjgGmJgYGADhKAwWcQXKCAAAAAElFTkSuQmCC',
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
    cube.userData.selectable = true;
    cube.userData.id = 'cube';
    scene.add(cube);

    // Сфера
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
    sphere.userData.selectable = true;
    sphere.userData.id = 'sphere';
    scene.add(sphere);

    // Плоскость с кастомным GLSL шейдером (волновой эффект)
    const shaderPlaneGeometry = new THREE.PlaneGeometry(3, 3, 50, 50);
    const shaderMaterial = createWaveShaderMaterial();
    const shaderPlane = new THREE.Mesh(shaderPlaneGeometry, shaderMaterial);
    shaderPlane.rotation.x = -Math.PI / 2;
    shaderPlane.position.set(0, 0.5, -3);
    shaderPlane.castShadow = true;
    shaderPlane.receiveShadow = true;
    shaderPlane.userData.selectable = true;
    shaderPlane.userData.id = 'shader-plane';
    shaderPlane.userData.isShader = true;
    scene.add(shaderPlane);

    // Инициализация объектов
    const objects = new Map<string, SceneObject>();
    const pyramidObj = { id: 'pyramid', name: 'Пирамида', mesh: pyramid };
    const cubeObj = { id: 'cube', name: 'Куб', mesh: cube };
    const sphereObj = { id: 'sphere', name: 'Сфера', mesh: sphere };
    const shaderPlaneObj = { id: 'shader-plane', name: 'Волновая плоскость (GLSL)', mesh: shaderPlane };
    
    objects.set('pyramid', pyramidObj);
    objects.set('cube', cubeObj);
    objects.set('sphere', sphereObj);
    objects.set('shader-plane', shaderPlaneObj);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      orbitControls,
      transformControls,
      directionalLight,
      pointLight,
      pyramid,
      raycaster,
      mouse,
      objects
    };
    
    // Обновляем список объектов после монтирования
    queueMicrotask(() => {
      setSceneObjects([pyramidObj, cubeObj, sphereObj, shaderPlaneObj]);
    });

    // Обработка кликов по объектам
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj.parent && obj.parent.type !== 'Scene') {
          if (obj.userData.selectable) break;
          obj = obj.parent;
        }

        if (obj.userData.selectable && obj.userData.id) {
          const sceneObj = sceneRef.current.objects.get(obj.userData.id);
          if (sceneObj) {
            handleObjectSelect(sceneObj);
            return;
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Анимация
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();
      
      // Обновляем шейдер
      if (shaderMaterial && shaderMaterial.uniforms.time) {
        shaderMaterial.uniforms.time.value = elapsedTime;
      }
      
      orbitControls.update();
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
      renderer.domElement.removeEventListener('click', handleClick);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновление параметров света
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.directionalLight.intensity = lightIntensity;
    sceneRef.current.pointLight.intensity = lightIntensity;
    
    const color = new THREE.Color(lightColor);
    sceneRef.current.directionalLight.color = color;
    
    const objColor = new THREE.Color(objectColor);
    (sceneRef.current.pyramid.material as THREE.MeshStandardMaterial).color = objColor;
  }, [lightIntensity, lightColor, objectColor]);

  // Обновление режима трансформации
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.transformControls.setMode(transformMode);
  }, [transformMode]);

  // Обновление позиции объекта из input
  const updatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject || !sceneRef.current) return;
    const obj = sceneRef.current.objects.get(selectedObject.id);
    if (obj) {
      obj.mesh.position[axis] = value;
      setPosition(prev => ({ ...prev, [axis]: value }));
    }
  };

  // Обновление поворота объекта из input (в градусах)
  const updateRotation = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject || !sceneRef.current) return;
    const obj = sceneRef.current.objects.get(selectedObject.id);
    if (obj) {
      obj.mesh.rotation[axis] = value * Math.PI / 180;
      setRotation(prev => ({ ...prev, [axis]: value }));
    }
  };

  // Обновление масштаба объекта из input
  const updateScale = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject || !sceneRef.current) return;
    const obj = sceneRef.current.objects.get(selectedObject.id);
    if (obj) {
      obj.mesh.scale[axis] = value;
      setScale(prev => ({ ...prev, [axis]: value }));
    }
  };

  return (
    <div 
      className="scene-container" 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <p>Отпустите файл для загрузки модели</p>
        </div>
      )}
      
      <ControlPanel
        onFileSelect={handleFileSelect}
        fileInputRef={fileInputRef}
        sceneObjects={sceneObjects}
        selectedObject={selectedObject}
        onObjectSelect={handleObjectSelect}
        transformMode={transformMode}
        position={position}
        rotation={rotation}
        scale={scale}
        onTransformModeChange={setTransformMode}
        onPositionChange={updatePosition}
        onRotationChange={updateRotation}
        onScaleChange={updateScale}
        lightIntensity={lightIntensity}
        lightColor={lightColor}
        objectColor={objectColor}
        onLightIntensityChange={setLightIntensity}
        onLightColorChange={setLightColor}
        onObjectColorChange={setObjectColor}
      />
    </div>
  );
}

export default App;
