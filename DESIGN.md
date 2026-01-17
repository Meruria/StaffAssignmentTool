# コミケ買い物リスト・担当割り振りツール - 詳細設計書

## 1. システム概要

### 1.1 プロジェクト名
コミケ買い物リスト・担当割り振りツール v1.0

### 1.2 目的
コミックマーケット（コミケ）での買い物リスト管理と、複数のランナー（購入担当者）への効率的な担当割り振りを支援するWebアプリケーション

### 1.3 主な機能
- Excelデータからの買い物リスト一括登録
- ランナーの登録・管理（カラーコード付き）
- 日別・ホール別の担当エリア設定
- 買い物アイテムの担当者割り振り
- Google Apps Scriptとの連携（データの読み込み・保存）
- ローカルストレージでのデータ永続化

## 2. 技術スタック

### 2.1 フロントエンド
- **フレームワーク**: Vue.js 3.3.4 (Composition API)
- **UIライブラリ**: Bootstrap 5.3.2
- **アイコン**: Font Awesome 6.4.2
- **データパース**: PapaParse 5.4.1 (TSV/CSV解析)

### 2.2 バックエンド連携
- Google Apps Script (JSONP通信)
- Google Spreadsheet (データストア)

### 2.3 データ永続化
- localStorage (ブラウザローカルストレージ)

## 3. アーキテクチャ

### 3.1 システム構成
```
┌─────────────────────────────────────────────┐
│         Webブラウザ (index.html)             │
│  ┌───────────────────────────────────────┐  │
│  │     Vue 3 Application                │  │
│  │  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Reactive     │  │ Computed     │  │  │
│  │  │ State        │  │ Properties   │  │  │
│  │  └──────────────┘  └──────────────┘  │  │
│  │  ┌──────────────────────────────────┐ │  │
│  │  │ Methods (Business Logic)         │ │  │
│  │  └──────────────────────────────────┘ │  │
│  └───────────────────────────────────────┘  │
│               ↕                              │
│  ┌───────────────────────────────────────┐  │
│  │      localStorage                     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                ↕ JSONP
┌─────────────────────────────────────────────┐
│   Google Apps Script (Code.gs)              │
│               ↕                              │
│   Google Spreadsheet                        │
│   - ItemMaster                              │
│   - RunnerMaster                            │
└─────────────────────────────────────────────┘
```

## 4. データモデル

### 4.1 Item（買い物アイテム）
```typescript
interface Item {
  id: string;              // UUID
  date: string;            // "1日目" | "2日目"
  hall: string;            // "東456" | "東78" | "西12" | "西34" | "南12" | "南34"
  block: string;           // ブロック（例: "ア"）
  number: string;          // 番号（例: "31ab"）
  circleName: string;      // サークル名
  productInfo: string;     // 商品情報
  price: number;           // 価格（円）
  genre: string;           // ジャンル
  isShutter: boolean;      // シャッター（優先）フラグ
  totalCount: number;      // 合計購入数
  buyers: Buyer[];         // 購入者リスト
  assignee: string;        // 担当者名
  completed: boolean;      // 完了フラグ
  selected: boolean;       // 選択フラグ（UI用）
}
```

### 4.2 Buyer（購入者）
```typescript
interface Buyer {
  name: string;            // 購入者名
  count: number;           // 購入数
}
```

### 4.3 Runner（ランナー/担当者）
```typescript
interface Runner {
  name: string;            // ランナー名
  color: string;           // カラーコード（例: "#FF6B6B"）
  day1Hall: string;        // 1日目の担当ホール
  day2Hall: string;        // 2日目の担当ホール
}
```

### 4.4 HallInfo（ホール情報）
```typescript
interface HallInfo {
  hall: string;            // ホール名
  count: number;           // サークル数
  runners: string[];       // 担当ランナーのリスト
}
```

## 5. 画面設計

### 5.1 画面構成
アプリケーションは3つのタブで構成される：

#### 5.1.1 データ登録・設定タブ (`currentTab === 'import'`)
**機能:**
- Excelからのデータ一括登録
- 登録済みリストの表示・削除
- ランナーの追加・編集・削除

**主要コンポーネント:**
- 貼り付けテキストエリア
- 登録済みリスト（日付・ホール別グループ表示）
- ランナー設定パネル（ドラッグ&ドロップで並び替え可能）

#### 5.1.2 全体マップタブ (`currentTab === 'plan'`)
**機能:**
- ランナーの日別担当エリア設定
- 日別・ホール別のサークル数表示
- 担当者の視覚的な配置確認

