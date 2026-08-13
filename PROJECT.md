# 穿搭工作台 · 项目档案 (PROJECT.md)

> 给 AI 助手看的上下文文档。下次会话开头请先读此文件，可无缝接续需求/修 bug。
> 维护者：mg040754632-ship-it ｜ 最后更新见 git commit 历史。

## 一、项目概况
- **名称**：穿搭工作台 (Outfit Studio)
- **线上网址**：https://mg040754632-ship-it.github.io
- **技术栈**：纯静态站（HTML + CSS + 原生 JS，无框架无后端）
- **部署平台**：GitHub Pages（用户页，仓库名 `mg040754632-ship-it.github.io`，分支 `main`）
- **风格**：浅色简约风（米白底 + 暖米色 accent `#c9a27e`）
- **数据存储**：浏览器 `localStorage`（key=`outfit_studio_v1`），不跨设备、清缓存会丢

## 二、账号与凭证（仅记录用途，真实 token 不入库）
- **GitHub**：账号 `mg040754632-ship-it`，PAT 用于推送仓库（ghp_ 开头，用户私存）
- **Netlify**：账号 `mg040754632@gmail.com`，曾建站点 `outfit-studio-43147.netlify.app`
  - ⚠️ 该 Netlify 站点挂在 **team** 下，team 开启了 "Visitor access" 保护，所有站点返回 401，
    单站点 API 无法关闭。**因此弃用 Netlify，改用 GitHub Pages**。

## 三、已实现功能清单
1. **底部导航**：2 个图标 —— 穿搭方案(👗) / 个人主页(🙍)
2. **穿搭方案页**
   - 顶部长方形方格：最常穿的穿搭（每周更新，基于衣物库自动刷新 `refreshFavorite`）
   - 下方 4 个正方形方格：春/夏/秋/冬，点击查看该季穿搭
3. **个人主页**
   - 上传衣物：选相册图 → 前端抠图换白底(`removeBgToWhite`) → 归入 13 个分类之一
   - 搭配衣物：全屏页，左上小圆(☰)开分类侧栏(不盖满) → 点击分类显示下方衣物 →
     双击衣物弹删除键 → 上方白底画布拖拽组合 → 添加键选季节保存 → 右下完成键退出
   - 服饰库：13 个分类的图标+文字+数量，实时刷新
4. **返回键**：顶部 `←`（子页面显示）、上传弹层 `← 返回`、搭配页 `← 返回`，统一历史栈 `goBack`
5. **服饰分类（13 个）**：上衣、外套、裤子、裙子、腰带、项链、耳环、手链、手环、戒指、头饰、包包、其他
   - 饰品(项链/戒指/手链/手环/腰带/头饰/包包)上传均走白底抠图流程（`ACCESSORY_KEYS`）

## 四、文件结构
```
index.html            # 页面结构（含 cache-busting ?v= 版本号）
assets/css/style.css  # 浅色简约风样式
assets/js/data.js     # 数据层：CATEGORIES/SEASONS/ACCESSORY_KEYS + localStorage 读写
assets/js/app.js      # 主逻辑：导航/上传/搭配/返回栈/服饰库渲染
netlify.toml          # 备用部署配置（当前用 GitHub Pages，未启用）
PROJECT.md            # 本文件
```

## 五、已知限制 / 坑
- **前端抠图是近似算法**：只把"接近白色"的像素变透明，无法对复杂背景实拍图精准抠人。
  要精准抠图需后端 AI（如 rembg），超出纯静态站范围。
- **localStorage 不跨设备**：换手机/清缓存衣物库会重置。需跨设备同步要加后端。
- **GitHub Pages 缓存**：已用 `?v=` 版本号 + `no-cache` meta 解决手机不刷新问题。改 JS/CSS 后记得同步自增版本号。
- **"每周更新"是前端逻辑**：基于本地衣物库计算，无服务器定时任务。

## 六、本地预览 / 修改流程
```bash
cd 项目目录
python3 -m http.server 8088      # 本地预览 http://localhost:8088
# 改完代码后：git add -A && git commit && git push -f origin main
# GitHub Pages 自动构建（约 30-60 秒生效）
```
改 JS/CSS 后务必同步 `index.html` 里 `?v=` 的版本号（当前 v=3），否则用户端可能走缓存。

## 七、下次会话怎么接手
1. 读本文件 + `git log` 了解变更
2. 本地起服务复现 bug（用 playwright-core + /usr/bin/chromium 可做真实渲染验证）
3. 修完自增版本号、提交、推送
