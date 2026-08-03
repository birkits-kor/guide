/**
 * 모션베드 견적 페이지용 읽기 전용 가격 API
 * 배포: Apps Script > 배포 > 새 배포 > 웹 앱
 * 실행 사용자: 나 / 액세스 사용자: 모든 사용자
 */
const QUOTE_CONFIG = Object.freeze({
  spreadsheetId: '1g5rdK_i7UtZgle4c4ITk3LP7VPFodr28ijN1_V_lYQw',
  sheetName: '가격표',
  cacheSeconds: 300,
});

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || '');
  const refresh = String(params.refresh || '') === '1';

  try {
    const catalog = getQuoteCatalog_(refresh);
    return output_({ ok: true, ...catalog }, callback);
  } catch (error) {
    return output_({
      ok: false,
      error: '가격표를 불러오지 못했습니다.',
      detail: String(error && error.message ? error.message : error),
    }, callback);
  }
}

function getQuoteCatalog_(bypassCache) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'motion-bed-quote-catalog-v2';
  if (!bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const spreadsheet = SpreadsheetApp.openById(QUOTE_CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(QUOTE_CONFIG.sheetName);
  if (!sheet) throw new Error('가격표 탭을 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('가격표에 데이터가 없습니다.');
  const values = sheet.getRange(1, 1, lastRow, 9).getValues();
  const items = [];
  let afterSetHeader = false;

  values.forEach(function (row, index) {
    const rowNumber = index + 1;
    const name = clean_(row[0]);
    if (name === '세트상품명') {
      afterSetHeader = true;
      return;
    }
    if (afterSetHeader) return;
    if (!name || name === '기본상품명' || name === '추가상품명') return;

    const section = classifySection_(name);
    if (!section) return;
    items.push({
      id: 'price-row-' + rowNumber,
      row: rowNumber,
      section: section,
      name: name,
      size: clean_(row[1]),
      description: clean_(row[2]),
      normalPrice: number_(row[4]),
      beforeDiscount: 0,
      salePrice: number_(row[5]),
      note: clean_(row[7]),
      searchKey: clean_(row[8]),
    });
  });

  const payload = {
    sourceSheet: QUOTE_CONFIG.sheetName,
    sourceSpreadsheetId: QUOTE_CONFIG.spreadsheetId,
    generatedAt: new Date().toISOString(),
    items: items,
  };
  cache.put(cacheKey, JSON.stringify(payload), QUOTE_CONFIG.cacheSeconds);
  return payload;
}

function classifySection_(name) {
  if (name.indexOf('모션베드 프레임') === 0) return 'frames';
  if (name.indexOf('수도권 외 배송비') === 0) return 'delivery';
  if (name.indexOf('매트리스') === 0) return 'mattresses';
  if (name.indexOf('헤드+협탁 - 마베드') === 0) return 'mabedHeads';
  if (name.indexOf('커스텀 패브릭 - 슈브') === 0) return 'shuveFabrics';
  if (name.indexOf('헤드+협탁 - 슈브') === 0) return 'shuveHeads';
  if (name.indexOf('협탁') === 0) return 'nightstands';
  if (name.indexOf('테이블') === 0 && name.indexOf('마베드') !== -1) return 'mabedTables';
  if (name.indexOf('테이블') === 0 && name.indexOf('슈브') !== -1) return 'shuveTables';
  if (name.indexOf('인체감지 무드등') === 0) return 'moodLights';
  return '';
}

function output_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]{0,100}$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return value == null ? '' : String(value).trim();
}

function number_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** Apps Script 편집기에서 실행하면 로그로 항목 수를 확인할 수 있습니다. */
function testQuoteCatalog() {
  const catalog = getQuoteCatalog_(true);
  console.log('가격 항목 수: ' + catalog.items.length);
  console.log(JSON.stringify(catalog.items.slice(0, 3), null, 2));
}
