/**
 * Apply baseline chart styles (derived from teplo charts AIT-1 .. KTS-28)
 * to the remaining teplo charts (order > KTS-28), per resolution.
 *
 * - Reads: server/storage/configs.json (ChartConfig per chartId+resolution)
 * - Uses: src/data/chartsOrder.json to define the tuned range and the rest
 * - Writes: server/storage/configs.json (in-place) + backup into style_backups/
 *
 * vAxis policy:
 * - Set vAxisMin=0 and vAxisMax=5 for UPDATED charts (the "rest" group), as requested.
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const CONFIGS_PATH = path.join(PROJECT_ROOT, "server/storage/configs.json");
const ORDER_PATH = path.join(PROJECT_ROOT, "src/data/chartsOrder.json");
const BACKUP_DIR = path.join(PROJECT_ROOT, "style_backups");

const RESOLUTIONS = ["276x155", "344x193", "900x250", "564x116"];
const DIMENSIONS_BY_RES = {
  "276x155": { w: 276, h: 155 },
  "344x193": { w: 344, h: 193 },
  "900x250": { w: 900, h: 250 },
  "564x116": { w: 564, h: 116 },
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function median(nums) {
  const a = nums.filter((n) => typeof n === "number" && !Number.isNaN(n)).sort((x, y) => x - y);
  const n = a.length;
  if (!n) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function mode(values) {
  const m = new Map();
  for (const v of values) {
    const k = typeof v === "string" ? `s:${v}` : `j:${JSON.stringify(v)}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  let bestKey = null;
  let bestCount = -1;
  for (const [k, c] of m.entries()) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }
  if (bestKey == null) return null;
  if (bestKey.startsWith("s:")) return bestKey.slice(2);
  return JSON.parse(bestKey.slice(2));
}

// A few known ID normalization variants between sources (chartsOrder.json vs server configs).
function variantsFromOrderId(orderId) {
  const vars = new Set([orderId]);

  // AIT prefix difference: teplo_... -> teploait_...
  if (orderId.startsWith("teplo_")) {
    vars.add(`teploait_${orderId.slice("teplo_".length)}`);
  }

  // Transliteration inconsistency observed: meshcherskaya <-> mescherskaya
  for (const v of [...vars]) {
    vars.add(v.replace("meshcherskaya", "mescherskaya"));
    vars.add(v.replace("mescherskaya", "meshcherskaya"));
  }

  return [...vars];
}

function keyFor(chartId, resolution) {
  return `${chartId}_${resolution}`;
}

function computeBaseline(configEntries, tunedChartIdSet) {
  const fieldGroups = {
    num: ["chartAreaBottom", "baseFontSize", "axisFontSize", "legendFontSize", "annotationStemLength", "vAxisGridlinesCount"],
    str: [
      "chartAreaLeft",
      "chartAreaRight",
      "chartAreaTop",
      "chartAreaHeight",
      "chartAreaWidth",
      "legendLeftPadding",
      "legendMarginTop",
      "containerPaddingTop",
      "chartContainerHeight",
    ],
    bool: ["orangeAnnotationAbove", "greenAnnotationAbove"],
  };

  /** @type {Record<string, any>} */
  const baselineByRes = {};
  for (const res of RESOLUTIONS) {
    const sample = configEntries
      .filter((e) => e.resolution === res && tunedChartIdSet.has(e.chartId))
      .map((e) => e.config);

    const out = { sampleCount: sample.length };
    for (const f of fieldGroups.num) out[f] = median(sample.map((s) => Number(s[f])));
    for (const f of fieldGroups.str) out[f] = mode(sample.map((s) => s[f]).filter((v) => v != null));
    for (const f of fieldGroups.bool) out[f] = mode(sample.map((s) => !!s[f]));

    baselineByRes[res] = out;
  }

  return baselineByRes;
}

