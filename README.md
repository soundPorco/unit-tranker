# ユニトラ（Unit Tracker）

大学生向けの履修・単位管理iOSアプリです。  
時間割管理、出席記録、課題管理、成績確認を一つのアプリで完結できるよう開発しました。

---

## アプリURL

https://apps.apple.com/jp/app/unittracker-%E5%A4%A7%E5%AD%A6%E7%94%9F%E5%90%91%E3%81%91%E6%88%90%E7%B8%BE%E7%AE%A1%E7%90%86%E3%82%A2%E3%83%97%E3%83%AA/id6763067483

---

## 開発背景

大学生活では、

- 科目ごとの出席状況の把握
- 課題の締切管理
- 単位取得状況の確認

などをバラバラなツール（メモ帳・カレンダー・シラバスなど）で管理しており、非常に煩雑でした。

これらを一元管理できるiOSアプリを自作することで、毎学期の手間を減らすことを目的として開発しました。

---

## 主な機能

- 時間割の登録・表示（グリッド形式）
- 講義ごとの出席記録（出席 / 欠席 / 遅刻 / 公欠）
- 課題の登録・提出状況管理
- 成績・単位の管理
- ログ機能（出席・課題の活動履歴）
- メールアドレス・パスワード認証

---

## 使用技術

### Frontend

- TypeScript
- React Native（Expo ~54）
- @react-navigation/native（BottomTabs + NativeStack）
- react-native-calendars

### Backend / BaaS

- Supabase Authentication
- Supabase Database（PostgreSQL + Row Level Security）

### その他

- expo-secure-store（認証トークンの永続化）
- expo-notifications

---

## アプリ画面

### 時間割画面

<img width="300" src="画像URL">

### 成績・単位画面

<img width="300" src="画像URL">

### 課題管理画面

<img width="300" src="画像URL">

---

## 工夫した点

### 時間割グリッドUI

曜日 × 時限のグリッドレイアウトを `TimetableGrid` コンポーネントとして実装しました。  
講義をタップするだけで詳細画面に遷移できるよう、直感的な操作性を意識しました。

---

### 出欠ステータスの細分化

出席管理では「出席 / 欠席 / 遅刻 / 公欠」の4ステータスを用意し、  
実際の大学の出席管理ルールに近い形で記録できるように設計しました。

---

### Supabase RLS によるデータ分離

Row Level Security（RLS）を活用し、ユーザーごとに講義・出席・課題データを完全に分離しました。  
他ユーザーのデータには一切アクセスできないセキュリティ設計になっています。

---

### 認証トークンの安全な永続化

`expo-secure-store` を使用して認証トークンをデバイスの安全な領域に保存し、  
アプリ再起動後もログイン状態が維持されるよう実装しました。

---

## 苦労した点

Supabase の RLS ポリシーの設定に苦労しました。  
テーブル間のリレーションやユーザーIDの参照方法によって意図通りのアクセス制御にならないケースが多く、  
ポリシーを何度も修正しながら正しく動作するよう調整しました。

また、React Native での複雑なグリッドレイアウト（時間割表示）は、  
Web と異なるスタイリングの制約があり、実装に工夫が必要でした。

---

## 今後の改善

- 課題締切の通知機能（expo-notifications を利用予定）
- Android 対応
- 単位数・GPA の自動集計・可視化
- ダークモード対応
- ウィジェット対応（今日の時間割を即確認）

---

## セットアップ

```bash
git clone https://github.com/soundPorco/unit-tranker.git

cd unit-tranker

npm install
```

`.env` ファイルを作成し、Supabase の接続情報を設定します。

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase のテーブルを作成します（SQL Editor で実行）。

```bash
# supabase_setup.sql を Supabase SQL Editor で実行
```

アプリを起動します。

```bash
npx expo start
```

---

## 制作期間

約○週間 / ○ヶ月

---

## 作者

GitHub: https://github.com/soundPorco
