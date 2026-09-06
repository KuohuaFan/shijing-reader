# 《詩經》線上讀本 GitHub Pages 移轉交付文件

**交付日期：** 2026-09-07  
**專案擁有者：** KuohuaFan  
**文件作者：** Manus AI

## 一、交付結論

《詩經》線上讀本已轉換為可由 GitHub Pages 獨立託管的靜態網站。專案不再依賴 Manus 私有素材代理；首頁水墨背景及透明蘆葦裝飾均已存入儲存庫，並針對網頁傳輸壓縮。GitHub Actions 會在 `main` 分支每次更新後，自動檢查 305 篇資料、執行 TypeScript 檢查、產生正式網站並發布至 GitHub Pages。[1] [2]

| 交付項目 | 位置 | 狀態 |
| --- | --- | --- |
| GitHub 儲存庫 | `https://github.com/KuohuaFan/shijing-reader` | 已建立 |
| GitHub Pages | `https://kuohuafan.github.io/shijing-reader/` | 自動部署 |
| 預設分支 | `main` | 已設定 |
| 自動部署 | `.github/workflows/deploy-pages.yml` | 已設定 |
| 內容編輯指南 | `CONTENT_GUIDE.md` | 已交付 |
| 第三方授權 | `THIRD_PARTY_NOTICES.md` | 已交付 |
| 資料驗證程式 | `scripts/verify-data.mjs` | 已交付 |

### 正式部署驗收紀錄

GitHub Actions 執行編號 **34052826697** 已於 2026-09-07 完成，`build` 與 `deploy` 兩個工作均為成功。正式網站已在 `https://kuohuafan.github.io/shijing-reader/` 提供服務；首頁、JavaScript、CSS、水墨背景與透明蘆葦素材均回傳 HTTP 200。

線上互動驗收亦已完成。首頁可進入閱讀器；目錄顯示 305 篇；搜尋「蒹葭」會縮減為單一結果；選取後網址更新為 `?read=1#poem-129`，並正確顯示〈蒹葭〉三章全文。

## 二、部署方案

GitHub Pages 可直接從分支檔案發布，也可由 GitHub Actions 先建置再發布。官方文件支援自訂 Actions 工作流程，並提供 `configure-pages`、`upload-pages-artifact` 與 `deploy-pages` 等官方 Actions。[1]

| 方案 | 取捨 | 成本 | 設定複雜度 |
| --- | --- | --- | --- |
| GitHub Actions 自動建置 | 原始碼與產物分離；每次推送前自動驗證；最適合 Vite 專案 | 公開儲存庫通常無額外費用，受 GitHub 方案與 Actions 配額約束 | 中 |
| `gh-pages` 分支存放建置產物 | 機制較直觀，但會增加產物分支與人工同步風險 | 公開儲存庫通常無額外費用 | 低至中 |

本專案採用 **GitHub Actions 自動建置**。理由是它會在發布前執行資料與型別檢查，並保留每次部署紀錄；這比直接提交 `dist` 目錄更適合需要持續校訂古籍內容的專案。

## 三、技術調整

### 3.1 GitHub Pages 子路徑

GitHub 專案網站位於 `/shijing-reader/` 子路徑。`vite.config.ts` 在 GitHub Actions 環境將 `base` 設為 `/shijing-reader/`，確保 JavaScript、CSS 及圖片連結不會錯誤指向網域根目錄。

### 3.2 靜態素材

原版 WebDev 預覽使用 `/manus-storage/` 私有代理。GitHub Pages 無法使用此代理，因此素材已遷移至：

```text
client/public/assets/shijing-hero.webp
client/public/assets/shijing-reeds.png
```

首頁背景由約 5.4 MB 降至約 179 KB；透明裝飾由約 4.5 MB 降至約 647 KB。透明裝飾保留 PNG 格式，避免透明邊緣產生彩色壓縮暈邊。

### 3.3 自動部署工作流程

每次推送至 `main` 時，工作流程依序完成下列程序：

1. 取出儲存庫原始碼。
2. 安裝 pnpm 10.4.1 與 Node.js 22。
3. 使用鎖定檔安裝套件。
4. 執行 `node scripts/verify-data.mjs`，確認篇數、篇次與六部分布。
5. 執行 `pnpm check`，確認 TypeScript 無錯誤。
6. 執行 `pnpm build:web`，建立靜態網站。
7. 上傳 `dist/public` 並部署至 GitHub Pages。

`pages: write` 與 `id-token: write` 權限只授予工作流程本身；網站前端不含 GitHub 權杖或其他密鑰。