**主要コンポーネント:**
- 担当エリア設定テーブル
- 1日目/2日目のエリア別サマリカード

#### 5.1.3 詳細割り振りタブ (`currentTab === 'assign'`)
**機能:**
- 各アイテムへの担当者割り当て
- フィルタリング（日付・ホール別）
- 一括割り当て機能
- 完了管理

**主要コンポーネント:**
- フィルタボタン群
- サマリ情報（表示数・未割当数・合計金額）
- アイテム一覧テーブル
- ランナー統計サイドバー

### 5.2 共通UI要素

#### 5.2.1 ナビゲーションバー
- アプリケーションタイトル
- データ統計バッジ（アイテム数・ランナー数）
- 読込ボタン（GASから読み込み）
- 保存ボタン（GASへ保存）
- 設定ボタン

#### 5.2.2 設定モーダル
- GAS URL設定
- ホールオプション設定（改行区切り）

#### 5.2.3 ホール選択モーダル
- ランナーの担当ホール選択用
- ホール別のアイテム件数表示

#### 5.2.4 トースト通知
- 成功・エラー・警告メッセージの表示
- 自動消滅（3秒後）

#### 5.2.5 ローディングオーバーレイ
- データ読み込み・保存時の表示
- スピナー + メッセージ

## 6. スタイル設計

### 6.1 カラーパレット

#### 6.1.1 メインカラー
```css
--primary-color: #6366f1;      /* インディゴブルー */
--secondary-color: #4f46e5;    /* ダークインディゴ */
```

#### 6.1.2 ホール別カラー
```css
/* 東456 */ 
背景: #fee2e2 (赤系淡色)
テキスト: #dc2626 (赤)
バッジ: bg-danger

/* 東78 */
背景: #fef3c7 (黄系淡色)
テキスト: #d97706 (オレンジ)
バッジ: bg-warning

/* 西12 */
背景: #d1fae5 (緑系淡色)
テキスト: #059669 (緑)
バッジ: bg-success

/* 西34 */
背景: #dbeafe (青系淡色)
テキスト: #2563eb (青)
バッジ: bg-primary

/* 南12 */
背景: #e9d5ff (紫系淡色)
テキスト: #7c3aed (紫)
バッジ: bg-info

/* 南34 */
背景: #fce7f3 (ピンク系淡色)
テキスト: #db2777 (ピンク)
バッジ: bg-secondary
```

#### 6.1.3 ランナーカラーパレット（30色）
```javascript
[
  '#FF6B6B', '#FF8C8C', '#FFB3B3',  // レッド系
  '#FF6B35', '#FF8C5A', '#FFB380',  // オレンジ系
  '#FFA500', '#FFB84D', '#FFCC99',  // ゴールド系
  '#FFD93D', '#FFE066', '#FFEB99',  // イエロー系
  '#6BCB77', '#85DD9A', '#A8E6CF',  // グリーン系
  '#4D96FF', '#7CB9FF', '#A8D8FF',  // ブルー系
  '#6B5B95', '#9B7FB8', '#B8A8DB',  // パープル系
  '#FF69B4', '#FF88CC', '#FFB3DB',  // ピンク系
  '#00BCD4', '#4DD0E1', '#80DEEA',  // シアン系
  '#9C27B0', '#BA68C8', '#CE93D8'   // バイオレット系
]
```

### 6.2 主要CSSクラス

#### 6.2.1 レイアウト
- `.card`: カードコンテナ（シャドウ、角丸）
- `.nav-tabs .nav-link.active`: アクティブタブ（下線強調）
- `.runner-badge`: ランナーバッジ（角丸、カラー背景）

#### 6.2.2 テーブル
- `.table`: ストライプテーブル
- `.item-row`: アイテム行（ホバー効果）
- `.item-row.completed`: 完了アイテム（半透明、取り消し線）
- `.sticky-top`: 固定ヘッダー

#### 6.2.3 インタラクティブ要素
- `.assignee-select`: 担当者選択セレクトボックス
- `.hall-filter-btn.active`: アクティブフィルタボタン（シャドウ）
- `.loading-overlay`: ローディングオーバーレイ

## 7. 状態管理

### 7.1 Reactive State（ref）

#### 7.1.1 UI状態
```javascript
currentTab: 'import' | 'plan' | 'assign'  // 現在のタブ
isLoading: boolean                         // ローディング状態
loadingMessage: string                     // ローディングメッセージ
showSettings: boolean                      // 設定モーダル表示
showHallModal: boolean                     // ホール選択モーダル表示
showColorPalette: boolean                  // カラーパレット表示
editingRunnerColor: string | null          // 編集中のランナー名
draggedRunnerIndex: number                 // ドラッグ中のランナーインデックス
dragoverRunnerIndex: number                // ドラッグオーバーインデックス
toasts: Toast[]                            // トースト通知リスト
```

