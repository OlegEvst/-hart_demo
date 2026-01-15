import { useEffect, useState, useRef, useMemo } from "react";
import { Chart } from "react-google-charts";
import { type ChartDataItem, type ChartDataInfo } from "./ChartDataMapper";
import { saveChartConfig, loadChartConfig, hasSavedConfig } from "../utils/chartConfigStorage";
import { logout } from "../utils/auth";
import { 
  addHistoryEntry, 
  getChartHistoryByResolution,
  formatHistoryDate,
  getUserName,
  getUserNameSilent,
  compareConfigs,
  type ChartHistoryEntry 
} from "../utils/chartHistory";
import {
  getChartStatus,
  setChartStatus,
  getStatusText,
  getStatusIndicator,
  triggerBuild,
  loadStatusesFromServer
} from "../utils/chartStatus";
import { fetchChartsList, createServerDataLoader } from "../utils/api";

type Resolution = "276x155" | "344x193" | "900x250" | "564x116";

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

const defaultConfig276: ChartConfig = {
  resolution: "276x155",
  customWidth: 276,
  customHeight: 155,
  chartAreaLeft: "8%",
  chartAreaRight: "5%",
  chartAreaTop: "15%",
  chartAreaBottom: 35,
  chartAreaHeight: "98%",
  chartAreaWidth: "90%",
  baseFontSize: 9,
  axisFontSize: 8,
  legendFontSize: 8,
  legendLeftPadding: "8%",
  legendMarginTop: "-3px",
  annotationStemLength: 5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 910,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "15%",
  chartContainerHeight: "120px",
};

const defaultConfig344: ChartConfig = {
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
  axisFontSize: 9,
  legendFontSize: 10,
  legendLeftPadding: "5%",
  legendMarginTop: "0px",
  annotationStemLength: 5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 910,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "2px",
  chartContainerHeight: "150px",
};

const defaultConfig900: ChartConfig = {
  resolution: "900x250",
  customWidth: 900,
  customHeight: 250,
  chartAreaLeft: "3%",
  chartAreaRight: "3%",
  chartAreaTop: "-25%",
  chartAreaBottom: 20,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 13,
  axisFontSize: 12,
  legendFontSize: 14,
  legendLeftPadding: "3%",
  legendMarginTop: "8px",
  annotationStemLength: 7.5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 910,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "2px",
  chartContainerHeight: "170px",
};

// Дефолтные конфигурации для новых графиков (teplo)
const defaultTeploConfig276: ChartConfig = {
  resolution: "276x155",
  customWidth: 276,
  customHeight: 155,
  chartAreaLeft: "5.1%",
  chartAreaRight: "5.7%",
  chartAreaTop: "-2.3%",
  chartAreaBottom: 60,
  chartAreaHeight: "97.2%",
  chartAreaWidth: "90%",
  baseFontSize: 9,
  axisFontSize: 9,
  legendFontSize: 10,
  legendLeftPadding: "6%",
  legendMarginTop: "-25px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "0%",
  chartContainerHeight: "151px",
};

const defaultTeploConfig344: ChartConfig = {
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
  legendMarginTop: "3px",
  annotationStemLength: 5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.4%",
  chartContainerHeight: "151px",
};

const defaultTeploConfig900: ChartConfig = {
  resolution: "900x250",
  customWidth: 900,
  customHeight: 250,
  chartAreaLeft: "2.8%",
  chartAreaRight: "3%",
  chartAreaTop: "-25%",
  chartAreaBottom: 20,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 13,
  axisFontSize: 14.5,
  legendFontSize: 16,
  legendLeftPadding: "3%",
  legendMarginTop: "20px",
  annotationStemLength: 7.5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1.2%",
  chartContainerHeight: "200px",
};

const defaultConfig564: ChartConfig = {
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
  legendMarginTop: "2px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 910,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1%",
  chartContainerHeight: "130px",
};

const defaultTeploConfig564: ChartConfig = {
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
  legendMarginTop: "2px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 5,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1%",
  chartContainerHeight: "130px",
};

