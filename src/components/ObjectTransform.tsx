import React from 'react';

interface ObjectTransformProps {
  selectedObjectName: string;
  transformMode: 'translate' | 'rotate' | 'scale';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  onTransformModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onScaleChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

export const ObjectTransform: React.FC<ObjectTransformProps> = ({
  selectedObjectName,
  transformMode,
  position,
  rotation,
  scale,
  onTransformModeChange,
  onPositionChange,
  onRotationChange,
  onScaleChange
}) => {
  return (
    <div className="control-section">
      <h4>Трансформация: {selectedObjectName}</h4>
      
      <div className="control-group">
        <label>Режим:</label>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => onTransformModeChange('translate')}
            className={transformMode === 'translate' ? 'active' : ''}
            style={{ flex: '1 1 auto', padding: '5px', fontSize: '11px' }}
          >
            Перемещение
          </button>
          <button 
            onClick={() => onTransformModeChange('rotate')}
            className={transformMode === 'rotate' ? 'active' : ''}
            style={{ flex: '1 1 auto', padding: '5px', fontSize: '11px' }}
          >
            Поворот
          </button>
          <button 
            onClick={() => onTransformModeChange('scale')}
            className={transformMode === 'scale' ? 'active' : ''}
            style={{ flex: '1 1 auto', padding: '5px', fontSize: '11px' }}
          >
            Масштаб
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Позиция:</label>
        <div className="transform-inputs">
          <input 
            type="number" 
            step="0.1" 
            value={position.x} 
            onChange={(e) => onPositionChange('x', parseFloat(e.target.value))} 
            placeholder="X" 
          />
          <input 
            type="number" 
            step="0.1" 
            value={position.y} 
            onChange={(e) => onPositionChange('y', parseFloat(e.target.value))} 
            placeholder="Y" 
          />
          <input 
            type="number" 
            step="0.1" 
            value={position.z} 
            onChange={(e) => onPositionChange('z', parseFloat(e.target.value))} 
            placeholder="Z" 
          />
        </div>
      </div>

      <div className="control-group">
        <label>Поворот (градусы):</label>
        <div className="transform-inputs">
          <input 
            type="number" 
            step="1" 
            value={rotation.x} 
            onChange={(e) => onRotationChange('x', parseFloat(e.target.value))} 
            placeholder="X" 
          />
          <input 
            type="number" 
            step="1" 
            value={rotation.y} 
            onChange={(e) => onRotationChange('y', parseFloat(e.target.value))} 
            placeholder="Y" 
          />
          <input 
            type="number" 
            step="1" 
            value={rotation.z} 
            onChange={(e) => onRotationChange('z', parseFloat(e.target.value))} 
            placeholder="Z" 
          />
        </div>
      </div>

      <div className="control-group">
        <label>Масштаб:</label>
        <div className="transform-inputs">
          <input 
            type="number" 
            step="0.1" 
            value={scale.x} 
            onChange={(e) => onScaleChange('x', parseFloat(e.target.value))} 
            placeholder="X" 
          />
          <input 
            type="number" 
            step="0.1" 
            value={scale.y} 
            onChange={(e) => onScaleChange('y', parseFloat(e.target.value))} 
            placeholder="Y" 
          />
          <input 
            type="number" 
            step="0.1" 
            value={scale.z} 
            onChange={(e) => onScaleChange('z', parseFloat(e.target.value))} 
            placeholder="Z" 
          />
        </div>
      </div>
    </div>
  );
};
