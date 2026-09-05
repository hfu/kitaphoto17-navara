# DECISIONS

追記専用(ADR方式)。既存エントリは書き換えず、判断が変わったら新エントリで
`Dn参照、その後こう変わった` と書く。D6以降の詳しい調査ログ(再現手順・
コード引用・切り分けの過程)は[DECISIONS-LOG.md](DECISIONS-LOG.md)を参照。

## D1: Navara Declarative層のみで実装する

kitaphoto17を1枚のraster-tileレイヤーとして表示するだけなら、Plugin/API/
Shader層の複雑さは不要と判断。`view.addSource()` + `view.addLayer()` の
Declarative APIのみで完結させる。

## D2: `@navaramap/three` をnpmパッケージとしてそのまま利用、Navara本体のビルドは不要

`@navaramap/three@0.1.1` がnpm registryに公開済み。Rust/WASMのソース
ビルドはNavara本体(maplibre/navara)開発者向けのフローであり、ライブラリ
利用側では不要。

## D3: GitHub Pagesは`main`ブランチの`/docs`フォルダで公開する(GitHub Actions不使用)

Vite出力を`docs/`に向け、GitHub Pages設定は「mainブランチの/docsフォルダ」
を使う。ビルド用のGitHub Actionsワークフローは作らず、`src/`変更時は
ローカルで`npm run build`してから`docs/`の差分も一緒にコミットする運用。

## D4: ビルド出力ファイル名からコンテンツハッシュを外す(D11で一部撤回)

`vite.config.ts`で`entryFileNames`/`chunkFileNames`から`[hash]`を除去
(GitHub Pagesでの差分を綺麗にする目的)。**`assetFileNames`も同様に
除去していたが、これがD11のクラッシュを引き起こしたため撤回した。**
`entryFileNames`/`chunkFileNames`(自前のJSエントリ用)はそのまま維持。

## D5: リポジトリのコードはCC0、表示データ自体の帰属表示は別途維持する

このリポジトリ(コード)のライセンスはCC0 1.0 Universal。表示している
タイル・建物データ自体は各々の出典ライセンス(CC BY 4.0等)に従うため、
Navaraの`view.attribution`経由で帰属表示を別途行う([main.ts](src/main.ts))。

## D6–D9: 地形クラッシュを「crossOriginIsolatedが必要」と誤診断(D11で訂正)

