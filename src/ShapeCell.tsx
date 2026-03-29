import React from "react";
import { CellData, ShapeType } from "./types";
import config from "./config";

interface ShapeCellProps {
  data: CellData;
  cellSize?: number;
}

function renderShape(
  shape: ShapeType,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): React.ReactNode {
  switch (shape) {
    case "circle":
      return (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case "square": {
      const side = radius * 1.7;
      return (
        <rect
          x={cx - side / 2}
          y={cy - side / 2}
          width={side}
          height={side}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case "triangle": {
      const h = radius * 1.8;
      const halfBase = radius * 1.1;
      const topY = cy - h * 0.55;
      const bottomY = cy + h * 0.45;
      const points = [
        `${cx},${topY}`,
        `${cx - halfBase},${bottomY}`,
        `${cx + halfBase},${bottomY}`,
      ].join(" ");
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    default:
      return null;
  }
}

const ShapeCell: React.FC<ShapeCellProps> = ({ data, cellSize = 80 }) => {
  const { shape, color, size } = data;
  const { sizeScales, colorMap, strokeWidth } = config.rendering;

  const scale = sizeScales[size] ?? 0.55;
  const radius = (cellSize / 2) * scale;

  const colorEntry = colorMap[color] ?? { fill: "#888888", stroke: "#444444" };
  const { fill, stroke } = colorEntry;

  const center = cellSize / 2;

  return (
    <svg
      width={cellSize}
      height={cellSize}
      viewBox={`0 0 ${cellSize} ${cellSize}`}
      style={{ display: "block" }}
    >
      {renderShape(shape, center, center, radius, fill, stroke, strokeWidth)}
    </svg>
  );
};

export default ShapeCell;
