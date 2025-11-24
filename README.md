# YouTube 高點閱影片搜尋器

一個用來尋找 YouTube 影片中點閱率超過 1 億且頻道名稱包含 "making" 的搜尋工具。

## 功能特點

- 🔍 **智慧搜尋**：使用 YouTube Data API 進行影片搜尋
- 📊 **點閱率過濾**：只顯示點閱率超過 1 億的影片
- 🎯 **頻道過濾**：只顯示頻道名稱包含 "making" 的影片
- ⚡ **高效限制**：每次搜尋最多發送 50 個 API 請求
- 🎨 **美觀介面**：使用 Material-UI 建置的現代化前端介面

## 技術架構

- **後端**：Node.js + Express
- **前端**：React + Material-UI
- **API**：YouTube Data API v3

## 快速開始

### 1. 安裝依賴項

```bash
# 安裝後端依賴項
npm install

# 安裝前端依賴項
npm run install:frontend
```

### 2. 設定 API 金鑰

確保 `key.env` 檔案中包含有效的 YouTube Data API 金鑰：

```
AIzaSyCR5TNSzSDe5T0bJk16H9_oz1QSZsTX3CI
```

### 3. 運行應用程式

```bash
# 啟動後端服務器
npm start

# 或者開發模式
npm run dev
```

應用程式將在 `http://localhost:3001` 上運行。

### 4. 建置前端（生產環境）

```bash
# 建置前端
npm run build:frontend

# 或者同時建置前端和後端
npm run build
```

## 使用方法

1. 在搜尋框中輸入關鍵字
2. 點擊「搜尋」按鈕
3. 系統會自動過濾出：
   - 點閱率超過 1 億的影片
   - 頻道名稱包含 "making" 的影片
4. 點擊「觀看影片」按鈕在新分頁中開啟 YouTube 影片

## API 端點

- `GET /api/search?query={關鍵字}&maxResults={數量}` - 搜尋影片
- `GET /api/health` - 健康檢查

## 注意事項

- 請確保 YouTube Data API 金鑰有效且有足夠的配額
- API 請求有速率限制，請適度使用
- 搜尋結果會按點閱率降序排列

## 開發

### 後端開發

```bash
npm run dev
```

### 前端開發

```bash
npm run dev:frontend
```

## 授權

ISC License
# youtube-finder-100m
