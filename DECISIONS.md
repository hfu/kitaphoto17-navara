# DECISIONS

追記専用(ADR方式)。既存エントリは書き換えず、判断が変わったら新エントリで
`Dn参照、その後こう変わった` と書く。

## D1: Navara Declarative層のみで実装する

kitaphoto17を1枚のraster-tileレイヤーとして表示するだけなら、Plugin/API/
Shader層の複雑さは不要と判断。`view.addSource()` + `view.addLayer()` の
Declarative APIのみで完結させる。`DefaultPlugin`(sky/atmosphere/terrain等の
写実シーン用)も、今回のスコープ(表示確認)には不要なので使わない。

## D2: `@navaramap/three` をnpmパッケージとしてそのまま利用、Navara本体のビルドは不要

`@navaramap/three@0.1.1` がnpm registryに公開済みであることを確認
(https://registry.npmjs.org/@navaramap/three)。Rust/WASMのソースビルド
(`cargo make prepare` 等)はNavara本体(maplibre/navara)開発者向けのフローで
あり、ライブラリ利用側では不要。

## D3: GitHub Pagesは`main`ブランチの`/docs`フォルダで公開する(GitHub Actions不使用)

hfuさんの指示により、Vite出力を`docs/`に向け、GitHub Pages設定は
「mainブランチの/docsフォルダ」を使う。ビルド用のGitHub Actionsワークフローは
作らず、`src/`変更時はローカルで`npm run build`してから`docs/`の差分も
一緒にコミットする運用とする。MapLibreやOpen MCTのリポジトリもこの方式を
採っている、という判断根拠。

## D4: ビルド出力ファイル名からコンテンツハッシュを外す

`vite.config.ts`で`entryFileNames`/`chunkFileNames`/`assetFileNames`から
`[hash]`を除去。理由(hfuさん): GitHub Pagesにはindex.htmlの参照を書き換える
ビルドステップが無いため、ハッシュ無しの安定したファイル名の方がリポジトリの
差分・運用が単純になる。

## D5: リポジトリのコードはCC0、表示データ自体の帰属表示は別途維持する

hfuさんの指示により、このリポジトリ(コード)のライセンスはCC0 1.0
Universal。ただし表示しているkitaphoto17タイル自体は国土地理院シームレス
空中写真(CC BY 4.0)に由来するため、Navaraの`view.attribution`経由で
帰属表示は別途行う([main.ts](src/main.ts)参照)。

## D6: このBrowser pane環境でのWebGLクラッシュは実装のバグではないと判断

ローカルビルドをこのセッションの組み込みBrowser pane(実GPU不使用と見られる
WebKit系ヘッドレス環境)でプレビューしたところ、コンソールに
`THREE.WARNING: Multiple instances of Three.js being imported` と
`Uncaught ... Invariant failed` が出て画面が真っ黒になった。切り分けのため
navara.world公式のraster-tilesサンプル(https://navara.world/examples/demo/basemap/raster-tiles)
を同じBrowser paneで開いたところ、**同一のエラーが公式サンプルでも再現**した。
このことから、これはkitaphoto17-navara側の実装ミスではなく、Browser pane
環境固有のWebGL制約(またはこのペインのソフトウェアレンダラの制約)による
ものと判断した。実Chrome(claude-in-chrome)での検証はこのセッションでは
拡張機能が未接続のため実施できなかった。実際のユーザー環境(GitHub Pages
公開後、または`npm run dev`をローカルの通常ブラウザで開く)での確認が必要。

**追記(2026-09-04): GitHub Pages公開後の実ブラウザ相当環境で確認したところ表示成功。**
D6のBrowser paneクラッシュは解消しており(このBrowser pane環境自体の何らかの
一時的な状態だった可能性がある)、`https://hfu.github.io/kitaphoto17-navara/`で
kitaphoto17タイル(北海道の空中写真)が正しくレンダリングされることを
確認した。

## D7: GitHub Pages上では `Failed to warm up the worker pool` エラーが出るが、表示には影響しない

コンソールに `Failed to warm up the worker pool: AggregateError: All promises
were rejected`(7 rejections)が出る。`window.crossOriginIsolated === false`
かつ `SharedArrayBuffer === undefined` であることを確認した。GitHub Pagesは
静的ホスティングでカスタムHTTPレスポンスヘッダ(`Cross-Origin-Opener-Policy` /
`Cross-Origin-Embedder-Policy`)を設定できないため、Navaraのwasmワーカープール
が期待するマルチスレッド(SharedArrayBuffer)処理が有効化できず、これに起因する
ものと推測される。実害としてはkitaphoto17のラスタータイル表示(JPEG画像の
表示のみで、wasm側のマルチスレッド処理を必要としない)には影響しておらず、
エンジン側でシングルスレッド相当にフォールバックしていると考えられる。
地形処理(terrain)やベクトルタイルのパースなど、wasmワーカーに強く依存する
機能を将来追加する場合は、COOP/COEPヘッダを設定できるホスティング(Cloudflare
Pages, Vercel等)への移行を検討する必要がある。

## D8: Mapterhorn地形(terrain layer)はGitHub Pages上で `crossOriginIsolated` を
条件にフィーチャー検出し、falseならスキップする

hfuさんの指示で、Mapterhorn(`stars.optgeo.org/mapterhorn-japan-bridge`,
Terrarium encoding, tileSize 512, https://mapterhorn.com)を`raster-dem`
ソース+`terrain`レイヤーとして追加し、地図中心を北海道駒ヶ岳
(lng 140.6772, lat 42.0631)に変更する実装を試みた。

**再現した問題**: `view.addLayer({ type: "terrain", ... })` を有効にすると、
`Uncaught RuntimeError: unreachable`(`navara_wasm_bg.wasm`内)で全体が
クラッシュする。D7で確認した`Failed to warm up the worker pool`
(`crossOriginIsolated === false`のため`SharedArrayBuffer`が使えず、
wasm tile workerプールが起動できない)の直後に発生する。

**切り分け**: 以下3パターンで同一のcrashを再現し、原因を局所化した:
1. `vite preview`ローカルサーバー(wasmのMIMEタイプが不正、COOP/COEPも無し)
2. `python3 -m http.server`(wasmのMIMEタイプは正しい`application/wasm`、
   COOP/COEPは無し) — MIMEタイプを正しくしても再現したため、原因は
   MIMEタイプではなくワーカープール起動失敗そのものと判明
3. GitHub Pages実機(D7同様、COOP/COEP設定不可) — 同一クラッシュ

Mapterhornタイル自体(`stars.optgeo.org/mapterhorn-japan-bridge/9/456/189`
等)は`content-type: image/webp`・512x512pxで正常に取得できることも確認済み
(データ側の問題ではない)。

**結論**: raster-tile(平面画像表示)はワーカープール無しでも動作するフォール
バックがあるが、terrain(地形メッシュ生成)は現行の`@navaramap/three@0.1.1`
ではワーカープール必須で、起動失敗時のグレースフルフォールバックが実装
されていないと判断した。GitHub PagesはCOOP/COEPヘッダを設定できないため、
**現行バージョンのNavara terrainはGitHub Pages上で原理的に動作しない**。

**対応**: `window.crossOriginIsolated`をフィーチャー検出し、`false`の場合は
terrainレイヤーの追加自体をスキップして、kitaphoto17を平面ラスターとして
表示する([main.ts](src/main.ts)参照)。crossOriginIsolatedな環境
(Cloudflare Pages等でCOOP/COEPを設定した場合)ではterrainが有効になる
はずだが、このリポジトリのスコープ外のため未検証。

hfuさんの意向により、この知見はunopengis/7のissueとして報告予定
(ある程度実装が固まった段階で)。

**追記(2026-09-04): coi-serviceworkerで`crossOriginIsolated`を疑似的にtrueにする対応を追加。**
GitHub Pagesはヘッダーを設定できないが、Service Worker経由でCOOP/COEP相当の
効果を得るワークアラウンド(https://github.com/gzuidhof/coi-serviceworker,
MIT)が存在することがわかった。`public/coi-serviceworker.js`にそのまま
vendoringし、`index.html`の先頭で登録するようにした(初回訪問時に1回だけ
自動リロードされる)。ローカルのPython製静的サーバー
(`python3 -m http.server`)上ではService Worker登録が
`An unknown error occurred when fetching the script.`で失敗したが、これは
このセッションのBrowser pane(自動化・サンドボックス環境)がService Worker
登録を制限している可能性が高いと考えている(content-typeは`text/javascript`
で問題なし、localhostはセキュアコンテキストとして扱われるはずのため)。
実際のGitHub Pages(真のHTTPSオリジン)での動作を次に確認する。

## D9: coi-serviceworkerを試したが撤去し、地形はスコープから外した

D8の対応としてcoi-serviceworkerを導入した結果、GitHub Pages実機
(`https://hfu.github.io/kitaphoto17-navara/`)では`window.crossOriginIsolated`
が実際に`true`になることを確認できた。しかし、hfuさんが実ブラウザ(Brave)で
コンソールを確認したところ、`crossOriginIsolated: true`の状態でも
`Failed to warm up the worker pool: AggregateError: All promises were
rejected`が発生し、続けてD8と同じ`RuntimeError: unreachable`で地形描画が
クラッシュすることが判明した。さらにその後は、パニックでRust側の内部状態
(おそらく`RefCell`相当のborrow-check付きオブジェクト)が未解放のまま残り、
マウス操作やリサイズのたびに`recursive use of an object detected which
would lead to unsafe aliasing in rust`が繰り返し発生する状態になった。

つまり`crossOriginIsolated`はワーカープール起動成功の必要条件ではあっても
十分条件ではなく、ブラウザ(Braveのプライバシー保護機能等)によっては
それだけでは足りない場合がある。ヘッダー偽装という迂回策を重ねてもなお
安定して動かせる保証がない以上、**地形機能は今回のスコープからいったん
外す**のが妥当と判断した。

**対応**: Mapterhorn地形レイヤー・`raster-dem`ソース・crossOriginIsolated
ガードを削除し、coi-serviceworkerも撤去した。kitaphoto17は平面ラスター
表示に統一する。coi-serviceworkerはService Workerとして一度登録されると
訪問者のブラウザに残り続けるため、`main.ts`冒頭で既存の全Service Worker
登録を解除する後方互換コードを追加した(このコード自体は数バージョン後、
影響が及ばなくなった頃に削除して構わない)。

hfuさんの意向により、この経緯(coi-serviceworkerを使ってもGitHub Pages上
でのNavara terrainは実用的に安定しない、という知見)はunopengis/7に
issueとして報告予定。

地形を提供しなくなったことに伴い、地図の初期中心をD8/D9で使っていた
北海道駒ヶ岳(起伏の激しい地点)から札幌(lng 141.3469, lat 43.0642)に
変更した([main.ts](src/main.ts))。

## D10: PLATEAU 3D Tilesは、implicit tilingでは404し、explicit tilingでは描画される

`plateau-mago-implicit`セッションから提供された札幌の3D Tiles
(`https://depot.optgeo.org/plateau-mago-implicit/sapporo/`)を、
`view.addSource({ type: "3d-tiles", url })` + `view.addLayer({ type: "3d-tiles", ... })`
で読み込むテストを行った(まだcommit/pushはしていない、ローカルの
`/tmp`スクラッチビルドでのみ検証)。

**implicit tiling版**(`implicit/full/latest/tileset.json`): tileset.json
自体は200で取得できるが、そのルートタイルの`content.uri`に含まれる
`{level}/{x}/{y}`テンプレートが実際の値に置換されないまま
(`data/R/%7Blevel%7D/%7Bx%7D/%7By%7D.glb`というURLで)リクエストされ、
404になることを`performance.getEntriesByType('resource')`で確認した。
`.subtree`ファイルへのリクエストは一度も発生しなかった。tileset.jsonの
`root.boundingVolume`は標準的な`region`(WGS84緯度経度ラジアン)形式。

**explicit tiling版**(`explicit/full/latest/tileset.json`, 3.4MB):
tileset.json取得後、`data/R{row}C{col}.glb`形式の個別タイルファイルへの
リクエストが実際に発生する(1回の読み込みで約100件)ことを確認した。
hfuさんが実ブラウザで確認したところ、建物は実際にレンダリングされて
いた。ただし(a)LOD1・マテリアル未設定のため黒い塊として表示される、
(b)terrainレイヤーが無い(D8/D9)ため、建物は実標高の高さに配置されて
おり、標高0のNavara平面(ellipsoid)から浮いて見える、という2点が
観測された。

このセッションのBrowser paneでは、explicit版でも建物の描画を画面上で
確認できなかった(D6と同様、この環境固有の描画不安定さの可能性がある)。

**追記**: `plateau-mago-implicit`セッションによれば、同じ札幌implicit
tiling出力(tileset.json + .subtree)をCesiumJS 1.144で検証済みで、
ルートタイル選択・subtree traversal・タイルコンテンツ描画まで正常に
動作することを確認しているとのこと。データ側が3D Tiles 1.1仕様に
準拠していることを踏まえると、今回observedした404(テンプレート
`{level}/{x}/{y}`が置換されない、`.subtree`が一度も要求されない)は、
データ側ではなくNavara側のimplicit tiling実装(テンプレートURI展開・
subtree availability解決のロジック)に起因する可能性が高い。

## D11: D6〜D9の結論を訂正 — 地形クラッシュの真因は`crossOriginIsolated`ではなく、vite.config.tsのファイル名ハッシュ除去設定だった

D6〜D9では「GitHub PagesがCOOP/COEPを送れないため`crossOriginIsolated`が
`false`になり、それがwasm worker poolの起動失敗・地形クラッシュの原因」
と結論づけていたが、これは誤りだった。以下の手順で真因を特定した。

**きっかけ**: 公式のnavara.world Mapterhornサンプル
(`https://navara.world/examples/mapterhorn`)を調べたところ、
`window.crossOriginIsolated`が`false`であるにもかかわらず、コンソールに
`init navara_wasm_worker`が8回出力され(ワーカープールの正常起動を示す)、
実際に地形(山の稜線)が描画されていることを確認した。これはD8の前提と
矛盾する。

**真因**: `node_modules/@navaramap/three/dist/assets/index-VfUncKuS.js`
(ワーカーチャンク)を直接調べたところ、次のコードでwasmファイルを解決
していた:

```js
new URL(`navara_wasm_worker_bg-CT26EH41.wasm`, self.location.href)
```

これはViteの`import.meta.url`ベースのアセット追跡の対象外(`self.location.href`
基準の文字列リテラル)であるため、Vite側はこの参照を認識してリネームを
追従させることができない。一方、[vite.config.ts](vite.config.ts)には
D4(このセッション序盤、hfuさんの指示でGitHub Pages上の差分を綺麗にする
目的)で設定した

```ts
assetFileNames: "assets/[name].[ext]",
```

があり、これが`navara_wasm_worker_bg-CT26EH41.wasm`というファイル名から
末尾のハッシュ状の部分を除去し、`navara_wasm_worker_bg.wasm`という別名で
出力していた。結果、ワーカーが要求するURLと実際に配置されているファイル名
が一致せず404となり、7〜8個のワーカー全てが同じ理由で起動に失敗し
(`AggregateError: All promises were rejected`)、地形処理がその状態を
前提に進んで`RuntimeError: unreachable`でクラッシュしていた。

**対応**: `assetFileNames`のカスタム指定を削除し、Viteのデフォルト
(ハッシュ付き)に戻した。`entryFileNames`/`chunkFileNames`(自前の
JSエントリ用、D4の本来の目的)はそのまま維持。修正後、ローカルの
`/tmp`スクラッチビルドで検証したところ、`crossOriginIsolated: false`の
ままワーカープールが正常に起動することを確認した。

**副次的な発見**: この修正後も、Mapterhornのデータソースに
`stars.optgeo.org/mapterhorn-japan-bridge`(Martin配信の日本限定
クロップ版)を使うと依然`RuntimeError: unreachable`でクラッシュしたが、
公式CDN(`https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`、
`minZoom: 5, maxZoom: 17`)に切り替えるとクラッシュが解消した。
stars.optgeo.org版のタイルデータに何らかの差異があると見られるが、
原因は未特定。

**現状**: kitaphoto17(ラスター) + Mapterhorn地形(公式CDN) + 札幌の
PLATEAU 3D Tiles(D10のexplicit版)を同時に有効化した状態で、
ワーカープール起動・クラッシュともに問題が起きないことを確認した
(ローカルの`/tmp`スクラッチビルドのみ、まだcommit/pushしていない)。
D6〜D9は「crossOriginIsolated」を原因と誤認していた記録として残すが、
今後の判断はこのD11を優先する。unopengis/7#998の記述も、この訂正を
踏まえて更新が必要(ただしD12の問題が解消してから報告する、hfuさんの
意向)。

## D12(調査中): PLATEAU建物から「針」状のアーティファクトが出る

D11の状態(kitaphoto17 + Mapterhorn地形 + 札幌PLATEAU建物を同時表示)を
hfuさんが実ブラウザで確認したところ、各建物から空に向かって細く長い
「針」状のジオメトリが多数突き出て見えることが判明した。建物本体
(LOD1の黒い箱)自体は正しい位置・形状に見える。縮退三角形
(degenerate triangle: 屋根の頂点が本来つながるべきでない別の高度の
頂点と誤って接続された状態)に典型的な見た目。

データ側(Mago 3DTilerの出力)の問題か、Navara側のglTFパース・
レンダリングの問題かは未特定。`plateau-mago-implicit`に、CesiumJS
1.144での検証時に同様の現象が見えていたか確認を依頼した
(2026-09-04)。解消するまでは、この一連の変更(地形+PLATEAU建物)を
commit/pushしない。

**切り分けの経過**:
- Mapterhornの標高タイル(z14、札幌中心部周辺4枚)を実際にデコードし、
  標高値に外れ値が無いことを確認(最小10.75m〜最大47.25m、平野部として
  妥当)。データ側の異常値は否定
- `terrain: { skirt: false }`(タイル境界の隙間を隠す壁ジオメトリを無効化)
  にしても針は解消せず。skirtジオメトリが原因という仮説も否定
- PLATEAU建物が存在しない地点(山岳部)でも同様の針が観測された。
  PLATEAU建物のジオメトリ固有の問題という仮説も否定
- `plateau-mago-implicit`が同じexplicit tilingデータをCesiumJS 1.144で
  実際にレンダリングし、針状アーティファクトが一切無いことを確認
  (2026-09-04)。データ・glTF自体の問題である可能性はさらに下がった

**決定的な切り分け(2026-09-04)**: hfuさんが**navara.world公式の
Mapterhornサンプル**(`https://navara.world/examples/mapterhorn`、
このリポジトリのコードとは無関係)を確認したところ、**Braveでは
地形メッシュの行ごとに大量の針状アーティファクトが密集して発生する
一方、同じURLをSafariで開くと針は一切発生せず、正常にレンダリング
された**。つまりこの現象は、Navara一般のバグでも、Mapterhornの
データでも、PLATEAU建物でも、このリポジトリの実装でもなく、
**Brave(またはBraveが使うChromium/WebGLの何らかの挙動)固有の
問題**である可能性が高いことが判明した。原因の詳細(Braveの
フィンガープリンティング対策、GPUサンドボックス、WebGL実装差異等)は
未特定。

この発見により、Safari(および恐らく大半のブラウザ)ではkitaphoto17 +
Mapterhorn地形 + PLATEAU建物の統合表示が正常に動作する可能性が高い。
Chromeでの確認はまだ行っていない。

## D13: PLATEAU建物が真っ黒に見える件は、Navara側がglTFの色データを
正しく読んでいないことが原因

D10以来、explicit tiling版のPLATEAU建物はSafariでも実際にレンダリング
されるが「真っ黒」に見えていた。`model: { normals: true, color: new
Color().setHex(0xd8d4c8) }`(法線再計算+明示的な色指定)を試したが、
hfuさんの確認では改善しなかった。

原因を突き止めるため、実際のタイルコンテンツ
(`data/R1331C2.glb`)を直接ダウンロードしてglTFバイナリを解析した:

```
materials:
  [0] baseColorFactor: [1.0, 0.0, 0.0, 1.0]  (赤、doubleSided: false)
  [1] baseColorFactor: [0.9, 0.9, 0.9, 1.0]  (明るいグレー、doubleSided: false)

meshes[0].primitives[0]: attributes NORMAL/POSITION/COLOR_0/_FEATURE_ID_0, material 0
meshes[1].primitives[0]: attributes NORMAL/POSITION/COLOR_0/_FEATURE_ID_0, material 1

COLOR_0アクセサ(VEC4, UNSIGNED_BYTE, normalized: true):
  material 0用: min=max=[255,0,0,255]   (赤、baseColorFactorと一致)
  material 1用: min=max=[229,229,229,255] (≈0.898グレー、baseColorFactorと一致)
```

つまり**データ自体は正しく色情報(マテリアルのbaseColorFactorと、それに
一致するCOLOR_0頂点カラーの両方)を持っており、NORMALも存在する**。
「真っ黒」に見えるのは、Navara側の3D Tiles/glTFローダーがこれらの色
情報(baseColorFactorおよび/またはCOLOR_0)を正しく反映せずに描画して
いるためだと判断した。アプリ側の`model.color`オーバーライドが効かない
のも、この描画パイプライン側の問題と整合する。

D12(Brave固有の針)とあわせて、Navara(`navara_cesium3dtiles`クレート)
のglTF/3D Tilesレンダリングパスに、少なくとも2つの独立した不具合
(色データの反映漏れ、針状アーティファクト)があると判断している。

## D14: D13の原因をOpusモデルによるソース解析で特定、修正

hfuさんの提案で、Opusモデルのエージェントに`node_modules/@navaramap/*`
のソース(srcが同梱されている)を実際に読ませてD12/D13を考察させた。
推測ではなくコードを根拠に、D13の原因を特定できた。

**根本原因**: `@navaramap/three/src/mesh/batchTexture.ts`の
`initBatchDataTexture()`は、バッチカラーテクスチャのRGB初期値を
`(0,0,0)`にする(コード内コメント: "R, G, B remain 0 (will be set
when color is first written)")。頂点シェーダ側には

```glsl
#ifdef USE_BATCH_COLOR_SHOW
  vec4 batchColor = getBatchColorShow(batchId);
  #ifdef USE_COLOR
    vColor.rgb = batchColor.rgb;   // glTFのCOLOR_0を無条件で上書き
```

という処理があり、glTFがCOLOR_0を持つ場合(three.jsが自動で
`USE_COLOR`を立てる)、このバッチカラーで頂点色が上書きされる。
`USE_BATCH_COLOR_SHOW`は`color`/`show`/`opacity`いずれかの更新で
有効になるが、**`opacity`経由の更新だとRGBは初期値の0のまま**
書き込まれる(`color`経由の更新だけがRGBを実際に書き込む、
`mesh/model.ts`)。

このリポジトリの実装は`model: { opacity: 1.0, ... }`と指定していた
ため、`opacity`の更新が引き金となり、COLOR_0(赤・グレー)が黒
(0,0,0)で上書きされていた。`color`や`normals`、`lit`をいくら
指定しても改善しなかったのは、この上書きが乗算の**手前**で頂点色
自体を潰していたため。

**対応**: `model.opacity`の指定を削除(デフォルトの1.0で十分)し、
代わりに`model.color`を明示的に白(`0xffffff`、乗算の恒等元)に
設定した([src/main.ts](src/main.ts))。`color`経由の更新はRGBを
正しく書き込む経路を通るため、glTF本来の色がそのまま反映される
はず。ローカルの`/tmp`スクラッチビルドで検証中。

**副次的な発見(未修正・報告候補)**:
- `ModelMaterial.color`のドキュメントは「a Color instance」とだけ
  あるが、WASM側の実体は`number`型
  (`@navaramap/engine/navara_wasm.d.ts`の`get color(): number |
  undefined`)。`@navaramap/three`独自の`Color`クラスのインスタンスを
  渡す前提で、素の`three`の`Color`を渡すと`instanceof`判定が外れて
  `(オブジェクト) >>> 0 === 0`となり、無言で黒になる。今回は
  `@navaramap/three`からimportしているため該当しなかったが、
  踏みやすい罠
- `modelBaseEnhancer/state.ts`の`DEFAULT_BASE_PROPS.color`は`0`
  (黒)がデフォルト。`model.color`を指定しないと黒tintが乗る

**D12(Brave針)についての仮説(Opus提供、未検証)**: NavaraはRTE
(relative-to-eye)座標を`position_3d_high`/`position_3d_low`に分割し、
`u_rteOne`(値1.0の意図的なuniform、コンパイラによる減算畳み込みを
防ぐための古典的防御)を使っている。Chromium/ANGLE(macOSではMetal
バックエンド)のシェーダ最適化がこの防御を破ると、特定の頂点だけ
精度崩壊で「針」になる、という説。Safari(WebKit独自のMetal変換パス)
では最適化が異なるため再現しない、という理解と整合する。他に
Braveが`WEBGL_debug_renderer_info`を隠蔽することでNavara側のGPU
tier判定(`three/src/device.ts`、`three/src/quality.ts`)が誤り、
低精度パスを選んでいる可能性も指摘された。Chrome/Firefoxでの検証は
まだ行っていない(Brave固有かChromium全般かの切り分けが最優先、
とのOpusの助言)。

**issue報告方針(Opus提案)**: D12・D13・上記「Colorの型不一致」を
1つにまとめず、3本に分けて報告する方が良いとのこと(サブシステムも
再現条件も異なるため)。詳細な報告文構成案あり、報告時に参照する。
