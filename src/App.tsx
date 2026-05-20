import { useState, useCallback, useEffect } from 'react';
import './App.css';
import { generateLevel } from './level/generators';
import { downloadLevelPNG } from './level/renderer/canvasRenderer';
import { LevelData, GeneratorParams, DEFAULT_PARAMS } from './level/core/types';
import { LevelViewer } from './components/LevelViewer';
import { GeneratorControls } from './components/GeneratorControls';

function App() {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [tileSize, setTileSize] = useState(DEFAULT_PARAMS.tileSize);
  const [showNodes, setShowNodes] = useState(false);
  const [nodeFontSize, setNodeFontSize] = useState(8);

  // Generate initial level after mount — avoids blocking the WebView render on startup
  useEffect(() => {
    const initial = generateLevel();
    setLevel(initial);
  }, []);

  const handleGenerate = useCallback((params: Partial<GeneratorParams>) => {
    if (params.tileSize !== undefined) {
      setTileSize(params.tileSize);
    }
    const newLevel = generateLevel(params);
    setLevel(newLevel);
  }, []);

  const handleExport = useCallback(() => {
    if (!level) return;
    downloadLevelPNG(level, tileSize, `level-${level.seed}.png`);
  }, [level, tileSize]);

  const handleToggleNodes = useCallback(() => {
    setShowNodes(prev => !prev);
  }, []);

  const handleNodeFontSizeChange = useCallback((size: number) => {
    setNodeFontSize(size);
  }, []);

  return (
    <main className="app-container">
      <h1>Project Nezumi — Level Generator</h1>
      <p className="subtitle">Open terrain with branching paths (Fantasy RPG)</p>

      <div className="layout">
        <aside className="sidebar">
          <GeneratorControls
            onGenerate={handleGenerate}
            onExport={handleExport}
            showNodes={showNodes}
            onToggleNodes={handleToggleNodes}
            nodeFontSize={nodeFontSize}
            onNodeFontSizeChange={handleNodeFontSizeChange}
          />
        </aside>

        <section className="viewport">
          {level ? (
            <LevelViewer
              level={level}
              tileSize={tileSize}
              showNodes={showNodes}
              nodeFontSize={nodeFontSize}
            />
          ) : (
            <div className="loading">Generating level...</div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;