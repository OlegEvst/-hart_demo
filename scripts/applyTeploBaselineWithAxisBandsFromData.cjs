/**
 * Apply baseline teplo styles (derived from tuned charts AIT-1..KTS-28)
 * to remaining teplo charts (order > KTS-28), BUT compute vAxisMin/vAxisMax
 * per-chart from actual data ranges using simple "bands":
 *   0..1, 0..2, 0..3, ... and negative-aware ranges.
 *
 * Reads:
 * - server/storage/configs.json
 * - src/data/chartsOrder.json
 * - src/data/<chartId>.ts (data files; parsed via eval similar to server)
 *
 * Writes:
 * - server/storage/configs.json
 * - style_backups/ (backup + derived baseline snapshot)
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const CONFIGS_PATH = path.join(PROJECT_ROOT, "server/storage/configs.json");
const ORDER_PATH = path.join(PROJECT_ROOT, "src/data/chartsOrder.json");
const DATA_DIR = path.join(PROJECT_ROOT, "src/data");
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

function keyFor(chartId, resolution) {
  return `${chartId}_${resolution}`;
}

// ID normalization variants between chartsOrder.json and actual data/config IDs.
function candidatesFromOrderId(orderId) {
  const vars = new Set([orderId]);

  // AIT prefix: teplo_... -> teploait_...
  if (orderId.startsWith("teplo_")) vars.add(`teploait_${orderId.slice("teplo_".length)}`);

  // teplokotel_naya_* -> teplokotelnaya_*
  for (const v of [...vars]) {
    if (v.startsWith("teplokotel_naya_")) vars.add(v.replace(/^teplokotel_naya_/, "teplokotelnaya_"));
    if (v.startsWith("teploait_kotel_naya_")) vars.add(v.replace(/^teploait_kotel_naya_/, "teploait_kotelnaya_"));
  }

  // Known prefix mismatches for a few groups
  // teplo_vnukovo / teplo_shcherbinka are GTES in data
  if (orderId === "teplo_vnukovo") vars.add("teplogtes_vnukovo");
  if (orderId === "teplo_shcherbinka") vars.add("teplogtes_scherbinka");
  // teplo_1 is GES-1 in data
  if (/^teplo_\\d+$/.test(orderId)) vars.add(orderId.replace(/^teplo_/, "teploges_"));

  // Transliteration inconsistency: meshcherskaya <-> mescherskaya
  for (const v of [...vars]) {
    vars.add(v.replace("meshcherskaya", "mescherskaya"));
    vars.add(v.replace("mescherskaya", "meshcherskaya"));
  }

  return [...vars];
}

function loadDataArrayForChartId(chartId) {
  const dataFilePath = path.join(DATA_DIR, `${chartId}.ts`);
  if (!fs.existsSync(dataFilePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(dataFilePath, "utf8");
  // Fix regex - need to escape backslashes properly in string literal
  const varNameMatch = fileContent.match(/export const\s+([\w\u0400-\u04FF_]+)\s*=/);
  if (!varNameMatch) {
    return null;
  }
  const dataVarName = varNameMatch[1];
  const executableCode = fileContent.replace(/export const/g, "const");

  try {
    // eslint-disable-next-line no-eval
    const evalCode = `(function(){ ${executableCode}; return ${dataVarName}; })()`;
    // eslint-disable-next-line no-eval
    const data = eval(evalCode);
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.error(`[loadDataArrayForChartId] Error loading ${chartId}:`, err.message);
    return null;
  }
}

function computeRange(dataArray) {
  /** @type {number[]} */
  const values = [];
  for (const row of dataArray) {
    if (!row || typeof row !== "object") continue;
    const candidates = [];
    if (row.value != null) candidates.push(row.value);
    if (row.reserve != null) candidates.push(row.reserve);
    if (row.total_net != null) candidates.push(row.total_net);
    if (row.load != null) candidates.push(row.load);
    for (const c of candidates) {
      const n = typeof c === "number" ? c : parseFloat(String(c));
      if (!Number.isNaN(n) && Number.isFinite(n)) values.push(n);
    }
  }
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function ceilToBandPos(x) {
  if (x <= 0) return 0;
  // Round up to nearest integer band: 0..1, 0..2, 0..3, ...
  // But if value is very close to an integer, use that integer
  const c = Math.ceil(x);
  // If value is very small (< 0.1), use band 1
  if (x < 0.1) return 1;
  // If value is close to an integer (within 0.05), use that integer
  if (Math.abs(x - Math.round(x)) < 0.05) {
    return Math.max(1, Math.round(x));
  }
  return Math.max(1, c);
}

function ceilAbsToBandNeg(abs) {
  if (abs <= 0) return 0;
  const c = Math.ceil(abs);
  // Similar logic for negatives
  if (abs < 0.1) return 1;
  if (Math.abs(abs - Math.round(abs)) < 0.05) {
    return Math.max(1, Math.round(abs));
  }
  return Math.max(1, c);
}

