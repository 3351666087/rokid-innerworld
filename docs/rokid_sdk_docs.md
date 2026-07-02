# Rokid AR SDK Guidelines / Documentation

## 内置组件 RKCameraRig
**Document ID:** 6dcd1f2ae78b4b4fb9487f0b7c09fb83 | **Tags:** 

描述 该组件主要是内置了我们渲染,场景,设备的设置以及我们推荐的默认设置 如何使用 将 RKCameraRig 预制体拖放到场景层级中 加载路径 ’ Rokid Unity XR SDK/Runtime/Resources/Prefabs/BaseSetting/RKCameraRig’ 脚本属性设置&说明 RKCameraRig HeadTrackingType (头部追踪类型) Rotatio

---

## 多模态交互
**Document ID:** aba4bdf9a1c04d5fb7906b32a22a8dd7 | **Tags:** 多模态交互，手势追踪，3Dof射线,

使用多模态交互 在使用多模态交互之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。 UXR2.0 SDK 支持多模态交互，用户可以使用手势、3DoF 射线、Mouse、TouchPad交互等。 注意：手势交互依赖于Max Pro眼镜。 注意：TouchPad交互依赖于Station2空间计算设备。 使用多模态交互，需要在在项目的Project 中搜索RK

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/RKInput.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E6%89%8B%E5%8A%BF.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB3DoF%E5%B0%84%E7%BA%BF.png

---

## 多模态交互调试工具
**Document ID:** 86cfbfb241284f1f89191ba7db715337 | **Tags:** 模拟交互

我们增加调试模式，目的是为了,在开发开发交互的时候减少真机调试,提高开发者的开发调试效率。 手势调试指南 鼠标调试指南 射线调试指南

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/gestrue.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/mouse.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/3DoFRay.png

---

## 前言
**Document ID:** dee3c19b964c451ea1c8974b05a464b3 | **Tags:** 

YodaOS Master 定位 面向广大消费者的 AR Glass 操作系统，以办公、游戏、观影等为主要场景，打造虚实融合的自然交互 3D 世界。支持第三方开发者自行设计&开发。 为什么需要设计Guideline ? 产品体验一致性 通过设计Guideline，统一RokidGlass 产品体验及风格，保证在任何时候用户能够获得一致的体验感； 支持第三方开发者 将我们长久以来积累的AR设计&开发

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg

---

## XR 空间
**Document ID:** 22406de3ab224b2ebac95d79dd343830 | **Tags:** 

DoF 介绍 DoF（Degree of Freedom） 指的是物体在空间中的自由度。 通常意义上，物体在空间中可以通过位置（Position）、姿态（Rotation）来定量表述其位姿（Pose）。 那么在表述物体在空间中移动时，就可以将物体的移动分解为：位移、姿态。那么在XYZ 坐标系下，位移可以表征为X 轴偏量、Y轴偏量、Z轴偏量，旋转可以表征为X轴旋转角度（Pitch 俯仰角）、Y轴旋转

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_0DOF.gif
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_3DOF.gif
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_6DOF.gif

---

## 平面检测
**Document ID:** c9cbc92ff5e149df88152e5094b281c0 | **Tags:** 

使用平面检测 在使用平面检测之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。并确保已经了解如何使用Rokid 多模态交互。 注意：手势交互、平面检测均依赖Rokid Max Pro眼镜。 1 快速实现平面检测 本章介绍，如何快速实现平面检测，并在检测出的平面上通过交互放置。 1.1 构建标准6DoF 场景 按照6DoF空间章节中介绍的方式，构建一个标准

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane02.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager1.jpg

---

## 自定义手势
**Document ID:** 8869a42f3935436e90bead5e2c79fb73 | **Tags:** RKHand，远近场切换，关节点数据

本章节是手势相关内容，默认开发者已经导入接入RKInput 组件，并将多模态交互设置为Gesture。 注意：手势交互依赖于Max Pro眼镜。 自定义手势组件 默认情况下我们只需要设置RKHand,默认初始化交互器类型和默认激活类型,各个模块的交互器类型,将通过脚本自动加载 我们想要修改交互以RKHand为例,我们有几种方式重置交互器的默认加载 我们可以将RKHand的预制体拖拽到场景层级试图中

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%89%8B%E6%8E%8C.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png

---

## 获取设备硬件信息
**Document ID:** 97d436b8453d4683beb217b8632cb7c5 | **Tags:** 眼镜亮度，音量，按键键值

