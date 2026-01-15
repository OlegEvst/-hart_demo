import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { reserveKozhukhovoNewData } from "../data/reserveKozhukhovoNew";

import { useSavedChartConfig } from "../hooks/useSavedChartConfig";
function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const handleResize = () => setSize([window.innerWidth, window.innerHeight]);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

export function ReserveKozhukhovoNewChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/reservekozhukhovo_new', width, height);
  
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;

  const baseFontSize = savedConfig?.baseFontSize ?? (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)));
  const axisFontSize = savedConfig?.axisFontSize ?? (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)));
  const legendFontSize = savedConfig?.legendFontSize ?? (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)));

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const chartAreaTop = savedConfig?.chartAreaTop ?? (0);
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isSuperTiny ? 30 : (isTiny ? 25 : 20));
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isSuperTiny ? "85%" : (isTiny ? "90%" : (isMobile ? "95%" : "98%")));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? ("94%");

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isSuperTiny ? "-10px" : (isVeryNarrow ? "15px" : (isTiny ? "0px" : "10px")));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5);

  const CustomLegend = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "2px",
      padding: "0",
      paddingLeft: legendLeftPadding,
      paddingBottom: "5px",
      marginTop: legendMarginTop,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#8B4513" 
        }}></div>
        <span style={{ 
          fontFamily: "'Golos Text', sans-serif", 
          fontSize: `${legendFontSize}px`, 
          color: "#1C1C1E", 
          fontWeight: "bold",
          lineHeight: "1.3",
          textAlign: "left"
        }}>
          Резерв тепловой мощности, Гкал/ч
        </span>
      </div>
    </div>
  );

  const commonOptions = {
    fontName: "Golos Text",
    fontSize: baseFontSize,
    backgroundColor: "transparent",
    chartArea: { 
      left: chartAreaLeft,
      right: chartAreaRight,
      top: chartAreaTop,
      bottom: chartAreaBottom,
      height: chartAreaHeight, 
      width: chartAreaWidth 
    },
    hAxis: {
      textStyle: { 
        color: "#8E8E93", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { 
        color: "#F2F2F7",
        count: -1
      },
      minorGridlines: {
        color: "#F2F2F7"
      },
      baselineColor: "#E5E5EA",
      slantedText: false,
      showTextEvery: 1,
    },
    vAxis: {
      textStyle: { 
        color: "#8E8E93", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 4 },
      baselineColor: "#E5E5EA",
      baseline: { color: "#E5E5EA", lineWidth: 1 },
      viewWindowMode: "explicit" as const,
      format: "decimal",
      ticks: [{ v: 0, f: "0" }],
    },
    titlePosition: "none",
    legend: { position: "none" },
    lineWidth: isTiny ? 2.5 : (isMobile ? 3 : 4),
    pointSize: isTiny ? 3.6 : (isMobile ? 5.4 : 7.2),
    curveType: "function",
    annotations: {
      textStyle: {
        fontName: "Golos Text",
        fontSize: axisFontSize,
        bold: true,
        color: "#3A3A3C",
      },
      stem: { color: "transparent", length: annotationStemLength },
      alwaysOutside: true,
      highContrast: true,
      style: "point",
    },
    tooltip: {
      textStyle: { 
        fontName: "Golos Text",
        bold: true,
        fontSize: isTiny ? 8 : (isMobile ? 9 : 10),
        color: "#1C1C1E"
      },
      showColorCode: true,
      isHtml: false,
      trigger: "focus",
      ignoreBounds: false,
    },
    isStacked: false,
  };

  // Вычисляем max для vAxis (min всегда 0 для отсчета от нуля)
  const allReserves = reserveKozhukhovoNewData.map(d => d.reserve);
  const maxReserve = Math.max(...allReserves);
  const vAxisMax = Math.ceil(maxReserve / 100) * 100 + 100;

  const data1 = [
    [
      "Год",
      "Резерв тепловой мощности, Гкал/ч",
      { role: "annotation" },
    ],
    ...reserveKozhukhovoNewData.map((d) => [
      d.year,
      d.reserve,
      Math.round(d.reserve).toString(),
    ]),
  ];

  const options1 = {
    ...commonOptions,
    series: {
      0: { 
        color: "#8B4513", 
        pointShape: "circle", 
        areaOpacity: 0.15,
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      viewWindow: { min: 0, max: vAxisMax }, // Отсчет от 0, без отрицательной шкалы
      gridlines: { 
        color: "#F2F2F7", 
        count: 4,
      },
      format: "decimal",
      ticks: [0] as any,
    },
  };

  return (
    <div style={{ 
      width: "100%", 
      minHeight: "100vh",
      padding: "0",
      boxSizing: "border-box",
      backgroundColor: "#F5F5F7",
      fontFamily: "'Golos Text', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{ 
        width: "100%", 
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "0",
          padding: "2px 0 5px 0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: width > 500 ? "900px" : "100%",
          maxWidth: "100%",
        }}>
          <div style={{ 
            width: "100%", 
            height: isTiny ? "140px" : (isMobile ? "150px" : "170px"),
          }}>
            <Chart
              chartType="AreaChart"
              width="100%"
              height="100%"
              data={data1}
              options={options1}
            />
          </div>
          <CustomLegend />
        </div>
      </div>
    </div>
  );
}

