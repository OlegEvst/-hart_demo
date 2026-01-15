import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { useParams } from "react-router-dom";
import chartDataMap, { type ChartDataInfo } from "./ChartDataMapper";
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

type TeploDataItem = {
  year: string;
  value: number;
};

export function TeploChart() {
  const { chartId } = useParams<{ chartId: string }>();
  const [width, height] = useWindowSize();
  const [chartData, setChartData] = useState<TeploDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartInfo, setChartInfo] = useState<ChartDataInfo | null>(null);
  
  // Используем chartId напрямую для загрузки стилей (без префикса пути)
  // Это гарантирует, что ключи совпадают с теми, что используются в конструкторе
  const savedConfig = useSavedChartConfig(chartId || '', width, height);
  
  useEffect(() => {
    const loadData = async () => {
      if (!chartId) return;
      
      const info = chartDataMap.find(c => c.id === chartId);
      if (!info) {
        setLoading(false);
        return;
      }
      
      setChartInfo(info);
      setLoading(true);
      
      try {
        const module = await info.dataLoader();
        let data: TeploDataItem[] = [];
        
        console.log('Загрузка данных для chartId:', chartId);
        console.log('dataKey из info:', info.dataKey);
        console.log('Ключи в модуле:', Object.keys(module));
        
        if (info.dataKey && module[info.dataKey as keyof typeof module]) {
          data = module[info.dataKey as keyof typeof module] as TeploDataItem[];
          console.log('Данные найдены по dataKey:', info.dataKey, 'Количество:', data.length);
        } else {
          console.log('dataKey не найден, ищем данные вручную...');
          // Пробуем найти данные в модуле
          const dataKey = Object.keys(module).find(key => 
            key.includes('Data') && 
            !key.includes('default') &&
            Array.isArray(module[key as keyof typeof module])
          );
          if (dataKey) {
            console.log('Найден dataKey:', dataKey);
            data = module[dataKey as keyof typeof module] as TeploDataItem[];
          } else if (module.default && Array.isArray(module.default)) {
            console.log('Используем default');
            data = module.default;
          } else {
            // Пробуем найти любые массивы в модуле
            const allKeys = Object.keys(module);
            console.log('Все ключи модуля:', allKeys);
            for (const key of allKeys) {
              const value = module[key as keyof typeof module];
              if (Array.isArray(value) && value.length > 0) {
                console.log('Найден массив в ключе:', key, 'Длина:', value.length);
                const firstItem = value[0];
                if (firstItem && typeof firstItem === 'object' && ('year' in firstItem || 'value' in firstItem)) {
                  data = value as TeploDataItem[];
                  console.log('Используем данные из ключа:', key);
                  break;
                }
              }
            }
          }
        }
        
        if (data && data.length > 0) {
          console.log('Загружены данные:', data.length, 'записей');
          console.log('Первая запись:', data[0]);
          console.log('Все данные:', data);
          setChartData(data);
        } else {
          console.error('Данные не найдены в модуле:', module);
          console.error('Все ключи модуля:', Object.keys(module));
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [chartId]);
  
  const isTiny = width <= 330;
  const isMobile = width < 600;

  // Определяем разрешение для получения дефолтных значений
  const is276x155 = width >= 260 && width <= 285;
  const is344x193 = width >= 340 && width <= 350;
  const is900x250 = width > 500;
  
  // Дефолтные конфигурации для teplo графиков
  let defaultBaseFontSize = 13;
  let defaultAxisFontSize = 12;
  let defaultLegendFontSize = 14;
  let defaultChartAreaLeft = "3%";
  let defaultChartAreaRight = "3%";
  let defaultChartAreaTop = "-25%";
  let defaultChartAreaBottom = 20;
  let defaultChartAreaHeight = "98%";
  let defaultChartAreaWidth = "94%";
  let defaultLegendLeftPadding = "3%";
  let defaultLegendMarginTop = "20px";
  let defaultAnnotationStemLength = 7.5;
  let defaultVAxisGridlinesCount = 1;
  let defaultChartContainerHeight = "250px"; // Для разрешения 900x250
  
  if (is276x155) {
    defaultBaseFontSize = 9;
    defaultAxisFontSize = 9;
    defaultLegendFontSize = 10;
    defaultChartAreaLeft = "5.1%";
    defaultChartAreaRight = "5.7%";
    defaultChartAreaTop = "-2.3%";
    defaultChartAreaBottom = 60;
    defaultChartAreaHeight = "97.2%";
    defaultChartAreaWidth = "90%";
    defaultLegendLeftPadding = "6%";
    defaultLegendMarginTop = "-25px";
    defaultAnnotationStemLength = 6;
    defaultVAxisGridlinesCount = 1;
    defaultChartContainerHeight = "151px";
  } else if (is344x193) {
    defaultBaseFontSize = 10;
    defaultAxisFontSize = 10.5;
    defaultLegendFontSize = 11;
    defaultChartAreaLeft = "5%";
    defaultChartAreaRight = "5%";
    defaultChartAreaTop = "-10%";
    defaultChartAreaBottom = 35;
    defaultChartAreaHeight = "98%";
    defaultChartAreaWidth = "94%";
    defaultLegendLeftPadding = "5%";
    defaultLegendMarginTop = "3px";
    defaultAnnotationStemLength = 5;
    defaultVAxisGridlinesCount = 1;
    defaultChartContainerHeight = "151px";
  } else if (is900x250) {
    defaultBaseFontSize = 13;
    defaultAxisFontSize = 14.5;
    defaultLegendFontSize = 16;
    defaultChartAreaLeft = "2.8%";
    defaultChartAreaRight = "3%";
    defaultChartAreaTop = "-25%";
    defaultChartAreaBottom = 20;
    defaultChartAreaHeight = "98%";
    defaultChartAreaWidth = "94%";
    defaultLegendLeftPadding = "3%";
    defaultLegendMarginTop = "20px";
    defaultAnnotationStemLength = 7.5;
    defaultVAxisGridlinesCount = 1;
    defaultChartContainerHeight = "250px"; // Для разрешения 900x250
  }

  // Применяем сохраненные стили или используем дефолтные
  const baseFontSize = savedConfig?.baseFontSize ?? defaultBaseFontSize;
  const axisFontSize = savedConfig?.axisFontSize ?? defaultAxisFontSize;
  const legendFontSize = savedConfig?.legendFontSize ?? defaultLegendFontSize;

  const chartAreaLeft = savedConfig?.chartAreaLeft ?? defaultChartAreaLeft;
  const chartAreaRight = savedConfig?.chartAreaRight ?? defaultChartAreaRight;
  const chartAreaTop = savedConfig?.chartAreaTop ?? defaultChartAreaTop;
  const chartAreaBottom = savedConfig?.chartAreaBottom ?? defaultChartAreaBottom;
  const chartAreaHeight = savedConfig?.chartAreaHeight ?? defaultChartAreaHeight;
  const chartAreaWidth = savedConfig?.chartAreaWidth ?? defaultChartAreaWidth;

  const legendLeftPadding = savedConfig?.legendLeftPadding ?? defaultLegendLeftPadding;
  const legendMarginTop = savedConfig?.legendMarginTop ?? defaultLegendMarginTop;
  
  const annotationStemLength = savedConfig?.annotationStemLength ?? defaultAnnotationStemLength;
  
  const containerPaddingTop = savedConfig?.containerPaddingTop ?? (is276x155 ? "0%" : (is344x193 ? "1.4%" : "1.2%"));
  const chartContainerHeight = savedConfig?.chartContainerHeight ?? defaultChartContainerHeight;
  
  // Логирование для отладки
  if (savedConfig) {
    console.log('[TeploChart] Применяются сохраненные стили:', {
      baseFontSize,
      axisFontSize,
      legendFontSize,
      chartAreaLeft,
      chartAreaRight,
      chartAreaTop,
      chartAreaBottom,
      chartAreaHeight,
      chartAreaWidth,
      legendLeftPadding,
      legendMarginTop,
      annotationStemLength,
      containerPaddingTop,
      chartContainerHeight,
    });
  }

  // Определяем тип графика для правильной легенды
  const isElectricChart = chartId?.includes('electric') || chartInfo?.path?.includes('electric');
  const legendText = isElectricChart 
    ? 'Резерв мощности, МВА'
    : 'Резерв тепловой мощности, Гкал/ч';

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
          {legendText}
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
        color: "#8E8E93", 
        fontSize: axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: savedConfig?.vAxisGridlinesCount ?? defaultVAxisGridlinesCount },
      baselineColor: "#E5E5EA",
      baseline: { color: "#E5E5EA", lineWidth: 1 },
      viewWindowMode: "explicit" as const,
      format: "decimal",
      ticks: [{ v: 0, f: "0" }] as any,
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

  if (loading) {
    return (
      <div style={{ 
        width: "100%", 
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F7",
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ 
        width: "100%", 
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F7",
      }}>
        <div>Данные не найдены</div>
      </div>
    );
  }

  // Вычисляем min и max для vAxis
  const allValues = chartData.map(d => {
    const val = typeof d.value === 'number' ? d.value : parseFloat(String(d.value));
    return isNaN(val) ? 0 : val;
  }).filter(v => v !== null && v !== undefined);
  
  if (allValues.length === 0) {
    console.error('Нет валидных значений в данных');
    return (
      <div style={{ 
        width: "100%", 
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F7",
      }}>
        <div>Ошибка: нет валидных данных для отображения</div>
      </div>
    );
  }
  
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  // Не устанавливаем min: 0, если данные не начинаются с 0
  const calculatedMin = minValue > 0 ? minValue * 0.95 : 0;
  const calculatedMax = maxValue * 1.05; // Добавляем небольшой отступ сверху
  const vAxisMin = savedConfig?.vAxisMin !== undefined ? savedConfig.vAxisMin : calculatedMin;
  const vAxisMax = savedConfig?.vAxisMax !== undefined ? savedConfig.vAxisMax : calculatedMax;

  console.log('Значения для графика:', allValues);
  console.log('minValue:', minValue, 'maxValue:', maxValue);
  console.log('vAxisMin:', vAxisMin, 'vAxisMax:', vAxisMax);

  const data1 = [
    [
      "Год",
      legendText,
      { role: "annotation" },
    ],
    ...chartData.map((d, index) => {
      const year = String(d.year);
      const value = typeof d.value === 'number' ? d.value : parseFloat(String(d.value));
      const numValue = isNaN(value) ? 0 : value;
      
      // Применяем логику экстремумов: показываем значение, если оно отличается от предыдущего или следующего
      let annotation = "";
      const valueRounded = Math.round(numValue * 1000) / 1000;
      const prevValue = index > 0 ? Math.round((chartData[index - 1].value || 0) * 1000) / 1000 : null;
      const nextValue = index < chartData.length - 1 ? Math.round((chartData[index + 1].value || 0) * 1000) / 1000 : null;
      
      if (prevValue === null || nextValue === null || valueRounded !== prevValue || valueRounded !== nextValue) {
        annotation = numValue.toFixed(3);
      }
      
      return [
        year,
        numValue,
        annotation,
      ];
    }),
  ];
  
  console.log('Данные для графика (первые 3 строки):', data1.slice(0, 4));

  const options1 = {
    ...commonOptions,
    series: {
      0: { 
        color: "#FF9500", 
        pointShape: "circle", 
        areaOpacity: 0.15,
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      viewWindow: { min: vAxisMin, max: vAxisMax },
      gridlines: { 
        color: "#F2F2F7", 
        count: savedConfig?.vAxisGridlinesCount ?? defaultVAxisGridlinesCount,
      },
      format: "decimal",
      ticks: [{ v: 0, f: "0" }] as any,
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
          padding: containerPaddingTop ? `${containerPaddingTop} 0 5px 0` : "2px 0 5px 0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          width: width > 500 ? "900px" : "100%",
          maxWidth: "100%",
        }}>
          <div style={{ 
            width: "100%", 
            height: chartContainerHeight,
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
