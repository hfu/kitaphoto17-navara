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
