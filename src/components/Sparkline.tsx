import React, { useEffect, useRef } from "react";
import { ISparklineProps } from "../types/types";

export const Sparkline: React.FC<ISparklineProps> = ({ history }) => {
  if (history.length < 2) {
    return <span className="text-slate-600">Waiting</span>;
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return () => {};

    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    // Clear previous vector map frame safely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Convert string array to raw numbers for boundaries evaluation
    const numericValues = history.map((v) => parseFloat(v));
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = max - min === 0 ? 1 : max - min;

    // Draw the sparkline graph vector path
    ctx.beginPath();
    ctx.strokeStyle = "#6366f1"; // Indigo theme chart stroke line
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    history.forEach((val, idx) => {
      const x = (idx / (history.length - 1)) * canvas.width;

      // Invert Y coordinates so lower market prices sit near the bottom frame line
      const y =
        canvas.height - ((parseFloat(val) - min) / range) * canvas.height;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Return empty cleanup method
    return () => {};
  }, [history]);

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={24}
      className="opacity-80 block align-middle"
      aria-hidden="true" // Hides raw graph calculations from screen readers for accessibility
    />
  );
};
