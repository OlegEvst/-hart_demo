import { useEffect, useState, useRef, useMemo } from "react";
import { Chart } from "react-google-charts";
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  ToggleButton, 
  ToggleButtonGroup,
  Alert,
  IconButton,
  Slider,
  Stack,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  Logout,
  Inventory,
  TrendingUp,
  Label,
  TextFields,
  Link as LinkIcon,
  CheckCircle,
  Save,
  Edit,
} from "@mui/icons-material";
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
  vAxisMax: 2,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "0%",
  chartContainerHeight: "154px",
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
  chartAreaBottom: 31,
  chartAreaHeight: "98%",
  chartAreaWidth: "94%",
  baseFontSize: 13,
  axisFontSize: 14.5,
  legendFontSize: 16,
  legendLeftPadding: "3%",
  legendMarginTop: "6px",
  annotationStemLength: 7.5,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 2,
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
  legendMarginTop: "-7px",
  annotationStemLength: 6,
  orangeAnnotationAbove: true,
  greenAnnotationAbove: false,
  vAxisMin: 0,
  vAxisMax: 2,
  vAxisGridlinesCount: 1,
  containerPaddingTop: "1%",
  chartContainerHeight: "91px",
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

const SELECTED_CHART_STORAGE_KEY = 'graph_builder_selected_chart_id';

