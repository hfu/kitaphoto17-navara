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
kitaphoto17タイル(北海道・北方領土の空中写真)が正しくレンダリングされることを
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
