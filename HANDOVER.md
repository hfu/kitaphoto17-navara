# HANDOVER

現在の状態のスナップショット。詳しい経緯・根拠は[DECISIONS.md](DECISIONS.md)を参照。

## 状態

- kitaphoto17は`https://hfu.github.io/kitaphoto17-navara/`で表示成功を確認済み
- 地図中心を北海道駒ヶ岳に変更、カーソル中心ズーム(D9独自実装—番号注意、
  ズーム機能自体はD8/D9の地形議論より前に実装済み)、URLハッシュへのカメラ
  位置同期、左上の折りたたみ可能な"Welcome to Hokkaido, Navara!"パネルを
  実装済み
- Mapterhorn地形は試したが、GitHub Pages上でNavaraのwasm worker poolが
  安定して起動できず(D8)、coi-serviceworkerでの回避も実ブラウザ(Brave)で
  クラッシュを再現したため撤去(D9)。**このリポジトリのスコープでは地形は
  提供しない**
- 撤去に伴い、既存訪問者に残るcoi-serviceworkerの登録を解除する後方互換
  コードを`main.ts`冒頭に追加した
- 直近の変更(地形撤去、coi-serviceworker撤去とクリーンアップ)は
  **ローカルのみ、まだcommit/pushしていない**

## 次にやること

1. `npm run build` → commit → push
2. 実GitHub Pagesで平面表示(kitaphoto17 + カーソルズーム + ハッシュ同期 +
   パネル)が安定して動くか最終確認する。特にBraveなど、以前
   coi-serviceworkerを登録してしまったブラウザでService Worker解除が
   正しく効くか確認する
3. ある程度固まったら、hfuさんの意向でunopengis/7にこの一連の知見
   (地形×GitHub Pages×COOP/COEPの制約、coi-serviceworkerでも解決しない
   こと)を軽くissue報告する

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見を共有済み。cafebabe側は
  `patterns/large-data-pitfalls.md`に反映しpush済み。