#### 7.1.2 設定
```javascript
gasUrl: string                             // GAS WebアプリURL
hallOptionsText: string                    // ホールオプション（改行区切り）
```

#### 7.1.3 データ
```javascript
items: Item[]                              // 買い物アイテムリスト
runners: Runner[]                          // ランナーリスト
pasteData: string                          // 貼り付けデータ
```

#### 7.1.4 入力状態
```javascript
newRunnerName: string                      // 新規ランナー名
newRunnerColor: string                     // 新規ランナーカラー
currentFilter: string                      // ホールフィルタ
dateFilter: string                         // 日付フィルタ
selectAll: boolean                         // 全選択チェック
bulkAssignee: string                       // 一括割り当て先
```

#### 7.1.5 モーダル状態
```javascript
hallModalRunner: Runner | null             // ホール選択対象ランナー
hallModalDay: 1 | 2                        // ホール選択対象日
```

### 7.2 Computed Properties

#### 7.2.1 フィルタ・集計系
```javascript
hallOptions: string[]                      // ホールオプション配列
uniqueHalls: string[]                      // アイテム内のユニークホール
uniqueDates: string[]                      // アイテム内のユニーク日付
filteredItems: Item[]                      // フィルタ後のアイテム
selectedItems: Item[]                      // 選択中のアイテム
unassignedCount: number                    // 未割当アイテム数
totalPrice: number                         // 合計金額
hallCounts: Record<string, number>         // ホール別アイテム数
```

#### 7.2.2 日別・ホール別集計
```javascript
hallCountsByDay: {
  '1日目': Record<string, { count: number, runners: string[] }>,
  '2日目': Record<string, { count: number, runners: string[] }>
}

day1Halls: HallInfo[]                      // 1日目ホール情報配列
day2Halls: HallInfo[]                      // 2日目ホール情報配列
```

#### 7.2.3 グルーピング
```javascript
groupedItems: Array<{
  date: string,
  hall: string,
  items: Item[]
}>                                         // 日付・ホール別グループ
```

## 8. メソッド一覧

### 8.1 ユーティリティ

#### 8.1.1 UUID生成
```javascript
generateUUID(): string
```

#### 8.1.2 トースト通知
```javascript
showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info'): void
removeToast(id: number): void
```

#### 8.1.3 フォーマット
```javascript
formatPrice(price: number): string         // "¥1,000"形式
truncateText(text: string, maxLength: number): string
getContrastColor(hexcolor: string): string // 背景色から読みやすい文字色を算出
```

### 8.2 スタイル取得

```javascript
getRowStyle(item: Item): CSSProperties     // アイテム行の背景色
getHallClass(hall: string): string         // ホールCSSクラス
getHallBadgeClass(hall: string): string    // ホールバッジクラス
getHallTextClass(hall: string): string     // ホールテキストクラス
getRunnerColor(name: string): string       // ランナーのカラー取得
```

### 8.3 ランナー管理

```javascript
addRunner(): void                          // ランナー追加
deleteRunner(name: string): void           // ランナー削除
toggleRunnerColorPalette(runnerName: string): void
startDragRunner(index: number): void       // ドラッグ開始
dropRunner(dropIndex: number): void        // ドロップ処理
getRunnerStats(name: string): {            // ランナー統計
  count: number,
  total: number
}
```

### 8.4 ホール管理

```javascript
openHallSelectModal(runner: Runner, day: 1 | 2): void
selectHall(hall: string): void
getHallItemCount(day: number, hall: string): number
```

### 8.5 アイテム管理

```javascript
parseData(): void                          // TSVデータ解析・登録
deleteItem(id: string): void               // アイテム削除
clearAllItems(): void                      // 全アイテム削除
toggleSelectAll(): void                    // 全選択切り替え
bulkAssign(): void                         // 一括割り当て
clearSelection(): void                     // 選択解除
```

### 8.6 データ永続化

#### 8.6.1 ローカルストレージ
```javascript
saveToLocalStorage(): void
loadFromLocalStorage(): void
```

#### 8.6.2 設定
```javascript
saveSettings(): void
```

#### 8.6.3 Google Apps Script連携
```javascript
loadFromSheet(): Promise<void>             // JSONP通信でデータ取得
saveToSheet(): Promise<void>               // POST通信でデータ保存
```

