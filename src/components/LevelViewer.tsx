import { useEffect, useRef, useCallback, useState } from 'react';
import { LevelData } from '../level/core/types';
import { renderLevelToCanvas } from '../level/renderer/canvasRenderer';

interface LevelViewerProps {
  level: LevelData;
  tileSize: number;
  showNodes: boolean;
  nodeFontSize: number;
}

export function LevelViewer({ level, tileSize, showNodes, nodeFontSize }: LevelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetAtDragStartRef = useRef({ x: 0, y: 0 });

  // Regenerate source canvas when level changes
  useEffect(() => {
    sourceCanvasRef.current = renderLevelToCanvas(level, tileSize, showNodes, nodeFontSize);
    // Auto-fit: scale so the full map fits in the viewport
    const container = containerRef.current;
    if (container && sourceCanvasRef.current) {
      const src = sourceCanvasRef.current;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const fitScale = Math.min(cw / src.width, ch / src.height, 1);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    }
  }, [level, tileSize, showNodes, nodeFontSize]);

  // Draw the canvas on every render (pan/zoom changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    const src = sourceCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !src || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(src, 0, 0);
    ctx.restore();

    // Draw zoom indicator
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cw - 90, ch - 30, 86, 26);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(scale * 100)}%`, cw - 10, ch - 17);
  }, [level, tileSize, showNodes, scale, offset]);

  // Mouse wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(10, scale * zoomFactor));

    // Zoom toward mouse position
    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  // Mouse down — start drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStartRef.current = { x: offset.x, y: offset.y };
  }, [offset]);

  // Mouse move — perform drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: offsetAtDragStartRef.current.x + dx,
      y: offsetAtDragStartRef.current.y + dy,
    });
  }, [isDragging]);

  // Mouse up — end drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset to fit
  const handleReset = useCallback(() => {
    const container = containerRef.current;
    const src = sourceCanvasRef.current;
    if (!container || !src) return;
    const fitScale = Math.min(container.clientWidth / src.width, container.clientHeight / src.height, 1);
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      className="level-viewer"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={() => {
            const newScale = Math.min(10, scale * 1.25);
            setScale(newScale);
          }}
          title="Zoom in"
        >
          +
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button
          className="zoom-btn"
          onClick={() => {
            const newScale = Math.max(0.1, scale * 0.8);
            setScale(newScale);
          }}
          title="Zoom out"
        >
          −
        </button>
        <button className="zoom-btn zoom-reset" onClick={handleReset} title="Reset view">
          ⊞
        </button>
      </div>
      <p className="level-info">
        {level.width} × {level.height} tiles · Seed: {level.seed} ·{' '}
        {level.pathNodes.filter(n => n.isPOI).length} POIs
      </p>
    </div>
  );
}