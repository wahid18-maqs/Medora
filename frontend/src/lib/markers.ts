import type { Marker, MarkerStatus } from "./types";

type MarkerInput = Partial<Omit<Marker, "value" | "status">> & {
  marker?: string;
  value?: number | string | null;
  status?: MarkerStatus | string;
  reference_range?: string | null;
};

const STATUS_ORDER: Record<MarkerStatus, number> = {
  high: 0,
  low: 1,
  normal: 2,
  unknown: 3,
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function normalizedStatus(value: unknown): MarkerStatus {
  const status = String(value ?? "").toLowerCase();
  if (status === "low" || status === "high" || status === "normal" || status === "unknown") {
    return status;
  }
  return "unknown";
}

export function deriveStatus(
  value: number | null,
  refLow: number | null,
  refHigh: number | null
): MarkerStatus {
  if (value === null || (refLow === null && refHigh === null)) return "unknown";
  if (refLow !== null && value < refLow) return "low";
  if (refHigh !== null && value > refHigh) return "high";
  return "normal";
}

export function normalizeMarker(marker: MarkerInput): Marker {
  const valueText =
    marker.value_text?.trim() ||
    (marker.value !== null && marker.value !== undefined ? String(marker.value) : "");
  const value = toNumber(marker.value) ?? toNumber(valueText);
  const range = Array.isArray(marker.range) ? marker.range : null;
  const refLow = marker.ref_low ?? range?.[0] ?? null;
  const refHigh = marker.ref_high ?? range?.[1] ?? null;
  const refRaw =
    marker.ref_raw?.trim() ||
    marker.reference_range?.trim() ||
    (refLow !== null && refHigh !== null ? `${refLow}–${refHigh}` : "");

  return {
    ...marker,
    name: marker.name || marker.marker || "",
    value,
    value_text: valueText || (value !== null ? String(value) : ""),
    unit: marker.unit || "",
    ref_raw: refRaw,
    ref_low: refLow,
    ref_high: refHigh,
    status:
      marker.status && normalizedStatus(marker.status) !== "unknown"
        ? normalizedStatus(marker.status)
        : deriveStatus(value, refLow, refHigh),
    needs_review: Boolean(marker.needs_review),
  };
}

export function normalizeMarkers(markers: MarkerInput[] | null | undefined): Marker[] {
  return (markers ?? []).map(normalizeMarker);
}

export function markerValueText(marker: Marker): string {
  return marker.value_text || (marker.value !== null ? String(marker.value) : "Not reported");
}

export function markerReferenceText(marker: Marker): string {
  if (marker.ref_raw) return marker.ref_raw;
  if (marker.ref_low !== null && marker.ref_high !== null) {
    return `${marker.ref_low}–${marker.ref_high}`;
  }
  if (marker.ref_low !== null) return `> ${marker.ref_low}`;
  if (marker.ref_high !== null) return `< ${marker.ref_high}`;
  return "No reference range";
}

export function markerReferenceLabel(marker: Marker): string {
  return `Reference ${markerReferenceText(marker)}`;
}

export function markerStatusLabel(status: MarkerStatus): string {
  if (status === "high") return "High";
  if (status === "low") return "Low";
  if (status === "normal") return "Normal";
  return "Not reported";
}

export function isFlaggedMarker(marker: Marker): boolean {
  return marker.status === "high" || marker.status === "low";
}

export function sortMarkers(markers: Marker[]): Marker[] {
  return [...markers].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name)
  );
}
