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
- **PLATEAU implicit 3D tilesの追加**: `plateau-mago-implicit`セッションから
  詳細回答あり(2026-09-04)。
  - 配信URL(認証なし、CORS `*`許可、動作確認済み):
    - 室蘭市: `https://depot.optgeo.org/plateau-mago-implicit/muroran/implicit/full/latest/tileset.json`
    - 札幌市: `https://depot.optgeo.org/plateau-mago-implicit/sapporo/implicit/full/latest/tileset.json`
    - 更別村: `https://depot.optgeo.org/plateau-mago-implicit/sarabetsu/implicit/full/latest/tileset.json`
  - フォーマット: 3D Tiles 1.1 Implicit Tiling、コンテンツはglTF/GLB
    (b3dmではない)、LOD1建物のみ・テクスチャなし
  - Navara側は`view.addSource({ type: "3d-tiles", url, crs? })` +
    `view.addLayer({ type: "3d-tiles", source, model: {...} })`で
    ネイティブ対応している(CesiumJS等の別ライブラリは不要 — Rust実装の
    `navara_cesium3dtiles`クレートがglTF/GLB/implicit tilingを含めて
    直接扱う設計)。公式サンプル
    (`web/navara_three/example/pages/styling/cesium3dtiles1.1/main.ts`)が
    PLATEAU系データ+地形+ベースマップの組み合わせの参考実装になりそう
  - 既知の罠(plateau-mago-implicit調べ): CesiumJS 1.117はimplicit
    tilingのルートタイル選択にバグがあり無描画になる(1.144で解消済み、
    上流バグ)。Navaraの実装は別物だが、implicit tiling対応が新しいか
    要確認。座標系はJGD2011ベースでMago 3DTilerの`--proj`+`axis=neu`
    指定が必要だったとのことで、読み込み側で座標がズレたらまずここを疑う
  - kitaphoto17(ラスター基盤)の上に3D建物を重ねる構成を想定。実装フェーズ
    に入ったら`data/output/`のビルドmanifestも共有してもらえる
  - **検証結果(D10)**: implicit tiling版は`{level}/{x}/{y}`テンプレートが
    置換されず404になり読み込めない。explicit tiling版
    (`explicit/full/latest/tileset.json`)は実際に個別タイルを取得・
    レンダリングできることを実ブラウザで確認済み。ただしLOD1・マテリアル
    未設定のため黒い塊で表示され、terrainが無い(D8/D9)ため実標高の
    高さのまま浮いて見える。plateau-mago-implicitさんに共有済み
  - **次の一手**: `src/main.ts`はexplicit tiling版のURLを指すよう
    ローカルで書き換え済み(未commit)。凍結解除後、この状態でビルド・
    実ブラウザ確認・commit/pushする方向で進める想定
- **unopengis/7への知見報告**: [UNopenGIS/7#998](https://github.com/UNopenGIS/7/issues/998)
  に地形×GitHub Pages×COOP/COEPの制約についての知見を追記投稿済み
  (2026-09-04)。PLATEAU 3D Tilesのimplicit tiling不具合については、
  こちらの検証がある程度固まったら追記を検討する

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見を共有済み。cafebabe側は
  `patterns/large-data-pitfalls.md`に反映しpush済み。
