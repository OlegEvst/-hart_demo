import { useEffect, useState } from 'react';
import { loadChartConfig, getChartIdFromPath } from '../utils/chartConfigStorage';
import { getDefaultConfig, type ChartConfig, type Resolution } from '../utils/defaultChartConfigs';

export interface ChartConfigValues {
  chartAreaLeft?: string;
  chartAreaRight?: string;
  chartAreaTop?: string;
  chartAreaBottom?: number;
  chartAreaHeight?: string;
  chartAreaWidth?: string;
  baseFontSize?: number;
  axisFontSize?: number;
  legendFontSize?: number;
  legendLeftPadding?: string;
  legendMarginTop?: string;
  annotationStemLength?: number;
  orangeAnnotationAbove?: boolean;
  greenAnnotationAbove?: boolean;
  vAxisMin?: number;
  vAxisMax?: number;
  vAxisGridlinesCount?: number;
  containerPaddingTop?: string;
  chartContainerHeight?: string;
}

/**
 * Хук для загрузки сохраненных настроек графика
 * Определяет разрешение на основе размера окна и загружает соответствующую конфигурацию
 */
export function useSavedChartConfig(pathOrChartId: string, width: number, height: number, isTeploChart: boolean = false): ChartConfigValues | null {
  const [savedConfig, setSavedConfig] = useState<ChartConfigValues | null>(null);
  const [lastChartId, setLastChartId] = useState<string>('');
  const [lastResolution, setLastResolution] = useState<Resolution | null>(null);
  
  useEffect(() => {
    // Если путь начинается с /, обрабатываем как путь, иначе используем как chartId напрямую
    const chartId = pathOrChartId.startsWith('/') ? getChartIdFromPath(pathOrChartId) : pathOrChartId;
    
    // Определяем разрешение на основе размера окна
    // Более широкие диапазоны для определения разрешения
    const is276x155 = width >= 260 && width <= 285;
    const is344x193 = width >= 340 && width <= 350;
    const is900x250 = width > 500;
    
    let resolution: Resolution;
    if (is900x250) {
      resolution = '900x250';
    } else if (is276x155) {
      resolution = '276x155';
    } else if (is344x193) {
      resolution = '344x193';
    } else {
      // Если не попадает в диапазоны, используем 276x155 как дефолт для маленьких экранов
      resolution = width < 300 ? '276x155' : (width < 500 ? '344x193' : '900x250');
    }
    
    // ВАЖНО: Перезагружаем конфигурацию только если изменился chartId или resolution
    // Не перезагружаем при каждом изменении размера окна (это вызывает мерцание)
    if (chartId === lastChartId && resolution === lastResolution && savedConfig !== null) {
      // Конфигурация уже загружена для этого chartId и resolution, не перезагружаем
      return;
    }
    
    // Обновляем последние значения ПЕРЕД загрузкой (чтобы избежать повторных загрузок)
    setLastChartId(chartId);
    setLastResolution(resolution);
    
    console.log(`[useSavedChartConfig] Загрузка конфигурации для пути/ID: ${pathOrChartId}, извлеченный ID: ${chartId}, resolution: ${resolution}`);
    
    // Асинхронная загрузка конфигурации с сервера
    const loadConfig = async () => {
      // Пробуем загрузить конфигурацию для определенного разрешения
      let config = await loadChartConfig(chartId, resolution);
      
      // Если конфигурация не найдена для определенного разрешения, пробуем другие разрешения
      if (!config) {
        // Пробуем все разрешения по порядку приоритета
        const resolutions: Resolution[] = ['276x155', '344x193', '900x250', '564x116'];
        for (const res of resolutions) {
          const testConfig = await loadChartConfig(chartId, res);
          if (testConfig) {
            config = testConfig;
            resolution = res;
            console.log(`Загружена конфигурация для ${chartId} из разрешения ${res} (определено как ${resolution})`);
            break;
          }
        }
      }
      
      // ВАЖНО: Если конфигурация не найдена, это проблема - нужно использовать сохраненную
      // Не используем дефолтную конфигурацию, если есть сохраненная в configs.json
      // Дефолтная используется только если конфигурации вообще нет
      let finalConfig: ChartConfig;
      if (config) {
        // Используем сохраненную конфигурацию (из API или configs.json)
        finalConfig = config;
        console.log(`[useSavedChartConfig] Используется сохраненная конфигурация для ${chartId} (${resolution})`);
      } else {
        // Только если конфигурации нет вообще, используем дефолтную
        finalConfig = getDefaultConfig(resolution, isTeploChart);
        console.warn(`[useSavedChartConfig] Конфигурация не найдена для ${chartId} (${resolution}), используется дефолтная`);
      }
      
      // Фиксируем параметры легенды из дефолтной конфигурации
      const defaultConfig = getDefaultConfig(resolution, isTeploChart);
      finalConfig.legendLeftPadding = defaultConfig.legendLeftPadding;
      finalConfig.legendMarginTop = defaultConfig.legendMarginTop;
      
      console.log(`✓ Используется конфигурация для ${chartId} (${resolution}), размер окна: ${width}x${height}`);
      console.log(`  Конфигурация:`, finalConfig);
      
      // Преобразуем ChartConfig в ChartConfigValues (убираем лишние поля)
      const configValues: ChartConfigValues = {
        chartAreaLeft: finalConfig.chartAreaLeft,
        chartAreaRight: finalConfig.chartAreaRight,
        chartAreaTop: finalConfig.chartAreaTop,
        chartAreaBottom: finalConfig.chartAreaBottom,
        chartAreaHeight: finalConfig.chartAreaHeight,
        chartAreaWidth: finalConfig.chartAreaWidth,
        baseFontSize: finalConfig.baseFontSize,
        axisFontSize: finalConfig.axisFontSize,
        legendFontSize: finalConfig.legendFontSize,
        legendLeftPadding: finalConfig.legendLeftPadding,
        legendMarginTop: finalConfig.legendMarginTop,
        annotationStemLength: finalConfig.annotationStemLength,
        orangeAnnotationAbove: finalConfig.orangeAnnotationAbove,
        greenAnnotationAbove: finalConfig.greenAnnotationAbove,
        vAxisMin: finalConfig.vAxisMin,
        vAxisMax: finalConfig.vAxisMax,
        vAxisGridlinesCount: finalConfig.vAxisGridlinesCount,
        containerPaddingTop: finalConfig.containerPaddingTop,
        chartContainerHeight: finalConfig.chartContainerHeight,
      };
      setSavedConfig(configValues);
    };
    
    loadConfig().catch(console.error);
  }, [pathOrChartId, width, height, isTeploChart, lastChartId, lastResolution, savedConfig]);
  
  return savedConfig;
}

