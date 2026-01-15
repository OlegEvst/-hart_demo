import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { balanceFrezData } from "../data/balanceFrez";

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

export function BalanceFrezChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/balancefrez', width, height);
  
  
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
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isSuperTiny ? "-15px" : (isVeryNarrow ? "10px" : (isTiny ? "-5px" : "5px")));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5); // Увеличиваем на 50% при ширине > 500px
  const annotationStemLengthNegative = width > 500 ? -18 : -12; // Увеличиваем на 50% при ширине > 500px

  const CustomLegend = () => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "2px",
      padding: "0",
      paddingLeft: legendLeftPadding,
      marginTop: legendMarginTop,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#FF9500" 
        }}></div>
        <span style={{ 
          fontFamily: "'Golos Text', sans-serif", 
          fontSize: `${legendFontSize}px`, 
          color: "#1C1C1E", 
          fontWeight: "bold",
          lineHeight: "1.3",
          textAlign: "left"
        }}>
          Тепловая мощность нетто, Гкал/ч
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#34C759" 
        }}></div>
        <span style={{ 
          fontFamily: "'Golos Text', sans-serif", 
          fontSize: `${legendFontSize}px`, 
          color: "#1C1C1E", 
          fontWeight: "bold",
          lineHeight: "1.3",
          textAlign: "left"
        }}>
          Нагрузка существующих объектов, Гкал/ч
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
        color: "transparent", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 1 },
      baselineColor: "#E5E5EA",
      viewWindowMode: "explicit" as const,
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

  const data1 = [
    [
      "Год",
      "Тепловая мощность нетто, Гкал/ч",
      { role: "annotation" },
      "Нагрузка существующих объектов, Гкал/ч",
      { role: "annotation" },
    ],
    ...balanceFrezData.map((d) => [
      d.year,
      d.total_net,
      Math.round(d.total_net).toString(),
      d.load,
      Math.round(d.load).toString(),
    ]),
  ];

  const options1 = {
    ...commonOptions,
    series: {
      0: { 
        color: "#FF9500", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        annotations: {
          stem: { color: "transparent", length: annotationStemLength },
        }
      }, 
      1: { 
        color: "#34C759", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        annotations: {
          stem: { color: "transparent", length: annotationStemLengthNegative },
        }
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      viewWindow: { min: 0, max: 350 },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 1 },
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

