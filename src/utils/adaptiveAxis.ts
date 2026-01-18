/**
 * Утилиты для адаптивного расчета шкал графиков
 * Основано на лучших практиках для адаптивных графиков
 */

type Resolution = "276x155" | "344x193" | "900x250" | "564x116";

/**
 * Вычисляет "красивое" число (nice number) для шкалы
 * Округляет до ближайшего "красивого" значения (1, 2, 5, 10, 20, 50, 100, и т.д.)
 */
function niceNumber(value: number, round: boolean = false): number {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

/**
 * Вычисляет оптимальные min и max для vAxis на основе данных
 * Использует "nice numbers" и добавляет padding для лучшей видимости
 */
export function calculateAdaptiveAxisRange(
  values: number[],
  resolution: Resolution,
  dataType: 'reserve' | 'balance' = 'reserve'
): { min: number; max: number; gridlinesCount: number } {
  if (values.length === 0) {
    return { min: 0, max: 2, gridlinesCount: 1 };
  }

  // Фильтруем валидные значения
  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v));
  
  if (validValues.length === 0) {
    return { min: 0, max: 2, gridlinesCount: 1 };
  }

  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);
  const range = maxValue - minValue;

  // Если все значения одинаковые или очень близкие
  if (range < 0.001) {
    const center = minValue;
    const padding = Math.max(0.1, center * 0.1);
    return {
      min: Math.max(0, center - padding),
      max: center + padding,
      gridlinesCount: 1
    };
  }

  // Определяем padding в зависимости от разрешения и типа данных
  // Увеличиваем padding для гарантии, что все значения видны, включая аннотации
  const paddingPercent = resolution === "276x155" || resolution === "564x116" 
    ? 0.15  // 15% для маленьких разрешений (больше места для аннотаций)
    : resolution === "344x193"
    ? 0.18  // 18% для средних
    : 0.20; // 20% для больших

  // Для reserve графиков обычно начинаем с 0, если все значения положительные
  // Для balance графиков учитываем отрицательные значения
  const shouldStartFromZero = dataType === 'reserve' && minValue >= 0;

  // Вычисляем min и max с padding
  let calculatedMin: number;
  let calculatedMax: number;

  if (shouldStartFromZero && minValue >= 0) {
    // Начинаем с 0, добавляем padding только сверху
    // Но убеждаемся, что max достаточно большой для всех значений
    calculatedMin = 0;
    const paddedMax = maxValue * (1 + paddingPercent);
    calculatedMax = niceNumber(paddedMax, true);
    
    // Дополнительная проверка: если niceNumber уменьшил max, увеличиваем его
    // Это гарантирует, что все значения будут видны
    if (calculatedMax < paddedMax) {
      calculatedMax = niceNumber(paddedMax * 1.2, true);
    }
    
    // Финальная проверка: max должен быть больше максимального значения данных
    if (calculatedMax < maxValue) {
      calculatedMax = niceNumber(maxValue * (1 + paddingPercent * 1.5), true);
    }
  } else {
    // Добавляем padding с обеих сторон для всех случаев
    const padding = range > 0 ? range * paddingPercent : Math.max(Math.abs(minValue) * 0.1, Math.abs(maxValue) * 0.1, 0.1);
    
    // Для очень маленьких значений (близких к нулю) используем специальную логику
    if (Math.abs(maxValue) < 0.01 && Math.abs(minValue) < 0.01) {
      // Очень маленькие значения - делаем симметричную шкалу вокруг нуля
      const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
      calculatedMin = niceNumber(-absMax * (1 + paddingPercent), false);
      calculatedMax = niceNumber(absMax * (1 + paddingPercent), true);
    } else {
      calculatedMin = niceNumber(minValue - padding, false);
      calculatedMax = niceNumber(maxValue + padding, true);
      
      // Дополнительная проверка: если niceNumber уменьшил значения, корректируем
      if (calculatedMin > minValue - padding) {
        calculatedMin = niceNumber(minValue - padding * 1.2, false);
      }
      if (calculatedMax < maxValue + padding) {
        calculatedMax = niceNumber(maxValue + padding * 1.2, true);
      }
    }
    
    // Если min получился отрицательным, но данные положительные, ставим 0
    if (calculatedMin < 0 && minValue >= 0) {
      calculatedMin = 0;
    }
    
    // Если max получился отрицательным, но данные отрицательные, ставим 0
    if (calculatedMax < 0 && maxValue < 0) {
      calculatedMax = 0;
    }
    
    // Финальная проверка: значения должны покрывать все данные
    if (calculatedMin > minValue) {
      calculatedMin = niceNumber(minValue - padding, false);
    }
    if (calculatedMax < maxValue) {
      calculatedMax = niceNumber(maxValue + padding, true);
    }
  }

  // Вычисляем оптимальное количество линий сетки
  // Для маленьких разрешений - меньше линий
  const gridlinesCount = resolution === "276x155" || resolution === "564x116"
    ? 1
    : resolution === "344x193"
    ? 2
    : 3;

  // Для reserve графиков не позволяем отрицательные значения
  // Для balance графиков разрешаем отрицательные значения
  const finalMin = dataType === 'reserve' && calculatedMin < 0 ? 0 : calculatedMin;

  return {
    min: finalMin,
    max: calculatedMax,
    gridlinesCount
  };
}

