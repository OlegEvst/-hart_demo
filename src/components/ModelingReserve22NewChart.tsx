import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { modelingReserve22NewData } from "../data/modelingReserve22New";

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

export function ModelingReserve22NewChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/modelingreserve22_new', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;
  const isNarrow = width <= 500;
  const isFixedSize = width === 272; // Для экрана 272x150
  const isWidth340 = width === 340; // Для экрана 340x190

  const baseFontSize = savedConfig?.baseFontSize ?? (isFixedSize ? 9 : (isWidth340 ? 10 : (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)))));
  const axisFontSize = savedConfig?.axisFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 9 : (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)))));
  const legendFontSize = savedConfig?.legendFontSize ?? (isFixedSize ? 8 : (isWidth340 ? 10 : (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)))));

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isFixedSize ? "5%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const chartAreaTop = savedConfig?.chartAreaTop ?? (isFixedSize ? "3%" : (isWidth340 ? "4%" : "5%")); // Немного поднимаем для 272x150
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isFixedSize ? 25 : (isWidth340 ? 22 : (isSuperTiny ? 30 : (isTiny ? 25 : 20))));
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isFixedSize ? "88%" : (isWidth340 ? "92%" : (isSuperTiny ? "80%" : (isTiny ? "85%" : (isMobile ? "90%" : "93%")))));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? (isFixedSize ? "90%" : (isWidth340 ? "94%" : "94%"));

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isFixedSize ? "8%" : (isWidth340 ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%"))));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isFixedSize ? "2px" : (isWidth340 ? "5px" : (isSuperTiny ? "-10px" : (isVeryNarrow ? "10px" : (isTiny ? "-2px" : "8px")))));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5);

  // Вычисляем min и max для vAxis (нужно для кастомной аннотации)
  const allReserves = modelingReserve22NewData.map(d => d.reserve);
  const maxReserve = Math.max(...allReserves);
  const vAxisMin = 0;
  const vAxisMax = Math.ceil(maxReserve / 50) * 50 + 50;

  // Кастомная аннотация для 2027 года
  useEffect(() => {
    const addCustomAnnotation = () => {
      if (!chartContainerRef.current) return false;
      
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (!svgElement) return false;

      // Удаляем старую кастомную аннотацию
      const oldElement = container.querySelector('.custom-annotation-2027');
      if (oldElement) oldElement.remove();

      const svgRect = svgElement.getBoundingClientRect();
      const totalYears = modelingReserve22NewData.length;
      const chartWidth = svgRect.width;
      const chartHeight = svgRect.height;
      
      // Позиция по X
      const leftPercent = parseFloat(chartAreaLeft) / 100;
      const rightPercent = parseFloat(chartAreaRight) / 100;
      const chartAreaWidthPx = chartWidth * (1 - leftPercent - rightPercent);
      
      // Значение для 2027 года
      const value2027 = modelingReserve22NewData.find(d => d.year === "2027");
      const yearIndex2027 = value2027 ? modelingReserve22NewData.findIndex(d => d.year === "2027") : -1;
      
      if (!value2027 || yearIndex2027 < 0) return false;
      
      const topPercent = parseFloat(chartAreaTop) / 100;
      const bottomPercent = typeof chartAreaBottom === 'string' ? parseFloat(chartAreaBottom) / 100 : chartAreaBottom / 100;
      const chartAreaHeightPx = chartHeight * (1 - topPercent - bottomPercent);
      
      // Функция для вычисления Y позиции
      const getYPosition = (value: number) => {
        const yPercent = ((value - vAxisMin) / (vAxisMax - vAxisMin));
        const yInChartArea = chartAreaHeightPx * (1 - yPercent);
        return topPercent * chartHeight + yInChartArea;
      };
      
      // Функция для вычисления X позиции
      const getXPosition = (yearIndex: number) => {
        const xInChartArea = (yearIndex / (totalYears - 1)) * chartAreaWidthPx;
        return leftPercent * chartWidth + xInChartArea;
      };
      
      // Для экранов меньше 500px поднимаем на 10% выше
      const offsetMultiplier = isNarrow ? 1.1 : 1;
      const baseOffset = 15;
      const annotationOffset = baseOffset * offsetMultiplier;
      
      const xPosition2027 = getXPosition(yearIndex2027);
      const yPosition2027 = getYPosition(value2027.reserve);
      
      const element2027 = document.createElement('div');
      element2027.className = 'custom-annotation-2027';
      element2027.style.position = 'absolute';
      element2027.style.left = `${xPosition2027}px`;
      element2027.style.top = `${yPosition2027 - annotationOffset}px`;
      element2027.style.transform = 'translateX(-50%)';
      element2027.style.fontFamily = "'Golos Text', sans-serif";
      element2027.style.fontSize = `${axisFontSize}px`;
      element2027.style.fontWeight = 'bold';
      element2027.style.color = '#3A3A3C';
      element2027.style.zIndex = '1000';
      element2027.style.pointerEvents = 'none';
      element2027.textContent = Math.round(value2027.reserve).toString();
      container.appendChild(element2027);
      
      return true;
    };

    // Пробуем несколько раз с задержкой
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (addCustomAnnotation() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (chartContainerRef.current) {
        const oldElement = chartContainerRef.current.querySelector('.custom-annotation-2027');
        if (oldElement) oldElement.remove();
      }
    };
  }, [width, isNarrow, isTiny, isMobile, axisFontSize, chartAreaLeft, chartAreaRight, chartAreaBottom, chartAreaTop, vAxisMin, vAxisMax]);

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
    ...modelingReserve22NewData.map((d) => [
      d.year,
      d.reserve,
      d.year === "2027" ? "" : Math.round(d.reserve).toString(), // Скрываем стандартную аннотацию для 2027 года (используем кастомную)
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
      viewWindow: { min: vAxisMin, max: vAxisMax },
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
          padding: isFixedSize ? "2px 0 0px 0" : (isWidth340 ? "2px 0 0px 0" : "2px 0 7px 0"), // Убираем padding-bottom для фиксированных размеров
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: width > 500 ? "900px" : "100%",
          maxWidth: "100%",
          height: isFixedSize ? "150px" : (isWidth340 ? "190px" : "auto"), // Фиксированная высота для 272x150 и 340x190
        }}>
          <div 
            ref={chartContainerRef}
            style={{ 
              width: "100%", 
              height: isFixedSize ? "120px" : (isWidth340 ? "150px" : (isTiny ? "140px" : (isMobile ? "150px" : "170px"))),
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

