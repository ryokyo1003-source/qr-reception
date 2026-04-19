/**
 * LINE デジタル診察券 — GAS バックエンド追加分
 *
 * 【セットアップ手順】
 * 1. 既存の受付システムGASプロジェクトを開く
 * 2. このファイルの内容を新しいスクリプトファイル（LineCode.gs）として追加
 * 3. 既存の doPost() に LINE用アクションのルーティングを追加（下記参照）
 * 4. ウェブアプリとして再デプロイ（新しいバージョン）
 *
 * 【既存 doPost() への追記例】
 *   case 'lineRegister': return lineRegister(params);
 *   case 'lineGetMe':    return lineGetMe(params);
 *   case 'lineDelete':   return lineDelete(params);
 *
 * 【シート構成】
 *   A: line_user_id
 *   B: karte_number
 *   C: owner_name
 *   D: pet_name
 *   E: species       ← 動物種類
 *   F: phone         ← 電話番号
 *   G: created_at
 *
 * 既存シート（E列=created_at の5列版）がある場合、lineRegister/lineGetMe 呼び出し時に
 * 自動でヘッダを拡張します（既存データは保持）。
 */

// ─── シート管理 ────────────────────────────────────────────────
function getLineUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('LINE_users');
  if (!sheet) {
    sheet = ss.insertSheet('LINE_users');
    sheet.appendRow([
      'line_user_id', 'karte_number', 'owner_name', 'pet_name',
      'species', 'phone', 'created_at'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:G1').setFontWeight('bold');
    return sheet;
  }

  // ─── 旧スキーマ（5列版）のマイグレーション ─────────────
  // 旧: line_user_id | karte_number | owner_name | pet_name | created_at
  // 新: ... | pet_name | species | phone | created_at
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
  if (header[4] === 'created_at' && header.length < 7) {
    // E列(created_at) を G列に移動、E/F に species/phone を挿入
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var oldCreatedAt = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
      sheet.getRange(2, 5, lastRow - 1, 1).clearContent();
      sheet.getRange(2, 7, lastRow - 1, 1).setValues(oldCreatedAt);
    }
    sheet.getRange(1, 5).setValue('species');
    sheet.getRange(1, 6).setValue('phone');
    sheet.getRange(1, 7).setValue('created_at');
    sheet.getRange('A1:G1').setFontWeight('bold');
  }
  return sheet;
}

// ─── LINE ユーザー登録 ─────────────────────────────────────────
function lineRegister(params) {
  var lineUserId   = (params.line_user_id   || '').toString().trim();
  var karteNumber  = (params.karte_number   || '').toString().trim();
  var ownerName    = (params.owner_name     || '').toString().trim();
  var petName      = (params.pet_name       || '').toString().trim();
  var species      = (params.species        || '').toString().trim();
  var phone        = (params.phone          || '').toString().trim();

  if (!lineUserId || !karteNumber || !ownerName || !petName) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400);
  }

  var sheet = getLineUsersSheet();
  var data = sheet.getDataRange().getValues();

  // 同じ line_user_id + karte_number の組み合わせが既に存在するか
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === lineUserId && data[i][1] === karteNumber) {
      // 既存レコードを更新
      sheet.getRange(i + 1, 3).setValue(ownerName);
      sheet.getRange(i + 1, 4).setValue(petName);
      sheet.getRange(i + 1, 5).setValue(species);
      sheet.getRange(i + 1, 6).setValue(phone);
      return jsonResponse({ success: true, action: 'updated' });
    }
  }

  // 新規登録
  sheet.appendRow([
    lineUserId,
    karteNumber,
    ownerName,
    petName,
    species,
    phone,
    new Date().toISOString()
  ]);

  return jsonResponse({ success: true, action: 'created' });
}

// ─── LINE ユーザー情報取得 ─────────────────────────────────────
function lineGetMe(params) {
  var lineUserId = (params.line_user_id || '').toString().trim();
  if (!lineUserId) {
    return jsonResponse({ error: 'line_user_id が必要です' }, 400);
  }

  var sheet = getLineUsersSheet();
  var data = sheet.getDataRange().getValues();
  var pets = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === lineUserId) {
      pets.push({
        karte_number: data[i][1],
        owner_name:   data[i][2],
        pet_name:     data[i][3],
        species:      data[i][4] || '',
        phone:        data[i][5] || '',
        created_at:   data[i][6] || ''
      });
    }
  }

  if (pets.length === 0) {
    return jsonResponse({ registered: false, pets: [] });
  }

  return jsonResponse({ registered: true, pets: pets });
}

// ─── LINE ユーザー削除（ペット単位） ──────────────────────────
function lineDelete(params) {
  var lineUserId  = (params.line_user_id  || '').toString().trim();
  var karteNumber = (params.karte_number  || '').toString().trim();

  if (!lineUserId || !karteNumber) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400);
  }

  var sheet = getLineUsersSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === lineUserId && data[i][1] === karteNumber) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ error: '該当レコードが見つかりません' }, 404);
}

// ─── 同姓同名検索（受付端末用 — 任意） ────────────────────────
// 電話番号の末尾4桁で絞り込めるようにした検索API。
// doPost に `case 'lineSearch': return lineSearch(params);` を追加すれば利用可。
function lineSearch(params) {
  var q        = (params.q || '').toString().trim();  // 氏名 or ペット名
  var phone4   = (params.phone4 || '').toString().replace(/\D/g, '').slice(-4);

  var sheet = getLineUsersSheet();
  var data = sheet.getDataRange().getValues();
  var hits = [];

  for (var i = 1; i < data.length; i++) {
    var row = {
      karte_number: data[i][1],
      owner_name:   data[i][2],
      pet_name:     data[i][3],
      species:      data[i][4] || '',
      phone:        data[i][5] || ''
    };
    var phoneDigits = (row.phone || '').replace(/\D/g, '');
    var matchQ     = !q || (row.owner_name.indexOf(q) >= 0) || (row.pet_name.indexOf(q) >= 0);
    var matchPhone = !phone4 || phoneDigits.slice(-4) === phone4;
    if (matchQ && matchPhone) hits.push(row);
  }

  return jsonResponse({ hits: hits });
}

// ─── JSON レスポンスヘルパー ───────────────────────────────────
function jsonResponse(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