/**
 * Получает адаптивные параметры для конкретного разрешения
 * На основе предоставленного JSON конфигурации
 */
export function getResolutionConfig(resolution: Resolution) {
  const configs: Record<Resolution, {
    chartArea: {
      left: string;
      right: string;
      top: string;
      bottom: number;
      height: string;
      width: string;
    };
    fontSize: {
      base: number;
      axis: number;
      legend: number;
    };
    legend: {
      leftPadding: string;
      marginTop: string;
    };
    annotations: {
      stemLength: number;
      orangeAbove: boolean;
      greenAbove: boolean;
    };
    vAxis: {
      min: number;
      max: number;
      gridlinesCount: number;
    };
    container: {
      paddingTop: string;
      chartHeight: string;
    };
  }> = {
    "276x155": {
      chartArea: {
        left: "5.1%",
        right: "5.7%",
        top: "-2.3%",
        bottom: 60,
        height: "97.2%",
        width: "90%"
      },
      fontSize: {
        base: 9,
        axis: 9,
        legend: 10
      },
      legend: {
        leftPadding: "6%",
        marginTop: "-25px"
      },
      annotations: {
        stemLength: 6,
        orangeAbove: true,
        greenAbove: false
      },
      vAxis: {
        min: 0,
        max: 2,
        gridlinesCount: 1
      },
      container: {
        paddingTop: "0%",
        chartHeight: "154px"
      }
    },
    "344x193": {
      chartArea: {
        left: "5%",
        right: "5%",
        top: "-10%",
        bottom: 35,
        height: "98%",
        width: "94%"
      },
      fontSize: {
        base: 10,
        axis: 10.5,
        legend: 11
      },
      legend: {
        leftPadding: "5%",
        marginTop: "3px"
      },
      annotations: {
        stemLength: 5,
        orangeAbove: true,
        greenAbove: false
      },
      vAxis: {
        min: 0,
        max: 5,
        gridlinesCount: 1
      },
      container: {
        paddingTop: "1.4%",
        chartHeight: "151px"
      }
    },
    "900x250": {
      chartArea: {
        left: "2.8%",
        right: "3%",
        top: "-25%",
        bottom: 31,
        height: "98%",
        width: "94%"
      },
      fontSize: {
        base: 13,
        axis: 14.5,
        legend: 16
      },
      legend: {
        leftPadding: "3%",
        marginTop: "6px"
      },
      annotations: {
        stemLength: 7.5,
        orangeAbove: true,
        greenAbove: false
      },
      vAxis: {
        min: 0,
        max: 2,
        gridlinesCount: 1
      },
      container: {
        paddingTop: "1.2%",
        chartHeight: "200px"
      }
    },
    "564x116": {
      chartArea: {
        left: "4%",
        right: "4%",
        top: "-5%",
        bottom: 30,
        height: "98%",
        width: "92%"
      },
      fontSize: {
        base: 11,
        axis: 10,
        legend: 11
      },
      legend: {
        leftPadding: "4%",
        marginTop: "-7px"
      },
      annotations: {
        stemLength: 6,
        orangeAbove: true,
        greenAbove: false
      },
      vAxis: {
        min: 0,
        max: 2,
        gridlinesCount: 1
      },
      container: {
        paddingTop: "1%",
        chartHeight: "91px"
      }
    }
  };

  return configs[resolution];
}

/**
 * Определяет разрешение на основе ширины и высоты окна
 */
export function detectResolution(width: number, height: number): Resolution {
  // Определяем разрешение на основе ширины
  if (width >= 260 && width <= 285) {
    return "276x155";
  } else if (width >= 320 && width <= 360) {
    return "344x193";
  } else if (width >= 850) {
    return "900x250";
  } else if (width >= 540 && width <= 590) {
    return "564x116";
  }
  
  // Fallback на основе соотношения сторон
  const aspectRatio = width / height;
  if (aspectRatio > 4.5) {
    return "564x116";
  } else if (aspectRatio > 3.5) {
    return "900x250";
  } else if (aspectRatio > 1.7) {
    return "344x193";
  } else {
    return "276x155";
  }
}
