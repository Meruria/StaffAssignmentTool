/**
 * コミケ買い物リスト・担当割り振りツール
 * Google Apps Script (GAS) バックエンド
 * 
 * === 重要なセットアップ手順 ===
 * 1. このスクリプトが置かれているスプレッドシートの ID を確認
 *    （URL の /spreadsheets/d/[ここ]/edit# の部分）
 * 2. 下の SPREADSHEET_ID に貼り付け
 * 3. 「デプロイ」ボタン（右上） → 「新しいデプロイ」を選択
 * 4. 「デプロイのタイプを選択」で「ウェブアプリ」を選択
 * 5. 以下のように設定:
 *    - 実行者: 自分のアカウント
 *    - アクセスできるユーザー: 全員
 * 6. 「デプロイ」をクリック → URL が発行される
 * 7. その URL を HTML の設定画面に貼り付け
 */

// スプレッドシートのID（このスクリプトを含むスプレッドシートの ID）
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// シート名
const SHEET_ITEMS = 'ItemMaster';
const SHEET_RUNNERS = 'RunnerMaster';

/**
 * スプレッドシートの初期化（シートがなければ作成）
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // ItemMasterシートの作成
  let itemSheet = ss.getSheetByName(SHEET_ITEMS);
  if (!itemSheet) {
    itemSheet = ss.insertSheet(SHEET_ITEMS);
    itemSheet.appendRow(['ID', '日付', 'ホール', 'ブロック', '番号', 'サークル名', '商品情報', '価格', 'ジャンル', 'シャッター', '合計数', '購入者情報', '担当者', '完了フラグ']);
    itemSheet.getRange(1, 1, 1, 14).setFontWeight('bold');
  }
  
  // RunnerMasterシートの作成
  let runnerSheet = ss.getSheetByName(SHEET_RUNNERS);
  if (!runnerSheet) {
    runnerSheet = ss.insertSheet(SHEET_RUNNERS);
    runnerSheet.appendRow(['名前', 'カラーコード', '1日目配置', '2日目配置']);
    runnerSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  
  return { itemSheet, runnerSheet };
}

/**
 * HTTP OPTIONSリクエストのハンドラ (プリフライト対応)
 */
function doOptions(e) {
  return ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

/**
 * HTTP GETリクエストのハンドラ
 * JSONP対応: ?callback=funcName で JSONP レスポンスを返す
 */
function doGet(e) {
  const action = e.parameter.action || 'getAll';
  const callback = e.parameter.callback; // JSONP callback 関数名
  let result;
  
  try {
    switch (action) {
      case 'getItems':
        result = getItems();
        break;
      case 'getRunners':
        result = getRunners();
        break;
      case 'saveAll':
        // GET でデータを受け取って保存（JSONP 用）
        const itemsJson = e.parameter.itemsJson || '[]';
        const runnersJson = e.parameter.runnersJson || '[]';
        
        Logger.log('保存リクエスト受信 - Items JSON length: ' + itemsJson.length);
        Logger.log('保存リクエスト受信 - Runners JSON length: ' + runnersJson.length);
        
        const items = JSON.parse(itemsJson);
        const runners = JSON.parse(runnersJson);
        
        result = {
          items: saveItems(items),
          runners: saveRunners(runners)
        };
        break;
      case 'getAll':
      default:
        result = {
          items: getItems(),
          runners: getRunners()
        };
        break;
    }
  } catch (error) {
    Logger.log('エラー発生: ' + error.message);
    Logger.log('スタックトレース: ' + error.stack);
    result = { error: error.message, stack: error.stack };
  }
  
  // JSONP か JSON か判定
  const json = JSON.stringify(result);
  
  if (callback) {
    // JSONP レスポンス（CORS 不要）
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // JSON レスポンス + CORS ヘッダ
    return ContentService.createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

/**
 * HTTP POSTリクエストのハンドラ (CORS対応版)
 */
function doPost(e) {
  try {
    Logger.log('POSTリクエスト受信');
    Logger.log('リクエストボディサイズ: ' + e.postData.contents.length + ' bytes');
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;
    
    Logger.log('アクション: ' + action);
    
    switch (action) {
      case 'saveItems':
        result = saveItems(data.items);
        break;
      case 'saveRunners':
        result = saveRunners(data.runners);
        break;
      case 'saveAll':
        Logger.log('saveAll アクション実行中...');
        Logger.log('アイテム数: ' + (data.items ? data.items.length : 0));
        Logger.log('ランナー数: ' + (data.runners ? data.runners.length : 0));
        
        result = {
          items: saveItems(data.items || []),
          runners: saveRunners(data.runners || [])
        };
        
        Logger.log('saveAll 完了');
        break;
      case 'updateItemAssignment':
        result = updateItemAssignment(data.id, data.assignee, data.completed);
        break;
      case 'deleteItem':
        result = deleteItem(data.id);
        break;
      case 'deleteRunner':
        result = deleteRunner(data.name);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
  } catch (error) {
    Logger.log('エラー発生: ' + error.message);
    Logger.log('スタックトレース: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message, stack: error.stack }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

/**
 * 買い物リストを取得
 */
function getItems() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ITEMS);
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }
  
  const headers = data[0];
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // IDがある行のみ
      // 購入者情報をパース
      let buyers = [];
      try {
        if (row[11]) {
          buyers = JSON.parse(row[11]);
        }
      } catch (e) {
        buyers = [];
      }
      
      items.push({
        id: row[0],
        date: row[1],
        hall: row[2],
        block: row[3],
        number: row[4],
        circleName: row[5],
        productInfo: row[6],
        price: row[7],
        genre: row[8] || '',
        isShutter: row[9] === true || row[9] === 'TRUE',
        totalCount: row[10] || 1,
        buyers: buyers,
        assignee: row[12] || '',
        completed: row[13] === true || row[13] === 'TRUE'
      });
    }
  }
  
  return items;
}

/**
 * ランナー一覧を取得
 */
function getRunners() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RUNNERS);
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }
  
  const runners = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // 名前がある行のみ
      runners.push({
        name: row[0],
        color: row[1] || '#CCCCCC',
        day1Hall: row[2] || '',
        day2Hall: row[3] || ''
      });
    }
  }
  
  return runners;
}

