# 📱 安卓 App 打包指南(Android Build Guide)

本仓库自带一套 [Capacitor](https://capacitorjs.com/) 工程,可以把根目录的交互式浏览器(`index.html`)连同 **全部 1,324 个 GIF 动画、1,324 张缩略图、10 种语言的动作说明** 打包成一个完全离线的安卓应用。

- 应用名:**哈哈健身**
- 应用标识:`com.example.exercises`
- 资源嵌入方式:GIF 以**原始字节**打入 APK,不做任何压缩、重编码,画质与仓库源文件逐字节一致
- 产物体积:约 142 MB(debug APK)
- 当前版本:1.0.0

---

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
| 应用图标 | `android/app/src/main/res/mipmap-*/ic_launcher.png` |
| 版本号 | `android/app/build.gradle` 的 `versionCode` / `versionName`,及根目录 `package.json` 的 `version` |
| 应用标识 | `capacitor.config.json` 的 `appId`(改动后需删除 `android/` 重新 `npx cap add android`) |

改完资源后重新执行 `npm run apk` 即可。

## 6. 注意事项

- `www/` 与 `android/app/src/main/assets/public/` 都是**构建生成物**,已加入 `.gitignore`,不要手工修改;任何改动都应发生在仓库根目录,再重新 sync。
- 源数据 GIF 为 180×180,这是数据集自带的最高清晰度;如需更高清动画,保持同名覆盖 `videos/` 下的对应文件后重新打包即可。
- 本指南产出的是 **debug 签名** APK,适合自用与分发安装;如需上架应用商店,需另外生成 keystore 并构建签名 release 包(`./gradlew assembleRelease`),本文不展开。
- 首次构建时 Gradle 会自动下载 Gradle 发行版与依赖(约 300 MB),请保持网络畅通。
