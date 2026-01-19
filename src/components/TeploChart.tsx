import { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import { useParams } from "react-router-dom";
import chartDataMap, { type ChartDataInfo } from "./ChartDataMapper";
import { useSavedChartConfig } from "../hooks/useSavedChartConfig";
// Импортируем все данные статически, как в charts-demo 2
import { getChartData } from "../data/allChartsData";
// Импортируем утилиты для адаптивной шкалы
import { calculateAdaptiveAxisRange, detectResolution } from "../utils/adaptiveAxis";
// Импортируем getDefaultConfig для единого источника дефолтных значений
import { getDefaultConfig } from "../utils/defaultChartConfigs";

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
  value?: number | null;
  reserve?: number | null;
};

export function TeploChart() {
  const { chartId } = useParams<{ chartId: string }>();
  const [width, height] = useWindowSize();
  const [chartData, setChartData] = useState<TeploDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartInfo, setChartInfo] = useState<ChartDataInfo | null>(null);
  
  // ВАЖНО: Нормализуем chartId для загрузки стилей (как для данных)
  // Это гарантирует, что ключи совпадают с теми, что используются в конструкторе и configs.json
  const normalizeChartId = (id: string): string => {
    if (!id) return id;
    // Нормализуем chartId: заменяем elektrops на electricps
    let normalized = id.replace(/^elektrops/, 'electricps');
    
    // Нормализация для известных несоответствий URL и chartId
    const urlToChartIdMap: Record<string, string> = {
      // Варианты с szao -> без szao (если данных нет для варианта с szao, используем данные без szao)
      'teplokotelnaya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
      'teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park': 'teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park',
      // Варианты с kotel_naya -> kotelnaya
      'teplokotel_naya_voennyy_komissariat_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
      'teplokotel_naya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
    };
    
    if (urlToChartIdMap[normalized]) {
      normalized = urlToChartIdMap[normalized];
    }
    
    return normalized;
  };
  
  // Используем нормализованный chartId для загрузки стилей
  // Это гарантирует, что ключи совпадают с теми, что используются в конструкторе и configs.json
  const normalizedChartIdForStyles = normalizeChartId(chartId || '');
  const savedConfig = useSavedChartConfig(normalizedChartIdForStyles, width, height);
  
  useEffect(() => {
    const loadData = async () => {
      if (!chartId) return;
      
      // Нормализуем chartId: заменяем elektrops на electricps
      let normalizedChartId = chartId.replace(/^elektrops/, 'electricps');
      
      // Нормализация для известных несоответствий URL и chartId
      const urlToChartIdMap: Record<string, string> = {
        // Варианты с szao -> без szao (если данных нет для варианта с szao, используем данные без szao)
        'teplokotelnaya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
        'teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park': 'teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park',
        // Варианты с kotel_naya -> kotelnaya
        'teplokotel_naya_voennyy_komissariat_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy',
        'teplokotel_naya_voennyy_komissariat_szao_g_moskvy': 'teplokotelnaya_voennyy_komissariat_g_moskvy', // Используем данные без szao
      };
      
      if (urlToChartIdMap[normalizedChartId]) {
        normalizedChartId = urlToChartIdMap[normalizedChartId];
        console.log(`[TeploChart] Нормализован URL: ${chartId} -> ${normalizedChartId}`);
      }
      
      let info = chartDataMap.find(c => c.id === normalizedChartId);
      
      if (!info) {
        // Пробуем найти по оригинальному chartId
        info = chartDataMap.find(c => c.id === chartId);
      }
      
      // Если график не найден в ChartDataMapper, создаем минимальную info из данных
      if (!info) {
        console.warn(`[TeploChart] График не найден в ChartDataMapper: ${chartId} (нормализованный: ${normalizedChartId}), пробуем загрузить данные напрямую`);
        // Создаем минимальную info для работы с данными
        info = {
          id: normalizedChartId,
          name: normalizedChartId.replace(/_/g, ' '),
          path: `/${normalizedChartId}`,
          dataType: 'reserve' as const,
          dataLoader: () => Promise.resolve({}),
          dataKey: undefined
        };
      }
      
      if (normalizedChartId !== chartId) {
        console.log(`[TeploChart] Используем нормализованный chartId: ${normalizedChartId} вместо ${chartId}`);
      }
      
      setChartInfo(info);
      setLoading(true);
      
      try {
        // Используем прямые статические импорты, как в charts-demo 2
        // Все данные уже импортированы в allChartsData.ts
        // Используем нормализованный chartId для поиска данных
        console.log(`[TeploChart] Загрузка данных для chartId: ${chartId}, normalized: ${normalizedChartId}, dataKey: ${info.dataKey || 'auto'}`);
        
        // Пробуем загрузить данные напрямую из allChartsData
        let data = getChartData(normalizedChartId, info.dataKey || undefined);
        
        // Если не нашли, пробуем оригинальный chartId
        if (!data || data.length === 0) {
          data = getChartData(chartId, info.dataKey || undefined);
        }
        
        if (data && data.length > 0) {
          console.log('✅ Данные найдены для chartId:', chartId, 'Количество:', data.length);
          setChartData(data as TeploDataItem[]);
        } else {
          console.error('❌ Данные не найдены для chartId:', chartId, 'normalized:', normalizedChartId, 'dataKey:', info.dataKey);
          // Пробуем загрузить через dataLoader как fallback
          if (info.dataLoader) {
            console.log('[TeploChart] Пробуем загрузить через dataLoader...');
            try {
              const module = await info.dataLoader();
              if (module) {
                const dataKey = info.dataKey || Object.keys(module).find(key => 
                  key.includes('Data') && Array.isArray(module[key])
                );
                if (dataKey && module[dataKey]) {
                  const fallbackData = module[dataKey];
                  if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                    console.log('✅ Данные найдены через dataLoader:', fallbackData.length);
                    setChartData(fallbackData as TeploDataItem[]);
                  }
                }
              }
            } catch (loaderError) {
              console.error('Ошибка загрузки через dataLoader:', loaderError);
            }
          }
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
  const resolution = detectResolution(width, height);
  
  // Получаем дефолтную конфигурацию из единого источника (как в превью)
  // Всегда используем isTeplo=true для TeploChart
  const defaultConfig = getDefaultConfig(resolution, true);
  
  // Дефолтные значения из единого источника
  const defaultBaseFontSize = defaultConfig.baseFontSize;
  const defaultAxisFontSize = defaultConfig.axisFontSize;
  const defaultLegendFontSize = defaultConfig.legendFontSize;
  const defaultChartAreaLeft = defaultConfig.chartAreaLeft;
  const defaultChartAreaRight = defaultConfig.chartAreaRight;
  const defaultChartAreaTop = defaultConfig.chartAreaTop;
  const defaultChartAreaBottom = defaultConfig.chartAreaBottom;
  const defaultChartAreaHeight = defaultConfig.chartAreaHeight;
  const defaultChartAreaWidth = defaultConfig.chartAreaWidth;
  const defaultLegendLeftPadding = defaultConfig.legendLeftPadding;
  const defaultLegendMarginTop = defaultConfig.legendMarginTop;
  const defaultAnnotationStemLength = defaultConfig.annotationStemLength;
  const defaultChartContainerHeight = defaultConfig.chartContainerHeight;

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
  
  const containerPaddingTop = savedConfig?.containerPaddingTop ?? defaultConfig.containerPaddingTop;
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

  // Вычисляем адаптивную шкалу ДО создания commonOptions
  // Для balance графиков учитываем и total_net и load, для reserve - только reserve/value
  const allValues = chartInfo?.dataType === 'balance'
    ? [
        ...chartData.map(d => (d as any).total_net).filter(v => v !== null && v !== undefined && !isNaN(v as number)),
        ...chartData.map(d => (d as any).load).filter(v => v !== null && v !== undefined && !isNaN(v as number))
      ] as number[]
    : chartData.map(d => {
        const val = d.value ?? d.reserve;
        return typeof val === 'number' ? val : (val !== null && val !== undefined ? parseFloat(String(val)) : null);
      }).filter(v => v !== null && v !== undefined && !isNaN(v as number)) as number[];
  
  const dataType = chartInfo?.dataType === 'reserve' ? 'reserve' : 'balance';
  const adaptiveRange = allValues.length > 0 
    ? calculateAdaptiveAxisRange(allValues, resolution, dataType)
    : { min: 0, max: 2, gridlinesCount: 1 };
  
  // ВАЖНО: В production статичной сборке ждем загрузки конфигурации
  // Не рендерим график до тех пор, пока конфигурация не загрузится
  // Это предотвращает мерцание (сначала правильные вычисленные значения, потом неправильные из configs.json)
  if (import.meta.env.PROD && savedConfig === null) {
    // В production ждем загрузки конфигурации из configs.json
    // Не рендерим до загрузки конфигурации
    return null;
  }
  
  // КРИТИЧЕСКИ ВАЖНО: Используем ТОЛЬКО значения из сохраненной конфигурации (как в превью админки)
  // НИКОГДА не вычисляем из данных - это гарантирует 1 в 1 совпадение с превью
  // В превью админки используется ТОЛЬКО chartConfig.vAxisMin/vAxisMax из конфигурации
  // Здесь делаем ТОЧНО ТАК ЖЕ - используем ТОЛЬКО savedConfig.vAxisMin/vAxisMax
  let vAxisMin: number;
  let vAxisMax: number;
  
  // ВАЖНО: В превью админки используется ТОЛЬКО chartConfig.vAxisMin/vAxisMax из конфигурации
  // Здесь делаем ТОЧНО ТАК ЖЕ - используем ТОЛЬКО savedConfig.vAxisMin/vAxisMax
  // ДЛЯ ВСЕХ 504 ГРАФИКОВ - одинаковая логика
  if (savedConfig?.vAxisMin !== undefined && savedConfig?.vAxisMax !== undefined) {
    // Используем значения из конфигурации (как в превью админки)
    // ВАЖНО: Если min > max (ошибка в данных), исправляем автоматически
    let configMin = savedConfig.vAxisMin;
    let configMax = savedConfig.vAxisMax;
    
    // Если min > max, это ошибка в данных - исправляем
    // ВАЖНО: Исправляем ДО присваивания, чтобы гарантировать правильный порядок
    if (configMin > configMax) {
      console.warn(`[TeploChart] ⚠ ОШИБКА В КОНФИГУРАЦИИ для ${chartId}: vAxisMin (${configMin}) > vAxisMax (${configMax}), исправляем`);
      // Меняем местами
      const temp = configMin;
      configMin = configMax;
      configMax = temp;
      console.warn(`[TeploChart] ✓ Исправлено: vAxisMin=${configMin}, vAxisMax=${configMax}`);
    }
    
    // Присваиваем исправленные значения (гарантируем, что min <= max)
    vAxisMin = configMin;
    vAxisMax = configMax;
    
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: убеждаемся, что после всех исправлений min <= max
    if (vAxisMin > vAxisMax) {
      console.error(`[TeploChart] ❌ КРИТИЧЕСКАЯ ОШИБКА: После исправления vAxisMin (${vAxisMin}) все еще > vAxisMax (${vAxisMax}) для ${chartId}`);
      // Принудительно исправляем еще раз
      const temp = vAxisMin;
      vAxisMin = vAxisMax;
      vAxisMax = temp;
      console.error(`[TeploChart] ✓ Принудительно исправлено: vAxisMin=${vAxisMin}, vAxisMax=${vAxisMax}`);
    }
    console.log(`[TeploChart] ✓ Используются значения из конфигурации (как в превью): vAxisMin=${vAxisMin}, vAxisMax=${vAxisMax} для ${chartId}`);
  } else {
    // Если конфигурация не загружена, это проблема
    // В production мы уже проверили выше и не рендерим до загрузки
    // В development используем дефолтные значения (но это не должно происходить)
    console.error(`[TeploChart] ❌ КРИТИЧЕСКАЯ ОШИБКА: Конфигурация не загружена для ${chartId}, но пытаемся рендерить!`);
    console.error(`[TeploChart] savedConfig:`, savedConfig);
    // Используем дефолтные значения из адаптивной шкалы (fallback)
    vAxisMin = adaptiveRange.min;
    vAxisMax = adaptiveRange.max;
    console.warn(`[TeploChart] ⚠ Используются fallback значения: vAxisMin=${vAxisMin}, vAxisMax=${vAxisMax}`);
  }
  
  const vAxisGridlinesCount = savedConfig?.vAxisGridlinesCount !== undefined 
    ? savedConfig.vAxisGridlinesCount 
    : adaptiveRange.gridlinesCount;

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
      gridlines: { color: "#F2F2F7", count: vAxisGridlinesCount },
      baselineColor: "#E5E5EA",
      baseline: 0,
      viewWindowMode: "explicit" as const,
      format: "decimal",
      ticks: [0] as any,
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

  // Проверяем наличие данных
  if (chartData.length === 0) {
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

  const data1 = [
    [
      "Год",
      legendText,
      { role: "annotation" },
    ],
    ...chartData.map((d, index) => {
      const year = String(d.year);
      const rawValue = d.value ?? d.reserve;
      const value = rawValue !== null && rawValue !== undefined 
        ? (typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)))
        : null;
      const numValue = value !== null && !isNaN(value) ? value : null;
      
      // Применяем логику экстремумов: показываем значение, если оно отличается от предыдущего или следующего
      let annotation = "";
      if (numValue !== null) {
        const valueRounded = Math.round(numValue * 1000) / 1000;
        const prevRaw = chartData[index - 1]?.value ?? chartData[index - 1]?.reserve;
        const nextRaw = chartData[index + 1]?.value ?? chartData[index + 1]?.reserve;
        const prevValue = index > 0 && prevRaw !== null && prevRaw !== undefined 
          ? Math.round((typeof prevRaw === 'number' ? prevRaw : parseFloat(String(prevRaw))) * 1000) / 1000 
          : null;
        const nextValue = index < chartData.length - 1 && nextRaw !== null && nextRaw !== undefined
          ? Math.round((typeof nextRaw === 'number' ? nextRaw : parseFloat(String(nextRaw))) * 1000) / 1000 
          : null;
        
        if (prevValue === null || nextValue === null || valueRounded !== prevValue || valueRounded !== nextValue) {
          annotation = numValue.toFixed(3);
        }
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
    interpolateNulls: false, // Не соединять линии через null значения
    series: {
      0: { 
        color: "#FF9500", 
        pointShape: "circle", 
        areaOpacity: 0.15,
        pointSize: isTiny ? 3.6 : (isMobile ? 5.4 : 7.2),
      },
    },
    vAxis: {
      ...commonOptions.vAxis,
      viewWindow: { min: Math.min(0, vAxisMin), max: vAxisMax },
      gridlines: { 
        color: "#F2F2F7", 
        count: vAxisGridlinesCount,
      },
      format: "decimal",
      ticks: [{ v: 0, f: "0" }] as any,
      // Убираем отступы для всех разрешений
      textPosition: "none" as const,
      titleTextStyle: { color: "transparent" },
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