GitHub PagesはCOOP/COEPヘッダーを送れず`crossOriginIsolated`が`false`に
なるため、Navaraのwasm worker poolが起動できず地形がクラッシュする、と
診断した。coi-serviceworker(Service WorkerでCOOP/COEPを疑似的に有効化
する迂回策)も試したが、`crossOriginIsolated: true`でもワーカー起動は
不安定なままだったため、地形機能をいったんスコープから外した。
**この診断は誤り。真因はD11。** 詳しい調査ログ:
[D6](DECISIONS-LOG.md#d6-このbrowser-pane環境でのwebglクラッシュは実装のバグではないと判断) /
[D7](DECISIONS-LOG.md#d7-github-pages上では-failed-to-warm-up-the-worker-pool-エラーが出るが表示には影響しない) /
[D8](DECISIONS-LOG.md#d8-mapterhorn地形terrain-layerはgithub-pages上で-crossoriginisolated-を条件にフィーチャー検出しfalseならスキップする) /
[D9](DECISIONS-LOG.md#d9-coi-serviceworkerを試したが撤去し地形はスコープから外した)

## D10: PLATEAU 3D Tilesはimplicit tilingでは動かず、explicit tilingを採用

3D Tiles 1.1 Implicit Tilingで配信されたPLATEAU建物は、タイルURI
テンプレート(`{level}/{x}/{y}`)が置換されず404になる。Rustソース
(`crates/navara_cesium3dtiles`)を確認したところ、Implicit Tilingの
トラバーサルロジック自体が実装されていないと確定した(バグではなく
未実装機能)。同じデータはCesiumJS 1.144では正常動作するため、データ側の
問題ではない。**このプロジェクトではexplicit tilingのみを使う方針**
(上流への貢献はまだ早い、との判断)。詳しい調査ログ:
[D10](DECISIONS-LOG.md#d10-plateau-3d-tilesはimplicit-tilingでは404しexplicit-tilingでは描画される)

## D11: 地形クラッシュの真因はvite.config.tsのファイル名ハッシュ除去設定だった(D6–D9を訂正)

真因は`crossOriginIsolated`ではなく、D4で設定した`assetFileNames`の
ハッシュ除去だった。`@navaramap/three`のワーカーチャンクは
`self.location.href`基準でハードコードされたファイル名
(`navara_wasm_worker_bg-CT26EH41.wasm`、Viteの`import.meta.url`アセット
追跡の対象外)でwasmを解決しており、ハッシュ除去でこの名前が変わって
404、全ワーカーが起動失敗していた。`assetFileNames`のカスタム指定を
削除して解決。navara.world公式のMapterhornサンプルが
`crossOriginIsolated: false`のまま正常動作していたことから発見した。
詳しい調査ログ: [D11](DECISIONS-LOG.md#d11-d6d9の結論を訂正--地形クラッシュの真因はcrossoriginisolatedではなくviteconfigtsのファイル名ハッシュ除去設定だった)

## D12: raster-dem地形にBrave固有の針状アーティファクトが出る(D17でquantized-meshに切替して回避)

kitaphoto17 + Mapterhorn地形(raster-dem) + PLATEAU建物を表示すると、
Braveでのみ地形メッシュに大量の針状ジオメトリが出る。標高データの外れ値、
skirtジオメトリ、PLATEAU建物のジオメトリ、Navara全般のバグ、いずれも
切り分けで否定した。navara.world公式のraster-demサンプルでも同様に
Braveで再現しSafariでは非再現、公式のquantized-meshサンプルではBrave
でも非再現、という決定的な切り分けから、**「Navaraのraster-dem→地形
メッシュ生成コードパス」×「Brave固有の何か」の組み合わせで起きる、
比較的狭い範囲の不具合**と判断した。詳しい調査ログ:
[D12](DECISIONS-LOG.md#d12-plateau建物地形から針状のアーティファクトが出るd16でraster-dem固有と判明)

## D13–D14: PLATEAU建物が黒く描画される問題の原因を特定・修正

glTFのマテリアル・COLOR_0頂点カラーは正しい値(赤・グレー)を持っていた
にもかかわらず、Navaraが真っ黒に描画していた。Opusモデルに
`node_modules/@navaramap/three/src`を読ませてソースレベルで特定: バッチ
カラーテクスチャの初期RGBが`(0,0,0)`で、`model.opacity`経由の更新だと
このゼロ値がCOLOR_0を無条件に上書きしてしまう(`color`経由の更新だけが
正しくRGBを書き込む)。**対応: `model.opacity`を削除し`model.color`を
白(`0xffffff`)に明示設定**、Brave実機で建物の色が正しく表示されることを
確認済み。詳しい調査ログ:
[D13](DECISIONS-LOG.md#d13-plateau建物が真っ黒に見える件はnavara側がgltfの色データを正しく読んでいないことが原因d14で根本原因を特定修正) /
[D14](DECISIONS-LOG.md#d14-d13の原因をopusモデルによるソース解析で特定修正)

## D15: Mapterhornのデータソースを`terrain.reearth.land`に切り替え(D17でquantized-meshへ再切替)

Navara公式サンプルは`tiles.mapterhorn.com`ではなくRe:Earth自身の
`terrain.reearth.land`を使っていたため、こちらが実質的な「一級市民」の
経路と判断し切り替えた(D12の針は解消せず、データソースの問題ではないと
確認)。詳しい調査ログ:
[D15](DECISIONS-LOG.md#d15-mapterhornのデータソースをterrainreearthlandに切り替えd17でquantized-meshに再切替経緯として記録)

## D16: D12(針)はraster-dem固有のコードパスの問題と判明

navara.world公式のquantized-meshサンプルではBraveでも針が一切発生しな
かった。D12は「Brave全般のWebGL問題」ではなく「raster-dem→地形メッシュ
生成」×「Brave固有の何か」の組み合わせと絞り込めた。詳しい調査ログ:
[D16](DECISIONS-LOG.md#d16-d12針はraster-dem固有のコードパスの問題と判明quantized-meshでは再現しない)

## D17: 地形ソースをraster-demから`quantized-mesh`に切り替え、D12を回避

D16を受け、地形ソースをRe:Earthのquantized-meshエンドポイント
(`https://terrain.reearth.land/cesium-mesh/ellipsoid/{z}/{x}/{y}.terrain`)
に切り替え、D12(Brave針)を回避した。副次的に、`DefaultPlugin`が
Gaussian Splat用SparkJS(約5MB)を無条件にバンドルすることを発見したが、
hfuさんの判断で軽量化は見送り「デフォルトのまま」進めることにした。
Brave実機で、kitaphoto17・地形起伏・PLATEAU建物すべて正常にレンダリング
され、針も発生しないことを確認した(D8/D9以来の3つの懸念がすべて解消)。
詳しい調査ログ:
[D17](DECISIONS-LOG.md#d17-地形ソースをraster-demmapterhornterrariumからquantized-meshに切り替え)
