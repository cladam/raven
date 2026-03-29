import React from 'react';
import { CellData, ShapeType, ColorType, SizeType } from './types';

interface ShapeCellProps {
  data: CellData;
  cellSize?: number;
}

const SIZE_SCALE: Record<SizeType, number> = {
  small: 0.4,
  medium: 0.6,
  large: 0.85,
};

const COLOR_MAP: Record<ColorType, { fill: string; stroke: string }> = {
  black: { fill: '#222222', stroke: '#000000' },
  gray: { fill: '#999999', stroke: '#666666' },
  white: { fill: '#ffffff', stroke: '#333333' },
};

function renderShape(
  shape: ShapeType,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  stroke: string
): React.ReactNode {
  const strokeWidth = 2;

  switch (shape) {
    case 'circle':
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

    case 'square': {
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

    case 'triangle': {
      const h = radius * 1.8;
      const halfBase = radius * 1.1;
      const topY = cy - h * 0.55;
      const bottomY = cy + h * 0.45;
      const points = [
        `${cx},${topY}`,
        `${cx - halfBase},${bottomY}`,
        `${cx + halfBase},${bottomY}`,
      ].join(' ');
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
  const scale = SIZE_SCALE[size];
  const radius = (cellSize / 2) * scale;
  const { fill, stroke } = COLOR_MAP[color];
  const center = cellSize / 2;

  return (
    <svg
      width={cellSize}
      height={cellSize}
      viewBox={`0 0 ${cellSize} ${cellSize}`}
      style={{ display: 'block' }}
    >
      {renderShape(shape, center, center, radius, fill, stroke)}
    </svg>
  );
};

export default ShapeCell;
