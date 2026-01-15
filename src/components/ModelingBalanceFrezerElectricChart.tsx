import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { modelingBalanceFrezerElectricData } from "../data/modelingBalanceFrezerElectric";

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

export function ModelingBalanceFrezerElectricChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/modelingbalancefrezer_electric', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;
  const isFixedSize = width >= 270 && width <= 280; // Для экрана 276x155
  const isWidth340 = width >= 340 && width <= 350; // Для экрана 344x193

  const baseFontSize = savedConfig?.baseFontSize ?? (isFixedSize ? 9 : (isWidth340 ? 10 : (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)))));
  const axisFontSize = savedConfig?.axisFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 9 : (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)))));
  const legendFontSize = savedConfig?.legendFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 10 : (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)))));

  const isNarrow = width <= 500;
  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isNarrow ? "6%" : (isMobile ? "4%" : "3%")))));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isFixedSize ? "5%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isNarrow ? "6%" : (isMobile ? "4%" : "3%")))));
  const chartAreaTop = savedConfig?.chartAreaTop ?? (isFixedSize ? "-12%" : (isWidth340 ? "-10%" : (isMobile ? "-15%" : "-25%"))); // Поднимаем график выше
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isFixedSize ? 35 : (isWidth340 ? 35 : (isSuperTiny ? 30 : (isTiny ? 25 : 20)))); // Увеличиваем для шахматного порядка
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isFixedSize ? "98%" : (isWidth340 ? "98%" : (isSuperTiny ? "85%" : (isTiny ? "90%" : (isMobile ? "98%" : "98%")))));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? (isFixedSize ? "90%" : (isWidth340 ? "94%" : "94%"));

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isFixedSize ? "-3px" : (isWidth340 ? "0px" : (isSuperTiny ? "-10px" : (isVeryNarrow ? "10px" : (isTiny ? "-2px" : "8px")))));
  
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
          Располагаемая трансформаторная мощность, МВА
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
          Нагрузка существующих объектов, МВА
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
      // Шахматный порядок для маленьких разрешений через alternatingTextStyle
      ...(isFixedSize || isWidth340 ? {
        alternatingTextStyle: {
          color: "#8E8E93",
          fontSize: axisFontSize,
          bold: true
        },
        alternatingDirection: 1, // Чередование: 1 = вверх/вниз
      } : {}),
    },
    vAxis: {
      textStyle: { 
        color: "transparent", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 3 },
      baselineColor: "#E5E5EA",
      // Убираем отступы для всех разрешений
      textPosition: "none" as const,
      titleTextStyle: { color: "transparent" },
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

  // Вычисляем min и max для vAxis
  const allValues = [...modelingBalanceFrezerElectricData.map(d => d.total_net), ...modelingBalanceFrezerElectricData.map(d => d.load)];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const vAxisMin = savedConfig?.vAxisMin ?? Math.floor(minValue / 10) * 10 - 10;
  const vAxisMax = savedConfig?.vAxisMax ?? Math.ceil(maxValue / 10) * 10 + 10;

  // Отслеживаем уникальные значения для аннотаций
  const seenTotalNet = new Set<number>();
  const seenLoad = new Set<number>();

  const data1 = [
    [
      "Год",
      "Располагаемая трансформаторная мощность, МВА",
      { role: "annotation" },
      "Нагрузка существующих объектов, МВА",
      { role: "annotation" },
    ],
    ...modelingBalanceFrezerElectricData.map((d) => {
      let totalNetAnnotation = "";
      let loadAnnotation = "";

      // Показываем все значения при ширине > 500px, иначе только уникальные
      const totalNetRounded = Math.round(d.total_net * 10) / 10; // Округляем до 1 знака после запятой
      if (width > 500 || !seenTotalNet.has(totalNetRounded)) {
        if (width <= 500) seenTotalNet.add(totalNetRounded);
        totalNetAnnotation = totalNetRounded.toFixed(1);
      }

      const loadRounded = Math.round(d.load * 10) / 10; // Округляем до 1 знака после запятой
      if (width > 500 || !seenLoad.has(loadRounded)) {
        if (width <= 500) seenLoad.add(loadRounded);
        loadAnnotation = loadRounded.toFixed(1);
      }

      return [
        d.year,
        d.total_net,
        totalNetAnnotation,
        d.load,
        loadAnnotation,
      ];
    }),
  ];

  

  const options1 = {
    ...commonOptions,
    series: {
      0: { 
        color: "#FF9500", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        annotations: {
          stem: { color: "transparent", length: annotationStemLength }, // Положительное значение размещает над точками
        }
      }, 
      1: { 
        color: "#34C759", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        annotations: {
          stem: { color: "transparent", length: -annotationStemLength * 2.65 }, // Отрицательное значение размещает под точками
        }
      },
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
      viewWindow: { 
        min: vAxisMin, 
        max: vAxisMax 
      },
      format: "decimal",
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
          padding: "2px 0 7px 0", // padding-bottom: 5px базовый + 2px margin = 7px
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: width > 500 ? "900px" : "100%",
          maxWidth: "100%",
        }}>
          <div 
            ref={chartContainerRef}
            style={{ 
              width: "100%", 
              height: isFixedSize ? "120px" : (isWidth340 ? "150px" : (isTiny ? "140px" : (isMobile ? "150px" : "180px"))),
              position: "relative",
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

