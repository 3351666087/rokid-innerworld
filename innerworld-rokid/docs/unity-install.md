# Unity Install Notes

## 2026-07-01

- Unity Hub installed via winget: `Unity.UnityHub 3.19.1`.
- Editor install path set to `C:\Users\33516\Unity\Hub\Editor` to avoid Program Files elevation friction during unattended work.
- Installing Unity `6000.3.19f1` with Android Build Support and child modules:

```powershell
cmd /c "cd /d C:\Program Files\Unity Hub && ""Unity Hub.exe"" -- --headless install --version 6000.3.19f1 --module android --childModules --errors"
```

Expected child modules include Android SDK/NDK tools, OpenJDK, CMake, and Android platforms/build tools.

Hub later reported `No modules found for this editor` because the editor was installed manually and then associated with Hub. The Android child modules are therefore installed with:

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run unity:android:install
```

That script downloads child module zips to:

```text
D:\Downloads\RokidCache\UnityAndroid
```

and installs them into:

```text
C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Data\PlaybackEngines\AndroidPlayer
```

This keeps large installers off C except for the final Unity installation.

## Cache Hygiene

C drive is tight and Unity/Android packages are large. Use these frequently:

```powershell
npm run cache:report
npm run cache:clean
```

`cache:clean` moves `C:\Users\33516\AppData\Roaming\UnityHub\downloads` into `D:\Downloads\RokidCache\UnityHubDownloads` and clears safe UnityHub logs/GPU cache. It does not delete the D cache or reported-only package caches.

## Download Recovery

Unity Hub repeatedly failed while downloading with `Request timeout` / `socket hang up`.

IDM is available at:

```text
C:\Program Files (x86)\Internet Download Manager\IDMan.exe
```

Unity Hub expected download directory:

```text
C:\Users\33516\AppData\Roaming\UnityHub\downloads
```

Verified complete and valid:

- `UnitySetup-Android-Support-for-Editor-6000.3.19f1.exe`
- `android-ndk-r27c-windows.zip`
- `cmake-3.22.1-windows.zip`
- `platform-tools_r36.0.0-win.zip`
- `commandlinetools-win-12266719_latest.zip`

The first IDM copy of `UnitySetup64-6000.3.19f1.exe` had the expected byte size but failed Authenticode verification with `HashMismatch`, so it was deleted and re-downloaded directly with IDM:

```powershell
& "C:\Program Files (x86)\Internet Download Manager\IDMan.exe" /d "https://download.unity3d.com/download_unity/7689f4515d75/Windows64EditorInstaller/UnitySetup64-6000.3.19f1.exe" /p "C:\Users\33516\AppData\Roaming\UnityHub\downloads" /f "UnitySetup64-6000.3.19f1.exe" /n
```

Required validation before installing:

```powershell
Get-AuthenticodeSignature "C:\Users\33516\AppData\Roaming\UnityHub\downloads\UnitySetup64-6000.3.19f1.exe"
Get-FileHash -Algorithm MD5 "C:\Users\33516\AppData\Roaming\UnityHub\downloads\UnitySetup-Android-Support-for-Editor-6000.3.19f1.exe"
```
