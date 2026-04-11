import React from "react";
import { CellData, ShapeType, FillPatternType } from "./types";
import config from "./config";

interface ShapeCellProps {
  data: CellData;
  cellSize?: number;
}

// ---- Unique ID counter for SVG pattern/clip defs ----

let idCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

// ---- Shape path builders ----
// Each returns an SVG path `d` string centred on (cx, cy) with the given radius.

function shapePath(
  shape: ShapeType,
  cx: number,
  cy: number,
  radius: number,
): string {
  switch (shape) {
    case "circle":
      return circlePath(cx, cy, radius);
    case "square":
      return squarePath(cx, cy, radius);
    case "triangle":
      return trianglePath(cx, cy, radius);
    case "diamond":
      return diamondPath(cx, cy, radius);
    case "pentagon":
      return regularPolygonPath(cx, cy, radius, 5, -Math.PI / 2);
    case "hexagon":
      return regularPolygonPath(cx, cy, radius, 6, 0);
    case "star":
      return starPath(cx, cy, radius, 5);
    case "cross":
      return crossShapePath(cx, cy, radius);
    case "arrow":
      return arrowPath(cx, cy, radius);
    default:
      return circlePath(cx, cy, radius);
  }
}

function circlePath(cx: number, cy: number, r: number): string {
  // Two-arc approximation of a full circle
  return [
    `M ${cx - r} ${cy}`,
    `A ${r} ${r} 0 1 0 ${cx + r} ${cy}`,
    `A ${r} ${r} 0 1 0 ${cx - r} ${cy}`,
    "Z",
  ].join(" ");
}

function squarePath(cx: number, cy: number, r: number): string {
  const half = r * 0.85;
  return [
    `M ${cx - half} ${cy - half}`,
    `L ${cx + half} ${cy - half}`,
    `L ${cx + half} ${cy + half}`,
    `L ${cx - half} ${cy + half}`,
    "Z",
  ].join(" ");
}

function trianglePath(cx: number, cy: number, r: number): string {
  const h = r * 1.8;
  const halfBase = r * 1.1;
  const topY = cy - h * 0.55;
  const bottomY = cy + h * 0.45;
  return [
    `M ${cx} ${topY}`,
    `L ${cx - halfBase} ${bottomY}`,
    `L ${cx + halfBase} ${bottomY}`,
    "Z",
  ].join(" ");
}

