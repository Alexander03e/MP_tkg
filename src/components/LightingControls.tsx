import React from 'react';

interface LightingControlsProps {
  lightIntensity: number;
  lightColor: string;
  objectColor: string;
  onLightIntensityChange: (value: number) => void;
  onLightColorChange: (value: string) => void;
  onObjectColorChange: (value: string) => void;
}

export const LightingControls: React.FC<LightingControlsProps> = ({
  lightIntensity,
  lightColor,
  objectColor,
  onLightIntensityChange,
  onLightColorChange,
  onObjectColorChange
}) => {
  return (
    <div className="control-section">
      <h4>Освещение</h4>
      
      <div className="control-group">
        <label>Интенсивность света: {lightIntensity.toFixed(1)}</label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={lightIntensity}
          onChange={(e) => onLightIntensityChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>Цвет света:</label>
        <input
          type="color"
          value={lightColor}
          onChange={(e) => onLightColorChange(e.target.value)}
        />
      </div>

      <div className="control-group">
        <label>Цвет пирамиды:</label>
        <input
          type="color"
          value={objectColor}
          onChange={(e) => onObjectColorChange(e.target.value)}
        />
      </div>
    </div>
  );
};
