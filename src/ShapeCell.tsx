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

function renderInnerLine(
  innerLine: string,
  cx: number,
  cy: number,
  radius: number,
  lineColor: string,
  lineWidth: number,
): React.ReactNode {
  if (innerLine === "none" || !innerLine) return null;

  const halfLen = radius * 0.75;

  switch (innerLine) {
    case "horizontal":
      return (
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeLinecap="round"
        />
      );
    case "vertical":
      return (
        <line
          x1={cx}
          y1={cy - halfLen}
          x2={cx}
          y2={cy + halfLen}
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeLinecap="round"
        />
      );
    case "diagonal":
      return (
        <line
          x1={cx - halfLen}
          y1={cy - halfLen}
          x2={cx + halfLen}
          y2={cy + halfLen}
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

function renderSingleShape(
  shape: ShapeType,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  innerLine: string,
  innerLineColor: string,
  innerLineStrokeWidth: number,
  rotation: string,
  key: number | string,
): React.ReactNode {
  const rotDeg = parseInt(rotation, 10) || 0;
  const transform =
    rotDeg !== 0 ? `rotate(${rotDeg}, ${cx}, ${cy})` : undefined;

  return (
    <g key={key} transform={transform}>
      {renderShape(shape, cx, cy, radius, fill, stroke, strokeWidth)}
      {renderInnerLine(
        innerLine,
        cx,
        cy,
        radius,
        innerLineColor,
        innerLineStrokeWidth,
      )}
    </g>
  );
}

const ShapeCell: React.FC<ShapeCellProps> = ({ data, cellSize = 80 }) => {
  const { shape, color, size, innerLine, rotation, shapeCount } = data;
  const {
    sizeScales,
    colorMap,
    strokeWidth,
    innerLineColor,
    innerLineStrokeWidth,
  } = config.rendering;

  const scale = sizeScales[size] ?? 0.55;
  const radius = (cellSize / 2) * scale;

  const colorEntry = colorMap[color] ?? { fill: "#888888", stroke: "#444444" };
  const { fill, stroke } = colorEntry;

  const center = cellSize / 2;
  const count = parseInt(shapeCount, 10) || 1;

  const positions: Array<{ cx: number; cy: number; r: number }> = [];
  if (count === 1) {
    positions.push({ cx: center, cy: center, r: radius });
  } else if (count === 2) {
    const r = radius * 0.65;
    positions.push({ cx: center, cy: cellSize * 0.3, r });
    positions.push({ cx: center, cy: cellSize * 0.7, r });
  } else {
    const r = radius * 0.5;
    positions.push({ cx: center, cy: cellSize * 0.2, r });
    positions.push({ cx: center, cy: cellSize * 0.5, r });
    positions.push({ cx: center, cy: cellSize * 0.8, r });
  }

  return (
    <svg
      width={cellSize}
      height={cellSize}
      viewBox={`0 0 ${cellSize} ${cellSize}`}
      style={{ display: "block" }}
    >
      {positions.map((pos, i) =>
        renderSingleShape(
          shape,
          pos.cx,
          pos.cy,
          pos.r,
          fill,
          stroke,
          strokeWidth,
          innerLine ?? "none",
          innerLineColor ?? "#444444",
          innerLineStrokeWidth ?? 1.5,
          rotation ?? "0",
          i,
        ),
      )}
    </svg>
  );
};

export default ShapeCell;
