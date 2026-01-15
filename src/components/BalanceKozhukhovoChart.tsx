import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { balanceKozhukhovoData } from "../data/balanceKozhukhovo";

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

const CustomLegend = ({ paddingLeft, marginTop, fontSize, markerSize, gap, rowGap }: { paddingLeft: string, marginTop: string, fontSize: number, markerSize: number, gap: string, rowGap: string }) => (

    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: rowGap,
      padding: "0",
      paddingLeft: paddingLeft,
      marginTop: marginTop,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: gap }}>
        <div style={{ 
          width: `${markerSize}px`, height: `${markerSize}px`, minWidth: `${markerSize}px`, borderRadius: "50%", backgroundColor: "#FF9500" 
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
      <div style={{ display: "flex", alignItems: "center", gap: gap }}>
        <div style={{ 
          width: `${markerSize}px`, height: `${markerSize}px`, minWidth: `${markerSize}px`, borderRadius: "50%", backgroundColor: "#34C759" 
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

export function BalanceKozhukhovoChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/balancekozhukhovo', width, height);
  
  
  // Адаптивность
  const isTiny = width <= 330;
  const isSuperTiny = width <= 280;
  const isMobile = width < 600;
  const isNarrow = width < 500;
  const isVerySmall = width < 340; // Для экранов меньше 340px уменьшаем размеры
  
  // Для маленьких экранов (272px) - фиксированные правила
  const isFixedSize = width <= 272;
  
  // Адаптивные размеры шрифтов
  // Для фиксированного размера 272x150 увеличиваем шрифты, но не уводим в скролл
  const baseFontSize = savedConfig?.baseFontSize ?? (isFixedSize ? 10 : (isVerySmall ? (isSuperTiny ? 8 : 8) : (isSuperTiny ? 9 : (isTiny ? 10 : (isMobile ? 11 : 13)))));
  const axisFontSize = savedConfig?.axisFontSize ?? (isFixedSize ? 9 : (isVerySmall ? (isSuperTiny ? 7 : 7) : (isSuperTiny ? 8 : (isTiny ? 9 : (isMobile ? 10 : 12)))));
  const legendFontSize = savedConfig?.legendFontSize ?? (isFixedSize ? 9 : (isVerySmall ? (isSuperTiny ? 7 : 7) : (isSuperTiny ? 8 : (isTiny ? 10 : (isMobile ? 11 : 14)))));

  // Адаптивные отступы графика
  const chartAreaLeft = savedConfig?.chartAreaLeft ?? (isFixedSize ? "8%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%")));
  const chartAreaRight = savedConfig?.chartAreaRight ?? (isFixedSize ? "5%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%")));
  const chartAreaTop = savedConfig?.chartAreaTop ?? (isVerySmall ? (isSuperTiny ? "0%" : "0%") : (isFixedSize ? "0%" : (isNarrow ? "0%" : "0%")));
  // Для очень маленьких экранов уменьшаем нижний отступ, чтобы уменьшить расстояние от легенды до графика
  // Для экранов более 500px увеличиваем нижний отступ, чтобы годы не пропадали под графиком
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? (isFixedSize ? 30 : (isVerySmall ? (isSuperTiny ? 15 : 18) : (isSuperTiny ? 12 : (isTiny ? 12 : (width > 500 ? 25 : 15)))));
  // Для экранов более 500px увеличиваем высоту графика на 20%
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? (isFixedSize ? "72%" : (isVerySmall ? (isSuperTiny ? "80%" : "82%") : (isSuperTiny ? "88%" : (isTiny ? "92%" : (isMobile ? "96%" : width > 500 ? "98%" : "98%")))));
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? (isFixedSize ? "90%" : "94%");

  // Адаптивная легенда
  const legendLeftPadding = savedConfig?.legendLeftPadding ?? (isFixedSize ? "8%" : (isTiny ? "5%" : (isMobile ? "4%" : "3%")));
  const isVeryNarrow = width <= 270 && width > 250;
  // Отступ легенды от графика - уменьшаем для размера 272x150
  const legendMarginTop = savedConfig?.legendMarginTop ?? (isFixedSize ? "-6px" : (isVerySmall ? (isSuperTiny ? "2px" : "4px") : (isSuperTiny ? "2px" : (isVeryNarrow ? "5px" : (isTiny ? "4px" : "6px")))));
  const legendMarkerSize = isFixedSize 
    ? 8
    : (isVerySmall ? (isSuperTiny ? 6 : 6) : (isSuperTiny ? 8 : (isTiny ? 10 : 12)));
  const legendGap = isVerySmall 
    ? "3px"
    : (isFixedSize ? "3px" : (isTiny ? "4px" : "8px"));
  const legendRowGap = isVerySmall 
    ? "0px"
    : (isFixedSize ? "0px" : (isTiny ? "1px" : "2px"));
  
  // Отступы для аннотаций - для AreaChart положительное значение размещает НАД точками
  const annotationStemLength = savedConfig?.annotationStemLength ?? (isFixedSize ? 6 : (width > 500 ? 6 : 5));

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
    lineWidth: isFixedSize ? 2.5 : (isTiny ? 3 : 4),
    pointSize: isFixedSize ? 4 : (isTiny ? 5.4 : 7.2),
    curveType: "function",
    annotations: {
      textStyle: {
        fontName: "Golos Text",
        fontSize: axisFontSize,
        bold: true,
        color: "#3A3A3C",
      },
      stem: { color: "transparent", length: annotationStemLength }, // Положительное значение размещает над точками для AreaChart
      highContrast: true,
      style: "point",
    },
    tooltip: {
      textStyle: { 
        fontName: "Golos Text",
        bold: true,
        fontSize: isFixedSize ? 7 : (isTiny ? 9 : 10),
        color: "#1C1C1E"
      },
      showColorCode: true,
      isHtml: false,
      trigger: "focus",
      ignoreBounds: false,
    },
    isStacked: false,
  };

  // Меняем порядок серий: зеленая линия (нагрузка) будет поверх оранжевой
  const data1 = [
    [
      "Год",
      "Тепловая мощность нетто, Гкал/ч",
      { role: "annotation" },
      "Нагрузка существующих объектов, Гкал/ч",
      { role: "annotation" },
    ],
    ...balanceKozhukhovoData.map((d) => [
      d.year,
      d.total_net,
      d.year === "2025" ? "0" : (d.total_net === 0 ? "" : Math.round(d.total_net).toString()), // Показываем "0" для 2025 года и значения 265 для остальных лет над точками
      d.load,
      "", // Не показываем значения для нагрузки вообще
    ]),
  ];

  const options1 = {
    ...commonOptions,
    series: {
      0: { 
        color: "#FF9500", // Оранжевая линия (итоговая мощность) - первая, будет под зеленой
        pointShape: "circle", 
        areaOpacity: 0.15,
        lineWidth: isFixedSize ? 2.5 : (isTiny ? 3 : 4), // Толщина линии
        annotations: {
          stem: { color: "transparent", length: annotationStemLength }, // Положительное значение размещает над точками
          alwaysOutside: true, // Размещает аннотации строго над точками
        }
      }, 
      1: { 
        color: "#34C759", // Зеленая линия (нагрузка) - вторая, будет поверх оранжевой
        pointShape: "circle", 
        areaOpacity: 0.15,
        lineWidth: isFixedSize ? 2.5 : (isTiny ? 3 : 4), // Толщина линии такая же, как у оранжевой
        annotations: {
          stem: { color: "transparent", length: annotationStemLength }, // Положительное значение размещает над точками
          alwaysOutside: true, // Размещает аннотации строго над точками
        }
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      // Для экранов более 500px уменьшаем max на 20%, чтобы увеличить физическое расстояние между 0 и 265 на 20%
      viewWindow: { min: 0, max: width > 500 ? 400 : 500 },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? 1 },
      ticks: [0] as any, // Только значение 0 на шкале, убираем 265
    },
  };

  // Адаптивные размеры контейнера
  // Для разрешений менее 500px высота должна быть не меньше 150px, увеличиваем для размещения легенды внизу
  const containerWidth = isFixedSize ? 272 : (isMobile ? "100%" : "900px");
  const isWidth344 = width === 344 || (width >= 340 && width <= 350 && width !== 340); // Для ширины 344px
  const isWidth340 = width === 340 || (width >= 338 && width <= 342 && width !== 344); // Для ширины 340px
  // Для экранов более 500px увеличиваем высоту контейнера на 20%
  const containerHeight = isWidth340 
    ? "190px"
    : (isWidth344 
      ? "160px"
      : (isNarrow 
        ? (isFixedSize ? 180 : "180px")
        : (isTiny ? "180px" : (width > 500 ? "240px" : "200px"))));

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
        marginTop: isNarrow ? "-40px" : "-30px", // Поднимаем весь контейнер выше
      }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "0",
          padding: isFixedSize ? "0 0 5px 0" : "0 0 5px 0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: containerWidth,
          maxWidth: "100%",
          marginTop: isNarrow ? "-10px" : "0",
        }}>
          <div 
            style={{ 
            width: "100%", 
              height: typeof containerHeight === "string" ? containerHeight : `${containerHeight}px`,
          }}>
            <Chart
              chartType="AreaChart"
              width="100%"
              height="100%"
              data={data1}
              options={options1}
            />
          </div>
          <CustomLegend paddingLeft={legendLeftPadding} marginTop={legendMarginTop} fontSize={legendFontSize} markerSize={legendMarkerSize} gap={legendGap} rowGap={legendRowGap} />
        </div>
      </div>
    </div>
  );
}

