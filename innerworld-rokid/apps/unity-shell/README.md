# Unity Shell

Unity Hub、Unity Editor `6000.3.19f1`、Android SDK/NDK/OpenJDK 和 Maven `3.9.16` 已安装。本目录预留给 Rokid AR Studio / Android / OpenXR 版本，当前先提供 Windows 与 Android fallback。

## Runtime Config

最终生效优先级：

1. 命令行：`--innerworld-api=http://<host>:5177`、`--innerworld-space=innerworld_campus_wall`
2. 环境变量：`INNERWORLD_API_BASE_URL`、`INNERWORLD_SPACE_ID`
3. 持久化配置：`Application.persistentDataPath\innerworld-config.json`
4. Windows/编辑器包内配置：`Assets\StreamingAssets\innerworld-config.json`
5. Android 兜底配置：`Assets\Resources\innerworld-config.json`
6. Inspector 默认值：`http://localhost:5177`

更新包内配置：

```powershell
npm run unity:config -- http://localhost:5177
npm run unity:config -- http://<Windows主控机IP>:5177
```

Windows fallback 运行在主控机上时可以用 `localhost`；Android/Rokid 真机必须使用 Windows 主控机局域网 IP，并让服务用 `npm run dev:lan` 启动。

Windows fallback 已做过可视验收：三锚点可见，HUD 显示 localhost 状态，键盘 `Space, Space, S, W, B, R` 可走完写回和 User B 读取闭环。运行时材质使用可用 shader 查找和默认材质兜底，避免 Player 中 `Shader.Find("Standard")` 为空导致粉墙或 Awake 中断。

## Android Network

`Assets\Plugins\Android\InnerWorldNetwork.androidlib` 提供 Android manifest 合并项：

- `android.permission.INTERNET`
- `android:usesCleartextTraffic=true`
- `android:networkSecurityConfig=@xml/innerworld_network_security_config`

当前 APK 已用 `aapt` 验证这些字段存在。正式上公网服务时再切 HTTPS。

## Batchmode

验证场景：

```powershell
& "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe" `
  -batchmode -nographics -quit `
  -projectPath "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell" `
  -executeMethod InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.ValidateScene `
  -logFile "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-validate-scene.log"
```

构建 Windows fallback：

```powershell
& "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe" `
  -batchmode -nographics -quit `
  -projectPath "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell" `
  -executeMethod InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.BuildWindowsFallback `
  -logFile "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-build-windows.log"
```

输出：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-windows\InnerWorldRokid.exe`

构建 Android fallback：

```powershell
$unity = "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe"
$args = @(
  "-batchmode", "-nographics", "-quit",
  "-projectPath", "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell",
  "-executeMethod", "InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.BuildAndroidFallback",
  "-logFile", "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-build-android.log"
)
$p = Start-Process -FilePath $unity -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
exit $p.ExitCode
```

输出：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-android\InnerWorldRokid.apk`
