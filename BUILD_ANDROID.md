# 📱 安卓 App 打包指南(Android Build Guide)

本仓库自带一套 [Capacitor](https://capacitorjs.com/) 工程,可以把根目录的交互式浏览器连同 **全部 1,324 个 GIF 动画、1,324 张缩略图、10 种语言的动作说明** 打包成一个完全离线的安卓应用。

- 应用名:**哈哈健身**(界面默认简体中文,弹窗内步骤可切换 10 种语言)
- 应用标识:`com.example.exercises`
- 资源嵌入方式:GIF 以**原始字节**打入 APK,不做任何压缩、重编码,画质与仓库源文件逐字节一致
- 产物体积:约 142 MB(debug APK)

安卓侧已做原生适配,不是简单的网页套壳:

| 适配项 | 说明 |
|---|---|
| 中文界面 | 全部界面文字(分类/器械/目标肌群/提示语)已翻译;枚举值中文映射见 `app/zh-dict.json`,缺失值构建时会报错而不是悄悄漏翻 |
| 默认语言 | 动作步骤默认展开「简体中文」标签,可切换其他 9 种语言 |
| 硬件返回键 | 弹窗打开时先关弹窗;主界面连按两次退出并给出 toast 提示(`app/app.js`) |
| 竖屏锁定 | `AndroidManifest.xml` 固定 portrait |
| 启动屏 | 品牌橙底 + 哑铃 + 应用名,替换了全部 11 个 `splash.png` |
| 应用图标 | 自适应图标(前景哑铃 + 品牌色背景),由 `scripts/generate-app-assets.py` 生成 |
| 状态栏/导航栏 | 浅灰底、深色图标,与页面主题一致,启动无白屏闪烁 |
| 网页感去除 | 移除 "DB Setup" 开发者入口(避免 WebView 唤起外部浏览器)、锁定页面缩放、禁用橡皮筋回弹与长按选中(`app/app.css`) |

## 1. 环境要求

| 组件 | 版本要求 | 说明 |
|---|---|---|
| Node.js | ≥ 20 | 含 npm |
| JDK | 21(Temurin 等均可) | 需设置 `JAVA_HOME` |
| Android SDK | Platform 36 + Build-Tools 35.0.0 + Platform-Tools | 装 [Android Studio](https://developer.android.com/studio) 最省事,SDK 默认在 `%LOCALAPPDATA%\Android\Sdk` |

不想装 Android Studio 的话,也可以只用命令行工具:下载 [commandline-tools](https://developer.android.com/studio#command-line-tools-only) 后执行

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;35.0.0"
```

SDK 路径通过环境变量 `ANDROID_HOME` 或 `android/local.properties`(`sdk.dir=D:/path/to/sdk`)告知 Gradle。

## 2. 一键打包

在仓库根目录执行:

```bash
npm install
npm run apk
```

`npm run apk` 会依次完成三件事:

1. `npm run www` — 把 `index.html`、`setup.html`、`data/`、`images/`、`videos/` 拷贝到 `www/`(由 `scripts/prepare-www.mjs` 完成,跨平台);
2. `npx cap sync android` — 把 `www/` 同步进安卓工程资源目录;
3. `cd android && gradlew assembleDebug` — Gradle 构建出 APK。

产物位置:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

> macOS / Linux 用户请把 `package.json` 中 `apk` 脚本里的 `gradlew` 换成 `./gradlew`,或直接按下面的手动步骤执行。

## 3. 手动分步(与一键打包等价)

```bash
npm install           # 安装 Capacitor 依赖
npm run www           # 生成 www/
npx cap sync android  # 同步进安卓工程
cd android
./gradlew assembleDebug   # Windows 用 gradlew 或 gradlew.bat
```

## 4. 安装到手机

把 APK 传到手机(数据线、网盘、IM 均可),点击安装,首次需在系统设置中允许「安装未知来源应用」。安装后**完全离线可用**,不需要任何网络与服务器。

## 5. 常用自定义

| 想改什么 | 改哪里 |
|---|---|
| 应用名称 | `android/app/src/main/res/values/strings.xml` 的 `app_name`(同时更新根目录 `capacitor.config.json` 的 `appName`) |
| 应用图标 / 启动屏 | 修改 `scripts/generate-app-assets.py` 后运行 `python scripts/generate-app-assets.py`(需 Pillow) |
| 中文翻译 | `app/zh-dict.json`(数据值)与 `scripts/prepare-www.mjs`(界面文字);补充映射后重新 `npm run apk` 即可 |
| 原生交互(返回键等) | `app/app.js` |
| 版本号 | `android/app/build.gradle` 的 `versionCode` / `versionName`,及根目录 `package.json` 的 `version` |
| 应用标识 | `capacitor.config.json` 的 `appId`(改动后需删除 `android/` 重新 `npx cap add android`) |

## 6. 构建管线说明

`npm run apk` 的内部流程:

```
scripts/prepare-www.mjs   读取仓库根目录原版 index.html,生成 www/:
  ├─ 数据中文化(部位/器械/目标肌群等 9,000+ 处,基于 app/zh-dict.json)
  ├─ 界面文字中文化(逐项断言,源页面改版会显式报错)
  ├─ 移除 DB Setup 开发者功能(HTML + JS)
  └─ 注入 app/app.css(移动端原生化样式)与 app/app.js(返回键等原生交互)
npx cap sync android      www/ 同步进安卓工程,注册原生插件
cd android && gradlew assembleDebug
```

- `www/` 与 `android/app/src/main/assets/public/` 都是**构建生成物**,已加入 `.gitignore`,不要手工修改;任何改动都应发生在仓库根目录或 `app/`,再重新打包。
- 仓库根目录的 `index.html` 始终保持英文原版,转换只发生在构建产物中,便于合并上游更新。

## 7. 注意事项

- 源数据 GIF 为 180×180,这是数据集自带的最高清晰度;如需更高清动画,保持同名覆盖 `videos/` 下的对应文件后重新打包即可。
- 本指南产出的是 **debug 签名** APK,适合自用与分发安装;如需上架应用商店,需另外生成 keystore 并构建签名 release 包(`./gradlew assembleRelease`),本文不展开。
- 首次构建时 Gradle 会自动下载 Gradle 发行版与依赖(约 300 MB),请保持网络畅通。
