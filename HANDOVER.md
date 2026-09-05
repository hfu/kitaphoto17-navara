# HANDOVER

現在の状態のスナップショット。詳しい経緯は[DECISIONS.md](DECISIONS.md)
(索引)と[DECISIONS-LOG.md](DECISIONS-LOG.md)(詳細ログ)を参照。

## 状態

- ローカルの`/tmp`スクラッチビルドで、以下すべてが動作確認済み(Brave実機):
  - kitaphoto17(ラスターベースマップ)
  - Re:Earthのquantized-mesh地形(`terrain.reearth.land`)、針状
    アーティファクト無し(D12/D16/D17)
  - 札幌・室蘭・更別のPLATEAU建物(explicit tiling)、正しい色
    (D13/D14)、都市切り替えボタンによる`flyTo`ジャンプ
  - カーソル中心ズーム・URLハッシュ同期・折りたたみ可能なパネル
- **2026-09-05、GitHub Pagesに初回デプロイ済み**
  (https://hfu.github.io/kitaphoto17-navara/)。上記すべてが本番で
  動作確認済み(Brave実機)
- plateau-mago-implicitとの相互リンクは双方で設置済み(README「Related
  projects」+ サイト内attribution)
- PLATEAU建物の読み込み時の金色フェード演出も実装・確認済み
- UNopenGIS/7#998に、地形クラッシュの真因訂正とNavara側バグ2件の
  まとめを投稿済み

## 既知の注意点

- GitHub PagesのCDNキャッシュ(`max-age=600`)や、過去のcoi-serviceworker
  registrationが残っているブラウザでは、最新デプロイが反映されるまで
  ハードリロード/Service Worker手動解除が必要な場合がある(`main.ts`
  冒頭に解除コードあり)
- パフォーマンスは「そんなに速くないが、まずまず良い」(hfuさん評)。
  これ以上は詰めない方針

## TODO

- (保留)maplibre/navaraへの正式なissue報告(D12/D13/D10のimplicit
  tiling未実装): 「まだ早い」とのhfuさんの判断で保留中
- (保留)`DefaultPlugin`の軽量化(SparkJS ~5MBの除去): 「デフォルトの
  まま進める」と決定済み、着手しない
- 未着手・低優先度: `stars.optgeo.org/mapterhorn-japan-bridge`が
  なぜクラッシュしていたか(D11副次的発見)の原因調査。公式CDN
  (`terrain.reearth.land`)運用で実害は無いので急ぎではない

## 知見の共有元

- cafebabe(dwg7/cafebabe): HANDOVER/DECISIONS運用の慣習、Navaraの
  バンドルサイズに関する知見を共有
- plateau-mago-implicit(dwg7/plateau-mago-implicit): PLATEAU 3D Tiles
  (implicit/explicit tiling)の検証結果を相互共有。相互リンク設置済み
