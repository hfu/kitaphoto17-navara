# kitaphoto17-navara

**Live demo: https://hfu.github.io/kitaphoto17-navara/**

[Martin](https://martin.maplibre.org/)(`stars.optgeo.org`)が配信する
[kitaphoto17](https://stars.optgeo.org/kitaphoto17) ラスタータイルレイヤーを、
[Navara](https://navara.world/)(`maplibre/navara`)で表示する静的サイトです。

MapLibreへの移管後のNavaraを実際に使い、MapLibre GL JSやCesiumと比較した際の
開発体験を把握することを目的にしています。

## 使い方

- ホイール/ピンチでズーム(カーソル位置を中心にズームします)
- ドラッグでパン、右ドラッグ/Ctrl+ドラッグでチルト
- カメラ位置はURLハッシュ(`#lng/lat/height/heading/pitch`)に同期されるので、
  特定の視点をURLとして共有できます

## 表示しているデータ

- ベースマップ: `https://stars.optgeo.org/kitaphoto17/{z}/{x}/{y}`(jpg, z2–z17)。
  国土地理院シームレス空中写真(kitaphoto z2–12 + seamlessphoto512 z13–17)を
  北海道でクロップしたマージ済みタイル。出典: 国土地理院 シームレス空中写真
  (GSI seamlessphoto) CC BY 4.0。詳細: [optgeo/kitaphoto](https://github.com/optgeo/kitaphoto)
- 地形: Re:Earthのquantized-mesh地形配信(`terrain.reearth.land`)
- 建物: 国土交通省 Project PLATEAUの3D都市モデル(札幌市・室蘭市・更別村)。
  下記「関連プロジェクト」を参照

## Related projects

- [dwg7/plateau-mago-implicit](https://github.com/dwg7/plateau-mago-implicit) — same PLATEAU building data via CesiumJS

## 実装メモ

Navaraのtiered API(Declarative/Plugin/API/Shader)のうち、もっとも単純な
**Declarative層**(`view.addSource()` + `view.addLayer()`)のみで実装しています。
`@navaramap/three`はnpm配布済みのため、Navara本体(Rust/WASM)をビルドする
必要はありません。

実装過程で見つかったNavara側の不具合・回避策(地形メッシュ生成の
ワーカープール起動、glTFのマテリアル反映、Braveでの地形アーティファクト等)
の詳しい経緯は[DECISIONS.md](DECISIONS.md)を参照してください。

## 開発

```bash
npm install
npm run dev
```

## ビルド

`docs/` に出力し、GitHub Pages(`main` ブランチの `/docs`)で公開します。

```bash
npm run build
```

`src/` を変更したら `npm run build` を実行し、生成された `docs/` の差分も
一緒にコミットしてください。

## ライセンス

このリポジトリのコードはCC0です。表示しているタイル画像自体の著作権・
帰属表示は上記の出典表示に従います。