### 8.7 タブ管理

```javascript
switchTab(tabName: 'import' | 'plan' | 'assign'): void
```

## 9. データフロー

### 9.1 データ登録フロー
```
1. ユーザーがExcelデータを貼り付け
2. parseData()が実行
3. PapaParse でTSV解析
4. セクションヘッダー検出（日付・ホール）
5. データ行をItemオブジェクトに変換
6. items配列に追加
7. saveToLocalStorage()で永続化
```

### 9.2 GAS連携フロー

#### 9.2.1 読み込み
```
1. loadFromSheet()実行
2. JSONP通信開始（CORS回避）
3. GAS からJSON形式でデータ取得
4. items, runnersに展開
5. saveToLocalStorage()でバックアップ
6. nextTick()でタブ切り替え
```

#### 9.2.2 保存
```
1. saveToSheet()実行
2. JSONデータを作成
3. POST通信でGASへ送信
4. GAS がスプレッドシートへ保存
```

### 9.3 リアクティビティフロー
```
items/runners変更
  ↓
watch発火（500msデバウンス）
  ↓
saveToLocalStorage()
  ↓
localStorage更新
```

## 10. TSVデータ解析仕様

### 10.1 入力フォーマット
```
火曜日	1日目	東456
担当	シャッタ	番号	サークル名	合計	紅	満	伊	ジャンル	新作/新刊情報
	シャ	ア31ab	サークルA		1			ジャンルA	新刊セット3000円+ノベルティ3000円
		イ25a	サークルB	1	1			ジャンルB	Vanilla Edge 500円
```

### 10.2 解析ルール

#### 10.2.1 セクションヘッダー検出
- 第1列が曜日（月〜日）で始まる行
- 第3列が日付（例: "1日目"）
- 第4列がホール（例: "東456"）

#### 10.2.2 ヘッダー行スキップ
- 第1列が"担当"または第3列が"番号"の行

#### 10.2.3 データ行解析
- **番号**: ブロック（カタカナ/英字）+ 番号部分に分割
- **価格**: 商品情報から`〇〇円`パターンを抽出
- **シャッター**: 第2列が"シャ"ならtrue
- **購入者**: 第6-8列（紅、満、伊）の数値を抽出

## 11. エラーハンドリング

### 11.1 データ検証
- ランナー名の重複チェック
- 必須項目のチェック（サークル名、番号）
- GAS URL未設定チェック

### 11.2 通信エラー
- JSONP タイムアウト（10秒）
- POST通信失敗
- エラーメッセージをトースト表示

### 11.3 データ復旧
- localStorageからの読み込みエラー時は空配列に初期化
- JSON parse エラー時のログ出力

## 12. パフォーマンス最適化

### 12.1 Computed Properties
- フィルタリング・集計処理をcomputedで実装（キャッシュ機能）
- 配列変換処理も computed化（day1Halls, day2Halls）

### 12.2 デバウンス
- watch による自動保存に500msのデバウンス
- 頻繁な保存を抑制

### 12.3 nextTick活用
- DOM更新後の処理にnextTick使用
- タブ切り替え時のレンダリング保証

## 13. セキュリティ考慮事項

### 13.1 データ保存
- localStorage使用（同一オリジンのみアクセス可）
- GASへの通信はHTTPS

### 13.2 XSS対策
- Vueのテンプレートエスケープ機能を活用
- ユーザー入力は全てVueにバインド

### 13.3 CORS対策
- 読み込みはJSONP使用
- 保存はGAS側でCORS設定

## 14. ブラウザ互換性

### 14.1 対応ブラウザ
- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）

### 14.2 必要機能
- ES6+ サポート
- localStorage サポート
- Fetch API サポート

## 15. 今後の拡張可能性

### 15.1 機能追加案
- PDF/Excelエクスポート
- 地図表示（会場マップ連携）
- リアルタイム同期（複数ユーザー）
- 購入履歴管理
- 予算管理機能

### 15.2 技術的改善
- TypeScript化
- ビルドツール導入（Vite等）
- コンポーネント分割
- テストコード追加
- PWA化（オフライン対応）

## 16. バージョン履歴

### v1.0 (2026-01-18)
- 初期リリース
- 基本機能実装
  - データ登録
  - ランナー管理
  - 担当割り振り
  - GAS連携
  - localStorage永続化
- Vue 3 Composition API採用
- Bootstrap 5 UIフレームワーク

---

**作成日**: 2026年1月18日  
**更新日**: 2026年1月18日  
**バージョン**: 1.0  
**作成者**: Meruria
