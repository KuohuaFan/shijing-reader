# 詩經 · 線上讀本

一個以 React、TypeScript 與 Tailwind CSS 製作的《詩經》互動讀本。網站以「紙本經籍 × 現代編輯器」為設計方向，完整收錄今存 305 篇，並依國風、小雅、大雅、周頌、魯頌、商頌及其次分部編排。

## 主要功能

- 封面式進入體驗與沉浸式閱讀頁
- 六部分層目錄與 305 篇全文搜尋
- 原文、《毛詩序》與讀者札記分層
- 上一篇、下一篇、隨機篇章與網址錨點
- 收藏、本機自動儲存札記
- 瀏覽器中文語音朗讀
- 明暗模式、字級調整及橫排／直排切換
- 桌面、平板及手機響應式版面
- 列印友善樣式

## 開發

```bash
pnpm install
pnpm dev
```

正式檢查與建置：

```bash
node scripts/verify-data.mjs
pnpm check
pnpm build
```

## 內容編輯

完整說明見 [`CONTENT_GUIDE.md`](./CONTENT_GUIDE.md)。原文資料集中於 `client/src/data/shijing.ts`；古序資料集中於 `client/src/data/prefaces.ts`。資料與介面分離，校訂內容不需更改元件。

## 資料與授權

古典《詩經》文本屬公有領域。結構化原始資料取自 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry/tree/master/%E8%AF%97%E7%BB%8F)，依 MIT License 使用；傳統篇目名稱與分類另以[中文維基文庫《詩經》](https://zh.wikisource.org/zh-hant/%E8%A9%A9%E7%B6%93)交叉核對。詳見 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 實作原則

本專案借鑑參考網站的資訊架構，不直接複製其原始碼、版面數值或自撰內容。參考儲存庫未標示 SPDX 開源授權，且 README 明載程式碼、版面及自撰層為站方著作，因此本站採獨立程式、獨立視覺及另行核實之語料來源。
