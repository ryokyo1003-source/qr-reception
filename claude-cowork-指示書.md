# LINE デジタル診察券 — Claude Cowork セットアップ指示書

> この指示書は Claude Cowork（ブラウザ操作可能なAI）に渡して、
> LINE デジタル診察券システムのセットアップ作業を実行してもらうためのものです。

---

## 前提条件（事前にユーザーが行うこと）

以下のページに **ログイン済みの状態** でブラウザを開いてください:

1. **LINE Developers Console**: https://developers.line.biz/console/
2. **Google Apps Script**: https://script.google.com/
3. **GitHub**: https://github.com/ （ryokyo1003-source アカウント）

---

## Task 1: LINE Developers — プロバイダー & LIFF チャネル作成

### ゴール
LINE Login チャネルと LIFF アプリを作成し、LIFF ID を取得する。

### 手順

1. https://developers.line.biz/console/ を開く
2. 「プロバイダー」がまだ無ければ「作成」をクリック
   - プロバイダー名: `上桂動物病院`
3. プロバイダーの中で「チャネルを作成」→「LINE Login」を選択
   - チャネル名: `デジタル診察券`
   - チャネル説明: `上桂動物病院のLINEデジタル診察券`
   - アプリタイプ: 「ウェブアプリ」にチェック
   - メールアドレス: 表示されているアカウントのメールをそのまま使用
   - プライバシーポリシーURL・利用規約URL: 空欄のまま
4. チャネルが作成されたら「LIFF」タブをクリック
5. 「追加」ボタンをクリックして LIFF アプリを作成:
   - LIFFアプリ名: `デジタル診察券`
   - サイズ: `Full`
   - エンドポイントURL: `https://ryokyo1003-source.github.io/qr-reception/liff/`
   - Scope: `profile` にチェック（他はチェック不要）
   - ボットリンク機能: `Off`
   - Scan QR: `Off`
6. 作成後に表示される **LIFF ID**（`1234567890-xxxxxxxx` 形式）をメモする

### 完了条件
- LIFF ID が取得できていること
- ユーザーに LIFF ID を伝えること

---

## Task 2: GAS バックエンド — LINE 連携コードの追加

### ゴール
既存の受付システム GAS プロジェクトに LINE 連携用のコードを追加し、再デプロイする。

### 手順

1. https://script.google.com/ を開く
2. 既存の受付システムプロジェクトを探して開く
   - プロジェクト名に「受付」「QR」などが含まれる可能性がある
   - GAS URL が `AKfycbwtvien_xsRR8fZQJLv-5cxvpDFTRPN2c6j2YcxFYv99IZbXUGcb1Pxm8TbsBB4ssqM` を含むプロジェクト
3. プロジェクトを開いたら、左のファイル一覧の「+」→「スクリプト」をクリック
   - ファイル名: `LineCode`
4. 以下のコードを **そのまま** 貼り付ける:

> **最新コード**は `gas/LineCode.gs` を参照（動物種類・電話番号・同姓同名検索を追加）。
> `gas/LineCode.gs` の全内容をコピペしてください。

5. 次に、既存のメインファイル（`Code.gs` や `コード.gs`）を開く
6. `doPost` 関数を探し、action の分岐処理（switch文 or if文）に以下を追加:

```javascript
// ─── LINE連携アクション（追加分）───
if (action === 'lineRegister') return lineRegister(params);
if (action === 'lineGetMe')    return lineGetMe(params);
if (action === 'lineDelete')   return lineDelete(params);
if (action === 'lineSearch')   return lineSearch(params);  // 同姓同名検索（任意）
```

> **注意**: 既存の doPost の構造（switch文かif文か）に合わせて追記すること。
> params の取得方法も既存コードに合わせる（`e.parameter` を使っている場合が多い）。

7. 保存（Ctrl+S）
8. 「デプロイ」→「新しいデプロイ」をクリック
   - 種類: 「ウェブアプリ」を選択
   - 説明: `LINE連携追加`
   - 実行するユーザー: `自分`
   - アクセスできるユーザー: `全員`
