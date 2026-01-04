import React from 'react';

interface ModelLoaderProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({ onFileSelect, fileInputRef }) => {
  return (
    <div className="control-section">
      <h4>Загрузка модели</h4>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gltf,.glb,.obj,.fbx"
        onChange={onFileSelect}
        style={{ fontSize: '12px', marginBottom: '10px' }}
      />
      <p style={{ fontSize: '11px', color: '#aaa', margin: '5px 0' }}>
        Поддерживаемые форматы: GLTF, GLB, OBJ, FBX
      </p>
    </div>
  );
};
