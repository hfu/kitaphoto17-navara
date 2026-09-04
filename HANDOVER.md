# HANDOVER

現在の状態のスナップショット。詳しい経緯・根拠は[DECISIONS.md](DECISIONS.md)を参照。

## 状態

- `https://hfu.github.io/kitaphoto17-navara/`で公開中。**現在の公開版は**
  kitaphoto17を平面ラスターとして表示するのみ(D8/D9時点の内容)
- ローカルの`/tmp`スクラッチビルドでは、kitaphoto17(ラスター) +
  Mapterhorn地形(公式CDN) + 札幌のPLATEAU 3D Tiles(explicit)を
  同時に有効化した状態で動作を確認済み(D11、D10)。**まだcommit/push
  していない**
- カーソル中心ズーム(独自実装)、URLハッシュへのカメラ位置同期、
  左上の折りたたみ可能な"Welcome to Hokkaido, Navara!"パネルを実装済み
  (これらは公開版に反映済み)
- ズームアウトが効かない不具合を修正済み(`moveCameraWithDirection`は
  負のamountを無視するため、方向ベクトルを反転させる方式に変更)
- 以前registerしたcoi-serviceworkerを解除する後方互換コードを`main.ts`
  冒頭に残している(訪問者のブラウザに残っている場合のクリーンアップ用)

## 重要な訂正(D11)

D8/D9で「GitHub PagesはCOOP/COEPを送れないため地形が動かない」と
結論づけていたが、これは誤りだった。真因は`vite.config.ts`の
`assetFileNames`ハッシュ除去設定(D4)が、ワーカーがハードコードで
参照するwasmファイル名(`self.location.href`基準、Viteのアセット追跡
対象外)を壊していたことだった。修正済み(`assetFileNames`のカスタム
指定を削除)。あわせて、Mapterhornのデータソースを
`stars.optgeo.org/mapterhorn-japan-bridge`から公式CDN
(`https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`)に変更する必要が
あった(stars.optgeo.org版は原因不明のまま依然クラッシュする)。

**coi-serviceworkerは不要だった** — D9で撤去した判断は正しかったが、
理由(crossOriginIsolatedが必要)は誤りだったことになる。

## 既知の注意点

- GitHub PagesのCDNキャッシュ(`max-age=600`)や、過去のcoi-serviceworker
  registrationが残っているブラウザでは、最新デプロイが反映されるまで
  ハードリロード/Service Worker手動解除が必要な場合がある

## TODO

- **地形+PLATEAU建物+kitaphoto17の統合を実ブラウザで最終確認してpush**:
  ローカルの`/tmp`スクラッチビルド(`http://localhost:8899/kitaphoto17-navara/`)
  で動作確認済み。凍結解除後、`npm run build` → commit → push
- **stars.optgeo.orgのMapterhornミラーがなぜクラッシュするか**: 原因未特定。
  公式CDNで運用する分には実害はないが、気になれば後日調査
- **PLATEAU implicit tilingの404**(D10): Navara側の実装課題である可能性が
  高い(`plateau-mago-implicit`がCesiumJS 1.144で同じデータの正常動作を
  確認済み)。当面はexplicit tiling版で運用する
- **室蘭・更別のPLATEAU 3D Tiles**: 札幌の統合が固まったら別枠で検討
  (都市切り替えUIを作るか、動作確認のみに留めるか)
- **unopengis/7への知見報告**: [UNopenGIS/7#998](https://github.com/UNopenGIS/7/issues/998)
  に投稿済みの内容(地形×GitHub Pages×COOP/COEPの制約)は、D11の訂正を
  踏まえると**不正確**なので、凍結解除後・地形が実際にpushされたタイミングで
  修正コメントを追記する必要がある

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見を共有済み。cafebabe側は
  `patterns/large-data-pitfalls.md`に反映しpush済み。
- plateau-mago-implicitセッションに、PLATEAU 3D Tilesの検証結果
  (implicit tiling 404、explicit tiling成功)を共有済み。
