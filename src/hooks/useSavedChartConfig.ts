import { useEffect, useState } from 'react';
import { loadChartConfig, getChartIdFromPath } from '../utils/chartConfigStorage';

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
export function useSavedChartConfig(pathOrChartId: string, width: number, height: number): ChartConfigValues | null {
  const [savedConfig, setSavedConfig] = useState<ChartConfigValues | null>(null);
  
  useEffect(() => {
    // Если путь начинается с /, обрабатываем как путь, иначе используем как chartId напрямую
    const chartId = pathOrChartId.startsWith('/') ? getChartIdFromPath(pathOrChartId) : pathOrChartId;
    console.log(`[useSavedChartConfig] Загрузка конфигурации для пути/ID: ${pathOrChartId}, извлеченный ID: ${chartId}`);
    
    // Определяем разрешение на основе размера окна
    // Более широкие диапазоны для определения разрешения
    const is276x155 = width >= 260 && width <= 285;
    const is344x193 = width >= 340 && width <= 350;
    const is900x250 = width > 500;
    
    let resolution: '276x155' | '344x193' | '900x250';
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
    
    // Асинхронная загрузка конфигурации с сервера
    const loadConfig = async () => {
      // Пробуем загрузить конфигурацию для определенного разрешения
      let config = await loadChartConfig(chartId, resolution);
      
      // Если конфигурация не найдена для определенного разрешения, пробуем другие разрешения
      if (!config) {
        // Пробуем все разрешения по порядку приоритета
        const resolutions: Array<'276x155' | '344x193' | '900x250'> = ['276x155', '344x193', '900x250'];
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
      
      if (config) {
        console.log(`✓ Загружена конфигурация для ${chartId} (${resolution}), размер окна: ${width}x${height}`);
        console.log(`  Конфигурация:`, config);
        // Преобразуем ChartConfig в ChartConfigValues (убираем лишние поля)
        const configValues: ChartConfigValues = {
          chartAreaLeft: config.chartAreaLeft,
          chartAreaRight: config.chartAreaRight,
          chartAreaTop: config.chartAreaTop,
          chartAreaBottom: config.chartAreaBottom,
          chartAreaHeight: config.chartAreaHeight,
          chartAreaWidth: config.chartAreaWidth,
          baseFontSize: config.baseFontSize,
          axisFontSize: config.axisFontSize,
          legendFontSize: config.legendFontSize,
          legendLeftPadding: config.legendLeftPadding,
          legendMarginTop: config.legendMarginTop,
          annotationStemLength: config.annotationStemLength,
          orangeAnnotationAbove: config.orangeAnnotationAbove,
          greenAnnotationAbove: config.greenAnnotationAbove,
          vAxisMin: config.vAxisMin,
          vAxisMax: config.vAxisMax,
          vAxisGridlinesCount: config.vAxisGridlinesCount,
          containerPaddingTop: config.containerPaddingTop,
          chartContainerHeight: config.chartContainerHeight,
        };
        setSavedConfig(configValues);
      } else {
        console.log(`✗ Конфигурация не найдена для ${chartId} (пробовали ${resolution}), размер окна: ${width}x${height}`);
        console.log(`  Проверьте, что в конструкторе был введен правильный ID: ${chartId}`);
        setSavedConfig(null);
      }
    };
    
    loadConfig().catch(console.error);
  }, [pathOrChartId, width, height]);
  
  return savedConfig;
}