// Вспомогательный компонент для поля ввода со слайдером
const SliderInputField = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step, 
  unit, 
  description,
  onBlur,
  parseValue,
  formatValue,
}: {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  min: number;
  max: number;
  step: number | string;
  unit?: string;
  description?: string;
  onBlur?: (value: number) => void;
  parseValue?: (val: string) => number;
  formatValue?: (val: number) => string;
}) => {
  const numValue = typeof value === 'string' ? (parseValue ? parseValue(value) : parseFloat(value) || 0) : value;
  const displayValue = formatValue ? formatValue(numValue) : numValue;
  
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
        {label}: {displayValue}{unit}
      </Typography>
      {description && (
        <Typography variant="caption" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
          {description}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <Slider
          value={numValue}
          onChange={(_, val) => onChange(typeof val === 'number' ? val : val[0])}
          min={min}
          max={max}
          step={typeof step === 'string' ? parseFloat(step) : step}
          sx={{ flex: 1 }}
        />
        <TextField
          type="number"
          value={numValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onChange(val);
            }
          }}
          onBlur={(e) => {
            if (onBlur) {
              const val = parseFloat(e.target.value);
              onBlur(isNaN(val) ? min : val);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          inputProps={{ min, max, step }}
          size="small"
          sx={{ width: 80 }}
        />
        {unit && (
          <Typography variant="body2" sx={{ color: "text.secondary", minWidth: 20 }}>
            {unit}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export function GraphBuilder() {
  // Храним конфигурации для каждого разрешения отдельно
  const [config276, setConfig276] = useState<ChartConfig>(defaultConfig276);
  const [config344, setConfig344] = useState<ChartConfig>(defaultConfig344);
  const [config900, setConfig900] = useState<ChartConfig>(defaultConfig900);
  const [config564, setConfig564] = useState<ChartConfig>(defaultConfig564);
  const [currentResolution, setCurrentResolution] = useState<Resolution>("276x155");
  const [category, setCategory] = useState<'teplo' | 'electric'>('teplo');
  
  // Восстанавливаем выбранный график из localStorage при инициализации
  const [selectedChartId, setSelectedChartId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_CHART_STORAGE_KEY);
      return saved || "";
    } catch {
      return "";
    }
  });
  
  // Сохраняем выбранный график в localStorage при изменении
  const handleChartIdChange = (chartId: string) => {
    setSelectedChartId(chartId);
    try {
      localStorage.setItem(SELECTED_CHART_STORAGE_KEY, chartId);
    } catch (error) {
      console.error('Ошибка сохранения выбранного графика:', error);
    }
  };
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
  const config = currentResolution === "276x155" ? config276 : 
                 (currentResolution === "344x193" ? config344 : 
                 (currentResolution === "900x250" ? config900 : config564));
  
  // Состояние для сохраненных конфигураций всех разрешений
  const [savedConfig276, setSavedConfig276] = useState<ChartConfig | null>(null);
  const [savedConfig344, setSavedConfig344] = useState<ChartConfig | null>(null);
  const [savedConfig900, setSavedConfig900] = useState<ChartConfig | null>(null);
  const [savedConfig564, setSavedConfig564] = useState<ChartConfig | null>(null);
  
  // Загружаем сохраненные конфигурации для всех разрешений при изменении графика
  useEffect(() => {
    // Не загружаем конфигурации, если график не выбран
    if (!selectedChartId || selectedChartId.trim() === '') {
      return;
    }
    
    Promise.all([
      loadChartConfig(selectedChartId, "276x155"),
      loadChartConfig(selectedChartId, "344x193"),
      loadChartConfig(selectedChartId, "900x250"),
      loadChartConfig(selectedChartId, "564x116")
    ]).then(([config276, config344, config900, config564]) => {
      setSavedConfig276(config276);
      setSavedConfig344(config344);
      setSavedConfig900(config900);
      setSavedConfig564(config564);
    }).catch(console.error);
  }, [selectedChartId]);
  
  // Проверяем, есть ли изменения в любой из четырех конфигураций по сравнению с сохраненными
  const hasChanges = useMemo(() => {
    // Проверяем каждое разрешение
    const check276 = savedConfig276 ? Object.keys(compareConfigs(savedConfig276, config276)).length > 0 : true;
    const check344 = savedConfig344 ? Object.keys(compareConfigs(savedConfig344, config344)).length > 0 : true;
    const check900 = savedConfig900 ? Object.keys(compareConfigs(savedConfig900, config900)).length > 0 : true;
    const check564 = savedConfig564 ? Object.keys(compareConfigs(savedConfig564, config564)).length > 0 : true;
    
    // Если хотя бы в одной конфигурации есть изменения, возвращаем true
    return check276 || check344 || check900 || check564;
  }, [selectedChartId, config276, config344, config900, config564, savedConfig276, savedConfig344, savedConfig900, savedConfig564]);
  
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
        
        // Проверяем, есть ли сохраненный график в списке
        if (chartsDataInfo.length > 0) {
          // Получаем сохраненный ID из localStorage напрямую, чтобы избежать проблем с асинхронностью
          let savedChartId: string | null = null;
          try {
            savedChartId = localStorage.getItem(SELECTED_CHART_STORAGE_KEY);
          } catch (error) {
            console.error('Ошибка чтения сохраненного графика:', error);
          }
          
          if (savedChartId) {
            // Проверяем, существует ли сохраненный график в списке
            const savedChart = chartsDataInfo.find(c => c.id === savedChartId);
            if (savedChart) {
              // Восстанавливаем сохраненный график - используем handleChartIdChange для триггера всех эффектов
              handleChartIdChange(savedChart.id);
              setCurrentChartInfo(savedChart);
            } else {
              // Если сохраненный график не найден, выбираем первый доступный
          const defaultChart = chartsDataInfo.find(c => c.id === "teploait_1_abv_sokolovo_mescherskaya_ul_27_k_1") || chartsDataInfo[0];
          if (defaultChart) {
                handleChartIdChange(defaultChart.id);
            setCurrentChartInfo(defaultChart);
              }
            }
          } else {
            // Если нет сохраненного графика, выбираем первый доступный
            const defaultChart = chartsDataInfo.find(c => c.id === "teploait_1_abv_sokolovo_mescherskaya_ul_27_k_1") || chartsDataInfo[0];
            if (defaultChart) {
              handleChartIdChange(defaultChart.id);
              setCurrentChartInfo(defaultChart);
            }
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
  
  // При изменении категории проверяем, есть ли текущий график в новой категории
  useEffect(() => {
    if (filteredCharts.length > 0) {
      const currentChart = filteredCharts.find(c => c.id === selectedChartId);
      if (!currentChart) {
        // Если текущий график не в новой категории, выбираем первый доступный
        handleChartIdChange(filteredCharts[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  
  // Загрузка данных при изменении выбранного графика или списка графиков
  useEffect(() => {
    const loadChartData = async () => {
      // Не загружаем данные, если график не выбран или список графиков еще не загружен
      if (!selectedChartId || selectedChartId.trim() === '' || chartsList.length === 0) {
        return;
      }
      
      const chartInfo = chartsList.find(c => c.id === selectedChartId);
      if (!chartInfo) {
        // Если график не найден в списке, сбрасываем данные
        setChartData([]);
        return;
      }
      
      // Обновляем currentChartInfo, если он еще не установлен или изменился
      if (!currentChartInfo || currentChartInfo.id !== selectedChartId) {
        setCurrentChartInfo(chartInfo);
      }
      
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
            loadChartConfig(selectedChartId, "900x250"),
            loadChartConfig(selectedChartId, "564x116")
          ]).then(([savedConfig276, savedConfig344, savedConfig900, savedConfig564]) => {
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
            setSavedConfig564(savedConfig564);
            
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
            
            if (savedConfig564) {
              setConfig564(normalize(savedConfig564));
            } else {
              setConfig564(getDefaultConfig("564x116", isTeploChart));
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
  }, [selectedChartId, chartsList]);
  
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
      loadChartConfig(selectedChartId, "900x250"),
      loadChartConfig(selectedChartId, "564x116")
    ]).then(([saved276, saved344, saved900, saved564]) => {
      // Обновляем сохраненные конфигурации
      setSavedConfig276(saved276);
      setSavedConfig344(saved344);
      setSavedConfig900(saved900);
      setSavedConfig564(saved564);
      
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
      
      if (saved564) {
        setConfig564(normalizeConfig(saved564));
      } else {
        setConfig564(getDefaultConfig("564x116", isTeploChart));
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

  // Функция для генерации JSON всех четырех разрешений
  const generateAllResolutionsJson = () => {
    const allConfigs = {
      "276x155": generateJsonFromConfig(config276),
      "344x193": generateJsonFromConfig(config344),
      "900x250": generateJsonFromConfig(config900),
      "564x116": generateJsonFromConfig(config564),
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
    if (config564.vAxisMin === 0 && config564.vAxisMax === 910) {
      setConfig564(prev => ({
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
    } else if (currentResolution === "900x250") {
      setConfig900(prev => ({ ...prev, ...updates }));
    } else {
      setConfig564(prev => ({ ...prev, ...updates }));
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
    <Box sx={{ 
      width: "100%", 
      minHeight: "100vh",
      p: 2.5,
      bgcolor: "background.default",
      display: "flex",
      flexDirection: "row",
      gap: 2.5,
    }}>
      {/* Панель управления */}
      <Paper 
        elevation={2}
        sx={{
        width: "400px",
          p: 2.5,
        overflowY: "auto",
        maxHeight: "100vh",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Typography variant="h5" component="h2">Конструктор графиков</Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<Logout />}
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите выйти?")) {
                  logout();
                }
              }}
            >
              Выйти
          </Button>
        </Box>
        
        {/* Фильтр категорий */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>Категория:</Typography>
          <ToggleButtonGroup
            value={category}
            exclusive
            onChange={(_, newValue) => newValue && setCategory(newValue)}
            fullWidth
          >
            <ToggleButton value="teplo">Теплосети</ToggleButton>
            <ToggleButton value="electric">Электросети</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {hasSavedConfig(selectedChartId, currentResolution) && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✓ Конфигурация сохранена для этого графика и разрешения
          </Alert>
        )}
        
        
        {/* Выбор графика */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>Выберите график:</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl fullWidth>
              <Select
              value={selectedChartId}
                onChange={(e) => handleChartIdChange(e.target.value)}
                displayEmpty
            >
            {filteredCharts.map((chart) => {
              const status = getChartStatus(chart.id);
              return (
                    <MenuItem key={`${chart.id}-${statusesUpdated}`} value={chart.id}>
                  {getStatusIndicator(status)} {chart.name} - {getStatusText(status)}
                    </MenuItem>
              );
            })}
              </Select>
            </FormControl>
            <IconButton
            onClick={() => {
              const currentIndex = filteredCharts.findIndex(c => c.id === selectedChartId);
              if (currentIndex > 0) {
                  handleChartIdChange(filteredCharts[currentIndex - 1].id);
              } else {
                  handleChartIdChange(filteredCharts[filteredCharts.length - 1].id);
              }
            }}
            disabled={filteredCharts.length === 0}
            title="Предыдущий график"
          >
              <ArrowBack />
            </IconButton>
            <IconButton
            onClick={() => {
              const currentIndex = filteredCharts.findIndex(c => c.id === selectedChartId);
              if (currentIndex < filteredCharts.length - 1) {
                  handleChartIdChange(filteredCharts[currentIndex + 1].id);
              } else {
                  handleChartIdChange(filteredCharts[0].id);
              }
            }}
            disabled={filteredCharts.length === 0}
            title="Следующий график"
          >
              <ArrowForward />
            </IconButton>
          </Stack>
          {loading && (
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
              Загрузка данных...
            </Typography>
          )}
        </Box>
        

        {/* Группа: Контейнер */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: 2, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <Inventory fontSize="small" /> Контейнер
          </Typography>
          
          <SliderInputField
            label="Высота графика"
            value={config.chartContainerHeight}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseInt(String(val)) || 120;
              const clampedVal = Math.min(Math.max(numVal, 80), 200);
                  updateConfig({ chartContainerHeight: `${clampedVal}px` });
                }}
            min={80}
            max={300}
            step={1}
            unit="px"
            description="Высота области самого графика внутри контейнера (без легенды)."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 80), 200);
              updateConfig({ chartContainerHeight: `${clampedVal}px` });
            }}
            parseValue={(val) => parseInt(val) || 120}
            formatValue={(val) => String(Math.min(Math.max(val, 80), 200))}
          />

          <SliderInputField
            label="Отступ контейнера сверху"
            value={config.containerPaddingTop}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 0;
              updateConfig({ containerPaddingTop: `${numVal}%` });
            }}
            min={0}
            max={30}
            step={0.1}
            unit="%"
            description="Отступ всего контейнера с графиком от верхнего края. Увеличьте для создания пространства сверху."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 0), 30);
              updateConfig({ containerPaddingTop: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 30))}
          />
        </Box>

        {/* Группа: Вертикальная ось */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: 2, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <TrendingUp fontSize="small" /> Вертикальная ось
          </Typography>

          <SliderInputField
            label="Минимальное значение вертикальной оси"
              value={config.vAxisMin}
            onChange={(val) => updateConfig({ vAxisMin: typeof val === 'number' ? val : parseInt(String(val)) || 0 })}
            min={-100}
            max={100}
            step={1}
            description="Нижняя граница значений на вертикальной оси (оси Y). Все значения ниже не будут видны."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, -100), 100);
              updateConfig({ vAxisMin: clampedVal });
              }}
            />

          <SliderInputField
            label="Максимальное значение вертикальной оси"
              value={config.vAxisMax}
            onChange={(val) => updateConfig({ vAxisMax: typeof val === 'number' ? val : parseInt(String(val)) || 5 })}
            min={-100}
            max={100}
            step={1}
            description="Верхняя граница значений на вертикальной оси (оси Y). Все значения выше не будут видны."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, -100), 100);
              updateConfig({ vAxisMax: clampedVal });
              }}
            />

          <SliderInputField
            label="Количество линий сетки"
              value={config.vAxisGridlinesCount}
            onChange={(val) => updateConfig({ vAxisGridlinesCount: typeof val === 'number' ? val : parseInt(String(val)) || 1 })}
            min={1}
            max={10}
            step={1}
            description="Количество горизонтальных линий сетки на графике для удобного чтения значений."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 1), 10);
              updateConfig({ vAxisGridlinesCount: clampedVal });
              }}
            />
        </Box>

        {/* Группа: Область графика */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: 2, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            📊 Область графика
          </Typography>

          <SliderInputField
            label="Отступ области графика слева"
            value={config.chartAreaLeft}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 0;
              updateConfig({ chartAreaLeft: `${numVal}%` });
            }}
            min={0}
            max={20}
            step={0.1}
            unit="%"
            description="Отступ от левого края для области графика. Увеличьте, чтобы сдвинуть график вправо."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 0), 20);
              updateConfig({ chartAreaLeft: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 20))}
            />

          <SliderInputField
            label="Отступ области графика справа"
            value={config.chartAreaRight}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 0;
              updateConfig({ chartAreaRight: `${numVal}%` });
            }}
            min={0}
            max={20}
            step={0.1}
            unit="%"
            description="Отступ от правого края для области графика. Увеличьте, чтобы сдвинуть график влево."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 0), 20);
              updateConfig({ chartAreaRight: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 20))}
            />

          <SliderInputField
            label="Отступ области графика сверху"
            value={config.chartAreaTop}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 0;
              updateConfig({ chartAreaTop: `${numVal}%` });
            }}
            min={-30}
            max={30}
            step={0.1}
            unit="%"
            description="Отступ от верхнего края. Отрицательные значения поднимают график выше."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, -30), 30);
              updateConfig({ chartAreaTop: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, -30), 30))}
          />

          <SliderInputField
            label="Отступ области графика снизу"
              value={config.chartAreaBottom}
            onChange={(val) => updateConfig({ chartAreaBottom: typeof val === 'number' ? val : parseInt(String(val)) || 10 })}
            min={10}
            max={60}
            step={1}
            unit="px"
            description="Отступ от нижнего края в пикселях. Место для подписей осей."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 10), 60);
              updateConfig({ chartAreaBottom: clampedVal });
            }}
          />

          <SliderInputField
            label="Высота области графика"
            value={config.chartAreaHeight}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 98;
              updateConfig({ chartAreaHeight: `${numVal}%` });
            }}
            min={70}
            max={100}
            step={0.1}
            unit="%"
            description="Высота области построения графика в процентах от высоты контейнера."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 70), 100);
              updateConfig({ chartAreaHeight: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 98}
            formatValue={(val) => String(Math.min(Math.max(val, 70), 100))}
            />
        </Box>

        {/* Группа: Легенда */}
        <Box sx={{ 
          marginBottom: "25px",
          paddingBottom: "20px",
          borderBottom: "2px solid #E5E5EA"
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <Label fontSize="small" /> Легенда
          </Typography>

          <SliderInputField
            label="Отступ легенды слева"
            value={config.legendLeftPadding}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('%', '')) || 0;
              updateConfig({ legendLeftPadding: `${numVal}%` });
            }}
            min={0}
            max={20}
            step={0.1}
            unit="%"
            description="Отступ легенды (подписи графика) от левого края. Используйте для выравнивания легенды."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 0), 20);
              updateConfig({ legendLeftPadding: `${clampedVal}%` });
            }}
            parseValue={(val) => parseFloat(val.replace('%', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 20))}
          />

          <SliderInputField
            label="Отступ легенды сверху"
            value={config.legendMarginTop}
            onChange={(val) => {
              const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace('px', '')) || 0;
              updateConfig({ legendMarginTop: `${numVal}px` });
            }}
            min={-20}
            max={20}
            step={1}
            unit="px"
            description="Вертикальный отступ легенды от графика. Отрицательные значения сдвигают легенду вверх."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, -20), 20);
              updateConfig({ legendMarginTop: `${clampedVal}px` });
            }}
            parseValue={(val) => parseFloat(val.replace('px', '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, -20), 20))}
            />
        </Box>

        {/* Группа: Аннотации */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: 2, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            📝 Аннотации
          </Typography>

          <SliderInputField
            label="Длина линии аннотации"
              value={config.annotationStemLength}
            onChange={(val) => updateConfig({ annotationStemLength: typeof val === 'number' ? val : parseFloat(String(val)) || 7.5 })}
            min={1}
            max={20}
            step={0.5}
            description="Длина линии от точки на графике до подписи значения. Увеличьте для большего расстояния."
            onBlur={(val) => {
              const clampedVal = Math.min(Math.max(val, 1), 20);
              updateConfig({ annotationStemLength: clampedVal });
            }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
            Позиция аннотаций для оранжевого графика
            </Typography>
            <Typography variant="caption" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
            Определяет, где отображаются подписи значений для оранжевой линии (над или под точками).
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
              checked={config.orangeAnnotationAbove}
              onChange={(e) => updateConfig({ orangeAnnotationAbove: e.target.checked })}
            />
              }
              label={config.orangeAnnotationAbove ? "Над точкой" : "Под точкой"}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
            Позиция аннотаций для зеленого графика
            </Typography>
            <Typography variant="caption" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
            Определяет, где отображаются подписи значений для зеленой линии (над или под точками).
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
              checked={config.greenAnnotationAbove}
              onChange={(e) => updateConfig({ greenAnnotationAbove: e.target.checked })}
            />
              }
              label={config.greenAnnotationAbove ? "Над точкой" : "Под точкой"}
            />
          </Box>
        </Box>

        {/* Группа: Шрифты */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: 2, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <TextFields fontSize="small" /> Шрифты
          </Typography>

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
        </Box>
      </Paper>

      {/* График и JSON */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* График */}
        <Paper elevation={2} sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Заголовок, выбор разрешения и кнопка перехода - в одну линию */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, width: "100%" }}>
            {/* Заголовок слева */}
            <Typography variant="h6" sx={{ whiteSpace: "nowrap", fontWeight: "bold" }}>
              Предпросмотр графика
            </Typography>
            
            {/* Кнопки выбора разрешения - по центру */}
            <ToggleButtonGroup
              value={currentResolution}
              exclusive
              onChange={(_, newValue) => newValue && handleResolutionChange(newValue)}
              sx={{ flex: 1, justifyContent: "center" }}
            >
              <ToggleButton value="276x155">276x155</ToggleButton>
              <ToggleButton value="344x193">344x193</ToggleButton>
              <ToggleButton value="564x116">564x116</ToggleButton>
              <ToggleButton value="900x250">900x250</ToggleButton>
            </ToggleButtonGroup>
            
            {/* Кнопка перехода справа */}
            {currentChartInfo && (
              <Button
                variant="contained"
                onClick={() => {
                  const url = `${window.location.origin}${currentChartInfo.path}`;
                  window.open(url, '_blank');
                }}
                title="Открыть график в новой вкладке"
                sx={{ whiteSpace: "nowrap" }}
              >
                <LinkIcon sx={{ mr: 0.5, fontSize: "1rem" }} /> Перейти к графику
              </Button>
            )}
          </Stack>
          <Box sx={{
              width: currentResolution === "276x155" ? "276px" : (currentResolution === "344x193" ? "344px" : (currentResolution === "564x116" ? "564px" : "900px")),
              height: currentResolution === "276x155" ? "155px" : (currentResolution === "344x193" ? "193px" : (currentResolution === "564x116" ? "116px" : "250px")),
            border: 2,
            borderColor: "divider",
            borderRadius: 1,
            p: 0,
            bgcolor: "background.default",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Paper 
              elevation={1}
              sx={{
                borderRadius: 0,
                p: config.containerPaddingTop ? `${config.containerPaddingTop} 0 5px 0` : "2px 0 5px 0",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                maxWidth: "100%",
                height: "100%",
              }}
            >
              <Box 
                  ref={chartContainerRef}
                sx={{ 
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
                  <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    color: "text.secondary",
                    }}>
                    <Typography variant="body2">
                      {loading ? "Загрузка данных..." : "Выберите график для отображения"}
                    </Typography>
                  </Box>
                  )}
                  {editingPoint && (
                  <Box sx={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                    bgcolor: 'primary.main',
                      color: 'white',
                    p: 1,
                    borderRadius: 1,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      zIndex: 1000,
                      pointerEvents: 'none',
                    boxShadow: 2,
                    }}>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      Редактирование: {editingPoint.value.toFixed(3)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '10px', mt: 0.5, opacity: 0.9, display: "block" }}>
                        Перетащите мышь вверх/вниз
                    </Typography>
                  </Box>
                  )}
              </Box>
                <CustomLegend />
            </Paper>
          </Box>
            
            {/* Кнопки Сохранить и Готов к публикации */}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2, width: "100%" }}>
            <Button
                onClick={async () => {
                  // Сохраняем конфигурации для всех 4 разрешений
                  const resolutions: Array<'276x155' | '344x193' | '900x250' | '564x116'> = ['276x155', '344x193', '900x250', '564x116'];
                  
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
                    '564x116': config564,
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
                  const [updatedConfig276, updatedConfig344, updatedConfig900, updatedConfig564] = await Promise.all([
                    loadChartConfig(selectedChartId, "276x155"),
                    loadChartConfig(selectedChartId, "344x193"),
                    loadChartConfig(selectedChartId, "900x250"),
                    loadChartConfig(selectedChartId, "564x116")
                  ]);
                  
                  setSavedConfig276(updatedConfig276);
                  setSavedConfig344(updatedConfig344);
                  setSavedConfig900(updatedConfig900);
                  setSavedConfig564(updatedConfig564);
                  
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
                  if (updatedConfig564) {
                    setConfig564(normalizeConfig(updatedConfig564));
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
                  
                  alert(`Все конфигурации сохранены для ${currentChartInfo?.name || selectedChartId} (276x155, 344x193, 900x250, 564x116)`);
                }}
                variant="contained"
                disabled={!hasChanges}
                color={hasChanges ? "warning" : "inherit"}
                sx={{ minWidth: 120, whiteSpace: "nowrap" }}
              >
                <Save sx={{ mr: 0.5, fontSize: "1rem" }} /> Сохранить
              </Button>
              <Button
                variant="contained"
                disabled={publishButtonDisabled}
                color="success"
                sx={{ minWidth: 180, whiteSpace: "nowrap" }}
                onClick={async () => {
                  // Сохраняем конфигурации для всех 4 разрешений
                  const resolutions: Array<'276x155' | '344x193' | '900x250' | '564x116'> = ['276x155', '344x193', '900x250', '564x116'];
                  
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
                    '564x116': config564,
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
                  const [updatedConfig276, updatedConfig344, updatedConfig900, updatedConfig564] = await Promise.all([
                    loadChartConfig(selectedChartId, "276x155"),
                    loadChartConfig(selectedChartId, "344x193"),
                    loadChartConfig(selectedChartId, "900x250"),
                    loadChartConfig(selectedChartId, "564x116")
                  ]);
                  
                  setSavedConfig276(updatedConfig276);
                  setSavedConfig344(updatedConfig344);
                  setSavedConfig900(updatedConfig900);
                  setSavedConfig564(updatedConfig564);
                  
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
                  if (updatedConfig564) {
                    setConfig564(normalizeConfig(updatedConfig564));
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
              >
                <CheckCircle sx={{ mr: 0.5, fontSize: "1rem" }} /> {publishButtonText}
              </Button>
          </Stack>
        </Paper>

        {/* JSON конфигурация и История */}
        <Stack direction="row" spacing={2.5}>
          {/* JSON конфигурация */}
          <Paper elevation={2} sx={{ flex: 1, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Typography variant="h6">JSON конфигурация ({currentResolution}):</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                onClick={() => {
                  const textarea = document.createElement('textarea');
                  textarea.value = jsonConfig;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert(`JSON для ${currentResolution} скопирован в буфер обмена`);
                }}
              >
                Копировать текущий
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
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
              >
                Копировать все 3 разрешения
                </Button>
              </Stack>
            </Stack>
          {jsonError && (
              <Alert severity="error" sx={{ mb: 1.25 }}>
              Ошибка: {jsonError}
              </Alert>
          )}
            <TextField
              multiline
              rows={10}
            value={jsonConfig}
            onChange={(e) => handleJsonChange(e.target.value)}
              error={!!jsonError}
              sx={{
              width: "100%",
              fontFamily: "monospace",
              fontSize: "12px",
                "& .MuiInputBase-input": {
                  fontFamily: "monospace",
                  fontSize: "12px",
                },
              }}
            />
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
            Редактируйте JSON напрямую. Изменения применяются автоматически при валидном JSON.
            <br />
            <strong>Совет:</strong> Вставьте JSON с тремя разрешениями (с ключами "276x155", "344x193", "900x250") - все конфигурации применятся автоматически!
            </Typography>
          </Paper>

          {/* История изменений */}
          <Paper elevation={2} sx={{ width: "350px", p: 2.5, display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              История изменений ({currentResolution})
            </Typography>
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
              <Box sx={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
                {history.map((entry, index) => (
                  <Paper
                    key={index}
                    elevation={index === 0 ? 2 : 0}
                    sx={{
                      p: 1.5,
                      bgcolor: index === 0 ? "primary.50" : "grey.50",
                      border: index === 0 ? 1 : 0,
                      borderColor: index === 0 ? "primary.main" : "divider",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {entry.userName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "right" }}>
                        {formatHistoryDate(entry.timestamp)}
                      </Typography>
                    </Stack>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: entry.changes && Object.keys(entry.changes).length > 0 ? 1 : 0 }}>
                      {entry.action === 'saved' ? (
                        <>
                          <Save sx={{ fontSize: "0.875rem" }} />
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Сохранено</Typography>
                        </>
                      ) : (
                        <>
                          <Edit sx={{ fontSize: "0.875rem" }} />
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>Изменено</Typography>
                        </>
                      )}
                    </Box>
                    {entry.changes && Object.keys(entry.changes).length > 0 && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
                        <Typography variant="caption" sx={{ fontWeight: "bold", mb: 0.75, display: "block" }}>
                          Изменённые параметры:
                        </Typography>
                        {Object.entries(entry.changes).slice(0, 5).map(([key, change]) => {
                          // Маппинг технических названий параметров на русские (соответствуют названиям в UI)
                          const parameterNames: Record<string, string> = {
                            resolution: "Разрешение",
                            customWidth: "Ширина",
                            customHeight: "Высота",
                            chartContainerHeight: "Высота графика",
                            containerPaddingTop: "Отступ контейнера сверху",
                            vAxisMin: "Минимальное значение вертикальной оси",
                            vAxisMax: "Максимальное значение вертикальной оси",
                            vAxisGridlinesCount: "Количество линий сетки",
                            chartAreaLeft: "Отступ области графика слева",
                            chartAreaRight: "Отступ области графика справа",
                            chartAreaTop: "Отступ области графика сверху",
                            chartAreaBottom: "Отступ области графика снизу",
                            chartAreaHeight: "Высота области графика",
                            chartAreaWidth: "Ширина области графика",
                            legendLeftPadding: "Отступ легенды слева",
                            legendMarginTop: "Отступ легенды сверху",
                            annotationStemLength: "Длина линии аннотации",
                            orangeAnnotationAbove: "Оранжевая аннотация над точкой",
                            greenAnnotationAbove: "Зеленая аннотация над точкой",
                            baseFontSize: "Основной размер шрифта",
                            axisFontSize: "Размер шрифта осей",
                            legendFontSize: "Размер шрифта легенды",
                            tooltipFontSize: "Размер шрифта всплывающих подсказок",
                          };
                          
                          const parameterName = parameterNames[key] || key;
                          
                          const formatValue = (value: any): string => {
                            if (value === null || value === undefined) {
                              return String(value);
                            }
                            // Специальная обработка для resolution
                            if (key === 'resolution' && typeof value === 'string') {
                              return value;
                            }
                            // Специальная обработка для customWidth и customHeight
                            if ((key === 'customWidth' || key === 'customHeight') && typeof value === 'number') {
                              return `${value}`;
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
                            if (typeof value === 'boolean') {
                              return value ? 'Да' : 'Нет';
                            }
                            return String(value);
                          };
                          
                          return (
                            <Box
                              key={key}
                              sx={{
                                fontSize: "10px",
                                mb: 0.5,
                                p: 0.5,
                                bgcolor: "background.paper",
                                borderRadius: 0.5,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: "bold", mb: 0.25, display: "block" }}>
                                {parameterName}:
                              </Typography>
                              <Typography variant="caption" sx={{ color: "error.main", textDecoration: "line-through", wordBreak: "break-word", display: "block" }}>
                                {formatValue(change.before)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "success.main", wordBreak: "break-word", display: "block" }}>
                                → {formatValue(change.after)}
                              </Typography>
                            </Box>
                          );
                        })}
                        {Object.keys(entry.changes).length > 5 && (
                          <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", mt: 0.5, display: "block" }}>
                            ... и ещё {Object.keys(entry.changes).length - 5} параметров
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

