# 開発ドキュメント - JST時間統一と募集フォーム分離

## 概要

社内用webアプリ「食堂メシ友マッチング」に以下の2つの機能修正を実装しました：

1. **日本時間（JST）への統一**: 全ての日時処理を日本時間（JST: UTC+9）に統一
2. **募集作成フォームの分離**: 単一のテキストエリアを4つの独立した入力欄に分離

## 実装内容

### 1. 日本時間（JST）への統一

#### バックエンド修正

**ファイル**: `backend/app/main.py`

**変更内容**:
- `pytz`ライブラリを追加してタイムゾーン処理を実装
- `get_jst_now()`関数を追加してJST時間を取得
- 全ての`datetime.now().isoformat()`を`get_jst_now().isoformat()`に変更

**修正箇所**:
1. **インポート文の追加**:
   ```python
   import pytz
   
   def get_jst_now():
       """Get current datetime in Japan Standard Time (JST)"""
       jst = pytz.timezone('Asia/Tokyo')
       return datetime.now(jst)
   ```

2. **募集作成時の日時** (line 215):
   ```python
   "created_at": get_jst_now().isoformat(),
   ```

3. **チャットメッセージのタイムスタンプ** (line 286):
   ```python
   "timestamp": get_jst_now().isoformat()
   ```

4. **既読マーク時の日時** (line 358):
   ```python
   user_last_read_db[current_user][meetup_id] = get_jst_now().isoformat()
   ```

#### フロントエンド修正

**ファイル**: `frontend/src/App.tsx`

**変更内容**:
- `date-fns`ライブラリを使用してJST表示を明確化
- 全ての日時表示に「(JST)」を追加

**修正箇所**:
1. **インポート文の追加**:
   ```typescript
   import { format, parseISO } from 'date-fns'
   import { ja } from 'date-fns/locale'
   ```

2. **募集の希望日時表示** (line 558):
   ```typescript
   <span>{format(parseISO(meetup.datetime), 'yyyy年MM月dd日 HH:mm (JST)', { locale: ja })}</span>
   ```

3. **募集の作成日時表示** (line 578):
   ```typescript
   {format(parseISO(meetup.created_at), 'yyyy年MM月dd日 HH:mm (JST)', { locale: ja })}
   ```

4. **チャットメッセージのタイムスタンプ** (line 635):
   ```typescript
   {format(parseISO(msg.timestamp), 'yyyy年MM月dd日 HH:mm (JST)', { locale: ja })}
   ```

### 2. 募集作成フォームの分離

#### バックエンド修正

**ファイル**: `backend/app/main.py`

**変更内容**:
- `MeetupCreate`モデルに新しいフィールドを追加
- 新旧両方のデータ形式をサポートするハイブリッド実装

**修正箇所**:
1. **データモデルの拡張** (lines 40-46):
   ```python
   class MeetupCreate(BaseModel):
       content: str
       datetime: Optional[str] = None
       food_item: Optional[str] = None
       budget: Optional[str] = None
       location: Optional[str] = None
       structured_datetime: Optional[str] = None
   ```

2. **募集作成処理の更新** (lines 198-240):
   - 新しい構造化フィールドが提供された場合は構造化データを直接作成
   - 従来のcontentフィールドのみの場合は既存の抽出ロジックを使用
   - 後方互換性を維持

#### フロントエンド修正

**ファイル**: `frontend/src/App.tsx`

**変更内容**:
- 新しい状態変数を追加
- フォームUIを4つの独立した入力欄に分離
- 送信データに構造化フィールドを追加

**修正箇所**:
1. **状態変数の追加** (lines 54-56):
   ```typescript
   const [newMeetupFoodItem, setNewMeetupFoodItem] = useState('')
   const [newMeetupBudget, setNewMeetupBudget] = useState('')
   const [newMeetupLocation, setNewMeetupLocation] = useState('')
   ```

2. **フォームUIの分離** (lines 447-490):
   - 「食べたいもの！」: テキスト入力欄
   - 「予算」: セレクトボックス（〜1,000円、〜3,000円、〜5,000円、5,000円〜）
   - 「場所」: テキスト入力欄
   - 「希望日時」: datetime-local入力欄

3. **送信データの更新** (lines 163-170):
   ```typescript
   body: JSON.stringify({
     content: newMeetupContent || `${newMeetupFoodItem} ${newMeetupBudget} ${newMeetupLocation}`,
     datetime: newMeetupDateTime || undefined,
     food_item: newMeetupFoodItem,
     budget: newMeetupBudget,
     location: newMeetupLocation,
     structured_datetime: newMeetupDateTime
   })
   ```

4. **状態リセット処理の更新** (lines 170-176):
   ```typescript
   setNewMeetupContent('')
   setNewMeetupDateTime('')
   setNewMeetupFoodItem('')
   setNewMeetupBudget('')
   setNewMeetupLocation('')
   ```

## 技術的詳細

### 依存関係の追加

**バックエンド**:
- `pytz`: Python timezone library for JST handling

**フロントエンド**:
- `date-fns`: 既存ライブラリを活用してJST表示を実装

### 後方互換性

- 既存の募集データは引き続き正常に表示される
- 新旧両方のデータ形式をサポート
- 既存の`extract_structured_data`関数を活用

### データフロー

1. **新しい構造化フォーム**:
   - フロントエンド → 構造化フィールド → バックエンド → 直接構造化データ作成

2. **従来のフリーテキスト**:
   - フロントエンド → contentフィールド → バックエンド → extract_structured_data関数 → 構造化データ

## テスト項目

### 機能テスト
- [ ] 新しい構造化フォームでの募集作成
- [ ] 既存データの表示確認
- [ ] JST時間表示の確認
- [ ] 日時処理の正確性確認
- [ ] チャット機能の日時表示
- [ ] 参加機能の動作確認

### 互換性テスト
- [ ] 既存募集データの正常表示
- [ ] 新旧データ形式の混在環境での動作
- [ ] APIレスポンスの一貫性

## 変更理由

### JST時間統一
- **問題**: タイムゾーン指定なしでの日時処理により、意図しない時間での表示・保存
- **解決**: pytzライブラリを使用してJST（Asia/Tokyo）に統一
- **効果**: 日本のユーザーにとって直感的で一貫した時間表示

### フォーム分離
- **問題**: 単一テキストエリアでの自由入力により、情報の構造化が困難
- **解決**: 4つの独立した入力欄に分離（食べたいもの、予算、場所、希望日時）
- **効果**: ユーザーの入力しやすさ向上、データの構造化促進

## 実装方法

### 段階的実装
1. バックエンドのタイムゾーン処理実装
2. フロントエンドの日時表示更新
3. バックエンドの構造化データ処理追加
4. フロントエンドのフォーム分離実装
5. 統合テスト実行

### 品質保証
- 既存コードパターンの踏襲
- エラーハンドリングの維持
- UI/UXの一貫性保持
- 後方互換性の確保

## 今後の改善点

### 機能拡張
- 場所の自動補完機能
- 予算範囲の詳細設定
- 食べ物カテゴリの拡充
- 時間帯の推奨機能

### 技術改善
- タイムゾーン設定のユーザーカスタマイズ
- データベース移行スクリプトの作成
- 単体テストの追加
- パフォーマンス最適化

## 結論

本実装により、アプリケーションの日時処理が日本時間に統一され、募集作成フォームがより使いやすい構造化された形式に改善されました。既存データとの互換性を保ちながら、新機能を段階的に導入することで、ユーザー体験の向上を実現しています。
