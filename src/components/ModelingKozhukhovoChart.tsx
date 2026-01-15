import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { modelingKozhukhovoData } from "../data/modelingKozhukhovo";

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
          width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#FF9500" 
        }}></div>
        <span style={{ 
          fontFamily: "'Golos Text', sans-serif", 
          fontSize: `${fontSize}px`, 
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
          fontSize: `${fontSize}px`, 
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

export function ModelingKozhukhovoChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/modelingkozhukhovo', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;

  const baseFontSize = savedConfig?.baseFontSize ?? (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)));
  const axisFontSize = savedConfig?.axisFontSize ?? (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)));
  const legendFontSize = savedConfig?.legendFontSize ?? (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)));

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  // Для маленьких экранов (< 500px) поднимаем график выше, уменьшая верхний отступ
  const chartAreaTop = savedConfig?.chartAreaTop ?? (width <= 500 ? "3%" : "10%");
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isSuperTiny ? 30 : (isTiny ? 25 : 20));
  // Компенсируем уменьшение chartAreaTop увеличением высоты для маленьких экранов
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (width <= 500 ? (isSuperTiny ? "82%" : (isTiny ? "87%" : "92%")) : (isSuperTiny ? "75%" : (isTiny ? "80%" : (isMobile ? "85%" : "88%"))));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? ("94%");

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isSuperTiny ? "-15px" : (isVeryNarrow ? "10px" : (isTiny ? "-5px" : "5px")));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5);

  // Кастомные элементы для всех значений "Тепловая мощность нетто" (над точками)
  useEffect(() => {
    const addCustomAnnotations = () => {
      if (!chartContainerRef.current) return false;
      
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (!svgElement) return false;

      // Удаляем старые кастомные элементы
      const oldElements = container.querySelectorAll('.custom-annotation-total-net, .custom-annotation-load');
      oldElements.forEach(el => el.remove());

      const containerRect = container.getBoundingClientRect();
      const svgRect = svgElement.getBoundingClientRect();
      const totalYears = modelingKozhukhovoData.length;
      const chartWidth = svgRect.width;
      const chartHeight = svgRect.height;
      
      // Позиция по X
      const leftPercent = parseFloat(chartAreaLeft) / 100;
      const rightPercent = parseFloat(chartAreaRight) / 100;
      const chartAreaWidthPx = chartWidth * (1 - leftPercent - rightPercent);
      
      // Определяем диапазон vAxis
      const maxValue = Math.max(...modelingKozhukhovoData.map(d => Math.max(d.total_net, d.load)));
      const minValue = Math.min(...modelingKozhukhovoData.map(d => Math.min(d.total_net, d.load)));
      const vAxisMin = minValue * 0.9;
      const vAxisMax = maxValue * 1.1;
      const vAxisRange = vAxisMax - vAxisMin;
      
      // Пересчитываем chartAreaTop с учетом текущей ширины для правильного позиционирования
      const currentChartAreaTop = width <= 500 ? "3%" : "10%";
      const topPercent = parseFloat(currentChartAreaTop) / 100;
      // chartAreaBottom может быть числом (пиксели) или строкой (проценты)
      const bottomPercent = typeof chartAreaBottom === 'string' 
        ? parseFloat(chartAreaBottom) / 100 
        : chartAreaBottom / chartHeight; // Если число, делим на высоту SVG
      const chartAreaHeightPx = chartHeight * (1 - topPercent - bottomPercent);
      
      // Смещение SVG относительно контейнера
      const svgOffsetLeft = svgRect.left - containerRect.left;
      const svgOffsetTop = svgRect.top - containerRect.top;
      
      // Функция для вычисления Y позиции (относительно контейнера)
      const getYPosition = (value: number) => {
        const yPercent = ((value - vAxisMin) / vAxisRange);
        const yInChartArea = chartAreaHeightPx * (1 - yPercent);
        return svgOffsetTop + topPercent * chartHeight + yInChartArea;
      };
      
      // Функция для вычисления X позиции (относительно контейнера)
      const getXPosition = (yearIndex: number) => {
        const xInChartArea = (yearIndex / (totalYears - 1)) * chartAreaWidthPx;
        return svgOffsetLeft + leftPercent * chartWidth + xInChartArea;
      };
      
      // Адаптивные отступы (ближе к точкам)
      const isCompressed = width <= 500;
      // Для значений 264.8: при < 500px ближе к точке (меньший отступ), при >= 500px дальше от точки (больший отступ)
      const offsetAboveSmall = isCompressed ? 5 : 12; // < 500px: 5px (ближе к точке), >= 500px: 12px (дальше от точки)
      const offsetBelow = isCompressed ? 6 : 8; // Под точкой для load (ближе при малой ширине)
      
      // Создаем кастомные элементы для всех значений total_net (над точками)
      // Показываем значения для всех точек, включая 2025 год (даже если 0)
      modelingKozhukhovoData.forEach((d, index) => {
        // Показываем значение для 2025 года или если значение не равно 0
        if (d.total_net === 0 && d.year !== "2025") return;
        
        const xPosition = getXPosition(index);
        const yPosition = getYPosition(d.total_net);
        
        const element = document.createElement('div');
        element.className = 'custom-annotation-total-net';
        // Всегда над точкой, но с разными отступами
        element.style.cssText = `
          position: absolute;
          left: ${xPosition}px;
          top: ${yPosition}px;
          transform: translate(-50%, -100%);
          margin-top: -${offsetAboveSmall}px;
          font-family: 'Golos Text', sans-serif;
          font-size: ${axisFontSize}px;
          font-weight: bold;
          color: #3A3A3C;
          z-index: 1000;
          pointer-events: none;
          white-space: nowrap;
          line-height: 1;
        `;
        element.textContent = d.total_net === 0 ? "0" : Math.round(d.total_net).toString();
        container.appendChild(element);
      });
      
      // Создаем кастомные элементы для всех значений load (под точками, кроме нулей)
      // Значения для 2029 и 2030 года всегда под точками при любой ширине
      // Пытаемся найти точки на графике через SVG элементы
      const loadPoints: Array<{ x: number, y: number, index: number }> = [];
      modelingKozhukhovoData.forEach((d, index) => {
        if (d.load === 0) return;
        
        // Пробуем найти точку на графике через SVG
        // Google Charts создает точки как circle элементы
        const circles = svgElement.querySelectorAll('circle');
        let pointFound = false;
        
        // Ищем точку для второй серии (load) - обычно это индексы начиная с totalYears
        const pointIndex = totalYears + index; // Примерная логика индексации
        if (circles.length > pointIndex) {
          const circle = circles[pointIndex] as SVGCircleElement;
          if (circle) {
            const circleRect = circle.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            loadPoints.push({
              x: circleRect.left - containerRect.left + circleRect.width / 2,
              y: circleRect.top - containerRect.top + circleRect.height / 2,
              index
            });
            pointFound = true;
          }
        }
        
        // Если не нашли через SVG, используем вычисленные координаты
        if (!pointFound) {
          const xPosition = getXPosition(index);
          const yPosition = getYPosition(d.load);
          loadPoints.push({ x: xPosition, y: yPosition, index });
        }
      });
      
      // Создаем элементы для найденных точек
      loadPoints.forEach(({ x, y, index }) => {
        const d = modelingKozhukhovoData[index];
        const element = document.createElement('div');
        element.className = 'custom-annotation-load';
        element.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          transform: translate(-50%, 0);
          margin-top: ${offsetBelow}px;
          font-family: 'Golos Text', sans-serif;
          font-size: ${axisFontSize}px;
          font-weight: bold;
          color: #3A3A3C;
          z-index: 1000;
          pointer-events: none;
          white-space: nowrap;
          line-height: 1;
        `;
        element.textContent = Math.round(d.load).toString();
        container.appendChild(element);
      });
      
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
        const oldElements = chartContainerRef.current.querySelectorAll('.custom-annotation-total-net, .custom-annotation-load');
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
    ...modelingKozhukhovoData.map((d) => [
      d.year,
      d.total_net,
      "", // Скрываем стандартные аннотации для total_net (используем кастомные над точками)
      d.load,
      "", // Скрываем стандартные аннотации для load (используем кастомные под точками)
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
          stem: { color: "transparent", length: annotationStemLength },
        }
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      // viewWindow: { min: 0, max: 350 },
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