// Функция для получения дефолтной конфигурации (для teplo графиков или обычных)
function getDefaultConfig(resolution: Resolution, isTeplo: boolean = false): ChartConfig {
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

export function Balance11NewChartBuilder() {
  // Храним конфигурации для каждого разрешения отдельно
  const [config276, setConfig276] = useState<ChartConfig>(defaultConfig276);
  const [config344, setConfig344] = useState<ChartConfig>(defaultConfig344);
  const [config900, setConfig900] = useState<ChartConfig>(defaultConfig900);
  const [currentResolution, setCurrentResolution] = useState<Resolution>("276x155");
  const [category, setCategory] = useState<'teplo' | 'electric'>('teplo');
  const [selectedChartId, setSelectedChartId] = useState<string>("");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  // Список графиков, загружаемый с сервера
  const [chartsList, setChartsList] = useState<ChartDataInfo[]>([]);
  const [currentChartInfo, setCurrentChartInfo] = useState<ChartDataInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [jsonConfig, setJsonConfig] = useState<string>("");
  const [jsonError, setJsonError] = useState<string>("");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [editableData, setEditableData] = useState<ChartDataItem[]>([]);
  const [editingPoint, setEditingPoint] = useState<{ seriesIndex: number; dataIndex: number; value: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartValue = useRef<number>(0);
  const [history, setHistory] = useState<ChartHistoryEntry[]>([]);
  
  // Текущая конфигурация зависит от выбранного разрешения
  const config = currentResolution === "276x155" ? config276 : (currentResolution === "344x193" ? config344 : config900);
  
  // Состояние для сохраненных конфигураций всех разрешений
  const [savedConfig276, setSavedConfig276] = useState<ChartConfig | null>(null);
  const [savedConfig344, setSavedConfig344] = useState<ChartConfig | null>(null);
  const [savedConfig900, setSavedConfig900] = useState<ChartConfig | null>(null);
  
  // Загружаем сохраненные конфигурации для всех разрешений при изменении графика
  useEffect(() => {
    // Не загружаем конфигурации, если график не выбран
    if (!selectedChartId || selectedChartId.trim() === '') {
      return;
    }
    
    Promise.all([
      loadChartConfig(selectedChartId, "276x155"),
      loadChartConfig(selectedChartId, "344x193"),
      loadChartConfig(selectedChartId, "900x250")
    ]).then(([config276, config344, config900]) => {
      setSavedConfig276(config276);
      setSavedConfig344(config344);
      setSavedConfig900(config900);
    }).catch(console.error);
  }, [selectedChartId]);
  
  // Проверяем, есть ли изменения в любой из трех конфигураций по сравнению с сохраненными
  const hasChanges = useMemo(() => {
    // Проверяем каждое разрешение
    const check276 = savedConfig276 ? Object.keys(compareConfigs(savedConfig276, config276)).length > 0 : true;
    const check344 = savedConfig344 ? Object.keys(compareConfigs(savedConfig344, config344)).length > 0 : true;
    const check900 = savedConfig900 ? Object.keys(compareConfigs(savedConfig900, config900)).length > 0 : true;
    
    // Если хотя бы в одной конфигурации есть изменения, возвращаем true
    return check276 || check344 || check900;
  }, [selectedChartId, config276, config344, config900, savedConfig276, savedConfig344, savedConfig900]);
  
  // Состояние для принудительного обновления статусов
  const [statusesUpdated, setStatusesUpdated] = useState(0);
  
  // Текущий статус выбранного графика (пересчитывается при изменении selectedChartId или statusesUpdated)
  // Используем useMemo для пересчета при изменении зависимостей
  const currentChartStatus = useMemo(() => {
    return getChartStatus(selectedChartId);
  }, [selectedChartId, statusesUpdated]);
  
  // Логика для кнопки "Готов к публикации":
  // - Если статус "ready_for_publication" → показывать "Опубликовано" (disabled)
  // - Если статус "edited" и нет изменений → показывать "Готов к публикации" (active)
  // - Если есть изменения → показывать "Опубликовано" (disabled), если статус был "ready_for_publication"
  const isPublished = currentChartStatus === 'ready_for_publication';
  const publishButtonText = isPublished ? 'Опубликовано' : 'Готов к публикации';
  // Кнопка disabled если: опубликовано ИЛИ есть изменения ИЛИ статус не "edited" (и нет изменений)
  const publishButtonDisabled = isPublished || hasChanges || (currentChartStatus !== 'edited' && !hasChanges);
  
  // Загружаем список графиков с сервера при монтировании компонента
  useEffect(() => {
    const loadChartsList = async () => {
      try {
        const charts = await fetchChartsList();
        
        // Преобразуем ChartInfo в ChartDataInfo
        const chartsDataInfo: ChartDataInfo[] = charts.map(chart => ({
          id: chart.id,
          name: chart.name,
          path: chart.path,
          dataType: chart.dataType,
          dataLoader: createServerDataLoader(chart.id, chart.dataKey),
          dataKey: chart.dataKey
        }));
        
        setChartsList(chartsDataInfo);
        
        // Устанавливаем первый график по умолчанию, если список не пустой и график еще не выбран
        if (chartsDataInfo.length > 0 && !selectedChartId) {
          const defaultChart = chartsDataInfo.find(c => c.id === "teploait_1_abv_sokolovo_mescherskaya_ul_27_k_1") || chartsDataInfo[0];
          if (defaultChart) {
            setSelectedChartId(defaultChart.id);
            setCurrentChartInfo(defaultChart);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки списка графиков:', error);
      }
    };
    
    loadChartsList();
  }, []);
  
  // Запрашиваем имя при первом входе и загружаем статусы с сервера
  useEffect(() => {
    if (!getUserNameSilent()) {
      getUserName().catch(console.error); // Запросит имя через prompt
    }
    
    // Загружаем статусы графиков с сервера
    loadStatusesFromServer().then(() => {
      setStatusesUpdated(prev => prev + 1);
    }).catch(console.error);
  }, []);
  
  // Загружаем историю при изменении графика или разрешения
  useEffect(() => {
    // Не загружаем историю, если график не выбран
    if (!selectedChartId || selectedChartId.trim() === '') {
      setHistory([]);
      return;
    }
    
    getChartHistoryByResolution(selectedChartId, currentResolution).then(history => {
      setHistory(history);
    }).catch(console.error);
  }, [selectedChartId, currentResolution]);
  
  // Фильтруем графики по категории
  const filteredCharts = chartsList.filter((chart) => {
    if (category === 'teplo') {
      return chart.id.includes('teplo') && !chart.id.includes('electric');
    } else {
      return chart.id.includes('electric');
    }
  });
  
  // При изменении категории выбираем первый доступный график
  useEffect(() => {
    if (filteredCharts.length > 0) {
      const currentChart = filteredCharts.find(c => c.id === selectedChartId);
      if (!currentChart) {
        setSelectedChartId(filteredCharts[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  
  // Загрузка данных при изменении выбранного графика
  useEffect(() => {
    const loadChartData = async () => {
      // Не загружаем данные, если график не выбран или список графиков еще не загружен
      if (!selectedChartId || selectedChartId.trim() === '' || chartsList.length === 0) {
        return;
      }
      
      const chartInfo = chartsList.find(c => c.id === selectedChartId);
      if (!chartInfo) return;
      
      // Обновляем currentChartInfo
      setCurrentChartInfo(chartInfo);
      
      setLoading(true);
      try {
        const module = await chartInfo.dataLoader();
        
        // Получаем данные из модуля
        // Сначала проверяем dataKey, если он указан
        let data: ChartDataItem[] = [];
        
        if (chartInfo.dataKey && module[chartInfo.dataKey as keyof typeof module]) {
          data = module[chartInfo.dataKey as keyof typeof module] as ChartDataItem[];
        } else {
          // Ищем данные по паттерну
          const dataKey = Object.keys(module).find(key => 
            key.includes('Data') && 
            !key.includes('default') &&
            Array.isArray(module[key as keyof typeof module])
          );
          
          if (dataKey) {
            data = module[dataKey as keyof typeof module] as ChartDataItem[];
          } else if (module.default && Array.isArray(module.default)) {
            data = module.default;
          } else {
            // Пробуем найти любые данные в модуле
            const foundData = Object.values(module).find(val => Array.isArray(val)) as ChartDataItem[] | undefined;
            if (foundData) {
              data = foundData;
            }
          }
        }
        
        if (data && data.length > 0) {
          // Преобразуем данные teplo/electric в формат ChartDataItem
          // Данные teplo/electric имеют формат { year, value }, нужно преобразовать в { year, reserve }
          let normalizedData: ChartDataItem[] = data;
          
          // Проверяем, являются ли данные teplo/electric (имеют поле value вместо reserve/total_net/load)
          if (data.length > 0 && 'value' in data[0] && !('reserve' in data[0]) && !('total_net' in data[0])) {
            normalizedData = data.map((d: any) => ({
              year: String(d.year || ''),
              reserve: typeof d.value === 'number' ? d.value : parseFloat(String(d.value)) || 0,
            }));
          } else {
            // Нормализуем существующие данные - убеждаемся, что year - строка, а числа - числа
            normalizedData = data.map((d: any) => {
              const normalized: ChartDataItem = {
                year: String(d.year || ''),
              };
              
              if ('reserve' in d) {
                normalized.reserve = typeof d.reserve === 'number' ? d.reserve : parseFloat(String(d.reserve)) || 0;
              }
              if ('total_net' in d) {
                normalized.total_net = typeof d.total_net === 'number' ? d.total_net : parseFloat(String(d.total_net)) || 0;
              }
              if ('load' in d) {
                normalized.load = typeof d.load === 'number' ? d.load : parseFloat(String(d.load)) || 0;
              }
              if ('value' in d) {
                normalized.value = typeof d.value === 'number' ? d.value : parseFloat(String(d.value)) || 0;
              }
              
              return normalized;
            });
            console.log('Нормализованы данные:', normalizedData.slice(0, 3));
          }
          
          setChartData(normalizedData);
          setEditableData([...normalizedData]);
          
          // Определяем, является ли график teplo/electric графиком
          const isTeploChart = selectedChartId.includes('teplo') || selectedChartId.includes('electric');
          
          // Загружаем сохраненные конфигурации для всех разрешений
          Promise.all([
            loadChartConfig(selectedChartId, "276x155"),
            loadChartConfig(selectedChartId, "344x193"),
            loadChartConfig(selectedChartId, "900x250")
          ]).then(([savedConfig276, savedConfig344, savedConfig900]) => {
            // Функция для нормализации - ограничивает chartContainerHeight до 200px
            const normalize = (cfg: ChartConfig): ChartConfig => {
              const height = parseInt(cfg.chartContainerHeight) || 120;
              if (height > 200) {
                return { ...cfg, chartContainerHeight: "200px" };
              }
              return cfg;
            };
            
            // Обновляем сохраненные конфигурации
            setSavedConfig276(savedConfig276);
            setSavedConfig344(savedConfig344);
            setSavedConfig900(savedConfig900);
            
            if (savedConfig276) {
              setConfig276(normalize(savedConfig276));
            } else {
              setConfig276(getDefaultConfig("276x155", isTeploChart));
            }
            
            if (savedConfig344) {
              setConfig344(normalize(savedConfig344));
            } else {
              setConfig344(getDefaultConfig("344x193", isTeploChart));
            }
            
            if (savedConfig900) {
              setConfig900(normalize(savedConfig900));
            } else {
              setConfig900(getDefaultConfig("900x250", isTeploChart));
            }
          }).catch(console.error);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChartData();
  }, [selectedChartId]);
  
  // Функция для нормализации конфигурации - ограничивает chartContainerHeight до 200px
  const normalizeConfig = (cfg: ChartConfig): ChartConfig => {
    const height = parseInt(cfg.chartContainerHeight) || 120;
    if (height > 200) {
      return { ...cfg, chartContainerHeight: "200px" };
    }
    return cfg;
  };

  // Загружаем сохраненные конфигурации для всех разрешений при изменении разрешения или графика
  // Это нужно для применения сохраненных конфигураций к состояниям
  useEffect(() => {
    // Не загружаем конфигурации, если график не выбран
    if (!selectedChartId || selectedChartId.trim() === '') {
      return;
    }
    
    const isTeploChart = selectedChartId.includes('teplo') || selectedChartId.includes('electric');
    
    Promise.all([
      loadChartConfig(selectedChartId, "276x155"),
      loadChartConfig(selectedChartId, "344x193"),
      loadChartConfig(selectedChartId, "900x250")
    ]).then(([saved276, saved344, saved900]) => {
      // Обновляем сохраненные конфигурации
      setSavedConfig276(saved276);
      setSavedConfig344(saved344);
      setSavedConfig900(saved900);
      
      // Применяем сохраненные конфигурации к состояниям, если они есть
      if (saved276) {
        setConfig276(normalizeConfig(saved276));
        } else {
        setConfig276(getDefaultConfig("276x155", isTeploChart));
        }
      
      if (saved344) {
        setConfig344(normalizeConfig(saved344));
      } else {
        setConfig344(getDefaultConfig("344x193", isTeploChart));
      }
      
      if (saved900) {
        setConfig900(normalizeConfig(saved900));
        } else {
        setConfig900(getDefaultConfig("900x250", isTeploChart));
      }
    }).catch(console.error);
  }, [currentResolution, selectedChartId]);
  
  // Функция для генерации JSON из конфигурации
  const generateJsonFromConfig = (cfg: ChartConfig) => {
    return {
      chartArea: {
        left: cfg.chartAreaLeft,
        right: cfg.chartAreaRight,
        top: cfg.chartAreaTop,
        bottom: cfg.chartAreaBottom,
        height: cfg.chartAreaHeight,
        width: cfg.chartAreaWidth,
      },
      fontSize: {
        base: cfg.baseFontSize,
        axis: cfg.axisFontSize,
        legend: cfg.legendFontSize,
      },
      legend: {
        leftPadding: cfg.legendLeftPadding,
        marginTop: cfg.legendMarginTop,
      },
      annotations: {
        stemLength: cfg.annotationStemLength,
        orangeAbove: cfg.orangeAnnotationAbove,
        greenAbove: cfg.greenAnnotationAbove,
      },
      vAxis: {
        min: cfg.vAxisMin,
        max: cfg.vAxisMax,
        gridlinesCount: cfg.vAxisGridlinesCount,
      },
      container: {
        paddingTop: cfg.containerPaddingTop,
        chartHeight: cfg.chartContainerHeight,
      },
    };
  };

  // Функция для генерации JSON всех трех разрешений
  const generateAllResolutionsJson = () => {
    const allConfigs = {
      "276x155": generateJsonFromConfig(config276),
      "344x193": generateJsonFromConfig(config344),
      "900x250": generateJsonFromConfig(config900),
    };
    return JSON.stringify(allConfigs, null, 2);
  };

  // Обновляем JSON при изменении конфигурации
  useEffect(() => {
    const json = JSON.stringify(generateJsonFromConfig(config), null, 2);
    setJsonConfig(json);
    setJsonError("");
  }, [config]);
  
  // Вычисляем min и max для vAxis из данных
  const allValues = currentChartInfo?.dataType === 'reserve' 
    ? chartData.map(d => d.reserve || 0)
    : [...chartData.map(d => d.total_net || 0), ...chartData.map(d => d.load || 0)];
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  
  // Обновляем vAxisMin и vAxisMax при изменении данных только для начальных значений
  useEffect(() => {
    if (config276.vAxisMin === 0 && config276.vAxisMax === 910) {
      setConfig276(prev => ({
        ...prev,
        vAxisMin: Math.floor(minValue / 50) * 50,
        vAxisMax: Math.ceil(maxValue / 10) * 10,
      }));
    }
    if (config344.vAxisMin === 0 && config344.vAxisMax === 910) {
      setConfig344(prev => ({
        ...prev,
        vAxisMin: Math.floor(minValue / 50) * 50,
        vAxisMax: Math.ceil(maxValue / 10) * 10,
      }));
    }
    if (config900.vAxisMin === 0 && config900.vAxisMax === 910) {
      setConfig900(prev => ({
        ...prev,
        vAxisMin: Math.floor(minValue / 50) * 50,
        vAxisMax: Math.ceil(maxValue / 10) * 10,
      }));
    }
  }, [minValue, maxValue]);

  const handleResolutionChange = (resolution: Resolution) => {
    setCurrentResolution(resolution);
    // Конфигурации уже хранятся отдельно, просто переключаемся
  };

  const updateConfig = (updates: Partial<ChartConfig>) => {
    if (currentResolution === "276x155") {
      setConfig276(prev => ({ ...prev, ...updates }));
    } else if (currentResolution === "344x193") {
      setConfig344(prev => ({ ...prev, ...updates }));
    } else {
      setConfig900(prev => ({ ...prev, ...updates }));
    }
  };
  
  // Функция для применения конфигурации из JSON объекта
  const applyConfigFromJson = (parsed: any, targetConfig: ChartConfig): ChartConfig => {
    const updates: Partial<ChartConfig> = {
      chartAreaLeft: parsed.chartArea?.left ?? targetConfig.chartAreaLeft,
      chartAreaRight: parsed.chartArea?.right ?? targetConfig.chartAreaRight,
      chartAreaTop: parsed.chartArea?.top ?? targetConfig.chartAreaTop,
      chartAreaBottom: parsed.chartArea?.bottom ?? targetConfig.chartAreaBottom,
      chartAreaHeight: parsed.chartArea?.height ?? targetConfig.chartAreaHeight,
      chartAreaWidth: parsed.chartArea?.width ?? targetConfig.chartAreaWidth,
      baseFontSize: parsed.fontSize?.base ?? targetConfig.baseFontSize,
      axisFontSize: parsed.fontSize?.axis ?? targetConfig.axisFontSize,
      legendFontSize: parsed.fontSize?.legend ?? targetConfig.legendFontSize,
      legendLeftPadding: parsed.legend?.leftPadding ?? targetConfig.legendLeftPadding,
      legendMarginTop: parsed.legend?.marginTop ?? targetConfig.legendMarginTop,
      annotationStemLength: parsed.annotations?.stemLength ?? targetConfig.annotationStemLength,
      orangeAnnotationAbove: parsed.annotations?.orangeAbove ?? targetConfig.orangeAnnotationAbove,
      greenAnnotationAbove: parsed.annotations?.greenAbove ?? targetConfig.greenAnnotationAbove,
      vAxisMin: parsed.vAxis?.min ?? targetConfig.vAxisMin,
      vAxisMax: parsed.vAxis?.max ?? targetConfig.vAxisMax,
      vAxisGridlinesCount: parsed.vAxis?.gridlinesCount ?? targetConfig.vAxisGridlinesCount,
      containerPaddingTop: parsed.container?.paddingTop ?? targetConfig.containerPaddingTop,
      chartContainerHeight: parsed.container?.chartHeight ?? targetConfig.chartContainerHeight,
    };
    
    return { ...targetConfig, ...updates };
  };

  const handleJsonChange = (json: string) => {
    setJsonConfig(json);
    try {
      const parsed = JSON.parse(json);
      
      // Проверяем, является ли это JSON с тремя разрешениями
      if (parsed["276x155"] && parsed["344x193"] && parsed["900x250"]) {
        // Применяем конфигурации для всех трех разрешений
        const config276Updated = applyConfigFromJson(parsed["276x155"], config276);
        const config344Updated = applyConfigFromJson(parsed["344x193"], config344);
        const config900Updated = applyConfigFromJson(parsed["900x250"], config900);
        
        setConfig276(config276Updated);
        setConfig344(config344Updated);
        setConfig900(config900Updated);
        
        // Обновляем JSON для текущего разрешения
        const currentJson = JSON.stringify(generateJsonFromConfig(config), null, 2);
        setJsonConfig(currentJson);
        
        setJsonError("");
        alert('Конфигурации для всех трех разрешений успешно применены!');
      } else {
        // Обычная конфигурация для текущего разрешения
        const updates: Partial<ChartConfig> = {
          chartAreaLeft: parsed.chartArea?.left,
          chartAreaRight: parsed.chartArea?.right,
          chartAreaTop: parsed.chartArea?.top,
          chartAreaBottom: parsed.chartArea?.bottom,
          chartAreaHeight: parsed.chartArea?.height,
          chartAreaWidth: parsed.chartArea?.width,
          baseFontSize: parsed.fontSize?.base,
          axisFontSize: parsed.fontSize?.axis,
          legendFontSize: parsed.fontSize?.legend,
          legendLeftPadding: parsed.legend?.leftPadding,
          legendMarginTop: parsed.legend?.marginTop,
          annotationStemLength: parsed.annotations?.stemLength,
          orangeAnnotationAbove: parsed.annotations?.orangeAbove,
          greenAnnotationAbove: parsed.annotations?.greenAbove,
          vAxisMin: parsed.vAxis?.min,
          vAxisMax: parsed.vAxis?.max,
          vAxisGridlinesCount: parsed.vAxis?.gridlinesCount,
          containerPaddingTop: parsed.container?.paddingTop,
          chartContainerHeight: parsed.container?.chartHeight,
        };
        
        // Удаляем undefined значения
        Object.keys(updates).forEach(key => {
          if (updates[key as keyof ChartConfig] === undefined) {
            delete updates[key as keyof ChartConfig];
          }
        });
        
        updateConfig(updates);
        setJsonError("");
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Ошибка парсинга JSON");
    }
  };

  const CustomLegend = () => {
    if (currentChartInfo?.dataType === 'reserve') {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
          padding: "0",
          paddingLeft: config.legendLeftPadding,
          marginTop: config.legendMarginTop,
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ 
              width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#FF9500" 
            }}></div>
            <span style={{ 
              fontFamily: "'Golos Text', sans-serif", 
              fontSize: `${config.legendFontSize}px`, 
              color: "#1C1C1E", 
              fontWeight: "bold",
              lineHeight: "1.3",
              textAlign: "left"
            }}>
              {currentChartInfo.path.includes('electric') 
                ? 'Резерв мощности, МВА'
                : 'Резерв тепловой мощности, Гкал/ч'}
            </span>
          </div>
        </div>
      );
    }
    
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
        padding: "0",
        paddingLeft: config.legendLeftPadding,
        marginTop: config.legendMarginTop,
        width: "100%",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ 
            width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#FF9500" 
          }}></div>
          <span style={{ 
            fontFamily: "'Golos Text', sans-serif", 
            fontSize: `${config.legendFontSize}px`, 
            color: "#1C1C1E", 
            fontWeight: "bold",
            lineHeight: "1.3",
            textAlign: "left"
          }}>
            {currentChartInfo?.path.includes('electric')
              ? 'Трансформаторная мощность, МВА'
              : 'Тепловая мощность нетто, Гкал/ч'}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ 
            width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#34C759" 
          }}></div>
          <span style={{ 
            fontFamily: "'Golos Text', sans-serif", 
            fontSize: `${config.legendFontSize}px`, 
            color: "#1C1C1E", 
            fontWeight: "bold",
            lineHeight: "1.3",
            textAlign: "left"
          }}>
            {currentChartInfo?.path.includes('electric')
              ? 'Нагрузка существующих объектов, МВА'
              : 'Нагрузка существующих объектов, Гкал/ч'}
          </span>
        </div>
      </div>
    );
  };

  // Google Charts игнорирует height в chartArea, если заданы top и bottom одновременно
  // Для корректной работы height нужно использовать только height и width, без top и bottom
  // Или вычислять top/bottom на основе height
  const chartAreaConfig: any = {
    left: config.chartAreaLeft,
    right: config.chartAreaRight,
    height: config.chartAreaHeight,
    width: config.chartAreaWidth,
  };
  
  // Если height задан явно, не используем top и bottom, чтобы height работал
  // Вместо этого используем только height и width
  // Но если пользователь задал top/bottom, используем их вместо height
  if (config.chartAreaTop && !config.chartAreaTop.includes('auto')) {
    chartAreaConfig.top = config.chartAreaTop;
  }
  
  if (config.chartAreaBottom !== undefined && config.chartAreaBottom !== null) {
    chartAreaConfig.bottom = config.chartAreaBottom;
  }

  const commonOptions = {
    fontName: "Golos Text",
    fontSize: config.baseFontSize,
    backgroundColor: "transparent",
    chartArea: chartAreaConfig,
    hAxis: {
      textStyle: { 
        color: "#8E8E93", 
        fontSize: config.axisFontSize, 
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
      alternatingTextStyle: {
        color: "#8E8E93",
        fontSize: config.axisFontSize,
        bold: true
      },
      alternatingDirection: 1,
    },
    vAxis: {
      textStyle: { 
        color: "#8E8E93", 
        fontSize: config.axisFontSize, 
        bold: true 
      },
      gridlines: { color: "#F2F2F7", count: config.vAxisGridlinesCount },
      baselineColor: "#E5E5EA",
      baseline: { color: "#E5E5EA", lineWidth: 1 },
      viewWindowMode: "explicit" as const,
      viewWindow: { 
        min: config.vAxisMin, 
        max: config.vAxisMax 
      },
      format: "decimal",
      ticks: [{ v: 0, f: "0" }] as any,
    },
    titlePosition: "none",
    legend: { position: "none" },
    lineWidth: 2.5,
    pointSize: 3.6,
    curveType: "function",
    annotations: {
      textStyle: {
        fontName: "Golos Text",
        fontSize: config.axisFontSize,
        bold: true,
        color: "#3A3A3C",
      },
      stem: { color: "transparent", length: config.annotationStemLength },
      alwaysOutside: true,
      highContrast: true,
      style: "point",
    },
    tooltip: {
      textStyle: { 
        fontName: "Golos Text",
        bold: true,
        fontSize: 8,
        color: "#1C1C1E"
      },
      showColorCode: true,
      isHtml: false,
      trigger: "focus",
      ignoreBounds: false,
    },
    isStacked: false,
  };

  // Используем editableData вместо chartData для отображения
  const displayData = editableData.length > 0 ? editableData : chartData;

  // Формируем данные для графика в зависимости от типа
  // Применяем нормализацию для всех ширин - показываем значения, если они отличаются от соседних (локальные экстремумы)
  // Если данных нет, возвращаем null, чтобы не показывать график
  const data1 = (() => {
    // Проверяем, что есть данные для отображения
    if (!displayData || displayData.length === 0) {
      // Возвращаем null, чтобы не показывать график без данных
      return null;
    }
    
    if (currentChartInfo?.dataType === 'reserve') {
      // График резерва - одна линия
      return [
        [
          "Год",
          currentChartInfo.path.includes('electric') 
            ? "Резерв мощности, МВА"
            : "Резерв тепловой мощности, Гкал/ч",
          { role: "annotation" },
        ],
        ...displayData.map((d, index) => {
          let reserveAnnotation = "";
          const reserveValue = d.reserve || 0;
          // Для сравнения используем округление до 3 знаков, для отображения - toFixed(3)
          const reserveRounded = Math.round(reserveValue * 1000) / 1000;
          
          // Показываем значение, если оно отличается от предыдущего или следующего (локальный экстремум)
          const prevValue = index > 0 ? Math.round((displayData[index - 1].reserve || 0) * 1000) / 1000 : null;
          const nextValue = index < displayData.length - 1 ? Math.round((displayData[index + 1].reserve || 0) * 1000) / 1000 : null;
          
          if (prevValue === null || nextValue === null || reserveRounded !== prevValue || reserveRounded !== nextValue) {
            reserveAnnotation = reserveValue.toFixed(3);
          }
          
          const yearStr = String(d.year || '');
          const reserveNum = typeof reserveValue === 'number' ? reserveValue : parseFloat(String(reserveValue)) || 0;
          
          // Проверяем типы перед возвратом (без логирования)
          
          return [
            yearStr,
            reserveNum,
            reserveAnnotation,
          ];
        }),
      ];
    } else {
      // График баланса - две линии
      return [
        [
          "Год",
          currentChartInfo?.path.includes('electric')
            ? "Трансформаторная мощность, МВА"
            : "Тепловая мощность нетто, Гкал/ч",
          { role: "annotation" },
          currentChartInfo?.path.includes('electric')
            ? "Нагрузка существующих объектов, МВА"
            : "Нагрузка существующих объектов, Гкал/ч",
          { role: "annotation" },
        ],
        ...displayData.map((d, index) => {
          let totalNetAnnotation = "";
          let loadAnnotation = "";

          // Показываем значение, если оно отличается от предыдущего или следующего (локальный экстремум)
          const totalNetRounded = Math.round(d.total_net || 0);
          const prevTotalNet = index > 0 ? Math.round(displayData[index - 1].total_net || 0) : null;
          const nextTotalNet = index < displayData.length - 1 ? Math.round(displayData[index + 1].total_net || 0) : null;
          
          if (prevTotalNet === null || nextTotalNet === null || totalNetRounded !== prevTotalNet || totalNetRounded !== nextTotalNet) {
            totalNetAnnotation = totalNetRounded.toString();
          }

          const loadRounded = Math.round(d.load || 0);
          const prevLoad = index > 0 ? Math.round(displayData[index - 1].load || 0) : null;
          const nextLoad = index < displayData.length - 1 ? Math.round(displayData[index + 1].load || 0) : null;
          
          if (prevLoad === null || nextLoad === null || loadRounded !== prevLoad || loadRounded !== nextLoad) {
            loadAnnotation = loadRounded.toString();
          }

          const yearStr = String(d.year || '');
          const totalNetNum = typeof d.total_net === 'number' ? d.total_net : parseFloat(String(d.total_net)) || 0;
          const loadNum = typeof d.load === 'number' ? d.load : parseFloat(String(d.load)) || 0;
          
          // Проверяем типы перед возвратом (без логирования)

          return [
            yearStr,
            totalNetNum,
            totalNetAnnotation,
            loadNum,
            loadAnnotation,
          ];
        }),
      ];
    }
  })();

  const orangeStemLength = config.orangeAnnotationAbove 
    ? config.annotationStemLength 
    : -config.annotationStemLength * 2.65;
  
  const greenStemLength = config.greenAnnotationAbove 
    ? config.annotationStemLength 
    : -config.annotationStemLength * 2.65;

  // Функции для редактирования точек
  const handlePointDoubleClick = (seriesIndex: number, dataIndex: number, value: number) => {
    setEditingPoint({ seriesIndex, dataIndex, value });
    setIsDragging(true);
  };

  const handlePointDrag = (newValue: number) => {
    if (!editingPoint) return;
    
    const newData = [...editableData];
    const point = newData[editingPoint.dataIndex];
    
    if (currentChartInfo?.dataType === 'reserve') {
      point.reserve = Math.max(0, newValue);
    } else {
      if (editingPoint.seriesIndex === 0) {
        point.total_net = Math.max(0, newValue);
      } else {
        point.load = Math.max(0, newValue);
      }
    }
    
    setEditableData(newData);
    setEditingPoint({ ...editingPoint, value: newValue });
  };

  // Добавляем обработчики событий для редактирования точек через SVG
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    const circles = svgElement.querySelectorAll('circle');

    circles.forEach((circle, index) => {
      // Определяем серию и индекс данных
      const totalPoints = displayData.length;
      let seriesIndex = 0;
      let dataIndex = index;
      
      if (currentChartInfo?.dataType === 'balance') {
        // Для баланса: первые totalPoints - серия 0, следующие - серия 1
        if (index >= totalPoints) {
          seriesIndex = 1;
          dataIndex = index - totalPoints;
        }
      }

      // Удаляем старые обработчики
      const newCircle = circle.cloneNode(true) as SVGCircleElement;
      circle.parentNode?.replaceChild(newCircle, circle);

      // Добавляем обработчик двойного клика
      let clickTimeout: ReturnType<typeof setTimeout>;
      newCircle.addEventListener('click', () => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          // Одинарный клик - ничего не делаем
        }, 300);
      });

      newCircle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const point = displayData[dataIndex];
        let value = 0;
        if (currentChartInfo?.dataType === 'reserve') {
          value = point.reserve || 0;
        } else {
          value = seriesIndex === 0 ? (point.total_net || 0) : (point.load || 0);
        }
        
        handlePointDoubleClick(seriesIndex, dataIndex, value);
        setIsDragging(true);
        dragStartY.current = e.clientY;
        dragStartValue.current = value;
      });

      // Добавляем стиль курсора
      newCircle.style.cursor = 'pointer';
      newCircle.setAttribute('data-editable', 'true');
      newCircle.setAttribute('data-series', seriesIndex.toString());
      newCircle.setAttribute('data-index', dataIndex.toString());
    });

    // Глобальные обработчики для перетаскивания
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && editingPoint && chartContainerRef.current) {
        const container = chartContainerRef.current;
        const rect = container.getBoundingClientRect();
        const chartAreaHeightPx = rect.height * (parseFloat(config.chartAreaHeight) / 100);
        const vAxisRange = config.vAxisMax - config.vAxisMin;
        const pixelsPerUnit = chartAreaHeightPx / vAxisRange;
        
        const deltaY = dragStartY.current - e.clientY;
        const deltaValue = deltaY / pixelsPerUnit;
        const newValue = Math.max(0, dragStartValue.current + deltaValue);
        
        handlePointDrag(newValue);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setEditingPoint(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [chartData, displayData, config, isDragging, editingPoint, currentChartInfo]);

  const options1 = {
    ...commonOptions,
    series: currentChartInfo?.dataType === 'reserve' 
      ? {
          0: { 
            color: "#FF9500", 
            pointShape: "circle", 
            areaOpacity: 0.15,
            annotations: {
              stem: { color: "transparent", length: orangeStemLength },
            }
          },
        }
      : {
          0: { 
            color: "#FF9500", 
            pointShape: "circle", 
            areaOpacity: 0.15,
            annotations: {
              stem: { color: "transparent", length: orangeStemLength },
            }
          }, 
          1: { 
            color: "#34C759", 
            pointShape: "circle", 
            areaOpacity: 0.15,
            annotations: {
              stem: { color: "transparent", length: greenStemLength },
            }
          },
        },
  };


  return (
    <div style={{ 
      width: "100%", 
      minHeight: "100vh",
      padding: "20px",
      boxSizing: "border-box",
      backgroundColor: "#F5F5F7",
      fontFamily: "'Golos Text', sans-serif",
      display: "flex",
      flexDirection: "row",
      gap: "20px",
    }}>
      {/* Панель управления */}
      <div style={{
        width: "400px",
        backgroundColor: "#FFFFFF",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        overflowY: "auto",
        maxHeight: "100vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Конструктор графиков</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите выйти?")) {
                  logout();
                }
              }}
              style={{
                padding: "6px 8px",
                backgroundColor: "#FF3B30",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              Выйти
            </button>
          </div>
        </div>
        
        {/* Фильтр категорий */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Категория:</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setCategory('teplo')}
              style={{
                padding: "8px 16px",
                backgroundColor: category === "teplo" ? "#007AFF" : "#E5E5EA",
                color: category === "teplo" ? "#FFFFFF" : "#000000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Теплосети
            </button>
            <button
              onClick={() => setCategory('electric')}
              style={{
                padding: "8px 16px",
                backgroundColor: category === "electric" ? "#007AFF" : "#E5E5EA",
                color: category === "electric" ? "#FFFFFF" : "#000000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Электросети
            </button>
          </div>
        </div>
        
        {hasSavedConfig(selectedChartId, currentResolution) && (
          <div style={{
            padding: "8px 12px",
            backgroundColor: "#E8F5E9",
            borderRadius: "6px",
            marginBottom: "15px",
            fontSize: "12px",
            color: "#2E7D32",
          }}>
            ✓ Конфигурация сохранена для этого графика и разрешения
          </div>
        )}
        
        
        {/* Выбор графика */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Выберите график:</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
          <select
            value={selectedChartId}
            onChange={(e) => setSelectedChartId(e.target.value)}
            style={{
                flex: 1,
              padding: "8px",
              fontSize: "14px",
              border: "1px solid #E5E5EA",
              borderRadius: "6px",
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
                minWidth: 0,
            }}
          >
            {filteredCharts.map((chart) => {
              // Используем statusesUpdated для принудительного обновления
              const status = getChartStatus(chart.id);
              return (
                <option key={`${chart.id}-${statusesUpdated}`} value={chart.id}>
                  {getStatusIndicator(status)} {chart.name} - {getStatusText(status)}
                </option>
              );
            })}
          </select>
            <button
            onClick={() => {
              const currentIndex = filteredCharts.findIndex(c => c.id === selectedChartId);
              if (currentIndex > 0) {
                setSelectedChartId(filteredCharts[currentIndex - 1].id);
              } else {
                // Если первый, переходим к последнему
                setSelectedChartId(filteredCharts[filteredCharts.length - 1].id);
              }
            }}
            disabled={filteredCharts.length === 0}
              style={{
              padding: "8px 10px",
              fontSize: "16px",
              border: "1px solid #E5E5EA",
                borderRadius: "6px",
              backgroundColor: "#FFFFFF",
              cursor: filteredCharts.length === 0 ? "not-allowed" : "pointer",
              color: filteredCharts.length === 0 ? "#8E8E93" : "#1C1C1E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              flexShrink: 0,
              }}
            title="Предыдущий график"
          >
            ←
            </button>
            <button
            onClick={() => {
              const currentIndex = filteredCharts.findIndex(c => c.id === selectedChartId);
              if (currentIndex < filteredCharts.length - 1) {
                setSelectedChartId(filteredCharts[currentIndex + 1].id);
              } else {
                // Если последний, переходим к первому
                setSelectedChartId(filteredCharts[0].id);
              }
            }}
            disabled={filteredCharts.length === 0}
              style={{
              padding: "8px 10px",
              fontSize: "16px",
              border: "1px solid #E5E5EA",
                borderRadius: "6px",
              backgroundColor: "#FFFFFF",
              cursor: filteredCharts.length === 0 ? "not-allowed" : "pointer",
              color: filteredCharts.length === 0 ? "#8E8E93" : "#1C1C1E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              flexShrink: 0,
              }}
            title="Следующий график"
          >
            →
            </button>
          </div>
          {loading && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#8E8E93" }}>
              Загрузка данных...
            </div>
          )}
        </div>
        

        {/* Группа: Контейнер */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            📦 Контейнер
          </h4>
          
          {/* Высота контейнера графика */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Высота графика: {config.chartContainerHeight}
            </label>
            <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
              Высота области самого графика внутри контейнера (без легенды).
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="range"
                min="80"
                max="300"
                step="1"
                value={Math.min(parseInt(config.chartContainerHeight) || 120, 300)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  // Ограничиваем максимальное значение до 200
                  const clampedVal = Math.min(val, 200);
                  updateConfig({ chartContainerHeight: `${clampedVal}px` });
                }}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min="80"
                max="200"
                step="1"
                value={parseInt(config.chartContainerHeight) || 120}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    // Разрешаем ввод любых значений, валидация при потере фокуса
                    updateConfig({ chartContainerHeight: `${val}px` });
                  }
                }}
                onBlur={(e) => {
                  // Валидация при потере фокуса - всегда ограничиваем до 200
                  const val = parseInt(e.target.value);
                  if (isNaN(val) || val < 80) {
                    updateConfig({ chartContainerHeight: `80px` });
                  } else if (val > 200) {
                    updateConfig({ chartContainerHeight: `200px` });
                  }
                }}
                onKeyDown={(e) => {
                  // Применяем изменения при нажатии Enter
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                style={{
                  width: "80px",
                  padding: "4px 8px",
                  border: "1px solid #E5E5EA",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
            </div>
          </div>

          {/* Container Padding Top */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Отступ контейнера сверху: {config.containerPaddingTop}
            </label>
            <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
              Отступ всего контейнера с графиком от верхнего края. Увеличьте для создания пространства сверху.
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={parseFloat(config.containerPaddingTop) || 0}
                onChange={(e) => updateConfig({ containerPaddingTop: `${e.target.value}%` })}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={parseFloat(config.containerPaddingTop) || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    updateConfig({ containerPaddingTop: `${val}%` });
                  }
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val) || val < 0) {
                    updateConfig({ containerPaddingTop: `0%` });
                  } else if (val > 30) {
                    updateConfig({ containerPaddingTop: `30%` });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                style={{
                  width: "80px",
                  padding: "4px 8px",
                  border: "1px solid #E5E5EA",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
            </div>
          </div>
        </div>

        {/* Группа: Вертикальная ось */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            📈 Вертикальная ось
          </h4>

        {/* vAxis Min */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Минимальное значение вертикальной оси: {config.vAxisMin}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Нижняя граница значений на вертикальной оси (оси Y). Все значения ниже не будут видны.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={config.vAxisMin}
              onChange={(e) => updateConfig({ vAxisMin: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="-100"
              max="100"
              step="1"
              value={config.vAxisMin}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ vAxisMin: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < -100) {
                  updateConfig({ vAxisMin: -100 });
                } else if (val > 100) {
                  updateConfig({ vAxisMin: 100 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* vAxis Max */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Максимальное значение вертикальной оси: {config.vAxisMax}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Верхняя граница значений на вертикальной оси (оси Y). Все значения выше не будут видны.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={config.vAxisMax}
              onChange={(e) => updateConfig({ vAxisMax: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="-100"
              max="100"
              step="1"
              value={config.vAxisMax}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ vAxisMax: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < -100) {
                  updateConfig({ vAxisMax: -100 });
                } else if (val > 100) {
                  updateConfig({ vAxisMax: 100 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* vAxis Gridlines Count */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Количество линий сетки: {config.vAxisGridlinesCount}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Количество горизонтальных линий сетки на графике для удобного чтения значений.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.vAxisGridlinesCount}
              onChange={(e) => updateConfig({ vAxisGridlinesCount: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={config.vAxisGridlinesCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ vAxisGridlinesCount: val });
                }
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) {
                  updateConfig({ vAxisGridlinesCount: 1 });
                } else if (val > 10) {
                  updateConfig({ vAxisGridlinesCount: 10 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          </div>
        </div>

        {/* Группа: Область графика */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            📊 Область графика
          </h4>

          {/* Chart Area - Left */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ области графика слева: {config.chartAreaLeft}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Отступ от левого края для области графика. Увеличьте, чтобы сдвинуть график вправо.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.chartAreaLeft) || 0}
              onChange={(e) => updateConfig({ chartAreaLeft: `${e.target.value}%` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.chartAreaLeft) || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ chartAreaLeft: `${val}%` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0) {
                  updateConfig({ chartAreaLeft: `0%` });
                } else if (val > 20) {
                  updateConfig({ chartAreaLeft: `20%` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
          </div>
        </div>

        {/* Chart Area - Right */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ области графика справа: {config.chartAreaRight}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Отступ от правого края для области графика. Увеличьте, чтобы сдвинуть график влево.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.chartAreaRight) || 0}
              onChange={(e) => updateConfig({ chartAreaRight: `${e.target.value}%` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.chartAreaRight) || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ chartAreaRight: `${val}%` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0) {
                  updateConfig({ chartAreaRight: `0%` });
                } else if (val > 20) {
                  updateConfig({ chartAreaRight: `20%` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
        </div>
        </div>

        {/* Chart Area - Top */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ области графика сверху: {config.chartAreaTop}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Отступ от верхнего края. Отрицательные значения поднимают график выше.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.1"
              value={parseFloat(config.chartAreaTop) || 0}
              onChange={(e) => updateConfig({ chartAreaTop: `${e.target.value}%` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="-30"
              max="30"
              step="0.1"
              value={parseFloat(config.chartAreaTop) || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ chartAreaTop: `${val}%` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < -30) {
                  updateConfig({ chartAreaTop: `-30%` });
                } else if (val > 30) {
                  updateConfig({ chartAreaTop: `30%` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
          </div>
        </div>

        {/* Chart Area - Bottom */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ области графика снизу: {config.chartAreaBottom}px
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Отступ от нижнего края в пикселях. Место для подписей осей.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="10"
              max="60"
              step="1"
              value={config.chartAreaBottom}
              onChange={(e) => updateConfig({ chartAreaBottom: parseInt(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="10"
              max="60"
              step="1"
              value={config.chartAreaBottom}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ chartAreaBottom: val });
                }
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (isNaN(val) || val < 10) {
                  updateConfig({ chartAreaBottom: 10 });
                } else if (val > 60) {
                  updateConfig({ chartAreaBottom: 60 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
          </div>
        </div>

        {/* Chart Area - Height */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Высота области графика: {config.chartAreaHeight}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Высота области построения графика в процентах от высоты контейнера.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="70"
              max="100"
              step="0.1"
              value={parseFloat(config.chartAreaHeight) || 98}
              onChange={(e) => updateConfig({ chartAreaHeight: `${e.target.value}%` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="70"
              max="100"
              step="0.1"
              value={parseFloat(config.chartAreaHeight) || 98}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ chartAreaHeight: `${val}%` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 70) {
                  updateConfig({ chartAreaHeight: `70%` });
                } else if (val > 100) {
                  updateConfig({ chartAreaHeight: `100%` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
          </div>
        </div>
        </div>

        {/* Группа: Легенда */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            🏷️ Легенда
          </h4>

          {/* Legend Left Padding */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ легенды слева: {config.legendLeftPadding}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Отступ легенды (подписи графика) от левого края. Используйте для выравнивания легенды.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.legendLeftPadding) || 0}
              onChange={(e) => updateConfig({ legendLeftPadding: `${e.target.value}%` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={parseFloat(config.legendLeftPadding) || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ legendLeftPadding: `${val}%` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0) {
                  updateConfig({ legendLeftPadding: `0%` });
                } else if (val > 20) {
                  updateConfig({ legendLeftPadding: `20%` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>%</span>
          </div>
        </div>

        {/* Legend Margin Top */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Отступ легенды сверху: {config.legendMarginTop}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Вертикальный отступ легенды от графика. Отрицательные значения сдвигают легенду вверх.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={parseFloat(config.legendMarginTop) || 0}
              onChange={(e) => updateConfig({ legendMarginTop: `${e.target.value}px` })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="-20"
              max="20"
              step="1"
              value={parseFloat(config.legendMarginTop) || 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ legendMarginTop: `${val}px` });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < -20) {
                  updateConfig({ legendMarginTop: `-20px` });
                } else if (val > 20) {
                  updateConfig({ legendMarginTop: `20px` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
          </div>
        </div>
        </div>

        {/* Группа: Аннотации */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            📝 Аннотации
          </h4>

          {/* Annotation Stem Length */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Длина линии аннотации: {config.annotationStemLength}
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Длина линии от точки на графике до подписи значения. Увеличьте для большего расстояния.
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={config.annotationStemLength}
              onChange={(e) => updateConfig({ annotationStemLength: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="1"
              max="20"
              step="0.5"
              value={config.annotationStemLength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ annotationStemLength: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 1) {
                  updateConfig({ annotationStemLength: 1 });
                } else if (val > 20) {
                  updateConfig({ annotationStemLength: 20 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* Orange Annotation Position */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Позиция аннотаций для оранжевого графика
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Определяет, где отображаются подписи значений для оранжевой линии (над или под точками).
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={config.orangeAnnotationAbove}
              onChange={(e) => updateConfig({ orangeAnnotationAbove: e.target.checked })}
            />
            <span>{config.orangeAnnotationAbove ? "Над точкой" : "Под точкой"}</span>
          </label>
        </div>

        {/* Green Annotation Position */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Позиция аннотаций для зеленого графика
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Определяет, где отображаются подписи значений для зеленой линии (над или под точками).
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={config.greenAnnotationAbove}
              onChange={(e) => updateConfig({ greenAnnotationAbove: e.target.checked })}
            />
            <span>{config.greenAnnotationAbove ? "Над точкой" : "Под точкой"}</span>
          </label>
        </div>
        </div>

        {/* Группа: Шрифты */}
        <div style={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            fontSize: "14px", 
            fontWeight: "bold",
            color: "#1C1C1E"
          }}>
            🔤 Шрифты
          </h4>

          {/* Font Sizes */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Основной размер шрифта: {config.baseFontSize}px
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Базовый размер шрифта для элементов графика (подсказки, аннотации).
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="6"
              max="16"
              step="0.5"
              value={config.baseFontSize}
              onChange={(e) => updateConfig({ baseFontSize: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="6"
              max="16"
              step="0.5"
              value={config.baseFontSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ baseFontSize: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 6) {
                  updateConfig({ baseFontSize: 6 });
                } else if (val > 16) {
                  updateConfig({ baseFontSize: 16 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Размер шрифта осей: {config.axisFontSize}px
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Размер шрифта для подписей на осях (годы, значения).
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="6"
              max="16"
              step="0.5"
              value={config.axisFontSize}
              onChange={(e) => updateConfig({ axisFontSize: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="6"
              max="16"
              step="0.5"
              value={config.axisFontSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ axisFontSize: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 6) {
                  updateConfig({ axisFontSize: 6 });
                } else if (val > 16) {
                  updateConfig({ axisFontSize: 16 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Размер шрифта легенды: {config.legendFontSize}px
          </label>
          <div style={{ fontSize: "11px", color: "#8E8E93", marginBottom: "5px" }}>
            Размер шрифта для легенды графика (подписи линий).
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="range"
              min="6"
              max="16"
              step="0.5"
              value={config.legendFontSize}
              onChange={(e) => updateConfig({ legendFontSize: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="6"
              max="16"
              step="0.5"
              value={config.legendFontSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  updateConfig({ legendFontSize: val });
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 6) {
                  updateConfig({ legendFontSize: 6 });
                } else if (val > 16) {
                  updateConfig({ legendFontSize: 16 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "80px",
                padding: "4px 8px",
                border: "1px solid #E5E5EA",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <span style={{ fontSize: "14px", color: "#8E8E93" }}>px</span>
          </div>
        </div>
        </div>
      </div>

      {/* График и JSON */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* График */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          {/* Заголовок, выбор разрешения и кнопка перехода - в одну линию */}
            <div style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            gap: "15px",
            }}>
            {/* Заголовок слева */}
            <h3 style={{ 
              margin: 0, 
              fontSize: "16px", 
              fontWeight: "bold", 
              color: "#1C1C1E",
              whiteSpace: "nowrap",
            }}>
                Предпросмотр графика
              </h3>
            
            {/* Кнопки выбора разрешения - по центру */}
            <div style={{ 
              display: "flex", 
              gap: "10px",
              flex: 1,
              justifyContent: "center",
            }}>
              <button
                onClick={() => handleResolutionChange("276x155")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: currentResolution === "276x155" ? "#007AFF" : "#E5E5EA",
                  color: currentResolution === "276x155" ? "#FFFFFF" : "#000000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                276x155
              </button>
              <button
                onClick={() => handleResolutionChange("344x193")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: currentResolution === "344x193" ? "#007AFF" : "#E5E5EA",
                  color: currentResolution === "344x193" ? "#FFFFFF" : "#000000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                344x193
              </button>
              <button
                onClick={() => handleResolutionChange("900x250")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: currentResolution === "900x250" ? "#007AFF" : "#E5E5EA",
                  color: currentResolution === "900x250" ? "#FFFFFF" : "#000000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                900x250
              </button>
            </div>
            
            {/* Кнопка перехода справа */}
            {currentChartInfo && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}${currentChartInfo.path}`;
                  window.open(url, '_blank');
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#007AFF",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                }}
                title="Открыть график в новой вкладке"
              >
                <span>🔗</span>
                <span>Перейти к графику</span>
              </button>
          )}
          </div>
            <div style={{
              width: currentResolution === "276x155" ? "276px" : (currentResolution === "344x193" ? "344px" : "900px"),
              height: currentResolution === "276x155" ? "155px" : (currentResolution === "344x193" ? "193px" : "250px"),
              border: "2px solid #E5E5EA",
              borderRadius: "4px",
              padding: "0",
              boxSizing: "border-box",
              backgroundColor: "#F5F5F7",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "0",
                padding: config.containerPaddingTop ? `${config.containerPaddingTop} 0 5px 0` : "2px 0 5px 0",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                height: "100%",
              }}>
                <div 
                  ref={chartContainerRef}
                  style={{ 
                    width: "100%", 
                    height: config.chartContainerHeight,
                    position: "relative",
                    flexShrink: 0,
                    cursor: isDragging ? 'ns-resize' : 'default',
                  }}
                >
                  {data1 && Array.isArray(data1) && data1.length > 1 ? (
                  <Chart
                    chartType="AreaChart"
                    width="100%"
                    height={config.chartContainerHeight}
                    data={data1}
                    options={options1}
                  />
                  ) : (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#8E8E93",
                      fontSize: "14px",
                    }}>
                      {loading ? "Загрузка данных..." : "Выберите график для отображения"}
                    </div>
                  )}
                  {editingPoint && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(0, 122, 255, 0.9)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      zIndex: 1000,
                      pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                      Редактирование: {editingPoint.value.toFixed(3)}
                      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.9 }}>
                        Перетащите мышь вверх/вниз
                      </div>
                    </div>
                  )}
                </div>
                <CustomLegend />
            </div>
        </div>

            {/* Кнопки Сохранить и Готов к публикации */}
          <div style={{
              display: "flex", 
              justifyContent: "center", 
              gap: "10px", 
              marginTop: "15px",
              width: "100%",
            }}>
            <button
              onClick={async () => {
                  // Сохраняем конфигурации для всех 3 разрешений
                  const resolutions: Array<'276x155' | '344x193' | '900x250'> = ['276x155', '344x193', '900x250'];
                  
                  // Загружаем старые конфигурации для сравнения
                  const oldConfigs: Record<string, any> = {};
                  for (const res of resolutions) {
                    const oldConfig = await loadChartConfig(selectedChartId, res);
                    if (oldConfig) {
                      oldConfigs[res] = oldConfig;
                    }
                  }
                  
                  // Определяем текущие конфигурации для каждого разрешения
                  const configsToSave: Record<string, ChartConfig> = {
                    '276x155': config276,
                    '344x193': config344,
                    '900x250': config900,
                  };
                  
                  // Сохраняем все конфигурации
                  for (const res of resolutions) {
                    const configToSave = configsToSave[res];
                    await saveChartConfig(selectedChartId, res, configToSave);
                    
                    // Добавляем запись в историю для каждого разрешения, если были изменения
                    const oldConfig = oldConfigs[res];
                    if (oldConfig) {
                      const changes = compareConfigs(oldConfig, configToSave);
                      if (Object.keys(changes).length > 0) {
                        await addHistoryEntry(selectedChartId, res, 'saved', oldConfig, configToSave);
                      }
                    } else {
                      // Если конфигурации не было, все равно добавляем запись
                      await addHistoryEntry(selectedChartId, res, 'saved', {}, configToSave);
                    }
                  }
                  
                  // Обновляем сохраненные конфигурации для всех разрешений
                  const [updatedConfig276, updatedConfig344, updatedConfig900] = await Promise.all([
                    loadChartConfig(selectedChartId, "276x155"),
                    loadChartConfig(selectedChartId, "344x193"),
                    loadChartConfig(selectedChartId, "900x250")
                  ]);
                  
                  setSavedConfig276(updatedConfig276);
                  setSavedConfig344(updatedConfig344);
                  setSavedConfig900(updatedConfig900);
                  
                  // Нормализуем и обновляем текущие конфигурации, чтобы они совпадали с сохраненными
                  // Это гарантирует, что hasChanges станет false после сохранения
                  if (updatedConfig276) {
                    setConfig276(normalizeConfig(updatedConfig276));
                  }
                  if (updatedConfig344) {
                    setConfig344(normalizeConfig(updatedConfig344));
                  }
                  if (updatedConfig900) {
                    setConfig900(normalizeConfig(updatedConfig900));
                  }
                
                  // Если статус был "ready_for_publication", после сохранения меняем на "edited"
                  // Это позволяет пользователю снова нажать "Готов к публикации"
                  const wasPublished = currentChartStatus === 'ready_for_publication';
                  if (wasPublished) {
                setChartStatus(selectedChartId, 'edited').then(() => {
                  // Обновляем отображение статуса в выпадающем списке
                  loadStatusesFromServer().then(() => {
                    setStatusesUpdated(prev => prev + 1);
                  }).catch(console.error);
                }).catch(console.error);
                  } else {
                    // Если статус был "edited", оставляем его "edited"
                    setChartStatus(selectedChartId, 'edited').then(() => {
                      // Обновляем отображение статуса в выпадающем списке
                      loadStatusesFromServer().then(() => {
                        setStatusesUpdated(prev => prev + 1);
                      }).catch(console.error);
                    }).catch(console.error);
                  }
                  
                  // Обновляем историю для текущего разрешения
                const chartHistory = await getChartHistoryByResolution(selectedChartId, currentResolution);
                setHistory(chartHistory);
                
                  alert(`Все конфигурации сохранены для ${currentChartInfo?.name || selectedChartId} (276x155, 344x193, 900x250)`);
              }}
                disabled={!hasChanges}
              style={{
                padding: "6px 12px",
                  backgroundColor: hasChanges ? "#FF9500" : "#C7C7CC",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                  cursor: hasChanges ? "pointer" : "not-allowed",
                fontWeight: "bold",
                fontSize: "14px",
                minWidth: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                  opacity: hasChanges ? 1 : 0.6,
              }}
            >
              <span>💾</span>
              <span>Сохранить</span>
            </button>
            <button
                disabled={publishButtonDisabled}
              onClick={async () => {
                // Сохраняем конфигурации для всех 3 разрешений
                const resolutions: Array<'276x155' | '344x193' | '900x250'> = ['276x155', '344x193', '900x250'];
                
                // Загружаем старые конфигурации для сравнения
                const oldConfigs: Record<string, any> = {};
                for (const res of resolutions) {
                  const oldConfig = await loadChartConfig(selectedChartId, res);
                  if (oldConfig) {
                    oldConfigs[res] = oldConfig;
                  }
                }
                
                // Определяем текущую конфигурацию для каждого разрешения
                const configsToSave: Record<string, ChartConfig> = {
                  '276x155': config276,
                  '344x193': config344,
                  '900x250': config900,
                };
                
                // Сохраняем все конфигурации
                for (const res of resolutions) {
                  const configToSave = configsToSave[res];
                  await saveChartConfig(selectedChartId, res, configToSave);
                  
                  // Добавляем запись в историю для каждого разрешения, если были изменения
                  const oldConfig = oldConfigs[res];
                  if (oldConfig) {
                    const changes = compareConfigs(oldConfig, configToSave);
                    if (Object.keys(changes).length > 0) {
                      await addHistoryEntry(selectedChartId, res, 'saved', oldConfig, configToSave);
                    }
                  } else {
                    // Если конфигурации не было, все равно добавляем запись
                    await addHistoryEntry(selectedChartId, res, 'saved', {}, configToSave);
                  }
                }
                
                  // Обновляем сохраненные конфигурации для всех разрешений
                  const [updatedConfig276, updatedConfig344, updatedConfig900] = await Promise.all([
                    loadChartConfig(selectedChartId, "276x155"),
                    loadChartConfig(selectedChartId, "344x193"),
                    loadChartConfig(selectedChartId, "900x250")
                  ]);
                  
                  setSavedConfig276(updatedConfig276);
                  setSavedConfig344(updatedConfig344);
                  setSavedConfig900(updatedConfig900);
                  
                  // Нормализуем и обновляем текущие конфигурации, чтобы они совпадали с сохраненными
                  // Это гарантирует, что hasChanges станет false после сохранения
                  if (updatedConfig276) {
                    setConfig276(normalizeConfig(updatedConfig276));
                  }
                  if (updatedConfig344) {
                    setConfig344(normalizeConfig(updatedConfig344));
                  }
                  if (updatedConfig900) {
                    setConfig900(normalizeConfig(updatedConfig900));
                  }
                
                // Обновляем статус на "ready_for_publication"
                setChartStatus(selectedChartId, 'ready_for_publication').then(() => {
                  // Обновляем отображение статуса в выпадающем списке
                  loadStatusesFromServer().then(() => {
                    setStatusesUpdated(prev => prev + 1);
                  }).catch(console.error);
                }).catch(console.error);
                
                // Обновляем историю для текущего разрешения
                const chartHistory = await getChartHistoryByResolution(selectedChartId, currentResolution);
                setHistory(chartHistory);
                
                // Запускаем сборку проекта
                const buildSuccess = await triggerBuild();
                
                if (buildSuccess) {
                  alert(`График ${currentChartInfo?.name || selectedChartId} помечен как готовый к публикации. Сборка проекта запущена.`);
                } else {
                  alert(`График ${currentChartInfo?.name || selectedChartId} помечен как готовый к публикации. Ошибка запуска сборки - запустите сборку вручную.`);
                }
              }}
              style={{
                padding: "6px 12px",
                  backgroundColor: publishButtonDisabled ? "#C7C7CC" : "#34C759",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                  cursor: publishButtonDisabled ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                minWidth: "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                  opacity: publishButtonDisabled ? 0.6 : 1,
              }}
            >
                <span>{isPublished ? "✅" : "✅"}</span>
                <span>{publishButtonText}</span>
            </button>
          </div>
        </div>

        {/* JSON конфигурация и История */}
        <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
          {/* JSON конфигурация */}
          <div style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>JSON конфигурация ({currentResolution}):</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  const textarea = document.createElement('textarea');
                  textarea.value = jsonConfig;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert(`JSON для ${currentResolution} скопирован в буфер обмена`);
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#007AFF",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Копировать текущий
              </button>
              <button
                onClick={() => {
                  const allJson = generateAllResolutionsJson();
                  const textarea = document.createElement('textarea');
                  textarea.value = allJson;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert('JSON для всех трех разрешений скопирован в буфер обмена');
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#34C759",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Копировать все 3 разрешения
              </button>
            </div>
          </div>
          {jsonError && (
            <div style={{
              padding: "8px 12px",
              backgroundColor: "#FFEBEE",
              borderRadius: "4px",
              marginBottom: "10px",
              fontSize: "12px",
              color: "#C62828",
            }}>
              Ошибка: {jsonError}
            </div>
          )}
          <textarea
            value={jsonConfig}
            onChange={(e) => handleJsonChange(e.target.value)}
            style={{
              width: "100%",
              height: "300px",
              fontFamily: "monospace",
              fontSize: "12px",
              padding: "10px",
              border: jsonError ? "2px solid #C62828" : "1px solid #E5E5EA",
              borderRadius: "4px",
              resize: "vertical",
            }}
          />
          <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "8px" }}>
            Редактируйте JSON напрямую. Изменения применяются автоматически при валидном JSON.
            <br />
            <strong>Совет:</strong> Вставьте JSON с тремя разрешениями (с ключами "276x155", "344x193", "900x250") - все конфигурации применятся автоматически!
          </p>
          </div>

          {/* История изменений */}
          <div style={{
            width: "350px",
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>
              История изменений ({currentResolution})
            </h3>
            {history.length === 0 ? (
              <div style={{
                padding: "20px",
                textAlign: "center",
                color: "#8E8E93",
                fontSize: "14px",
              }}>
                Нет записей в истории
              </div>
            ) : (
              <div style={{
                maxHeight: "400px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}>
                {history.map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "12px",
                      backgroundColor: index === 0 ? "#F0F9FF" : "#F9F9F9",
                      borderRadius: "6px",
                      border: index === 0 ? "1px solid #007AFF" : "1px solid #E5E5EA",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "6px",
                    }}>
                      <div style={{
                        fontWeight: "bold",
                        fontSize: "13px",
                        color: "#1C1C1E",
                      }}>
                        {entry.userName}
                      </div>
                      <div style={{
                        fontSize: "11px",
                        color: "#8E8E93",
                        textAlign: "right",
                      }}>
                        {formatHistoryDate(entry.timestamp)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "#8E8E93",
                      marginTop: "4px",
                      marginBottom: entry.changes && Object.keys(entry.changes).length > 0 ? "8px" : "0",
                    }}>
                      {entry.action === 'saved' ? '💾 Сохранено' : '✏️ Изменено'}
                    </div>
                    {entry.changes && Object.keys(entry.changes).length > 0 && (
                      <div style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid #E5E5EA",
                      }}>
                        <div style={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          color: "#1C1C1E",
                          marginBottom: "6px",
                        }}>
                          Изменённые параметры:
                        </div>
                        {Object.entries(entry.changes).slice(0, 5).map(([key, change]) => {
                          const formatValue = (value: any): string => {
                            if (value === null || value === undefined) {
                              return String(value);
                            }
                            if (typeof value === 'object') {
                              try {
                                return JSON.stringify(value, null, 0);
                              } catch {
                                return String(value);
                              }
                            }
                            if (typeof value === 'string' && value.endsWith('px')) {
                              return value;
                            }
                            if (typeof value === 'string' && value.endsWith('%')) {
                              return value;
                            }
                            if (typeof value === 'number') {
                              return value.toFixed(3).replace(/\.?0+$/, '');
                            }
                            return String(value);
                          };
                          
                          return (
                            <div
                              key={key}
                              style={{
                                fontSize: "10px",
                                marginBottom: "4px",
                                padding: "4px",
                                backgroundColor: "#FFFFFF",
                                borderRadius: "3px",
                              }}
                            >
                              <div style={{ fontWeight: "bold", color: "#1C1C1E", marginBottom: "2px" }}>
                                {key}:
                              </div>
                              <div style={{ color: "#C62828", textDecoration: "line-through", wordBreak: "break-word" }}>
                                {formatValue(change.before)}
                              </div>
                              <div style={{ color: "#2E7D32", wordBreak: "break-word" }}>
                                → {formatValue(change.after)}
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(entry.changes).length > 5 && (
                          <div style={{
                            fontSize: "10px",
                            color: "#8E8E93",
                            fontStyle: "italic",
                            marginTop: "4px",
                          }}>
                            ... и ещё {Object.keys(entry.changes).length - 5} параметров
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

