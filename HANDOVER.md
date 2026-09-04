# HANDOVER

現在の状態のスナップショット。詳しい経緯・根拠は[DECISIONS.md](DECISIONS.md)を参照。

## 状態

- リポジトリ構成(Vite + `@navaramap/three`)は実装済み: [index.html](index.html), [src/main.ts](src/main.ts), [vite.config.ts](vite.config.ts)
- `npm run build` は成功し `docs/` を生成できる(D3, D4)
- ローカルのBrowser paneプレビューでは画面が黒くなり `Invariant failed` が出るが、navara.world公式サンプルでも同一環境で同じ症状が再現したため、実装バグではなくBrowser pane側のWebGL制約と判断済み(D6)。**実ブラウザでの最終確認が未完了**
- GitHubリポジトリ `hfu/kitaphoto17-navara` は存在し、`LICENSE`(CC0, hfuさんが直接追加)がpush済み。それ以外のファイル(このセッションで作成した分)は**まだpushしていない**
- GitHub PagesのSource設定(main branch, /docsフォルダ)は**まだ未設定**

## 次にやること

1. 実ブラウザ(ユーザーのMac上の通常のChrome/Safari等)で `npm run dev` または `npm run preview` を開き、kitaphoto17が実際に表示されるか確認する
2. 問題なければ、このセッションで作成したファイル一式をコミット・push(hfuさんの確認を得てから)
3. GitHub Pagesの公開設定(Settings → Pages → Source: Deploy from a branch → `main` / `/docs`)を行う
4. 公開後、`https://hfu.github.io/kitaphoto17-navara/` で最終確認

## 知見の共有元

- cafebabeセッション(dwg7/cafebabe)に、HANDOVER/DECISIONS運用の慣習と、
  Navaraのバンドルサイズに関する知見(D未記載、詳細はDECISIONS.mdでなく
  会話ログ参照)を共有済み。cafebabe側は `patterns/large-data-pitfalls.md`
  に反映しpush済み。
