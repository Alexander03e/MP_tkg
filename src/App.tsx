import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import './App.css';

interface ColorPoint {
  id: number;
  rgb: { r: number; g: number; b: number };
  lab: { l: number; a: number; b: number };
  mesh: THREE.Mesh;
}

// Функции конвертации sRGB -> XYZ -> LAB
function srgbToLinear(value: number): number {
  if (value <= 0.04045) {
    return value / 12.92;
  }
  return Math.pow((value + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
  // Нормализуем RGB (0-255) в (0-1)
  const rLinear = srgbToLinear(r / 255);
  const gLinear = srgbToLinear(g / 255);
  const bLinear = srgbToLinear(b / 255);

  // Преобразование в XYZ (D65)
  const x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  const y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.0721750;
  const z = rLinear * 0.0193339 + gLinear * 0.1191920 + bLinear * 0.9503041;

  return { x: x * 100, y: y * 100, z: z * 100 };
}

function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
  // Reference white D65
  const xn = 95.047;
  const yn = 100.000;
  const zn = 108.883;

  const fx = labF(x / xn);
  const fy = labF(y / yn);
  const fz = labF(z / zn);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

function labF(t: number): number {
  const delta = 6 / 29;
  if (t > delta ** 3) {
    return Math.pow(t, 1 / 3);
  }
  return t / (3 * delta ** 2) + 4 / 29;
}

function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// Вычисление ΔE76
function deltaE76(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    orbitControls: OrbitControls;
    transformControls: TransformControls;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  const [colorPoints, setColorPoints] = useState<ColorPoint[]>([]);
  const [inputRgb, setInputRgb] = useState({ r: 255, g: 0, b: 0 });
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const pointIdCounter = useRef(0);

  // Создание сцены
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(150, 150, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // TransformControls
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.setSpace('world');
    transformControls.setSize(5); // МАКСИМАЛЬНО увеличиваем размер
    scene.add(transformControls as unknown as THREE.Object3D);
    
    console.log('TransformControls added to scene');

    let isDragging = false;

    // Отключаем OrbitControls при использовании TransformControls
    transformControls.addEventListener('dragging-changed', (event) => {
      const value = (event as { value: unknown }).value;
      const isDraggingValue = typeof value === 'boolean' ? value : false;
      orbitControls.enabled = !isDraggingValue;
      isDragging = isDraggingValue;
      console.log('Dragging:', isDraggingValue);
    });

    // Событие изменения объекта
    transformControls.addEventListener('objectChange', () => {
      console.log('Object changed');
    });

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // Создание текстовой метки
    const createTextLabel = (text: string, x: number, y: number, z: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = 128;
      canvas.height = 128;

      context.fillStyle = '#000000';
      context.font = 'Bold 80px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(x, y, z);
      sprite.scale.set(10, 10, 1);
      scene.add(sprite);
    };

    // Создание осей с подписями
    const createAxes = () => {
      const axisLength = 120;
      const axisRadius = 0.5;

      // Ось L (вертикальная, зеленая)
      const lGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 16);
      const lMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const lAxis = new THREE.Mesh(lGeometry, lMaterial);
      lAxis.position.set(0, axisLength / 2, 0);
      scene.add(lAxis);

      // Ось a (красная)
      const aGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength * 2, 16);
      const aMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const aAxis = new THREE.Mesh(aGeometry, aMaterial);
      aAxis.rotation.z = Math.PI / 2;
      aAxis.position.set(0, 0, 0);
      scene.add(aAxis);

      // Ось b (синяя)
      const bGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength * 2, 16);
      const bMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
      const bAxis = new THREE.Mesh(bGeometry, bMaterial);
      bAxis.rotation.x = Math.PI / 2;
      bAxis.position.set(0, 0, 0);
      scene.add(bAxis);

      // Текстовые подписи (используем спрайты)
      createTextLabel('L', 0, axisLength + 5, 0);
      createTextLabel('a', axisLength + 10, 0, 0);
      createTextLabel('b', 0, 0, axisLength + 10);
    };

    // Создание сетки границ sRGB
    const createSRGBGrid = () => {
      const step = 5;
      const points: THREE.Vector3[] = [];
      const colors: THREE.Color[] = [];

      for (let r = 0; r <= 255; r += step) {
        for (let g = 0; g <= 255; g += step) {
          for (let b = 0; b <= 255; b += step) {
            // Отображаем только граничные точки (хотя бы одна координата 0 или 255)
            if (
              r === 0 || r === 255 ||
              g === 0 || g === 255 ||
              b === 0 || b === 255
            ) {
              const lab = rgbToLab(r, g, b);
              points.push(new THREE.Vector3(lab.a, lab.l, lab.b));
              colors.push(new THREE.Color(r / 255, g / 255, b / 255));
            }
          }
        }
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const colorArray = new Float32Array(colors.length * 3);
      colors.forEach((color, i) => {
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
      });
      geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
      });

      const pointCloud = new THREE.Points(geometry, material);
      scene.add(pointCloud);
    };

    // Создание осей LAB
    createAxes();

    // Создание сетки границ sRGB
    createSRGBGrid();

    // Raycaster для выбора объектов
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 1 };
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      orbitControls,
      transformControls,
      raycaster,
      mouse,
    };

    // Анимация
    const animate = () => {
      requestAnimationFrame(animate);
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

    // Обработка кликов для выбора точек
    const handleClick = (event: MouseEvent) => {
      // Игнорируем клики когда используем TransformControls
      if (isDragging) {
        console.log('Ignoring click - dragging');
        return;
      }
      
      if (!sceneRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      const selectableObjects = scene.children.filter(
        (obj) => obj.userData.selectable === true
      );
      
      console.log('Selectable objects:', selectableObjects.length);
      
      const intersects = raycaster.intersectObjects(selectableObjects, true);
      
      console.log('Intersects:', intersects.length);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log('Clicked object:', clickedObject.userData);
        if (clickedObject.userData.colorPointId !== undefined) {
          console.log('Attaching to object:', clickedObject.userData.colorPointId);
          
          // Сбрасываем масштаб у всех сфер
          scene.children.forEach((obj) => {
            if (obj.userData.selectable && obj instanceof THREE.Mesh) {
              obj.scale.set(1, 1, 1);
            }
          });
          
          // Увеличиваем выбранную сферу
          if (clickedObject instanceof THREE.Mesh) {
            clickedObject.scale.set(1.3, 1.3, 1.3);
          }
          
          // Устанавливаем выбранную точку
          setSelectedPointId(clickedObject.userData.colorPointId);
          
          transformControls.attach(clickedObject as THREE.Object3D);
          console.log('Transform controls attached:', transformControls.object !== undefined);
          console.log('Attached object position:', clickedObject.position);
          console.log('Camera position:', camera.position);
        }
      } else {
        console.log('Detaching controls');
        // Сбрасываем масштаб у всех сфер
        scene.children.forEach((obj) => {
          if (obj.userData.selectable && obj instanceof THREE.Mesh) {
            obj.scale.set(1, 1, 1);
          }
        });
        setSelectedPointId(null);
        transformControls.detach();
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Обработка наведения курсора для подсветки
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      const selectableObjects = scene.children.filter(
        (obj) => obj.userData.selectable === true
      );
      
      const intersects = raycaster.intersectObjects(selectableObjects, true);

      // Меняем курсор
      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // Обработка нажатия Escape для снятия выделения
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Сбрасываем масштаб у всех сфер
        scene.children.forEach((obj) => {
          if (obj.userData.selectable && obj instanceof THREE.Mesh) {
            obj.scale.set(1, 1, 1);
          }
        });
        setSelectedPointId(null);
        transformControls.detach();
        console.log('Controls detached by Escape');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Очистка
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Добавление цветовой точки
  const addColorPoint = () => {
    if (colorPoints.length >= 4) {
      alert('Максимум 4 точки!');
      return;
    }

    if (!sceneRef.current) return;

    const { r, g, b } = inputRgb;
    const lab = rgbToLab(r, g, b);

    console.log('Creating point:', { r, g, b, lab });

    // Создаем сферу
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r / 255, g / 255, b / 255),
      metalness: 0.3,
      roughness: 0.4,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(lab.a, lab.l, lab.b);
    sphere.userData.selectable = true;
    sphere.userData.colorPointId = pointIdCounter.current;
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    sceneRef.current.scene.add(sphere);
    
    console.log('Sphere added to scene, ID:', pointIdCounter.current);

    const newPoint: ColorPoint = {
      id: pointIdCounter.current++,
      rgb: { r, g, b },
      lab,
      mesh: sphere,
    };

    setColorPoints((prev) => [...prev, newPoint]);
  };

  // Удаление цветовой точки
  const removeColorPoint = (id: number) => {
    if (!sceneRef.current) return;

    const point = colorPoints.find((p) => p.id === id);
    if (point) {
      sceneRef.current.scene.remove(point.mesh);
      if (sceneRef.current.transformControls.object === point.mesh) {
        sceneRef.current.transformControls.detach();
      }
    }

    setColorPoints((prev) => prev.filter((p) => p.id !== id));
    if (selectedPointId === id) {
      setSelectedPointId(null);
    }
  };

  // Перемещение точки по осям LAB
  const movePoint = (axis: 'l' | 'a' | 'b', delta: number) => {
    if (selectedPointId === null || !sceneRef.current) return;

    const point = colorPoints.find((p) => p.id === selectedPointId);
    if (!point) return;

    // Обновляем позицию в LAB
    const newLab = { ...point.lab };
    if (axis === 'l') newLab.l += delta;
    if (axis === 'a') newLab.a += delta;
    if (axis === 'b') newLab.b += delta;

    // Ограничиваем значения LAB
    newLab.l = Math.max(0, Math.min(100, newLab.l));
    newLab.a = Math.max(-128, Math.min(127, newLab.a));
    newLab.b = Math.max(-128, Math.min(127, newLab.b));

    // Обновляем позицию меша
    point.mesh.position.set(newLab.a, newLab.l, newLab.b);
    point.lab = newLab;

    // Обновляем состояние для перерисовки линий
    setColorPoints((prev) => [...prev]);
  };

  // Обновление линий между точками
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current.scene;

    // Удаляем старые линии
    const oldLines = scene.children.filter((obj) => obj.userData.isConnectionLine);
    oldLines.forEach((line) => scene.remove(line));

    // Создаем новые линии между всеми парами точек
    for (let i = 0; i < colorPoints.length; i++) {
      for (let j = i + 1; j < colorPoints.length; j++) {
        const point1 = colorPoints[i];
        const point2 = colorPoints[j];

        const points = [
          new THREE.Vector3(point1.lab.a, point1.lab.l, point1.lab.b),
          new THREE.Vector3(point2.lab.a, point2.lab.l, point2.lab.b),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        line.userData.isConnectionLine = true;
        scene.add(line);
      }
    }
  }, [colorPoints]);

  // Вычисление таблицы ΔE76
  const calculateDeltaETable = () => {
    const table: { pair: string; deltaE: number }[] = [];

    for (let i = 0; i < colorPoints.length; i++) {
      for (let j = i + 1; j < colorPoints.length; j++) {
        const point1 = colorPoints[i];
        const point2 = colorPoints[j];
        const dE = deltaE76(point1.lab, point2.lab);
        table.push({
          pair: `Точка ${i + 1} - Точка ${j + 1}`,
          deltaE: parseFloat(dE.toFixed(2)),
        });
      }
    }

    return table;
  };

  const deltaETable = calculateDeltaETable();

  return (
    <div className="app-container">
      <div className="scene-container" ref={containerRef}></div>
      
      <div className="controls-panel">
        <h3>3D-визуализатор sRGB в CIELAB</h3>
        
    
        {selectedPointId !== null && (
          <div className="control-group" style={{ padding: '12px', backgroundColor: 'rgba(255, 215, 0, 0.2)', border: '2px solid rgba(255, 215, 0, 0.6)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ff6b00' }}>🎯 Управление точкой {colorPoints.findIndex(p => p.id === selectedPointId) + 1}</h4>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Ось L (яркость):</strong>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <button onClick={() => movePoint('l', -5)} style={{ flex: 1 }}>L -5</button>
                <button onClick={() => movePoint('l', -1)} style={{ flex: 1 }}>L -1</button>
                <button onClick={() => movePoint('l', 1)} style={{ flex: 1 }}>L +1</button>
                <button onClick={() => movePoint('l', 5)} style={{ flex: 1 }}>L +5</button>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong>Ось a (красный-зеленый):</strong>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <button onClick={() => movePoint('a', -5)} style={{ flex: 1 }}>a -5</button>
                <button onClick={() => movePoint('a', -1)} style={{ flex: 1 }}>a -1</button>
                <button onClick={() => movePoint('a', 1)} style={{ flex: 1 }}>a +1</button>
                <button onClick={() => movePoint('a', 5)} style={{ flex: 1 }}>a +5</button>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong>Ось b (желтый-синий):</strong>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <button onClick={() => movePoint('b', -5)} style={{ flex: 1 }}>b -5</button>
                <button onClick={() => movePoint('b', -1)} style={{ flex: 1 }}>b -1</button>
                <button onClick={() => movePoint('b', 1)} style={{ flex: 1 }}>b +1</button>
                <button onClick={() => movePoint('b', 5)} style={{ flex: 1 }}>b +5</button>
              </div>
            </div>

            <div style={{ fontSize: '10px', marginTop: '8px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '3px' }}>
              LAB: L={colorPoints.find(p => p.id === selectedPointId)?.lab.l.toFixed(1)}, 
              a={colorPoints.find(p => p.id === selectedPointId)?.lab.a.toFixed(1)}, 
              b={colorPoints.find(p => p.id === selectedPointId)?.lab.b.toFixed(1)}
            </div>
          </div>
        )}

        <div className="control-group">
          <h4>Добавить точку ({colorPoints.length}/4)</h4>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label>R:</label>
              <input
                type="number"
                min="0"
                max="255"
                value={inputRgb.r}
                onChange={(e) => setInputRgb({ ...inputRgb, r: Number(e.target.value) })}
                style={{ width: '60px' }}
              />
            </div>
            <div>
              <label>G:</label>
              <input
                type="number"
                min="0"
                max="255"
                value={inputRgb.g}
                onChange={(e) => setInputRgb({ ...inputRgb, g: Number(e.target.value) })}
                style={{ width: '60px' }}
              />
            </div>
            <div>
              <label>B:</label>
              <input
                type="number"
                min="0"
                max="255"
                value={inputRgb.b}
                onChange={(e) => setInputRgb({ ...inputRgb, b: Number(e.target.value) })}
                style={{ width: '60px' }}
              />
            </div>
          </div>
          <div
            style={{
              width: '100%',
              height: '30px',
              backgroundColor: `rgb(${inputRgb.r}, ${inputRgb.g}, ${inputRgb.b})`,
              border: '1px solid #ccc',
              marginBottom: '10px',
            }}
          />
          <button onClick={addColorPoint} disabled={colorPoints.length >= 4}>
            Добавить точку
          </button>
        </div>

        <div className="control-group">
          <h4>Точки цветов</h4>
          {colorPoints.map((point, index) => (
            <div key={point.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Точка {index + 1}</span>
                <button onClick={() => removeColorPoint(point.id)}>Удалить</button>
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                <div>RGB: ({point.rgb.r}, {point.rgb.g}, {point.rgb.b})</div>
                <div>LAB: (L={point.lab.l.toFixed(2)}, a={point.lab.a.toFixed(2)}, b={point.lab.b.toFixed(2)})</div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '20px',
                  backgroundColor: `rgb(${point.rgb.r}, ${point.rgb.g}, ${point.rgb.b})`,
                  marginTop: '5px',
                }}
              />
            </div>
          ))}
        </div>

        {deltaETable.length > 0 && (
          <div className="control-group">
            <h4>Таблица ΔE76</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '5px' }}>Пара точек</th>
                  <th style={{ border: '1px solid #ccc', padding: '5px' }}>ΔE76</th>
                </tr>
              </thead>
              <tbody>
                {deltaETable.map((row, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ccc', padding: '5px' }}>{row.pair}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px' }}>{row.deltaE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
