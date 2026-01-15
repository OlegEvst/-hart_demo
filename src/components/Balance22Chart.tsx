import { useEffect, useState, useRef } from "react";
import { Chart } from "react-google-charts";
import { balance22Data } from "../data/balance22";

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

export function Balance22Chart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/balance22', width, height);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Кастомные элементы для 2028 и 2029 годов
  useEffect(() => {
    const addCustomAnnotations = () => {
      if (!chartContainerRef.current) return false;
      
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg') as SVGSVGElement;
      if (!svgElement) return false;

      // Удаляем старые кастомные элементы
      const oldElements = container.querySelectorAll('.custom-annotation-2028, .custom-annotation-2029');
      oldElements.forEach(el => el.remove());

      const svgRect = svgElement.getBoundingClientRect();
      const totalYears = balance22Data.length;
      const chartWidth = svgRect.width;
      const chartHeight = svgRect.height;
      
      // Позиция по X
      const leftPercent = parseFloat(chartAreaLeft) / 100;
      const rightPercent = parseFloat(chartAreaRight) / 100;
      const chartAreaWidthPx = chartWidth * (1 - leftPercent - rightPercent);
      
      // Значения для 2028 года
      const value2028 = balance22Data.find(d => d.year === "2028");
      const yearIndex2028 = value2028 ? balance22Data.findIndex(d => d.year === "2028") : -1;
      
      // Значения для 2029 года
      const value2029 = balance22Data.find(d => d.year === "2029");
      const yearIndex2029 = value2029 ? balance22Data.findIndex(d => d.year === "2029") : -1;
      
      if (!value2028 && !value2029) return false;
      
      const vAxisMin = 2500;
      const vAxisMax = 3700;
      const vAxisRange = vAxisMax - vAxisMin;
      
      const topPercent = 0;
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
      
      // Адаптивные отступы в зависимости от ширины (объявляем один раз для всей функции)
      const annotationOffset = width > 500 ? 1.5 : 1; // Увеличиваем отступы на 50% при ширине > 500px
      
      // Кастомные элементы для 2028 года (3377.3 под синим графиком)
             if (value2028 && yearIndex2028 >= 0) {
               const xPosition2028 = getXPosition(yearIndex2028);
               const blueYPosition2028 = getYPosition(value2028.load);
               
               const blueElement2028 = document.createElement('div');
               blueElement2028.className = 'custom-annotation-2028';
               blueElement2028.style.position = 'absolute';
               blueElement2028.style.left = `${xPosition2028}px`;
               blueElement2028.style.top = `${blueYPosition2028 + 12 * annotationOffset}px`; // Под точкой
        blueElement2028.style.transform = 'translateX(-50%)';
        blueElement2028.style.fontFamily = "'Golos Text', sans-serif";
        blueElement2028.style.fontSize = `${axisFontSize}px`;
        blueElement2028.style.fontWeight = 'bold';
        blueElement2028.style.color = '#3A3A3C';
        blueElement2028.style.zIndex = '1';
        blueElement2028.style.pointerEvents = 'none';
        blueElement2028.textContent = Math.round(value2028.load).toString(); // 3377.3
        container.appendChild(blueElement2028);
      }
      
      // Кастомные элементы для 2029 года
      if (!value2029 || yearIndex2029 < 0) return true;
      
      const xPosition2029 = getXPosition(yearIndex2029);
      const greenYPosition = getYPosition(value2029.total_net);
      const blueYPosition = getYPosition(value2029.load);

      // Создаем элемент для зеленого графика (total_net) - под точкой
      const greenElement = document.createElement('div');
      greenElement.className = 'custom-annotation-2029';
      greenElement.style.position = 'absolute';
      greenElement.style.left = `${xPosition2029}px`;
      greenElement.style.top = `${greenYPosition + 12 * annotationOffset}px`; // Под точкой
      greenElement.style.transform = 'translateX(-50%)';
      greenElement.style.fontFamily = "'Golos Text', sans-serif";
      greenElement.style.fontSize = `${axisFontSize}px`;
      greenElement.style.fontWeight = 'bold';
      greenElement.style.color = '#3A3A3C';
      greenElement.style.zIndex = '1';
      greenElement.style.pointerEvents = 'none';
      greenElement.textContent = Math.round(value2029.total_net).toString();
      container.appendChild(greenElement);

      // Создаем элемент для синего графика (load) - над точкой
      const blueElement = document.createElement('div');
      blueElement.className = 'custom-annotation-2029';
      blueElement.style.position = 'absolute';
      blueElement.style.left = `${xPosition2029}px`;
      // Синий над точкой, зеленый под точкой - они не должны перекрываться
      blueElement.style.top = `${blueYPosition - 12 * annotationOffset}px`; // Над точкой, но ближе к ней
      blueElement.style.transform = 'translateX(-50%)';
      blueElement.style.fontFamily = "'Golos Text', sans-serif";
      blueElement.style.fontSize = `${axisFontSize}px`;
      blueElement.style.fontWeight = 'bold';
      blueElement.style.color = '#3A3A3C';
      blueElement.style.zIndex = '1';
      blueElement.style.pointerEvents = 'none';
      blueElement.textContent = Math.round(value2029.load).toString(); // 3491.9
      container.appendChild(blueElement);
      
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
        const oldElements = chartContainerRef.current.querySelectorAll('.custom-annotation-2028, .custom-annotation-2029');
        oldElements.forEach(el => el.remove());
      }
    };
  }, [width, isTiny, isMobile, axisFontSize, chartAreaLeft, chartAreaRight, chartAreaBottom]);

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isTiny ? "5%" : (isMobile ? "4%" : "3%"));
  const isVeryNarrow = width <= 270 && width > 250;
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isSuperTiny ? "-15px" : (isVeryNarrow ? "10px" : (isTiny ? "-5px" : "5px")));
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = savedConfig?.annotationStemLength ?? (width > 500 ? 7.5 : 5); // Увеличиваем на 50% при ширине > 500px

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
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 3 },
      baselineColor: "#E5E5EA",
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
    ...balance22Data.map((d) => [
      d.year,
      d.total_net,
      d.year === "2029" ? "" : Math.round(d.total_net).toString(), // Скрываем стандартную аннотацию для 2029 года (используем кастомную)
      d.load,
      (d.year === "2028" || d.year === "2029") ? "" : Math.round(d.load).toString(), // Скрываем стандартную аннотацию для 2028 и 2029 года (используем кастомные)
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
          stem: { color: "transparent", length: annotationStemLength }, // Аннотации над точками для оранжевого графика
        }
      }, 
      1: { 
        color: "#34C759", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        annotations: {
          stem: { color: "transparent", length: annotationStemLength }, // Аннотации над точками для синего графика (3543.3)
        }
      },
    },
    vAxis: {
      textStyle: { 
        color: "transparent", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 1 }, // Только две линии: 2500 и 3700
      baselineColor: "#E5E5EA",
      viewWindowMode: "explicit" as const,
      viewWindow: { 
        min: 2500, 
        max: 3700 
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
          <CustomLegend />
        </div>
      </div>
    </div>
  );
}

