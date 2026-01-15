import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { modelingReservePerovoData } from "../data/modelingReservePerovo";

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

export function ModelingReservePerovoChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/modelingreserveperovo', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isCompressed = width <= 500; // Сжатое положение
  
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

  // Кастомные элементы для 2029 года (133.0) - ниже точки при width <= 500px
  useEffect(() => {
    if (!isCompressed) return; // Только для сжатого положения

    const addCustomAnnotations = () => {
      if (!chartContainerRef.current) return false;
      
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (!svgElement) return false;

      // Удаляем старые кастомные элементы
      const oldElements = container.querySelectorAll('.custom-annotation-2029');
      oldElements.forEach(el => el.remove());

      const svgRect = svgElement.getBoundingClientRect();
      const totalYears = modelingReservePerovoData.length;
      const chartWidth = svgRect.width;
      const chartHeight = svgRect.height;
      
      // Позиция по X
      const leftPercent = parseFloat(chartAreaLeft) / 100;
      const rightPercent = parseFloat(chartAreaRight) / 100;
      const chartAreaWidthPx = chartWidth * (1 - leftPercent - rightPercent);
      
      // Значение для 2029 года
      const value2029 = modelingReservePerovoData.find(d => d.year === "2029");
      const yearIndex2029 = value2029 ? modelingReservePerovoData.findIndex(d => d.year === "2029") : -1;
      
      if (!value2029 || yearIndex2029 < 0) return false;
      
      // Определяем диапазон vAxis
      const maxReserve = Math.max(...modelingReservePerovoData.map(d => d.reserve));
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
      
      // Кастомный элемент для 2029 года (133.0) - ниже точки
      const xPosition2029 = getXPosition(yearIndex2029);
      const yPosition2029 = getYPosition(value2029.reserve);
      
      const element2029 = document.createElement('div');
      element2029.className = 'custom-annotation-2029';
      element2029.style.position = 'absolute';
      element2029.style.left = `${xPosition2029}px`;
      element2029.style.top = `${yPosition2029 + 12 * annotationOffset}px`; // Ниже точки
      element2029.style.transform = 'translateX(-50%)';
      element2029.style.fontFamily = "'Golos Text', sans-serif";
      element2029.style.fontSize = `${axisFontSize}px`;
      element2029.style.fontWeight = 'bold';
      element2029.style.color = '#3A3A3C';
      element2029.style.zIndex = '1';
      element2029.style.pointerEvents = 'none';
      element2029.textContent = Math.round(value2029.reserve).toString();
      container.appendChild(element2029);
      
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
        const oldElements = chartContainerRef.current.querySelectorAll('.custom-annotation-2029');
        oldElements.forEach(el => el.remove());
      }
    };
  }, [width, isCompressed, isTiny, isMobile, axisFontSize, chartAreaLeft, chartAreaRight, chartAreaBottom, chartAreaTop]);

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
    ...modelingReservePerovoData.map((d) => [
      d.year,
      d.reserve,
      // В сжатом положении (<= 500px) скрываем стандартную аннотацию для 2029 (используем кастомную ниже точки)
      (isCompressed && d.year === "2029") ? "" : Math.round(d.reserve).toString(),
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

