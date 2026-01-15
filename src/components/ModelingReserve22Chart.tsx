import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { modelingReserve22Data } from "../data/modelingReserve22";

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


// eslint-disable-next-line react/no-unstable-nested-components
const CustomLegend = ({ paddingLeft, marginTop, fontSize }: { paddingLeft: string, marginTop: string, fontSize: number }) => (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "2px",
      padding: "0",
      paddingLeft: paddingLeft,
      marginTop: marginTop,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ 
          width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#8B4513" 
        }}></div>
        <span style={{ 
          fontFamily: "'Golos Text', sans-serif", 
          fontSize: `${fontSize}px`, 
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

export function ModelingReserve22Chart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/modelingreserve22', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;

  const baseFontSize = savedConfig?.baseFontSize ?? (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)));
  const axisFontSize = savedConfig?.axisFontSize ?? (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)));
  const legendFontSize = savedConfig?.legendFontSize ?? (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)));

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const chartAreaTop = savedConfig?.chartAreaTop ?? ("10%"); // Опускаем график ниже
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isSuperTiny ? 30 : (isTiny ? 25 : 20));
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isSuperTiny ? "75%" : (isTiny ? "80%" : (isMobile ? "85%" : "88%")));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? ("94%");

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isSuperTiny ? "-15px" : (isVeryNarrow ? "10px" : (isTiny ? "-5px" : "5px")));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5);

  // Кастомные элементы для 2026, 2028 и 2030 годов
  useEffect(() => {
    const addCustomAnnotations = () => {
      if (!chartContainerRef.current) return false;
      
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (!svgElement) return false;

      // Удаляем старые кастомные элементы
      const oldElements = container.querySelectorAll('.custom-annotation-2026, .custom-annotation-2028, .custom-annotation-2030');
      oldElements.forEach(el => el.remove());

      const svgRect = svgElement.getBoundingClientRect();
      const totalYears = modelingReserve22Data.length;
      const chartWidth = svgRect.width;
      const chartHeight = svgRect.height;
      
      // Позиция по X
      const leftPercent = parseFloat(chartAreaLeft) / 100;
      const rightPercent = parseFloat(chartAreaRight) / 100;
      const chartAreaWidthPx = chartWidth * (1 - leftPercent - rightPercent);
      
      // Значения для 2026, 2028 и 2030 года
      const value2026 = modelingReserve22Data.find(d => d.year === "2026");
      const value2028 = modelingReserve22Data.find(d => d.year === "2028");
      const value2030 = modelingReserve22Data.find(d => d.year === "2030");
      const yearIndex2026 = value2026 ? modelingReserve22Data.findIndex(d => d.year === "2026") : -1;
      const yearIndex2028 = value2028 ? modelingReserve22Data.findIndex(d => d.year === "2028") : -1;
      const yearIndex2030 = value2030 ? modelingReserve22Data.findIndex(d => d.year === "2030") : -1;
      
      if (!value2026 && !value2028 && !value2030) return false;
      
      // Определяем диапазон vAxis
      const maxReserve = Math.max(...modelingReserve22Data.map(d => d.reserve));
      const vAxisMin = 0;
      const vAxisMax = maxReserve * 1.1;
      const vAxisRange = vAxisMax - vAxisMin;
      
      const topPercent = parseFloat(chartAreaTop) / 100;
      const bottomPercent = typeof chartAreaBottom === 'string' ? parseFloat(chartAreaBottom) / 100 : chartAreaBottom / 100;
      const chartAreaHeightPx = chartHeight * (1 - topPercent - bottomPercent);
      
      // Функция для вычисления Y позиции
      const getYPosition = (value: number) => {
        const yPercent = ((value - vAxisMin) / vAxisRange);
        const yInChartArea = chartAreaHeightPx * (1 - yPercent);
        return topPercent * chartHeight + yInChartArea;
      };
      
      // Функция для вычисления X позиции
      const getXPosition = (yearIndex: number) => {
        const xInChartArea = (yearIndex / (totalYears - 1)) * chartAreaWidthPx;
        return leftPercent * chartWidth + xInChartArea;
      };
      
      // Адаптивные отступы
      const annotationOffset = width > 500 ? 1.5 : 1;
      
      // Кастомные элементы для 2026 года (361.7 - над точкой)
      if (value2026 && yearIndex2026 >= 0) {
        const xPosition2026 = getXPosition(yearIndex2026);
        const yPosition2026 = getYPosition(value2026.reserve);
        
        const element2026 = document.createElement('div');
        element2026.className = 'custom-annotation-2026';
        element2026.style.position = 'absolute';
        element2026.style.left = `${xPosition2026}px`;
        element2026.style.top = `${yPosition2026 - 15 * annotationOffset}px`; // Выше точки
        element2026.style.transform = 'translateX(-50%)';
        element2026.style.fontFamily = "'Golos Text', sans-serif";
        element2026.style.fontSize = `${axisFontSize}px`;
        element2026.style.fontWeight = 'bold';
        element2026.style.color = '#3A3A3C';
        element2026.style.zIndex = '1';
        element2026.style.pointerEvents = 'none';
        element2026.textContent = Math.round(value2026.reserve).toString();
        container.appendChild(element2026);
      }
      
      // Кастомные элементы для 2028 года (83.0 - выше над точкой)
      if (value2028 && yearIndex2028 >= 0) {
        const xPosition2028 = getXPosition(yearIndex2028);
        const yPosition2028 = getYPosition(value2028.reserve);
        
        const element2028 = document.createElement('div');
        element2028.className = 'custom-annotation-2028';
        element2028.style.position = 'absolute';
        element2028.style.left = `${xPosition2028}px`;
        element2028.style.top = `${yPosition2028 - 15 * annotationOffset}px`; // Выше точки
        element2028.style.transform = 'translateX(-50%)';
        element2028.style.fontFamily = "'Golos Text', sans-serif";
        element2028.style.fontSize = `${axisFontSize}px`;
        element2028.style.fontWeight = 'bold';
        element2028.style.color = '#3A3A3C';
        element2028.style.zIndex = '1';
        element2028.style.pointerEvents = 'none';
        element2028.textContent = Math.round(value2028.reserve).toString();
        container.appendChild(element2028);
      }
      
      // Кастомные элементы для 2030 года (22.2 - выше над точкой)
      if (value2030 && yearIndex2030 >= 0) {
        const xPosition2030 = getXPosition(yearIndex2030);
        const yPosition2030 = getYPosition(value2030.reserve);
        
        const element2030 = document.createElement('div');
        element2030.className = 'custom-annotation-2030';
        element2030.style.position = 'absolute';
        element2030.style.left = `${xPosition2030}px`;
        element2030.style.top = `${yPosition2030 - 15 * annotationOffset}px`; // Выше точки
        element2030.style.transform = 'translateX(-50%)';
        element2030.style.fontFamily = "'Golos Text', sans-serif";
        element2030.style.fontSize = `${axisFontSize}px`;
        element2030.style.fontWeight = 'bold';
        element2030.style.color = '#3A3A3C';
        element2030.style.zIndex = '1';
        element2030.style.pointerEvents = 'none';
        element2030.textContent = Math.round(value2030.reserve).toString();
        container.appendChild(element2030);
      }
      
      return true;
    };

    // Пробуем несколько раз с задержкой
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (addCustomAnnotations() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (chartContainerRef.current) {
        const oldElements = chartContainerRef.current.querySelectorAll('.custom-annotation-2026, .custom-annotation-2028, .custom-annotation-2030');
        oldElements.forEach(el => el.remove());
      }
    };
  }, [width, isTiny, isMobile, axisFontSize, chartAreaLeft, chartAreaRight, chartAreaBottom, chartAreaTop]);

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
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 3 },
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
      "Резерв тепловой мощности, Гкал/ч",
      { role: "annotation" },
    ],
    ...modelingReserve22Data.map((d) => [
      d.year,
      d.reserve,
      (d.year === "2026" || d.year === "2028" || d.year === "2030") ? "" : Math.round(d.reserve).toString(), // Скрываем стандартные аннотации для 2026, 2028 и 2030 (используем кастомные)
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
      viewWindow: { min: 0 }, // Auto max
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
          <div 
            ref={chartContainerRef}
            style={{ 
            width: "100%", 
            height: isTiny ? "140px" : (isMobile ? "150px" : "170px"),
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
          <CustomLegend paddingLeft={legendLeftPadding} marginTop={legendMarginTop} fontSize={legendFontSize} />
        </div>
      </div>
    </div>
  );
}

