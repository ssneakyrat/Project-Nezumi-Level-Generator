import { useState } from 'react';
import { DEFAULT_PARAMS, GeneratorParams } from '../level/core/types';

interface GeneratorControlsProps {
  onGenerate: (params: Partial<GeneratorParams>) => void;
  onExport: () => void;
  showNodes: boolean;
  onToggleNodes: () => void;
  nodeFontSize: number;
  onNodeFontSizeChange: (size: number) => void;
}

export function GeneratorControls({
  onGenerate,
  onExport,
  showNodes,
  onToggleNodes,
  nodeFontSize,
  onNodeFontSizeChange,
}: GeneratorControlsProps) {
  const [seed, setSeed] = useState(DEFAULT_PARAMS.seed);
  const [width, setWidth] = useState(DEFAULT_PARAMS.width);
  const [height, setHeight] = useState(DEFAULT_PARAMS.height);
  const [tileSize, setTileSize] = useState(DEFAULT_PARAMS.tileSize);
  const [pathDensity, setPathDensity] = useState(DEFAULT_PARAMS.pathDensity);
  const [forestDensity, setForestDensity] = useState(DEFAULT_PARAMS.forestDensity);
  const [waterLevel, setWaterLevel] = useState(DEFAULT_PARAMS.waterLevel);
  const [mountainLevel, setMountainLevel] = useState(DEFAULT_PARAMS.mountainLevel);

  const handleRandomSeed = () => {
    setSeed(Date.now());
  };

  const handleGenerate = () => {
    onGenerate({
      seed,
      width,
      height,
      tileSize,
      pathDensity,
      forestDensity,
      waterLevel,
      mountainLevel,
    });
  };

  return (
    <div className="generator-controls">
      <h2>Level Generator Controls</h2>

      <div className="control-row">
        <label>
          Seed:
          <input
            type="number"
            value={seed}
            onChange={e => setSeed(Number(e.target.value))}
          />
        </label>
        <button onClick={handleRandomSeed}>🎲 Random</button>
      </div>

      <div className="control-row">
        <label>
          Width:
          <input
            type="range"
            min={32}
            max={160}
            step={8}
            value={width}
            onChange={e => setWidth(Number(e.target.value))}
          />
          <span className="value">{width}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Height:
          <input
            type="range"
            min={24}
            max={120}
            step={8}
            value={height}
            onChange={e => setHeight(Number(e.target.value))}
          />
          <span className="value">{height}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Tile Size:
          <input
            type="range"
            min={4}
            max={32}
            step={2}
            value={tileSize}
            onChange={e => setTileSize(Number(e.target.value))}
          />
          <span className="value">{tileSize}px</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Path Density:
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={pathDensity}
            onChange={e => setPathDensity(Number(e.target.value))}
          />
          <span className="value">{pathDensity.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Forest Density:
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={forestDensity}
            onChange={e => setForestDensity(Number(e.target.value))}
          />
          <span className="value">{forestDensity.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Water Level:
          <input
            type="range"
            min={0.2}
            max={0.6}
            step={0.01}
            value={waterLevel}
            onChange={e => setWaterLevel(Number(e.target.value))}
          />
          <span className="value">{waterLevel.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Mountain Level:
          <input
            type="range"
            min={0.5}
            max={0.9}
            step={0.01}
            value={mountainLevel}
            onChange={e => setMountainLevel(Number(e.target.value))}
          />
          <span className="value">{mountainLevel.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Node Font Size:
          <input
            type="range"
            min={6}
            max={28}
            step={1}
            value={nodeFontSize}
            onChange={e => onNodeFontSizeChange(Number(e.target.value))}
          />
          <span className="value">{nodeFontSize}px</span>
        </label>
      </div>

      <div className="button-row">
        <button className="btn-generate" onClick={handleGenerate}>
          Generate Level
        </button>
        <button className="btn-export" onClick={onExport}>
          Export PNG
        </button>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showNodes}
            onChange={onToggleNodes}
          />
          Show Nodes
        </label>
      </div>
    </div>
  );
}