import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

interface ImageCropperProps {
  src: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
  size?: number; // output px, default 400
}

const CANVAS = 280; // display canvas size

const ImageCropper = ({ src, onCrop, onCancel, size = 400 }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Fit image to canvas initially
      const fit = Math.max(CANVAS / img.naturalWidth, CANVAS / img.naturalHeight);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS, CANVAS);

    // Draw image
    const iw = imgNaturalSize.w * scale;
    const ih = imgNaturalSize.h * scale;
    const ix = CANVAS / 2 - iw / 2 + offset.x;
    const iy = CANVAS / 2 - ih / 2 + offset.y;
    ctx.drawImage(img, ix, iy, iw, ih);

    // Dim outside circle
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(CANVAS / 2, CANVAS / 2, CANVAS / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle border
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS / 2, CANVAS / 2, CANVAS / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }, [scale, offset, imgNaturalSize]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.mx,
      y: dragStart.current.oy + e.clientY - dragStart.current.my,
    });
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(8, Math.max(0.2, s - e.deltaY * 0.001)));
  }, []);

  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d")!;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Scale from display canvas to output size
    const ratio = size / CANVAS;
    const iw = imgNaturalSize.w * scale * ratio;
    const ih = imgNaturalSize.h * scale * ratio;
    const ix = size / 2 - iw / 2 + offset.x * ratio;
    const iy = size / 2 - ih / 2 + offset.y * ratio;
    ctx.drawImage(img, ix, iy, iw, ih);

    out.toBlob((blob) => { if (blob) onCrop(blob); }, "image/jpeg", 0.92);
  }, [imgNaturalSize, scale, offset, size, onCrop]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl p-5 flex flex-col items-center gap-4 shadow-2xl border border-border w-80"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-semibold text-foreground">Crop Photo</span>
          <button onClick={onCancel} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground -mt-2">Drag to reposition · scroll to zoom</p>

        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          className="rounded-full cursor-grab active:cursor-grabbing touch-none"
          style={{ width: CANVAS, height: CANVAS }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        />

        {/* Zoom slider */}
        <div className="flex items-center gap-2 w-full">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="range" min={0.2} max={8} step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <div className="flex gap-2 w-full">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground hover:bg-muted/80 transition-colors">
            Cancel
          </button>
          <button onClick={handleCrop} className="flex-1 py-2 rounded-xl gradient-primary text-sm text-primary-foreground font-semibold flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> Apply
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ImageCropper;