function pickAxis(minVal, maxVal) {
  // Handle NaNs defensively
  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
    return { vAxisMin: 0, vAxisMax: 5 };
  }

  // All non-negative
  if (minVal >= 0) {
    const maxBand = ceilToBandPos(maxVal);
    // Ensure we always show 0 as baseline
    return {
      vAxisMin: 0,
      vAxisMax: maxBand,
    };
  }

  // All non-positive
  if (maxVal <= 0) {
    const minBand = -ceilAbsToBandNeg(Math.abs(minVal));
    // Ensure we always show 0 as baseline
    return {
      vAxisMin: minBand,
      vAxisMax: 0,
    };
  }

  // Mixed (has both negative and positive)
  // Ensure 0 is always visible and use symmetric or appropriate bands
  const posBand = ceilToBandPos(maxVal);
  const negBand = ceilAbsToBandNeg(Math.abs(minVal));
  // Use the larger of the two bands for symmetry, but ensure 0 is included
  const band = Math.max(posBand, negBand);
  return {
    vAxisMin: -band,
    vAxisMax: band,
  };
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

  // Map order IDs to actual chartIds present in configs (fallback to best candidate even if missing in configs).
  /** @type {Map<string, string>} */
  const orderIdToChartId = new Map();
  for (const oid of teploOrderCharts.map((c) => c.id)) {
    const candidates = candidatesFromOrderId(oid);
    const found = candidates.find((v) => existingChartIds.has(v)) || candidates[0];
    orderIdToChartId.set(oid, found);
  }

  const tunedChartIds = new Set(
    tunedOrderIds.map((oid) => orderIdToChartId.get(oid)).filter(Boolean)
  );

  const baselineByRes = computeBaseline(entries, tunedChartIds);
  const baselinePath = path.join(BACKUP_DIR, `derived_teplo_baseline_axisbands_${isoStamp()}.json`);
  writeJson(baselinePath, baselineByRes);

  const backupPath = path.join(BACKUP_DIR, `server_configs_before_apply_teplo_axisbands_${isoStamp()}.json`);
  writeJson(backupPath, configs);

  const now = new Date().toISOString();
  let updatedEntries = 0;
  let createdEntries = 0;
  let usedData = 0;
  let missingData = 0;
  const missingDataExamples = [];

  function buildConfigForRes(res, axis) {
    const dims = DIMENSIONS_BY_RES[res];
    const b = baselineByRes[res];
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
      vAxisMin: axis.vAxisMin,
      vAxisMax: axis.vAxisMax,
      vAxisGridlinesCount: b.vAxisGridlinesCount,
      containerPaddingTop: b.containerPaddingTop,
      chartContainerHeight: b.chartContainerHeight,
    };
  }

  // Group charts by value ranges for similar axis settings
  /** @type {Map<string, {min: number, max: number, charts: string[]}>} */
  const rangeGroups = new Map();

  for (const oid of restOrderIds) {
    const chartIdFromOrder = orderIdToChartId.get(oid);
    // Generate candidates from orderId (not from chartIdFromOrder, which may be wrong)
    const candidates = candidatesFromOrderId(oid);

    // Try all candidates to find data file
    let dataArray = null;
    for (const c of candidates) {
      const arr = loadDataArrayForChartId(c);
      if (arr) {
        dataArray = arr;
        break;
      }
    }

    let axis = { vAxisMin: 0, vAxisMax: 5 };
    if (dataArray) {
      const range = computeRange(dataArray);
      if (range) {
        axis = pickAxis(range.min, range.max);
        usedData++;
        
        // Group by range for similar charts
        const rangeKey = `${axis.vAxisMin}_${axis.vAxisMax}`;
        if (!rangeGroups.has(rangeKey)) {
          rangeGroups.set(rangeKey, { min: range.min, max: range.max, charts: [] });
        }
        rangeGroups.get(rangeKey).charts.push(chartIdFromOrder || oid);
      } else {
        missingData++;
        if (missingDataExamples.length < 10) missingDataExamples.push({ oid, chartId: chartIdFromOrder, reason: "no numeric values" });
      }
    } else {
      missingData++;
      if (missingDataExamples.length < 10) missingDataExamples.push({ oid, chartId: chartIdFromOrder, reason: "data file not found" });
    }

    // Apply to config entries under the chartId used by configs
    const chartId = chartIdFromOrder || oid;
    for (const res of RESOLUTIONS) {
      const k = keyFor(chartId, res);
      const nextConfig = buildConfigForRes(res, axis);
      if (configs[k]) {
        configs[k] = {
          ...configs[k],
          chartId,
          resolution: res,
          config: { ...configs[k].config, ...nextConfig },
          savedAt: now,
        };
        updatedEntries++;
      } else {
        configs[k] = { chartId, resolution: res, config: nextConfig, savedAt: now };
        createdEntries++;
      }
    }
  }

  writeJson(CONFIGS_PATH, configs);

  console.log("✅ Applied teplo baseline styles with axis bands");
  console.log(`   - Rest group (order > KTS-28): ${restOrderIds.length} order IDs`);
  console.log(`   - Updated entries: ${updatedEntries}`);
  console.log(`   - Created entries: ${createdEntries}`);
  console.log(`   - Used data ranges: ${usedData}`);
  console.log(`   - Missing data: ${missingData}`);
  console.log(`   - Range groups: ${rangeGroups.size}`);
  for (const [key, group] of Array.from(rangeGroups.entries()).slice(0, 10)) {
    console.log(`     ${key}: ${group.charts.length} charts (data range: ${group.min.toFixed(2)}..${group.max.toFixed(2)})`);
  }
  if (missingDataExamples.length > 0) {
    console.log(`   - Missing examples: ${JSON.stringify(missingDataExamples, null, 2)}`);
  }
  console.log(`   - Backup saved: ${backupPath}`);
  console.log(`   - Baseline saved: ${baselinePath}`);
}

main();

