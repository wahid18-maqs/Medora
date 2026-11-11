import type { Marker } from "@/lib/types";
import { sortMarkers } from "@/lib/markers";
import MarkerGauge from "./MarkerGauge";

export default function DetailedBreakdownTable({ markers }: { markers: Marker[] }) {
  if (!markers || markers.length === 0) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
      {sortMarkers(markers).map((marker, index) => (
        <MarkerGauge key={`${marker.name}-${marker.value_text}-${index}`} marker={marker} />
      ))}
    </div>
  );
}
