# Отчет о проблемах с графиками

## Проблема
Графики показывают "Данные не найдены" при переходе по ссылкам.

## Причины

### 1. Несоответствие URL и chartId в ChartDataMapper

#### Проблема 1: `teplokotelnaya_voennyy_komissariat_szao_g_moskvy`
- **URL**: `teplokotelnaya_voennyy_komissariat_szao_g_moskvy`
- **ChartDataMapper**: `teplokotelnaya_voennyy_komissariat_g_moskvy` (без "szao")
- **Решение**: Добавить в ChartDataMapper запись с правильным path или изменить URL

#### Проблема 2: `teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park`
- **URL**: `teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park`
- **ChartDataMapper**: `teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park` (другая транслитерация)
- **Решение**: Добавить в ChartDataMapper запись с правильным path или изменить URL

### 2. Графики отсутствуют в ChartDataMapper

Следующие графики **НЕ НАЙДЕНЫ** в ChartDataMapper:

1. `teplokotelnaya_detskiy_sanatoriy_39`
2. `teplokotelnaya_p_gazoprovod_territoriya_mueg`
3. `teplonovaya_kotelnaya_vblizi_d_piskovo`
4. `teplonovaya_kotelnaya_vblizi_d_pyhchevo`
5. `teplonovaya_kotelnaya_zhk_lesnaya_skazka`
6. `teplonovaya_kotelnaya_zhk_kvartal_marino`
7. `teplonovaya_kotelnaya_rublevo_arhangelskoe`

## Что нужно сделать на сервере

### Вариант 1: Исправить URL (рекомендуется)
Изменить URL в `.htaccess` или в настройках сервера, чтобы они соответствовали chartId в ChartDataMapper:

1. `teplokotelnaya_voennyy_komissariat_szao_g_moskvy` → `teplokotelnaya_voennyy_komissariat_g_moskvy`
2. `teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park` → `teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park`

### Вариант 2: Добавить недостающие графики в ChartDataMapper
Добавить записи для всех 7 отсутствующих графиков в `ChartDataMapper.ts` и создать соответствующие файлы данных.

## Проверка данных

Проверено наличие данных в `allChartsData.ts`:
- ✅ `teplokotelnaya_voennyy_komissariat_g_moskvy` - данные есть
- ✅ `teplokotelnaya_gbu_zhilischnik_rayona_fil_vskiy_park` - данные есть
- ❌ Остальные 7 графиков - данные не найдены

## Рекомендации

1. **Для первых 2 графиков**: Исправить URL на сервере, чтобы они соответствовали chartId в ChartDataMapper
2. **Для остальных 7 графиков**: 
   - Проверить, есть ли для них данные в Excel файлах
   - Если данные есть - добавить их в ChartDataMapper и создать файлы данных
   - Если данных нет - удалить ссылки или создать пустые файлы данных
