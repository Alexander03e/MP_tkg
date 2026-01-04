import React from 'react';
import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';
import { LightingControls } from './LightingControls';
import { ObjectTransform } from './ObjectTransform';

interface SceneObject {
  id: string;
  name: string;
  mesh: THREE.Object3D;
}

interface ControlPanelProps {
  // Model loading
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Object selection
  sceneObjects: SceneObject[];
  selectedObject: SceneObject | null;
  onObjectSelect: (obj: SceneObject) => void;
  
  // Transform
  transformMode: 'translate' | 'rotate' | 'scale';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onScaleChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  
  // Lighting
  lightIntensity: number;
  lightColor: string;
  objectColor: string;
  onLightIntensityChange: (value: number) => void;
  onLightColorChange: (value: string) => void;
  onObjectColorChange: (value: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  return (
    <div className="controls-panel">
      <h3 style={{ marginTop: 0 }}>Управление сценой</h3>
      
      <ModelLoader 
        onFileSelect={props.onFileSelect}
        fileInputRef={props.fileInputRef}
      />

      <div className="control-section">
        <h4>Объекты сцены</h4>
        <select 
          onChange={(e) => {
            const obj = props.sceneObjects.find(o => o.id === e.target.value);
            if (obj) props.onObjectSelect(obj);
          }}
          value={props.selectedObject?.id || ''}
          style={{ width: '100%', padding: '5px' }}
        >
          <option value="">Выберите объект</option>
          {props.sceneObjects.map(obj => (
            <option key={obj.id} value={obj.id}>{obj.name}</option>
          ))}
        </select>
      </div>

      {props.selectedObject && (
        <ObjectTransform
          selectedObjectName={props.selectedObject.name}
          transformMode={props.transformMode}
          position={props.position}
          rotation={props.rotation}
          scale={props.scale}
          onTransformModeChange={props.onTransformModeChange}
          onPositionChange={props.onPositionChange}
          onRotationChange={props.onRotationChange}
          onScaleChange={props.onScaleChange}
        />
      )}

      <LightingControls
        lightIntensity={props.lightIntensity}
        lightColor={props.lightColor}
        objectColor={props.objectColor}
        onLightIntensityChange={props.onLightIntensityChange}
        onLightColorChange={props.onLightColorChange}
        onObjectColorChange={props.onObjectColorChange}
      />
    </div>
  );
};