function main() {
  if (!fs.existsSync(CONFIGS_PATH)) {
    console.error(`configs.json not found: ${CONFIGS_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(ORDER_PATH)) {
    console.error(`chartsOrder.json not found: ${ORDER_PATH}`);
    process.exit(1);
  }

  ensureDir(BACKUP_DIR);

  const configs = readJson(CONFIGS_PATH);
  const order = readJson(ORDER_PATH);

  const entries = Object.values(configs);
  const existingChartIds = new Set(entries.map((e) => e.chartId));

  const startOrderId = "teplo_1_abv_sokolovo_meshcherskaya_ul_27_k_1";
  const endOrderId = "teplokts_28";
  const startOrder = order.orderMap[startOrderId];
  const endOrder = order.orderMap[endOrderId];
  if (startOrder == null || endOrder == null) {
    console.error("Unable to locate start/end order IDs in chartsOrder.json", { startOrderId, endOrderId });
    process.exit(1);
  }

  const teploOrderCharts = order.charts.filter((c) => c.category === "teplo");
  const tunedOrderIds = teploOrderCharts.filter((c) => c.order >= startOrder && c.order <= endOrder).map((c) => c.id);
  const restOrderIds = teploOrderCharts.filter((c) => c.order > endOrder).map((c) => c.id);

  // Map order IDs to actual chartIds present in configs (handles teplo_ vs teploait_ differences).
  /** @type {Map<string, string>} */
  const orderIdToChartId = new Map();
  for (const oid of teploOrderCharts.map((c) => c.id)) {
    const found = variantsFromOrderId(oid).find((v) => existingChartIds.has(v));
    if (found) orderIdToChartId.set(oid, found);
  }

  const tunedChartIds = new Set(
    tunedOrderIds
      .map((oid) => orderIdToChartId.get(oid))
      .filter(Boolean)
  );

  const baselineByRes = computeBaseline(entries, tunedChartIds);

  // Save baseline snapshot
  const baselinePath = path.join(BACKUP_DIR, `derived_teplo_baseline_from_AIT1_to_KTS28_${isoStamp()}.json`);
  writeJson(baselinePath, baselineByRes);

  // Backup configs before modification
  const backupPath = path.join(BACKUP_DIR, `server_configs_before_apply_teplo_baseline_${isoStamp()}.json`);
  writeJson(backupPath, configs);

  const now = new Date().toISOString();

  // Apply baseline to the rest teplo charts (order > KTS-28)
  let updatedEntries = 0;
  let createdEntries = 0;
  let touchedCharts = new Set();

  function buildConfigForRes(res) {
    const dims = DIMENSIONS_BY_RES[res];
    const b = baselineByRes[res];
    if (!b || !dims) throw new Error(`Missing baseline/dims for ${res}`);

    return {
      resolution: res,
      customWidth: dims.w,
      customHeight: dims.h,
      chartAreaLeft: b.chartAreaLeft,
      chartAreaRight: b.chartAreaRight,
      chartAreaTop: b.chartAreaTop,
      chartAreaBottom: Math.round(b.chartAreaBottom),
      chartAreaHeight: b.chartAreaHeight,
      chartAreaWidth: b.chartAreaWidth,
      baseFontSize: b.baseFontSize,
      axisFontSize: b.axisFontSize,
      legendFontSize: b.legendFontSize,
      legendLeftPadding: b.legendLeftPadding,
      legendMarginTop: b.legendMarginTop,
      annotationStemLength: b.annotationStemLength,
      orangeAnnotationAbove: b.orangeAnnotationAbove,
      greenAnnotationAbove: b.greenAnnotationAbove,
      // Requested axis bounds for the "rest" group
      vAxisMin: 0,
      vAxisMax: 5,
      vAxisGridlinesCount: b.vAxisGridlinesCount,
      containerPaddingTop: b.containerPaddingTop,
      chartContainerHeight: b.chartContainerHeight,
    };
  }

  for (const oid of restOrderIds) {
    const chartId = orderIdToChartId.get(oid) || variantsFromOrderId(oid)[0];
    touchedCharts.add(chartId);

    for (const res of RESOLUTIONS) {
      const k = keyFor(chartId, res);
      const nextConfig = buildConfigForRes(res);

      if (configs[k]) {
        configs[k] = {
          ...configs[k],
          chartId,
          resolution: res,
          config: {
            ...configs[k].config,
            ...nextConfig,
          },
          savedAt: now,
        };
        updatedEntries++;
      } else {
        configs[k] = {
          chartId,
          resolution: res,
          config: nextConfig,
          savedAt: now,
        };
        createdEntries++;
      }
    }
  }

  writeJson(CONFIGS_PATH, configs);

  console.log("✅ Applied teplo baseline styles");
  console.log(`   - Tuned range (AIT-1..KTS-28): ${tunedChartIds.size} charts (mapped from ${tunedOrderIds.length} order IDs)`);
  console.log(`   - Rest group (order > KTS-28): ${restOrderIds.length} order IDs`);
  console.log(`   - Touched charts (rest group): ${touchedCharts.size}`);
  console.log(`   - Updated entries: ${updatedEntries}`);
  console.log(`   - Created entries: ${createdEntries}`);
  console.log(`   - Backup saved: ${backupPath}`);
  console.log(`   - Baseline saved: ${baselinePath}`);
}

main();

