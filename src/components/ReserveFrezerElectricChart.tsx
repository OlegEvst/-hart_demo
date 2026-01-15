import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { reserveFrezerElectricData } from "../data/reserveFrezerElectric";

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

export function ReserveFrezerElectricChart() {
  const [width, height] = useWindowSize();
  const savedConfig = useSavedChartConfig('/reservefrezer_electric', width, height);
  
  // Отладочное логирование
  useEffect(() => {
    console.log('[ReserveFrezerElectricChart] Загружена конфигурация:', savedConfig);
    console.log('[ReserveFrezerElectricChart] Размер окна:', width, 'x', height);
  }, [savedConfig, width, height]);
  
  const isTiny = width <= 330;
  const isMobile = width < 600;
  const isFixedSize = width >= 270 && width <= 280; // Для экрана 276x155
  const isWidth340 = width >= 340 && width <= 350; // Для экрана 344x193
  const is900x250 = width > 500; // Для экрана 900x250

  // Значения по умолчанию из сохраненной конфигурации
  type ResolutionKey = '276x155' | '344x193' | '900x250';
  const getDefaultValue = <T,>(key: string, defaults: Record<ResolutionKey, T>): T => {
    const configValue = savedConfig?.[key as keyof typeof savedConfig];
    if (configValue !== undefined) {
      return configValue as T;
    }
    if (isFixedSize) return defaults['276x155'];
    if (isWidth340) return defaults['344x193'];
    if (is900x250) return defaults['900x250'];
    // Fallback для других размеров
    return isFixedSize ? defaults['276x155'] : (isWidth340 ? defaults['344x193'] : defaults['900x250']);
  };

  const baseFontSize = getDefaultValue('baseFontSize', { '276x155': 9, '344x193': 10, '900x250': 13 });
  const axisFontSize = getDefaultValue('axisFontSize', { '276x155': 8, '344x193': 9, '900x250': 12 });
  const legendFontSize = getDefaultValue('legendFontSize', { '276x155': 8, '344x193': 10, '900x250': 14 });

  const chartAreaLeft = getDefaultValue('chartAreaLeft', { '276x155': '4.9%', '344x193': '4.2%', '900x250': '3%' });
  const chartAreaRight = getDefaultValue('chartAreaRight', { '276x155': '4.2%', '344x193': '4.2%', '900x250': '3%' });
  const chartAreaTop = getDefaultValue('chartAreaTop', { '276x155': '15%', '344x193': '-10%', '900x250': '-25%' });
  const chartAreaBottom = getDefaultValue('chartAreaBottom', { '276x155': 33, '344x193': 35, '900x250': 20 });
  const chartAreaHeight = getDefaultValue('chartAreaHeight', { '276x155': '98%', '344x193': '98%', '900x250': '89.3%' });
  const chartAreaWidth = getDefaultValue('chartAreaWidth', { '276x155': '90%', '344x193': '94%', '900x250': '94%' });

  const legendLeftPadding = getDefaultValue('legendLeftPadding', { '276x155': '8%', '344x193': '5%', '900x250': '2.5%' });
  const legendMarginTop = getDefaultValue('legendMarginTop', { '276x155': '-3px', '344x193': '0px', '900x250': '16px' });
  
  // Адаптивные отступы для аннотаций
  const annotationStemLength = getDefaultValue('annotationStemLength', { '276x155': 5, '344x193': 5, '900x250': 7.5 });

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

  // Используем сохраненные значения или значения по умолчанию из конфигурации
  const vAxisMin = getDefaultValue('vAxisMin', { '276x155': -10, '344x193': -10, '900x250': -10 });
  const vAxisMax = getDefaultValue('vAxisMax', { '276x155': 0, '344x193': 10, '900x250': 10 });

  // Отслеживаем уникальные значения для аннотаций
  const seenReserve = new Set<number>();
  
  // Проверяем, все ли значения равны 0
  const allZero = reserveFrezerElectricData.every(d => d.reserve === 0);

  const data1 = [
    [
      "Год",
      "Резерв электрической мощности, МВА",
      { role: "annotation" },
    ],
    ...reserveFrezerElectricData.map((d) => {
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
        count: getDefaultValue('vAxisGridlinesCount', { '276x155': 1, '344x193': 1, '900x250': 1 }),
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
          padding: `${getDefaultValue('containerPaddingTop', { '276x155': '5.8%', '344x193': '2px', '900x250': '2px' })} 0 5px 0`,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: width > 500 ? "900px" : "100%",
          maxWidth: "100%",
        }}>
            <div style={{ 
              width: "100%", 
              height: getDefaultValue('chartContainerHeight', { '276x155': '120px', '344x193': '166px', '900x250': '200px' }),
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