function diamondPath(cx: number, cy: number, r: number): string {
  const rx = r * 0.75;
  const ry = r * 1.05;
  return [
    `M ${cx} ${cy - ry}`,
    `L ${cx + rx} ${cy}`,
    `L ${cx} ${cy + ry}`,
    `L ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function regularPolygonPath(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  startAngle: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (2 * Math.PI * i) / sides;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    pts.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function starPath(cx: number, cy: number, r: number, points: number): string {
  const innerR = r * 0.42;
  const pts: string[] = [];
  const startAngle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const angle = startAngle + (Math.PI * i) / points;
    const rad = i % 2 === 0 ? r : innerR;
    const px = cx + rad * Math.cos(angle);
    const py = cy + rad * Math.sin(angle);
    pts.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function crossShapePath(cx: number, cy: number, r: number): string {
  // A plus/cross shape
  const arm = r * 0.95;
  const t = r * 0.32; // half-thickness of arm
  return [
    `M ${cx - t} ${cy - arm}`,
    `L ${cx + t} ${cy - arm}`,
    `L ${cx + t} ${cy - t}`,
    `L ${cx + arm} ${cy - t}`,
    `L ${cx + arm} ${cy + t}`,
    `L ${cx + t} ${cy + t}`,
    `L ${cx + t} ${cy + arm}`,
    `L ${cx - t} ${cy + arm}`,
    `L ${cx - t} ${cy + t}`,
    `L ${cx - arm} ${cy + t}`,
    `L ${cx - arm} ${cy - t}`,
    `L ${cx - t} ${cy - t}`,
    "Z",
  ].join(" ");
}

function arrowPath(cx: number, cy: number, r: number): string {
  // Upward-pointing arrow (chevron head + narrow shaft)
  const headW = r * 0.95;
  const headH = r * 0.65;
  const shaftW = r * 0.28;
  const shaftH = r * 0.7;
  const topY = cy - r * 0.85;
  return [
    `M ${cx} ${topY}`,
    `L ${cx + headW} ${topY + headH}`,
    `L ${cx + shaftW} ${topY + headH}`,
    `L ${cx + shaftW} ${topY + headH + shaftH}`,
    `L ${cx - shaftW} ${topY + headH + shaftH}`,
    `L ${cx - shaftW} ${topY + headH}`,
    `L ${cx - headW} ${topY + headH}`,
    "Z",
  ].join(" ");
}

// ---- SVG fill-pattern definitions ----

/**
 * Returns a <defs> block containing a <pattern> and a <clipPath> so that the
 * shape can be filled with a tiled texture (hatching, dots, cross-hatch).
 *
 * For "solid" we skip the pattern entirely and just use flat fill.
 */
function renderFillPatternDefs(
  patternType: FillPatternType,
  patternId: string,
  clipId: string,
  pathD: string,
  strokeColor: string,
): React.ReactNode {
  if (patternType === "solid") return null;

  const patternSize = 6;
  let patternContent: React.ReactNode = null;

  switch (patternType) {
    case "hatched":
      patternContent = (
        <line
          x1={0}
          y1={0}
          x2={patternSize}
          y2={patternSize}
          stroke={strokeColor}
          strokeWidth={1}
        />
      );
      break;

    case "dotted":
      patternContent = (
        <circle
          cx={patternSize / 2}
          cy={patternSize / 2}
          r={1.1}
          fill={strokeColor}
        />
      );
      break;

    case "crossHatch":
      patternContent = (
        <>
          <line
            x1={0}
            y1={0}
            x2={patternSize}
            y2={patternSize}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
          <line
            x1={patternSize}
            y1={0}
            x2={0}
            y2={patternSize}
            stroke={strokeColor}
            strokeWidth={0.8}
          />
        </>
      );
      break;
  }

  return (
    <>
      <pattern
        id={patternId}
        patternUnits="userSpaceOnUse"
        width={patternSize}
        height={patternSize}
      >
        {patternContent}
      </pattern>
      <clipPath id={clipId}>
        <path d={pathD} />
      </clipPath>
    </>
  );
}

// ---- Inner-line renderer ----

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
    case "cross":
      return (
        <>
          <line
            x1={cx - halfLen}
            y1={cy}
            x2={cx + halfLen}
            y2={cy}
            stroke={lineColor}
            strokeWidth={lineWidth}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy - halfLen}
            x2={cx}
            y2={cy + halfLen}
            stroke={lineColor}
            strokeWidth={lineWidth}
            strokeLinecap="round"
          />
        </>
      );
    default:
      return null;
  }
}

// ---- Single-shape renderer (shape + fill-pattern + inner-line + rotation) ----

function renderSingleShape(
  shape: ShapeType,
  cx: number,
  cy: number,
  radius: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
  innerLine: string,
  innerLineColor: string,
  innerLineStrokeWidth: number,
  rotation: string,
  fillPattern: FillPatternType,
  key: number | string,
): React.ReactNode {
  const rotDeg = parseInt(rotation, 10) || 0;
  const transform =
    rotDeg !== 0 ? `rotate(${rotDeg}, ${cx}, ${cy})` : undefined;

  const pathD = shapePath(shape, cx, cy, radius);
  const isSolid = !fillPattern || fillPattern === "solid";

  // Generate unique ids for pattern / clip when needed
  const patternId = isSolid ? "" : uniqueId("fp");
  const clipId = isSolid ? "" : uniqueId("cl");

  return (
    <g key={key} transform={transform}>
      {/* Pattern + clip defs (only for non-solid fills) */}
      {!isSolid && (
        <defs>
          {renderFillPatternDefs(
            fillPattern,
            patternId,
            clipId,
            pathD,
            strokeColor,
          )}
        </defs>
      )}

      {/* Shape outline + base fill */}
      <path
        d={pathD}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Pattern overlay clipped to shape */}
      {!isSolid && (
        <rect
          x={cx - radius}
          y={cy - radius}
          width={radius * 2}
          height={radius * 2}
          fill={`url(#${patternId})`}
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* Inner line(s) */}
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

// ---- Main component ----

const ShapeCell: React.FC<ShapeCellProps> = ({ data, cellSize = 80 }) => {
  const { shape, color, size, innerLine, rotation, shapeCount, fillPattern } =
    data;
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

  // Compute positions for 1 / 2 / 3 stacked shapes
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
          fillPattern ?? "solid",
          i,
        ),
      )}
    </svg>
  );
};

export default ShapeCell;