## 四、日常內容維護

經文位於 `client/src/data/shijing.ts`。每篇資料包含 `id`、`title`、`chapter`、`section` 與 `stanzas`。修改篇章時應保留既有 `id`，因為收藏、札記及網址錨點均以此識別篇章。古序位於 `client/src/data/prefaces.ts`；尚未核對的內容應保持空白，不應用生成文字替代校勘。

完成修改後，在本機執行：

```bash
node scripts/verify-data.mjs
pnpm check
pnpm build:web
```

確認通過後提交：

```bash
git add .
git commit -m "更新：說明本次修改"
git push origin main
```

GitHub Actions 隨後會自動更新正式網站。若只在 GitHub 網頁介面直接編輯檔案，提交至 `main` 也會觸發相同流程。

## 五、部署狀態檢查

進入儲存庫的 **Actions** 頁面，開啟最新的「Deploy to GitHub Pages」執行紀錄。綠色勾號代表建置及發布均成功。GitHub Pages 設定可在 **Settings → Pages** 查看；發布來源應為 **GitHub Actions**。[2]

一般發布在工作流程完成後仍可能需要短暫快取更新。可使用無痕視窗，或在網址後加入版本查詢參數，例如 `?v=2`，確認取得最新頁面。

## 六、常見問題與處理

| 狀況 | 原因 | 處理方式 |
| --- | --- | --- |
| 網站顯示 404 | Pages 尚未啟用，或工作流程仍在執行 | 查看 Actions，再確認 Settings → Pages 為 GitHub Actions |
| 頁面有文字但無樣式 | Vite `base` 與儲存庫名稱不一致 | 儲存庫若改名，同步修改 `vite.config.ts` 的 `/shijing-reader/` |
| 圖片無法載入 | 使用了 `/manus-storage/` 或錯誤根路徑 | 圖片應存放於 `client/public/assets`，程式使用 `import.meta.env.BASE_URL` |
| Actions 安裝失敗 | 鎖定檔與 `package.json` 不一致 | 本機執行 `pnpm install`，提交更新後的 `pnpm-lock.yaml` |
| 資料驗證失敗 | 篇數、篇次或分部數量被改動 | 檢查 `shijing.ts`，維持 305 篇與連續 `id` |
| 收藏或札記消失 | 瀏覽器網站資料被清除，或網域／路徑更換 | 本功能使用 `localStorage`；正式改網域前應另行設計匯出功能 |

## 七、版本回復

GitHub Pages 每次發布均對應一個 Git commit。若新版本有問題，建議使用 `git revert` 建立反向提交，而不要改寫公開歷史：

```bash
git log --oneline
git revert <有問題的提交雜湊>
git push origin main
```

推送後，GitHub Actions 會把回復後版本重新發布。這種做法保留完整稽核軌跡，適合法律、文獻及內容校訂專案。

## 八、移轉驗收標準

| 驗收項目 | 標準 |
| --- | --- |
| 原始碼可取得 | GitHub 儲存庫可正常瀏覽與 clone |
| 自動部署 | `main` 推送後 Actions 自動建置與發布 |
| 正式網站 | GitHub Pages URL 回傳成功且首頁可見 |
| 路徑 | CSS、JavaScript、首頁背景及裝飾素材均載入 |
| 資料 | 305 篇，篇次 1 至 305 連續，六部分布正確 |
| 互動 | 搜尋、篇章切換、收藏、札記、朗讀、明暗模式可用 |
| 響應式 | 桌面與手機寬度正常呈現 |
| 授權 | 專案授權與第三方來源說明完整保留 |

## 九、安全與維護注意事項

本專案是純靜態網站，不包含伺服器端金鑰、帳號資料庫或管理後台。GitHub Pages 公開發布代表儲存庫內容及網站均可被任何人讀取。不得把 API 金鑰、密碼、私人資料或未獲授權的文本提交至儲存庫。若未來加入 AI 問答或會員同步，必須另建安全的伺服器端點，不能把供應商金鑰寫入前端程式。

## References

[1]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages "Using custom workflows with GitHub Pages"
[2]: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site "Configuring a publishing source for your GitHub Pages site"
[3]: https://github.com/chinese-poetry/chinese-poetry/tree/master/%E8%AF%97%E7%BB%8F "chinese-poetry 詩經資料集"
[4]: https://zh.wikisource.org/zh-hant/%E8%A9%A9%E7%B6%93 "中文維基文庫《詩經》"
