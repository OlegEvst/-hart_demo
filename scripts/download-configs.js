#!/usr/bin/env node

/**
 * Скрипт для скачивания актуального configs.json с сервера перед сборкой
 * Использование: node scripts/download-configs.js [server-url]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = process.env.SERVER_URL || process.argv[2] || 'http://localhost:3001';
const CONFIGS_URL = `${SERVER_URL}/configs.json`;
const OUTPUT_PATH = path.join(__dirname, '../public/configs.json');

console.log(`📥 Скачивание configs.json с сервера: ${CONFIGS_URL}`);

try {
  const response = await fetch(CONFIGS_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Ожидался JSON, получен: ${contentType}`);
  }

  const configsData = await response.json();
  
  // Создаем папку public если её нет
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Сохраняем configs.json в public (чтобы он попал в dist при сборке)
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(configsData, null, 2), 'utf-8');
  
  const configCount = Object.keys(configsData).length;
  console.log(`✅ configs.json успешно скачан (${configCount} конфигураций)`);
  console.log(`   Сохранен в: ${OUTPUT_PATH}`);
  
  process.exit(0);
} catch (error) {
  console.error(`❌ Ошибка скачивания configs.json:`, error.message);
  console.error(`   Проверьте, что сервер запущен на ${SERVER_URL}`);
  console.error(`   Или укажите другой URL: SERVER_URL=http://your-server:3001 node scripts/download-configs.js`);
  process.exit(1);
}
