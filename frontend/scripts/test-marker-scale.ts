import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGaugeScale,
  gaugeZoneSegments,
  needleRotation,
  position,
} from "../src/lib/markerScale";
import type { Marker } from "../src/lib/types";

function marker(overrides: Partial<Marker>): Marker {
  return {
    name: "Marker",
    value: 65,
    value_text: "65",
    unit: "mg/dL",
    ref_raw: "30 - 100",
    ref_low: 30,
    ref_high: 100,
    status: "normal",
    ...overrides,
  };
}

test("position clamps and maps values onto the gauge", () => {
  assert.equal(position(30, 30, 100), 0);
  assert.equal(position(65, 30, 100), 0.5);
  assert.equal(position(100, 30, 100), 1);
  assert.equal(position(10, 30, 100), 0);
  assert.equal(position(120, 30, 100), 1);
});

test("needle rotation runs from -90 to 90 degrees", () => {
  assert.equal(needleRotation(0), -90);
  assert.equal(needleRotation(0.5), 0);
  assert.equal(needleRotation(1), 90);
});

test("two-sided reference range creates low, normal, and high zones", () => {
  const scale = buildGaugeScale(marker({ value: 65, ref_low: 30, ref_high: 100 }));
  assert.ok(scale);
  assert.equal(scale.scaleMin, 15);
  assert.equal(scale.scaleMax, 150);
  assert.ok(Math.abs(scale.valuePosition - 50 / 135) < 1e-9);
  assert.ok(Math.abs(scale.needleRotation - (-90 + (50 / 135) * 180)) < 1e-9);
  assert.deepEqual(
    scale.zones.map((zone) => zone.kind),
    ["low", "normal", "high"]
  );
  assert.ok(Math.abs(scale.zones[1].start - 15 / 135) < 1e-9);
  assert.ok(Math.abs(scale.zones[1].end - 85 / 135) < 1e-9);
});

test("high-only reference range uses zero as the minimum", () => {
  const scale = buildGaugeScale(
    marker({ value: 120, ref_low: null, ref_high: 100, ref_raw: "< 100", status: "high" })
  );
  assert.ok(scale);
  assert.equal(scale.scaleMin, 0);
  assert.equal(scale.scaleMax, 150);
  assert.equal(scale.valuePosition, 0.8);
  assert.equal(scale.needleRotation, 54);
  assert.deepEqual(
    scale.zones.map((zone) => zone.kind),
    ["normal", "high"]
  );
});

test("low-only reference range creates a low zone below the threshold", () => {
  const scale = buildGaugeScale(
    marker({ value: 30, ref_low: 40, ref_high: null, ref_raw: "> 40", status: "low" })
  );
  assert.ok(scale);
  assert.equal(scale.scaleMin, 20);
  assert.equal(scale.scaleMax, 80);
  assert.ok(Math.abs(scale.valuePosition - 1 / 6) < 1e-9);
  assert.equal(scale.needleRotation, -60);
  assert.deepEqual(
    scale.zones.map((zone) => zone.kind),
    ["low", "normal"]
  );
});

test("gauge zone segments cover the arc without overlap", () => {
  const cases: Array<{ label: string; marker: Marker }> = [
    {
      label: "Vitamin D 25 low",
      marker: marker({
        name: "Vitamin D 25",
        value: 25,
        value_text: "25",
        unit: "ng/mL",
        ref_raw: "30 - 100",
        ref_low: 30,
        ref_high: 100,
        status: "low",
      }),
    },
    {
      label: "LDL high",
      marker: marker({
        name: "LDL",
        value: 128,
        value_text: "128",
        unit: "mg/dL",
        ref_raw: "< 100",
        ref_low: null,
        ref_high: 100,
        status: "high",
      }),
    },
    {
      label: "HDL normal",
      marker: marker({
        name: "HDL",
        value: 55,
        value_text: "55",
        unit: "mg/dL",
        ref_raw: "> 40",
        ref_low: 40,
        ref_high: null,
        status: "normal",
      }),
    },
  ];

  for (const { label, marker: testMarker } of cases) {
    const scale = buildGaugeScale(testMarker);
    assert.ok(scale, label);

    const segments = gaugeZoneSegments(scale.zones);
    assert.ok(segments.length > 0, label);

    let previousTo = 0;
    for (const segment of segments) {
      assert.ok(segment.from >= previousTo - 1e-9, `${label}: zones overlap`);
      assert.ok(segment.to > segment.from, `${label}: zone length must be positive`);
      assert.ok(segment.to <= 1 + 1e-9, `${label}: zone exceeds arc`);
      previousTo = segment.to;
    }

    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
    assert.ok(Math.abs(totalLength - 100) < 1e-9, `${label}: zones must total 100`);
  }
});

test("markers without a value or reference range do not get a gauge", () => {
  assert.equal(
    buildGaugeScale(
      marker({ value: null, ref_low: null, ref_high: null, ref_raw: "", status: "unknown" })
    ),
    null
  );
});