/**
 * 買い物リストを保存（全置換）
 */
function saveItems(items) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_ITEMS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ITEMS);
  }
  
  // 既存データをクリア
  sheet.clear();
  
  // ヘッダーを追加
  sheet.appendRow(['ID', '日付', 'ホール', 'ブロック', '番号', 'サークル名', '商品情報', '価格', 'ジャンル', 'シャッター', '合計数', '購入者情報', '担当者', '完了フラグ']);
  sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
  
  // データを追加
  items.forEach(item => {
    sheet.appendRow([
      item.id,
      item.date,
      item.hall,
      item.block,
      item.number,
      item.circleName,
      item.productInfo,
      item.price,
      item.genre || '',
      item.isShutter || false,
      item.totalCount || 1,
      JSON.stringify(item.buyers || []),
      item.assignee || '',
      item.completed || false
    ]);
  });
  
  return { success: true, count: items.length };
}

/**
 * ランナー一覧を保存（全置換）
 */
function saveRunners(runners) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_RUNNERS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RUNNERS);
  }
  
  // 既存データをクリア
  sheet.clear();
  
  // ヘッダーを追加
  sheet.appendRow(['名前', 'カラーコード', '1日目配置', '2日目配置']);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  
  // データを追加
  runners.forEach(runner => {
    sheet.appendRow([
      runner.name,
      runner.color,
      runner.day1Hall || '',
      runner.day2Hall || ''
    ]);
  });
  
  return { success: true, count: runners.length };
}

/**
 * 個別アイテムの担当者と完了フラグを更新
 */
function updateItemAssignment(id, assignee, completed) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ITEMS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet not found' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 13).setValue(assignee || ''); // 担当者（13列目）
      if (completed !== undefined) {
        sheet.getRange(i + 1, 14).setValue(completed); // 完了フラグ（14列目）
      }
      return { success: true };
    }
  }
  
  return { success: false, error: 'Item not found' };
}

/**
 * アイテムを削除
 */
function deleteItem(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ITEMS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet not found' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Item not found' };
}

/**
 * ランナーを削除
 */
function deleteRunner(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RUNNERS);
  
  if (!sheet) {
    return { success: false, error: 'Sheet not found' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Runner not found' };
}

/**
 * テスト用関数
 */
function testGetAll() {
  const result = {
    items: getItems(),
    runners: getRunners()
  };
  Logger.log(JSON.stringify(result, null, 2));
}