9. 「デプロイ」ボタンをクリック
10. **新しいデプロイURL** が表示されるのでメモする

### 完了条件
- LineCode ファイルが追加されていること
- doPost に LINE アクションが追記されていること
- 新しいデプロイが完了していること

### 重要な注意
- **既存の受付機能を絶対に壊さないこと**。既存コードの修正は最小限（doPostへの3行追加のみ）
- デプロイURL が変わった場合は、受付アプリの設定画面で新URLに更新が必要

---

## Task 3: LIFF アプリ — LIFF ID 設定 & GitHub デプロイ

### ゴール
LIFF アプリに LIFF ID を設定し、GitHub Pages で公開する。

### 手順

1. ローカルのファイルを編集:
   - パス: `Google Drive/マイドライブ/05_QRコード自動受付システム/liff/index.html`
   - 探す箇所: `LIFF_ID: 'YOUR_LIFF_ID_HERE'`
   - 変更: `'YOUR_LIFF_ID_HERE'` を Task 1 で取得した LIFF ID に置換

2. GAS URL の確認:
   - 同ファイル内の `GAS_URL` が正しいか確認
   - Task 2 でデプロイURLが変わった場合は新URLに更新

3. GitHub にプッシュ:
```bash
cd "Google Drive/マイドライブ/05_QRコード自動受付システム"
git add liff/
git commit -m "feat: add LIFF digital patient card app"
git push origin main
```

4. GitHub Pages の有効化（まだの場合）:
   - https://github.com/ryokyo1003-source/qr-reception/settings/pages を開く
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
   - 「Save」をクリック

5. デプロイ確認:
   - https://ryokyo1003-source.github.io/qr-reception/liff/ にアクセス
   - ページが表示されること（LINEアプリ外ではエラー画面が正常）

### 完了条件
- LIFF ID が設定されていること
- GitHub Pages でアクセスできること

---

## Task 4: LINE 公式アカウント — リッチメニュー設定

### ゴール
LINE公式アカウントのリッチメニューに「診察券」ボタンを追加する。

### 手順

1. LINE Official Account Manager を開く:
   - https://manager.line.biz/
2. 上桂動物病院のアカウントを選択
3. 左メニュー → 「リッチメニュー」
4. 既存のリッチメニューを編集（または新規作成）
5. ボタンの1つに「診察券」を設定:
   - アクション: `リンク`
   - URL: `https://liff.line.me/{Task1で取得したLIFF_ID}`
   - ラベル: `診察券`
6. 保存して公開

### 完了条件
- リッチメニューに「診察券」ボタンがあること
- タップすると LIFF アプリが開くこと

---

## Task 5: Chrome 拡張の更新

### ゴール
既存の「ペトレル→ハロペ 受付連携」Chrome拡張を v1.2.0 に更新する。

### 手順

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」がONになっていることを確認
3. 「ペトレル→ハロペ 受付連携」拡張を見つける
4. 「読み込み直す」（更新アイコン）をクリック
5. バージョンが `1.2.0` になっていることを確認

> ファイルは既に更新済みです:
> - `background.js`: GAS 15秒ポーリング + ペトレル来院自動設定
> - `petorelu-content.js`: SET_ARRIVED ハンドラ追加
> - `manifest.json`: v1.2.0 + GAS URLパーミッション

### 完了条件
- 拡張がv1.2.0で読み込まれていること
- ポップアップに「稼働中」と表示されること

---

## 制約事項（Claude Cowork への注意）

1. **パスワード・認証情報は絶対に入力しないこと** — ログインはユーザーが事前に行う
2. **既存コードの削除・上書きをしないこと** — 追記のみ
3. **課金が発生する操作をしないこと** — LINE/Google の有料プランへの変更等
4. **各 Task 完了時に結果をユーザーに報告すること** — 特に LIFF ID と新しいデプロイURL
5. **不明な点があれば必ずユーザーに確認すること** — 推測で操作しない