获取基础信息 Rokid 为开发者提供NativeInterface.NativeAPI，为开发者提供了硬件设备信息。 public void GetHardwareInfo()
{
    //Get Glass Name
    NativeInterface.NativeAPI.GetGlassName();
    //Get SN of Glass
    NativeInterface

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png

---

## 硬件设备信息
**Document ID:** edad99316a8b446ea5b16e7fc171baf3 | **Tags:** 

Rokid 眼镜硬件信息 Air Air Pro+ Max Max Pro Max 2 FOV 35.2(H)/22(V) 35.2(H)/22(V) 40(H) 22(V) 40(H) 25(V) 40(H) 25(V) 分辨率 1920*1080 px 1920*1080px 1920*1080px 1920*1200px 1920*1200px 摄像头 无 有，可支持6DoF空间、2D手势、

---

## 0DoF 空间
**Document ID:** 7ab6a21f081a4512898039668ce84702 | **Tags:** 

本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK 构建场景 在《设计规范》中，介绍了0DoF 空间的使用场景。这里以一个图片展示为例。 &#10; 1 新建场景 新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial0DoF。 2 替换MainCamera 双击打开场景，删除默认的MainC

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201171930689.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172216129.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 RKInput
**Document ID:** de536667a78446c3a88e664677a479bd | **Tags:** 

描述 UXR 内控制交互模块的基础管理组件,管理输入事件模块的生命周期:输入模块的初始化、激活、销毁、动态切换等 如何使用 将 RKInput 预制体拖放到场景层级中 加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/RKInput/[RKInput] 脚本属性设置&说明 InputModuleManager 用于管理交互模块的切换,并且通过状态机

---

## 图像识别
**Document ID:** ae1e0bbdd1044a4fb69530c3c943d9c3 | **Tags:** 

使用图像识别 在使用图像识别之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。 注意：图像识别均依赖Rokid Max Pro眼镜。 &#10; 1 快速实现图像识别 本章介绍，如何快速实现图像识别功能。 Rokid 图像识别功能基于Rokid XR Extension 插件。导入方法： 打开【Package Manager】，并通过add packag

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/extension_input.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg
- https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/img_createlib.png

---

## 离线语音指令交互
**Document ID:** 46ad4753629549f5afad0defbf54fdb5 | **Tags:** 离线语音

本指南介绍如何在 Unity 项目中集成 Rokid 提供的离线语音识别功能，支持通过自定义语音指令与应用交互。此文档涵盖了所需的环境配置、集成步骤以及示例代码。 一、环境配置 1. 启用自定义 Gradle 模板 在 Unity 菜单栏中选择 Edit > Project Settings。 进入 Player > Publishing Settings，找到 Build 部分。 勾选以下选项：

**Images:**
- https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/voice_publishing_settings.jpg

---

## 获取SLAM 相关信息
**Document ID:** 9645493d31b64917942723d387756ed8 | **Tags:** 点云接驳

获取SLAM 状态 Rokid 为开发者提供了SLAM 状态获取接口。通过接口NativeInterface.NativeAPI.GetHeadTrackingStatus()，返回值为HeadTrackingStatus 类型。 HeadTrackingStatus status = NativeInterface.NativeAPI.GetHeadTrackingStatus();
Nativ

---

## 3DoF 空间
**Document ID:** 2ae7a721b99444239ea901292a5b004b | **Tags:** 

本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK 构建场景 在《设计规范》中，介绍了3DoF 空间的使用场景。这里以一个图片环廊为例。 &#10; 1 新建场景 新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial3DoF。 2 替换MainCamera 双击打开场景，删除默认的MainC

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132509933.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132555324.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 RKHand
**Document ID:** 9470c1e8a8e34ea5923348d0717585ba | **Tags:** 远近场交互，手势Mesh

描述 手势交互的基础组件,包含手势的远场交互(RayInteractor),近场交互(PokeInteractor),手势 Mesh 的渲染等。 如何使用 如果你想自定义手势的样式和交互的话,可以将 RKHand 预制体拖拽到场景中,然后修改预制体。 加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/Interactor/RKHand 组件层

---

## 内置组件 PointableUI
**Document ID:** c8e5fb6bd6cd40a3ba0db1169300c5a2 | **Tags:** 

描述 基础空间平面 UI 交互组件 如何使用 将 PointableUI 预制体拖放到场景层级中 加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI 组件层级说明 PointableUI Unity Canvas (Unity 画布, 使用方式和 UGUI 相同) PlaneSurface (平面

---

## 人眼生理特征
**Document ID:** 680acadaef874bd08af3627f081ba8f7 | **Tags:** 人眼特性、视场角、视力

人眼的可视范围 人眼的可视范围虽然很大，但是文字/符号的阅读范围是比较集中的。 目前 Rokid 的 AR 眼镜 FOV 还未超出文字/符号识别区域，所以不需要考虑信息面板过长，不利于阅读的情况。 辐辏调节冲突 辐辏（Vergence）是指通过眼球旋转，使图像在不同距离汇聚起来，帮助用户感知物体深度。调焦（Accommodation）指的是当注视物体时，眼部肌肉引起晶状体拉伸或放松，使光线聚焦到视

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2042.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%203.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%202.png

---

## 6DoF 空间
**Document ID:** 2349f61a2ba543aa9c0f94650a23e385 | **Tags:** 

本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK 构建场景 在《设计规范》中，介绍了6DoF 空间的使用场景。这里以一个简单的空间为例。 注意：6DoF 场景仅适用于Max Pro眼镜。 &#10; 1 新建场景 新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial6DoF。 2 替换Ma

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204142957473.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143045930.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 PointableUICurve
**Document ID:** 37ac8f2486bb416abc96513c69c6f52d | **Tags:** 曲面UI

描述 基础空间曲面 UI 交互组件 如何使用 将 PointableUI 预制体拖放到场景层级中 加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI_Curve 组件层级说明 PointableUI Canvas Mesh (处理曲面画布的渲染) Unity Canvas (Unity 画布, 使

---

## 视觉设计
**Document ID:** 7fe63b80a6ca4140a9d7c5898e9eaf40 | **Tags:** 空间布局，颜色亮度，字体设计

颜色和亮度 不同于传统触摸屏 GUI 设计模式，AR近眼显示为现实基础上的虚拟显象， 所以在设计时需要同时考虑用户、虚拟 UI 与真实视野的关系，尤其需要在颜色上做处理。 黑色即透明：由于光学关系，黑色在AR世界里代表不发光，人眼成像下不发光的元素则是看不见的（透明），要善于利用黑色留白。 白色即强光：由于光学关系，白色在AR世界里代表最强光，人眼成像下强光显示为白色（如：对着太阳看），避免大面积

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%201.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/qwqw.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%204.png

---

## 空间中的UI/物体
**Document ID:** 57b2cf8077434557b6270dbe89ebc845 | **Tags:** 

本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK 构建场景 这里以6DoF场景为例，阐述空间中物体与XR 相机的相对关系。 1 新建场景 新建Unity3D 工程，按照《接入指南》完成SDK 接入，并已经按照《6DoF空间》成功打包，在Project/Assets/Scenes 目录下复制DemoSpatial6DoF场景并命名为DemoSpatial。 屏幕空间的使用 在0DoF

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204155408510.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171119299.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204170953134.png

---

## 交互设计
**Document ID:** dbdf788eac3541a2a7d73b5e2bc1f89f | **Tags:** 手势交互，近远场，与模型交互，与UI交互

AR Glasses 交互方式 注意：Master 系统的默认交互方式是 3 DoF 射线，如果你设计的 AR 内容是使用其它方式交互的，请在应用打开第一时间告知用户。通常来说，一个简单的引导动画即可达到此目的。以下是一个手势交互应用的引导示例。 手势交互 1 手势交互原则 无意识交互：自然、符合直觉。 注重手势语义的直观性和便捷性，尽量减少记忆和学习成本 参考人与真实世界的互动，交互应该符合人的

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E8%8B%B1%E6%96%87%E5%9B%BE%E7%89%87/2%201.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E6%8A%95%E7%AF%AE.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%209.png

---

## 内置组件 FollowCamera
**Document ID:** e0eaa35dc5fe4f07892106e6d99c9227 | **Tags:** 

FollowCamera 相机跟随组件 FollowType (物体跟随相机的类型) RotationAndPosition (同时跟随相机旋转和位置) PositionOnly (只跟随相机位置) RotationOnly (只跟随相机旋转) OffsetPosition (跟随相机后,物体和相机位置偏差) OffsetRotation (跟随相机后,物体和相机旋转偏差,欧拉角) LockRot

---

## 声音的应用
**Document ID:** 5ebe9dd65c544e4d80bf170d9f28d3c2 | **Tags:** 空间音频

Rokid 眼镜支持空间音频，即开发者可以将音频放在空间中的一个固定位置，或是绑定在空间中的某一 3D 物体上，这样用户就能够直观地听到声音在空间中的方位。适当的三维空间音效能够带来极好的沉浸感，是提高体验设计的好助力。

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png

---

## 内置组件 GloablEventUtils
**Document ID:** 4bd9eceaad28425d8998fbd56c491708 | **Tags:** 

GlobalEventUtils 全局事件工具,基于该工具,开发&测试,能够非常方便的排查,交互系统的问题 激活方式 编辑器模式下 shift+i 激活或者关闭 运行阶段,所有基于 UXR SDK 开发的工具,能够使用 adb shell setprop rokid.globaldebug.show 1/0 命令开启和关闭(该方式目前只支持 station2 & station pro) 勾选属性

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-4.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-2.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image.png

---

## 内置交互拓展接口
**Document ID:** 18987a894e4f4f82a40e7eab53ccc0a5 | **Tags:** 

UXR 中的交互拓展接口 以下交互接口是对 UGUI 交互接口欠缺与 3D 物体交互能力的补充和拓展,与 UGUI 交互接口 UXR 中的拓展接口一样遵循事件冒泡的机制 注意: 手势交互的拖拽接口,需要使用 IRayDragToTarget 而不能使用 IRayDrag     /// <summary>
    /// Triggered when the ray enters
    /// 

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-1.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-4.png

---

## 简介
**Document ID:** 196256c8cade4a87ab8e04e45816e7b8 | **Tags:** 空间定位，双目渲染、3D手势、空间感知

UXR3.0 SDK 是为Unity 开发者提供的在YodaOS-Master 空间计算操作系统上开发空间计算应用的工具。帮助开发者在YodaOS-Master 空间计算操作系统上进行空间构建、虚实交互、空间感知，进而构建出完整的空间应用。 SDK 架构 双目渲染 UXR3.0 SDK 为用户提供基于Rokid 设备的双目渲染能力，真实还原3D 场景、物体、UI 的空间表达。通过该功能，开发者可以

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%80%BB%E4%BD%93%E5%9B%BE%E7%89%87.png
- https://ota.rokidcdn.com/toB/Document/UXR3.0/OpenXRSDKArchitecture.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%8F%8C%E7%9B%AE%E6%B8%B2%E6%9F%93.png

---

## 开发环境搭建
**Document ID:** f1ec651ab20a4eee9346857ef5129ec3 | **Tags:** AR Studio，Unity

硬件环境 为了顺利接入UXR3.0 SDK，硬件环境要求如下： 1）可进行Unity开发的PC设备：支持用于Unity开发的Mac或Windows PC设备。 2）空间计算设备：配备Rokid Station Pro/Rokid Station2设备。 3）眼镜设备：配备Rokid Max Pro/Rokid Max/Rokid Max2眼镜。 软件环境 作为专为Unity开发者打造的高级开发工具

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729143637274.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729144211902.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153127104.png

---

## 接入指南
**Document ID:** 965ccb56e0284976ab0c701346f5833e | **Tags:** NPM,Unity配置

本章节介绍从npm上获取SDK的方法，以及开发前的Unity配置说明，是开发前最后的准备工作。 请确保已按照《开发环境搭建》章节要求完成了环境搭建。 SDK 导入 Rokid Unity OpenXR Plugin使用 Unity Package Manager进行SDK 包管理。 1 配置NPM 1.1 切换发布平台到Android 使用UXR3.0 SDK 开发的App 需要运行在Androi

**Images:**
- https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/change_platform.png
- https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/package_manager.png
- https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/addpackagebyname.png

---

## 快速开始
**Document ID:** e89ba80360a94ef09f0647b6e9e87b35 | **Tags:** 快速开始，示例

本章节默认用户已经完成《开发环境搭建》、《接入指南》中提到的所有内容。 1 快速构建 开发者可以通过本章了解如何使用Rokid UXR3.0 SDK 快速构建一个空间应用。 1.1 创建/打开SampleScene 在Assets 的Scenes 目录下创建一个SampleScene（新建的Unity 工程默认就有一个SampleScene）。 1.2 替换Main Camera 使用SDK 提供

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237new.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237findcamera.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237inputcamerarig.jpg

---

## 版本历史
**Document ID:** dbbef7442b8243ae99a4708f230fb467 | **Tags:** 

V3.0.3 1、UXR3.0 SDK 首版发布，全面接入OpenXR 2、在UXR2.0 SDK 基础上增加图像识别与追踪功能

---

