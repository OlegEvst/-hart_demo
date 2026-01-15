import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { reserveGorkovskayaElectricData } from "../data/reserveGorkovskayaElectric";

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

export function ReserveGorkovskayaElectricChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/reservegorkovskaya_electric', width, height);
  
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;
  const isFixedSize = width >= 270 && width <= 280; // Для экрана 276x155
  const isWidth340 = width >= 340 && width <= 350; // Для экрана 344x193
  const isHeight155 = height >= 150 && height <= 160; // Для высоты 155px

  const baseFontSize = savedConfig?.baseFontSize ?? (isFixedSize ? 9 : (isWidth340 ? 10 : (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)))));
  const axisFontSize = savedConfig?.axisFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 9 : (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)))));
  const legendFontSize = savedConfig?.legendFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 10 : (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)))));

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isFixedSize ? "5%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const chartAreaTop = savedConfig?.chartAreaTop ?? (isFixedSize ? "-12%" : (isWidth340 ? "-10%" : (isMobile ? "-15%" : "-25%"))); // Поднимаем график выше
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isFixedSize ? 35 : (isWidth340 ? 35 : (isSuperTiny ? 30 : (isTiny ? 25 : 20)))); // Увеличиваем для шахматного порядка
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isFixedSize ? "98%" : (isWidth340 ? "98%" : (isSuperTiny ? "85%" : (isTiny ? "90%" : (isMobile ? "95%" : "98%")))));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? ("94%");

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isHeight155 ? "15px" : (isSuperTiny ? "-10px" : (isVeryNarrow ? "15px" : (isTiny ? "0px" : "10px")))); // Увеличиваем отступ для высоты 155px
  
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
          Резерв электрической мощности, МВА
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
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 4 },
      baselineColor: "#E5E5EA",
      baseline: { color: "#E5E5EA", lineWidth: 1 },
      viewWindowMode: "explicit" as const,
      format: "decimal",
      ticks: [{ v: 0, f: "0" }],
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
  const allReserves = reserveGorkovskayaElectricData.map(d => d.reserve);
  const minReserve = Math.min(...allReserves);
  const maxReserve = Math.max(...allReserves);
  // Если все значения 0, устанавливаем диапазон от -10 до 10
  const vAxisMin = (minReserve === 0 && maxReserve === 0) ? -10 : Math.floor(minReserve / 100) * 100 - 100;
  const vAxisMax = (minReserve === 0 && maxReserve === 0) ? 10 : Math.ceil(maxReserve / 100) * 100 + 100;

  // Отслеживаем уникальные значения для аннотаций
  const seenReserve = new Set<number>();
  
  // Проверяем, все ли значения равны 0
  const allZero = reserveGorkovskayaElectricData.every(d => d.reserve === 0);

  const data1 = [
    [
      "Год",
      "Резерв электрической мощности, МВА",
      { role: "annotation" },
    ],
    ...reserveGorkovskayaElectricData.map((d) => {
      let reserveAnnotation = "";
      
      // Если все значения 0, не показываем аннотации
        if (allZero) {
          reserveAnnotation = "";
        } else {
          // Показываем все значения при ширине > 500px, иначе только уникальные
          const reserveRounded = Math.round(d.reserve * 10) / 10; // Округляем до 1 знака после запятой
          if (width > 500 || !seenReserve.has(reserveRounded)) {
            if (width <= 500) seenReserve.add(reserveRounded);
            reserveAnnotation = reserveRounded.toFixed(1);
          }
        }

      return [
        d.year,
        d.reserve,
        reserveAnnotation,
      ];
    }),
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
      viewWindow: { min: vAxisMin, max: vAxisMax },
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
              height: isFixedSize ? "120px" : (isWidth340 ? "150px" : (isTiny ? "140px" : (isMobile ? "150px" : "180px"))),
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

