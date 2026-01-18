// Общие дефолтные конфигурации для всех графиков
// Используются и в превью (graph_builder), и в реальных графиках

export type Resolution = "276x155" | "344x193" | "900x250" | "564x116";

export interface ChartConfig {
  // Разрешение
  resolution: Resolution;
  customWidth: number;
  customHeight: number;
  
  // Chart Area
  chartAreaLeft: string;
  chartAreaRight: string;
  chartAreaTop: string;
  chartAreaBottom: number;
  chartAreaHeight: string;
  chartAreaWidth: string;
  
  // Font sizes
  baseFontSize: number;
  axisFontSize: number;
  legendFontSize: number;
  
  // Legend position
  legendLeftPadding: string;
  legendMarginTop: string;
  
  // Annotations
  annotationStemLength: number;
  orangeAnnotationAbove: boolean; // true = над точкой, false = под точкой
  greenAnnotationAbove: boolean; // true = над точкой, false = под точкой
  
  // vAxis
  vAxisMin: number;
  vAxisMax: number;
  vAxisGridlinesCount: number;
  
  // Container padding
  containerPaddingTop: string;
  
  // Chart container height
  chartContainerHeight: string;
}

// Дефолтные конфигурации для обычных графиков
export const defaultConfig276: ChartConfig = {
  resolution: "276x155",
  customWidth: 276,
  customHeight: 155,
  chartAreaLeft: "4.9%",
  chartAreaRight: "5.7%",
  chartAreaTop: "3.9%",
  chartAreaBottom: 51,
  chartAreaHeight: "97.2%",
  chartAreaWidth: "90%",
  baseFontSize: 9,
  axisFontSize: 9,
  legendFontSize: 10,
  legendLeftPadding: "5.1%",
  legendMarginTop: "-20px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "0%",
  chartContainerHeight: "154px",
};

export const defaultConfig344: ChartConfig = {
  resolution: "344x193",
  customWidth: 344,
  customHeight: 193,
  chartAreaLeft: "5%",
  chartAreaRight: "5%",
  chartAreaTop: "-10%",
  chartAreaBottom: 35,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 10,
  axisFontSize: 10.5,
  legendFontSize: 11,
  legendLeftPadding: "5%",
  legendMarginTop: "-1px",
  annotationStemLength: 5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.4%",
  chartContainerHeight: "160px",
};

export const defaultConfig900: ChartConfig = {
  resolution: "900x250",
  customWidth: 900,
  customHeight: 250,
  chartAreaLeft: "2.8%",
  chartAreaRight: "3%",
  chartAreaTop: "-25%",
  chartAreaBottom: 31,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 13,
  axisFontSize: 14.5,
  legendFontSize: 16,
  legendLeftPadding: "3%",
  legendMarginTop: "0px",
  annotationStemLength: 7.5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.2%",
  chartContainerHeight: "200px",
};

export const defaultConfig564: ChartConfig = {
  resolution: "564x116",
  customWidth: 564,
  customHeight: 116,
  chartAreaLeft: "4%",
  chartAreaRight: "4%",
  chartAreaTop: "-5%",
  chartAreaBottom: 30,
  chartAreaHeight: "98%",
  chartAreaWidth: "92%",
  baseFontSize: 11,
  axisFontSize: 10,
  legendFontSize: 11,
  legendLeftPadding: "4%",
  legendMarginTop: "-7px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1%",
  chartContainerHeight: "91px",
};

// Дефолтные конфигурации для teplo/electric графиков
export const defaultTeploConfig276: ChartConfig = {
  resolution: "276x155",
  customWidth: 276,
  customHeight: 155,
  chartAreaLeft: "4.9%",
  chartAreaRight: "5.7%",
  chartAreaTop: "3.9%",
  chartAreaBottom: 51,
  chartAreaHeight: "97.2%",
  chartAreaWidth: "90%",
  baseFontSize: 9,
  axisFontSize: 9,
  legendFontSize: 10,
  legendLeftPadding: "5.1%",
  legendMarginTop: "-20px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "0%",
  chartContainerHeight: "154px",
};

export const defaultTeploConfig344: ChartConfig = {
  resolution: "344x193",
  customWidth: 344,
  customHeight: 193,
  chartAreaLeft: "5%",
  chartAreaRight: "5%",
  chartAreaTop: "-10%",
  chartAreaBottom: 35,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 10,
  axisFontSize: 10.5,
  legendFontSize: 11,
  legendLeftPadding: "5%",
  legendMarginTop: "-1px",
  annotationStemLength: 5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.4%",
  chartContainerHeight: "160px",
};

export const defaultTeploConfig900: ChartConfig = {
  resolution: "900x250",
  customWidth: 900,
  customHeight: 250,
  chartAreaLeft: "2.8%",
  chartAreaRight: "3%",
  chartAreaTop: "-25%",
  chartAreaBottom: 31,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 13,
  axisFontSize: 14.5,
  legendFontSize: 16,
  legendLeftPadding: "3%",
  legendMarginTop: "0px",
  annotationStemLength: 7.5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.2%",
  chartContainerHeight: "200px",
};

export const defaultTeploConfig564: ChartConfig = {
  resolution: "564x116",
  customWidth: 564,
  customHeight: 116,
  chartAreaLeft: "4%",
  chartAreaRight: "4%",
  chartAreaTop: "-5%",
  chartAreaBottom: 30,
  chartAreaHeight: "98%",
  chartAreaWidth: "92%",
  baseFontSize: 11,
  axisFontSize: 10,
  legendFontSize: 11,
  legendLeftPadding: "4%",
  legendMarginTop: "-7px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 6,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1%",
  chartContainerHeight: "91px",
};

// Функция для получения дефолтной конфигурации (для teplo графиков или обычных)
export function getDefaultConfig(resolution: Resolution, isTeplo: boolean = false): ChartConfig {
  if (isTeplo) {
    switch (resolution) {
      case "276x155":
        return defaultTeploConfig276;
      case "344x193":
        return defaultTeploConfig344;
      case "900x250":
        return defaultTeploConfig900;
      case "564x116":
        return defaultTeploConfig564;
      default:
        return defaultTeploConfig276;
    }
  } else {
    switch (resolution) {
      case "276x155":
        return defaultConfig276;
      case "344x193":
        return defaultConfig344;
      case "900x250":
        return defaultConfig900;
      case "564x116":
        return defaultConfig564;
      default:
        return defaultConfig276;
    }
  }
}
