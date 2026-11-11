"use client";
import React from "react";

interface RangeGaugeProps {
  value: number;
  range: [number, number];
  status: "Low" | "High" | "Normal";
  unit?: string;
}

export default function RangeGauge({ value, range, status, unit }: RangeGaugeProps) {
  const [minRef, maxRef] = range;
  const refSpan = maxRef - minRef || 1;
  const margin = refSpan * 0.15;
  const domainMin = minRef - margin;
  const domainMax = maxRef + margin;
  const domainSpan = domainMax - domainMin || 1;

  // Map value to 0..1 scale across domain
  const clampedVal = Math.max(domainMin, Math.min(domainMax, value));
  const normalizedVal = (clampedVal - domainMin) / domainSpan;

  // Angle in degrees: 0° is far left (Low), 180° is far right (High)
  const angleDeg = normalizedVal * 180;
  const angleRad = (Math.PI * (180 - angleDeg)) / 180;

  // Responsive gauge dimensions (scales with the SVG viewBox)
  const viewBoxWidth = 160;
  const viewBoxHeight = 130;
  const cx = 80;
  const cy = 82;
  const r = 64;
  const strokeWidth = 13;

  // Arc path generator helper: startAngle and endAngle in degrees (180 to 0)
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const rad = ((180 - angleInDegrees) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY - radius * Math.sin(rad),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  // Color mappings
  const STATUS_COLOR = {
    Low: "var(--nutrition-text)",
    Normal: "var(--medical-text)",
    High: "var(--exercise-text)",
  };

  // Segment angles based on reference range boundaries
  const lowAngleEnd = ((minRef - domainMin) / domainSpan) * 180;
  const highAngleStart = ((maxRef - domainMin) / domainSpan) * 180;

  // Needle tip coordinates
  const needleLength = r - 9;
  const needleTipX = cx + needleLength * Math.cos(angleRad);
  const needleTipY = cy - needleLength * Math.sin(angleRad);

  const displayValue = `${value}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      className="w-full max-w-[160px] select-none"
      title={`Value: ${value} (Ref: ${minRef} - ${maxRef})`}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${displayValue}, reference range ${minRef} to ${maxRef}, status ${status}`}
      >
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, 0, 180)}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Low segment (out-of-range left) */}
        <path
          d={describeArc(cx, cy, r, 0, lowAngleEnd)}
          fill="none"
          stroke="#93C5FD"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Normal segment (in-range center) */}
        <path
          d={describeArc(cx, cy, r, lowAngleEnd, highAngleStart)}
          fill="none"
          stroke="#86EFAC"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* High segment (out-of-range right) */}
        <path
          d={describeArc(cx, cy, r, highAngleStart, 180)}
          fill="none"
          stroke="#FCA5A5"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Needle Line */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTipX}
          y2={needleTipY}
          stroke={STATUS_COLOR[status] || "#475569"}
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Pivot Center Dot */}
        <circle cx={cx} cy={cy} r="7.5" fill={STATUS_COLOR[status] || "#475569"} />
        <circle cx={cx} cy={cy} r="2.5" fill="#FFFFFF" />

        {/* Reference range end labels */}
        <text
          x={cx - r}
          y={104}
          textAnchor="middle"
          fontSize={12}
          fontWeight={500}
          fill="currentColor"
          className="text-muted-foreground"
        >
          {minRef}
        </text>
        <text
          x={cx + r}
          y={104}
          textAnchor="middle"
          fontSize={12}
          fontWeight={500}
          fill="currentColor"
          className="text-muted-foreground"
        >
          {maxRef}
        </text>

        {/* Measured value */}
        <text
          x={cx}
          y={124}
          textAnchor="middle"
          fontWeight={700}
          fill="currentColor"
          className="text-foreground"
        >
          <tspan fontSize={16}>{value}</tspan>
          {unit ? (
            <tspan fontSize={12} fontWeight={500} fill="currentColor" className="text-muted-foreground">
              {" "}{unit}
            </tspan>
          ) : null}
        </text>
      </svg>
    </div>
  );
}
