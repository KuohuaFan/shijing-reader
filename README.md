# 詩經 · 線上讀本

一個以 React、TypeScript 與 Tailwind CSS 製作的《詩經》互動讀本。網站以「紙本經籍 × 現代編輯器」為設計方向，完整收錄今存 305 篇，並依國風、小雅、大雅、周頌、魯頌、商頌及其次分部編排。

## 線上網站

GitHub Pages：<https://kuohuafan.github.io/shijing-reader/>

原始碼儲存庫：<https://github.com/KuohuaFan/shijing-reader>

## 主要功能

本站提供封面式進入體驗、六部分層目錄、305 篇全文搜尋、風／雅／頌體例篩選、愛情／農事／征役／祭祀／宴飲／思歸內容主題交叉篩選、原文與古序分層、篇章固定連結、收藏、本機札記、瀏覽器中文朗讀、明暗模式、字級調整、橫排／直排切換、響應式版面及列印樣式。SEO 層包含首頁與 305 篇獨立 canonical 網址、`sitemap.xml`、`robots.txt`、每篇專屬 1200 × 630 社群分享圖，以及包含修改日期與數位校訂者的 WebSite、CollectionPage、Book、CreativeWork、BreadcrumbList JSON-LD。

## 本機開發

```bash
pnpm install
pnpm dev
```

重新產生搜尋引擎索引檔：

```bash
pnpm generate:seo
```

原文、篇目或版次更新後，重新產生 305 張社群分享圖：

```bash
pnpm generate:social
```

正式檢查與建置：

```bash
node scripts/verify-data.mjs
pnpm check
pnpm build:web
```

## GitHub Pages 自動部署

`.github/workflows/deploy-pages.yml` 會在每次推送至 `main` 分支後執行資料完整性檢查、TypeScript 檢查、Vite 建置及 GitHub Pages 發布。一般內容維護只需提交並推送：

```bash
git add .
git commit -m "更新詩經內容"
git push origin main
```

GitHub Actions 完成後，正式網站會自動更新。部署狀態可在儲存庫的 **Actions** 頁面查看。

## 內容編輯

完整說明見 [`CONTENT_GUIDE.md`](./CONTENT_GUIDE.md)。原文資料集中於 `client/src/data/shijing.ts`；古序資料集中於 `client/src/data/prefaces.ts`；體例與內容主題索引集中於 `client/src/data/topics.ts`；校訂者、版本與最後修改日期集中於 `client/src/data/edition.ts`。資料與介面分離，校訂內容不需更改元件。

## 資料與授權

古典《詩經》文本屬公有領域。結構化原始資料取自 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry/tree/master/%E8%AF%97%E7%BB%8F)，依 MIT License 使用；傳統篇目名稱與分類另以[中文維基文庫《詩經》](https://zh.wikisource.org/zh-hant/%E8%A9%A9%E7%B6%93)交叉核對。詳見 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 實作原則

本專案借鑑參考網站的資訊架構，不直接複製其原始碼、版面數值或自撰內容。參考儲存庫未標示 SPDX 開源授權，且 README 明載程式碼、版面及自撰層為站方著作，因此本站採獨立程式、獨立視覺及另行核實之語料來源。
