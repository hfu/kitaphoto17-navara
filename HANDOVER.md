# HANDOVER

現在の状態のスナップショット。詳しい経緯・根拠は[DECISIONS.md](DECISIONS.md)を参照。

## 状態

- kitaphoto17は`https://hfu.github.io/kitaphoto17-navara/`で表示成功を確認済み(実GitHub Pages上)
- 地図中心を北海道駒ヶ岳に変更、カーソル中心ズーム(D9独自実装)、URLハッシュへの
  カメラ位置同期、左上の折りたたみ可能な"Welcome to Hokkaido, Navara!"パネルを追加
- Mapterhorn地形(`raster-dem` + `terrain`レイヤー)を追加しようとしたところ、
  GitHub PagesがCOOP/COEPヘッダーを送れないため`crossOriginIsolated`が`false`になり、
  Navaraのwasm worker poolが起動できず`RuntimeError: unreachable`でクラッシュする
  ことが判明(D8)。`window.crossOriginIsolated`をフィーチャー検出してterrainの
  追加自体をスキップするガードを実装済み
- 対応として`coi-serviceworker`(MIT, vendored)を`public/`に追加し、`index.html`
  先頭で登録するようにした。ローカルのPython静的サーバーではService Worker登録が
  失敗したが、これはBrowser pane(自動化環境)側の制約の可能性が高いと判断
  (詳細はDECISIONS.md D8の追記参照)。**実GitHub Pagesでの動作確認がまだ**
- ここまでの変更(terrain guard, zoom-to-cursor, hashハッシュ同期, panel,
  coi-serviceworker)は**ローカルのみ、まだcommit/pushしていない**

## 次にやること

1. `npm run build` → commit → push
2. 実GitHub Pages(`https://hfu.github.io/kitaphoto17-navara/`)で
   coi-serviceworkerが正しく登録され、`crossOriginIsolated`が`true`になり、
   Mapterhorn地形が実際に描画されるか確認する
3. 地形が動けば北海道駒ヶ岳の立体地形+kitaphoto17ドレープが見えるはず。
   動かなければ(Service Worker登録が別の理由で失敗する等)、D8の
   「平面表示にフォールバック」で妥協するか、代替ホスティング
   (Cloudflare Pages等)への移行を検討する
4. ある程度固まったら、hfuさんの意向でunopengis/7にこの知見を軽くissue報告する
   (地形×GitHub Pages×COOP/COEPの制約について)

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見を共有済み。cafebabe側は
  `patterns/large-data-pitfalls.md`に反映しpush済み。
