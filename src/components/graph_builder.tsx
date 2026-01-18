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
  TextFields,
  CheckCircle,
  Save,
  Download,
} from "@mui/icons-material";
import { type ChartDataItem, type ChartDataInfo } from "./ChartDataMapper";
import { saveChartConfig, loadChartConfig } from "../utils/chartConfigStorage";
import { logout } from "../utils/auth";
import { 
  addHistoryEntry, 
  getChartHistoryByResolution,
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
  loadStatusesFromServer,
  getAllChartStatuses
} from "../utils/chartStatus";
import { fetchChartsList, createServerDataLoader } from "../utils/api";

// Импортируем список новых графиков из Excel
import newChartsFromExcel from "../data/newChartsFromExcel.json";
// Импортируем порядок графиков из Excel
import chartsOrderData from "../data/chartsOrder.json";
// Импортируем утилиты для адаптивной шкалы
import { calculateAdaptiveAxisRange } from "../utils/adaptiveAxis";
import { 
  type ChartConfig, 
  type Resolution,
  defaultConfig276,
  defaultConfig344,
  defaultConfig900,
  defaultConfig564,
  getDefaultConfig
} from "../utils/defaultChartConfigs";

// Дефолтные конфигурации импортируются из общего файла defaultChartConfigs.ts
// Удалены локальные определения для использования единого источника
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
  disabled = false,
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
  parseValue?: (val: string | number) => number;
  formatValue?: (val: number) => string;
  disabled?: boolean;
}) => {
  const numValue = typeof value === 'string' 
    ? (parseValue ? parseValue(value) : (parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0))
    : (value ?? 0);
  const displayValue = formatValue ? formatValue(numValue) : numValue;
  const clampedValue = Math.min(Math.max(numValue, min), max);
  
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
          value={clampedValue}
          onChange={(_, val) => {
            const newVal = typeof val === 'number' ? val : val[0];
            onChange(newVal);
          }}
          min={min}
          max={max}
          step={typeof step === 'string' ? parseFloat(step) : step}
          disabled={disabled}
          sx={{ flex: 1 }}
        />
        <TextField
          type="number"
          value={clampedValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onChange(val);
            }
          }}
          onBlur={(e) => {
            if (onBlur) {
              const val = parseFloat(e.target.value);
              const clamped = Math.min(Math.max(isNaN(val) ? min : val, min), max);
              onBlur(clamped);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          inputProps={{ min, max, step }}
          disabled={disabled}
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
  // Выбранное разрешение для редактирования
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  // currentResolution для совместимости с некоторыми функциями
  const currentResolution: Resolution = selectedResolution || "276x155";
  // Чекбокс "Применить ко всем" - когда включен, изменения применяются ко всем разрешениям одновременно
  // По умолчанию включен
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
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
  // История сохраняется на бэкенде, но не отображается визуально
  const [, setHistory] = useState<ChartHistoryEntry[]>([]);
  
  // Текущая конфигурация зависит от выбранного разрешения (для ползунков)
  // Если разрешение не выбрано, используем текущее разрешение по умолчанию
  // Используем useMemo для реактивного обновления
  const config = useMemo(() => {
    const resolutionForConfig = selectedResolution || currentResolution;
    if (resolutionForConfig === "276x155") return config276;
    if (resolutionForConfig === "344x193") return config344;
    if (resolutionForConfig === "900x250") return config900;
    if (resolutionForConfig === "564x116") return config564;
    return config276;
  }, [selectedResolution, currentResolution, config276, config344, config900, config564]);
  
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
        
        // Убираем дубликаты по ID перед преобразованием
        const seen = new Set<string>();
        const uniqueCharts = charts.filter(chart => {
          if (seen.has(chart.id)) {
            console.warn(`Дубликат графика в API ответе: ${chart.id}`);
            return false;
          }
          seen.add(chart.id);
          return true;
        });
        
        // Преобразуем ChartInfo в ChartDataInfo
        const chartsDataInfo: ChartDataInfo[] = uniqueCharts.map(chart => ({
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
  
  // Фильтруем графики по категории, убираем дубликаты и сортируем по алфавиту
  const filteredCharts = useMemo(() => {
    const filtered = chartsList.filter((chart) => {
    if (category === 'teplo') {
        return chart.id.startsWith('teplo') && !chart.id.includes('electric');
    } else {
        return chart.id.startsWith('electricps');
      }
    });
    
    // Убираем дубликаты по ID (на случай, если они есть)
    const seen = new Set<string>();
    const unique = filtered.filter((chart) => {
      if (seen.has(chart.id)) {
        console.warn(`Дубликат графика обнаружен и удален: ${chart.id}`);
        return false;
      }
      seen.add(chart.id);
      return true;
    });
    
    // Сортируем по порядку из Excel файлов
    const orderMap: Record<string, number> = chartsOrderData.orderMap || {};
    return unique.sort((a, b) => {
      const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Infinity;
      const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Infinity;
      
      // Если оба графика есть в порядке - сортируем по порядку
      if (orderA !== Infinity && orderB !== Infinity) {
        return orderA - orderB;
      }
      // Если только один есть в порядке - он идет первым
      if (orderA !== Infinity) return -1;
      if (orderB !== Infinity) return 1;
      // Если оба отсутствуют - сортируем по алфавиту
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
    });
  }, [chartsList, category]);
  
  // Обработчик клавиатуры для переключения графиков стрелками влево/вправо
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Проверяем, что не в поле ввода (чтобы не мешать редактированию)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        
        const currentIndex = filteredCharts.findIndex(chart => chart.id === selectedChartId);
        if (currentIndex === -1 || filteredCharts.length === 0) return;
        
        let newIndex: number;
        if (event.key === 'ArrowRight') {
          // Стрелка вправо - следующий график
          newIndex = (currentIndex + 1) % filteredCharts.length;
        } else {
          // Стрелка влево - предыдущий график
          newIndex = (currentIndex - 1 + filteredCharts.length) % filteredCharts.length;
        }
        
        const newChart = filteredCharts[newIndex];
        if (newChart) {
          handleChartIdChange(newChart.id);
          setCurrentChartInfo(newChart);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCharts, selectedChartId]);
  
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
            
            // Фиксируем параметры легенды из дефолтных конфигураций
            const default276 = getDefaultConfig("276x155", isTeploChart);
            const default344 = getDefaultConfig("344x193", isTeploChart);
            const default900 = getDefaultConfig("900x250", isTeploChart);
            const default564 = getDefaultConfig("564x116", isTeploChart);
            
            if (savedConfig276) {
              const normalized = normalize(savedConfig276);
              // Фиксируем параметры легенды из дефолтной конфигурации
              setConfig276({ ...normalized, legendLeftPadding: default276.legendLeftPadding, legendMarginTop: default276.legendMarginTop });
            } else {
              setConfig276(default276);
            }
            
            if (savedConfig344) {
              const normalized = normalize(savedConfig344);
              // Фиксируем параметры легенды из дефолтной конфигурации
              setConfig344({ ...normalized, legendLeftPadding: default344.legendLeftPadding, legendMarginTop: default344.legendMarginTop });
            } else {
              setConfig344(default344);
            }
            
            if (savedConfig900) {
              const normalized = normalize(savedConfig900);
              // Фиксируем параметры легенды из дефолтной конфигурации
              setConfig900({ ...normalized, legendLeftPadding: default900.legendLeftPadding, legendMarginTop: default900.legendMarginTop });
            } else {
              setConfig900(default900);
            }
            
            if (savedConfig564) {
              const normalized = normalize(savedConfig564);
              // Фиксируем параметры легенды из дефолтной конфигурации
              setConfig564({ ...normalized, legendLeftPadding: default564.legendLeftPadding, legendMarginTop: default564.legendMarginTop });
            } else {
              setConfig564(default564);
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
    let normalized = cfg;
    if (height > 200) {
      normalized = { ...normalized, chartContainerHeight: "200px" };
    }
    
    // Фиксируем параметры легенды из дефолтных конфигураций в зависимости от разрешения
    const isTeploChart = selectedChartId.includes('teplo') || selectedChartId.includes('electric');
    const defaultForResolution = getDefaultConfig(cfg.resolution, isTeploChart);
    normalized = {
      ...normalized,
      legendLeftPadding: defaultForResolution.legendLeftPadding,
      legendMarginTop: defaultForResolution.legendMarginTop
    };
    
    return normalized;
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
      // Фиксируем параметры легенды из дефолтных конфигураций
      const default276 = getDefaultConfig("276x155", isTeploChart);
      const default344 = getDefaultConfig("344x193", isTeploChart);
      const default900 = getDefaultConfig("900x250", isTeploChart);
      const default564 = getDefaultConfig("564x116", isTeploChart);
      
      if (saved276) {
        const normalized = normalizeConfig(saved276);
        // Фиксируем параметры легенды из дефолтной конфигурации
        setConfig276({ ...normalized, legendLeftPadding: default276.legendLeftPadding, legendMarginTop: default276.legendMarginTop });
      } else {
        setConfig276(default276);
      }
      
      if (saved344) {
        const normalized = normalizeConfig(saved344);
        // Фиксируем параметры легенды из дефолтной конфигурации
        setConfig344({ ...normalized, legendLeftPadding: default344.legendLeftPadding, legendMarginTop: default344.legendMarginTop });
      } else {
        setConfig344(default344);
      }
      
      if (saved900) {
        const normalized = normalizeConfig(saved900);
        // Фиксируем параметры легенды из дефолтной конфигурации
        setConfig900({ ...normalized, legendLeftPadding: default900.legendLeftPadding, legendMarginTop: default900.legendMarginTop });
      } else {
        setConfig900(default900);
      }
      
      if (saved564) {
        const normalized = normalizeConfig(saved564);
        // Фиксируем параметры легенды из дефолтной конфигурации
        setConfig564({ ...normalized, legendLeftPadding: default564.legendLeftPadding, legendMarginTop: default564.legendMarginTop });
      } else {
        setConfig564(default564);
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


  // Обновляем JSON при изменении конфигурации выбранного разрешения в реальном времени
  useEffect(() => {
    if (!selectedResolution) {
      setJsonConfig("");
      return;
    }
    const currentConfig = selectedResolution === "276x155" ? config276 : 
                         (selectedResolution === "344x193" ? config344 : 
                         (selectedResolution === "900x250" ? config900 : config564));
    const json = JSON.stringify(generateJsonFromConfig(currentConfig), null, 2);
    setJsonConfig(json);
    setJsonError("");
  }, [selectedResolution, config276, config344, config900, config564]);
  
  // Вычисляем адаптивную шкалу для текущего разрешения
  const allValues = currentChartInfo?.dataType === 'reserve' 
    ? chartData.map(d => d.reserve || 0).filter(v => v !== null && v !== undefined && !isNaN(v))
    : [...chartData.map(d => d.total_net || 0), ...chartData.map(d => d.load || 0)].filter(v => v !== null && v !== undefined && !isNaN(v));
  
  // Используем адаптивный расчет шкалы для текущего разрешения
  const dataType = currentChartInfo?.dataType === 'reserve' ? 'reserve' : 'balance';
  const adaptiveRange = allValues.length > 0 
    ? calculateAdaptiveAxisRange(allValues as number[], currentResolution, dataType)
    : { min: 0, max: 100, gridlinesCount: 1 };
  
  // Обновляем vAxisMin и vAxisMax при изменении данных только для начальных значений
  // Используем адаптивный расчет для каждого разрешения
  useEffect(() => {
    if (allValues.length > 0) {
      const range276 = calculateAdaptiveAxisRange(allValues as number[], "276x155", dataType);
      const range344 = calculateAdaptiveAxisRange(allValues as number[], "344x193", dataType);
      const range900 = calculateAdaptiveAxisRange(allValues as number[], "900x250", dataType);
      const range564 = calculateAdaptiveAxisRange(allValues as number[], "564x116", dataType);
      
      // Обновляем только если значения еще не были настроены вручную
    if (config276.vAxisMin === 0 && config276.vAxisMax === 910) {
      setConfig276(prev => ({
        ...prev,
          vAxisMin: range276.min,
          vAxisMax: range276.max,
          vAxisGridlinesCount: range276.gridlinesCount,
      }));
    }
    if (config344.vAxisMin === 0 && config344.vAxisMax === 910) {
      setConfig344(prev => ({
        ...prev,
          vAxisMin: range344.min,
          vAxisMax: range344.max,
          vAxisGridlinesCount: range344.gridlinesCount,
      }));
    }
    if (config900.vAxisMin === 0 && config900.vAxisMax === 910) {
      setConfig900(prev => ({
        ...prev,
          vAxisMin: range900.min,
          vAxisMax: range900.max,
          vAxisGridlinesCount: range900.gridlinesCount,
      }));
    }
    if (config564.vAxisMin === 0 && config564.vAxisMax === 910) {
      setConfig564(prev => ({
        ...prev,
          vAxisMin: range564.min,
          vAxisMax: range564.max,
          vAxisGridlinesCount: range564.gridlinesCount,
      }));
    }
    }
  }, [allValues, dataType, config276.vAxisMin, config276.vAxisMax, config344.vAxisMin, config344.vAxisMax, config900.vAxisMin, config900.vAxisMax, config564.vAxisMin, config564.vAxisMax]);


  const updateConfig = (updates: Partial<ChartConfig>) => {
    // Фиксируем параметры легенды - не позволяем их изменять
    const filteredUpdates = { ...updates };
    delete filteredUpdates.legendLeftPadding;
    delete filteredUpdates.legendMarginTop;
    
    // Если включен чекбокс "Применить ко всем", применяем изменения ко всем разрешениям
    if (applyToAll) {
      setConfig276(prev => ({ ...prev, ...filteredUpdates }));
      setConfig344(prev => ({ ...prev, ...filteredUpdates }));
      setConfig900(prev => ({ ...prev, ...filteredUpdates }));
      setConfig564(prev => ({ ...prev, ...filteredUpdates }));
    } else {
      // Иначе применяем только к выбранному разрешению
      const resolutionToUpdate = selectedResolution || currentResolution;
      
      if (resolutionToUpdate === "276x155") {
        setConfig276(prev => ({ ...prev, ...filteredUpdates }));
      } else if (resolutionToUpdate === "344x193") {
        setConfig344(prev => ({ ...prev, ...filteredUpdates }));
      } else if (resolutionToUpdate === "900x250") {
        setConfig900(prev => ({ ...prev, ...filteredUpdates }));
      } else if (resolutionToUpdate === "564x116") {
        setConfig564(prev => ({ ...prev, ...filteredUpdates }));
      }
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

  // CustomLegend больше не используется - каждый график создает свою легенду в renderChartPreview

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

  // commonOptions больше не используется - каждый график создает свои options в renderChartPreview

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

  // Функция для рендеринга одного графика с заданным разрешением
  const renderChartPreview = (resolution: Resolution, chartConfig: ChartConfig) => {
    const resolutionWidth = resolution === "276x155" ? 276 : 
                            resolution === "344x193" ? 344 :
                            resolution === "900x250" ? 900 :
                            resolution === "564x116" ? 564 : 276;
    const isTiny = resolutionWidth <= 330;
    const isMobile = resolutionWidth < 600;
    const isFixedSize = resolutionWidth >= 270 && resolutionWidth <= 280; // Для экрана 276x155
    const isWidth340 = resolutionWidth >= 340 && resolutionWidth <= 350; // Для экрана 344x193
    
    // Вычисляем адаптивную шкалу для этого разрешения
    const adaptiveRangeForRes = allValues.length > 0 
      ? calculateAdaptiveAxisRange(allValues as number[], resolution, dataType)
      : { min: 0, max: 100, gridlinesCount: 1 };
    
    // Используем значения из конфигурации для vAxisMin и vAxisMax, если они заданы
    // Иначе вычисляем из данных
    let vAxisMinForRes: number;
    let vAxisMaxForRes: number;
    
    // Если в конфигурации есть значения vAxisMin/vAxisMax, используем их
    // Это позволяет ползункам редактировать эти значения
    if (chartConfig.vAxisMin !== undefined && chartConfig.vAxisMax !== undefined) {
      vAxisMinForRes = chartConfig.vAxisMin;
      vAxisMaxForRes = chartConfig.vAxisMax;
    } else if (allValues.length > 0) {
      // Иначе вычисляем из данных
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);
      
      if (currentChartInfo?.dataType === 'reserve') {
        // Для резервных графиков: округляем до сотен, точно как в реальных графиках
        if (minValue === 0 && maxValue === 0) {
          vAxisMinForRes = -10;
          vAxisMaxForRes = 10;
        } else {
          // Используем точно такую же логику, как в ModelingReserveGorkovskayaElectricChart
          const minReserve = minValue;
          const maxReserve = maxValue;
          vAxisMinForRes = Math.floor(minReserve / 100) * 100 - 100;
          vAxisMaxForRes = Math.ceil(maxReserve / 100) * 100 + 100;
        }
      } else {
        // Для балансовых графиков: округляем до десятков
        vAxisMinForRes = Math.floor(minValue / 10) * 10 - 10;
        vAxisMaxForRes = Math.ceil(maxValue / 10) * 10 + 10;
      }
    } else {
      vAxisMinForRes = adaptiveRangeForRes.min;
      vAxisMaxForRes = adaptiveRangeForRes.max;
    }
    
    // Chart area config для этого разрешения
    const chartAreaConfigForRes: any = {
      left: chartConfig.chartAreaLeft,
      right: chartConfig.chartAreaRight,
      height: chartConfig.chartAreaHeight,
      width: chartConfig.chartAreaWidth,
    };
    
    // Всегда применяем chartAreaTop и chartAreaBottom из конфигурации
    if (chartConfig.chartAreaTop) {
      chartAreaConfigForRes.top = chartConfig.chartAreaTop;
    }
    
    if (chartConfig.chartAreaBottom !== undefined && chartConfig.chartAreaBottom !== null) {
      chartAreaConfigForRes.bottom = chartConfig.chartAreaBottom;
    }
    
    // Options для этого разрешения
    const optionsForRes = {
      fontName: "Golos Text",
      fontSize: chartConfig.baseFontSize,
      backgroundColor: "transparent",
      chartArea: chartAreaConfigForRes,
      hAxis: {
        textStyle: { 
          color: "#8E8E93", 
          fontSize: chartConfig.axisFontSize, 
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
            fontSize: chartConfig.axisFontSize,
            bold: true
          },
          alternatingDirection: 1, // Чередование: 1 = вверх/вниз
        } : {}),
      },
      vAxis: {
        textStyle: { 
          color: "transparent", 
          fontSize: chartConfig.axisFontSize, 
          bold: true 
        },
        gridlines: { color: "#F2F2F7", count: chartConfig.vAxisGridlinesCount !== undefined ? chartConfig.vAxisGridlinesCount : adaptiveRangeForRes.gridlinesCount },
        baselineColor: "#E5E5EA",
        baseline: 0,
        viewWindowMode: "explicit" as const,
        viewWindow: {
          min: Math.min(0, vAxisMinForRes),
          max: vAxisMaxForRes
        },
        format: "decimal",
        ticks: [0] as any,
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
          fontSize: chartConfig.axisFontSize,
          bold: true,
          color: "#3A3A3C",
        },
        stem: { color: "transparent", length: chartConfig.annotationStemLength },
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
      series: currentChartInfo?.dataType === 'reserve' 
        ? {
            0: { 
              // Используем коричневый цвет для резервных графиков электросетей, оранжевый для тепловых
              color: currentChartInfo?.path.includes('electric') ? "#8B4513" : "#FF9500", 
              pointShape: "circle", 
              areaOpacity: 0.15,
              pointSize: isTiny ? 3.6 : (isMobile ? 5.4 : 7.2),
              annotations: {
                stem: { 
                  color: "transparent", 
                  length: chartConfig.orangeAnnotationAbove 
                    ? chartConfig.annotationStemLength 
                    : -chartConfig.annotationStemLength * 2.65
                },
              }
            },
          }
        : {
            0: { 
              color: "#FF9500", 
              pointShape: "circle", 
              areaOpacity: 0.15,
              pointSize: isTiny ? 3.6 : (isMobile ? 5.4 : 7.2),
              annotations: {
                stem: { 
                  color: "transparent", 
                  length: chartConfig.orangeAnnotationAbove 
                    ? chartConfig.annotationStemLength 
                    : -chartConfig.annotationStemLength * 2.65
                },
              }
            }, 
            1: { 
              color: "#34C759", 
              pointShape: "circle", 
              areaOpacity: 0.15,
              pointSize: isTiny ? 3.6 : (isMobile ? 5.4 : 7.2),
              annotations: {
                stem: { 
                  color: "transparent", 
                  length: chartConfig.greenAnnotationAbove 
                    ? chartConfig.annotationStemLength 
                    : -chartConfig.annotationStemLength * 2.65
                },
              }
            },
          },
    };
    
    // Custom Legend для этого разрешения
    const CustomLegendForRes = () => {
      if (currentChartInfo?.dataType === 'reserve') {
        return (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px",
            padding: "0",
            paddingLeft: chartConfig.legendLeftPadding,
            marginTop: chartConfig.legendMarginTop,
            width: "100%",
            boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", 
                backgroundColor: currentChartInfo?.path.includes('electric') ? "#8B4513" : "#FF9500"
              }}></div>
              <span style={{ 
                fontFamily: "'Golos Text', sans-serif", 
                fontSize: `${chartConfig.legendFontSize}px`, 
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
          paddingLeft: chartConfig.legendLeftPadding,
          marginTop: chartConfig.legendMarginTop,
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ 
              width: "12px", height: "12px", minWidth: "12px", borderRadius: "50%", backgroundColor: "#FF9500"
            }}></div>
            <span style={{ 
              fontFamily: "'Golos Text', sans-serif", 
              fontSize: `${chartConfig.legendFontSize}px`, 
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
              fontSize: `${chartConfig.legendFontSize}px`, 
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
    
    const width = resolution === "276x155" ? "276px" : (resolution === "344x193" ? "344px" : (resolution === "564x116" ? "564px" : "900px"));
    const height = resolution === "276x155" ? "155px" : (resolution === "344x193" ? "193px" : (resolution === "564x116" ? "116px" : "250px"));
    
    const isSelected = selectedResolution === resolution;
    
    return (
      <Box 
        key={resolution} 
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onClick={() => setSelectedResolution(resolution)}
      >
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 0.5, 
            fontWeight: "bold", 
            fontSize: "0.75rem",
            color: isSelected ? "primary.main" : "text.primary"
          }}
        >
          {resolution} {isSelected ? "✓" : ""}
        </Typography>
        <Box sx={{
          width,
          height,
          border: 3,
          borderColor: isSelected ? "primary.main" : "divider",
          borderRadius: 1,
          p: 0,
          bgcolor: isSelected ? "primary.50" : "background.default",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isSelected ? 3 : 1,
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: isSelected ? "primary.main" : "primary.light",
            boxShadow: 2
          }
        }}>
          <Paper 
            elevation={1}
            sx={{
              borderRadius: 0,
              p: chartConfig.containerPaddingTop ? `${chartConfig.containerPaddingTop} 0 5px 0` : "2px 0 5px 0",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: "100%",
              height: "100%",
            }}
          >
            <Box 
              sx={{ 
                width: "100%", 
                height: chartConfig.chartContainerHeight,
                position: "relative",
                flexShrink: 0,
              }}
            >
              {data1 && Array.isArray(data1) && data1.length > 1 ? (
                <Chart
                  chartType="AreaChart"
                  width="100%"
                  height="100%"
                  data={data1}
                  options={optionsForRes}
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
            </Box>
            <CustomLegendForRes />
          </Paper>
        </Box>
      </Box>
    );
  };

  // orangeStemLength и greenStemLength больше не используются - вычисляются в renderChartPreview

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

  // options1 больше не используется - каждый график создает свои options в renderChartPreview


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
      {/* Левая панель: выбор графика и JSON */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, width: "350px" }}>
        {/* Выбор графика */}
      <Paper 
        elevation={2}
        sx={{
          p: 2.5,
        overflowY: "auto",
            maxHeight: "calc(100vh - 400px)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2.5 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Download />}
              onClick={async (event) => {
                const button = event.currentTarget;
                const originalText = button.textContent;
                
                try {
                  const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
                  
                  // Показываем индикатор загрузки
                  button.disabled = true;
                  if (button.textContent !== null) {
                    button.textContent = 'Генерация...';
                  }
                  
                  const response = await fetch(`${API_BASE_URL}/api/generate-static-archive`);
                  
                  if (!response.ok) {
                    let errorMessage = 'Ошибка генерации архива';
                    try {
                      const error = await response.json();
                      errorMessage = error.error || errorMessage;
                    } catch {
                      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                  }
                  
                  // Проверяем, что ответ - это ZIP файл
                  const contentType = response.headers.get('Content-Type');
                  if (!contentType || !contentType.includes('zip')) {
                    throw new Error('Сервер вернул не ZIP файл');
                  }
                  
                  // Получаем blob из ответа
                  const blob = await response.blob();
                  
                  // Создаем ссылку для скачивания
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  
                  // Получаем имя файла из заголовка Content-Disposition или используем дефолтное
                  const contentDisposition = response.headers.get('Content-Disposition');
                  let filename = 'tec-graphs-static.zip';
                  if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                      filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                  }
                  
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  
                  // Восстанавливаем кнопку
                  button.disabled = false;
                  if (button.textContent !== null) {
                    button.textContent = originalText;
                  }
                } catch (error) {
                  console.error('Ошибка скачивания архива:', error);
                  alert('Ошибка генерации архива: ' + (error instanceof Error ? error.message : String(error)));
                  
                  // Восстанавливаем кнопку в случае ошибки
                  button.disabled = false;
                  if (button.textContent !== null) {
                    button.textContent = originalText;
                  }
                }
              }}
            >
              Обновление
            </Button>
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
        
        {/* Выбор графика */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>Выберите график:</Typography>
            {(() => {
              // Подсчитываем статистику только для текущей категории (тепла или электричества)
              const allStatuses = getAllChartStatuses();
              const categoryCharts = filteredCharts; // Используем уже отфильтрованный список
              const totalCharts = categoryCharts.length;
              const readyForPublication = categoryCharts.filter(c => {
                const status = allStatuses[c.id] || 'not_edited';
                return status === 'ready_for_publication';
              }).length;
              const edited = categoryCharts.filter(c => {
                const status = allStatuses[c.id] || 'not_edited';
                return status === 'edited';
              }).length;
              const notEdited = categoryCharts.filter(c => {
                const status = allStatuses[c.id] || 'not_edited';
                return status === 'not_edited';
              }).length;
              
              if (totalCharts === 0) {
                return null;
              }
              
              const categoryLabel = category === 'teplo' ? 'Теплосети' : 'Электросети';
              
              return (
                <Box sx={{ display: "flex", gap: 2, fontSize: "0.8125rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    {categoryLabel}:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: "#333" }}>
                    Всего: <strong style={{ color: "#007AFF" }}>{totalCharts}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#34C759", fontWeight: 500 }}>
                    🟢 Готовы: <strong>{readyForPublication}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#FF9500", fontWeight: 500 }}>
                    🟠 Сохранено: <strong>{edited}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#FF3B30", fontWeight: 500 }}>
                    🔴 Не редактировались: <strong>{notEdited}</strong>
                  </Typography>
                </Box>
              );
            })()}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl fullWidth>
              <Select
              value={selectedChartId}
                onChange={(e) => handleChartIdChange(e.target.value)}
                displayEmpty
            >
            {filteredCharts.map((chart) => {
              const status = getChartStatus(chart.id);
              // Проверяем, является ли график новым (из Excel файлов)
              const isNewChart = Array.isArray(newChartsFromExcel) && newChartsFromExcel.includes(chart.id);
              const newIndicator = isNewChart ? '⚫ ' : '';
              return (
                    <MenuItem key={`${chart.id}-${statusesUpdated}`} value={chart.id}>
                  {newIndicator}{getStatusIndicator(status)} {chart.name} - {getStatusText(status)}
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
        </Paper>

        {/* JSON конфигурация - маленькое окошко */}
        <Paper elevation={2} sx={{ p: 1.5, maxHeight: "250px", display: "flex", flexDirection: "column" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>JSON:</Typography>
            <Stack direction="row" spacing={0.5}>
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
                  alert(`JSON для ${selectedResolution || currentResolution} скопирован`);
                }}
                sx={{ fontSize: "0.7rem", minWidth: "auto", px: 1 }}
              >
                Копировать
              </Button>
              <Button
                variant="contained"
                size="small"
                color="success"
                onClick={() => {
                  const allConfigs = {
                    "276x155": generateJsonFromConfig(config276),
                    "344x193": generateJsonFromConfig(config344),
                    "900x250": generateJsonFromConfig(config900),
                    "564x116": generateJsonFromConfig(config564),
                  };
                  const allJson = JSON.stringify(allConfigs, null, 2);
                  const textarea = document.createElement('textarea');
                  textarea.value = allJson;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert('JSON для всех 4 разрешений скопирован в буфер обмена');
                }}
                sx={{ fontSize: "0.7rem", minWidth: "auto", px: 1 }}
              >
                Все 4
              </Button>
            </Stack>
          </Stack>
          {jsonError && (
            <Alert severity="error" sx={{ mb: 1, fontSize: "0.7rem", py: 0.5 }}>
              {jsonError}
            </Alert>
          )}
          <TextField
            multiline
            rows={5}
            value={jsonConfig}
            onChange={(e) => handleJsonChange(e.target.value)}
            error={!!jsonError}
            sx={{
              width: "100%",
              fontFamily: "monospace",
              fontSize: "9px",
              "& .MuiInputBase-input": {
                fontFamily: "monospace",
                fontSize: "9px",
                lineHeight: 1.3,
              },
            }}
          />
        </Paper>
      </Box>

      {/* Правая часть: графики и настройки */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* График */}
        <Paper elevation={2} sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Компактное расположение: 276x155 и 900x250 в одну строчку */}
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            gap: 1.5,
            alignItems: "flex-start"
          }}>
            {/* Первый ряд: 276x155 и 900x250 */}
            <Box sx={{ 
              display: "flex", 
              flexDirection: "row",
              gap: 1.5,
              justifyContent: "flex-start",
              alignItems: "start"
            }}>
              {renderChartPreview("276x155", config276)}
              {renderChartPreview("900x250", config900)}
            </Box>
            {/* Второй ряд: 344x193 и 564x116 */}
            <Box sx={{ 
              display: "flex", 
              flexDirection: "row",
              gap: 1.5,
              justifyContent: "flex-start",
              alignItems: "start"
            }}>
              {renderChartPreview("344x193", config344)}
              {renderChartPreview("564x116", config564)}
            </Box>
          </Box>
            
            {/* Кнопки Сохранить, Готов к публикации и К графику */}
          <Stack direction="row" spacing={1} justifyContent="flex-start" sx={{ mt: 2, width: "100%" }}>
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
                  // Фиксируем параметры легенды из дефолтных конфигураций
                  const isTeploChartForSave = selectedChartId.includes('teplo') || selectedChartId.includes('electric');
                  const default276 = getDefaultConfig("276x155", isTeploChartForSave);
                  const default344 = getDefaultConfig("344x193", isTeploChartForSave);
                  const default900 = getDefaultConfig("900x250", isTeploChartForSave);
                  const default564 = getDefaultConfig("564x116", isTeploChartForSave);
                  
                  if (updatedConfig276) {
                    const normalized = normalizeConfig(updatedConfig276);
                    setConfig276({ ...normalized, legendLeftPadding: default276.legendLeftPadding, legendMarginTop: default276.legendMarginTop });
                  }
                  if (updatedConfig344) {
                    const normalized = normalizeConfig(updatedConfig344);
                    setConfig344({ ...normalized, legendLeftPadding: default344.legendLeftPadding, legendMarginTop: default344.legendMarginTop });
                  }
                  if (updatedConfig900) {
                    const normalized = normalizeConfig(updatedConfig900);
                    setConfig900({ ...normalized, legendLeftPadding: default900.legendLeftPadding, legendMarginTop: default900.legendMarginTop });
                  }
                  if (updatedConfig564) {
                    const normalized = normalizeConfig(updatedConfig564);
                    setConfig564({ ...normalized, legendLeftPadding: default564.legendLeftPadding, legendMarginTop: default564.legendMarginTop });
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
                  // Фиксируем параметры легенды из дефолтных конфигураций
                  const isTeploChartForPublish = selectedChartId.includes('teplo') || selectedChartId.includes('electric');
                  const default276 = getDefaultConfig("276x155", isTeploChartForPublish);
                  const default344 = getDefaultConfig("344x193", isTeploChartForPublish);
                  const default900 = getDefaultConfig("900x250", isTeploChartForPublish);
                  const default564 = getDefaultConfig("564x116", isTeploChartForPublish);
                  
                  if (updatedConfig276) {
                    const normalized = normalizeConfig(updatedConfig276);
                    setConfig276({ ...normalized, legendLeftPadding: default276.legendLeftPadding, legendMarginTop: default276.legendMarginTop });
                  }
                  if (updatedConfig344) {
                    const normalized = normalizeConfig(updatedConfig344);
                    setConfig344({ ...normalized, legendLeftPadding: default344.legendLeftPadding, legendMarginTop: default344.legendMarginTop });
                  }
                  if (updatedConfig900) {
                    const normalized = normalizeConfig(updatedConfig900);
                    setConfig900({ ...normalized, legendLeftPadding: default900.legendLeftPadding, legendMarginTop: default900.legendMarginTop });
                  }
                  if (updatedConfig564) {
                    const normalized = normalizeConfig(updatedConfig564);
                    setConfig564({ ...normalized, legendLeftPadding: default564.legendLeftPadding, legendMarginTop: default564.legendMarginTop });
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
                  
                  // Статус сохранен на сервере
                }}
              >
                <CheckCircle sx={{ mr: 0.5, fontSize: "1rem" }} /> {publishButtonText}
              </Button>
              {currentChartInfo && (
                <Button
                  variant="contained"
                  size="medium"
                  color="primary"
                  onClick={() => {
                    const url = `${window.location.origin}${currentChartInfo.path}`;
                    window.open(url, '_blank');
                  }}
                  sx={{ minWidth: 120, whiteSpace: "nowrap" }}
                >
                  К графику
                </Button>
              )}
          </Stack>
        </Paper>

        {/* Настройки графиков - горизонтально под графиками */}
        <Paper elevation={2} sx={{ p: 2, overflowX: "auto", ml: -47, mr: 0, width: "calc(100% + 376px)" }}>
          {/* Чекбокс "Применить ко всем" */}
          <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  color="primary"
                />
              }
              label="Применить ко всем разрешениям"
            />
          </Box>
          {/* Настройки в горизонтальной прокрутке */}
          <Box sx={{ display: "flex", flexDirection: "row", gap: 2, overflowX: "auto", pb: 1 }}>
        {/* Группа: Контейнер */}
            <Box sx={{ minWidth: "280px", pb: 2, borderRight: 1, borderColor: "divider", pr: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <Inventory fontSize="small" /> Контейнер
          </Typography>
          
          <SliderInputField
                disabled={!selectedResolution}
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
                parseValue={(val) => {
                  const str = typeof val === 'string' ? val : String(val);
                  return parseInt(str.replace(/px/g, '')) || 120;
                }}
            formatValue={(val) => String(Math.min(Math.max(val, 80), 200))}
          />

          <SliderInputField
                disabled={!selectedResolution}
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
                parseValue={(val) => {
                  const str = typeof val === 'string' ? val : String(val);
                  return parseFloat(str.replace(/%/g, '')) || 0;
                }}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 30))}
          />
        </Box>

        {/* Группа: Вертикальная ось */}
            <Box sx={{ minWidth: "280px", pb: 2, borderRight: 1, borderColor: "divider", pr: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <TrendingUp fontSize="small" /> Вертикальная ось
          </Typography>

          <SliderInputField
                disabled={false}
            label="Минимальное значение вертикальной оси"
                value={config.vAxisMin ?? adaptiveRange.min}
                onChange={(val) => {
                  const numVal = typeof val === 'number' ? val : parseInt(String(val)) || 0;
                  updateConfig({ vAxisMin: numVal });
                }}
                min={Math.floor(adaptiveRange.min - 50)}
                max={Math.ceil(adaptiveRange.max + 50)}
                step={Math.max(1, Math.ceil((adaptiveRange.max - adaptiveRange.min) / 100))}
            description="Нижняя граница значений на вертикальной оси (оси Y). Все значения ниже не будут видны."
            onBlur={(val) => {
                  const clampedVal = Math.min(Math.max(val, Math.floor(adaptiveRange.min - 50)), Math.ceil(adaptiveRange.max + 50));
              updateConfig({ vAxisMin: clampedVal });
              }}
                parseValue={(val) => {
                  if (typeof val === 'number') return val;
                  return parseInt(String(val)) || 0;
                }}
                formatValue={(val) => String(val)}
            />

          <SliderInputField
                disabled={false}
            label="Максимальное значение вертикальной оси"
                value={config.vAxisMax ?? adaptiveRange.max}
                onChange={(val) => {
                  const numVal = typeof val === 'number' ? val : parseInt(String(val)) || 0;
                  updateConfig({ vAxisMax: numVal });
                }}
                min={Math.floor(adaptiveRange.min - 50)}
                max={Math.ceil(adaptiveRange.max + 50)}
                step={Math.max(1, Math.ceil((adaptiveRange.max - adaptiveRange.min) / 100))}
            description="Верхняя граница значений на вертикальной оси (оси Y). Все значения выше не будут видны."
            onBlur={(val) => {
                  const clampedVal = Math.min(Math.max(val, Math.floor(adaptiveRange.min - 50)), Math.ceil(adaptiveRange.max + 50));
              updateConfig({ vAxisMax: clampedVal });
              }}
                parseValue={(val) => {
                  if (typeof val === 'number') return val;
                  return parseInt(String(val)) || 0;
                }}
                formatValue={(val) => String(val)}
            />

          <SliderInputField
                disabled={false}
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
            <Box sx={{ minWidth: "280px", pb: 2, borderRight: 1, borderColor: "divider", pr: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            📊 Область графика
          </Typography>

          <SliderInputField
                disabled={!selectedResolution}
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
                disabled={!selectedResolution}
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
                parseValue={(val) => parseFloat(String(val).replace(/%/g, '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 20))}
            />

          <SliderInputField
                disabled={!selectedResolution}
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
                parseValue={(val) => parseFloat(String(val).replace(/%/g, '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, -30), 30))}
          />

          <SliderInputField
                disabled={!selectedResolution}
            label="Отступ области графика слева"
            value={config.chartAreaLeft}
            onChange={(val) => {
                  const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(/%/g, '')) || 0;
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
                parseValue={(val) => parseFloat(String(val).replace(/%/g, '')) || 0}
            formatValue={(val) => String(Math.min(Math.max(val, 0), 20))}
            />

          <SliderInputField
                disabled={!selectedResolution}
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
                parseValue={(val) => {
                  const str = typeof val === 'string' ? val : String(val);
                  return parseFloat(str.replace(/%/g, '')) || 98;
                }}
            formatValue={(val) => String(Math.min(Math.max(val, 70), 100))}
            />
        </Box>

        {/* Группа: Аннотации */}
            <Box sx={{ minWidth: "280px", pb: 2, borderRight: 1, borderColor: "divider", pr: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            📝 Аннотации
          </Typography>

          <SliderInputField
                disabled={!selectedResolution}
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
                      disabled={!selectedResolution}
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
                      disabled={!selectedResolution}
            />
              }
              label={config.greenAnnotationAbove ? "Над точкой" : "Под точкой"}
            />
          </Box>
        </Box>

        {/* Группа: Шрифты */}
            <Box sx={{ minWidth: "280px", pb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <TextFields fontSize="small" /> Шрифты
          </Typography>

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
                    disabled={!selectedResolution}
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
                    disabled={!selectedResolution}
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
                    disabled={!selectedResolution}
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
                    disabled={!selectedResolution}
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
                    disabled={!selectedResolution}
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
                    disabled={!selectedResolution}
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
                  </Box>
            </Paper>
      </Box>
    </Box>
  );
}

