# HANDOVER

現在の状態のスナップショット。詳しい経緯・根拠は[DECISIONS.md](DECISIONS.md)を参照。

## 状態

- `https://hfu.github.io/kitaphoto17-navara/`で公開中。kitaphoto17を平面
  ラスターとして表示(地形は未提供、D8/D9参照)
- 初期カメラ位置は札幌近郊の平坦な地点
  (`#141.261797/43.232979/3673/140.4/-24.3`)
- カーソル中心ズーム(独自実装)、URLハッシュへのカメラ位置同期、
  左上の折りたたみ可能な"Welcome to Hokkaido, Navara!"パネルを実装済み
- ズームアウトが効かない不具合を修正済み(`moveCameraWithDirection`は
  負のamountを無視するため、方向ベクトルを反転させる方式に変更)
- 以前registerしたcoi-serviceworkerを解除する後方互換コードを`main.ts`
  冒頭に残している(訪問者のブラウザに残っている場合のクリーンアップ用)

## 既知の注意点

- GitHub PagesのCDNキャッシュ(`max-age=600`)や、過去のcoi-serviceworker
  registrationが残っているブラウザでは、最新デプロイが反映されるまで
  ハードリロード/Service Worker手動解除が必要な場合がある

## TODO

- **Mapterhorn地形の再挑戦**: D8/D9の通り現状は断念しているが、
  (a) Navara側でワーカープール起動失敗時のフォールバックが改善される、
  または (b) COOP/COEPをネイティブに設定できるホスティングに移す、の
  いずれかが揃えば再検討する
- **PLATEAU implicit 3D tilesの追加**: hfuさんより、`plateau-mago-implicit`
  セッションが室蘭・札幌・更別のPLATEAU implicit 3D tilesを持っていると
  聞いた。詳細(配信URL、フォーマット、CORS等)を問い合わせ中
  (2026-09-04送信、返信待ち)。kitaphoto17(ラスター基盤)の上に3D建物を
  重ねる形になる想定
- ある程度固まったら、hfuさんの意向でunopengis/7にこの一連の知見
  (地形×GitHub Pages×COOP/COEPの制約、coi-serviceworkerでも解決しない
  こと)を軽くissue報告する

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見を共有済み。cafebabe側は
  `patterns/large-data-pitfalls.md`に反映しpush済み。
