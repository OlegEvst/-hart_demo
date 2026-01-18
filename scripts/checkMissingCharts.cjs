const fs = require('fs');

// Проверяем несоответствия между URL и chartId
const urls = [
  'teplokotelnaya_voennyy_komissariat_szao_g_moskvy',
  'teplokotelnaya_gbu_zhilischnik_rayona_filevskiy_park',
  'teplokotelnaya_detskiy_sanatoriy_39',
  'teplokotelnaya_p_gazoprovod_territoriya_mueg',
  'teplonovaya_kotelnaya_vblizi_d_piskovo',
  'teplonovaya_kotelnaya_vblizi_d_pyhchevo',
  'teplonovaya_kotelnaya_zhk_lesnaya_skazka',
  'teplonovaya_kotelnaya_zhk_kvartal_marino',
  'teplonovaya_kotelnaya_rublevo_arhangelskoe'
];

const path = require('path');
const mapperContent = fs.readFileSync(path.join(__dirname, '../src/components/ChartDataMapper.ts'), 'utf-8');
const allChartsDataContent = fs.readFileSync(path.join(__dirname, '../src/data/allChartsData.ts'), 'utf-8');

console.log('=== ПРОВЕРКА НЕСООТВЕТСТВИЙ ===\n');

urls.forEach(url => {
  // Ищем в ChartDataMapper по path
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pathPattern = new RegExp(`path:\\s*['"]/${escapedUrl}['"]`, 'i');
  const pathMatch = mapperContent.match(pathPattern);
  
  if (pathMatch) {
    // Нашли по path, теперь ищем chartId
    const beforeMatch = mapperContent.substring(0, mapperContent.indexOf(pathMatch[0]));
    const idMatches = beforeMatch.match(/id:\s*['"]([^'"]+)['"]/g);
    if (idMatches && idMatches.length > 0) {
      const lastIdMatch = idMatches[idMatches.length - 1];
      const chartId = lastIdMatch.match(/['"]([^'"]+)['"]/)[1];
      console.log(`✅ URL: ${url}`);
      console.log(`   Найден chartId: ${chartId}`);
      
      // Проверяем, есть ли данные
      const modulePattern = new RegExp(`['"]${chartId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s*\\w+Module`, 'i');
      const hasData = allChartsDataContent.match(modulePattern);
      if (hasData) {
        console.log(`   ✅ Данные найдены в allChartsData.ts`);
      } else {
        console.log(`   ❌ Данные НЕ найдены в allChartsData.ts`);
      }
    }
  } else {
    // Ищем похожие по частичному совпадению
    const similarPattern = /id:\s*['"]([^'"]+)['"][^}]*path:\s*['"]([^'"]+)['"]/g;
    const allMatches = [];
    let m;
    while ((m = similarPattern.exec(mapperContent)) !== null) {
      const chartId = m[1];
      const path = m[2];
      const urlParts = url.split('_');
      const firstPart = urlParts[0];
      if (chartId.includes(firstPart) || path.includes(firstPart)) {
        allMatches.push({ chartId: chartId, path: path });
      }
    }
    
    console.log(`❌ URL: ${url}`);
    console.log(`   НЕ НАЙДЕН в ChartDataMapper`);
    if (allMatches.length > 0) {
      console.log(`   Похожие:`);
      allMatches.slice(0, 3).forEach(am => {
        console.log(`     - chartId: ${am.chartId}, path: ${am.path}`);
      });
    }
  }
  console.log('');
});
