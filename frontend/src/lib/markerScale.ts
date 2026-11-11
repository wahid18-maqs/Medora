import type { Marker } from "./types";

export interface GaugeZone {
  kind: "low" | "normal" | "high";
  start: number;
  end: number;
}

export interface GaugeScale {
  scaleMin: number;
  scaleMax: number;
  valuePosition: number;
  needleRotation: number;
  zones: GaugeZone[];
}

export interface GaugeZoneSegment {
  kind: GaugeZone["kind"];
  from: number;
  to: number;
  length: number;
}

export function gaugeZoneSegments(zones: GaugeZone[]): GaugeZoneSegment[] {
  return zones
    .map((zone) => {
      const from = clamp(zone.start, 0, 1);
      const to = clamp(zone.end, 0, 1);
      return {
        kind: zone.kind,
        from,
        to,
        length: (to - from) * 100,
      };
    })
    .filter((segment) => segment.length > 0);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function position(value: number, scaleMin: number, scaleMax: number): number {
  if (scaleMax === scaleMin) return 0.5;
  return clamp((value - scaleMin) / (scaleMax - scaleMin), 0, 1);
}

export function needleRotation(valuePosition: number): number {
  return -90 + valuePosition * 180;
}

export function buildGaugeScale(marker: Marker): GaugeScale | null {
  if (marker.value === null || (marker.ref_low === null && marker.ref_high === null)) {
    return null;
  }

  const value = marker.value;
  let scaleMin: number;
  let scaleMax: number;

  if (marker.ref_low !== null && marker.ref_high !== null) {
    scaleMin = Math.min(marker.ref_low * 0.5, value * 0.8);
    scaleMax = Math.max(marker.ref_high * 1.5, value * 1.2);
  } else if (marker.ref_high !== null) {
    scaleMin = 0;
    scaleMax = Math.max(marker.ref_high * 1.5, value * 1.2);
  } else {
    scaleMin = Math.min((marker.ref_low as number) * 0.5, value * 0.8);
    scaleMax = Math.max((marker.ref_low as number) * 2, value * 1.8);
  }

  if (scaleMax <= scaleMin) {
    scaleMin = Math.min(scaleMin, value - 1);
    scaleMax = Math.max(scaleMax, value + 1);
  }

  const valuePosition = position(value, scaleMin, scaleMax);
  const zones: GaugeZone[] = [];

  if (marker.ref_low !== null && marker.ref_high !== null) {
    const normalStart = position(marker.ref_low, scaleMin, scaleMax);
    const normalEnd = position(marker.ref_high, scaleMin, scaleMax);
    zones.push({ kind: "low", start: 0, end: normalStart });
    zones.push({ kind: "normal", start: normalStart, end: normalEnd });
    zones.push({ kind: "high", start: normalEnd, end: 1 });
  } else if (marker.ref_high !== null) {
    const normalEnd = position(marker.ref_high, scaleMin, scaleMax);
    zones.push({ kind: "normal", start: 0, end: normalEnd });
    zones.push({ kind: "high", start: normalEnd, end: 1 });
  } else {
    const normalStart = position(marker.ref_low as number, scaleMin, scaleMax);
    zones.push({ kind: "low", start: 0, end: normalStart });
    zones.push({ kind: "normal", start: normalStart, end: 1 });
  }

  return {
    scaleMin,
    scaleMax,
    valuePosition,
    needleRotation: needleRotation(valuePosition),
    zones: zones.filter((zone) => zone.end > zone.start),
  };
}
