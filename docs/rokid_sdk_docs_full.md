# Rokid AR SDK Guidelines (Full Content)

## 内置组件 RKCameraRig
**Document ID:** 6dcd1f2ae78b4b4fb9487f0b7c09fb83 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="描述">描述</h1>
<p>该组件主要是内置了我们渲染,场景,设备的设置以及我们推荐的默认设置</p>
<h1 id="如何使用">如何使用</h1>
<ul>
<li>将 RKCameraRig 预制体拖放到场景层级中</li>
<li>加载路径 &rsquo; Rokid Unity XR SDK/Runtime/Resources/Prefabs/BaseSetting/RKCameraRig&rsquo;</li>
</ul>
<h1 id="脚本属性设置说明">脚本属性设置&amp;说明</h1>
<h2 id="rkcamerarig">RKCameraRig</h2>
<ul>
<li>HeadTrackingType (头部追踪类型)
<ul>
<li>RotationAndPosition (该类型会将追踪到的 Rotation 和 Position 应用到相机上,如果你想实现 6Dof 效果选择该类型)</li>
<li>RotationOnly (该类型会将追踪到的 Rotation 应用到相机上,如果你想实现 3Dof 效果选择该类型)</li>
<li>PoistionOnly (该类型会将追踪到的 Position 应用到相机上)</li>
<li>None (不会应用任何位姿信息到相机上,如果你想实现 0dof 的效果选择该类型)</li>
</ul>
</li>
<li>UpdateType (被跟踪姿势驱动器使用的更新类型)
<ul>
<li>UpdateAndBeforeRender (更新时和渲染之前的输入示例。为了实现平滑的头部姿势跟踪，我们建议使用此值，因为它将为设备提供最低的输入延迟。这是 UpdateType 选项的默认值)</li>
<li>Update (仅在帧更新阶段采样输入)</li>
<li>BeforeRender(仅在渲染之前直接采样输入)</li>
</ul>
</li>
</ul>
<h2 id="rkcamerasetting">RKCameraSetting</h2>
<ul>
<li>
<p>LogLevel (UXRSDK 日志打印等级)</p>
<ul>
<li>Debug (打印高于 Debug 等级的所有日志)</li>
<li>Info (打印高于 Info 等级的所有日志)</li>
<li>Warning (打印高于 Warning 等级的所有日志)</li>
<li>Error (打印高于 Error 等级的所有日志)</li>
</ul>
</li>
<li>ActiveCameraCtrlInEditor (是否在 Unity 编辑器激活相机控制器,默认开启)</li>
</ul>
<h2 id="deviceeventhandler">DeviceEventHandler</h2>
<ul>
<li>Quit When Usb Disconnect(当USB 连接断开的时候退出应用)</li>
<li>Response To Escape(相应退出按键&quot;X&quot;)</li>
</ul></div><script>var markdown ="# 描述

该组件主要是内置了我们渲染,场景,设备的设置以及我们推荐的默认设置

# 如何使用

-   将 RKCameraRig 预制体拖放到场景层级中
-   加载路径 ' Rokid Unity XR SDK/Runtime/Resources/Prefabs/BaseSetting/RKCameraRig'

# 脚本属性设置&说明

## RKCameraRig

-   HeadTrackingType (头部追踪类型)
    -   RotationAndPosition (该类型会将追踪到的 Rotation 和 Position 应用到相机上,如果你想实现 6Dof 效果选择该类型)
    -   RotationOnly (该类型会将追踪到的 Rotation 应用到相机上,如果你想实现 3Dof 效果选择该类型)
    -   PoistionOnly (该类型会将追踪到的 Position 应用到相机上)
    -   None (不会应用任何位姿信息到相机上,如果你想实现 0dof 的效果选择该类型)
-   UpdateType (被跟踪姿势驱动器使用的更新类型)
    -   UpdateAndBeforeRender (更新时和渲染之前的输入示例。为了实现平滑的头部姿势跟踪，我们建议使用此值，因为它将为设备提供最低的输入延迟。这是 UpdateType 选项的默认值)
    -   Update (仅在帧更新阶段采样输入)
    -   BeforeRender(仅在渲染之前直接采样输入)

## RKCameraSetting

-   LogLevel (UXRSDK 日志打印等级)

    -   Debug (打印高于 Debug 等级的所有日志)
    -   Info (打印高于 Info 等级的所有日志)
    -   Warning (打印高于 Warning 等级的所有日志)
    -   Error (打印高于 Error 等级的所有日志)

-   ActiveCameraCtrlInEditor (是否在 Unity 编辑器激活相机控制器,默认开启)

## DeviceEventHandler

- Quit When Usb Disconnect(当USB 连接断开的时候退出应用)
- Response To Escape(相应退出按键"X")
";</script>

---

## 多模态交互
**Document ID:** aba4bdf9a1c04d5fb7906b32a22a8dd7 | **Tags:** 多模态交互，手势追踪，3Dof射线,

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="使用多模态交互">使用多模态交互</h1>
<p>在使用多模态交互之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。</p>
<p>UXR2.0 SDK 支持多模态交互，用户可以使用手势、3DoF 射线、Mouse、TouchPad交互等。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportMultiInteractor.mp4"></iframe>
<p><strong>注意：手势交互依赖于Max Pro眼镜。</strong></p>
<p><strong>注意：TouchPad交互依赖于Station2空间计算设备。</strong></p>
<p>使用多模态交互，需要在在项目的Project 中搜索RKInput 预制体，并将其拖入场景中。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/RKInput.png"/></p>
<h2 id="1-手势交互">1 手势交互</h2>
<p>需要完成手势交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Gesture 选项。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E6%89%8B%E5%8A%BF.png"/></p>
<h2 id="2-控制器3dof-射线交互">2 控制器3DoF 射线交互</h2>
<p>完成控制器3DoF 射线交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Three Dof 选项。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB3DoF%E5%B0%84%E7%BA%BF.png"/></p>
<h2 id="3-mouse-交互">3 Mouse 交互</h2>
<p>完成Mouse 交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Mouse 选项。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E9%BC%A0%E6%A0%87.png"/></p>
<h2 id="4-touchpad-交互">4 TouchPad 交互</h2>
<p>如需完成Touch Pad交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Touch Pad选项。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/touchpad.jpg"/></p>
<h1 id="交互切换">交互切换</h1>
<p><strong><em>Tips：以下切换成功的基础是已经在应用内Default Init Module 中已经添加相关交互方式。</em></strong></p>
<h2 id="1-切换到手势交互">1 切换到手势交互</h2>
<p>摊开手掌，并将掌心面向摄像头，握拳，舒展，即可切换到手势交互模式。</p>
<h2 id="2-切换到控制器射线交互">2 切换到控制器射线交互</h2>
<h3 id="21-station-pro-切换到控制器射线">2.1 Station Pro 切换到控制器射线</h3>
<p>点击Station Pro 上的任意方向按键即可完成切换。</p>
<h3 id="22-station-2-切换到控制器射线交互">2.2 Station 2 切换到控制器射线交互</h3>
<p>甩动Station 2 设备即可完成切换。</p>
<h2 id="3-切换到mouse-交互">3 切换到Mouse 交互</h2>
<p>Mouse 点击左键即可完成切换。</p>
<h2 id="4-切换到touchpad交互">4 切换到TouchPad交互</h2>
<p>在Station 2 的TouchPad 上进行<em>双指上划</em>即可完成切换。</p>
<h1 id="交互配置">交互配置</h1>
<h2 id="1-与ui-交互">1 与UI 交互</h2>
<p>UXR2.0 SDK 为开发者封装了PointableUI预制体来进行UI 交互。</p>
<h3 id="11-添加pointableui">1.1 添加PointableUI</h3>
<p>在Project 窗口找到并将PointableUI 预制体拖入场景中。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%B7%BB%E5%8A%A0PointableUI.png"/></p>
<h3 id="12-添加ui">1.2 添加UI</h3>
<p>这里以添加一个Image 为例。</p>
<p>在PointableUI 的Canvas 下添加一个Image UI。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportFollow.mp4"></iframe>
<h3 id="13-添加交互">1.3 添加交互</h3>
<p>当前是以一个Image 为例（如果是Button 组件，也可以使用UGUI 的交互组件）。</p>
<p>新建一个Mono Script：UITest.cs，继承IPointerDownHandler, IPointerUpHandler接口。</p>
<pre><code class="language-C#">using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class UITest : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
{
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        //按下
        GetComponent&lt;Image&gt;().color = Color.red;
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        //抬起
        GetComponent&lt;Image&gt;().color = Color.white;
    }
}

</code></pre>
<p>将该脚本绑定到Image 上。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E7%BB%91%E5%AE%9A%E8%84%9A%E6%9C%AC.png"/></p>
<h3 id="14-运行查看效果">1.4 运行查看效果</h3>
<p>按照上述配置完成后，可以直接运行，在Editor 中查看效果。</p>
<p>抬起：</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8A%AC%E8%B5%B7.png"/></p>
<p>按下：</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8C%89%E4%B8%8B.png"/></p>
<h2 id="2-与物体交互">2 与物体交互</h2>
<p>与物体交互和与UI 交互有些差异，需要手动挂载交互组件和碰撞Surface。下边以一个Cube 为例。</p>
<h3 id="21-添加cube">2.1 添加Cube</h3>
<p>在空间中添加一个Cube，这里为了方便调试和观察，将Cube 摆放在正前方3Unit 位置，并且将Scale 调整为0.1。</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%B7%BB%E5%8A%A0Cube.png"/></p>
<h3 id="22-添加可射线交互组件">2.2 添加可射线交互组件</h3>
<p>要使物体可以相应射线交互，需要添加RayInteractable 脚本。</p>
<p><img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/RayInteractable.png"/></p>
<h3 id="23-添加碰撞surface">2.3 添加碰撞Surface</h3>
<p>为物体添加ColliderSurface，并将该Surface 赋值给RayInteractable 的Surface 属性。</p>
<p><img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E7%BD%AESurface.png"/></p>
<h3 id="24-配置碰撞">2.4 配置碰撞</h3>
<p>将物体的碰撞体，这里以Box Collider 为例，赋值给ColliderSurface 脚本的Collider 属性。</p>
<p><img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E9%85%8D%E7%BD%AE%E7%A2%B0%E6%92%9E.png"/></p>
<h3 id="25-配置interactableunityeventwrapper">2.5 配置InteractableUnityEventWrapper</h3>
<p>再为物体添加一个InteractableUnityEventWrapper，并将InteractableUnityEventWrapper 的InteractableView 属性配置为当前物体，就可以进行事件处理了。</p>
<p><img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E9%85%8D%E7%BD%AEInteractable.png"/></p>
<h3 id="26-添加交互">2.6 添加交互</h3>
<p>为物体添加事件响应有两种方法，一种是在脚本上直接绑定处理方法，一种是通过版绑定脚本，监听InteractableUnityEventWrapper 的对应事件的方法。</p>
<p>这里以通过监听的方式为例，编写脚本CubeTest.cs，在Start 中监听相应的事件：</p>
<pre><code class="language-C#">using Rokid.UXR.Interaction;
using UnityEngine;

public class CubeTest : MonoBehaviour
{
    private MeshRenderer meshRenderer;
    private InteractableUnityEventWrapper unityEvent;
    void Start()
    {
        meshRenderer = GetComponent&lt;MeshRenderer&gt;();
        unityEvent = GetComponent&lt;InteractableUnityEventWrapper&gt;();

        unityEvent.WhenSelect.AddListener(() =&gt;
        {
            //Pointer Down
            meshRenderer.material.SetColor(&quot;_Color&quot;, Color.red);
        });

        unityEvent.WhenUnselect.AddListener(() =&gt;
        {
            //Pointer Up
            meshRenderer.material.SetColor(&quot;_Color&quot;, Color.white);
        });
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}

</code></pre>
<h3 id="27-运行查看效果">2.7 运行查看效果</h3>
<p>直接在Editor 中运行即可查看效果。</p>
<p>按照上述配置完成后，可以直接运行，在Editor 中查看效果。</p>
<p>抬起：</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8A%AC%E8%B5%B7.png"/></p>
<p>按下：</p>
<p><img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8C%89%E4%B8%8B.png"/></p></div><script>var markdown ="# 使用多模态交互

在使用多模态交互之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。

UXR2.0 SDK 支持多模态交互，用户可以使用手势、3DoF 射线、Mouse、TouchPad交互等。

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportMultiInteractor.mp4"></iframe>



**注意：手势交互依赖于Max Pro眼镜。**

**注意：TouchPad交互依赖于Station2空间计算设备。**



使用多模态交互，需要在在项目的Project 中搜索RKInput 预制体，并将其拖入场景中。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/RKInput.png"/>



## 1 手势交互

需要完成手势交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Gesture 选项。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E6%89%8B%E5%8A%BF.png"/>



## 2 控制器3DoF 射线交互

完成控制器3DoF 射线交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Three Dof 选项。



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB3DoF%E5%B0%84%E7%BA%BF.png"/>



## 3 Mouse 交互

完成Mouse 交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Mouse 选项。



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E9%BC%A0%E6%A0%87.png"/>

## 4 TouchPad 交互

如需完成Touch Pad交互，需要在RKInput 的InputModuleManager 脚本中的DefaultInitModule 属性至少包含Touch Pad选项。

<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/touchpad.jpg"/>

# 交互切换

***Tips：以下切换成功的基础是已经在应用内Default Init Module 中已经添加相关交互方式。***

## 1 切换到手势交互

摊开手掌，并将掌心面向摄像头，握拳，舒展，即可切换到手势交互模式。

## 2 切换到控制器射线交互

### 2.1 Station Pro 切换到控制器射线

点击Station Pro 上的任意方向按键即可完成切换。

### 2.2 Station 2 切换到控制器射线交互

甩动Station 2 设备即可完成切换。

## 3 切换到Mouse 交互

Mouse 点击左键即可完成切换。

## 4 切换到TouchPad交互

在Station 2 的TouchPad 上进行*双指上划*即可完成切换。

# 交互配置

## 1 与UI 交互

UXR2.0 SDK 为开发者封装了PointableUI预制体来进行UI 交互。



### 1.1 添加PointableUI

在Project 窗口找到并将PointableUI 预制体拖入场景中。



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%B7%BB%E5%8A%A0PointableUI.png"/>



### 1.2 添加UI

这里以添加一个Image 为例。

在PointableUI 的Canvas 下添加一个Image UI。



<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportFollow.mp4"></iframe>



### 1.3 添加交互

当前是以一个Image 为例（如果是Button 组件，也可以使用UGUI 的交互组件）。

新建一个Mono Script：UITest.cs，继承IPointerDownHandler, IPointerUpHandler接口。

```C#
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class UITest : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
{
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        //按下
        GetComponent<Image>().color = Color.red;
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        //抬起
        GetComponent<Image>().color = Color.white;
    }
}

```

将该脚本绑定到Image 上。



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E7%BB%91%E5%AE%9A%E8%84%9A%E6%9C%AC.png"/>



### 1.4 运行查看效果

按照上述配置完成后，可以直接运行，在Editor 中查看效果。

抬起：



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8A%AC%E8%B5%B7.png"/>



按下：

<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8C%89%E4%B8%8B.png"/>



## 2 与物体交互

与物体交互和与UI 交互有些差异，需要手动挂载交互组件和碰撞Surface。下边以一个Cube 为例。



### 2.1 添加Cube

在空间中添加一个Cube，这里为了方便调试和观察，将Cube 摆放在正前方3Unit 位置，并且将Scale 调整为0.1。



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%B7%BB%E5%8A%A0Cube.png"/>



### 2.2 添加可射线交互组件

要使物体可以相应射线交互，需要添加RayInteractable 脚本。



<img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/RayInteractable.png"/>



### 2.3 添加碰撞Surface

为物体添加ColliderSurface，并将该Surface 赋值给RayInteractable 的Surface 属性。



<img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E7%BD%AESurface.png"/>



### 2.4 配置碰撞

将物体的碰撞体，这里以Box Collider 为例，赋值给ColliderSurface 脚本的Collider 属性。



<img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E9%85%8D%E7%BD%AE%E7%A2%B0%E6%92%9E.png"/>



### 2.5 配置InteractableUnityEventWrapper

再为物体添加一个InteractableUnityEventWrapper，并将InteractableUnityEventWrapper 的InteractableView 属性配置为当前物体，就可以进行事件处理了。



<img  width="400" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E9%85%8D%E7%BD%AEInteractable.png"/>



### 2.6 添加交互

为物体添加事件响应有两种方法，一种是在脚本上直接绑定处理方法，一种是通过版绑定脚本，监听InteractableUnityEventWrapper 的对应事件的方法。

这里以通过监听的方式为例，编写脚本CubeTest.cs，在Start 中监听相应的事件：

```C#
using Rokid.UXR.Interaction;
using UnityEngine;

public class CubeTest : MonoBehaviour
{
    private MeshRenderer meshRenderer;
    private InteractableUnityEventWrapper unityEvent;
    void Start()
    {
        meshRenderer = GetComponent<MeshRenderer>();
        unityEvent = GetComponent<InteractableUnityEventWrapper>();

        unityEvent.WhenSelect.AddListener(() =>
        {
            //Pointer Down
            meshRenderer.material.SetColor("_Color", Color.red);
        });

        unityEvent.WhenUnselect.AddListener(() =>
        {
            //Pointer Up
            meshRenderer.material.SetColor("_Color", Color.white);
        });
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}

```



### 2.7 运行查看效果

直接在Editor 中运行即可查看效果。

按照上述配置完成后，可以直接运行，在Editor 中查看效果。

抬起：



<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8A%AC%E8%B5%B7.png"/>



按下：

<img  width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%8C%89%E4%B8%8B.png"/>

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/RKInput.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB%E6%89%8B%E5%8A%BF.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%87%B3%E5%B0%91%E5%8C%85%E5%90%AB3DoF%E5%B0%84%E7%BA%BF.png

---

## 多模态交互调试工具
**Document ID:** 86cfbfb241284f1f89191ba7db715337 | **Tags:** 模拟交互

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><p>我们增加调试模式，目的是为了,在开发开发交互的时候减少真机调试,提高开发者的开发调试效率。</p>
<h1 id="手势调试指南">手势调试指南</h1>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/gestrue.png"/></p>
<h1 id="鼠标调试指南">鼠标调试指南</h1>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/mouse.png"/></p>
<h1 id="射线调试指南">射线调试指南</h1>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/3DoFRay.png"/></p></div><script>var markdown ="我们增加调试模式，目的是为了,在开发开发交互的时候减少真机调试,提高开发者的开发调试效率。



# 手势调试指南



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/gestrue.png"/>



# 鼠标调试指南



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/mouse.png"/>



# 射线调试指南



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/3DoFRay.png"/>
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/gestrue.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/mouse.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.10/3DoFRay.png

---

## 前言
**Document ID:** dee3c19b964c451ea1c8974b05a464b3 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="yodaos-master-定位">YodaOS Master 定位</h1>
<p>面向广大消费者的 AR Glass 操作系统，以办公、游戏、观影等为主要场景，打造虚实融合的自然交互 3D 世界。支持第三方开发者自行设计&amp;开发。</p>
<p><img widith="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg"/></p>
<h1 id="为什么需要设计guideline-">为什么需要设计Guideline ?</h1>
<ul>
<li>
<p><strong>产品体验一致性</strong></p>
</li>
<li>
<ul>
<li>通过设计Guideline，统一RokidGlass 产品体验及风格，保证在任何时候用户能够获得一致的体验感；</li>
</ul>
</li>
<li>
<p><strong>支持第三方开发者</strong></p>
</li>
<li>
<ul>
<li>将我们长久以来积累的AR设计&amp;开发经验传递给第三方开发，以便获得更高效更顺畅的合作体验；</li>
</ul>
</li>
<li>
<p><strong>提升研发团队效率</strong></p>
</li>
<li>
<ul>
<li>通过设计规范来统一产品、设计&amp;开发的理念认知，减少日常工作的重复沟通、设计、开发，提升内部工作效率。</li>
</ul>
</li>
</ul></div><script>var markdown ="# YodaOS Master 定位

面向广大消费者的 AR Glass 操作系统，以办公、游戏、观影等为主要场景，打造虚实融合的自然交互 3D 世界。支持第三方开发者自行设计&开发。

<img widith="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg"/>



# 为什么需要设计Guideline ?

- **产品体验一致性**

- - 通过设计Guideline，统一RokidGlass 产品体验及风格，保证在任何时候用户能够获得一致的体验感；

- **支持第三方开发者**

- - 将我们长久以来积累的AR设计&开发经验传递给第三方开发，以便获得更高效更顺畅的合作体验；

- **提升研发团队效率**

- - 通过设计规范来统一产品、设计&开发的理念认知，减少日常工作的重复沟通、设计、开发，提升内部工作效率。



";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C%20%281%29.jpg

---

## XR 空间
**Document ID:** 22406de3ab224b2ebac95d79dd343830 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="dof-介绍">DoF 介绍</h1>
<p>DoF（Degree of Freedom） 指的是物体在空间中的自由度。</p>
<p>通常意义上，物体在空间中可以通过位置（Position）、姿态（Rotation）来定量表述其位姿（Pose）。</p>
<p>那么在表述物体在空间中移动时，就可以将物体的移动分解为：位移、姿态。那么在XYZ 坐标系下，位移可以表征为X 轴偏量、Y轴偏量、Z轴偏量，旋转可以表征为X轴旋转角度（Pitch 俯仰角）、Y轴旋转角度（Yaw 偏航角）、Z轴旋转角度（Roll 翻滚角）。</p>
<p>那么对于空间中的物体，若其在空间中自由运动，就会产生移动带来的XYZ 轴3个轴向上的变化以及姿态变化带来的3个轴向上的角度变化，这种用以表述物体在空间中的位姿变化的自由度就表述为DoF。</p>
<h1 id="dof-在xr-空间中的使用">DoF 在XR 空间中的使用</h1>
<p>XR 空间指的是在通过XR 设备观察到的虚拟空间与现实空间的统合。</p>
<p>那么可以这样理解，现实空间是由物理环境组成的，虚拟空间则是由特定的技术手段构建的。空间自其构建之后，就具备了其坐标系。比如现实空间中，描述某个物体在现实空间中的位姿的时候，会表述为：{经度、维度、海拔}{上下偏角，东西偏角，南北偏角}，同样在虚拟空间中，也可以这样表述，比如在Unity 中，通常用物体的Transform 来表述其在空间中的位姿。</p>
<p>通常情况下，在XR中对于空间还会有这样的表述：构建一个0DoF/3DoF/6DoF 的空间、这个UI/物体是0DoF/3DoF/6DoF的。</p>
<p>这里有一个非常重要的概念DoF（Degree of Freedom）即空间自由度。首先需要明确一点，DoF 是指的物体在特定空间中具备的姿态、位置变化的自由度。其最重要的两个定语在于特定空间和物体。</p>
<p>那么当我们用DoF 对一个空间进行表述的时候，如果将整个空间作为一个整体，那么就代表这个空间在其所在的特定的空间中是具备相应的DoF特性的，但是显然当在XR 中讨论空间的DoF 属性的时候，并不是指当前这个空间整体相对于其所在的空间坐标系的自由度，而是指其自身具备的属性。</p>
<h2 id="空间的自由度">空间的自由度</h2>
<p>那么该如何理解呢？上述论述过程中，说在讨论DoF 的时候，有两个定语，一个是特定的空间，一个是物体，那么当针对空间进行论述时，特定的空间即指当前被讨论的空间，物体指的是什么？是什么东西在空间中有自由度的时候，才会带来感知上的差异？答案是观察者，空间中的观察者在空间中的自由度决定了这个空间的自由度。</p>
<p>那么空间的自由度：</p>
<ul>
<li>0DoF 空间，就可以认为是空间中的观察者在空间中被锁定了姿态和位置，只能在特定位置上的特定角度观察空间</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_0DOF.gif"/></p>
<ul>
<li>3DoF 空间，就可以认为是空间中的观察者在空间中被锁定了姿态或者位置，可以在特定位置上以不同的角度观察空间或者在不同的位置上以固定的姿态观察空间。</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_3DOF.gif"/></p>
<ul>
<li>6DoF 空间，就可以认为是空间中的观察者在空间中完全自由，可以从任意位置以任意姿态观察空间。</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_6DOF.gif"/></p>
<h2 id="ui物体的自由度">UI/物体的自由度</h2>
<p>同样的道理，当我们讨论UI/物体在空间中的0DoF/3DoF/6DoF 的时候，首先明确一个点，在这个讨论中，自由度的物体是确定的，那么空间是哪个？是指的整个空间还是指的以观察者构建的构建的空间？在XR中，通过观察者来观察虚拟空间，那么虚拟空间中的物体相对观察者的自由度才是需要讨论的重点。</p>
<p>那么UI/物体的空间自由度：</p>
<ul>
<li>0DoF UI/物体，是指相对于XRCamera其位置和姿态是被锁定的，观察者看到的始终以特定的距离和角度观察该物体。</li>
<li>3DoF UI/物体，是指相对于XRCamera其位置或姿态是被锁定钉，观察者可以在特定的角度固定任意的距离或特定的距离任意的角度观察该物体。</li>
<li>6DoF UI/物体，是指相对于XRCamera其位置或姿态是完全自由的，观察者可以在任意的角度和任意的距离观察该物体。</li>
</ul></div><script>var markdown ="# DoF 介绍

DoF（Degree of Freedom） 指的是物体在空间中的自由度。

通常意义上，物体在空间中可以通过位置（Position）、姿态（Rotation）来定量表述其位姿（Pose）。

那么在表述物体在空间中移动时，就可以将物体的移动分解为：位移、姿态。那么在XYZ 坐标系下，位移可以表征为X 轴偏量、Y轴偏量、Z轴偏量，旋转可以表征为X轴旋转角度（Pitch 俯仰角）、Y轴旋转角度（Yaw 偏航角）、Z轴旋转角度（Roll 翻滚角）。

那么对于空间中的物体，若其在空间中自由运动，就会产生移动带来的XYZ 轴3个轴向上的变化以及姿态变化带来的3个轴向上的角度变化，这种用以表述物体在空间中的位姿变化的自由度就表述为DoF。

# DoF 在XR 空间中的使用

XR 空间指的是在通过XR 设备观察到的虚拟空间与现实空间的统合。

那么可以这样理解，现实空间是由物理环境组成的，虚拟空间则是由特定的技术手段构建的。空间自其构建之后，就具备了其坐标系。比如现实空间中，描述某个物体在现实空间中的位姿的时候，会表述为：{经度、维度、海拔}{上下偏角，东西偏角，南北偏角}，同样在虚拟空间中，也可以这样表述，比如在Unity 中，通常用物体的Transform 来表述其在空间中的位姿。

通常情况下，在XR中对于空间还会有这样的表述：构建一个0DoF/3DoF/6DoF 的空间、这个UI/物体是0DoF/3DoF/6DoF的。

这里有一个非常重要的概念DoF（Degree of Freedom）即空间自由度。首先需要明确一点，DoF 是指的物体在特定空间中具备的姿态、位置变化的自由度。其最重要的两个定语在于特定空间和物体。

那么当我们用DoF 对一个空间进行表述的时候，如果将整个空间作为一个整体，那么就代表这个空间在其所在的特定的空间中是具备相应的DoF特性的，但是显然当在XR 中讨论空间的DoF 属性的时候，并不是指当前这个空间整体相对于其所在的空间坐标系的自由度，而是指其自身具备的属性。

## 空间的自由度

那么该如何理解呢？上述论述过程中，说在讨论DoF 的时候，有两个定语，一个是特定的空间，一个是物体，那么当针对空间进行论述时，特定的空间即指当前被讨论的空间，物体指的是什么？是什么东西在空间中有自由度的时候，才会带来感知上的差异？答案是观察者，空间中的观察者在空间中的自由度决定了这个空间的自由度。

那么空间的自由度：

- 0DoF 空间，就可以认为是空间中的观察者在空间中被锁定了姿态和位置，只能在特定位置上的特定角度观察空间

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_0DOF.gif"/>

- 3DoF 空间，就可以认为是空间中的观察者在空间中被锁定了姿态或者位置，可以在特定位置上以不同的角度观察空间或者在不同的位置上以固定的姿态观察空间。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_3DOF.gif"/>

- 6DoF 空间，就可以认为是空间中的观察者在空间中完全自由，可以从任意位置以任意姿态观察空间。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_6DOF.gif"/>

## UI/物体的自由度

同样的道理，当我们讨论UI/物体在空间中的0DoF/3DoF/6DoF 的时候，首先明确一个点，在这个讨论中，自由度的物体是确定的，那么空间是哪个？是指的整个空间还是指的以观察者构建的构建的空间？在XR中，通过观察者来观察虚拟空间，那么虚拟空间中的物体相对观察者的自由度才是需要讨论的重点。

那么UI/物体的空间自由度：

- 0DoF UI/物体，是指相对于XRCamera其位置和姿态是被锁定的，观察者看到的始终以特定的距离和角度观察该物体。
- 3DoF UI/物体，是指相对于XRCamera其位置或姿态是被锁定钉，观察者可以在特定的角度固定任意的距离或特定的距离任意的角度观察该物体。
- 6DoF UI/物体，是指相对于XRCamera其位置或姿态是完全自由的，观察者可以在任意的角度和任意的距离观察该物体。";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_0DOF.gif
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_3DOF.gif
- https://ota.rokidcdn.com/toB/Document/UXR2.0/gifs/gif_480/%E7%A9%BA%E9%97%B401_6DOF.gif

---

## 平面检测
**Document ID:** c9cbc92ff5e149df88152e5094b281c0 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="使用平面检测">使用平面检测</h1>
<p>在使用平面检测之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。并确保已经了解如何使用Rokid 多模态交互。</p>
<p><strong><em>注意：手势交互、平面检测均依赖Rokid Max Pro眼镜。</em></strong></p>
<h2 id="1-快速实现平面检测">1 快速实现平面检测</h2>
<p>本章介绍，如何快速实现平面检测，并在检测出的平面上通过交互放置。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/PlaneTracking.mp4">
</iframe>
<h3 id="11-构建标准6dof-场景">1.1 构建标准6DoF 场景</h3>
<p>按照6DoF空间章节中介绍的方式，构建一个标准的6DoF 场景。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg"/></p>
<p>并按照多模态交互章节中介绍的方式，构建多模态交互场景。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane02.jpg"/></p>
<h3 id="12-添加ar-plane-manager">1.2 添加AR Plane Manager</h3>
<p>AR Plane Manager 是平面检测功能的管理脚本。创建空物体RKPlaneLogic，并将ARPlaneManager脚本挂载上。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager1.jpg" alt="PlaneManager1" /></p>
<p>其中：</p>
<ul>
<li>Plane Prefab:是可延展平面</li>
<li>Plane Detect Mode: 检测平面类型，包括水平平面/垂直平面/水平与垂直平面</li>
<li>Log Text: Log 信息打印</li>
</ul>
<h3 id="13-配置ar-plane-manager">1.3 配置AR Plane Manager</h3>
<p>根据需求配置PlanePrefab、PlaneDetectMode、LogText。</p>
<p>导入SDK Sample 后，搜索AR Grid Plane，可以使用SDK 中提供的Plane Prefab，并添加到场景中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager2.jpg" alt="PlaneManager2" /></p>
<p>将AR Grid Plane赋值给AR Plane Manager 的Plane Prefab。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager3.jpg" alt="PlaneManager3" /></p>
<p>Plane Detect Mode 和Log Text 可以根据自身的需求设置，这里采用默认配置，检测模式设置为仅检测横向（Horizontal），Log Text 置空。</p>
<h3 id="14-添加anchor-manager">1.4 添加Anchor Manager</h3>
<p>Anchor Manager 是锚点管理脚本。将AnchorManager脚本挂载到RKPlaneLogic上。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager1.jpg" alt="AnchorManager1" /></p>
<p>其中：</p>
<ul>
<li>Anchor Prefab: 锚点预制体</li>
<li>Follow Plane: 锚点是否跟随平面</li>
</ul>
<h3 id="15-配置anchor-manager">1.5 配置Anchor Manager</h3>
<p>根据需求配置Anchor Prefab 和Follow Plane。</p>
<p>导入SDK Sample 后，搜索AR Default Locator，可以使用SDK 中提供的AR Default Locator预制体，并添加到场景Hierarchy中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager2.jpg" alt="AnchorManager1" /></p>
<p>将AR Default Locator赋值给Anchor Manager 的Anchor Prefab。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager3.jpg" alt="PlaneManager3" /></p>
<h3 id="16-编写planetrackerdemo脚本管理识别周期">1.6 编写PlaneTrackerDemo脚本管理识别周期</h3>
<p>ARPlaneManager 提供了平面检测的开关管理接口：</p>
<p>开启平面检测</p>
<pre><code class="language-C#">ARPlaneManager.Instance.OpenPlaneTracker();
</code></pre>
<p>关闭平面检测</p>
<pre><code class="language-C#">ARPlaneManager.Instance.ClosePlaneTracker();
</code></pre>
<p>至此，即可快速完成平面检测功能的接入。</p>
<h2 id="2-自定义平面检测">2 自定义平面检测</h2>
<p>除了使用1 快速实现平面检测中介绍的方法外，开发者也可以根据自己需求，通过AR Plane Manager管理和使用平面检测功能。</p>
<h3 id="21-ar-plane-manager-详解">2.1 AR Plane Manager 详解</h3>
<p>AR Plane Manager 是平面检测核心功能接口。开发者可以通过该脚本管理平面检测功能。</p>
<h4 id="211-生命周期接口">2.1.1 生命周期接口</h4>
<pre><code class="language-C#">////打开平面检测功能
public void OpenPlaneTracker();
////关闭平面检测功能
public void ClosePlaneTracker();
</code></pre>
<p>调用示例：</p>
<pre><code class="language-C#">////需要打开平面检测功能时调用
ARPlaneManager.Instance.OpenPlaneTracker();
////需要关闭平面检测功能时调用
ARPlaneManager.Instance.ClosePlaneTracker();
</code></pre>
<h4 id="212-数据监听接口">2.1.2 数据监听接口</h4>
<pre><code class="language-C#">////新平面添加事件
public static event Action&lt;ARPlane&gt; OnPlaneAdded;
////平面信息更新事件
public static event Action&lt;ARPlane&gt; OnPlaneUpdated;
////特定平面移除事件
public static event Action&lt;ARPlane&gt; OnPlaneRemoved;
</code></pre>
<p>监听示例：</p>
<pre><code class="language-C#">ARPlaneManager.OnPlaneAdded += plane =&gt;
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};

ARPlaneManager.OnPlaneUpdated += plane =&gt;
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};

ARPlaneManager.OnPlaneRemoved += plane =&gt;
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};
</code></pre>
<p>数据监听接口中，所有的数据都封装在ARPlane的boundedPlane中。</p>
<pre><code class="language-C#">using Rokid.UXR.Module;
using UnityEngine;

public struct BoundedPlane
{
    public long planeHandle;//平面句柄
    public Vector2[] boundary;//局部坐标
    public Vector3[] boundary3D;//世界坐标
    public Pose pose;//位姿信息

    public PlaneType planeType;//平面类型
    
    public override string ToString()
    {
        string boundaryStr = &quot;\r\n&quot;;
        string boundary3DStr = &quot;\r\n&quot;;
        if (boundary?.Length &gt; 0)
        {
            for (int i = 0; i &lt; boundary.Length; i++)
            {
                boundaryStr += $&quot;({boundary[i].x},{boundary[i].y})\r\n&quot;;
                boundary3DStr += $&quot;({boundary3D[i].x},{boundary3D[i].y},{boundary3D[i].z})\r\n&quot;;
            }
        }
        return $&quot;planeId:{planeHandle} \r\nplaneType:{planeType} \r\npose:\r\n{pose.position.ToString(&quot;0.0000&quot;)}\r\n{pose.rotation.eulerAngles.ToString(&quot;0.0000&quot;)} \r\nboundary3D:{boundary3DStr}\r\nboundary:{boundaryStr} &quot;;
    }


    public void release()
    {
        boundary = null;
        boundary3D = null;
    }
}
</code></pre>
<p>其中planeType是检出的平面类型：</p>
<pre><code class="language-C#">public enum PlaneType
{
    Horizontal,//水平
    Vertical//垂直
}
</code></pre>
<h4 id="213-检测模式设置与查询">2.1.3 检测模式设置与查询</h4>
<pre><code class="language-C#">////将平面检测模式设置为某种特定的模式
public void SetPlaneDetectMode(PlaneDetectMode planeDetectMode);
////查询当前平面检测模式
public PlaneDetectMode GetPlaneDetectMode()；
</code></pre>
<p>查询和设置示例：</p>
<pre><code class="language-C#"> //// 查询模式
var mode = ARPlaneManager.Instance.GetPlaneDetectMode();
Debug.Log(&quot;mode:&quot; + mode);
////将平面检测模式设置为水平
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.Horizontal);
////将平面检测模式设置为垂直
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.Vertical);
////将平面检测模式设置为水平及垂直
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.HorizontalAndVertical);
</code></pre>
<p>其中PlaneDetectMode是平面检测的检出类型：</p>
<pre><code class="language-C#">public enum PlaneDetectMode
{
    Horizontal = 1, //仅检出水平平面
    Vertical = 2,//仅检出垂直平面
    HorizontalAndVertical = 3 //检出水平或垂直平面
}
</code></pre></div><script>var markdown ="# 使用平面检测

在使用平面检测之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。并确保已经了解如何使用Rokid 多模态交互。

***注意：手势交互、平面检测均依赖Rokid Max Pro眼镜。***

## 1 快速实现平面检测

本章介绍，如何快速实现平面检测，并在检测出的平面上通过交互放置。

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/PlaneTracking.mp4">
</iframe>

### 1.1 构建标准6DoF 场景

按照6DoF空间章节中介绍的方式，构建一个标准的6DoF 场景。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg"/>

并按照多模态交互章节中介绍的方式，构建多模态交互场景。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane02.jpg"/>

### 1.2 添加AR Plane Manager

AR Plane Manager 是平面检测功能的管理脚本。创建空物体RKPlaneLogic，并将ARPlaneManager脚本挂载上。

![PlaneManager1](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager1.jpg)

其中：

- Plane Prefab:是可延展平面
- Plane Detect Mode: 检测平面类型，包括水平平面/垂直平面/水平与垂直平面
- Log Text: Log 信息打印

### 1.3 配置AR Plane Manager

根据需求配置PlanePrefab、PlaneDetectMode、LogText。

导入SDK Sample 后，搜索AR Grid Plane，可以使用SDK 中提供的Plane Prefab，并添加到场景中。

![PlaneManager2](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager2.jpg)

将AR Grid Plane赋值给AR Plane Manager 的Plane Prefab。

![PlaneManager3](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager3.jpg)

Plane Detect Mode 和Log Text 可以根据自身的需求设置，这里采用默认配置，检测模式设置为仅检测横向（Horizontal），Log Text 置空。

### 1.4 添加Anchor Manager

Anchor Manager 是锚点管理脚本。将AnchorManager脚本挂载到RKPlaneLogic上。

![AnchorManager1](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager1.jpg)

其中：

- Anchor Prefab: 锚点预制体
- Follow Plane: 锚点是否跟随平面

### 1.5 配置Anchor Manager

根据需求配置Anchor Prefab 和Follow Plane。

导入SDK Sample 后，搜索AR Default Locator，可以使用SDK 中提供的AR Default Locator预制体，并添加到场景Hierarchy中。

![AnchorManager1](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager2.jpg)

将AR Default Locator赋值给Anchor Manager 的Anchor Prefab。

![PlaneManager3](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/AnchorManager3.jpg)

### 1.6 编写PlaneTrackerDemo脚本管理识别周期

ARPlaneManager 提供了平面检测的开关管理接口：

开启平面检测

```C#
ARPlaneManager.Instance.OpenPlaneTracker();
```

关闭平面检测

```C#
ARPlaneManager.Instance.ClosePlaneTracker();
```

至此，即可快速完成平面检测功能的接入。

## 2 自定义平面检测

除了使用1 快速实现平面检测中介绍的方法外，开发者也可以根据自己需求，通过AR Plane Manager管理和使用平面检测功能。

### 2.1 AR Plane Manager 详解

AR Plane Manager 是平面检测核心功能接口。开发者可以通过该脚本管理平面检测功能。

#### 2.1.1 生命周期接口

```C#
////打开平面检测功能
public void OpenPlaneTracker();
////关闭平面检测功能
public void ClosePlaneTracker();
```

调用示例：

```C#
////需要打开平面检测功能时调用
ARPlaneManager.Instance.OpenPlaneTracker();
////需要关闭平面检测功能时调用
ARPlaneManager.Instance.ClosePlaneTracker();
```

#### 2.1.2 数据监听接口

```C#
////新平面添加事件
public static event Action<ARPlane> OnPlaneAdded;
////平面信息更新事件
public static event Action<ARPlane> OnPlaneUpdated;
////特定平面移除事件
public static event Action<ARPlane> OnPlaneRemoved;
```

监听示例：

```C#
ARPlaneManager.OnPlaneAdded += plane =>
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};

ARPlaneManager.OnPlaneUpdated += plane =>
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};

ARPlaneManager.OnPlaneRemoved += plane =>
{
    ////获取到的平面信息
    var str = plane.boundedPlane.ToString();
    Debug.Log(str);
};
```

数据监听接口中，所有的数据都封装在ARPlane的boundedPlane中。

```C#
using Rokid.UXR.Module;
using UnityEngine;

public struct BoundedPlane
{
    public long planeHandle;//平面句柄
    public Vector2[] boundary;//局部坐标
    public Vector3[] boundary3D;//世界坐标
    public Pose pose;//位姿信息

    public PlaneType planeType;//平面类型
    
    public override string ToString()
    {
        string boundaryStr = "\r\n";
        string boundary3DStr = "\r\n";
        if (boundary?.Length > 0)
        {
            for (int i = 0; i < boundary.Length; i++)
            {
                boundaryStr += $"({boundary[i].x},{boundary[i].y})\r\n";
                boundary3DStr += $"({boundary3D[i].x},{boundary3D[i].y},{boundary3D[i].z})\r\n";
            }
        }
        return $"planeId:{planeHandle} \r\nplaneType:{planeType} \r\npose:\r\n{pose.position.ToString("0.0000")}\r\n{pose.rotation.eulerAngles.ToString("0.0000")} \r\nboundary3D:{boundary3DStr}\r\nboundary:{boundaryStr} ";
    }


    public void release()
    {
        boundary = null;
        boundary3D = null;
    }
}
```

其中planeType是检出的平面类型：

```C#
public enum PlaneType
{
    Horizontal,//水平
    Vertical//垂直
}
```

#### 2.1.3 检测模式设置与查询

```C#
////将平面检测模式设置为某种特定的模式
public void SetPlaneDetectMode(PlaneDetectMode planeDetectMode);
////查询当前平面检测模式
public PlaneDetectMode GetPlaneDetectMode()；
```

查询和设置示例：

```C#
 //// 查询模式
var mode = ARPlaneManager.Instance.GetPlaneDetectMode();
Debug.Log("mode:" + mode);
////将平面检测模式设置为水平
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.Horizontal);
////将平面检测模式设置为垂直
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.Vertical);
////将平面检测模式设置为水平及垂直
ARPlaneManager.Instance.SetPlaneDetectMode(PlaneDetectMode.HorizontalAndVertical);
```

其中PlaneDetectMode是平面检测的检出类型：

```C#
public enum PlaneDetectMode
{
    Horizontal = 1, //仅检出水平平面
    Vertical = 2,//仅检出垂直平面
    HorizontalAndVertical = 3 //检出水平或垂直平面
}
```





";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane02.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/253/PlaneManager1.jpg

---

## 自定义手势
**Document ID:** 8869a42f3935436e90bead5e2c79fb73 | **Tags:** RKHand，远近场切换，关节点数据

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><p><strong><em>本章节是手势相关内容，默认开发者已经导入接入RKInput 组件，并将多模态交互设置为Gesture。</em></strong></p>
<p><strong><em>注意：手势交互依赖于Max Pro眼镜。</em></strong></p>
<h1 id="自定义手势组件">自定义手势组件</h1>
<ul>
<li>默认情况下我们只需要设置RKHand,默认初始化交互器类型和默认激活类型,各个模块的交互器类型,将通过脚本自动加载</li>
<li>我们想要修改交互以RKHand为例,我们有几种方式重置交互器的默认加载
<ol>
<li>我们可以将RKHand的预制体拖拽到场景层级试图中,进行修改,事件输入模块会直接使用场景中的 RKHand</li>
<li>我们将 Roikd Unity XR SDK/Runtime/Resources/Prefabs/Interactor/中的 RKHand 预制体复制到 Asset/Resources/Prefabs/Interactor 下进行修改,我们加载程序会优先加载 Asset/Resources/Prefabs/Interactor 下的 RKHand 从而实现覆盖</li>
<li>具体 RKHand 如何设置请参考RKHand基础组件说明</li>
</ol>
</li>
</ul>
<h1 id="自定义手势">自定义手势</h1>
<p>UXR2.0 SDK 为开发者提供了手、骨骼的位姿信息，开发者可以通过对手、骨骼的位姿信息进行自定义的手势处理。</p>
<h2 id="1手势类型">1、手势类型</h2>
<p>UXR2.0 SDK 提供了OpenPinch、Pinch、Palm、Grip 四种手势状态。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png"/></p>
<p><strong>图中一共5中手势，分别为OpenPinch、Pinch、近场单指、Palm、Grip</strong></p>
<p>开发者可以通过<code>GesEventInput.Instance.GetGestureType(HandType handType)</code>接口获取到当前手势类型。（需要注意，单指状态较特殊，仅参与近场交互）。返回值为<code>GestureType</code> 枚举，参数为<code>HandType</code>枚举。</p>
<p>其中参数<code>HandType</code> 枚举为需要获取的是左手还是右手的手势状态，必须传入<code>HandType.LeftHand</code>或<code>HandType.RightHand</code>。</p>
<pre><code class="language-C#">public enum HandType
{
    None,//
    RightHand,//右手
    LeftHand//左手
}
</code></pre>
<p>返回值<code>GestureType</code> 即是判断到的<code>HandType</code>代表的手的当前手势类型。</p>
<pre><code class="language-C#">public enum GestureType
{
    None = -1, // 0xFFFFFFFF
    Grip = 1,//握拳
    Palm = 2,//手掌
    Pinch = 3,//捏合
    OpenPinch = 4//捏合松开
}
</code></pre>
<p>除了可以获取手势状态外，UXR2.0 SDK 也为开发者提供了掌心方向的判断。开发者可以通过<code>GesEventInput.Instance.GetHandOrientation(HandType handType)</code> 来获取掌心朝向，返回值为<code>HandOrientation</code>，参数为<code>HandType</code>。</p>
<p>其中参数<code>HandType</code> 枚举为需要获取的是左手还是右手的手势状态，必须传入<code>HandType.LeftHand</code>或<code>HandType.RightHand</code>。</p>
<p>返回值<code>HandOrientation</code>即是判断到的<code>HandType</code>代表的手的当前掌心朝向。</p>
<pre><code class="language-C#">public enum HandOrientation
{
    None = -1, // 0xFFFFFFFF
    Palm = 0,//掌心面向使用者
    Back = 1//掌心远离使用者
}
</code></pre>
<h2 id="2获取骨骼点信息">2、获取骨骼点信息</h2>
<p>开发者可以通过<code>GesEventInput.Instance.GetSkeletonPose(SkeletonIndexFlag flag, HandType type)</code>接口获取<code>HandType</code>指代的手的骨骼信息。</p>
<p>其中参数<code>HandType</code> 枚举为需要获取的是左手还是右手的手势状态，必须传入<code>HandType.LeftHand</code>或<code>HandType.RightHand</code>。</p>
<p>参数<code>SkeletonIndexFlag</code>为手势节点枚举。</p>
<pre><code class="language-C#">public enum SkeletonIndexFlag
{
    WRIST = 0,

    THUMB_CMC = 1,
    THUMB_MCP = 2,
    THUMB_IP = 3,
    THUMB_TIP = 4,

    INDEX_FINGER_MCP = 5,
    INDEX_FINGER_PIP = 6,
    INDEX_FINGER_DIP = 7,
    INDEX_FINGER_TIP = 8,

    MIDDLE_FINGER_MCP = 9,
    MIDDLE_FINGER_PIP = 10,
    MIDDLE_FINGER_DIP = 11,
    MIDDLE_FINGER_TIP = 12,

    RING_FINGER_MCP = 13,
    RING_FINGER_PIP = 14,
    RING_FINGER_DIP = 15,
    RING_FINGER_TIP = 16,

    PINKY_MCP = 17,
    PINKY_PIP = 18,
    PINKY_DIP = 19,
    PINKY_TIP = 20,

    PALM = 21,
    METACARPAL_INDEX = 22,
    METACARPAL_MIDDLE = 23,
    METACARPAL_RING = 24,
    METACARPAL_PINKY = 25
}
</code></pre>
<p>一共26个节点，分别是手腕WRIST，掌心PALM，4个掌骨（METACARPAL）节点，和5根手指关节节点，拇指从CMC指骨末节依次MCP、IP、TIP指尖，其他从MCP指骨末节依次PIP、DIP、TIP指尖。下图为骨骼节点与枚举的对照关系。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%89%8B%E6%8E%8C.png"/></p>
<p>以下以一个简单的判断手指朝向的示例代码：</p>
<pre><code class="language-c#">private Pose GetSkeletonPose(SkeletonIndexFlag index, HandType hand)
{
    return GesEventInput.Instance.GetSkeletonPose(index, hand);
}


/// &lt;summary&gt;
/// 判断手势类型
/// &lt;/summary&gt;
/// &lt;param name=&quot;hand&quot;&gt;左右手类型&lt;/param&gt;
/// &lt;returns&gt;&lt;/returns&gt;
private GestureType JudgeGesType(HandType hand)
{
    //食指方向
    Vector3 indexForward = (GetSkeletonPose(SkeletonIndexFlag.INDEX_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.INDEX_FINGER_MCP, hand).position).normalized;
    //中指方向
    Vector3 middleForward = (GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_MCP, hand).position).normalized;
    //无名指方向
    Vector3 ringFingerForward = (GetSkeletonPose(SkeletonIndexFlag.RING_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.RING_FINGER_MCP, hand).position).normalized;
    //小拇指方向
    Vector3 pinkyForward = (GetSkeletonPose(SkeletonIndexFlag.PINKY_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.PINKY_MCP, hand).position).normalized;
    //手方向
    Vector3 handForward = (GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_MCP, hand).position - GetSkeletonPose(SkeletonIndexFlag.WRIST, hand).position).normalized;

    float dotHandIndex = Vector3.Dot(handForward, indexForward);
    float dotHandMiddle = Vector3.Dot(handForward, middleForward);
    float dotHandRing = Vector3.Dot(handForward, ringFingerForward);
    float dotHandPinky = Vector3.Dot(handForward, pinkyForward);

    GestureType gesType = GestureType.None;

    if (dotHandIndex &lt; 0f &amp;&amp; dotHandMiddle &lt; 0f &amp;&amp; dotHandRing &lt; 0f &amp;&amp; dotHandPinky &lt; 0f)
    {
        gesType = GestureType.Grip;
    }
    else if (dotHandIndex &lt; 0.5f &amp;&amp; dotHandIndex &gt; 0f &amp;&amp; dotHandMiddle &gt; 0.5f &amp;&amp; dotHandRing &gt; 0.5f &amp;&amp; dotHandPinky &gt; 0.5f)
    {
        gesType = GestureType.Pinch;
    }

    return gesType;
}
</code></pre>
<h1 id="自定义远近场规则">自定义远近场规则</h1>
<p>UXR2.0 SDK 默认情况下提供了自适应的远近场切换方案，开发者也可以禁用该切换方案。</p>
<h2 id="1-只是在某些场景禁用动态切换逻辑">1: 只是在某些场景禁用动态切换逻辑</h2>
<ol>
<li>
<p>首先需要禁用 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本</p>
</li>
<li>
<p>调用 InteractorStateChange.OnPokeInteractorUnHover 事件,激活场景的远场交互</p>
</li>
<li>
<p>调用 InteractorStateChange.OnPokeInteractorHover 事件,激活场景的近场交互</p>
</li>
<li>可以根据自己的需求在需要的时候选择激活 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本来恢复动态的切换逻辑</li>
</ol>
<h2 id="2-只需要某种交互不需要恢复动态切换">2: 只需要某种交互,不需要恢复动态切换</h2>
<ol>
<li>
<p>移除 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本</p>
</li>
<li>根据自己的需求保留 RKHand/LeftHandInteractors 和 RKHand/RightHandInteractors 下的某种交互</li>
</ol></div><script>var markdown ="***本章节是手势相关内容，默认开发者已经导入接入RKInput 组件，并将多模态交互设置为Gesture。***

***注意：手势交互依赖于Max Pro眼镜。***

# 自定义手势组件

-   默认情况下我们只需要设置RKHand,默认初始化交互器类型和默认激活类型,各个模块的交互器类型,将通过脚本自动加载
-   我们想要修改交互以RKHand为例,我们有几种方式重置交互器的默认加载
    1. 我们可以将RKHand的预制体拖拽到场景层级试图中,进行修改,事件输入模块会直接使用场景中的 RKHand
    2. 我们将 Roikd Unity XR SDK/Runtime/Resources/Prefabs/Interactor/中的 RKHand 预制体复制到 Asset/Resources/Prefabs/Interactor 下进行修改,我们加载程序会优先加载 Asset/Resources/Prefabs/Interactor 下的 RKHand 从而实现覆盖
    3. 具体 RKHand 如何设置请参考RKHand基础组件说明

# 自定义手势

UXR2.0 SDK 为开发者提供了手、骨骼的位姿信息，开发者可以通过对手、骨骼的位姿信息进行自定义的手势处理。

## 1、手势类型

UXR2.0 SDK 提供了OpenPinch、Pinch、Palm、Grip 四种手势状态。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png"/>

**图中一共5中手势，分别为OpenPinch、Pinch、近场单指、Palm、Grip**

开发者可以通过```GesEventInput.Instance.GetGestureType(HandType handType)```接口获取到当前手势类型。（需要注意，单指状态较特殊，仅参与近场交互）。返回值为```GestureType``` 枚举，参数为```HandType```枚举。

其中参数```HandType``` 枚举为需要获取的是左手还是右手的手势状态，必须传入```HandType.LeftHand```或```HandType.RightHand```。

```C#
public enum HandType
{
    None,//
    RightHand,//右手
    LeftHand//左手
}
```

返回值```GestureType``` 即是判断到的```HandType```代表的手的当前手势类型。

```C#
public enum GestureType
{
    None = -1, // 0xFFFFFFFF
    Grip = 1,//握拳
    Palm = 2,//手掌
    Pinch = 3,//捏合
    OpenPinch = 4//捏合松开
}
```

除了可以获取手势状态外，UXR2.0 SDK 也为开发者提供了掌心方向的判断。开发者可以通过```GesEventInput.Instance.GetHandOrientation(HandType handType)``` 来获取掌心朝向，返回值为```HandOrientation```，参数为```HandType```。

其中参数```HandType``` 枚举为需要获取的是左手还是右手的手势状态，必须传入```HandType.LeftHand```或```HandType.RightHand```。

返回值```HandOrientation```即是判断到的```HandType```代表的手的当前掌心朝向。

```C#
public enum HandOrientation
{
    None = -1, // 0xFFFFFFFF
    Palm = 0,//掌心面向使用者
    Back = 1//掌心远离使用者
}
```

## 2、获取骨骼点信息

开发者可以通过```GesEventInput.Instance.GetSkeletonPose(SkeletonIndexFlag flag, HandType type)```接口获取```HandType```指代的手的骨骼信息。

其中参数```HandType``` 枚举为需要获取的是左手还是右手的手势状态，必须传入```HandType.LeftHand```或```HandType.RightHand```。

参数```SkeletonIndexFlag```为手势节点枚举。

```C#
public enum SkeletonIndexFlag
{
    WRIST = 0,

    THUMB_CMC = 1,
    THUMB_MCP = 2,
    THUMB_IP = 3,
    THUMB_TIP = 4,

    INDEX_FINGER_MCP = 5,
    INDEX_FINGER_PIP = 6,
    INDEX_FINGER_DIP = 7,
    INDEX_FINGER_TIP = 8,

    MIDDLE_FINGER_MCP = 9,
    MIDDLE_FINGER_PIP = 10,
    MIDDLE_FINGER_DIP = 11,
    MIDDLE_FINGER_TIP = 12,

    RING_FINGER_MCP = 13,
    RING_FINGER_PIP = 14,
    RING_FINGER_DIP = 15,
    RING_FINGER_TIP = 16,

    PINKY_MCP = 17,
    PINKY_PIP = 18,
    PINKY_DIP = 19,
    PINKY_TIP = 20,

    PALM = 21,
    METACARPAL_INDEX = 22,
    METACARPAL_MIDDLE = 23,
    METACARPAL_RING = 24,
    METACARPAL_PINKY = 25
}
```

一共26个节点，分别是手腕WRIST，掌心PALM，4个掌骨（METACARPAL）节点，和5根手指关节节点，拇指从CMC指骨末节依次MCP、IP、TIP指尖，其他从MCP指骨末节依次PIP、DIP、TIP指尖。下图为骨骼节点与枚举的对照关系。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%89%8B%E6%8E%8C.png"/>



以下以一个简单的判断手指朝向的示例代码：

```c#
private Pose GetSkeletonPose(SkeletonIndexFlag index, HandType hand)
{
    return GesEventInput.Instance.GetSkeletonPose(index, hand);
}


/// <summary>
/// 判断手势类型
/// </summary>
/// <param name="hand">左右手类型</param>
/// <returns></returns>
private GestureType JudgeGesType(HandType hand)
{
    //食指方向
    Vector3 indexForward = (GetSkeletonPose(SkeletonIndexFlag.INDEX_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.INDEX_FINGER_MCP, hand).position).normalized;
    //中指方向
    Vector3 middleForward = (GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_MCP, hand).position).normalized;
    //无名指方向
    Vector3 ringFingerForward = (GetSkeletonPose(SkeletonIndexFlag.RING_FINGER_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.RING_FINGER_MCP, hand).position).normalized;
    //小拇指方向
    Vector3 pinkyForward = (GetSkeletonPose(SkeletonIndexFlag.PINKY_TIP, hand).position - GetSkeletonPose(SkeletonIndexFlag.PINKY_MCP, hand).position).normalized;
    //手方向
    Vector3 handForward = (GetSkeletonPose(SkeletonIndexFlag.MIDDLE_FINGER_MCP, hand).position - GetSkeletonPose(SkeletonIndexFlag.WRIST, hand).position).normalized;

    float dotHandIndex = Vector3.Dot(handForward, indexForward);
    float dotHandMiddle = Vector3.Dot(handForward, middleForward);
    float dotHandRing = Vector3.Dot(handForward, ringFingerForward);
    float dotHandPinky = Vector3.Dot(handForward, pinkyForward);

    GestureType gesType = GestureType.None;

    if (dotHandIndex < 0f && dotHandMiddle < 0f && dotHandRing < 0f && dotHandPinky < 0f)
    {
        gesType = GestureType.Grip;
    }
    else if (dotHandIndex < 0.5f && dotHandIndex > 0f && dotHandMiddle > 0.5f && dotHandRing > 0.5f && dotHandPinky > 0.5f)
    {
        gesType = GestureType.Pinch;
    }

    return gesType;
}
```

# 自定义远近场规则

UXR2.0 SDK 默认情况下提供了自适应的远近场切换方案，开发者也可以禁用该切换方案。



## 1: 只是在某些场景禁用动态切换逻辑

1.  首先需要禁用 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本

2.  调用 InteractorStateChange.OnPokeInteractorUnHover 事件,激活场景的远场交互

3.  调用 InteractorStateChange.OnPokeInteractorHover 事件,激活场景的近场交互

4.  可以根据自己的需求在需要的时候选择激活 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本来恢复动态的切换逻辑



## 2: 只需要某种交互,不需要恢复动态切换

1.  移除 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本

2.  根据自己的需求保留 RKHand/LeftHandInteractors 和 RKHand/RightHandInteractors 下的某种交互";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%89%8B%E6%8E%8C.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/mesh%20%E6%89%8B.png

---

## 获取设备硬件信息
**Document ID:** 97d436b8453d4683beb217b8632cb7c5 | **Tags:** 眼镜亮度，音量，按键键值

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h2 id="获取基础信息">获取基础信息</h2>
<p>Rokid 为开发者提供NativeInterface.NativeAPI，为开发者提供了硬件设备信息。</p>
<pre><code class="language-c#">public void GetHardwareInfo()
{
    //Get Glass Name
    NativeInterface.NativeAPI.GetGlassName();
    //Get SN of Glass
    NativeInterface.NativeAPI.GetGlassSN();
    //Get Firmware Version of Glass
    NativeInterface.NativeAPI.GetGlassFirmwareVersion();
    //...
}
</code></pre>
<h2 id="控制眼镜显示亮度">控制眼镜显示亮度</h2>
<p>Rokid 为开发者提供了眼镜显示亮度的控制接口<code>NativeInterface.NativeAPI.GetGlassBrightness()</code>和<code>NativeInterface.NativeAPI.SetGlassBrightness(int value)</code>。</p>
<pre><code class="language-c#">/// &lt;summary&gt;
/// Get Glass Brightness
/// 
/// &lt;/summary&gt;
/// &lt;returns&gt;value of brightness of glass which is a number between 0-100&lt;/returns&gt;
public int GetBrightness()
{
    return NativeInterface.NativeAPI.GetGlassBrightness();
}

/// &lt;summary&gt;
/// Set Glass Brightness
/// 
/// &lt;/summary&gt;
/// &lt;param name=&quot;value&quot;&gt;a int number between 10-100&lt;/param&gt;
public void SetBrightness(int value)
{
    NativeInterface.NativeAPI.SetGlassBrightness(value);
}
</code></pre>
<h2 id="station-pro-按键键值">Station Pro 按键键值</h2>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png"/></p>
<table width="1280px">
  <tr>
    <th width="160px">编号</th>
    <th width="160px">按键</th>
    <th width="240px">默认功能</th>
    <th width="360px">开发者是否可自定功能</th>
    <th width="360px">Unity 中对应的键值</th>
  </tr>
  <tr>
    <td>1</td>
    <td>音量＋</td>
    <td>加音量</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>2</td>
    <td>音量—</td>
    <td>减音量</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>3</td>
    <td>上</td>
    <td>向上移动</td>
    <td>true</td>
    <td>KeyCode.UpArrow</td>
  </tr>
  <tr>
    <td>3</td>
    <td>下</td>
    <td>向下移动</td>
    <td>true</td>
    <td>KeyCode.DownArrow</td>
  </tr>
  <tr>
    <td>4</td>
    <td>左</td>
    <td>向左移动</td>
    <td>true</td>
    <td>KeyCode.LeftArrow</td>
  </tr>
  <tr>
    <td>5</td>
    <td>右</td>
    <td>向右移动</td>
    <td>true</td>
    <td>KeyCode.RightArrow</td>
  </tr>
  <tr>
    <td>6</td>
    <td>X</td>
    <td>返回</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button2</td>
  </tr>
  <tr>
    <td>7</td>
    <td>O</td>
    <td>确认</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button3</td>
  </tr>
  <tr>
    <td>8</td>
    <td>确认键</td>
    <td>确认</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button0</td>
  </tr>
  <tr>
    <td>9</td>
    <td>电源</td>
    <td>开关机息屏</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>10</td>
    <td>Home</td>
    <td>返回应用首页</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>11</td>
    <td>菜单</td>
    <td>应用菜单</td>
    <td>true</td>
    <td>KeyCode.Menu</td>
  </tr>
</table>
<h2 id="眼镜连接状态监听">眼镜连接状态监听</h2>
<p>针对眼镜连接状态，请确保是在SLAM 初始化完成后再进行，否则有可能出现不可预知的错误。</p>
<pre><code class="language-C#">//register connection listener
NativeInterface.NativeAPI.RegisterUSBStatusCallback();
//USB connected
NativeInterface.NativeAPI.OnUSBConnect += () =&gt;
{

};

//USB lost connection
NativeInterface.NativeAPI.OnUSBDisConnect += () =&gt;
{

};
</code></pre>
<p>在不使用，或者当前生命周期结束时，要及时反注册。</p>
<pre><code class="language-C#">NativeInterface.NativeAPI.unRegisterUSBStatusCallback();
</code></pre>
<h2 id="获取眼镜imu-raw-数据">获取眼镜IMU Raw 数据</h2>
<p>Rokid 为开发者获取眼镜IMU 数据提供了监听入口。</p>
<pre><code class="language-C#">//register IMU sensor value listener
NativeInterface.NativeAPI.RegisterGlassSensorEvent();
//Acc Gyt Gnt timeStamp
NativeInterface.NativeAPI.OnGlassIMUSensorUpdate += (Acc, Gyt, Gnt, ts) =&gt;
{

};
</code></pre>
<p>在不使用，或者当前生命周期结束时，要及时反注册。</p>
<pre><code class="language-C#">NativeInterface.NativeAPI.UnregisterGlassSensorEvent();
</code></pre>
<h2 id="获取眼镜imu-rotation-数据">获取眼镜IMU Rotation 数据</h2>
<p>Rokid 为开发者获取眼镜IMU 计算的Rotation 数据提供了入口。</p>
<pre><code class="language-c#">//register Rotation value listener
NativeInterface.NativeAPI.RegisterRotationEvent();
//GameRotation Rotation timestamp
NativeInterface.NativeAPI.OnGlassIMURotationUpdate += (GameRotation, Rotation, ts) =&gt;
{

};
</code></pre>
<p>在不使用，或者当前生命周期结束时，要及时反注册。</p>
<pre><code class="language-C#">NativeInterface.NativeAPI.UnregisterRotationEvent();
</code></pre></div><script>var markdown ="## 获取基础信息

Rokid 为开发者提供NativeInterface.NativeAPI，为开发者提供了硬件设备信息。

```c#
public void GetHardwareInfo()
{
    //Get Glass Name
    NativeInterface.NativeAPI.GetGlassName();
    //Get SN of Glass
    NativeInterface.NativeAPI.GetGlassSN();
    //Get Firmware Version of Glass
    NativeInterface.NativeAPI.GetGlassFirmwareVersion();
    //...
}
```



## 控制眼镜显示亮度

Rokid 为开发者提供了眼镜显示亮度的控制接口```NativeInterface.NativeAPI.GetGlassBrightness()```和```NativeInterface.NativeAPI.SetGlassBrightness(int value)```。

```c#
/// <summary>
/// Get Glass Brightness
/// 
/// </summary>
/// <returns>value of brightness of glass which is a number between 0-100</returns>
public int GetBrightness()
{
    return NativeInterface.NativeAPI.GetGlassBrightness();
}

/// <summary>
/// Set Glass Brightness
/// 
/// </summary>
/// <param name="value">a int number between 10-100</param>
public void SetBrightness(int value)
{
    NativeInterface.NativeAPI.SetGlassBrightness(value);
}
```



## Station Pro 按键键值

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png"/>

<table width="1280px">
  <tr>
    <th width="160px">编号</th>
    <th width="160px">按键</th>
    <th width="240px">默认功能</th>
    <th width="360px">开发者是否可自定功能</th>
    <th width="360px">Unity 中对应的键值</th>
  </tr>
  <tr>
    <td>1</td>
    <td>音量＋</td>
    <td>加音量</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>2</td>
    <td>音量—</td>
    <td>减音量</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>3</td>
    <td>上</td>
    <td>向上移动</td>
    <td>true</td>
    <td>KeyCode.UpArrow</td>
  </tr>
  <tr>
    <td>3</td>
    <td>下</td>
    <td>向下移动</td>
    <td>true</td>
    <td>KeyCode.DownArrow</td>
  </tr>
  <tr>
    <td>4</td>
    <td>左</td>
    <td>向左移动</td>
    <td>true</td>
    <td>KeyCode.LeftArrow</td>
  </tr>
  <tr>
    <td>5</td>
    <td>右</td>
    <td>向右移动</td>
    <td>true</td>
    <td>KeyCode.RightArrow</td>
  </tr>
  <tr>
    <td>6</td>
    <td>X</td>
    <td>返回</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button2</td>
  </tr>
  <tr>
    <td>7</td>
    <td>O</td>
    <td>确认</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button3</td>
  </tr>
  <tr>
    <td>8</td>
    <td>确认键</td>
    <td>确认</td>
    <td>true</td>
    <td>KeyCode.Joystick1Button0</td>
  </tr>
  <tr>
    <td>9</td>
    <td>电源</td>
    <td>开关机息屏</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>10</td>
    <td>Home</td>
    <td>返回应用首页</td>
    <td>false</td>
    <td>Null</td>
  </tr>
  <tr>
    <td>11</td>
    <td>菜单</td>
    <td>应用菜单</td>
    <td>true</td>
    <td>KeyCode.Menu</td>
  </tr>
</table>

## 眼镜连接状态监听

针对眼镜连接状态，请确保是在SLAM 初始化完成后再进行，否则有可能出现不可预知的错误。

```C#
//register connection listener
NativeInterface.NativeAPI.RegisterUSBStatusCallback();
//USB connected
NativeInterface.NativeAPI.OnUSBConnect += () =>
{

};

//USB lost connection
NativeInterface.NativeAPI.OnUSBDisConnect += () =>
{

};
```

在不使用，或者当前生命周期结束时，要及时反注册。

```C#
NativeInterface.NativeAPI.unRegisterUSBStatusCallback();
```



## 获取眼镜IMU Raw 数据

Rokid 为开发者获取眼镜IMU 数据提供了监听入口。

```C#
//register IMU sensor value listener
NativeInterface.NativeAPI.RegisterGlassSensorEvent();
//Acc Gyt Gnt timeStamp
NativeInterface.NativeAPI.OnGlassIMUSensorUpdate += (Acc, Gyt, Gnt, ts) =>
{

};
```

在不使用，或者当前生命周期结束时，要及时反注册。

```C#
NativeInterface.NativeAPI.UnregisterGlassSensorEvent();
```



## 获取眼镜IMU Rotation 数据

Rokid 为开发者获取眼镜IMU 计算的Rotation 数据提供了入口。

```c#
//register Rotation value listener
NativeInterface.NativeAPI.RegisterRotationEvent();
//GameRotation Rotation timestamp
NativeInterface.NativeAPI.OnGlassIMURotationUpdate += (GameRotation, Rotation, ts) =>
{

};
```

在不使用，或者当前生命周期结束时，要及时反注册。

```C#
NativeInterface.NativeAPI.UnregisterRotationEvent();
```

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/stationPro%E6%8C%89%E9%94%AE.png

---

## 硬件设备信息
**Document ID:** edad99316a8b446ea5b16e7fc171baf3 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="rokid-眼镜硬件信息">Rokid 眼镜硬件信息</h1>
<table width="1280">
  <thead>
    <tr>
      <th width="80"></th>
      <th width="300">Air</th>
      <th width="300">Air Pro+</th>
      <th width="300">Max</th>
      <th width="300">Max Pro</th>
      <th width="300">Max 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>FOV</td>
      <td>35.2(H)/22(V)</td>
      <td>35.2(H)/22(V)</td>
      <td>40(H) 22(V)</td>
      <td>40(H) 25(V)</td>
      <td>40(H) 25(V) </td>
    </tr>
    <tr>
      <td>分辨率</td>
      <td>1920*1080 px</td>
      <td>1920*1080px</td>
      <td>1920*1080px</td>
      <td>1920*1200px</td>
      <td>1920*1200px</td>
    </tr>
    <tr>
      <td>摄像头</td>
      <td>无</td>
        <td><font color="#ff0000">有，可支持6DoF空间、2D手势、物体识别、图像识别</font></td>
      <td>无</td>
        <td><font color="#ff0000">有，可支持6DoF空间、3D手势、物体识别、图像识别</font></td>
      <td>无</td>
    </tr>
    <tr>
      <td>IMU</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
    </tr>
    <tr>
      <td>麦克风</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
    </tr>
    <tr>
      <td>扬声器</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
    </tr>
  </tbody>
</table>
<h1 id="rokid-station-硬件信息">Rokid Station 硬件信息</h1>
<table width='1280'>
  <thead>
    <tr>
      <th width='280'></th>
      <th width='500'>Station</th>
      <th width='500'>Station Pro</th>
      <th width='500'>Station 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>操纵按键</td>
      <td>有，支持遥控器和简单小游戏</td>
      <td>无</td>
      <td>无</td>
    </tr>
    <tr>
      <td>触控板</td>
      <td>无</td>
      <td>无</td>
      <td>无</td>
    </tr>
    <tr>
      <td>IMU</td>
      <td>无</td>
      <td>有，支持 3Dof 射线</td>
      <td>有，支持 3Dof 射线</td>
    </tr>
    <tr>
      <td>手势交互</td>
      <td>无</td>
      <td>有</td>
      <td>敬请期待</td>
    </tr>
    <tr>
      <td>空间显示能力</td>
      <td>0 DoF 为主，少量 3 DoF 能力</td>
      <td>6 DoF为主，可自由切换 0/3/6 Dof</td>
      <td>敬请期待</td>
    </tr>
  </tbody>
</table>
<p>目前支持 UXR2.0 SDK 能力的主要设备是：Master Pro 眼镜 + Station Pro。</p></div><script>var markdown ="# Rokid 眼镜硬件信息



<table width="1280">
  <thead>
    <tr>
      <th width="80"></th>
      <th width="300">Air</th>
      <th width="300">Air Pro+</th>
      <th width="300">Max</th>
      <th width="300">Max Pro</th>
      <th width="300">Max 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>FOV</td>
      <td>35.2(H)/22(V)</td>
      <td>35.2(H)/22(V)</td>
      <td>40(H) 22(V)</td>
      <td>40(H) 25(V)</td>
      <td>40(H) 25(V) </td>
    </tr>
    <tr>
      <td>分辨率</td>
      <td>1920*1080 px</td>
      <td>1920*1080px</td>
      <td>1920*1080px</td>
      <td>1920*1200px</td>
      <td>1920*1200px</td>
    </tr>
    <tr>
      <td>摄像头</td>
      <td>无</td>
        <td><font color="#ff0000">有，可支持6DoF空间、2D手势、物体识别、图像识别</font></td>
      <td>无</td>
        <td><font color="#ff0000">有，可支持6DoF空间、3D手势、物体识别、图像识别</font></td>
      <td>无</td>
    </tr>
    <tr>
      <td>IMU</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
      <td>有，支持3DoF空间和头控</td>
    </tr>
    <tr>
      <td>麦克风</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
      <td>有，支持语音识别</td>
    </tr>
    <tr>
      <td>扬声器</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
      <td>双耳，支持空间声场</td>
    </tr>
  </tbody>
</table>






# Rokid Station 硬件信息

<table width='1280'>
  <thead>
    <tr>
      <th width='280'></th>
      <th width='500'>Station</th>
      <th width='500'>Station Pro</th>
      <th width='500'>Station 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>操纵按键</td>
      <td>有，支持遥控器和简单小游戏</td>
      <td>无</td>
      <td>无</td>
    </tr>
    <tr>
      <td>触控板</td>
      <td>无</td>
      <td>无</td>
      <td>无</td>
    </tr>
    <tr>
      <td>IMU</td>
      <td>无</td>
      <td>有，支持 3Dof 射线</td>
      <td>有，支持 3Dof 射线</td>
    </tr>
    <tr>
      <td>手势交互</td>
      <td>无</td>
      <td>有</td>
      <td>敬请期待</td>
    </tr>
    <tr>
      <td>空间显示能力</td>
      <td>0 DoF 为主，少量 3 DoF 能力</td>
      <td>6 DoF为主，可自由切换 0/3/6 Dof</td>
      <td>敬请期待</td>
    </tr>
  </tbody>
</table>


目前支持 UXR2.0 SDK 能力的主要设备是：Master Pro 眼镜 + Station Pro。";</script>

---

## 0DoF 空间
**Document ID:** 7ab6a21f081a4512898039668ce84702 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK</p>
<h1 id="构建场景"><span class="prefix"></span><span class="content">构建场景</span><span class="suffix"></span></h1>
<p>在《设计规范》中，介绍了0DoF 空间的使用场景。这里以一个图片展示为例。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export0DoFSample.mp4">&#10;</iframe>
<h2 id="新建场景"><span class="prefix"></span><span class="content">1 新建场景</span><span class="suffix"></span></h2>
<p>新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial0DoF。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201171930689.png" alt="image-20240201171930689"></p>
<h2 id="替换maincamera"><span class="prefix"></span><span class="content">2 替换MainCamera</span><span class="suffix"></span></h2>
<p>双击打开场景，删除默认的MainCamera。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172216129.png" alt="image-20240201172216129"></p>
<p>在Project窗口查询<code>RKCameraRig</code>，并将Search 范围选择All 或者In Packages 找到<code>RKCameraRig</code>预制体。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png" alt="image-20240201172421282"></p>
<p>将<code>RKCameraRig</code>预制体拖到DemoSpatial0DoF 场景中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172532032.png" alt="image-20240201172532032"></p>
<h2 id="导入资源"><span class="prefix"></span><span class="content">3 导入资源</span><span class="suffix"></span></h2>
<p>将图片：<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E9%A2%84%E8%A7%88%E5%9B%BE.PNG">预览图</a>，加入到Assets/Textures/目录下（如果没有目录新建即可）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201173352137.png" alt="image-20240201173352137"></p>
<p>拖入到工程中的图片将TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201173943704.png" alt="image-20240201173943704"></p>
<h2 id="新建rawimage"><span class="prefix"></span><span class="content">4 新建RawImage</span><span class="suffix"></span></h2>
<p>在场景中新建RawImage，并将Canvas 的RenderType 改为World Space，Canvas 的RectTransform的Position改为{0,0,7}，Scale改为{0.002,0.002,0.002}。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174455346.png" alt="image-20240201174455346"></p>
<p>这里需要注意，RKCameraRig 的CallingMask 中不包含Layer UI，所以，这里还需要将Canvas 和RawImage 的Layer 属性改为Default。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174724093.png" alt="image-20240201174724093"></p>
<p>这里修改Canvas 的Layer 属性的时候会弹出：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174822719.png" alt="image-20240201174822719"></p>
<p>选择Yes,change children 即可将Canvas 下的所有的内容同步设置为同样的Layer 属性。</p>
<p>根据图片的像素大小调整RawImage 的宽高（2396*1066）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175148499.png" alt="image-20240201175148499"></p>
<p>当然调整完这里之后，最好是回到Canvas 重新调整Canvas 的宽高和Pose。最终的调整结果如下：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175247856.png" alt="image-20240201175247856"></p>
<p>将导入的资源Texture，赋值给RawImage 的Texture 属性。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175408634.png" alt="image-20240201175408634"></p>
<h1 id="设置0dof空间"><span class="prefix"></span><span class="content">设置0DoF空间</span><span class="suffix"></span></h1>
<p>在场景中设置0DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为None即可。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175619588.png" alt="image-20240201175619588"></p>
<h1 id="运行查看"><span class="prefix"></span><span class="content">运行查看</span><span class="suffix"></span></h1>
<h2 id="编译sample-应用"><span class="prefix"></span><span class="content">1 编译Sample 应用</span><span class="suffix"></span></h2>
<p>最后将DemoSpatial0DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240130193357331.png" alt="image-20240130193357331"></p>
<p>打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。</p>
<h2 id="wifi-adb连接ar-studio-与pc"><span class="prefix"></span><span class="content">2 WiFI-ADB连接AR Studio 与PC</span><span class="suffix"></span></h2>
<p>这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。</p>
<p>使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png" alt="image-20240202114350368"></p>
<h2 id="安装应用"><span class="prefix"></span><span class="content">3 安装应用</span><span class="suffix"></span></h2>
<p>这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo0DoF.apk 为例，将应用安装到AR Studio：</p>
<p>使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo0DoF.apk 安装应用。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202115015319.png" alt="image-20240202115015319"></p>
<p>这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。</p>
<h2 id="运行查看应用"><span class="prefix"></span><span class="content">4 运行查看应用</span><span class="suffix"></span></h2>
<p>点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png" alt="image-20240202120621671"></p>
<p>打开应用后会出现一个一直在眼镜正前方的物体图片（图中绿色部分是系统调试信息）：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120829855.png" alt="image-20240202120829855"></p>
</div><script>var markdown = "本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK

# 构建场景

在《设计规范》中，介绍了0DoF 空间的使用场景。这里以一个图片展示为例。

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export0DoFSample.mp4">
</iframe>

## 1 新建场景

新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial0DoF。

![image-20240201171930689](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201171930689.png)

## 2 替换MainCamera

双击打开场景，删除默认的MainCamera。

![image-20240201172216129](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172216129.png)

在Project窗口查询```RKCameraRig```，并将Search 范围选择All 或者In Packages 找到```RKCameraRig```预制体。

![image-20240201172421282](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png)

将```RKCameraRig```预制体拖到DemoSpatial0DoF 场景中。

![image-20240201172532032](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172532032.png)

## 3 导入资源

将图片：[预览图](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E9%A2%84%E8%A7%88%E5%9B%BE.PNG)，加入到Assets/Textures/目录下（如果没有目录新建即可）。

![image-20240201173352137](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201173352137.png)

拖入到工程中的图片将TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。

![image-20240201173943704](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201173943704.png)

## 4 新建RawImage

在场景中新建RawImage，并将Canvas 的RenderType 改为World Space，Canvas 的RectTransform的Position改为{0,0,7}，Scale改为{0.002,0.002,0.002}。

![image-20240201174455346](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174455346.png)

这里需要注意，RKCameraRig 的CallingMask 中不包含Layer UI，所以，这里还需要将Canvas 和RawImage 的Layer 属性改为Default。

![image-20240201174724093](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174724093.png)

这里修改Canvas 的Layer 属性的时候会弹出：

![image-20240201174822719](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174822719.png)

选择Yes,change children 即可将Canvas 下的所有的内容同步设置为同样的Layer 属性。

根据图片的像素大小调整RawImage 的宽高（2396*1066）。

![image-20240201175148499](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175148499.png)

当然调整完这里之后，最好是回到Canvas 重新调整Canvas 的宽高和Pose。最终的调整结果如下：

![image-20240201175247856](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175247856.png)

将导入的资源Texture，赋值给RawImage 的Texture 属性。

![image-20240201175408634](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175408634.png)

# 设置0DoF空间

在场景中设置0DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为None即可。

![image-20240201175619588](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175619588.png)

# 运行查看

## 1 编译Sample 应用

最后将DemoSpatial0DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。

![image-20240130193357331](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240130193357331.png)

打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。

## 2 WiFI-ADB连接AR Studio 与PC

这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。

使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。

![image-20240202114350368](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png)

## 3 安装应用

这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo0DoF.apk 为例，将应用安装到AR Studio：

使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo0DoF.apk 安装应用。

![image-20240202115015319](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202115015319.png)

这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。

## 4 运行查看应用

点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。

![image-20240202120621671](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png)

打开应用后会出现一个一直在眼镜正前方的物体图片（图中绿色部分是系统调试信息）：

![image-20240202120829855](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120829855.png)

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201171930689.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172216129.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 RKInput
**Document ID:** de536667a78446c3a88e664677a479bd | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="描述">描述</h1>
<p>UXR 内控制交互模块的基础管理组件,管理输入事件模块的生命周期:输入模块的初始化、激活、销毁、动态切换等</p>
<h1 id="如何使用">如何使用</h1>
<ul>
<li>将 RKInput 预制体拖放到场景层级中</li>
<li>加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/RKInput/[RKInput]</li>
</ul>
<h1 id="脚本属性设置说明">脚本属性设置&amp;说明</h1>
<h2 id="inputmodulemanager">InputModuleManager</h2>
<p>用于管理交互模块的切换,并且通过状态机统一管理各个交互组件的激活|非激活状态。</p>
<ul>
<li>DefaultInitModule (默认初始化的模块,可多选)
<ul>
<li>Nothing (不默认初始化任何输入模块)</li>
<li>Everything (初始化所有模块)</li>
<li>ThreeDof (PhoneThreeDof 射线)</li>
<li>Gesture( 手势交互)</li>
<li>Mouse (鼠标交互)</li>
<li>TouchPad (触控交互)</li>
</ul>
</li>
<li>DefaultActiveModule (默认激活的模块,前提该模块需要已经初始化,单选)
<ul>
<li>None (默认不激活任何交互)</li>
<li>ThreeDof (激活 PhoneThreeDof 射线)</li>
<li>Gesture(激活手势交互)</li>
<li>Mouse (激活鼠标交互)</li>
<li>TouchPad (触控交互)</li>
</ul>
</li>
</ul>
<h2 id="inputmoduleswitchactive">InputModuleSwitchActive</h2>
<p>该脚本实现了 IInputModuleActive 接口,统一将自身的状态激活信息注册到 InputModuleManager 中,能够在 InputModuleManager 状态发生改变时,根据自身的状态设置,去处理自身的激活|非激活</p>
<ul>
<li>
<p>ActiveModuleType (激活模块的类型,可多选)</p>
<ul>
<li>Nothing(任意类型都不激活)</li>
<li>Everything (除手势外任意交互都激活,手势需要满足 HandActiveDetail)</li>
<li>ThreeDof (当交互类型是 Phone3dof 交互时激活)</li>
<li>Mouse (当交互类型是鼠标交互时激活)</li>
</ul>
</li>
<li>HandActiveDetail (手的激活细节,只有在手势交互的时候需要设置,<span style="color: red;">注意手势激活细节需要满足以下的所有条件</span> )
<ul>
<li>DisableOnHandLost (是否在手丢失的时候禁用)</li>
<li>ActiveHandType (左右手的类型,多选,默认为 Everything)
<ul>
<li>Nothing (任意手势类型都不激活)</li>
<li>Everything (任意手势类型都激活)</li>
<li>LeftHand (当手势类型是左手时激活)</li>
<li>RightHand (当手势类型是右手时激活)</li>
</ul>
</li>
<li>ActiveHandInteractorType (远近场类型,多选,默认为 Everything)
<ul>
<li>Nothing (任意交互类型都不激活)</li>
<li>Everything (任意手势类型都激活)</li>
<li>Near (近场交互时激活)</li>
<li>Far (远场交互时激活)</li>
</ul>
</li>
<li>ActiveHandOrientationType(手心手背类型,多选,默认为 Everything)
<ul>
<li>Nothing (任意手心手背类型都不激活)</li>
<li>Everything (任意手心手背类型都激活)</li>
<li>Plam (只有在手心时激活)</li>
<li>Back(只有在手背时激活)</li>
</ul>
</li>
<li>ActiveHeadHandType (头手交互的激活状态)
<ul>
<li>Nothing (任意状态都不激活)</li>
<li>Everything (任意状态都激活)</li>
<li>NormalHand (当默认手时激活)</li>
<li>HeadHand (头手模式激活)</li>
</ul>
</li>
<li>ActiveWatchType(手表模块的激活类型,多选,默认为 Everything)
<ul>
<li>Nothing (任意手表状态都不激活)</li>
<li>Everything (任意手表状态都激活)</li>
<li>DisableWatch (当手表关闭时激活)</li>
<li>EnableWatch (当手表开启时激活)</li>
</ul>
</li>
</ul>
</li>
<li>Behaviour (MonoBehaviour 组件的引用 可选,默认为空,状态切换是时会切换绑定 InputModuleSwitchActive 的物体激活状态 不为空则绑定切换该 MonoBehaviour 组件的激活状态)</li>
</ul></div><script>var markdown ="# 描述

  UXR 内控制交互模块的基础管理组件,管理输入事件模块的生命周期:输入模块的初始化、激活、销毁、动态切换等

# 如何使用

- 将 RKInput 预制体拖放到场景层级中
- 加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/RKInput/[RKInput]

# 脚本属性设置&说明

## InputModuleManager

  用于管理交互模块的切换,并且通过状态机统一管理各个交互组件的激活|非激活状态。

  -   DefaultInitModule (默认初始化的模块,可多选)
      -   Nothing (不默认初始化任何输入模块)
      -   Everything (初始化所有模块)
      -   ThreeDof (PhoneThreeDof 射线)
      -   Gesture( 手势交互)
      -   Mouse (鼠标交互)
      -   TouchPad (触控交互)
  -   DefaultActiveModule (默认激活的模块,前提该模块需要已经初始化,单选)
      -   None (默认不激活任何交互)
      -   ThreeDof (激活 PhoneThreeDof 射线)
      -   Gesture(激活手势交互)
      -   Mouse (激活鼠标交互)
      -   TouchPad (触控交互)

## InputModuleSwitchActive

该脚本实现了 IInputModuleActive 接口,统一将自身的状态激活信息注册到 InputModuleManager 中,能够在 InputModuleManager 状态发生改变时,根据自身的状态设置,去处理自身的激活|非激活

  -   ActiveModuleType (激活模块的类型,可多选)

      -   Nothing(任意类型都不激活)
      -   Everything (除手势外任意交互都激活,手势需要满足 HandActiveDetail)
      -   ThreeDof (当交互类型是 Phone3dof 交互时激活)
      -   Mouse (当交互类型是鼠标交互时激活)
      
  -   HandActiveDetail (手的激活细节,只有在手势交互的时候需要设置,<span style="color: red;">注意手势激活细节需要满足以下的所有条件</span> )
      -   DisableOnHandLost (是否在手丢失的时候禁用)
      -   ActiveHandType (左右手的类型,多选,默认为 Everything)
          -   Nothing (任意手势类型都不激活)
          -   Everything (任意手势类型都激活)
          -   LeftHand (当手势类型是左手时激活)
          -   RightHand (当手势类型是右手时激活)
      -   ActiveHandInteractorType (远近场类型,多选,默认为 Everything)
          -   Nothing (任意交互类型都不激活)
          -   Everything (任意手势类型都激活)
          -   Near (近场交互时激活)
          -   Far (远场交互时激活)
      -   ActiveHandOrientationType(手心手背类型,多选,默认为 Everything)
          -   Nothing (任意手心手背类型都不激活)
          -   Everything (任意手心手背类型都激活)
          -   Plam (只有在手心时激活)
          -   Back(只有在手背时激活)
      -   ActiveHeadHandType (头手交互的激活状态)
          -   Nothing (任意状态都不激活)
          -   Everything (任意状态都激活)
          -   NormalHand (当默认手时激活)
          -   HeadHand (头手模式激活)
      -   ActiveWatchType(手表模块的激活类型,多选,默认为 Everything)
          -   Nothing (任意手表状态都不激活)
          -   Everything (任意手表状态都激活)
          -   DisableWatch (当手表关闭时激活)
          -   EnableWatch (当手表开启时激活)
  -   Behaviour (MonoBehaviour 组件的引用 可选,默认为空,状态切换是时会切换绑定 InputModuleSwitchActive 的物体激活状态 不为空则绑定切换该 MonoBehaviour 组件的激活状态)
";</script>

---

## 图像识别
**Document ID:** ae1e0bbdd1044a4fb69530c3c943d9c3 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><h1 id="使用图像识别"><span class="prefix"></span><span class="content">使用图像识别</span><span class="suffix"></span></h1>
<p>在使用图像识别之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。</p>
<p><em><strong>注意：图像识别均依赖Rokid Max Pro眼镜。</strong></em></p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportImageTracked.mp4">&#10;</iframe>
<h2 id="快速实现图像识别"><span class="prefix"></span><span class="content">1 快速实现图像识别</span><span class="suffix"></span></h2>
<p>本章介绍，如何快速实现图像识别功能。</p>
<p>Rokid 图像识别功能基于Rokid XR Extension 插件。导入方法：</p>
<p>打开【Package Manager】，并通过add package by name，输入name:<strong><code>com.rokid.xr.extension</code></strong>，即可完成导入。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/extension_input.png" alt="Add Extension"></p>
<h3 id="构建标准6dof-场景"><span class="prefix"></span><span class="content">1.1 构建标准6DoF 场景</span><span class="suffix"></span></h3>
<p>按照6DoF空间章节中介绍的方式，构建一个标准的6DoF 场景。</p>
<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg">
<h3 id="创建图像db"><span class="prefix"></span><span class="content">1.2 创建图像DB</span><span class="suffix"></span></h3>
<p>在Assets下创建文件夹Resources/ImageSource，在文件夹详情部分右键选择Create–&gt;XR–&gt;Rokid Reference Image Library。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/img_createlib.png" alt="image-20241009104410641"></p>
<p>为创建出来的Image Library重命名，这里以"RKImageLib"为例。双击打开，在工程Inspect中即可以看到Image Library 的详细配置，选择Add Image 添加图片。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image2.png" alt="image-20241009104953533"></p>
<p>创建文件夹Assets/Resources/ImageSource/Images，并将需要识别的图片<a href="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Monkey.png">Monkey</a>拖入该文件夹，图像支持PNG、JPG格式。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image3.png" alt="image-20241009110018584"></p>
<p>重新打开RKImageLib，并将该图片配置给RKImageLib 的Teture2D。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image4.png" alt="image-20241009110320314"></p>
<p>配置完图片之后，默认图像长边为A3纸长度（420mm），如果需要修改，将Specify Size 勾选上，并在Physical Size 部分填入真实值，仅填入长宽之一即可。</p>
<p><em><strong>Tips：单位是米（m）</strong></em></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image5.png" alt="image-20241009112355085"></p>
<p>最后，点击Generate DB，即可生成DB文件。生成的DB 文件在Assets/StreamingAssets 文件下。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image14.png" alt="image-20241009112529435"></p>
<h3 id="添加artrackedimagemanager"><span class="prefix"></span><span class="content">1.3 添加ARTrackedImageManager</span><span class="suffix"></span></h3>
<p>ARTrackedImageManager是图像识别的管理脚本，可以通过该脚本队图像识别过程及数据进行管理。</p>
<p>创建TrackedImageDemo，并将ARTrackedManager挂载到该物体上。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ARTrackedImageManager.png" alt="image-20241009114812249"></p>
<p>其中：</p>
<ul>
<li>Default Image Tracked Prefab: 图像物体</li>
<li>Marker DB File Name: 图像识别DB</li>
<li>Marker DB Path: 图像识别DB存储路径（当前版本仅支持存储在Streaming Assets 中）</li>
<li>On Enable Open Image Tracker: 当Enable 是启用Image Tracker</li>
</ul>
<h3 id="添加artrackedimageobj"><span class="prefix"></span><span class="content">1.4 添加ARTrackedImageObj</span><span class="suffix"></span></h3>
<p>ARTrackedImageObj 是用来管理识别结果的脚本，可以通过该脚本控制识别结果。</p>
<p>创建ImageTrackedObj，并将ARTrackedImageObj 挂载到该物体上。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ARTrackedImageObj.png" alt="image-20241009115519103"></p>
<p>其中：</p>
<ul>
<li>Tracked Image Index: 对应Image Liberty创建DB时需要识别的图像Index</li>
<li>Auto Fit Image Size: 是否根据图像大小改变大小</li>
<li>Disable When Trace Lost: 当跟踪丢失时是否Disable 当前物体</li>
<li>Use Smooth To Pose: 位姿平滑</li>
<li>On AR Tracked Image Added: 图像添加事件</li>
<li>On AR Tracked Image Updated: 图像数据更新事件</li>
<li>On AR Tracked Image Removed: 图像数据移除事件</li>
</ul>
<h3 id="配置artrackedimageobj"><span class="prefix"></span><span class="content">1.5 配置ARTrackedImageObj</span><span class="suffix"></span></h3>
<p>这里以一个简单的示例，在图像识别成功后，在图像位置创建一个Quad 用来表示覆盖现实图像，并在图像的四个角上放置4个不同颜色的小球。</p>
<p>在TrackedImageObj物体下创建Quad（OverlyPlane）、以及4个Sphere（LeftUp、LeftDown、RightUp、RightDown）。并创建五个不同颜色的半透明材质球，用以观察。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/TrackedImageObj.png" alt="image-20241009145606169"></p>
<p>这里可以将TrackedImageObj拖成Prefab使用，以方便后续使用。</p>
<p>编写脚本ImageTrackedDemo.cs 用以管理识别结果。</p>
<pre class=" language-c"><code class="prism # language-c">using Rokid<span class="token punctuation">.</span>UXR<span class="token punctuation">.</span>Module<span class="token punctuation">;</span>
using UnityEngine<span class="token punctuation">;</span>
using UnityEngine<span class="token punctuation">.</span>Assertions<span class="token punctuation">;</span>

<span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">///</span>
<span class="token comment">/// make 4 GameObjects to the tracked image's corners</span>
<span class="token comment">/// make an overly plane over the tracked image</span>
<span class="token comment">/// &lt;/summary&gt;</span>
public class ImageTrackedDemo <span class="token punctuation">:</span> MonoBehaviour
<span class="token punctuation">{</span>
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span> private GameObject overlyPlane<span class="token punctuation">;</span>

    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span> private GameObject leftUp<span class="token punctuation">;</span>
    
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span> private GameObject rightUp<span class="token punctuation">;</span>
    
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span> private GameObject leftDown<span class="token punctuation">;</span>
    
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span> private GameObject rightDown<span class="token punctuation">;</span>
    
    private bool isInitialize<span class="token punctuation">;</span>
    
    <span class="token comment">// Start is called before the first frame update</span>
    <span class="token keyword">void</span> <span class="token function">Start</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        Assert<span class="token punctuation">.</span><span class="token function">IsNotNull</span><span class="token punctuation">(</span>overlyPlane<span class="token punctuation">)</span><span class="token punctuation">;</span>
        Assert<span class="token punctuation">.</span><span class="token function">IsNotNull</span><span class="token punctuation">(</span>leftUp<span class="token punctuation">)</span><span class="token punctuation">;</span>
        Assert<span class="token punctuation">.</span><span class="token function">IsNotNull</span><span class="token punctuation">(</span>rightUp<span class="token punctuation">)</span><span class="token punctuation">;</span>
        Assert<span class="token punctuation">.</span><span class="token function">IsNotNull</span><span class="token punctuation">(</span>leftDown<span class="token punctuation">)</span><span class="token punctuation">;</span>
        Assert<span class="token punctuation">.</span><span class="token function">IsNotNull</span><span class="token punctuation">(</span>rightDown<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>isInitialize<span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
        
        <span class="token comment">//set all inactive when setup</span>
        isInitialize <span class="token operator">=</span> true<span class="token punctuation">;</span>
        overlyPlane<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        leftUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        leftDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    public <span class="token keyword">void</span> <span class="token function">OnTrackedImageAdded</span><span class="token punctuation">(</span>ARTrackedImageObj imageObj<span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        isInitialize <span class="token operator">=</span> true<span class="token punctuation">;</span>
        leftUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>true<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>true<span class="token punctuation">)</span><span class="token punctuation">;</span>
        leftDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>true<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>true<span class="token punctuation">)</span><span class="token punctuation">;</span>
        overlyPlane<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>true<span class="token punctuation">)</span><span class="token punctuation">;</span>
        
        <span class="token comment">//set as same when update</span>
        <span class="token function">OnTrackedImageUpdate</span><span class="token punctuation">(</span>imageObj<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    
    public <span class="token keyword">void</span> <span class="token function">OnTrackedImageUpdate</span><span class="token punctuation">(</span>ARTrackedImageObj imageObj<span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        leftUp<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>position <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position <span class="token operator">+</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>rotation <span class="token operator">*</span>
                                    new <span class="token function">Vector3</span><span class="token punctuation">(</span><span class="token operator">-</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>x<span class="token punctuation">,</span>
                                        imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightUp<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>position <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position <span class="token operator">+</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>rotation <span class="token operator">*</span>
                                      new <span class="token function">Vector3</span><span class="token punctuation">(</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>x<span class="token punctuation">,</span>
                                          imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        leftDown<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>position <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position <span class="token operator">+</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>rotation <span class="token operator">*</span>
                                      new <span class="token function">Vector3</span><span class="token punctuation">(</span><span class="token operator">-</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>x<span class="token punctuation">,</span>
                                          <span class="token operator">-</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightDown<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>position <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position <span class="token operator">+</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>rotation <span class="token operator">*</span>
                                       new <span class="token function">Vector3</span><span class="token punctuation">(</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>x<span class="token punctuation">,</span>
                                           <span class="token operator">-</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">.</span>extents<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        
        overlyPlane<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>localScale <span class="token operator">=</span> new <span class="token function">Vector3</span><span class="token punctuation">(</span>imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>size<span class="token punctuation">.</span>x<span class="token punctuation">,</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>size<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        overlyPlane<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>position <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position<span class="token punctuation">;</span>
        overlyPlane<span class="token punctuation">.</span>transform<span class="token punctuation">.</span>rotation <span class="token operator">=</span> imageObj<span class="token punctuation">.</span>trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>rotation<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    
    public <span class="token keyword">void</span> <span class="token function">OnTrackedImageRemoved</span><span class="token punctuation">(</span>ARTrackedImageObj trackedImage<span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        isInitialize <span class="token operator">=</span> false<span class="token punctuation">;</span>
        leftUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightUp<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        leftDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        rightDown<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        overlyPlane<span class="token punctuation">.</span><span class="token function">SetActive</span><span class="token punctuation">(</span>false<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre>
<p>将ImageTrackedDemo 挂载到TrackedImageObj，并配置相关物体信息。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/setupImageTrackedDemo.png" alt="image-20241009180557550"></p>
<p>然后将事件逻辑配置给ARTrackedImageObj。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/setupARTrackedImageObj.png" alt="image-20241009180808537"></p>
<p><strong>注意：配置是要注意对应好Tracked Image Index</strong></p>
<h3 id="配置多个图像"><span class="prefix"></span><span class="content">1.7 配置多个图像</span><span class="suffix"></span></h3>
<p>图像识别DB支持最多20张图片同时存在，需要注意的是，识别过程中如果视野范围内有多张图像，<strong>只有一张</strong>图像会被检出。</p>
<p>这里以<a href="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Monkey.png">Monkey</a>、<a href="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Elephant.png">Elephant</a>、<a href="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Lion.png">Lion</a>，这三张图为例。将这三张图拖入Assets/Resources/ImageSource/Images文件夹下。</p>
<p>重新打开RKImageLib，点击Add Image，将新增的两张图片按照创建图片DB时的设置方法配置到RKImageLib中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image12.png" alt="image-20241009201249687"></p>
<p>将场景中的ImageTrackedObj复制两份，将这3个分别命名为ImageTrackedObj1,、ImageTrackedObj2、ImageTrackedObj3，这里需要注意，每个ImageTrackedObj脚本中的Tracked Image Index 要和图像DB 中的图像Index做对齐。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image13.png" alt="image-20241009201747223"></p>
<p>如果需要看着更明显一些，可以修改OverPlane 的材质。</p>
<p>最后将ARTrackedImageManager 中的<strong>Default Tracked Image Prefab 配置为空</strong>，即可。</p>
<p>这样，当视野内出现三张图中的任意一张，都可以根据程序的配置展现不同的内容。</p>
<h2 id="自定义图像识别"><span class="prefix"></span><span class="content">2 自定义图像识别</span><span class="suffix"></span></h2>
<p>除了使用1 快速实现 中介绍的方法外，开发者也可以根据自己需求，通过ARTrackedImageManager 管理和使用图像识别功能。</p>
<h3 id="artrackedimagemanager详解"><span class="prefix"></span><span class="content">2.1 ARTrackedImageManager详解</span><span class="suffix"></span></h3>
<h4 id="生命周期"><span class="prefix"></span><span class="content">2.1.1 生命周期</span><span class="suffix"></span></h4>
<p>ARTrackedImageManager 在Awake 的时候开启图像识别功能，在OnDestroy 的时候关闭图像识别功能。</p>
<h4 id="数据接口"><span class="prefix"></span><span class="content">2.1.2 数据接口</span><span class="suffix"></span></h4>
<pre class=" language-c"><code class="prism # language-c">public <span class="token keyword">static</span> event Action<span class="token operator">&lt;</span>ARTrackedImage<span class="token operator">&gt;</span> OnTrackedImageAdded<span class="token punctuation">;</span>
public <span class="token keyword">static</span> event Action<span class="token operator">&lt;</span>ARTrackedImage<span class="token operator">&gt;</span> OnTrackedImageUpdated<span class="token punctuation">;</span>
public <span class="token keyword">static</span> event Action<span class="token operator">&lt;</span>ARTrackedImage<span class="token operator">&gt;</span> OnTrackedImageRemoved<span class="token punctuation">;</span>
</code></pre>
<p>接口示例：</p>
<pre class=" language-c"><code class="prism # language-c">ARTrackedImageManager<span class="token punctuation">.</span>OnTrackedImageAdded <span class="token operator">+</span><span class="token operator">=</span> trackedImage <span class="token operator">=</span><span class="token operator">&gt;</span>
<span class="token punctuation">{</span>
    var index <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>index<span class="token punctuation">;</span><span class="token comment">//识别到的图片索引</span>
    var pose <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">;</span><span class="token comment">//识别到的图片中心点位置</span>
    var size <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>size<span class="token punctuation">;</span><span class="token comment">//识别到的图片大小</span>
    var sizeScale <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>sizeScale<span class="token punctuation">;</span><span class="token comment">//识别到的图片缩放比例</span>
    var bounds <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">;</span><span class="token comment">//识别到的图片边界</span>
    Debug<span class="token punctuation">.</span><span class="token function">Log</span><span class="token punctuation">(</span>$<span class="token string">"====ARTrackedImageObj====: Added {trackedImage}"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>

ARTrackedImageManager<span class="token punctuation">.</span>OnTrackedImageUpdated <span class="token operator">+</span><span class="token operator">=</span> trackedImage <span class="token operator">=</span><span class="token operator">&gt;</span>
<span class="token punctuation">{</span>
    var index <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>index<span class="token punctuation">;</span><span class="token comment">//识别到的图片索引</span>
    var pose <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>pose<span class="token punctuation">;</span><span class="token comment">//识别到的图片中心点位置</span>
    var size <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>size<span class="token punctuation">;</span><span class="token comment">//识别到的图片大小</span>
    var sizeScale <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>sizeScale<span class="token punctuation">;</span><span class="token comment">//识别到的图片缩放比例</span>
    var bounds <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>bounds<span class="token punctuation">;</span><span class="token comment">//识别到的图片边界</span>
    Debug<span class="token punctuation">.</span><span class="token function">Log</span><span class="token punctuation">(</span>$<span class="token string">"====ARTrackedImageObj====: Updated {trackedImage}"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>

ARTrackedImageManager<span class="token punctuation">.</span>OnTrackedImageRemoved <span class="token operator">+</span><span class="token operator">=</span> trackedImage <span class="token operator">=</span><span class="token operator">&gt;</span>
<span class="token punctuation">{</span>
    var index <span class="token operator">=</span> trackedImage<span class="token punctuation">.</span>index<span class="token punctuation">;</span>
    Debug<span class="token punctuation">.</span><span class="token function">Log</span><span class="token punctuation">(</span>$<span class="token string">"====ARTrackedImageObj====: Removed {index}"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<p>其中ARTrackedImage 是图像数据类。</p>
<pre class=" language-c"><code class="prism # language-c">using System<span class="token punctuation">;</span>
using System<span class="token punctuation">.</span>Data<span class="token punctuation">.</span>Common<span class="token punctuation">;</span>
using System<span class="token punctuation">.</span>Runtime<span class="token punctuation">.</span>InteropServices<span class="token punctuation">;</span>
using Rokid<span class="token punctuation">.</span>UXR<span class="token punctuation">.</span>Native<span class="token punctuation">;</span>
using UnityEngine<span class="token punctuation">;</span>

namespace Rokid<span class="token punctuation">.</span>UXR<span class="token punctuation">.</span>Module
<span class="token punctuation">{</span>

    public class ARTrackedImage
    <span class="token punctuation">{</span>
        public <span class="token keyword">int</span> index<span class="token punctuation">;</span>
        public string name<span class="token punctuation">;</span>
        public <span class="token keyword">int</span> id<span class="token punctuation">;</span>
        public Pose pose<span class="token punctuation">;</span>
        public Vector2 size<span class="token punctuation">;</span>
        public <span class="token keyword">float</span> sizeScale<span class="token punctuation">;</span>
        public Bounds bounds<span class="token punctuation">;</span>


        public <span class="token function">ARTrackedImage</span><span class="token punctuation">(</span>RokidMarker marker<span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            this<span class="token punctuation">.</span>index <span class="token operator">=</span> marker<span class="token punctuation">.</span>imageIndex<span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>id <span class="token operator">=</span> marker<span class="token punctuation">.</span>id<span class="token punctuation">.</span><span class="token function">ToInt32</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>name <span class="token operator">=</span> Marshal<span class="token punctuation">.</span><span class="token function">PtrToStringAnsi</span><span class="token punctuation">(</span>marker<span class="token punctuation">.</span>name<span class="token punctuation">)</span><span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>pose <span class="token operator">=</span> new <span class="token function">Pose</span><span class="token punctuation">(</span>new <span class="token function">Vector3</span><span class="token punctuation">(</span>marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">4</span><span class="token punctuation">]</span><span class="token punctuation">,</span> marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">5</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token operator">-</span>marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">6</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
            new <span class="token function">Quaternion</span><span class="token punctuation">(</span><span class="token operator">-</span>marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token operator">-</span>marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">,</span> marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">2</span><span class="token punctuation">]</span><span class="token punctuation">,</span> marker<span class="token punctuation">.</span>pose<span class="token punctuation">[</span><span class="token number">3</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>size <span class="token operator">=</span> new <span class="token function">Vector2</span><span class="token punctuation">(</span>marker<span class="token punctuation">.</span>size<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">,</span> marker<span class="token punctuation">.</span>size<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>sizeScale <span class="token operator">=</span> Mathf<span class="token punctuation">.</span><span class="token function">Sqrt</span><span class="token punctuation">(</span>this<span class="token punctuation">.</span>size<span class="token punctuation">.</span>x <span class="token operator">*</span> this<span class="token punctuation">.</span>size<span class="token punctuation">.</span>x <span class="token operator">+</span> this<span class="token punctuation">.</span>size<span class="token punctuation">.</span>y <span class="token operator">*</span> this<span class="token punctuation">.</span>size<span class="token punctuation">.</span>y<span class="token punctuation">)</span><span class="token punctuation">;</span>
            this<span class="token punctuation">.</span>bounds <span class="token operator">=</span> new <span class="token function">Bounds</span><span class="token punctuation">(</span>this<span class="token punctuation">.</span>pose<span class="token punctuation">.</span>position<span class="token punctuation">,</span> new <span class="token function">Vector3</span><span class="token punctuation">(</span>size<span class="token punctuation">.</span>x<span class="token punctuation">,</span> size<span class="token punctuation">.</span>y<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>

        public <span class="token function">ARTrackedImage</span><span class="token punctuation">(</span>IntPtr id<span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            this<span class="token punctuation">.</span>id <span class="token operator">=</span> id<span class="token punctuation">.</span><span class="token function">ToInt32</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>

        public override string <span class="token function">ToString</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            <span class="token keyword">return</span> $<span class="token string">"\r\nIndex:{index}\r\nName:{name}\r\nId:{id}\r\nPose:{pose.position},{pose.rotation.eulerAngles}\r\nSize:{size}"</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre>
<h2 id="图像识别应用边界"><span class="prefix"></span><span class="content">图像识别应用边界</span><span class="suffix"></span></h2>

<table>
<thead>
<tr>
<th>边界项</th>
<th>边界</th>
</tr>
</thead>
<tbody>
<tr>
<td>大小与距离</td>
<td>等效A3纸大小1米以内</td>
</tr>
<tr>
<td>倾斜角度</td>
<td>左右50°、上下60°</td>
</tr>
<tr>
<td>遮挡比例</td>
<td>50%</td>
</tr>
<tr>
<td>折叠面积</td>
<td>10%</td>
</tr>
<tr>
<td>褶皱程度</td>
<td>褶皱带来的面积损失14%</td>
</tr>
</tbody>
</table><h1 id="图像模版质量"><span class="prefix"></span><span class="content">图像模版质量</span><span class="suffix"></span></h1>
<p>图像识别对图像质量有一定的要求，本章节介绍什么样的图像会有更好的识别效果。</p>
<h2 id="推荐模版样例"><span class="prefix"></span><span class="content">1 推荐模版样例</span><span class="suffix"></span></h2>
<p>纹理丰富、灰度对比度高、图案边缘清晰不规则。</p>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%A5%B3%E7%94%9F%E9%80%9A%E7%94%A8%E7%89%88.png" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B2.png" alt="image-20241009201747223">
<h2 id="不推荐模版样例"><span class="prefix"></span><span class="content">2 不推荐模版样例</span><span class="suffix"></span></h2>
<h3 id="图案不丰富、弱纹理，可提取特征点少、可利用信息少"><span class="prefix"></span><span class="content">2.1 图案不丰富、弱纹理，可提取特征点少、可利用信息少</span><span class="suffix"></span></h3>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B3.jpg" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B4.jpg" alt="image-20241009201747223">
<h3 id="重复纹理、存在较多重复元素（包括图案、文字），影响位姿计算"><span class="prefix"></span><span class="content">2.2 重复纹理、存在较多重复元素（包括图案、文字），影响位姿计算</span><span class="suffix"></span></h3>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B5.jpg" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B6.png" alt="image-20241009201747223">
<h2 id="图案边缘不清晰，缺乏边缘锐利图案"><span class="prefix"></span><span class="content">2.3 图案边缘不清晰，缺乏边缘锐利图案</span><span class="suffix"></span></h2>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B6.jpg" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B7.jpg" alt="image-20241009201747223">
<h2 id="图案颜色的灰度值对比度低，转为灰度图片后，对比度低，不利于远距离识别"><span class="prefix"></span><span class="content">2.4 图案颜色的灰度值对比度低，转为灰度图片后，对比度低，不利于远距离识别</span><span class="suffix"></span></h2>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B8.jpg" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B9.jpg" alt="image-20241009201747223">
<h3 id="图案分部过于集中"><span class="prefix"></span><span class="content">2.5 图案分部过于集中</span><span class="suffix"></span></h3>
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B10.jpg" alt="image-20241009201747223">
<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B11.jpg" alt="image-20241009201747223">
<h2 id="不推荐模版环境"><span class="prefix"></span><span class="content">3 不推荐模版环境</span><span class="suffix"></span></h2>
<p>（1）环境昏暗；</p>
<p>（2）模版图案较多反光，或图案放置在玻璃内，灯光照射玻璃较大反光；</p>
<p>（3）模版不平整；</p>
<p>（4）模版与背景高度融合，图案风格样式趋近；</p>
</div><script>var markdown = "# 使用图像识别

在使用图像识别之前，确保场景中已经加入RKCamera组件，并按照《空间构建》章节介绍完成了基础空间的构建。

***注意：图像识别均依赖Rokid Max Pro眼镜。***

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportImageTracked.mp4">
</iframe>

## 1 快速实现图像识别

本章介绍，如何快速实现图像识别功能。

Rokid 图像识别功能基于Rokid XR Extension 插件。导入方法：

打开【Package Manager】，并通过add package by name，输入name:**```com.rokid.xr.extension ```**，即可完成导入。

![Add Extension](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/extension_input.png)

### 1.1 构建标准6DoF 场景

按照6DoF空间章节中介绍的方式，构建一个标准的6DoF 场景。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg"/>

### 1.2 创建图像DB

在Assets下创建文件夹Resources/ImageSource，在文件夹详情部分右键选择Create-->XR-->Rokid Reference Image Library。 

![image-20241009104410641](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/img_createlib.png)

为创建出来的Image Library重命名，这里以"RKImageLib"为例。双击打开，在工程Inspect中即可以看到Image Library 的详细配置，选择Add Image 添加图片。

![image-20241009104953533](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image2.png)

创建文件夹Assets/Resources/ImageSource/Images，并将需要识别的图片[Monkey](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Monkey.png)拖入该文件夹，图像支持PNG、JPG格式。

![image-20241009110018584](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image3.png)

重新打开RKImageLib，并将该图片配置给RKImageLib 的Teture2D。

![image-20241009110320314](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image4.png)

配置完图片之后，默认图像长边为A3纸长度（420mm），如果需要修改，将Specify Size 勾选上，并在Physical Size 部分填入真实值，仅填入长宽之一即可。

***Tips：单位是米（m）***

![image-20241009112355085](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image5.png)

最后，点击Generate DB，即可生成DB文件。生成的DB 文件在Assets/StreamingAssets 文件下。

![image-20241009112529435](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image14.png)

### 1.3 添加ARTrackedImageManager

ARTrackedImageManager是图像识别的管理脚本，可以通过该脚本队图像识别过程及数据进行管理。

创建TrackedImageDemo，并将ARTrackedManager挂载到该物体上。

![image-20241009114812249](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ARTrackedImageManager.png)

其中：

- Default Image Tracked Prefab: 图像物体
- Marker DB File Name: 图像识别DB
- Marker DB Path: 图像识别DB存储路径（当前版本仅支持存储在Streaming Assets 中）
- On Enable Open Image Tracker: 当Enable 是启用Image Tracker

### 1.4 添加ARTrackedImageObj

ARTrackedImageObj 是用来管理识别结果的脚本，可以通过该脚本控制识别结果。

创建ImageTrackedObj，并将ARTrackedImageObj 挂载到该物体上。

![image-20241009115519103](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ARTrackedImageObj.png)

其中：

- Tracked Image Index: 对应Image Liberty创建DB时需要识别的图像Index
- Auto Fit Image Size: 是否根据图像大小改变大小
- Disable When Trace Lost: 当跟踪丢失时是否Disable 当前物体
- Use Smooth To Pose: 位姿平滑
- On AR Tracked Image Added: 图像添加事件
- On AR Tracked Image Updated: 图像数据更新事件
- On AR Tracked Image Removed: 图像数据移除事件

### 1.5 配置ARTrackedImageObj

这里以一个简单的示例，在图像识别成功后，在图像位置创建一个Quad 用来表示覆盖现实图像，并在图像的四个角上放置4个不同颜色的小球。

在TrackedImageObj物体下创建Quad（OverlyPlane）、以及4个Sphere（LeftUp、LeftDown、RightUp、RightDown）。并创建五个不同颜色的半透明材质球，用以观察。

![image-20241009145606169](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/TrackedImageObj.png)

这里可以将TrackedImageObj拖成Prefab使用，以方便后续使用。

编写脚本ImageTrackedDemo.cs 用以管理识别结果。

```C#
using Rokid.UXR.Module;
using UnityEngine;
using UnityEngine.Assertions;

/// <summary>
///
/// make 4 GameObjects to the tracked image's corners
/// make an overly plane over the tracked image
/// </summary>
public class ImageTrackedDemo : MonoBehaviour
{
    [SerializeField] private GameObject overlyPlane;

    [SerializeField] private GameObject leftUp;
    
    [SerializeField] private GameObject rightUp;
    
    [SerializeField] private GameObject leftDown;
    
    [SerializeField] private GameObject rightDown;
    
    private bool isInitialize;
    
    // Start is called before the first frame update
    void Start()
    {
        Assert.IsNotNull(overlyPlane);
        Assert.IsNotNull(leftUp);
        Assert.IsNotNull(rightUp);
        Assert.IsNotNull(leftDown);
        Assert.IsNotNull(rightDown);
        if (isInitialize) return;
        
        //set all inactive when setup
        isInitialize = true;
        overlyPlane.SetActive(false);
        leftUp.SetActive(false);
        rightUp.SetActive(false);
        leftDown.SetActive(false);
        rightDown.SetActive(false);
    }

    public void OnTrackedImageAdded(ARTrackedImageObj imageObj)
    {
        isInitialize = true;
        leftUp.SetActive(true);
        rightUp.SetActive(true);
        leftDown.SetActive(true);
        rightDown.SetActive(true);
        overlyPlane.SetActive(true);
        
        //set as same when update
        OnTrackedImageUpdate(imageObj);
    }
    
    public void OnTrackedImageUpdate(ARTrackedImageObj imageObj)
    {
        leftUp.transform.position = imageObj.trackedImage.pose.position + imageObj.trackedImage.pose.rotation *
                                    new Vector3(-imageObj.trackedImage.bounds.extents.x,
                                        imageObj.trackedImage.bounds.extents.y, 0);
        rightUp.transform.position = imageObj.trackedImage.pose.position + imageObj.trackedImage.pose.rotation *
                                      new Vector3(imageObj.trackedImage.bounds.extents.x,
                                          imageObj.trackedImage.bounds.extents.y, 0);
        leftDown.transform.position = imageObj.trackedImage.pose.position + imageObj.trackedImage.pose.rotation *
                                      new Vector3(-imageObj.trackedImage.bounds.extents.x,
                                          -imageObj.trackedImage.bounds.extents.y, 0);
        rightDown.transform.position = imageObj.trackedImage.pose.position + imageObj.trackedImage.pose.rotation *
                                       new Vector3(imageObj.trackedImage.bounds.extents.x,
                                           -imageObj.trackedImage.bounds.extents.y, 0);
        
        overlyPlane.transform.localScale = new Vector3(imageObj.trackedImage.size.x, imageObj.trackedImage.size.y, 1);
        overlyPlane.transform.position = imageObj.trackedImage.pose.position;
        overlyPlane.transform.rotation = imageObj.trackedImage.pose.rotation;
    }
    
    public void OnTrackedImageRemoved(ARTrackedImageObj trackedImage)
    {
        isInitialize = false;
        leftUp.SetActive(false);
        rightUp.SetActive(false);
        leftDown.SetActive(false);
        rightDown.SetActive(false);
        overlyPlane.SetActive(false);
    }
}
```

将ImageTrackedDemo 挂载到TrackedImageObj，并配置相关物体信息。

![image-20241009180557550](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/setupImageTrackedDemo.png)

然后将事件逻辑配置给ARTrackedImageObj。

![image-20241009180808537](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/setupARTrackedImageObj.png)

**注意：配置是要注意对应好Tracked Image Index**

### 1.7 配置多个图像

图像识别DB支持最多20张图片同时存在，需要注意的是，识别过程中如果视野范围内有多张图像，**只有一张**图像会被检出。

这里以[Monkey](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Monkey.png)、[Elephant](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Elephant.png)、[Lion](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Lion.png)，这三张图为例。将这三张图拖入Assets/Resources/ImageSource/Images文件夹下。

重新打开RKImageLib，点击Add Image，将新增的两张图片按照创建图片DB时的设置方法配置到RKImageLib中。

![image-20241009201249687](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image12.png)

将场景中的ImageTrackedObj复制两份，将这3个分别命名为ImageTrackedObj1,、ImageTrackedObj2、ImageTrackedObj3，这里需要注意，每个ImageTrackedObj脚本中的Tracked Image Index 要和图像DB 中的图像Index做对齐。

![image-20241009201747223](https://ota.rokidcdn.com/toB/Document/UXR2.0/253/Image13.png)

如果需要看着更明显一些，可以修改OverPlane 的材质。

最后将ARTrackedImageManager 中的**Default Tracked Image Prefab 配置为空**，即可。

这样，当视野内出现三张图中的任意一张，都可以根据程序的配置展现不同的内容。

## 2 自定义图像识别

除了使用1 快速实现 中介绍的方法外，开发者也可以根据自己需求，通过ARTrackedImageManager 管理和使用图像识别功能。

### 2.1 ARTrackedImageManager详解

#### 2.1.1 生命周期

ARTrackedImageManager 在Awake 的时候开启图像识别功能，在OnDestroy 的时候关闭图像识别功能。

#### 2.1.2 数据接口

```c#
public static event Action<ARTrackedImage> OnTrackedImageAdded;
public static event Action<ARTrackedImage> OnTrackedImageUpdated;
public static event Action<ARTrackedImage> OnTrackedImageRemoved;
```

接口示例：

```C#
ARTrackedImageManager.OnTrackedImageAdded += trackedImage =>
{
    var index = trackedImage.index;//识别到的图片索引
    var pose = trackedImage.pose;//识别到的图片中心点位置
    var size = trackedImage.size;//识别到的图片大小
    var sizeScale = trackedImage.sizeScale;//识别到的图片缩放比例
    var bounds = trackedImage.bounds;//识别到的图片边界
    Debug.Log($"====ARTrackedImageObj====: Added {trackedImage}");
};

ARTrackedImageManager.OnTrackedImageUpdated += trackedImage =>
{
    var index = trackedImage.index;//识别到的图片索引
    var pose = trackedImage.pose;//识别到的图片中心点位置
    var size = trackedImage.size;//识别到的图片大小
    var sizeScale = trackedImage.sizeScale;//识别到的图片缩放比例
    var bounds = trackedImage.bounds;//识别到的图片边界
    Debug.Log($"====ARTrackedImageObj====: Updated {trackedImage}");
};

ARTrackedImageManager.OnTrackedImageRemoved += trackedImage =>
{
    var index = trackedImage.index;
    Debug.Log($"====ARTrackedImageObj====: Removed {index}");
};
```

其中ARTrackedImage 是图像数据类。

```C#
using System;
using System.Data.Common;
using System.Runtime.InteropServices;
using Rokid.UXR.Native;
using UnityEngine;

namespace Rokid.UXR.Module
{

    public class ARTrackedImage
    {
        public int index;
        public string name;
        public int id;
        public Pose pose;
        public Vector2 size;
        public float sizeScale;
        public Bounds bounds;


        public ARTrackedImage(RokidMarker marker)
        {
            this.index = marker.imageIndex;
            this.id = marker.id.ToInt32();
            this.name = Marshal.PtrToStringAnsi(marker.name);
            this.pose = new Pose(new Vector3(marker.pose[4], marker.pose[5], -marker.pose[6]),
            new Quaternion(-marker.pose[0], -marker.pose[1], marker.pose[2], marker.pose[3]));
            this.size = new Vector2(marker.size[0], marker.size[1]);
            this.sizeScale = Mathf.Sqrt(this.size.x * this.size.x + this.size.y * this.size.y);
            this.bounds = new Bounds(this.pose.position, new Vector3(size.x, size.y, 0));
        }

        public ARTrackedImage(IntPtr id)
        {
            this.id = id.ToInt32();
        }

        public override string ToString()
        {
            return $"\r\nIndex:{index}\r\nName:{name}\r\nId:{id}\r\nPose:{pose.position},{pose.rotation.eulerAngles}\r\nSize:{size}";
        }
    }
}
```

## 图像识别应用边界

| 边界项     | 边界                  |
| ---------- | --------------------- |
| 大小与距离 | 等效A3纸大小1米以内   |
| 倾斜角度   | 左右50°、上下60°      |
| 遮挡比例   | 50%                   |
| 折叠面积   | 10%                   |
| 褶皱程度   | 褶皱带来的面积损失14% |

# 图像模版质量

图像识别对图像质量有一定的要求，本章节介绍什么样的图像会有更好的识别效果。

## 1 推荐模版样例

纹理丰富、灰度对比度高、图案边缘清晰不规则。

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%A5%B3%E7%94%9F%E9%80%9A%E7%94%A8%E7%89%88.png" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B2.png" alt="image-20241009201747223" />

## 2 不推荐模版样例

### 2.1 图案不丰富、弱纹理，可提取特征点少、可利用信息少

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B3.jpg" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B4.jpg" alt="image-20241009201747223" />

### 2.2 重复纹理、存在较多重复元素（包括图案、文字），影响位姿计算

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B5.jpg" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B6.png" alt="image-20241009201747223" />

## 2.3 图案边缘不清晰，缺乏边缘锐利图案

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B6.jpg" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B7.jpg" alt="image-20241009201747223" />

## 2.4 图案颜色的灰度值对比度低，转为灰度图片后，对比度低，不利于远距离识别

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B8.jpg" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B9.jpg" alt="image-20241009201747223" />

### 2.5 图案分部过于集中

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B10.jpg" alt="image-20241009201747223" />

<img width="300" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E6%A0%B7%E4%BE%8B11.jpg" alt="image-20241009201747223" />

## 3 不推荐模版环境

（1）环境昏暗；

（2）模版图案较多反光，或图案放置在玻璃内，灯光照射玻璃较大反光；

（3）模版不平整；

（4）模版与背景高度融合，图案风格样式趋近；
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/extension_input.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.8/plane01.jpg
- https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/img_createlib.png

---

## 离线语音指令交互
**Document ID:** 46ad4753629549f5afad0defbf54fdb5 | **Tags:** 离线语音

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>本指南介绍如何在 Unity 项目中集成 Rokid 提供的离线语音识别功能，支持通过自定义语音指令与应用交互。此文档涵盖了所需的环境配置、集成步骤以及示例代码。</p>
<h3 id="一、环境配置"><span class="prefix"></span><span class="content">一、环境配置</span><span class="suffix"></span></h3>
<h4 id="启用自定义-gradle-模板"><span class="prefix"></span><span class="content">1.  启用自定义 Gradle 模板</span><span class="suffix"></span></h4>
<ol>
<li>在 Unity 菜单栏中选择 <code>Edit &gt; Project Settings</code>。</li>
<li>进入 <code>Player &gt; Publishing Settings</code>，找到 <code>Build</code> 部分。</li>
<li>勾选以下选项：
<ul>
<li><strong>Custom Main Gradle Template</strong></li>
<li><strong>Custom Gradle Settings Template</strong></li>
</ul>
</li>
</ol>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/voice_publishing_settings.jpg" alt="voice_publishing_settings"></p>
<h4 id="配置-maven-仓库地址"><span class="prefix"></span><span class="content">2. 配置 Maven 仓库地址</span><span class="suffix"></span></h4>
<ol>
<li>打开 <code>Custom Gradle Settings Template</code> 文件（默认路径为 <code>Assets/Plugins/Android/SettingsTemplate.gradle</code>）。</li>
<li>在  <code>repositories</code> 部分添加 Maven 仓库地址：</li>
</ol>
<pre class=" language-c"><code class="prism # language-c">maven <span class="token punctuation">{</span>
    url <span class="token string">'https://maven.rokid.com/repository/maven-public/'</span>
<span class="token punctuation">}</span>
</code></pre>
<h4 id="配置插件依赖"><span class="prefix"></span><span class="content">3.  配置插件依赖</span><span class="suffix"></span></h4>
<ol>
<li>打开 <code>Custom Main Gradle Template</code> 文件（默认路径为 <code>Assets/Plugins/Android/MainTemplate.gradle</code>）。</li>
<li>在 <code>dependencies</code> 块中添加以下依赖：</li>
</ol>
<pre class=" language-c"><code class="prism # language-c"><span class="token function">implementation</span><span class="token punctuation">(</span><span class="token string">"com.rokid.uxrplugin:rkuxrextend:3.0.3-20250115.072636-1"</span><span class="token punctuation">)</span>
</code></pre>
<h2 id="二、离线语音功能集成"><span class="prefix"></span><span class="content">二、离线语音功能集成</span><span class="suffix"></span></h2>
<h4 id="确认录音权限"><span class="prefix"></span><span class="content">1. 确认录音权限</span><span class="suffix"></span></h4>
<p>在脚本的 <code>Awake</code> 方法中，检查是否已授权录音权限。如果未授权，弹出权限请求：</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>Permission<span class="token punctuation">.</span><span class="token function">HasUserAuthorizedPermission</span><span class="token punctuation">(</span><span class="token string">"android.permission.RECORD_AUDIO"</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    Permission<span class="token punctuation">.</span><span class="token function">RequestUserPermission</span><span class="token punctuation">(</span><span class="token string">"android.permission.RECORD_AUDIO"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>
<h4 id="初始化语音控制"><span class="prefix"></span><span class="content">2. 初始化语音控制</span><span class="suffix"></span></h4>
<p>在 <code>Start</code> 方法中调用 <code>InitializeVoiceControl</code> 初始化语音模块：</p>
<pre class=" language-c"><code class="prism # language-c">private <span class="token keyword">void</span> <span class="token function">InitializeVoiceControl</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>isInitialized<span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        ModuleManager<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">RegistModule</span><span class="token punctuation">(</span><span class="token string">"com.rokid.voicecommand.VoiceCommandHelper"</span><span class="token punctuation">,</span> false<span class="token punctuation">)</span><span class="token punctuation">;</span>
        OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">ChangeVoiceCommandLanguage</span><span class="token punctuation">(</span>LANGUAGE<span class="token punctuation">.</span>CHINESE<span class="token punctuation">)</span><span class="token punctuation">;</span>
        isInitialized <span class="token operator">=</span> true<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre>
<h4 id="添加语音指令"><span class="prefix"></span><span class="content">3. 添加语音指令</span><span class="suffix"></span></h4>
<p>使用 <code>AddInstruct</code> 方法添加离线语音指令。中文和英文语音指令如下：</p>
<pre class=" language-c"><code class="prism # language-c">OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">AddInstruct</span><span class="token punctuation">(</span>LANGUAGE<span class="token punctuation">.</span>CHINESE<span class="token punctuation">,</span> <span class="token string">"变成蓝色"</span><span class="token punctuation">,</span> <span class="token string">"bian cheng lan se"</span><span class="token punctuation">,</span> this<span class="token punctuation">.</span>gameObject<span class="token punctuation">.</span>name<span class="token punctuation">,</span> <span class="token string">"OnReceive"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">AddInstruct</span><span class="token punctuation">(</span>LANGUAGE<span class="token punctuation">.</span>CHINESE<span class="token punctuation">,</span> <span class="token string">"变成绿色"</span><span class="token punctuation">,</span> <span class="token string">"bian cheng lv se"</span><span class="token punctuation">,</span> this<span class="token punctuation">.</span>gameObject<span class="token punctuation">.</span>name<span class="token punctuation">,</span> <span class="token string">"OnReceive"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">AddInstruct</span><span class="token punctuation">(</span>LANGUAGE<span class="token punctuation">.</span>ENGLISH<span class="token punctuation">,</span> <span class="token string">"Show blue"</span><span class="token punctuation">,</span> <span class="token string">"show blue"</span><span class="token punctuation">,</span> this<span class="token punctuation">.</span>gameObject<span class="token punctuation">.</span>name<span class="token punctuation">,</span> <span class="token string">"OnReceive"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">AddInstruct</span><span class="token punctuation">(</span>LANGUAGE<span class="token punctuation">.</span>ENGLISH<span class="token punctuation">,</span> <span class="token string">"Show green"</span><span class="token punctuation">,</span> <span class="token string">"show green"</span><span class="token punctuation">,</span> this<span class="token punctuation">.</span>gameObject<span class="token punctuation">.</span>name<span class="token punctuation">,</span> <span class="token string">"OnReceive"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<h4 id="提交指令"><span class="prefix"></span><span class="content">4. 提交指令</span><span class="suffix"></span></h4>
<p>添加指令后，需要通过 <code>Commit</code> 提交：</p>
<pre class=" language-c"><code class="prism # language-c">OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">Commit</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<h4 id="处理语音指令"><span class="prefix"></span><span class="content">5. 处理语音指令</span><span class="suffix"></span></h4>
<p>创建 <code>OnReceive</code> 方法，处理离线语音指令：</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token keyword">void</span> <span class="token function">OnReceive</span><span class="token punctuation">(</span>string msg<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    infoText<span class="token punctuation">.</span>text <span class="token operator">=</span> msg<span class="token punctuation">;</span>
    Debug<span class="token punctuation">.</span><span class="token function">Log</span><span class="token punctuation">(</span><span class="token string">"-RKX- UXR-Sample:: On Voice Response received : "</span> <span class="token operator">+</span> msg<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">if</span> <span class="token punctuation">(</span>string<span class="token punctuation">.</span><span class="token function">Equals</span><span class="token punctuation">(</span><span class="token string">"变成蓝色"</span><span class="token punctuation">,</span> msg<span class="token punctuation">)</span> <span class="token operator">||</span> string<span class="token punctuation">.</span><span class="token function">Equals</span><span class="token punctuation">(</span><span class="token string">"Show blue"</span><span class="token punctuation">,</span> msg<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        m_Render<span class="token punctuation">.</span>material<span class="token punctuation">.</span>color <span class="token operator">=</span> Color<span class="token punctuation">.</span>blue<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>string<span class="token punctuation">.</span><span class="token function">Equals</span><span class="token punctuation">(</span><span class="token string">"变成绿色"</span><span class="token punctuation">,</span> msg<span class="token punctuation">)</span> <span class="token operator">||</span> string<span class="token punctuation">.</span><span class="token function">Equals</span><span class="token punctuation">(</span><span class="token string">"Show green"</span><span class="token punctuation">,</span> msg<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        m_Render<span class="token punctuation">.</span>material<span class="token punctuation">.</span>color <span class="token operator">=</span> Color<span class="token punctuation">.</span>green<span class="token punctuation">;</span>
        
    <span class="token punctuation">}</span>
    <span class="token keyword">else</span>
    <span class="token punctuation">{</span>
        Debug<span class="token punctuation">.</span><span class="token function">Log</span><span class="token punctuation">(</span><span class="token string">"voice OnResponse: "</span> <span class="token operator">+</span> msg<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre>
<h4 id="清理资源"><span class="prefix"></span><span class="content">6. 清理资源</span><span class="suffix"></span></h4>
<p>在脚本的 <code>OnDestroy</code> 方法中，清理已注册的语音指令：</p>
<pre class=" language-c"><code class="prism # language-c">OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">ClearAllInstruct</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
OfflineVoiceModule<span class="token punctuation">.</span>Instance<span class="token punctuation">.</span><span class="token function">Commit</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
</div><script>var markdown = "本指南介绍如何在 Unity 项目中集成 Rokid 提供的离线语音识别功能，支持通过自定义语音指令与应用交互。此文档涵盖了所需的环境配置、集成步骤以及示例代码。

### 一、环境配置

#### 1.  启用自定义 Gradle 模板

1. 在 Unity 菜单栏中选择 `Edit > Project Settings`。
2. 进入 `Player > Publishing Settings`，找到 `Build` 部分。
3. 勾选以下选项：
   - **Custom Main Gradle Template**
   - **Custom Gradle Settings Template**

![voice_publishing_settings](https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/voice_publishing_settings.jpg)

#### 2. 配置 Maven 仓库地址

1. 打开 `Custom Gradle Settings Template` 文件（默认路径为 `Assets/Plugins/Android/SettingsTemplate.gradle`）。
2. 在  `repositories` 部分添加 Maven 仓库地址：

```c#
maven {
    url 'https://maven.rokid.com/repository/maven-public/'
}
```

#### 3.  配置插件依赖

1. 打开 `Custom Main Gradle Template` 文件（默认路径为 `Assets/Plugins/Android/MainTemplate.gradle`）。
2. 在 `dependencies` 块中添加以下依赖：

```c#
implementation("com.rokid.uxrplugin:rkuxrextend:3.0.3-20250115.072636-1")
```


## 二、离线语音功能集成

#### 1. 确认录音权限

在脚本的 `Awake` 方法中，检查是否已授权录音权限。如果未授权，弹出权限请求：

```c#
if (!Permission.HasUserAuthorizedPermission("android.permission.RECORD_AUDIO"))
{
    Permission.RequestUserPermission("android.permission.RECORD_AUDIO");
}
```

#### 2. 初始化语音控制

在 `Start` 方法中调用 `InitializeVoiceControl` 初始化语音模块：

```c#
private void InitializeVoiceControl()
{
    if (!isInitialized)
    {
        ModuleManager.Instance.RegistModule("com.rokid.voicecommand.VoiceCommandHelper", false);
        OfflineVoiceModule.Instance.ChangeVoiceCommandLanguage(LANGUAGE.CHINESE);
        isInitialized = true;
    }
}
```

#### 3. 添加语音指令

使用 `AddInstruct` 方法添加离线语音指令。中文和英文语音指令如下：

```c#
OfflineVoiceModule.Instance.AddInstruct(LANGUAGE.CHINESE, "变成蓝色", "bian cheng lan se", this.gameObject.name, "OnReceive");
OfflineVoiceModule.Instance.AddInstruct(LANGUAGE.CHINESE, "变成绿色", "bian cheng lv se", this.gameObject.name, "OnReceive");

OfflineVoiceModule.Instance.AddInstruct(LANGUAGE.ENGLISH, "Show blue", "show blue", this.gameObject.name, "OnReceive");
OfflineVoiceModule.Instance.AddInstruct(LANGUAGE.ENGLISH, "Show green", "show green", this.gameObject.name, "OnReceive");
```

#### 4. 提交指令

添加指令后，需要通过 `Commit` 提交：

```c#
OfflineVoiceModule.Instance.Commit();
```

#### 5. 处理语音指令

创建 `OnReceive` 方法，处理离线语音指令：

```c#
void OnReceive(string msg)
{
    infoText.text = msg;
    Debug.Log("-RKX- UXR-Sample:: On Voice Response received : " + msg);

    if (string.Equals("变成蓝色", msg) || string.Equals("Show blue", msg))
    {
        m_Render.material.color = Color.blue;
    }
    else if (string.Equals("变成绿色", msg) || string.Equals("Show green", msg))
    {
        m_Render.material.color = Color.green;
        
    }
    else
    {
        Debug.Log("voice OnResponse: " + msg);
    }
}
```

#### 6. 清理资源

在脚本的 `OnDestroy` 方法中，清理已注册的语音指令：

```c#
OfflineVoiceModule.Instance.ClearAllInstruct();
OfflineVoiceModule.Instance.Commit();
```
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/voice_publishing_settings.jpg

---

## 获取SLAM 相关信息
**Document ID:** 9645493d31b64917942723d387756ed8 | **Tags:** 点云接驳

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><h2 id="获取slam-状态"><span class="prefix"></span><span class="content">获取SLAM 状态</span><span class="suffix"></span></h2>
<p>Rokid 为开发者提供了SLAM 状态获取接口。通过接口<code>NativeInterface.NativeAPI.GetHeadTrackingStatus()</code>，返回值为<code>HeadTrackingStatus</code> 类型。</p>
<pre class=" language-c"><code class="prism # language-c">HeadTrackingStatus status <span class="token operator">=</span> NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">GetHeadTrackingStatus</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">GetHeadTrackingStatus</span><span class="token punctuation">(</span>out SlamTrackingStatus trackingStatus<span class="token punctuation">,</span> 
                                                out SlamImageQaulity imageQuality<span class="token punctuation">,</span> 
                                                out SlamKinecticQaulity kineticQuality<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<pre class=" language-c"><code class="prism # language-c">public <span class="token keyword">enum</span> HeadTrackingStatus
<span class="token punctuation">{</span>
    Unknow <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">,</span>
    UnInit <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">,</span>
    Detecting <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">,</span><span class="token comment">//RESERVED</span>
    Tracking <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">,</span>
    Track_Limited <span class="token operator">=</span> <span class="token number">4</span><span class="token punctuation">,</span><span class="token comment">//RESERVED</span>
    Tracking_Bad <span class="token operator">=</span> <span class="token number">5</span><span class="token punctuation">,</span><span class="token comment">//RESERVED</span>
    Tracking_Paused <span class="token operator">=</span> <span class="token number">6</span><span class="token punctuation">,</span>
    Tracking_Stopped <span class="token operator">=</span> <span class="token number">7</span><span class="token punctuation">,</span>
    Tracking_Error <span class="token operator">=</span> <span class="token number">99</span>
<span class="token punctuation">}</span>

public <span class="token keyword">enum</span> SlamTrackingStatus
<span class="token punctuation">{</span>
    Success <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">,</span>
    Bad <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">,</span>
    Fail <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">,</span>
    Unknow <span class="token operator">=</span> <span class="token number">404</span>
<span class="token punctuation">}</span>

public <span class="token keyword">enum</span> SlamImageQaulity
<span class="token punctuation">{</span>
    Good <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">,</span>
    Weak <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">,</span>
    Dark <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">,</span>
    Bright <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">,</span>
    Unknow <span class="token operator">=</span> <span class="token number">404</span>
<span class="token punctuation">}</span>

public <span class="token keyword">enum</span> SlamKinecticQaulity
<span class="token punctuation">{</span>
    Good <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">,</span>
    FootFast <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">,</span>
    Unknow <span class="token operator">=</span> <span class="token number">404</span>
<span class="token punctuation">}</span>
</code></pre>
<h2 id="获取渲染时刻pose"><span class="prefix"></span><span class="content">获取渲染时刻Pose</span><span class="suffix"></span></h2>
<p>Rokid 为开发者提供了SLAM 渲染上屏时刻的位姿。通过接口<code>NativeInterface.NativeAPI.GetHeadPose(out long ts)</code>获取。</p>
<pre class=" language-c"><code class="prism # language-c">var pose <span class="token operator">=</span> NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">GetHeadPose</span><span class="token punctuation">(</span>out <span class="token keyword">long</span> ts<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<p>其中ts 是返回的时间戳。</p>
<h1 id="获取相机内参"><span class="prefix"></span><span class="content">获取相机内参</span><span class="suffix"></span></h1>
<pre class=" language-c"><code class="prism # language-c">
<span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">/// Get fx,fy</span>
<span class="token comment">/// &lt;/summary&gt;</span>
<span class="token comment">/// &lt;param name="data"&gt;&lt;/param&gt;</span>
public <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">GetFocalLength</span><span class="token punctuation">(</span><span class="token keyword">float</span><span class="token punctuation">[</span><span class="token punctuation">]</span> data<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Utils<span class="token punctuation">.</span><span class="token function">IsAndroidPlatfrom</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">getFocalLength</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">/// Get cx,cy</span>
<span class="token comment">/// &lt;/summary&gt;</span>
<span class="token comment">/// &lt;param name="data"&gt;&lt;/param&gt;</span>
public <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">GetPrincipalPoint</span><span class="token punctuation">(</span><span class="token keyword">float</span><span class="token punctuation">[</span><span class="token punctuation">]</span> data<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Utils<span class="token punctuation">.</span><span class="token function">IsAndroidPlatfrom</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">getPrincipalPoint</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">/// Get width,height</span>
<span class="token comment">/// &lt;/summary&gt;</span>
<span class="token comment">/// &lt;param name="data"&gt;&lt;/param&gt;</span>
public <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">GetImageDimensions</span><span class="token punctuation">(</span><span class="token keyword">int</span><span class="token punctuation">[</span><span class="token punctuation">]</span> data<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Utils<span class="token punctuation">.</span><span class="token function">IsAndroidPlatfrom</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">getImageDimensions</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">/// pinhole:k1,k2,k3,p1,p2</span>
<span class="token comment">/// fisheye:alpha,k1,k2,k3,k4;</span>
<span class="token comment">/// &lt;/summary&gt;</span>
<span class="token comment">/// &lt;param name="data"&gt;&lt;/param&gt;</span>
public <span class="token keyword">static</span> <span class="token keyword">void</span> <span class="token function">GetDistortion</span><span class="token punctuation">(</span><span class="token keyword">float</span><span class="token punctuation">[</span><span class="token punctuation">]</span> data<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Utils<span class="token punctuation">.</span><span class="token function">IsAndroidPlatfrom</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token function">getDistortion</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>
<h2 id="获取camera-view"><span class="prefix"></span><span class="content">获取Camera View</span><span class="suffix"></span></h2>
<p>Rokid 为开发者提供了相机数据。</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token comment">/// &lt;summary&gt;</span>
<span class="token comment">/// Listener of Camera data</span>
<span class="token comment">/// &lt;/summary&gt;</span>
<span class="token comment">/// &lt;param name="width"&gt;preview size width&lt;/param&gt;</span>
<span class="token comment">/// &lt;param name="height"&gt;preview size height&lt;/param&gt;</span>
<span class="token comment">/// &lt;param name="yuvImage"&gt;camera image&lt;/param&gt;</span>
<span class="token comment">/// &lt;param name="ts"&gt;timestamp&lt;/param&gt;</span>
public <span class="token keyword">void</span> <span class="token function">OnCameraDataUpdate</span><span class="token punctuation">(</span><span class="token keyword">int</span> width<span class="token punctuation">,</span> <span class="token keyword">int</span> height<span class="token punctuation">,</span> byte<span class="token punctuation">[</span><span class="token punctuation">]</span> yuvImage<span class="token punctuation">,</span> <span class="token keyword">long</span> ts<span class="token punctuation">)</span>
<span class="token punctuation">{</span>

<span class="token punctuation">}</span>
</code></pre>
<p>在必要的地方添加监听。</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token comment">//Add camera data listener</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span>OnCameraDataUpdate <span class="token operator">+</span><span class="token operator">=</span> OnCameraDataUpdate<span class="token punctuation">;</span>
</code></pre>
<p>在必要的地方设置接口图像类型及开始图像监听。</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token comment">//Set Camera Preview Data Type 1--BGRA32 2--YUV</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">SetCameraPreviewDataType</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">//Start Camera Preview</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">StartCameraPreview</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<p>在不使用，或者当前生命周期结束时，要及时反注册。</p>
<pre class=" language-c"><code class="prism # language-c"><span class="token comment">//remove camera data listener</span>
NativeInterface<span class="token punctuation">.</span>OnCameraDataUpdate <span class="token operator">-</span><span class="token operator">=</span> OnCameraDataUpdate<span class="token punctuation">;</span>
</code></pre>
<h2 id="获取camera-image-时刻pose"><span class="prefix"></span><span class="content">获取Camera Image 时刻Pose</span><span class="suffix"></span></h2>
<pre class=" language-c"><code class="prism # language-c"><span class="token comment">//Set Camera Preview Data Type 1--BGRA32 2--YUV</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">SetCameraPreviewDataType</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">//Add Camera Data Listener</span>
NativeInterface<span class="token punctuation">.</span>OnCameraDataUpdate <span class="token operator">+</span><span class="token operator">=</span> OnCameraDataUpdate<span class="token punctuation">;</span>
<span class="token comment">//Start Camera Preview</span>
NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">StartCameraPreview</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

public <span class="token keyword">void</span> <span class="token function">OnCameraDataUpdate</span><span class="token punctuation">(</span><span class="token keyword">int</span> width<span class="token punctuation">,</span> <span class="token keyword">int</span> height<span class="token punctuation">,</span> byte<span class="token punctuation">[</span><span class="token punctuation">]</span> yuvImage<span class="token punctuation">,</span> <span class="token keyword">long</span> ts<span class="token punctuation">)</span>
<span class="token punctuation">{</span>
	var pose <span class="token operator">=</span> NativeInterface<span class="token punctuation">.</span>NativeAPI<span class="token punctuation">.</span><span class="token function">GetHistoryCameraPhysicsPose</span><span class="token punctuation">(</span>ts<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>
</div><script>var markdown = "## 获取SLAM 状态

Rokid 为开发者提供了SLAM 状态获取接口。通过接口```NativeInterface.NativeAPI.GetHeadTrackingStatus()```，返回值为```HeadTrackingStatus``` 类型。

```C#
HeadTrackingStatus status = NativeInterface.NativeAPI.GetHeadTrackingStatus();
NativeInterface.NativeAPI.GetHeadTrackingStatus(out SlamTrackingStatus trackingStatus, 
                                                out SlamImageQaulity imageQuality, 
                                                out SlamKinecticQaulity kineticQuality);
```

```C#
public enum HeadTrackingStatus
{
    Unknow = 0,
    UnInit = 1,
    Detecting = 2,//RESERVED
    Tracking = 3,
    Track_Limited = 4,//RESERVED
    Tracking_Bad = 5,//RESERVED
    Tracking_Paused = 6,
    Tracking_Stopped = 7,
    Tracking_Error = 99
}

public enum SlamTrackingStatus
{
    Success = 0,
    Bad = 1,
    Fail = 2,
    Unknow = 404
}

public enum SlamImageQaulity
{
    Good = 0,
    Weak = 1,
    Dark = 2,
    Bright = 3,
    Unknow = 404
}

public enum SlamKinecticQaulity
{
    Good = 0,
    FootFast = 1,
    Unknow = 404
}
```



## 获取渲染时刻Pose

 Rokid 为开发者提供了SLAM 渲染上屏时刻的位姿。通过接口```NativeInterface.NativeAPI.GetHeadPose(out long ts)```获取。

```C#
var pose = NativeInterface.NativeAPI.GetHeadPose(out long ts);
```

其中ts 是返回的时间戳。

# 获取相机内参

```c#

/// <summary>
/// Get fx,fy
/// </summary>
/// <param name="data"></param>
public static void GetFocalLength(float[] data)
{
    if (Utils.IsAndroidPlatfrom())
        getFocalLength(data);
}

/// <summary>
/// Get cx,cy
/// </summary>
/// <param name="data"></param>
public static void GetPrincipalPoint(float[] data)
{
    if (Utils.IsAndroidPlatfrom())
        getPrincipalPoint(data);
}

/// <summary>
/// Get width,height
/// </summary>
/// <param name="data"></param>
public static void GetImageDimensions(int[] data)
{
    if (Utils.IsAndroidPlatfrom())
        getImageDimensions(data);
}

/// <summary>
/// pinhole:k1,k2,k3,p1,p2
/// fisheye:alpha,k1,k2,k3,k4;
/// </summary>
/// <param name="data"></param>
public static void GetDistortion(float[] data)
{
    if (Utils.IsAndroidPlatfrom())
        getDistortion(data);
}
```



## 获取Camera View

Rokid 为开发者提供了相机数据。

```c#
/// <summary>
/// Listener of Camera data
/// </summary>
/// <param name="width">preview size width</param>
/// <param name="height">preview size height</param>
/// <param name="yuvImage">camera image</param>
/// <param name="ts">timestamp</param>
public void OnCameraDataUpdate(int width, int height, byte[] yuvImage, long ts)
{

}
```
在必要的地方添加监听。

```C#
//Add camera data listener
NativeInterface.NativeAPI.OnCameraDataUpdate += OnCameraDataUpdate;
```

在必要的地方设置接口图像类型及开始图像监听。

```C#
//Set Camera Preview Data Type 1--BGRA32 2--YUV
NativeInterface.NativeAPI.SetCameraPreviewDataType(1);
//Start Camera Preview
NativeInterface.NativeAPI.StartCameraPreview();
```

在不使用，或者当前生命周期结束时，要及时反注册。

```C#
//remove camera data listener
NativeInterface.OnCameraDataUpdate -= OnCameraDataUpdate;
```

## 获取Camera Image 时刻Pose

```C#
//Set Camera Preview Data Type 1--BGRA32 2--YUV
NativeInterface.NativeAPI.SetCameraPreviewDataType(1);
//Add Camera Data Listener
NativeInterface.OnCameraDataUpdate += OnCameraDataUpdate;
//Start Camera Preview
NativeInterface.NativeAPI.StartCameraPreview();

public void OnCameraDataUpdate(int width, int height, byte[] yuvImage, long ts)
{
	var pose = NativeInterface.NativeAPI.GetHistoryCameraPhysicsPose(ts);
}
```

";</script>

---

## 3DoF 空间
**Document ID:** 2ae7a721b99444239ea901292a5b004b | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK</p>
<h1 id="构建场景"><span class="prefix"></span><span class="content">构建场景</span><span class="suffix"></span></h1>
<p>在《设计规范》中，介绍了3DoF 空间的使用场景。这里以一个图片环廊为例。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export3DoF.mp4">&#10;</iframe>
<h2 id="新建场景"><span class="prefix"></span><span class="content">1 新建场景</span><span class="suffix"></span></h2>
<p>新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial3DoF。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132509933.png" alt="image-20240204132509933"></p>
<h2 id="替换maincamera"><span class="prefix"></span><span class="content">2 替换MainCamera</span><span class="suffix"></span></h2>
<p>双击打开场景，删除默认的MainCamera。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132555324.png" alt="image-20240204132555324"></p>
<p>在Project窗口查询<code>RKCameraRig</code>，并将Search 范围选择All 或者In Packages 找到<code>RKCameraRig</code>预制体。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png" alt="image-20240201172421282"></p>
<p>将<code>RKCameraRig</code>预制体拖到DemoSpatial3DoF 场景中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132701040.png" alt="image-20240204132701040"></p>
<h2 id="导入资源"><span class="prefix"></span><span class="content">3 导入资源</span><span class="suffix"></span></h2>
<p>将图片：<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E9%A2%84%E8%A7%88%E5%9B%BE.PNG">预览图</a>、<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C.jpg">开启你的多屏空间办公新体验</a>、<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E4%BC%91%E6%86%A9.png">休憩</a>加入到Assets/Textures/目录下（如果没有目录新建即可）,并将这些图片的TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。</p>
<p>拖入到工程中的图片将TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204113058752.png" alt="image-20240204113058752"></p>
<h2 id="新建rawimage"><span class="prefix"></span><span class="content">4 新建RawImage</span><span class="suffix"></span></h2>
<p>在场景中新建RawImage，并将Canvas 的RenderType 改为World Space，Canvas 的RectTransform的Position改为{0,0,7}，Scale改为{0.002,0.002,0.002}。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174455346.png" alt="image-20240201174455346"></p>
<p>这里需要注意，RKCameraRig 的CallingMask 中不包含Layer UI，所以，这里还需要将Canvas 和RawImage 的Layer 属性改为Default。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174724093.png" alt="image-20240201174724093"></p>
<p>这里修改Canvas 的Layer 属性的时候会弹出：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174822719.png" alt="image-20240201174822719"></p>
<p>选择Yes,change children 即可将Canvas 下的所有的内容同步设置为同样的Layer 属性。</p>
<p>根据图片的像素大小调整RawImage 的宽高（2396*1066）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175148499.png" alt="image-20240201175148499"></p>
<p>当然调整完这里之后，最好是回到Canvas 重新调整Canvas 的宽高和Pose。最终的调整结果如下：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175247856.png" alt="image-20240201175247856"></p>
<p>将导入的资源Texture，赋值给RawImage 的Texture 属性。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175408634.png" alt="image-20240201175408634"></p>
<p>同理在空间中继续放置CanvasRight、CanvasLeft，分别用来绘制&lt;开启你的多平空间办公体验&gt;和&lt;休憩&gt;。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204113332085.png" alt="image-20240204113332085"></p>
<h1 id="设置3dof空间（rotation-only）"><span class="prefix"></span><span class="content">设置3DoF空间（Rotation Only）</span><span class="suffix"></span></h1>
<p>在场景中设置3DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为Rotation Only即可。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204114539462.png" alt="image-20240204114539462"></p>
<h1 id="运行查看"><span class="prefix"></span><span class="content">运行查看</span><span class="suffix"></span></h1>
<h2 id="编译sample-应用"><span class="prefix"></span><span class="content">1 编译Sample 应用</span><span class="suffix"></span></h2>
<p>最后将DemoSpatial3DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204114654855.png" alt="image-20240204114654855"></p>
<p>打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。</p>
<h2 id="wifi-adb连接ar-studio-与pc"><span class="prefix"></span><span class="content">2 WiFI-ADB连接AR Studio 与PC</span><span class="suffix"></span></h2>
<p>使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png" alt="image-20240202114350368"></p>
<h2 id="安装应用"><span class="prefix"></span><span class="content">3 安装应用</span><span class="suffix"></span></h2>
<p>这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo3DoF.apk 为例，将应用安装到AR Studio：</p>
<p>使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo3DoF.apk 安装应用。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204115310915.png" alt="image-20240204115310915"></p>
<p>这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。</p>
<h2 id="运行查看应用"><span class="prefix"></span><span class="content">4 运行查看应用</span><span class="suffix"></span></h2>
<p>点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png" alt="image-20240202120621671"></p>
<p>打开应用后可以通过转动头部，观察场景中的三张图片。（场景中的绿色文字是系统的调试信息）：</p>
<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/3DoF.mp4"></iframe>
</div><script>var markdown = "本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK

# 构建场景

在《设计规范》中，介绍了3DoF 空间的使用场景。这里以一个图片环廊为例。

<iframe width="960" height="602"  src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export3DoF.mp4">
</iframe>


## 1 新建场景

新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial3DoF。

![image-20240204132509933](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132509933.png)

## 2 替换MainCamera

双击打开场景，删除默认的MainCamera。

![image-20240204132555324](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132555324.png)

在Project窗口查询```RKCameraRig```，并将Search 范围选择All 或者In Packages 找到```RKCameraRig```预制体。

![image-20240201172421282](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png)

将```RKCameraRig```预制体拖到DemoSpatial3DoF 场景中。

![image-20240204132701040](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132701040.png)

## 3 导入资源

将图片：[预览图](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E9%A2%84%E8%A7%88%E5%9B%BE.PNG)、[开启你的多屏空间办公新体验](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E5%BC%80%E5%90%AF%E4%BD%A0%E7%9A%84%E5%A4%9A%E5%B1%8F%E7%A9%BA%E9%97%B4%E5%8A%9E%E5%85%AC%E6%96%B0%E4%BD%93%E9%AA%8C.jpg)、[休憩](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Images/%E4%BC%91%E6%86%A9.png)加入到Assets/Textures/目录下（如果没有目录新建即可）,并将这些图片的TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。

拖入到工程中的图片将TextureType修改为Sprite(2D and UI)，并点击Apply 生成Sprite。

![image-20240204113058752](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204113058752.png)

## 4 新建RawImage

在场景中新建RawImage，并将Canvas 的RenderType 改为World Space，Canvas 的RectTransform的Position改为{0,0,7}，Scale改为{0.002,0.002,0.002}。

![image-20240201174455346](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174455346.png)

这里需要注意，RKCameraRig 的CallingMask 中不包含Layer UI，所以，这里还需要将Canvas 和RawImage 的Layer 属性改为Default。

![image-20240201174724093](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174724093.png)

这里修改Canvas 的Layer 属性的时候会弹出：

![image-20240201174822719](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201174822719.png)

选择Yes,change children 即可将Canvas 下的所有的内容同步设置为同样的Layer 属性。

根据图片的像素大小调整RawImage 的宽高（2396*1066）。

![image-20240201175148499](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175148499.png)

当然调整完这里之后，最好是回到Canvas 重新调整Canvas 的宽高和Pose。最终的调整结果如下：

![image-20240201175247856](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175247856.png)

将导入的资源Texture，赋值给RawImage 的Texture 属性。

![image-20240201175408634](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201175408634.png)

同理在空间中继续放置CanvasRight、CanvasLeft，分别用来绘制<开启你的多平空间办公体验>和<休憩>。

![image-20240204113332085](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204113332085.png)

# 设置3DoF空间（Rotation Only）

在场景中设置3DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为Rotation Only即可。

![image-20240204114539462](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204114539462.png)

# 运行查看

## 1 编译Sample 应用

最后将DemoSpatial3DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。

![image-20240204114654855](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204114654855.png)

打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。

## 2 WiFI-ADB连接AR Studio 与PC


使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。

![image-20240202114350368](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png)

## 3 安装应用

这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo3DoF.apk 为例，将应用安装到AR Studio：

使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo3DoF.apk 安装应用。

![image-20240204115310915](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204115310915.png)

这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。

## 4 运行查看应用

点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。

![image-20240202120621671](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png)

打开应用后可以通过转动头部，观察场景中的三张图片。（场景中的绿色文字是系统的调试信息）：



<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/3DoF.mp4"></iframe>
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132509933.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204132555324.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 RKHand
**Document ID:** 9470c1e8a8e34ea5923348d0717585ba | **Tags:** 远近场交互，手势Mesh

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="描述">描述</h1>
<p>手势交互的基础组件,包含手势的远场交互(RayInteractor),近场交互(PokeInteractor),手势 Mesh 的渲染等。</p>
<h1 id="如何使用">如何使用</h1>
<ul>
<li>如果你想自定义手势的样式和交互的话,可以将 RKHand 预制体拖拽到场景中,然后修改预制体。</li>
<li>加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/Interactor/RKHand</li>
</ul>
<h1 id="组件层级说明">组件层级说明</h1>
<ul>
<li>
<p>RKHand</p>
<ul>
<li>LeftHandRender (左手渲染器)
<ul>
<li>LeftHandGesture (用户编辑器手的模型渲染)</li>
<li>HandRootAxis (手的整体坐标轴,默认关闭)</li>
<li>SkeletonNode (手的骨骼节点,默认关闭)</li>
<li>SkeletonLine (手的骨骼线条,默认关闭)</li>
<li>HandMesh (手 Mesh 绘制, 默认开启,更换手的 mesh,可以替换该模块手的材质)</li>
</ul>
</li>
<li>
<p>RightHandRender (右手渲染器)</p>
<ul>
<li>RightHandGesture (用户编辑器手的模型渲染)</li>
<li>HandRootAxis (手的整体坐标轴,默认关闭)</li>
<li>SkeletonNode (手的骨骼节点,默认关闭)</li>
<li>SkeletonLine (手的骨骼线条,默认关闭)</li>
<li>HandMesh (手 Mesh 绘制, 默认开启,更换手的 mesh,可以替换该模块手的材质)</li>
</ul>
</li>
<li>
<p>LeftHandInteractor (左手节点交互器)</p>
<ul>
<li>RayInteractor (射线交互器)
<ul>
<li>Content (交互器容器,用控制整体射线视觉的激活和关闭)
<ul>
<li>Selector (选择器, 用于定义射线选中&amp;非选中交互)</li>
<li>RayVisual (射线视觉渲染, 如果您要修改射线样式,可以修该模块的材质,以及 LineRender 设置)</li>
<li>CursorVisual (光标视觉渲染, 如果您要修改光标样式,可以修改该模块材质)</li>
</ul>
</li>
</ul>
</li>
<li>PokeInteractor (Poke 交互器)</li>
<li>GrabIntercator (Grab 交互器)
<ul>
<li>GrabbedPoint (抓起物体的附着点)</li>
<li>SnapPoint (捏起物体的附着点)</li>
</ul>
</li>
</ul>
</li>
<li>RightHandInteractor (右手节点交互器)
<ul>
<li>RayInteractor (射线交互器)
<ul>
<li>Content (交互器容器,用控制整体射线视觉的激活和关闭)
<ul>
<li>Selector (选择器, 用于定义射线选中&amp;非选中交互)</li>
<li>RayVisual (射线视觉渲染, 如果您要修改射线样式,可以修改模块的材质,以及 LineRender 设置)</li>
<li>CursorVisual (光标视觉渲染, 如果您要修改光标样式,可以修改该模块材质)</li>
</ul>
</li>
</ul>
</li>
<li>PokeInteractor (Poke 交互器)</li>
<li>GrabIntercator (Grab 交互器)
<ul>
<li>GrabbedPoint (抓起物体的附着点)</li>
<li>SnapPoint (捏起物体的附着点)</li>
</ul>
</li>
</ul>
</li>
</ul>
</li>
</ul>
<h1 id="关键脚本属性设置说明">关键脚本属性设置&amp;说明</h1>
<h2 id="moduleinteractor">ModuleInteractor</h2>
<p>模块交互器,用户将对应的交互器,绑定到对应的模块,同时处理对应模块交互器的更新,销毁等</p>
<ul>
<li>
<p>InputModuleType (交互绑定的输入模块类型)</p>
<ul>
<li>None (不绑定任何输入模块)</li>
<li>ThreeDof (绑定到 Phone 3dof 射线输入模块)</li>
<li>Gesture (绑定手势输入模块)</li>
<li>Mouse (绑定到鼠标输入模块)</li>
<li>ButtonMouse (绑定到滑鼠输入模块)</li>
<li>TouchPad (绑定到触控输入模块)</li>
</ul>
</li>
</ul>
<h2 id="handrender">HandRender</h2>
<p>手的渲染器,处理手的 Mesh 骨骼 坐标轴等的渲染</p>
<ul>
<li>HandType (渲染手的类型)
<ul>
<li>LeftHand (左手)</li>
<li>RightHand (右手)</li>
</ul>
</li>
<li>DrawSkeleton (是否绘制骨骼,默认不绘制)</li>
<li>DrawMesh (是否绘制 Mesh, 默认绘制)</li>
<li>DrawAxis (是否绘制坐标轴, 默认绘制)</li>
<li>SkeletonNode (骨骼节点引用)</li>
<li>SkeletoLine (骨骼线引用)</li>
<li>HandMesh (手的 Mesh 过滤器引用)</li>
<li>HandRootAxis (手心的坐标轴引用,用显示手的朝向,在调试的时候可以使用)</li>
</ul>
<h2 id="interactorstatechange">InteractorStateChange</h2>
<p>用于监听交互器状态改变,主要用于手势远近场的切换</p>
<ul>
<li>Hand (手的类型)</li>
<li>PreState (缓存上一帧 Poke 交互器上一帧的状态)</li>
<li>IsFar (当前是否是远场交互)</li>
<li>Dragging (缓存拖拽状态)</li>
</ul>
<h2 id="rayinteractor">RayInteractor</h2>
<p>射线交互器能够和场景中带有 RayInteractable 的物体交互</p>
<ul>
<li>InteractableFiltes (过滤可交互物体的数组,可选)</li>
<li>MaxIterationsPerFrame (每帧最大的刷新次数)</li>
<li>State (交互器的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (覆盖状态)</li>
<li>Select (选中状态)</li>
<li>Disable (禁用状态)</li>
</ul>
</li>
<li>Selector (选择器,可以复写,修改交互器的点击条件)</li>
<li>MaxRayLength (射线最大的长度)</li>
<li>NoHoverCursorDistance (在射线没有 hover 的状态下,光标的距离)</li>
<li>EqualDistanceThreshold (在距离表面的距离低于此阈值时，被视为相等，用于排序目的)</li>
</ul>
<h2 id="pokeinteractor">PokeInteractor</h2>
<p>戳击交互器,用于近场戳击的交互,能够使用食指的戳与 UI 或者物体进行交互</p>
<ul>
<li>InteractableFiltes (过滤可交互物体的数组,可选)</li>
<li>State (交互器的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (覆盖状态)</li>
<li>Select (选中状态)</li>
<li>Disable (禁用状态)</li>
</ul>
</li>
<li>Selector (选择器,可以复写,修改交互器的点击条件)</li>
<li>MaxRayLength (射线最大的长度)</li>
<li>SurfaceHitPoint (交互器与交互物体表面的碰撞点)</li>
<li>Radius (Poke 交互器的半径)</li>
<li>TouchReleaseThreshold (当戳击起点超过该距离高于表面时，将触发取消选择的戳击动作)</li>
<li>EqualDistanceThreshold (此阈值以下的表面距离在排序目的上被视为相等)</li>
<li>TouchPoint (Poke 交互器与可交互物体表面的接触点,该接触点在交互器小于可交互物体的最大距离时,就会激活,无需实质的接触)</li>
</ul>
<h2 id="handraypose">HandRayPose</h2>
<p>用户计算手势射线的位姿</p>
<ul>
<li>EditorParams (编辑器下模拟参数)
<ul>
<li>UseMouseRotate (在编辑器模式下是否采用鼠标进行旋转,默认激活)</li>
<li>FollowCameraInEditor (在编辑器模式下,是否让射线跟随相机,默认激活)</li>
<li>LocalPositionInCameraSpace (在编辑器模式下, 射线在相机空间下的相对位置)</li>
<li>MaxDistanceInEditor (射线在编辑器模式下投射的最远距离)</li>
</ul>
</li>
<li>Hand(左右手类型)</li>
<li>Shoulder(估算的肩膀位置,基于相机空间)</li>
<li>Neck(脖子位置,基于相机空间)</li>
<li>PalmForwardInfluencePow(手掌方向,对最终射线方向的影响的强度)</li>
<li>UpForwardInfluencePow(射线上翘的强度)</li>
<li>MinHandObjHidRayVisual(手距物体的距离,小于该距离会隐藏射线)</li>
<li>RayInteractor (射线交互器的引用)</li>
<li>LogText (调试 UI,默认为空)</li>
</ul>
<h2 id="pokepose">PokePose</h2>
<p>用于 Poke 交互器的位姿</p>
<ul>
<li>Hand (左右手类型)</li>
<li>MaxDistanceInEditor (编辑器模式下,最远可交互距离)</li>
</ul>
<h2 id="hand">Hand</h2>
<p>用于处理手势近场与模型的交互器</p>
<ul>
<li>HandType 左右手类型</li>
<li>OtherHand 另外一只手的引用</li>
<li>UseHoverSphere 使用使用球体进行 hover</li>
<li>HoverUpdateInterval Hover 更新间隔</li>
<li>HoverSphereTransform 球体 Hover Transform 引用</li>
<li>HoverSphereRadius 球体 Hover 的半径</li>
<li>ObjectGrabbedPoint 抓取物体的附着点 引用</li>
<li>ObjectSnapPoint 捏合抓取物体的附着点 引用</li>
<li>ShowDebugText 是否显示日志</li>
</ul>
<h1 id="如何禁用手势的远近场自动切换只用近场pokeinteractor交互或者只用远场rayinteractor交互">如何禁用手势的远近场自动切换,只用近场(PokeInteractor)交互或者只用远场(RayInteractor)交互</h1>
<p>虽然我们 SDK 默认提供了自适应场景的远近场切换解决方案,但是用户还是会有某些场景,不需要自动切换的需求 为了满足该需求</p>
<h2 id="方式一-只是在某些场景禁用动态切换逻辑">方式一: 只是在某些场景禁用动态切换逻辑</h2>
<ol>
<li>
<p>首先需要禁用 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本</p>
</li>
<li>
<p>调用 InteractorStateChange.OnPokeInteractorUnHover 事件,激活场景的远场交互</p>
</li>
<li>
<p>调用 InteractorStateChange.OnPokeInteractorHover 事件,激活场景的近场交互</p>
</li>
<li>可以根据自己的需求在需要的时候选择激活 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本来恢复动态的切换逻辑</li>
</ol>
<h2 id="方式二-只需要某种交互不需要恢复动态切换">方式二: 只需要某种交互,不需要恢复动态切换</h2>
<ol>
<li>
<p>移除 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本</p>
</li>
<li>根据自己的需求保留 RKHand/LeftHandInteractors 和 RKHand/RightHandInteractors 下的某种交互</li>
</ol>
<!-- ## 如何让交互器识别 UI 或者物体上的可交互(Interactable)类型,根据其可交互类型来激活手上的交互器(Interactor) --></div><script>var markdown ="# 描述

手势交互的基础组件,包含手势的远场交互(RayInteractor),近场交互(PokeInteractor),手势 Mesh 的渲染等。

# 如何使用

- 如果你想自定义手势的样式和交互的话,可以将 RKHand 预制体拖拽到场景中,然后修改预制体。
- 加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/Interactor/RKHand

# 组件层级说明

-   RKHand

    -   LeftHandRender (左手渲染器)
        -   LeftHandGesture (用户编辑器手的模型渲染)
        -   HandRootAxis (手的整体坐标轴,默认关闭)
        -   SkeletonNode (手的骨骼节点,默认关闭)
        -   SkeletonLine (手的骨骼线条,默认关闭)
        -   HandMesh (手 Mesh 绘制, 默认开启,更换手的 mesh,可以替换该模块手的材质)
    -   RightHandRender (右手渲染器)

        -   RightHandGesture (用户编辑器手的模型渲染)
        -   HandRootAxis (手的整体坐标轴,默认关闭)
        -   SkeletonNode (手的骨骼节点,默认关闭)
        -   SkeletonLine (手的骨骼线条,默认关闭)
        -   HandMesh (手 Mesh 绘制, 默认开启,更换手的 mesh,可以替换该模块手的材质)

    -   LeftHandInteractor (左手节点交互器)

        -   RayInteractor (射线交互器)
            -   Content (交互器容器,用控制整体射线视觉的激活和关闭)
                -   Selector (选择器, 用于定义射线选中&非选中交互)
                -   RayVisual (射线视觉渲染, 如果您要修改射线样式,可以修该模块的材质,以及 LineRender 设置)
                -   CursorVisual (光标视觉渲染, 如果您要修改光标样式,可以修改该模块材质)
        -   PokeInteractor (Poke 交互器)
        -   GrabIntercator (Grab 交互器)
            -   GrabbedPoint (抓起物体的附着点)
            -   SnapPoint (捏起物体的附着点)

    -   RightHandInteractor (右手节点交互器)
        -   RayInteractor (射线交互器)
            -   Content (交互器容器,用控制整体射线视觉的激活和关闭)
                -   Selector (选择器, 用于定义射线选中&非选中交互)
                -   RayVisual (射线视觉渲染, 如果您要修改射线样式,可以修改模块的材质,以及 LineRender 设置)
                -   CursorVisual (光标视觉渲染, 如果您要修改光标样式,可以修改该模块材质)
        -   PokeInteractor (Poke 交互器)
        -   GrabIntercator (Grab 交互器)
            -   GrabbedPoint (抓起物体的附着点)
            -   SnapPoint (捏起物体的附着点)

# 关键脚本属性设置&说明

## ModuleInteractor

模块交互器,用户将对应的交互器,绑定到对应的模块,同时处理对应模块交互器的更新,销毁等

-   InputModuleType (交互绑定的输入模块类型)

    -   None (不绑定任何输入模块)
    -   ThreeDof (绑定到 Phone 3dof 射线输入模块)
    -   Gesture (绑定手势输入模块)
    -   Mouse (绑定到鼠标输入模块)
    -   ButtonMouse (绑定到滑鼠输入模块)
    -   TouchPad (绑定到触控输入模块)

## HandRender

手的渲染器,处理手的 Mesh 骨骼 坐标轴等的渲染

-   HandType (渲染手的类型)
    -   LeftHand (左手)
    -   RightHand (右手)
-   DrawSkeleton (是否绘制骨骼,默认不绘制)
-   DrawMesh (是否绘制 Mesh, 默认绘制)
-   DrawAxis (是否绘制坐标轴, 默认绘制)
-   SkeletonNode (骨骼节点引用)
-   SkeletoLine (骨骼线引用)
-   HandMesh (手的 Mesh 过滤器引用)
-   HandRootAxis (手心的坐标轴引用,用显示手的朝向,在调试的时候可以使用)

## InteractorStateChange

用于监听交互器状态改变,主要用于手势远近场的切换

-   Hand (手的类型)
-   PreState (缓存上一帧 Poke 交互器上一帧的状态)
-   IsFar (当前是否是远场交互)
-   Dragging (缓存拖拽状态)

## RayInteractor

射线交互器能够和场景中带有 RayInteractable 的物体交互

-   InteractableFiltes (过滤可交互物体的数组,可选)
-   MaxIterationsPerFrame (每帧最大的刷新次数)
-   State (交互器的状态)
    -   Normal (默认状态)
    -   Hover (覆盖状态)
    -   Select (选中状态)
    -   Disable (禁用状态)
-   Selector (选择器,可以复写,修改交互器的点击条件)
-   MaxRayLength (射线最大的长度)
-   NoHoverCursorDistance (在射线没有 hover 的状态下,光标的距离)
-   EqualDistanceThreshold (在距离表面的距离低于此阈值时，被视为相等，用于排序目的)

## PokeInteractor

戳击交互器,用于近场戳击的交互,能够使用食指的戳与 UI 或者物体进行交互

-   InteractableFiltes (过滤可交互物体的数组,可选)
-   State (交互器的状态)
    -   Normal (默认状态)
    -   Hover (覆盖状态)
    -   Select (选中状态)
    -   Disable (禁用状态)
-   Selector (选择器,可以复写,修改交互器的点击条件)
-   MaxRayLength (射线最大的长度)
-   SurfaceHitPoint (交互器与交互物体表面的碰撞点)
-   Radius (Poke 交互器的半径)
-   TouchReleaseThreshold (当戳击起点超过该距离高于表面时，将触发取消选择的戳击动作)
-   EqualDistanceThreshold (此阈值以下的表面距离在排序目的上被视为相等)
-   TouchPoint (Poke 交互器与可交互物体表面的接触点,该接触点在交互器小于可交互物体的最大距离时,就会激活,无需实质的接触)

## HandRayPose

用户计算手势射线的位姿

-   EditorParams (编辑器下模拟参数)
    -   UseMouseRotate (在编辑器模式下是否采用鼠标进行旋转,默认激活)
    -   FollowCameraInEditor (在编辑器模式下,是否让射线跟随相机,默认激活)
    -   LocalPositionInCameraSpace (在编辑器模式下, 射线在相机空间下的相对位置)
    -   MaxDistanceInEditor (射线在编辑器模式下投射的最远距离)
-   Hand(左右手类型)
-   Shoulder(估算的肩膀位置,基于相机空间)
-   Neck(脖子位置,基于相机空间)
-   PalmForwardInfluencePow(手掌方向,对最终射线方向的影响的强度)
-   UpForwardInfluencePow(射线上翘的强度)
-   MinHandObjHidRayVisual(手距物体的距离,小于该距离会隐藏射线)
-   RayInteractor (射线交互器的引用)
-   LogText (调试 UI,默认为空)

## PokePose

用于 Poke 交互器的位姿

-   Hand (左右手类型)
-   MaxDistanceInEditor (编辑器模式下,最远可交互距离)

## Hand

用于处理手势近场与模型的交互器

-   HandType 左右手类型
-   OtherHand 另外一只手的引用
-   UseHoverSphere 使用使用球体进行 hover
-   HoverUpdateInterval Hover 更新间隔
-   HoverSphereTransform 球体 Hover Transform 引用
-   HoverSphereRadius 球体 Hover 的半径
-   ObjectGrabbedPoint 抓取物体的附着点 引用
-   ObjectSnapPoint 捏合抓取物体的附着点 引用
-   ShowDebugText 是否显示日志

# 如何禁用手势的远近场自动切换,只用近场(PokeInteractor)交互或者只用远场(RayInteractor)交互

虽然我们 SDK 默认提供了自适应场景的远近场切换解决方案,但是用户还是会有某些场景,不需要自动切换的需求
为了满足该需求

## 方式一: 只是在某些场景禁用动态切换逻辑

1.  首先需要禁用 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本

2.  调用 InteractorStateChange.OnPokeInteractorUnHover 事件,激活场景的远场交互

3.  调用 InteractorStateChange.OnPokeInteractorHover 事件,激活场景的近场交互

4.  可以根据自己的需求在需要的时候选择激活 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本来恢复动态的切换逻辑

## 方式二: 只需要某种交互,不需要恢复动态切换

1.  移除 RKHand/LeftHandInteractors 和 RKHand/LeftHandInteractors 上的 InteractorStateChange 脚本

2.  根据自己的需求保留 RKHand/LeftHandInteractors 和 RKHand/RightHandInteractors 下的某种交互

<!-- ## 如何让交互器识别 UI 或者物体上的可交互(Interactable)类型,根据其可交互类型来激活手上的交互器(Interactor) -->
";</script>

---

## 内置组件 PointableUI
**Document ID:** c8e5fb6bd6cd40a3ba0db1169300c5a2 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="描述">描述</h1>
<p>基础空间平面 UI 交互组件</p>
<h1 id="如何使用">如何使用</h1>
<ul>
<li>将 PointableUI 预制体拖放到场景层级中</li>
<li>加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI</li>
</ul>
<h1 id="组件层级说明">组件层级说明</h1>
<ul>
<li>PointableUI
<ul>
<li>Unity Canvas (Unity 画布, 使用方式和 UGUI 相同)</li>
<li>PlaneSurface (平面 Surface,用于 UI 选中点的计算,例如拖拽超出 UI 碰撞范围后,UI 的选中碰撞点就是使用该组件计算)</li>
<li>BoxProximityField (接近平面的计算,用于 Poke 交互)</li>
</ul>
</li>
</ul>
<h1 id="关键脚本属性设置说明">关键脚本属性设置&amp;说明</h1>
<h2 id="pointablecanvas">PointableCanvas</h2>
<p>PointerCanvas 允许任何 IPointable 通过 IPointableCanvas 接口将其事件转发到关联的 Unity Canvas 上</p>
<ul>
<li>Canvas (Unity Canvas)</li>
</ul>
<h2 id="rayinteractable">RayInteractable</h2>
<p>使用该组件,能够赋予 Pointable 与射线交互器可交互的能力</p>
<ul>
<li>Interactor Filters (交互器过滤数组,过滤指定交互器 可选)</li>
<li>Max Interactors (最大交互器数量 默认-1 不做限制)</li>
<li>Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)</li>
<li>State (当前可交互物体的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (被射线 Hover 状态)</li>
<li>Select (被射线交互器 选中状态)</li>
</ul>
</li>
<li>PointableElement (可交互的元素)</li>
<li>Surface (交互碰撞器)</li>
<li>Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)</li>
</ul>
<h2 id="pokeinteractable">PokeInteractable</h2>
<p>使用该组件,能够赋予 Pointable 与 Poke 交互器的可交互的能力</p>
<ul>
<li>
<p>Interactor Filters (交互器过滤数组,过滤指定交互器 可选)</p>
</li>
<li>Max Interactors (最大交互器数量 默认-1 不做限制)</li>
<li>Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)</li>
<li>State (当前可交互物体的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (被射线 Hover 状态)</li>
<li>Select (被射线交互器 选中状态)</li>
</ul>
</li>
<li>PointableElement (可交互的元素)</li>
<li>Surface (交互碰撞器)</li>
<li>ColliderSurface (表面碰撞器)</li>
<li>Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)</li>
<li>Proximity Field (接近区域,用与计算 Poke 交互器顶点与该物体最接近的点)</li>
<li>Enter Hover Distance (Poke 选中的最小距离)</li>
<li>Release Distance (Poke 交互器穿过表面具体表面一定深度后的释放距离)</li>
</ul>
<p>GestureDrag</p>
<p>Grip 手势的拖拽模块,使用该组件能够快速实现 UI 以及 3D 物体拖拽</p>
<ul>
<li>LookAtCamera (拖拽过程中是否看向相机)</li>
<li>UseBezierCurve (是否使用贝塞尔曲线)</li>
</ul>
<h2 id="boxcollidersizefittocanvas">BoxColliderSizeFitToCanvas</h2>
<p>碰撞适配器,用于将 BoxCollider 和 BoxProxmity 适配到画布</p>
<ul>
<li>RectZ (适配的碰撞器&amp;接近碰撞器的深度)</li>
<li>BoxCollider (盒碰撞器)</li>
<li>BoxProxmity(接近碰撞器)</li>
<li>TargetCanvas(目标)</li>
</ul>
<h2 id="collidersurface">ColliderSurface</h2>
<p>表面碰撞器</p>
<ul>
<li>Collider (应用的碰撞器)</li>
</ul></div><script>var markdown ="# 描述

基础空间平面 UI 交互组件

# 如何使用

- 将 PointableUI 预制体拖放到场景层级中
- 加载路径 Rokid Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI

# 组件层级说明

-   PointableUI
    -   Unity Canvas (Unity 画布, 使用方式和 UGUI 相同)
    -   PlaneSurface (平面 Surface,用于 UI 选中点的计算,例如拖拽超出 UI 碰撞范围后,UI 的选中碰撞点就是使用该组件计算)
    -   BoxProximityField (接近平面的计算,用于 Poke 交互)

# 关键脚本属性设置&说明

## PointableCanvas

PointerCanvas 允许任何 IPointable 通过 IPointableCanvas 接口将其事件转发到关联的 Unity Canvas 上

-   Canvas (Unity Canvas)

## RayInteractable

使用该组件,能够赋予 Pointable 与射线交互器可交互的能力

-   Interactor Filters (交互器过滤数组,过滤指定交互器 可选)
-   Max Interactors (最大交互器数量 默认-1 不做限制)
-   Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)
-   State (当前可交互物体的状态)
    -   Normal (默认状态)
    -   Hover (被射线 Hover 状态)
    -   Select (被射线交互器 选中状态)
-   PointableElement (可交互的元素)
-   Surface (交互碰撞器)
-   Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)

## PokeInteractable

使用该组件,能够赋予 Pointable 与 Poke 交互器的可交互的能力

-   Interactor Filters (交互器过滤数组,过滤指定交互器 可选)

-   Max Interactors (最大交互器数量 默认-1 不做限制)
-   Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)
-   State (当前可交互物体的状态)
    -   Normal (默认状态)
    -   Hover (被射线 Hover 状态)
    -   Select (被射线交互器 选中状态)
-   PointableElement (可交互的元素)
-   Surface (交互碰撞器)
-   ColliderSurface (表面碰撞器)
-   Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)
-   Proximity Field (接近区域,用与计算 Poke 交互器顶点与该物体最接近的点)
-   Enter Hover Distance (Poke 选中的最小距离)
-   Release Distance (Poke 交互器穿过表面具体表面一定深度后的释放距离)

GestureDrag

Grip 手势的拖拽模块,使用该组件能够快速实现 UI 以及 3D 物体拖拽

-   LookAtCamera (拖拽过程中是否看向相机)
-   UseBezierCurve (是否使用贝塞尔曲线) 

## BoxColliderSizeFitToCanvas

碰撞适配器,用于将 BoxCollider 和 BoxProxmity 适配到画布

-   RectZ (适配的碰撞器&接近碰撞器的深度)
-   BoxCollider (盒碰撞器)
-   BoxProxmity(接近碰撞器)
-   TargetCanvas(目标)

## ColliderSurface

表面碰撞器

-   Collider (应用的碰撞器)
";</script>

---

## 人眼生理特征
**Document ID:** 680acadaef874bd08af3627f081ba8f7 | **Tags:** 人眼特性、视场角、视力

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="人眼的可视范围">人眼的可视范围</h1>
<p>人眼的可视范围虽然很大，但是文字/符号的阅读范围是比较集中的。</p>
<p>目前 Rokid 的 AR 眼镜 FOV 还未超出文字/符号识别区域，所以不需要考虑信息面板过长，不利于阅读的情况。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2042.png"/></p>
<h1 id="辐辏调节冲突">辐辏调节冲突</h1>
<p>辐辏（Vergence）是指通过眼球旋转，使图像在不同距离汇聚起来，帮助用户感知物体深度。调焦（Accommodation）指的是当注视物体时，眼部肌肉引起晶状体拉伸或放松，使光线聚焦到视网膜上。</p>
<p>在现实场景中，注视距离近的物体，眼球转动幅度更大，同时聚焦也相对用力；反之，则眼球转动小，聚焦较轻。大脑已经习惯了辐辏和调焦在远近距离上的这种匹配关系。</p>
<p>但在XR环境中，用户总是会通过双眼辐辏以获得不同深度的物体图像，但屏幕的发光点位置不变导致调焦深度不变，辐辏深度和调焦深度存在冲突时，两种提示间的自然联系会打破，从而导致了视觉不适，造成了辐辏调节冲突（Vergence-Accommodation Conflict）。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%203.png"/></p>
<p>虚物体距离用户 2m 时，冲突最小，观看结果最为舒适。当一个虚拟物体看起来离用户 ＜ 1m 时，辐辏冲突引起不适的几率呈指数增加。当虚拟物体距离很远时也会引起眼部不适，但现象不太明显。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%202.png"/></p></div><script>var markdown ="# 人眼的可视范围

人眼的可视范围虽然很大，但是文字/符号的阅读范围是比较集中的。

目前 Rokid 的 AR 眼镜 FOV 还未超出文字/符号识别区域，所以不需要考虑信息面板过长，不利于阅读的情况。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2042.png"/>



# 辐辏调节冲突

辐辏（Vergence）是指通过眼球旋转，使图像在不同距离汇聚起来，帮助用户感知物体深度。调焦（Accommodation）指的是当注视物体时，眼部肌肉引起晶状体拉伸或放松，使光线聚焦到视网膜上。 

在现实场景中，注视距离近的物体，眼球转动幅度更大，同时聚焦也相对用力；反之，则眼球转动小，聚焦较轻。大脑已经习惯了辐辏和调焦在远近距离上的这种匹配关系。 

但在XR环境中，用户总是会通过双眼辐辏以获得不同深度的物体图像，但屏幕的发光点位置不变导致调焦深度不变，辐辏深度和调焦深度存在冲突时，两种提示间的自然联系会打破，从而导致了视觉不适，造成了辐辏调节冲突（Vergence-Accommodation Conflict）。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%203.png"/>



虚物体距离用户 2m 时，冲突最小，观看结果最为舒适。当一个虚拟物体看起来离用户 ＜ 1m 时，辐辏冲突引起不适的几率呈指数增加。当虚拟物体距离很远时也会引起眼部不适，但现象不太明显。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%202.png"/>

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2042.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%203.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%202.png

---

## 6DoF 空间
**Document ID:** 2349f61a2ba543aa9c0f94650a23e385 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK</p>
<h1 id="构建场景"><span class="prefix"></span><span class="content">构建场景</span><span class="suffix"></span></h1>
<p>在《设计规范》中，介绍了6DoF 空间的使用场景。这里以一个简单的空间为例。</p>
<p><em><strong>注意：6DoF 场景仅适用于Max Pro眼镜。</strong></em></p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export6DoF.mp4">&#10;</iframe>
<h2 id="新建场景"><span class="prefix"></span><span class="content">1 新建场景</span><span class="suffix"></span></h2>
<p>新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial6DoF。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204142957473.png" alt="image-20240204142957473"></p>
<h2 id="替换maincamera"><span class="prefix"></span><span class="content">2 替换MainCamera</span><span class="suffix"></span></h2>
<p>双击打开场景，删除默认的MainCamera。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143045930.png" alt="image-20240204143045930"></p>
<p>在Project窗口查询<code>RKCameraRig</code>，并将Search 范围选择All 或者In Packages 找到<code>RKCameraRig</code>预制体。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png" alt="image-20240201172421282"></p>
<p>将<code>RKCameraRig</code>预制体拖到DemoSpatial6DoF 场景中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143135390.png" alt="image-20240204143135390"></p>
<h2 id="导入资源"><span class="prefix"></span><span class="content">3 导入资源</span><span class="suffix"></span></h2>
<p>将图片：<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Unitypackage/Rokid_Room_Builtin.unitypackage">Rokid_Room_Builtin.unitypackage</a>(如果工作在URP 管线下使用<a href="https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Unitypackage/Rokid_Room_URP.unitypackage">Rokid_Room_URP.unitypackage</a>)加入到Assets/Textures/目录下（如果没有目录新建即可）。</p>
<p>下载好的unitypackage 后。Unity 中在Assets 上点击右键，选择Import Package &gt; Custom Package。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143946914.png" alt="image-20240204143946914"></p>
<p>在文件管理中找到已下载好的Unitypackage，点击打开。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144117504.png" alt="image-20240204144117504"></p>
<p>在弹出的Import Unity Package 窗口中，选择Import。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144234315.png" alt="image-20240204144234315"></p>
<p>导入完成后，在Assets 目录下会出现一个ArtRes 目录，为管理方便可以将该文件夹放到Resources 目录下。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144424887.png" alt="image-20240204144424887"></p>
<h2 id="新建空间场景"><span class="prefix"></span><span class="content">4 新建空间场景</span><span class="suffix"></span></h2>
<p>在Assets–&gt;Resources–&gt;ArtRes–&gt;Prefab 目录下找到Rokid_Room 预制体。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144630227.png" alt="image-20240204144630227"></p>
<p>将其拖动到DemoSpatial6DoF 场景中。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144738188.png" alt="image-20240204144738188"></p>
<p><strong>Tip：注意，在Unity 空间中1 Unit 大致相当于现实世界中的1 米，在空间应用设计时，这种尺度关系非常重要。比如在Rokid_Room 中的紫色长方体，它的Mesh Size 是{0.008523,0.006412,0.008523}，表示的是一个8毫米长宽6毫米高。Rokid_Room 默认的Scale 是{10,10,10}，那么在实际场景中，这个立方体的大小就是{8cm,6cm,8cm}，在制作空间应用的时候，要特别注意物体在Unity 世界空间中的位置和大小。</strong></p>
<p>按照自己的喜好缩放、摆放空间中的内容。</p>
<h1 id="设置6dof空间"><span class="prefix"></span><span class="content">设置6DoF空间</span><span class="suffix"></span></h1>
<p>在场景中设置6DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为Rotation And Position即可。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204151529020.png" alt="image-20240204151529020"></p>
<h1 id="运行查看"><span class="prefix"></span><span class="content">运行查看</span><span class="suffix"></span></h1>
<h2 id="编译sample-应用"><span class="prefix"></span><span class="content">1 编译Sample 应用</span><span class="suffix"></span></h2>
<p>最后将DemoSpatial6DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204152610982.png" alt="image-20240204152610982"></p>
<p>打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。</p>
<h2 id="wifi-adb连接ar-studio-与pc"><span class="prefix"></span><span class="content">2 WiFI-ADB连接AR Studio 与PC</span><span class="suffix"></span></h2>
<p>这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。</p>
<p>使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png" alt="image-20240202114350368"></p>
<h2 id="安装应用"><span class="prefix"></span><span class="content">3 安装应用</span><span class="suffix"></span></h2>
<p>这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo6DoF.apk 为例，将应用安装到AR Studio：</p>
<p>使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo6DoF.apk 安装应用。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204153420646.png" alt="image-20240204153420646"></p>
<p>这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。</p>
<h2 id="运行查看应用"><span class="prefix"></span><span class="content">4 运行查看应用</span><span class="suffix"></span></h2>
<p>点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png" alt="image-20240202120621671"></p>
<p>打开应用后可以通过移动头部，通过不同距离、不同角度观察虚拟场景中的内容。（场景中的绿色文字是系统的调试信息）：</p>
<iframe width="658" height="502" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoF.mp4"></iframe>
</div><script>var markdown = "本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK

# 构建场景

在《设计规范》中，介绍了6DoF 空间的使用场景。这里以一个简单的空间为例。

***注意：6DoF 场景仅适用于Max Pro眼镜。***

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/Export6DoF.mp4">
</iframe>

## 1 新建场景

新建Unity3D 工程，并按照《接入指南》完成SDK 接入后，在Project/Assets/Scenes 目录下新建场景DemoSpatial6DoF。

![image-20240204142957473](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204142957473.png)

## 2 替换MainCamera

双击打开场景，删除默认的MainCamera。

![image-20240204143045930](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143045930.png)

在Project窗口查询```RKCameraRig```，并将Search 范围选择All 或者In Packages 找到```RKCameraRig```预制体。

![image-20240201172421282](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png)

将```RKCameraRig```预制体拖到DemoSpatial6DoF 场景中。

![image-20240204143135390](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143135390.png)

## 3 导入资源

将图片：[Rokid_Room_Builtin.unitypackage](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Unitypackage/Rokid_Room_Builtin.unitypackage)(如果工作在URP 管线下使用[Rokid_Room_URP.unitypackage](https://ota.rokidcdn.com/toB/Rokid_Glass/SDK/SampleResources/Unitypackage/Rokid_Room_URP.unitypackage))加入到Assets/Textures/目录下（如果没有目录新建即可）。

下载好的unitypackage 后。Unity 中在Assets 上点击右键，选择Import Package > Custom Package。

![image-20240204143946914](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143946914.png)

在文件管理中找到已下载好的Unitypackage，点击打开。

![image-20240204144117504](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144117504.png)

在弹出的Import Unity Package 窗口中，选择Import。

![image-20240204144234315](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144234315.png)

导入完成后，在Assets 目录下会出现一个ArtRes 目录，为管理方便可以将该文件夹放到Resources 目录下。

![image-20240204144424887](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144424887.png)

## 4 新建空间场景

在Assets-->Resources-->ArtRes-->Prefab 目录下找到Rokid_Room 预制体。

![image-20240204144630227](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144630227.png)

将其拖动到DemoSpatial6DoF 场景中。

![image-20240204144738188](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204144738188.png)

**Tip：注意，在Unity 空间中1 Unit 大致相当于现实世界中的1 米，在空间应用设计时，这种尺度关系非常重要。比如在Rokid_Room 中的紫色长方体，它的Mesh Size 是{0.008523,0.006412,0.008523}，表示的是一个8毫米长宽6毫米高。Rokid_Room 默认的Scale 是{10,10,10}，那么在实际场景中，这个立方体的大小就是{8cm,6cm,8cm}，在制作空间应用的时候，要特别注意物体在Unity 世界空间中的位置和大小。**

按照自己的喜好缩放、摆放空间中的内容。



# 设置6DoF空间

在场景中设置6DoF 空间是一个相对简单的过程。只需要将RKCameraRig的Inspector上的RKCameraRig脚本上的HeadTrackingType修改为Rotation And Position即可。

![image-20240204151529020](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204151529020.png)

# 运行查看

## 1 编译Sample 应用

最后将DemoSpatial6DoF 场景添加到Scene In Build 列表中，并Build，即可构建APK。

![image-20240204152610982](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204152610982.png)

打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。

## 2 WiFI-ADB连接AR Studio 与PC

这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。

使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。

![image-20240202114350368](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png)

## 3 安装应用

这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo6DoF.apk 为例，将应用安装到AR Studio：

使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo6DoF.apk 安装应用。

![image-20240204153420646](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204153420646.png)

这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。

## 4 运行查看应用

点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。

![image-20240202120621671](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png)

打开应用后可以通过移动头部，通过不同距离、不同角度观察虚拟场景中的内容。（场景中的绿色文字是系统的调试信息）：

<iframe width="658" height="502" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoF.mp4"></iframe>

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204142957473.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204143045930.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240201172421282.png

---

## 内置组件 PointableUICurve
**Document ID:** 37ac8f2486bb416abc96513c69c6f52d | **Tags:** 曲面UI

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="描述">描述</h1>
<p>基础空间曲面 UI 交互组件</p>
<h1 id="如何使用">如何使用</h1>
<ul>
<li>将 PointableUI 预制体拖放到场景层级中</li>
<li>加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI_Curve</li>
</ul>
<h1 id="组件层级说明">组件层级说明</h1>
<ul>
<li>PointableUI
<ul>
<li>Canvas Mesh (处理曲面画布的渲染)</li>
<li>Unity Canvas (Unity 画布, 使用方式和 UGUI 相同)</li>
<li>Cyliner (圆柱体,用于处理曲面的碰撞,以及曲面与 Poke 的交互)</li>
<li>Collider (碰撞器)</li>
</ul>
</li>
</ul>
<h1 id="关键脚本属性设置说明">关键脚本属性设置&amp;说明</h1>
<h2 id="pointablecanvas">PointableCanvas</h2>
<p>PointerCanvas 允许任何 IPointable 通过 IPointableCanvas 接口将其事件转发到关联的 Unity Canvas 上</p>
<ul>
<li>Canvas (Unity Canvas)</li>
</ul>
<h2 id="rayinteractable">RayInteractable</h2>
<p>使用该组件,能够赋予 Pointable 与射线交互器可交互的能力</p>
<ul>
<li>Interactor Filters (交互器过滤数组,过滤指定交互器 可选)</li>
<li>Max Interactors (最大交互器数量 默认-1 不做限制)</li>
<li>Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)</li>
<li>State (当前可交互物体的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (被射线 Hover 状态)</li>
<li>Select (被射线交互器 选中状态)</li>
</ul>
</li>
<li>PointableElement (可交互的元素)</li>
<li>Surface (交互碰撞器)</li>
<li>Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)</li>
</ul>
<h2 id="pokeinteractable">PokeInteractable</h2>
<p>使用该组件,能够赋予 Pointable 与 Poke 交互器的可交互的能力</p>
<ul>
<li>
<p>Interactor Filters (交互器过滤数组,过滤指定交互器 可选)</p>
</li>
<li>Max Interactors (最大交互器数量 默认-1 不做限制)</li>
<li>Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)</li>
<li>State (当前可交互物体的状态)
<ul>
<li>Normal (默认状态)</li>
<li>Hover (被射线 Hover 状态)</li>
<li>Select (被射线交互器 选中状态)</li>
</ul>
</li>
<li>PointableElement (可交互的元素)</li>
<li>Surface (交互碰撞器)</li>
<li>ColliderSurface (表面碰撞器)</li>
<li>Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)</li>
<li>Proximity Field (接近区域,用与计算 Poke 交互器顶点与该物体最接近的点)</li>
<li>Max Distance (近场交互的最远距离,Poke 交互器与可交互物体小于该距离,将切换成近场交互)</li>
<li>Enter Hover Distance (Poke 选中的最小距离)</li>
<li>Release Distance (Poke 交互器穿过表面具体表面一定深度后的释放距离)</li>
</ul>
<h2 id="pointablecanvasmesh">PointableCanvasMesh</h2>
<p>曲面 UI 的特殊组件,用户动态修改曲面的半径,重写 ProcessPointerEvent,将 Pointer 曲面上的事件点映射回平面上,方便 PointerCanvasModule 处理</p>
<ul>
<li>CanvasMesh (曲面 Canvas 的引用,该组件用于生成曲面碰撞器的 Mesh )</li>
<li>CanvasRenderTexture (曲面画布的渲染贴图)</li>
<li>Cylinder (圆柱碰撞器,用于生成曲面的碰撞器)</li>
<li>CylinderRadius (圆柱半径,用于控制曲面的半径)</li>
<li>ChangeViewRadius (是否在修改曲面半径时,修改视图的显示半径)</li>
<li>UnityCanvas (Unity 画布引用)</li>
</ul>
<h2 id="canvascylinder">CanvasCylinder</h2>
<p>圆柱画布用于生成圆柱画布的 Mesh</p>
<ul>
<li>CanvasRenderTexture (曲面画布的渲染贴图)</li>
<li>MeshFilter (网格过滤器，用户生成网格)</li>
<li>MeshCollider (网格碰撞器)</li>
<li>Cylinder(圆柱,获取生成曲面函数)</li>
<li>Orientation (曲面的朝向)</li>
<li>MeshGeneration (网格生成参数)</li>
</ul>
<h2 id="rkcanvasmeshrenderer">RKCanvasMeshRenderer</h2>
<p>画布 Mesh 渲染器，控制画布 mesh 的渲染</p>
<ul>
<li>CanvasRenderTexture (画布渲染纹理)</li>
<li>MeshRender (网格渲染器)</li>
<li>CanvasMesh (画布网格)</li>
<li>RenderingMode (纹理渲染模式)
<ul>
<li>Alpha-Blended (阿尔法混合)</li>
<li>Alpha-Cutout (阿尔法剔除)</li>
<li>Opaque (欧佩克,不透明的渲染纹理)</li>
</ul>
</li>
<li>Enable Super Sampling (使用更昂贵的图像采样技术来提高质量，但以性能为代价)</li>
<li>DoUnderlingAntiAliasing (尝试使用 Alpha 混合来消除底层边缘的锯齿。可能会导致边界)</li>
</ul></div><script>var markdown ="# 描述

基础空间曲面 UI 交互组件

# 如何使用

-   将 PointableUI 预制体拖放到场景层级中
-    加载路径 Roikd Unity XR SDK/Runtime/Resources/Prefabs/UI/PointableUI/PointableUI_Curve

# 组件层级说明

-   PointableUI
    -   Canvas Mesh (处理曲面画布的渲染)
    -   Unity Canvas (Unity 画布, 使用方式和 UGUI 相同)
    -   Cyliner (圆柱体,用于处理曲面的碰撞,以及曲面与 Poke 的交互)
    -   Collider (碰撞器)

# 关键脚本属性设置&说明

## PointableCanvas

PointerCanvas 允许任何 IPointable 通过 IPointableCanvas 接口将其事件转发到关联的 Unity Canvas 上

-   Canvas (Unity Canvas)

## RayInteractable

使用该组件,能够赋予 Pointable 与射线交互器可交互的能力

-   Interactor Filters (交互器过滤数组,过滤指定交互器 可选)
-   Max Interactors (最大交互器数量 默认-1 不做限制)
-   Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)
-   State (当前可交互物体的状态)
    -   Normal (默认状态)
    -   Hover (被射线 Hover 状态)
    -   Select (被射线交互器 选中状态)
-   PointableElement (可交互的元素)
-   Surface (交互碰撞器)
-   Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)

## PokeInteractable

使用该组件,能够赋予 Pointable 与 Poke 交互器的可交互的能力

-   Interactor Filters (交互器过滤数组,过滤指定交互器 可选)

-   Max Interactors (最大交互器数量 默认-1 不做限制)
-   Max Selecting Interactors (最大交互器选中的数量 默认-1 不做限制)
-   State (当前可交互物体的状态)
    -   Normal (默认状态)
    -   Hover (被射线 Hover 状态)
    -   Select (被射线交互器 选中状态)
-   PointableElement (可交互的元素)
-   Surface (交互碰撞器)
-   ColliderSurface (表面碰撞器)
-   Select Surface (交互选择的表面碰撞器,用于处理交互器的选中)
-   Proximity Field (接近区域,用与计算 Poke 交互器顶点与该物体最接近的点)
-   Max Distance (近场交互的最远距离,Poke 交互器与可交互物体小于该距离,将切换成近场交互)
-   Enter Hover Distance (Poke 选中的最小距离)
-   Release Distance (Poke 交互器穿过表面具体表面一定深度后的释放距离)

## PointableCanvasMesh

曲面 UI 的特殊组件,用户动态修改曲面的半径,重写 ProcessPointerEvent,将 Pointer 曲面上的事件点映射回平面上,方便 PointerCanvasModule 处理

-   CanvasMesh (曲面 Canvas 的引用,该组件用于生成曲面碰撞器的 Mesh )
-   CanvasRenderTexture (曲面画布的渲染贴图)
-   Cylinder (圆柱碰撞器,用于生成曲面的碰撞器)
-   CylinderRadius (圆柱半径,用于控制曲面的半径)
-   ChangeViewRadius (是否在修改曲面半径时,修改视图的显示半径)
-   UnityCanvas (Unity 画布引用)

## CanvasCylinder

圆柱画布用于生成圆柱画布的 Mesh

-   CanvasRenderTexture (曲面画布的渲染贴图)
-   MeshFilter (网格过滤器，用户生成网格)
-   MeshCollider (网格碰撞器)
-   Cylinder(圆柱,获取生成曲面函数)
-   Orientation (曲面的朝向)
-   MeshGeneration (网格生成参数)

## RKCanvasMeshRenderer

画布 Mesh 渲染器，控制画布 mesh 的渲染

-   CanvasRenderTexture (画布渲染纹理)
-   MeshRender (网格渲染器)
-   CanvasMesh (画布网格)
-   RenderingMode (纹理渲染模式)
    -   Alpha-Blended (阿尔法混合)
    -   Alpha-Cutout (阿尔法剔除)
    -   Opaque (欧佩克,不透明的渲染纹理)
-   Enable Super Sampling (使用更昂贵的图像采样技术来提高质量，但以性能为代价)
-   DoUnderlingAntiAliasing (尝试使用 Alpha 混合来消除底层边缘的锯齿。可能会导致边界)
";</script>

---

## 视觉设计
**Document ID:** 7fe63b80a6ca4140a9d7c5898e9eaf40 | **Tags:** 空间布局，颜色亮度，字体设计

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="颜色和亮度">颜色和亮度</h1>
<p>不同于传统触摸屏 GUI 设计模式，AR近眼显示为现实基础上的虚拟显象， 所以在设计时需要同时考虑用户、虚拟 UI 与真实视野的关系，尤其需要在颜色上做处理。</p>
<ul>
<li><strong>黑色即透明</strong>：由于光学关系，黑色在AR世界里代表不发光，人眼成像下不发光的元素则是看不见的（透明），<font color="#ff0000">要善于利用黑色留白</font>。</li>
<li><strong>白色即强光</strong>：由于光学关系，白色在AR世界里代表最强光，人眼成像下强光显示为白色（如：对着太阳看），<font color="#ff0000">避免大面积白色页面</font>。</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%201.png"/></p>
<p><font color="#ff0000">注意</font>：在某些场景下，必须将虚拟互动内容放置在比较近的位置（例如距离人 0.5m 范围内，保证手能够触碰），当画面过暗或是过于重复，有可能会出现双眼不能聚焦问题。此时，可以适当调节内容的亮度，确保虚拟内容和所处环境亮度相差不大。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/qwqw.png"/></p>
<h1 id="字体大小">字体大小</h1>
<p>二维信息在三维世界中遵循一个近大远小的原则，不同观看距离下合适的字号大小不一致，但是其与人眼夹角是一个绝对值（如下图）。经过测试，Rokid 眼镜的文字最小纵向夹角是 0.33°，对应到下方第二张中的“补充说明文字”字号 20px 。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%204.png"/></p>
<p>通常情况下，你需要确定文字/icon 距离用户的距离，再测试确定最小字号和最小 icon。请、可以参考下图给出的字号，根据远近和实际效果进行调整。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/3%201.jpg"/></p>
<p>Tips：</p>
<p>1）一些特别的场景，也可以将文字、icon设定为无论远近大小，看上去都是固定大小；</p>
<p>2）二维信息在三维空间中有朝向问题，根据你的场景，可以将其设定为永远朝向用户。</p>
<p>3）unity 实现方式不同，会影响字体清晰度，缩放也会影响字体大小，具体请看 <a href="https://learn.microsoft.com/en-us/windows/mixed-reality/develop/unity/text-in-unity">Unity 字体清晰度问题</a> 。</p>
<h1 id="热区大小">热区大小</h1>
<p>经过测试，远场手势 icon 的最小热区是 2.7° *2.5°，即 130*120 px。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/7%204.png"/></p>
<h1 id="空间布局">空间布局</h1>
<h2 id="1-z轴布局">1 Z轴布局</h2>
<p>经过测试，三维空间中的内容最好能摆放在 5m 以内位置，可根据使用场景/交互方式调整：</p>
<p>1）采用近场手势交互的内容，需要放在 0.5 m 以内（<font color="#ff0000">建议放在 0.4m ~0.5m 位置</font>），方便手触碰和互动。但考虑到 <strong>辐辏调节冲突</strong> 问题，请尽量不要将内容放置在距离眼镜很近的位置；</p>
<p>2）远场手势或是射线操作的内容，建议放在 1m 以外，根据使用场景调节位置。例如：观影可能是远距离大屏，办公室近距离多屏。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image.png"/></p>
<h2 id="2-空间信息层级">2 空间信息层级</h2>
<p>在可以将不同信息内容分层，放在不同的深度距离上，下图是我们以 Master 系统首页为例做的信息分层。</p>
<p><font color="#ff0000">注意：Z 轴上靠前的信息层要有相对应出现和收起的逻辑，否则容易产生遮挡，阻碍用户对后方内容进行交换</font>。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E6%9C%BA%E5%90%8E%E9%BB%98%E8%AE%A4%E6%98%BE%E7%A4%BA_launcher%208.png"/></p>
<h2 id="3-新信息出现的位置">3 新信息出现的位置</h2>
<p>新信息，例如窗口、toast、模型等等，<strong><font color="#ff0000">需要先出现在眼镜显示范围内（通常推荐 FOV 中心）</font></strong>，给用户以最直接的视觉反馈。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/7.png"/></p>
<p>tip：检测到用户低头操作时，可以一定程度将新打开内容上移，引导用户回到头部较为舒适的阅读角度。</p>
<p><strong><font color="#ff0000">窗口始终保持与人的视线中心垂直</font>。</strong></p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%205.png"/></p>
<p>而且，弹窗、toast 等在 Z 轴深度上需要和用户当前在观看的内容靠近，否则会导致视线无法聚焦，阅读体验不佳。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%206.png"/></p>
<h1 id="3d空间内-ui-的几种不同的展示效果">3D空间内 UI 的几种不同的展示效果</h1>
<p>3D 空间内的 UI 展示具有较高的灵活度，以下是我们探索过的一些模式和适合的使用场景。</p>
<table border="1">
    <thead width="1280">
        <tr>
            <th width="200">展示效果</th>
            <th width="380">示例</th>
            <th width="700">应用场景</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>0DOF悬屏模式</td>
            <td>虚拟信息完全贴合在眼镜片上显示<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/glassImage.png" alt="0DOF悬屏模式示例"></td>
            <td>更多适合导航、翻译等以显示环境为主、辅助信息为辅的场景，包括全屏、部分位置悬屏等情况，这部分定义为“信息提示类应用”。也包括系统的通知信息等的显示。<br> <font color="#ff0000">注意：<br> 1）请谨慎使用此模式，会遮挡视线；<br> 2）不要将可互动内容（例如按钮）设置为此模式，体验不佳。</font></td>
        </tr>
        <tr>
            <td>0DOF+模式（防抖模式）</td>
            <td>一定角度内有3dof效果，范围移动较大会继续跟随视野中，解决坐车等场景下画面固定视野引发的抖动不适问题。</td>
            <td>更多适合独占式的观影、游戏类的应用。</td>
        </tr>
        <tr>
            <td>3DOF模式</td>
            <td>空间UI始终处在以人为中心的相对距离、固定角度处；用户前后左右上下移动会更随。<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%282%29.png" alt="3DOF模式示例"></td>
            <td>具备一定广泛适用性的空间展现形式。适合需要长时间更随用户移动的界面，例如办公页面。</td>
        </tr>
        <tr>
            <td>3DOF跟随模式</td>
            <td><iframe width="320" height="240" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/3%20DoFg%E8%B7%9F%E9%9A%8F.mp4"></iframe></td>
            <td>适合强制需要用户看到并操作的页面，例如控制栏、窗口；</td>
        </tr>
        <tr>
            <td>6DOF跟随模式</td>
            <td><iframe width="320" height="240" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/6DoFg%E8%B7%9F%E9%9A%8F.mp4"></iframe></td>
            <td>适合强制需要用户看到并操作的页面。<br> <font color="#ff0000">比较推荐与近场手势搭配使用（能够解决不同臂长的人，使用近场点击时的舒适性问题）</font>，例如：控制栏 、窗口、引导教学等。</td>
        </tr>
        <tr>
            <td>6DOF模式</td>
            <td>固定在真实空间位置<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/6DoF%20%E6%98%BE%E7%A4%BA%E6%96%B9%E5%BC%8F.png" alt="6DOF模式示例"></td>
            <td>具备一定广泛适用性的空间展现形式，适合强虚实结合的场景。</td>
        </tr>
    </tbody>
</table>
<h1 id="3d-美术设计">3D 美术设计</h1>
<ul>
<li>尽量避免全黑的人物或场景设计 （黑色即透明）；</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/7%202.png"/></p>
<ul>
<li>基于 AR 虚实结合的概念，考虑显示 FOV 的限制，推荐采用小场景设计，不使用 Skybox 等完全遮挡现实世界的表现手法（或者采用黑色为主的 Skybox，例如星空）；</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%8F%E5%B2%9B.png"/></p>
<ul>
<li>一定要设计大场景的情况下，可以考虑在显示 FOV 边缘增加黑色过渡；</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E6%96%B0GIF%E5%8A%A8%E5%9B%BE.gif"/></p>
<ul>
<li>为保证性能, 同时渲染的模型总面数**<font color="#ff0000">不高于 30W 面</font>**。</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E7%BB%84%20562.png"/></p></div><script>var markdown ="# 颜色和亮度

不同于传统触摸屏 GUI 设计模式，AR近眼显示为现实基础上的虚拟显象， 所以在设计时需要同时考虑用户、虚拟 UI 与真实视野的关系，尤其需要在颜色上做处理。

- **黑色即透明**：由于光学关系，黑色在AR世界里代表不发光，人眼成像下不发光的元素则是看不见的（透明），<font color="#ff0000">要善于利用黑色留白</font>。
- **白色即强光**：由于光学关系，白色在AR世界里代表最强光，人眼成像下强光显示为白色（如：对着太阳看），<font color="#ff0000">避免大面积白色页面</font>。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%201.png"/>



<font color="#ff0000">注意</font>：在某些场景下，必须将虚拟互动内容放置在比较近的位置（例如距离人 0.5m 范围内，保证手能够触碰），当画面过暗或是过于重复，有可能会出现双眼不能聚焦问题。此时，可以适当调节内容的亮度，确保虚拟内容和所处环境亮度相差不大。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/qwqw.png"/>



# 字体大小

二维信息在三维世界中遵循一个近大远小的原则，不同观看距离下合适的字号大小不一致，但是其与人眼夹角是一个绝对值（如下图）。经过测试，Rokid 眼镜的文字最小纵向夹角是 0.33°，对应到下方第二张中的“补充说明文字”字号 20px 。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%204.png"/>



通常情况下，你需要确定文字/icon 距离用户的距离，再测试确定最小字号和最小 icon。请、可以参考下图给出的字号，根据远近和实际效果进行调整。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/3%201.jpg"/>



Tips：

1）一些特别的场景，也可以将文字、icon设定为无论远近大小，看上去都是固定大小；

2）二维信息在三维空间中有朝向问题，根据你的场景，可以将其设定为永远朝向用户。

3）unity 实现方式不同，会影响字体清晰度，缩放也会影响字体大小，具体请看 [Unity 字体清晰度问题](https://learn.microsoft.com/en-us/windows/mixed-reality/develop/unity/text-in-unity) 。



# 热区大小

经过测试，远场手势 icon 的最小热区是 2.7° \*2.5°，即 130\*120 px。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/7%204.png"/>




# 空间布局



## 1 Z轴布局

经过测试，三维空间中的内容最好能摆放在 5m 以内位置，可根据使用场景/交互方式调整：

1）采用近场手势交互的内容，需要放在 0.5 m 以内（<font color="#ff0000">建议放在 0.4m ~0.5m 位置</font>），方便手触碰和互动。但考虑到 **辐辏调节冲突** 问题，请尽量不要将内容放置在距离眼镜很近的位置；

2）远场手势或是射线操作的内容，建议放在 1m 以外，根据使用场景调节位置。例如：观影可能是远距离大屏，办公室近距离多屏。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image.png"/>



## 2 空间信息层级

在可以将不同信息内容分层，放在不同的深度距离上，下图是我们以 Master 系统首页为例做的信息分层。

<font color="#ff0000">注意：Z 轴上靠前的信息层要有相对应出现和收起的逻辑，否则容易产生遮挡，阻碍用户对后方内容进行交换</font>。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%BC%80%E6%9C%BA%E5%90%8E%E9%BB%98%E8%AE%A4%E6%98%BE%E7%A4%BA_launcher%208.png"/>



## 3 新信息出现的位置

新信息，例如窗口、toast、模型等等，**<font color="#ff0000">需要先出现在眼镜显示范围内（通常推荐 FOV 中心）</font>**，给用户以最直接的视觉反馈。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/7.png"/>



tip：检测到用户低头操作时，可以一定程度将新打开内容上移，引导用户回到头部较为舒适的阅读角度。

**<font color="#ff0000">窗口始终保持与人的视线中心垂直</font>。**



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%205.png"/>



而且，弹窗、toast 等在 Z 轴深度上需要和用户当前在观看的内容靠近，否则会导致视线无法聚焦，阅读体验不佳。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%206.png"/>



# 3D空间内 UI 的几种不同的展示效果

3D 空间内的 UI 展示具有较高的灵活度，以下是我们探索过的一些模式和适合的使用场景。



<table border="1">
    <thead width="1280">
        <tr>
            <th width="200">展示效果</th>
            <th width="380">示例</th>
            <th width="700">应用场景</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>0DOF悬屏模式</td>
            <td>虚拟信息完全贴合在眼镜片上显示<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/glassImage.png" alt="0DOF悬屏模式示例"></td>
            <td>更多适合导航、翻译等以显示环境为主、辅助信息为辅的场景，包括全屏、部分位置悬屏等情况，这部分定义为“信息提示类应用”。也包括系统的通知信息等的显示。<br> <font color="#ff0000">注意：<br> 1）请谨慎使用此模式，会遮挡视线；<br> 2）不要将可互动内容（例如按钮）设置为此模式，体验不佳。</font></td>
        </tr>
        <tr>
            <td>0DOF+模式（防抖模式）</td>
            <td>一定角度内有3dof效果，范围移动较大会继续跟随视野中，解决坐车等场景下画面固定视野引发的抖动不适问题。</td>
            <td>更多适合独占式的观影、游戏类的应用。</td>
        </tr>
        <tr>
            <td>3DOF模式</td>
            <td>空间UI始终处在以人为中心的相对距离、固定角度处；用户前后左右上下移动会更随。<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%282%29.png" alt="3DOF模式示例"></td>
            <td>具备一定广泛适用性的空间展现形式。适合需要长时间更随用户移动的界面，例如办公页面。</td>
        </tr>
        <tr>
            <td>3DOF跟随模式</td>
            <td><iframe width="320" height="240" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/3%20DoFg%E8%B7%9F%E9%9A%8F.mp4"></iframe></td>
            <td>适合强制需要用户看到并操作的页面，例如控制栏、窗口；</td>
        </tr>
        <tr>
            <td>6DOF跟随模式</td>
            <td><iframe width="320" height="240" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/6DoFg%E8%B7%9F%E9%9A%8F.mp4"></iframe></td>
            <td>适合强制需要用户看到并操作的页面。<br> <font color="#ff0000">比较推荐与近场手势搭配使用（能够解决不同臂长的人，使用近场点击时的舒适性问题）</font>，例如：控制栏 、窗口、引导教学等。</td>
        </tr>
        <tr>
            <td>6DOF模式</td>
            <td>固定在真实空间位置<br><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/6DoF%20%E6%98%BE%E7%A4%BA%E6%96%B9%E5%BC%8F.png" alt="6DOF模式示例"></td>
            <td>具备一定广泛适用性的空间展现形式，适合强虚实结合的场景。</td>
        </tr>
    </tbody>
</table>




# 3D 美术设计

- 尽量避免全黑的人物或场景设计 （黑色即透明）；

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/7%202.png"/>



- 基于 AR 虚实结合的概念，考虑显示 FOV 的限制，推荐采用小场景设计，不使用 Skybox 等完全遮挡现实世界的表现手法（或者采用黑色为主的 Skybox，例如星空）；

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%8F%E5%B2%9B.png"/>



- 一定要设计大场景的情况下，可以考虑在显示 FOV 边缘增加黑色过渡；

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E6%96%B0GIF%E5%8A%A8%E5%9B%BE.gif"/>



- 为保证性能, 同时渲染的模型总面数**<font color="#ff0000">不高于 30W 面</font>**。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E7%BB%84%20562.png"/>
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%201.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/qwqw.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%204.png

---

## 空间中的UI/物体
**Document ID:** 57b2cf8077434557b6270dbe89ebc845 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK</p>
<h1 id="构建场景"><span class="prefix"></span><span class="content">构建场景</span><span class="suffix"></span></h1>
<p>这里以6DoF场景为例，阐述空间中物体与XR 相机的相对关系。</p>
<h2 id="新建场景"><span class="prefix"></span><span class="content">1 新建场景</span><span class="suffix"></span></h2>
<p>新建Unity3D 工程，按照《接入指南》完成SDK 接入，并已经按照《6DoF空间》成功打包，在Project/Assets/Scenes 目录下复制DemoSpatial6DoF场景并命名为DemoSpatial。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204155408510.png" alt="image-20240204155408510"></p>
<h1 id="屏幕空间的使用"><span class="prefix"></span><span class="content">屏幕空间的使用</span><span class="suffix"></span></h1>
<p>在0DoF 空间中，创建的Canvas 给了一个建议，不要使用Unity 默认的Screen Space 来制作屏幕空间，但是在现实项目中，经常有一些统计类的信息需要展示在屏幕空间中。这里以将当前平均FPS 展示在屏幕的左上角为例。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportScreenUsage.mp4">&#10;</iframe>
<h2 id="创建用以显示的ui"><span class="prefix"></span><span class="content">1 创建用以显示的UI</span><span class="suffix"></span></h2>
<p>创建Text 并将Text 命名为FPS：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171119299.png" alt="image-20240204171119299"></p>
<p>这里使用TMP，所以，在弹出的TMP Importer 中选择Import TMP Essentials。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204170953134.png" alt="image-20240204170953134"></p>
<p>修改Canvas 的RenderMode 为World Space，Position{0,0,10}，Scale{0.0034,0.0034,0.0034}，Layer调整为Default。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171752607.png" alt="image-20240204171752607"></p>
<p>修改FPS（TextMeshPro）的Position{200,-40,0}，Size{400,64}，Anchor{min{0,1},max{0,1}}。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204172002208.png" alt="image-20240204172002208"></p>
<h2 id="使用屏幕空间"><span class="prefix"></span><span class="content">2 使用屏幕空间</span><span class="suffix"></span></h2>
<p>通过1.1 的配置，可以看到，将一个Canvas 放置在了空间中的特定位置，这和需求中，UI 始终跟随并不相符。需要让Canvas 跟随相机，并且占据屏幕空间。这里使用<code>UIOverlay.cs</code> 脚本来实现。</p>
<p>挂载<code>UIOverlay</code>。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204172642326.png" alt="image-20240204172642326"></p>
<p>这里需要注意，会同时挂载两个组件，一个是UI Overly，一个是Follow Camera，其中，UI Overly 是计算屏幕空间的，Follow Camera 是用来跟随相机的。这里的Panel Distance 和Offset Position 要与Canvas 的配置一致，脚本挂载之后，会修改Canvas 的Scale，这里按照脚本修改的即可。</p>
<h2 id="计算fps-并输出到屏幕上"><span class="prefix"></span><span class="content">3 计算FPS 并输出到屏幕上</span><span class="suffix"></span></h2>
<p>这里为了区别系统调试信息中的FPS，将TextMeshPro 的Vertex Color 调整为红色。</p>
<p>在Assets 目录下创建Scripts 目录，并创建FPS.cs 脚本。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204173217532.png" alt="image-20240204173217532"></p>
<p>编辑脚本FPS.cs</p>
<pre class=" language-c"><code class="prism # language-c">using TMPro<span class="token punctuation">;</span>
using UnityEngine<span class="token punctuation">;</span>

public class FPS <span class="token punctuation">:</span> MonoBehaviour
<span class="token punctuation">{</span>
    <span class="token comment">//record frame count</span>
    private <span class="token keyword">int</span> _count<span class="token punctuation">;</span>
    <span class="token comment">//record time span</span>
    private <span class="token keyword">float</span> _time<span class="token punctuation">;</span>
    
    <span class="token comment">//averaging time</span>
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span><span class="token punctuation">[</span><span class="token function">Range</span><span class="token punctuation">(</span><span class="token number">1f</span><span class="token punctuation">,</span><span class="token number">30f</span><span class="token punctuation">)</span><span class="token punctuation">]</span>
    public <span class="token keyword">float</span> averageTime <span class="token operator">=</span> <span class="token number">1f</span><span class="token punctuation">;</span>
    
    <span class="token comment">//UI text element for displaying</span>
    <span class="token punctuation">[</span>SerializeField<span class="token punctuation">]</span>
    public TextMeshProUGUI fpsText<span class="token punctuation">;</span>
    <span class="token comment">// Start is called before the first frame update</span>
    private <span class="token keyword">void</span> <span class="token function">Start</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        _count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
        _time <span class="token operator">=</span> <span class="token number">0f</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token comment">// Update is called once per frame</span>
    private <span class="token keyword">void</span> <span class="token function">Update</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        var delta <span class="token operator">=</span> Time<span class="token punctuation">.</span>smoothDeltaTime<span class="token punctuation">;</span>
        _time <span class="token operator">+</span><span class="token operator">=</span> delta<span class="token punctuation">;</span>
        _count<span class="token operator">++</span><span class="token punctuation">;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span><span class="token punctuation">(</span>_time <span class="token operator">&gt;=</span> averageTime<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
        <span class="token comment">// Calculate and display current FPS</span>
        fpsText<span class="token punctuation">.</span>text <span class="token operator">=</span> $<span class="token string">"FPS: {(_count / _time):F2}"</span><span class="token punctuation">;</span>
        <span class="token comment">// Reset time and frame count</span>
        _time <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
        _count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

</code></pre>
<p>将脚本挂到Canvas 上，并设置FPS Text为Canvas 下的FPS 文本。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204174911958.png" alt="image-20240204174911958"></p>
<h2 id="运行查看"><span class="prefix"></span><span class="content">4 运行查看</span><span class="suffix"></span></h2>
<h3 id="编译sample-应用"><span class="prefix"></span><span class="content">4.1 编译Sample 应用</span><span class="suffix"></span></h3>
<p>最后将DemoSpatial 场景添加到Scene In Build 列表中，并Build，即可构建APK。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204175717705.png" alt="image-20240204175717705"></p>
<p>打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。</p>
<h3 id="wifi-adb连接ar-studio-与pc"><span class="prefix"></span><span class="content">4.2 WiFI-ADB连接AR Studio 与PC</span><span class="suffix"></span></h3>
<p>这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。</p>
<p>使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png" alt="image-20240202114350368"></p>
<h3 id="安装应用"><span class="prefix"></span><span class="content">4.3 安装应用</span><span class="suffix"></span></h3>
<p>这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo.apk 为例，将应用安装到AR Studio：</p>
<p>使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo.apk 安装应用。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204180343220.png" alt="image-20240204180343220"></p>
<p>这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。</p>
<h3 id="运行查看应用"><span class="prefix"></span><span class="content">4.4 运行查看应用</span><span class="suffix"></span></h3>
<p>点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png" alt="image-20240202120621671"></p>
<p>打开应用后可以通过移动头部，通过不同距离、不同角度观察虚拟场景FPS 的显示，可以看到FPS 显示在屏幕空间的左上角。（场景中的绿色文字是系统的调试信息）：</p>
<iframe width="1280" height="720" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoFFPS.mp4"></iframe>
<p>需要注意，通过视频也可以看出，这个位置，和在Editor 中编辑的场景有一些出入，需要根据实际需求，调整位置。</p>
<h1 id="xr-相机空间的使用"><span class="prefix"></span><span class="content">XR 相机空间的使用</span><span class="suffix"></span></h1>
<p>除了需要使用屏幕空间之外，还有一些需求是需要使用XR 相机空间，或者说，物体/UI 在虚拟空间中，和现实空间关系更多，而不是相对于屏幕，比如，要设计一个跟随在观察者左侧的小球。它是以观察者的视角为重点，而不是在屏幕中的特定位置。</p>
<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportFollow.mp4"></iframe>
<h2 id="修改空间"><span class="prefix"></span><span class="content">1 修改空间</span><span class="suffix"></span></h2>
<p>在DemoSpatial 场景中，新建一个GameObject，并命名为FollowCube，并挂载MeshFilter(Cube01)，MeshRenderer(mat_purple)。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240205114610581.png" alt="image-20240205114610581"></p>
<h2 id="followcamera"><span class="prefix"></span><span class="content">2 FollowCamera</span><span class="suffix"></span></h2>
<p>在FollowCube 物体上挂载<code>FollowCamera</code> 脚本，并设置FollowType 为Position Only（这里是因为要让FollowCube 始终与观察者保持相对距离）。</p>
<p>FollowType：</p>
<pre class=" language-c"><code class="prism # language-c">public <span class="token keyword">enum</span> FollowType
<span class="token punctuation">{</span>
    RotationAndPosition<span class="token punctuation">,</span> <span class="token comment">//Follows the position and rotation of the camera.</span>
    PositionOnly<span class="token punctuation">,</span> <span class="token comment">// Follows only the position of the camera</span>
    RotationOnly <span class="token comment">// Follows only the rotation of the camera</span>
<span class="token punctuation">}</span>
</code></pre>
<p>设置Offset{-0.5,0,0},Scale{2,2,2}。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240205141106905.png" alt="image-20240205141106905"></p>
<h2 id="运行查看-1"><span class="prefix"></span><span class="content">3 运行查看</span><span class="suffix"></span></h2>
<h3 id="编译sample-应用-1"><span class="prefix"></span><span class="content">3.1 编译Sample 应用</span><span class="suffix"></span></h3>
<p>最后将DemoSpatial 场景添加到Scene In Build 列表中，并Build，即可构建APK。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204175717705.png" alt="image-20240204175717705"></p>
<p>打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。</p>
<h3 id="wifi-adb连接ar-studio-与pc-1"><span class="prefix"></span><span class="content">4.2 WiFI-ADB连接AR Studio 与PC</span><span class="suffix"></span></h3>
<p>这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。</p>
<p>使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png" alt="image-20240202114350368"></p>
<h3 id="安装应用-1"><span class="prefix"></span><span class="content">3.3 安装应用</span><span class="suffix"></span></h3>
<p>这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo.apk 为例，将应用安装到AR Studio：</p>
<p>使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo.apk 安装应用。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204180343220.png" alt="image-20240204180343220"></p>
<p>这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。</p>
<h3 id="运行查看应用-1"><span class="prefix"></span><span class="content">3.4 运行查看应用</span><span class="suffix"></span></h3>
<p>点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png" alt="image-20240202120621671"></p>
<p>打开应用后，场景中其他内容依旧是按照6DoF 场景中的呈现，转头到左侧，可以看到一个紫色方块，前后运动，其相对位置并不会改变。（场景中的绿色文字是系统的调试信息）：</p>
<iframe width="1280" height="720" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoFollowCamera.mp4"></iframe>
<h1 id="改变场景空间属性"><span class="prefix"></span><span class="content">改变场景空间属性</span><span class="suffix"></span></h1>
<p>在场景的应用过程中，可能需要切换场景的DoF 属性。</p>
<p>方法比较简单，改变RKCameraRig 的HeadTrackingType 即可。</p>
<pre class=" language-c"><code class="prism # language-c">using Rokid<span class="token punctuation">.</span>UXR<span class="token punctuation">.</span>Module<span class="token punctuation">;</span>
using UnityEngine<span class="token punctuation">;</span>

public class ChangeDoF <span class="token punctuation">:</span> MonoBehaviour
<span class="token punctuation">{</span>
    public RKCameraRig cameraRig<span class="token punctuation">;</span>


    <span class="token comment">// Update is called once per frame</span>
    private <span class="token keyword">void</span> <span class="token function">Update</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">{</span>
        <span class="token comment">//Using the arrow keys to change the DOF</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>Input<span class="token punctuation">.</span><span class="token function">GetKeyUp</span><span class="token punctuation">(</span>KeyCode<span class="token punctuation">.</span>LeftArrow<span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>cameraRig <span class="token operator">==</span> null<span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
            cameraRig<span class="token punctuation">.</span>headTrackingType <span class="token operator">=</span> RKCameraRig<span class="token punctuation">.</span>HeadTrackingType<span class="token punctuation">.</span>RotationAndPosition<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>Input<span class="token punctuation">.</span><span class="token function">GetKeyUp</span><span class="token punctuation">(</span>KeyCode<span class="token punctuation">.</span>RightArrow<span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>cameraRig <span class="token operator">==</span> null<span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
            cameraRig<span class="token punctuation">.</span>headTrackingType <span class="token operator">=</span> RKCameraRig<span class="token punctuation">.</span>HeadTrackingType<span class="token punctuation">.</span>None<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>Input<span class="token punctuation">.</span><span class="token function">GetKeyUp</span><span class="token punctuation">(</span>KeyCode<span class="token punctuation">.</span>UpArrow<span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>cameraRig <span class="token operator">==</span> null<span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
            cameraRig<span class="token punctuation">.</span>headTrackingType <span class="token operator">=</span> RKCameraRig<span class="token punctuation">.</span>HeadTrackingType<span class="token punctuation">.</span>RotationOnly<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
        <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>Input<span class="token punctuation">.</span><span class="token function">GetKeyUp</span><span class="token punctuation">(</span>KeyCode<span class="token punctuation">.</span>DownArrow<span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">{</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>cameraRig <span class="token operator">==</span> null<span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span>
            cameraRig<span class="token punctuation">.</span>headTrackingType <span class="token operator">=</span> RKCameraRig<span class="token punctuation">.</span>HeadTrackingType<span class="token punctuation">.</span>PositionOnly<span class="token punctuation">;</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre>
</div><script>var markdown = "本章节默认用户已经完成《接入指南》部分导入了UXR2.0 SDK

# 构建场景

这里以6DoF场景为例，阐述空间中物体与XR 相机的相对关系。

## 1 新建场景

新建Unity3D 工程，按照《接入指南》完成SDK 接入，并已经按照《6DoF空间》成功打包，在Project/Assets/Scenes 目录下复制DemoSpatial6DoF场景并命名为DemoSpatial。

![image-20240204155408510](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204155408510.png)

# 屏幕空间的使用

在0DoF 空间中，创建的Canvas 给了一个建议，不要使用Unity 默认的Screen Space 来制作屏幕空间，但是在现实项目中，经常有一些统计类的信息需要展示在屏幕空间中。这里以将当前平均FPS 展示在屏幕的左上角为例。

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportScreenUsage.mp4">
</iframe>

## 1 创建用以显示的UI

创建Text 并将Text 命名为FPS：

![image-20240204171119299](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171119299.png)

这里使用TMP，所以，在弹出的TMP Importer 中选择Import TMP Essentials。

![image-20240204170953134](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204170953134.png)

修改Canvas 的RenderMode 为World Space，Position{0,0,10}，Scale{0.0034,0.0034,0.0034}，Layer调整为Default。

![image-20240204171752607](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171752607.png)

修改FPS（TextMeshPro）的Position{200,-40,0}，Size{400,64}，Anchor{min{0,1},max{0,1}}。

![image-20240204172002208](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204172002208.png)

## 2 使用屏幕空间

通过1.1 的配置，可以看到，将一个Canvas 放置在了空间中的特定位置，这和需求中，UI 始终跟随并不相符。需要让Canvas 跟随相机，并且占据屏幕空间。这里使用```UIOverlay.cs``` 脚本来实现。

挂载```UIOverlay```。

![image-20240204172642326](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204172642326.png)

这里需要注意，会同时挂载两个组件，一个是UI Overly，一个是Follow Camera，其中，UI Overly 是计算屏幕空间的，Follow Camera 是用来跟随相机的。这里的Panel Distance 和Offset Position 要与Canvas 的配置一致，脚本挂载之后，会修改Canvas 的Scale，这里按照脚本修改的即可。

## 3 计算FPS 并输出到屏幕上

这里为了区别系统调试信息中的FPS，将TextMeshPro 的Vertex Color 调整为红色。

在Assets 目录下创建Scripts 目录，并创建FPS.cs 脚本。

![image-20240204173217532](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204173217532.png)

编辑脚本FPS.cs

```C#
using TMPro;
using UnityEngine;

public class FPS : MonoBehaviour
{
    //record frame count
    private int _count;
    //record time span
    private float _time;
    
    //averaging time
    [SerializeField][Range(1f,30f)]
    public float averageTime = 1f;
    
    //UI text element for displaying
    [SerializeField]
    public TextMeshProUGUI fpsText;
    // Start is called before the first frame update
    private void Start()
    {
        _count = 0;
        _time = 0f;
    }

    // Update is called once per frame
    private void Update()
    {
        var delta = Time.smoothDeltaTime;
        _time += delta;
        _count++;
        if (!(_time >= averageTime)) return;
        // Calculate and display current FPS
        fpsText.text = $"FPS: {(_count / _time):F2}";
        // Reset time and frame count
        _time = 0;
        _count = 0;
    }
}

```

将脚本挂到Canvas 上，并设置FPS Text为Canvas 下的FPS 文本。

![image-20240204174911958](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204174911958.png)



## 4 运行查看

### 4.1 编译Sample 应用

最后将DemoSpatial 场景添加到Scene In Build 列表中，并Build，即可构建APK。

![image-20240204175717705](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204175717705.png)

打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。

### 4.2 WiFI-ADB连接AR Studio 与PC

这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。

使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。

![image-20240202114350368](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png)

### 4.3 安装应用

这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo.apk 为例，将应用安装到AR Studio：

使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo.apk 安装应用。

![image-20240204180343220](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204180343220.png)

这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。

### 4.4 运行查看应用

点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。

![image-20240202120621671](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png)

打开应用后可以通过移动头部，通过不同距离、不同角度观察虚拟场景FPS 的显示，可以看到FPS 显示在屏幕空间的左上角。（场景中的绿色文字是系统的调试信息）：

<iframe width="1280" height="720" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoFFPS.mp4"></iframe>

需要注意，通过视频也可以看出，这个位置，和在Editor 中编辑的场景有一些出入，需要根据实际需求，调整位置。

# XR 相机空间的使用

除了需要使用屏幕空间之外，还有一些需求是需要使用XR 相机空间，或者说，物体/UI 在虚拟空间中，和现实空间关系更多，而不是相对于屏幕，比如，要设计一个跟随在观察者左侧的小球。它是以观察者的视角为重点，而不是在屏幕中的特定位置。

<iframe width="960" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportFollow.mp4"></iframe>



## 1 修改空间

在DemoSpatial 场景中，新建一个GameObject，并命名为FollowCube，并挂载MeshFilter(Cube01)，MeshRenderer(mat_purple)。

![image-20240205114610581](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240205114610581.png)

## 2 FollowCamera

在FollowCube 物体上挂载```FollowCamera``` 脚本，并设置FollowType 为Position Only（这里是因为要让FollowCube 始终与观察者保持相对距离）。

FollowType：

```C#
public enum FollowType
{
    RotationAndPosition, //Follows the position and rotation of the camera.
    PositionOnly, // Follows only the position of the camera
    RotationOnly // Follows only the rotation of the camera
}
```

设置Offset{-0.5,0,0},Scale{2,2,2}。

![image-20240205141106905](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240205141106905.png)

## 3 运行查看

### 3.1 编译Sample 应用

最后将DemoSpatial 场景添加到Scene In Build 列表中，并Build，即可构建APK。

![image-20240204175717705](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204175717705.png)

打包成功后，既可以开始准备将打包出来的APK安装到AR Studio 中进行查看。

### 4.2 WiFI-ADB连接AR Studio 与PC

这里在确保已经有ADB 环境的情况下，将PC 和AR Studio 在同一个局域网内，并读取AR Studio 的IP 地址（这里以10.91.4.189为例）。

使用ADB 命令：adb connect 10.91.4.189 将AR Studio 与PC 进行调试连接，并可以使用ADB 命令：adb devices 查看已连接的设备。

![image-20240202114350368](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202114350368.png)

### 3.3 安装应用

这里以APK 保存位置为：D:\UnityWork\SpatialDemo\SpatialDemo.apk 为例，将应用安装到AR Studio：

使用ADB 命令：adb install D:\UnityWork\SpatialDemo\SpatialDemo.apk 安装应用。

![image-20240204180343220](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204180343220.png)

这里注意，在安装应用之前，使用ADB 命令：adb devices 确认当前设备已经连接。如果成功安装，最后会提示Success。

### 3.4 运行查看应用

点击空间应用，在空间应用列表中找到已安装的应用（应用的名称在Player Settings 中，这里已SpatialDemo 为例）。

![image-20240202120621671](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240202120621671.png)

打开应用后，场景中其他内容依旧是按照6DoF 场景中的呈现，转头到左侧，可以看到一个紫色方块，前后运动，其相对位置并不会改变。（场景中的绿色文字是系统的调试信息）：

<iframe width="1280" height="720" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/video/6DoFollowCamera.mp4"></iframe>

# 改变场景空间属性

在场景的应用过程中，可能需要切换场景的DoF 属性。

方法比较简单，改变RKCameraRig 的HeadTrackingType 即可。

```c#
using Rokid.UXR.Module;
using UnityEngine;

public class ChangeDoF : MonoBehaviour
{
    public RKCameraRig cameraRig;


    // Update is called once per frame
    private void Update()
    {
        //Using the arrow keys to change the DOF
        if (Input.GetKeyUp(KeyCode.LeftArrow))
        {
            if (cameraRig == null) return;
            cameraRig.headTrackingType = RKCameraRig.HeadTrackingType.RotationAndPosition;
        }
        else if (Input.GetKeyUp(KeyCode.RightArrow))
        {
            if (cameraRig == null) return;
            cameraRig.headTrackingType = RKCameraRig.HeadTrackingType.None;
        }
        else if (Input.GetKeyUp(KeyCode.UpArrow))
        {
            if (cameraRig == null) return;
            cameraRig.headTrackingType = RKCameraRig.HeadTrackingType.RotationOnly;
        }
        else if (Input.GetKeyUp(KeyCode.DownArrow))
        {
            if (cameraRig == null) return;
            cameraRig.headTrackingType = RKCameraRig.HeadTrackingType.PositionOnly;
        }
    }
}
```

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204155408510.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204171119299.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.12/typora-user-images/image-20240204170953134.png

---

## 交互设计
**Document ID:** dbdf788eac3541a2a7d73b5e2bc1f89f | **Tags:** 手势交互，近远场，与模型交互，与UI交互

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="ar-glasses-交互方式">AR Glasses 交互方式</h1>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E8%8B%B1%E6%96%87%E5%9B%BE%E7%89%87/2%201.jpg" /></p>
<p>注意：Master 系统的默认交互方式是 3 DoF 射线，<font color="#ff0000">如果你设计的 AR 内容是使用其它方式交互的，请在应用打开第一时间告知用户</font>。通常来说，一个简单的引导动画即可达到此目的。以下是一个手势交互应用的引导示例。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E6%8A%95%E7%AF%AE.png"/></p>
<h1 id="手势交互">手势交互</h1>
<h2 id="1-手势交互原则">1 手势交互原则</h2>
<p>无意识交互：自然、符合直觉。</p>
<ul>
<li>
<p><strong>注重手势语义的直观性和便捷性，尽量减少记忆和学习成本</strong></p>
</li>
<li>
<ul>
<li>参考人与真实世界的互动，交互应该符合人的下意识行为</li>
</ul>
</li>
<li>
<p><strong>充足引导、反馈机制，建立使用者信心</strong></p>
</li>
<li>
<ul>
<li>由于触觉反馈的缺失，手势交互需要充分视觉、听觉反馈来弥补</li>
</ul>
</li>
<li>
<p><strong>符合人体工学，操作舒适</strong></p>
</li>
<li>
<ul>
<li>避免高抬手操作，考虑用户臂长差异等导致的体验问题。</li>
</ul>
</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%209.png"/></p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2010.png"/></p>
<h2 id="2-近远场手势">2 近/远场手势</h2>
<p>我们将手势分为近场手势和远场手势：直接进行触碰互动的，称为近场手势；通过射线和锚点远距离操控的，是远场手势。</p>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/Rokid%20XR%20%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%20%EF%BC%88master%20%E7%89%88%EF%BC%89.mp4"></iframe>
<p>近场手势和远场手势的切换，是通过手与互动物体的距离判定，这个值可以根据具体使用场景调节。默认设置是，手在距离互动物体 -0.02m ~ 0.04 m 范围内，是近场手势；超出则为远场。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2012.png"/></p>
<h2 id="3-近场手势">3 近场手势</h2>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA%E7%82%B9%E5%87%BB.mp4"></iframe>
<h3 id="31-食指上的小灯">3.1 食指上的小灯</h3>
<p>1）经过测试，若十个手指头都响应对虚拟物体的触摸，极其容易产生误触，影响体验。所以我们做了删减，只在食指上响应交互。因此，我们在食指上放置了一盏小灯，提示用户只有食指交互生效。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/1112.png"/></p>
<p>2）小灯照亮靠近的虚拟内容，并且光效随着远近有变化，来提示用户收到虚拟内容的距离。</p>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA.mp4"></iframe>
<h3 id="32-点击的五个状态">3.2 点击的五个状态</h3>
<ul>
<li>默认</li>
<li>hover ：手靠近 UI, 按钮向上抬起</li>
<li>触碰：手触摸到按钮，按钮有视觉变化</li>
<li>按压：手按下按钮至最底部，按钮有强烈视觉变化，且有声音反馈</li>
<li>抬起（响应）：手再次向上抬起，按钮恢复默认，有完成点击的声音反馈</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2036.png"/></p>
<p>Tips: 点击、滑动交互，推荐使用相同音效，即在手指按下（down）和抬手（up）瞬间有声音反馈，这两个音效应该是一对的。</p>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA%E7%82%B9%E5%87%BB.mp4"></iframe>
<h3 id="33-点击时手部-mesh-在-ui-面板上停住">3.3 点击时手部 mesh 在 UI 面板上停住</h3>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2037.png"/></p>
<h3 id="34-物体互动">3.4 物体互动</h3>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/07_Reng.mp4"></iframe>
<ul>
<li>单双手方案</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image11.png"/></p>
<ul>
<li>包裹框方案</li>
</ul>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%284%29.png"/></p>
<h2 id="4-远场手势">4 远场手势</h2>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%285%29.png"/></p>
<h3 id="41-射线">4.1 射线</h3>
<p>系统的射线方向是从手肘向手掌方向发出，小幅度受手掌旋转方向影响；然后将射线发出点平移至手虎口的位置，碰撞到虚拟物体，则产生射线锚点。此方案比较利于操作放置在手肘以上的虚拟内容。</p>
<p>在一些特殊场景，可以调整射线的发射方向。例如：操作射线在地面画圈，可以将射线设计为从头向手掌方向发出。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%286%29.png"/></p>
<h3 id="42-远场点击">4.2 远场点击</h3>
<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/06_Far.mp4" type="video/mp4"></iframe>
<h2 id="5-手势检测区域">5 手势检测区域</h2>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2053.png"/></p>
<p>如上图所示，手势检测区域比眼镜的显示区域大很多，而用户无法感知到明确的手势检测范围。所以在设计上，两个注意事项：</p>
<p>1）手势是否在检测区域内，需要有明显的状态区分，并且展示在显示区域内。例如：远场手势，手一旦进入检测区域，上翘的射线，会出现在显示区域里。</p>
<p>2）用户在交互过程中，手移出检测区域，需要有明确的反馈机制和处理逻辑。例如：用户在投篮游戏过程中，手  持球超出检测区域，球掉落在地上。</p>
<h1 id="主机射线交互">主机射线交互</h1>
<p>Rokid Station Pro 可以被当成一个控制手柄，从顶端发出一条 3 DoF 射线，用于与虚拟物体交互。用户可以通过转动 Station 来改变射线方向，达到瞄准目标物体的作用，再配合 Station 上的【确认】键，即可进行点击、滑动/移动等等基础操作。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E4%B8%BB%E6%9C%BA.png"/></p>
<p>注意：某些状态下会出现射线偏移过大、丢失等情况，所以重置射线功能必不可少，系统默认的方式是双击【O】键可重置射线。</p>
<h2 id="1-点击">1 点击</h2>
<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E7%82%B9%E5%87%BB.mp4"/>
<h2 id="2-滑动">2 滑动</h2>
<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E6%BB%91%E5%8A%A8.mp4"/>
<h2 id="3-移动">3 移动</h2>
<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E7%A7%BB%E5%8A%A8.mp4"/></div><script>var markdown ="# AR Glasses 交互方式



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E8%8B%B1%E6%96%87%E5%9B%BE%E7%89%87/2%201.jpg" />



注意：Master 系统的默认交互方式是 3 DoF 射线，<font color="#ff0000">如果你设计的 AR 内容是使用其它方式交互的，请在应用打开第一时间告知用户</font>。通常来说，一个简单的引导动画即可达到此目的。以下是一个手势交互应用的引导示例。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E6%8A%95%E7%AF%AE.png"/>

# 手势交互

## 1 手势交互原则

无意识交互：自然、符合直觉。

- **注重手势语义的直观性和便捷性，尽量减少记忆和学习成本**

- - 参考人与真实世界的互动，交互应该符合人的下意识行为

- **充足引导、反馈机制，建立使用者信心**

- - 由于触觉反馈的缺失，手势交互需要充分视觉、听觉反馈来弥补

- **符合人体工学，操作舒适**

- - 避免高抬手操作，考虑用户臂长差异等导致的体验问题。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%209.png"/>

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2010.png"/>




## 2 近/远场手势

我们将手势分为近场手势和远场手势：直接进行触碰互动的，称为近场手势；通过射线和锚点远距离操控的，是远场手势。

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/Rokid%20XR%20%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%20%EF%BC%88master%20%E7%89%88%EF%BC%89.mp4"></iframe>


近场手势和远场手势的切换，是通过手与互动物体的距离判定，这个值可以根据具体使用场景调节。默认设置是，手在距离互动物体 -0.02m ~ 0.04 m 范围内，是近场手势；超出则为远场。



<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2012.png"/>



## 3 近场手势

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA%E7%82%B9%E5%87%BB.mp4"></iframe>




### 3.1 食指上的小灯

1）经过测试，若十个手指头都响应对虚拟物体的触摸，极其容易产生误触，影响体验。所以我们做了删减，只在食指上响应交互。因此，我们在食指上放置了一盏小灯，提示用户只有食指交互生效。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/1112.png"/>



2）小灯照亮靠近的虚拟内容，并且光效随着远近有变化，来提示用户收到虚拟内容的距离。

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA.mp4"></iframe>



### 3.2 点击的五个状态

- 默认
- hover ：手靠近 UI, 按钮向上抬起
- 触碰：手触摸到按钮，按钮有视觉变化
- 按压：手按下按钮至最底部，按钮有强烈视觉变化，且有声音反馈
- 抬起（响应）：手再次向上抬起，按钮恢复默认，有完成点击的声音反馈

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2036.png"/>



Tips: 点击、滑动交互，推荐使用相同音效，即在手指按下（down）和抬手（up）瞬间有声音反馈，这两个音效应该是一对的。

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E8%BF%91%E5%9C%BA%E7%82%B9%E5%87%BB.mp4"></iframe>



### 3.3 点击时手部 mesh 在 UI 面板上停住

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2037.png"/>



### 3.4 物体互动

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/07_Reng.mp4"></iframe>




- 单双手方案

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image11.png"/>



- 包裹框方案

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%284%29.png"/>



## 4 远场手势

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%285%29.png"/>



### 4.1 射线

系统的射线方向是从手肘向手掌方向发出，小幅度受手掌旋转方向影响；然后将射线发出点平移至手虎口的位置，碰撞到虚拟物体，则产生射线锚点。此方案比较利于操作放置在手肘以上的虚拟内容。

在一些特殊场景，可以调整射线的发射方向。例如：操作射线在地面画圈，可以将射线设计为从头向手掌方向发出。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/image%20%286%29.png"/>



### 4.2 远场点击

<iframe width="640" height="360" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/06_Far.mp4" type="video/mp4"></iframe>




## 5 手势检测区域

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E6%96%87/%E5%AE%B9%E5%99%A8%2053.png"/>



如上图所示，手势检测区域比眼镜的显示区域大很多，而用户无法感知到明确的手势检测范围。所以在设计上，两个注意事项：

1）手势是否在检测区域内，需要有明显的状态区分，并且展示在显示区域内。例如：远场手势，手一旦进入检测区域，上翘的射线，会出现在显示区域里。

2）用户在交互过程中，手移出检测区域，需要有明确的反馈机制和处理逻辑。例如：用户在投篮游戏过程中，手  持球超出检测区域，球掉落在地上。

# 主机射线交互

Rokid Station Pro 可以被当成一个控制手柄，从顶端发出一条 3 DoF 射线，用于与虚拟物体交互。用户可以通过转动 Station 来改变射线方向，达到瞄准目标物体的作用，再配合 Station 上的【确认】键，即可进行点击、滑动/移动等等基础操作。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E4%B8%BB%E6%9C%BA.png"/>

注意：某些状态下会出现射线偏移过大、丢失等情况，所以重置射线功能必不可少，系统默认的方式是双击【O】键可重置射线。

## 1 点击

<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E7%82%B9%E5%87%BB.mp4"/>

## 2 滑动

<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E6%BB%91%E5%8A%A8.mp4"/>

## 3 移动

<iframe width="640" height="480" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E5%B0%84%E7%BA%BF%E7%A7%BB%E5%8A%A8.mp4"/>
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E8%8B%B1%E6%96%87%E5%9B%BE%E7%89%87/2%201.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8/%E6%8A%95%E7%AF%AE.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/%E5%AE%B9%E5%99%A8%209.png

---

## 内置组件 FollowCamera
**Document ID:** e0eaa35dc5fe4f07892106e6d99c9227 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h3 id="followcamera">FollowCamera</h3>
<p>相机跟随组件</p>
<ul>
<li>FollowType (物体跟随相机的类型)
<ul>
<li>RotationAndPosition (同时跟随相机旋转和位置)</li>
<li>PositionOnly (只跟随相机位置)</li>
<li>RotationOnly (只跟随相机旋转)</li>
</ul>
</li>
<li>OffsetPosition (跟随相机后,物体和相机位置偏差)</li>
<li>OffsetRotation (跟随相机后,物体和相机旋转偏差,欧拉角)</li>
<li>LockRotX (跟随相机旋转时,锁定 X (Pitch|俯仰) 轴)</li>
<li>LockRotY (跟随相机旋转时,锁定 Y (Yaw|偏航) 轴)</li>
<li>LockRotZ (跟随相机旋转时,锁定 Z (Roll|翻滚) 轴)</li>
</ul></div><script>var markdown ="### FollowCamera

相机跟随组件

-   FollowType (物体跟随相机的类型)
    -   RotationAndPosition (同时跟随相机旋转和位置)
    -   PositionOnly (只跟随相机位置)
    -   RotationOnly (只跟随相机旋转)
-   OffsetPosition (跟随相机后,物体和相机位置偏差)
-   OffsetRotation (跟随相机后,物体和相机旋转偏差,欧拉角)
-   LockRotX (跟随相机旋转时,锁定 X (Pitch|俯仰) 轴)
-   LockRotY (跟随相机旋转时,锁定 Y (Yaw|偏航) 轴)
-   LockRotZ (跟随相机旋转时,锁定 Z (Roll|翻滚) 轴)

";</script>

---

## 声音的应用
**Document ID:** 5ebe9dd65c544e4d80bf170d9f28d3c2 | **Tags:** 空间音频

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><p>Rokid 眼镜支持空间音频，即开发者可以将音频放在空间中的一个固定位置，或是绑定在空间中的某一 3D 物体上，这样用户就能够直观地听到声音在空间中的方位。适当的三维空间音效能够带来极好的沉浸感，是提高体验设计的好助力。</p>
<p><img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png"/></p></div><script>var markdown ="Rokid 眼镜支持空间音频，即开发者可以将音频放在空间中的一个固定位置，或是绑定在空间中的某一 3D 物体上，这样用户就能够直观地听到声音在空间中的方位。适当的三维空间音效能够带来极好的沉浸感，是提高体验设计的好助力。

<img width="1280" src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png"/>";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%AE%BE%E8%AE%A1%E8%A7%84%E8%8C%83%E5%9B%BE%E7%89%87/%E4%B8%AD%E8%8B%B1%E9%80%9A%E7%94%A8%E5%9B%BE/5.png

---

## 内置组件 GloablEventUtils
**Document ID:** 4bd9eceaad28425d8998fbd56c491708 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h2 id="globaleventutils">GlobalEventUtils</h2>
<p>全局事件工具,基于该工具,开发&amp;测试,能够非常方便的排查,交互系统的问题</p>
<h3 id="激活方式">激活方式</h3>
<ul>
<li>
<p>编辑器模式下 shift+i 激活或者关闭</p>
</li>
<li>
<p>运行阶段,所有基于 UXR SDK 开发的工具,能够使用 adb shell setprop rokid.globaldebug.show 1/0 命令开启和关闭(该方式目前只支持 station2 &amp; station pro)</p>
</li>
<li>
<p>勾选属性开启,如下图所示</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-4.png" alt="alt text" /></p>
</li>
<li>
<p>调用 api 开启,如下图所示</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-2.png" alt="alt text" /></p>
</li>
</ul>
<h3 id="关键界面参数说明">关键界面参数说明</h3>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image.png" alt="alt text" /></p>
<ul>
<li>
<p>左半部分属性说明</p>
<ul>
<li>InteractorType (当前激活的交互类型)</li>
<li>EventSystem.pixelDragThreshold (ui 事件系统的拖拽阈值)</li>
<li>Touch.FingerOperation ( touch 状态机显示当前手指的交互类型)</li>
<li>RayPose (交互射线的位姿)</li>
</ul>
</li>
<li>右半部分属性说明
<ul>
<li>OnPointerDown (指针按下)</li>
<li>OnPointerUp (指针抬起)</li>
<li>OnPointerClick (指针点击)</li>
<li>OnPointerEnter (指针进入)</li>
<li>OnPointerExit (指针退出)</li>
</ul>
</li>
</ul></div><script>var markdown ="## GlobalEventUtils

全局事件工具,基于该工具,开发&测试,能够非常方便的排查,交互系统的问题

### 激活方式

- 编辑器模式下 shift+i 激活或者关闭

- 运行阶段,所有基于 UXR SDK 开发的工具,能够使用 adb shell setprop rokid.globaldebug.show 1/0 命令开启和关闭(该方式目前只支持 station2 & station pro)

- 勾选属性开启,如下图所示

  ![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-4.png)

- 调用 api 开启,如下图所示

  ![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-2.png)

### 关键界面参数说明

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image.png)

-   左半部分属性说明

    -   InteractorType (当前激活的交互类型)
    -   EventSystem.pixelDragThreshold (ui 事件系统的拖拽阈值)
    -   Touch.FingerOperation ( touch 状态机显示当前手指的交互类型)
    -   RayPose (交互射线的位姿)

-   右半部分属性说明
    -   OnPointerDown (指针按下)
    -   OnPointerUp (指针抬起)
    -   OnPointerClick (指针点击)
    -   OnPointerEnter (指针进入)
    -   OnPointerExit (指针退出)";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-4.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image-2.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/image.png

---

## 内置交互拓展接口
**Document ID:** 18987a894e4f4f82a40e7eab53ccc0a5 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><h1 id="uxr-中的交互拓展接口">UXR 中的交互拓展接口</h1>
<p>以下交互接口是对 UGUI 交互接口欠缺与 3D 物体交互能力的补充和拓展,与 UGUI 交互接口 UXR 中的拓展接口一样遵循事件冒泡的机制 注意: 手势交互的拖拽接口,需要使用 IRayDragToTarget 而不能使用 IRayDrag</p>
<pre><code class="language-csharp">    /// &lt;summary&gt;
    /// Triggered when the ray enters
    /// &lt;/summary&gt;
    public interface IRayPointerEnter : IEventSystemHandler
    {
        void OnRayPointerEnter(PointerEventData eventData);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray exits
    /// &lt;/summary&gt;
    public interface IRayPointerExit : IEventSystemHandler
    {
        void OnRayPointerExit(PointerEventData eventData);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray starts
    /// &lt;/summary&gt;
    public interface IRayBeginDrag : IEventSystemHandler
    {
        void OnRayBeginDrag(PointerEventData eventData);
    }

    /// &lt;summary&gt;
    /// Triggered when ray dragging exclude gesture interaction
    /// &lt;/summary&gt;
    public interface IRayDrag : IEventSystemHandler
    {
        void OnRayDrag(Vector3 delta);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray dragging use targetPoint
    /// &lt;/summary&gt;
    public interface IRayDragToTarget : IEventSystemHandler
    {
        void OnRayDragToTarget(Vector3 targetPoint);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray drag ends
    /// &lt;/summary&gt;
    public interface IRayEndDrag : IEventSystemHandler
    {
        void OnRayEndDrag(PointerEventData eventData);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray hovering
    /// &lt;/summary&gt;
    public interface IRayPointerHover : IEventSystemHandler
    {
        void OnRayPointerHover(PointerEventData eventData);
    }

    /// &lt;summary&gt;
    /// Triggered when the ray click
    /// &lt;/summary&gt;
    public interface IRayPointerClick : IEventSystemHandler
    {
        void OnRayPointerClick(PointerEventData eventData);
    }
    /// &lt;summary&gt;
    /// Triggered when the ray pointer down
    /// &lt;/summary&gt;
    public interface IRayPointerDown : IEventSystemHandler
    {
        void OnRayPointerDown(PointerEventData eventData);
    }
    /// &lt;summary&gt;
    /// Triggered when the ray pointer up
    /// &lt;/summary&gt;
    public interface IRayPointerUp : IEventSystemHandler
    {
        void OnRayPointerUp(PointerEventData eventData);
    }

</code></pre>
<h3 id="demo">Demo</h3>
<ul>
<li>将 RKCameraRig 拖拽到场景中
<ul>
<li>相机无需设置</li>
<li>如果你想自定义相机属性可以参考 <a href="../../1.%E5%9F%BA%E7%A1%80%E4%BA%A4%E4%BA%92%E7%BB%84%E4%BB%B6%E8%AF%B4%E6%98%8E/1.RKCameraRig/RKCameraRig.md">RKCameraRig</a> 基础交互组件说明</li>
</ul>
</li>
<li>将 <a href="../../1.%E5%9F%BA%E7%A1%80%E4%BA%A4%E4%BA%92%E7%BB%84%E4%BB%B6%E8%AF%B4%E6%98%8E/2.RKInput/RKInput.md">[RKInput]</a> 拖拽到场景中</li>
<li>在 Project 视图中搜索 CubeRayInteractable 并将阈值体拖拽到场景中</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image.png" alt="alt text" /></p>
<ul>
<li>选中 CubeRayInteractable 点击 AddComponent 添加 CustomEventTest 组件</li>
</ul>
<pre><code class="language-csharp">using Rokid.UXR.Interaction;
using UnityEngine;
using UnityEngine.EventSystems;


public class CustomEventTest : MonoBehaviour, IRayPointerEnter, IRayPointerExit, IRayPointerDown, IRayPointerUp, IRayPointerClick,IRayBeginDrag, IRayDrag, IRayDragToTarget, IRayEndDrag
{
    void Start()
    {

    }

    public void OnRayPointerEnter(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayPointerEnter:&quot; + gameObject.name);
    }

    public void OnRayPointerExit(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayPointerExit:&quot; + gameObject.name);
    }

    public void OnRayPointerDown(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayPointerDown:&quot; + gameObject.name);
    }

    public void OnRayPointerUp(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayPointerUp&quot; + gameObject.name);
    }

    public void OnRayPointerClick(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayPointerClick:&quot; + gameObject.name);
    }

    public void OnRayBeginDrag(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayBeginDrag:&quot; + gameObject.name);
    }

    public void OnRayDrag(Vector3 delta)
    {
        Debug.Log(&quot;OnRayDrag:&quot; + gameObject.name);
    }

    public void OnRayDragToTarget(Vector3 targetPoint)
    {
        Debug.Log(&quot;OnRayDragToTarget:&quot; + gameObject.name);
    }

     public void OnRayEndDrag(PointerEventData eventData)
    {
        Debug.Log(&quot;OnRayEndDrag:&quot; + gameObject.name);
    }
}


</code></pre>
<ul>
<li>运行编辑器,点击使用射线与 Cube 进行交互,可以看到 Console 视图中打印事件信息</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-1.png" alt="alt text" /></p>
<h3 id="验证事件冒泡机制">验证事件冒泡机制</h3>
<ul>
<li>我们选中 CubeRayInteractable 预制体,并将 CubeRayInteractable (1) 拖拽到 CubeRayInteractable,并将 CubeRayInteractable (1) size 设置成 (2,2,2) 保证射线 hover 的是 CubeRayInteractable (1) 如下图所示</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-4.png" alt="alt text" /></p>
<ul>
<li>运行编辑器,点击使用射线与 Cube 进行交互,可以看到 Console 视图中打印事件信息都是关于 CubeRayInteractable (1),并且实现在被 CubeRayInteractable (1) 对象消耗掉之后并不会继续向上冒泡</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-3.png" alt="alt text" /></p>
<ul>
<li>移除 CubeRayInteractable (1) CustomEventTest 组件我们可以从 Console 视图中看到 CubeRayInteractable 上的事件被顺利触发了,注意这是射线 hover 的对象还是 CubeRayInteractable (1),说明移除组件后,事件顺利向上冒泡了</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-5.png" alt="alt text" /></p></div><script>var markdown ="# UXR 中的交互拓展接口

以下交互接口是对 UGUI 交互接口欠缺与 3D 物体交互能力的补充和拓展,与 UGUI 交互接口 UXR 中的拓展接口一样遵循事件冒泡的机制
注意: 手势交互的拖拽接口,需要使用 IRayDragToTarget 而不能使用 IRayDrag

```csharp
    /// <summary>
    /// Triggered when the ray enters
    /// </summary>
    public interface IRayPointerEnter : IEventSystemHandler
    {
        void OnRayPointerEnter(PointerEventData eventData);
    }

    /// <summary>
    /// Triggered when the ray exits
    /// </summary>
    public interface IRayPointerExit : IEventSystemHandler
    {
        void OnRayPointerExit(PointerEventData eventData);
    }

    /// <summary>
    /// Triggered when the ray starts
    /// </summary>
    public interface IRayBeginDrag : IEventSystemHandler
    {
        void OnRayBeginDrag(PointerEventData eventData);
    }

    /// <summary>
    /// Triggered when ray dragging exclude gesture interaction
    /// </summary>
    public interface IRayDrag : IEventSystemHandler
    {
        void OnRayDrag(Vector3 delta);
    }

    /// <summary>
    /// Triggered when the ray dragging use targetPoint
    /// </summary>
    public interface IRayDragToTarget : IEventSystemHandler
    {
        void OnRayDragToTarget(Vector3 targetPoint);
    }

    /// <summary>
    /// Triggered when the ray drag ends
    /// </summary>
    public interface IRayEndDrag : IEventSystemHandler
    {
        void OnRayEndDrag(PointerEventData eventData);
    }

    /// <summary>
    /// Triggered when the ray hovering
    /// </summary>
    public interface IRayPointerHover : IEventSystemHandler
    {
        void OnRayPointerHover(PointerEventData eventData);
    }

    /// <summary>
    /// Triggered when the ray click
    /// </summary>
    public interface IRayPointerClick : IEventSystemHandler
    {
        void OnRayPointerClick(PointerEventData eventData);
    }
    /// <summary>
    /// Triggered when the ray pointer down
    /// </summary>
    public interface IRayPointerDown : IEventSystemHandler
    {
        void OnRayPointerDown(PointerEventData eventData);
    }
    /// <summary>
    /// Triggered when the ray pointer up
    /// </summary>
    public interface IRayPointerUp : IEventSystemHandler
    {
        void OnRayPointerUp(PointerEventData eventData);
    }

```

### Demo

-   将 RKCameraRig 拖拽到场景中
    -   相机无需设置
    -   如果你想自定义相机属性可以参考 [RKCameraRig](../../1.%E5%9F%BA%E7%A1%80%E4%BA%A4%E4%BA%92%E7%BB%84%E4%BB%B6%E8%AF%B4%E6%98%8E/1.RKCameraRig/RKCameraRig.md) 基础交互组件说明
-   将 [[RKInput]](../../1.%E5%9F%BA%E7%A1%80%E4%BA%A4%E4%BA%92%E7%BB%84%E4%BB%B6%E8%AF%B4%E6%98%8E/2.RKInput/RKInput.md) 拖拽到场景中
-   在 Project 视图中搜索 CubeRayInteractable 并将阈值体拖拽到场景中

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image.png)

-   选中 CubeRayInteractable 点击 AddComponent 添加 CustomEventTest 组件

```csharp
using Rokid.UXR.Interaction;
using UnityEngine;
using UnityEngine.EventSystems;


public class CustomEventTest : MonoBehaviour, IRayPointerEnter, IRayPointerExit, IRayPointerDown, IRayPointerUp, IRayPointerClick,IRayBeginDrag, IRayDrag, IRayDragToTarget, IRayEndDrag
{
    void Start()
    {

    }

    public void OnRayPointerEnter(PointerEventData eventData)
    {
        Debug.Log("OnRayPointerEnter:" + gameObject.name);
    }

    public void OnRayPointerExit(PointerEventData eventData)
    {
        Debug.Log("OnRayPointerExit:" + gameObject.name);
    }

    public void OnRayPointerDown(PointerEventData eventData)
    {
        Debug.Log("OnRayPointerDown:" + gameObject.name);
    }

    public void OnRayPointerUp(PointerEventData eventData)
    {
        Debug.Log("OnRayPointerUp" + gameObject.name);
    }

    public void OnRayPointerClick(PointerEventData eventData)
    {
        Debug.Log("OnRayPointerClick:" + gameObject.name);
    }

    public void OnRayBeginDrag(PointerEventData eventData)
    {
        Debug.Log("OnRayBeginDrag:" + gameObject.name);
    }

    public void OnRayDrag(Vector3 delta)
    {
        Debug.Log("OnRayDrag:" + gameObject.name);
    }

    public void OnRayDragToTarget(Vector3 targetPoint)
    {
        Debug.Log("OnRayDragToTarget:" + gameObject.name);
    }

     public void OnRayEndDrag(PointerEventData eventData)
    {
        Debug.Log("OnRayEndDrag:" + gameObject.name);
    }
}


```

-   运行编辑器,点击使用射线与 Cube 进行交互,可以看到 Console 视图中打印事件信息

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-1.png)

### 验证事件冒泡机制

-   我们选中 CubeRayInteractable 预制体,并将 CubeRayInteractable (1) 拖拽到 CubeRayInteractable,并将 CubeRayInteractable (1) size 设置成 (2,2,2) 保证射线 hover 的是 CubeRayInteractable (1) 如下图所示

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-4.png)

-   运行编辑器,点击使用射线与 Cube 进行交互,可以看到 Console 视图中打印事件信息都是关于 CubeRayInteractable (1),并且实现在被 CubeRayInteractable (1) 对象消耗掉之后并不会继续向上冒泡

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-3.png)

-   移除 CubeRayInteractable (1) CustomEventTest 组件我们可以从 Console 视图中看到 CubeRayInteractable 上的事件被顺利触发了,注意这是射线 hover 的对象还是 CubeRayInteractable (1),说明移除组件后,事件顺利向上冒泡了

![alt text](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-5.png)";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-1.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E6%8B%93%E5%B1%95%E6%8E%A5%E5%8F%A3/image-4.png

---

## 简介
**Document ID:** 196256c8cade4a87ab8e04e45816e7b8 | **Tags:** 空间定位，双目渲染、3D手势、空间感知

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><p>UXR3.0 SDK 是为Unity 开发者提供的在YodaOS-Master 空间计算操作系统上开发空间计算应用的工具。帮助开发者在YodaOS-Master 空间计算操作系统上进行空间构建、虚实交互、空间感知，进而构建出完整的空间应用。</p>
<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%80%BB%E4%BD%93%E5%9B%BE%E7%89%87.png" width="1280">
<h1 id="sdk-架构"><span class="prefix"></span><span class="content">SDK 架构</span><span class="suffix"></span></h1>
<img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/OpenXRSDKArchitecture.png" width="1280">
<h1 id="双目渲染"><span class="prefix"></span><span class="content">双目渲染</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为用户提供基于Rokid 设备的双目渲染能力，真实还原3D 场景、物体、UI 的空间表达。通过该功能，开发者可以实现与现实世界的三维空间高度一致的交互体验。</p>
<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%8F%8C%E7%9B%AE%E6%B8%B2%E6%9F%93.png" width="1280">
<h1 id="空间定位与追踪"><span class="prefix"></span><span class="content">空间定位与追踪</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为开发者提供了0/3/6DoF（自由度） 的空间观察角度，方便开发者根据需求开发不同类型的空间应用。该功能支持开发者灵活调整空间视角，以满足不同的应用场景。</p>
<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%AE%9A%E4%BD%8D%E4%B8%8E%E8%BF%BD%E8%B8%AA.png">
<p>同时UXR 2.0 SDK 也为开发者提供了开放的空间接口API，方便开发者进行二次开发。</p>
<h1 id="虚实交互"><span class="prefix"></span><span class="content">虚实交互</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为开发者和用户提供了丰富的虚实交互体验。开发者可以通过SDK 提供的多模态交互组件为用户开发基于手势（Max Pro 独占）、主机射线、鼠标、滑鼠、TouchPad（Station2 独占）等形式的交互体验。另外SDK也为开发者提供了离线语音指令能力。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%99%9A%E5%AE%9E%E4%BA%A4%E4%BA%92.jpg" width="1280"></p>
<h1 id="平面检测"><span class="prefix"></span><span class="content">平面检测</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为开发者和用户提供了平面检测功能。通过该功能，开发者可以感知现实空间中的平面，并基于此进行交互设计。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%B9%B3%E9%9D%A2%E6%A3%80%E6%B5%8B.png" width="1280"></p>
<h1 id="图像识别"><span class="prefix"></span><span class="content">图像识别</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为开发者和用户提供了图像识别功能。开发者可以在空间中识别并处理特定的目标图像。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%9B%BE%E5%83%8F%E8%AF%86%E5%88%AB.png" width="1280"></p>
<h1 id="设备硬件信息"><span class="prefix"></span><span class="content">设备硬件信息</span><span class="suffix"></span></h1>
<p>UXR3.0 SDK 为开发者提供了获取与Rokid 设备交互所需的硬件信息，包括摄像头、传感器等关键组件的详细参数。</p>
<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E7%A1%AC%E4%BB%B6%E8%AE%BE%E5%A4%87%E4%BF%A1%E6%81%AF.png" width="1280">
<p><em>图片中的设备为：Rokid Max Pro</em></p>
</div><script>var markdown = "UXR3.0 SDK 是为Unity 开发者提供的在YodaOS-Master 空间计算操作系统上开发空间计算应用的工具。帮助开发者在YodaOS-Master 空间计算操作系统上进行空间构建、虚实交互、空间感知，进而构建出完整的空间应用。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%80%BB%E4%BD%93%E5%9B%BE%E7%89%87.png" width="1280"/>



# SDK 架构

<img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/OpenXRSDKArchitecture.png" width="1280"/>



# 双目渲染

UXR3.0 SDK 为用户提供基于Rokid 设备的双目渲染能力，真实还原3D 场景、物体、UI 的空间表达。通过该功能，开发者可以实现与现实世界的三维空间高度一致的交互体验。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%8F%8C%E7%9B%AE%E6%B8%B2%E6%9F%93.png" width="1280"/>



# 空间定位与追踪

UXR3.0 SDK 为开发者提供了0/3/6DoF（自由度） 的空间观察角度，方便开发者根据需求开发不同类型的空间应用。该功能支持开发者灵活调整空间视角，以满足不同的应用场景。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%AE%9A%E4%BD%8D%E4%B8%8E%E8%BF%BD%E8%B8%AA.png"/>

同时UXR 2.0 SDK 也为开发者提供了开放的空间接口API，方便开发者进行二次开发。



# 虚实交互

UXR3.0 SDK 为开发者和用户提供了丰富的虚实交互体验。开发者可以通过SDK 提供的多模态交互组件为用户开发基于手势（Max Pro 独占）、主机射线、鼠标、滑鼠、TouchPad（Station2 独占）等形式的交互体验。另外SDK也为开发者提供了离线语音指令能力。



<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E8%99%9A%E5%AE%9E%E4%BA%A4%E4%BA%92.jpg" width="1280"/></p>



# 平面检测

UXR3.0 SDK 为开发者和用户提供了平面检测功能。通过该功能，开发者可以感知现实空间中的平面，并基于此进行交互设计。

<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%B9%B3%E9%9D%A2%E6%A3%80%E6%B5%8B.png" width="1280"/></p>

# 图像识别

UXR3.0 SDK 为开发者和用户提供了图像识别功能。开发者可以在空间中识别并处理特定的目标图像。

<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/%E5%9B%BE%E5%83%8F%E8%AF%86%E5%88%AB.png" width="1280"/></p>

# 设备硬件信息

UXR3.0 SDK 为开发者提供了获取与Rokid 设备交互所需的硬件信息，包括摄像头、传感器等关键组件的详细参数。

<img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/%E7%A1%AC%E4%BB%B6%E8%AE%BE%E5%A4%87%E4%BF%A1%E6%81%AF.png" width="1280"/>

*图片中的设备为：Rokid Max Pro*
";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E6%80%BB%E4%BD%93%E5%9B%BE%E7%89%87.png
- https://ota.rokidcdn.com/toB/Document/UXR3.0/OpenXRSDKArchitecture.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/%E5%8F%8C%E7%9B%AE%E6%B8%B2%E6%9F%93.png

---

## 开发环境搭建
**Document ID:** f1ec651ab20a4eee9346857ef5129ec3 | **Tags:** AR Studio，Unity

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><h1 id="硬件环境"><span class="prefix"></span><span class="content">硬件环境</span><span class="suffix"></span></h1>
<p>为了顺利接入UXR3.0 SDK，硬件环境要求如下：</p>
<ul>
<li>1）<strong>可进行Unity开发的PC设备</strong>：支持用于Unity开发的Mac或Windows PC设备。</li>
<li>2）<strong>空间计算设备</strong>：配备Rokid Station Pro/Rokid Station2设备。</li>
<li>3）<strong>眼镜设备</strong>：配备Rokid Max Pro/Rokid Max/Rokid Max2眼镜。</li>
</ul>
<h1 id="软件环境"><span class="prefix"></span><span class="content">软件环境</span><span class="suffix"></span></h1>
<p>作为专为Unity开发者打造的高级开发工具包，Rokid Unity OpenXR Plugin要求开发者具备完整的Unity开发环境以及对应的Android Build Support（包括Android SDK、NDK工具链和OpenJDK）。具体版本要求如下：</p>
<ul>
<li>
<p>1）<strong>Unity开发环境</strong>：使用Unity 2022 LTS版本。</p>
</li>
<li>
<p>2）<strong>Android Build Support环境</strong>：</p>
<ul>
<li>Android SDK</li>
<li>NDK Tools</li>
<li>OpenJDK</li>
</ul>
</li>
<li>
<p>3）<strong>移动平台支持</strong>：Android Platform号码应为28至34。</p>
</li>
<li>
<p>4）<strong>操作系统要求</strong>：YodaOS系统版本不低于<strong>v3.30.003-20250120-800201</strong>。</p>
</li>
</ul>
<h1 id="基础环境搭建示例"><span class="prefix"></span><span class="content">基础环境搭建示例</span><span class="suffix"></span></h1>
<p>本节内容，将为开发者介绍如何构建Unity-Android 开发环境，以及配置Android ADB 环境和使用“SCRCPY”进行投屏。</p>
<p>示例环境：</p>
<ul>
<li>Windows11/macOS Sonoma 14.5</li>
</ul>
<p><em>Tips：以下内容将主要以Windows 环境为主。针对一些相对差异较大的内容会提供Windows/macOS 双版本介绍。</em></p>
<h2 id="unity-安装"><span class="prefix"></span><span class="content">1 Unity 安装</span><span class="suffix"></span></h2>
<h3 id="unity-hub-安装"><span class="prefix"></span><span class="content">1.1 Unity Hub 安装</span><span class="suffix"></span></h3>
<p>使用Unity Hub 可管理Unity编辑器版本、创建并访问多个项目。</p>
<p>访问：<a href="https://unity.cn/releases">Unity官方下载</a></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729143637274.png" alt="image-20240729143637274"></p>
<p><em>Tips：如果未注册成为Unity 开发者，这里将需要先行注册成为开发者，注册过程根据Unity 提示完成即可。</em></p>
<p>点击下载Unity Hub，在弹出的版本选择中根据自己的系统版本选择下载。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729144211902.png" alt="image-20240729144211902"></p>
<p>打开下载的UnityHubSetup，选择安装。过程中只需要使用Unity 的默认配置即可（推荐使用默认配置）。</p>
<h3 id="安装有android-support-的unity"><span class="prefix"></span><span class="content">1.2 安装有Android Support 的Unity</span><span class="suffix"></span></h3>
<p>访问：<a href="https://unity.cn/releases">Unity官方下载</a></p>
<p>在Unity 版本部分，选择长期支持版本，选择适合自己的长期支持版本。（当前UXR3.0 SDK 支持使用Unity2022 LTS 版本。），选择从Unity Hub 下载。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153127104.png" alt="image-20240729153127104"></p>
<p>在弹出的“要打开Unity Hub 吗？”的对话框中选择“打开Unity Hub”。网页将自动协助打开Unity Hub。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153203130.png" alt="image-20240729153203130"></p>
<p><em>Tips：受限于网络条件和性能打开过程会有些延时，耐心等待即可。</em></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153933591.png" alt="image-20240729153933591"></p>
<p><em>这里以Unity 2022.3.34f1c1 版本为例</em></p>
<p>在打开的Install Unity xxxx.x.xxxxxx <code>LTS</code> 窗口，选择Android Build Support（这里要做完全安装）。</p>
<p>选择Continue，并在弹出的Android SDK and NDK License Terms from Google 窗口，勾选“I have read and agree with the above terms and conditions”，并选择Install 开始下载和安装。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729154150467.png" alt="image-20240729154150467"></p>
<p>可以在Unity Hub 中点击DOWNLOADS 查看下载和安装进度。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729154557536.png" alt="image-20240729154557536"></p>
<p><em>Tips：如果出现部分内容下载失败或者更新终端，点击刷新按钮，一定“不要”直接点击退出、删除。</em></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729155906658.png" alt="image-20240729155906658"></p>
<p>后续的操作只需要按照提示操作即可。包括Dev Tools 的安装、Android SDK 的安装和Unity Editor 的安装。<em>推荐使用默认安装，避免一些莫名的错误和问题。</em></p>
<h2 id="android-adb（android-debug-bridge）配置"><span class="prefix"></span><span class="content">2 Android ADB（Android-Debug-Bridge）配置</span><span class="suffix"></span></h2>
<h3 id="windows-环境下配置"><span class="prefix"></span><span class="content">2.1 Windows 环境下配置</span><span class="suffix"></span></h3>
<p><em>当前章节如果已经安装配置了Android Studio 的话，可以略过，这里以只安装了Unity-Android 环境为例。</em></p>
<h4 id="找到adb.exe"><span class="prefix"></span><span class="content">2.1.1 找到adb.exe</span><span class="suffix"></span></h4>
<p>打开Unity Hub，找到Installs，并找到包含Android 标签的Unity 版本（常用版本）。复制安装路径，例如图片中的：<code>D:\Unity\2022.3.34f1c1\Editor\</code></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154218834.png" alt="image-20240730154218834"></p>
<p>打开这个路径，可以在cmd 中使用：<code>start D:\Unity\2022.3.34f1c1\Editor\</code>或者在文件资料管理器的地址上填入该地址。打开Unity 安装路径。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154647848.png" alt="image-20240730154647848"></p>
<p>依次打开Data–&gt;PlaybackEngines–&gt;AndroidPlayer–&gt;SDK–&gt;platform-tools 目录。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154925074.png" alt="image-20240730154925074"></p>
<p>点击地址栏，并复制该地址。例如我这里的是：<code>D:\Unity\2022.3.34f1c1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK\platform-tools</code></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730155303761.png" alt="image-20240730155303761"></p>
<h4 id="设置环境变量"><span class="prefix"></span><span class="content">2.1.2 设置环境变量</span><span class="suffix"></span></h4>
<p>右键点击此电脑，选择属性，打开系统信息页面。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730155907219.png" alt="image-20240730155907219"></p>
<p>在系统信息界面</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730160301900.png" alt="image-20240730160301900"></p>
<p>点击环境变量，在弹出的环境变量窗口，找到系统变量部分的<code>Path</code>条目，选择编辑。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240731110941638.png" alt="image-20240731110941638"></p>
<p>在弹出的编辑环境变量窗口，点击新建，并将复制的地址<code>D:\Unity\2022.3.34f1c1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK\platform-tools</code>粘贴过来，<strong>并在地址的末尾添加"\"</strong>。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240805101826381.png" alt="image-20240805101826381"></p>
<p>最后，依次点击确定保存所有修改。直到所有打开的窗口都关闭。</p>
<h4 id="测试adb-环境"><span class="prefix"></span><span class="content">2.1.3 测试ADB 环境</span><span class="suffix"></span></h4>
<p>打开CMD/PowerShell，并输入<code>adb --version</code>，查询ADB 的版本以验证是否已经完成了环境的配置。</p>
<p><em>Tips：Windows 环境变量配置完成后，需要重新打开命令行工具。</em></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240805111700804.png" alt="image-20240805111700804"></p>
<h3 id="macos-环境下配置"><span class="prefix"></span><span class="content">2.2 macOS 环境下配置</span><span class="suffix"></span></h3>
<h4 id="找到adb"><span class="prefix"></span><span class="content">2.2.1 找到adb</span><span class="suffix"></span></h4>
<p>打开Unity Hub，找到Installs，并找到包含Android 标签的Unity 版本（常用版本）。复制安装路径，例如图片中的：<code>/Application/Unity/Hub/Editor/2022.3.17f1c1/Editor/</code></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/2ed841aa01fd86f67ea195feca96edc.png" alt="2ed841aa01fd86f67ea195feca96edc"></p>
<p>打开苹果自带的命令行ZSH。并切换到该安装路径。在该路径下，打开<code>PlaybackEnignes/AndroidPlayer/SDK/platform-tools/</code>目录。使用<code>ls</code>命令，在当前目录下有一个<code>adb</code>工具，出现该工具即说明已经找到了adb路径。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/673707fe893fb485af05399993f7fe2.png" alt="673707fe893fb485af05399993f7fe2"></p>
<h4 id="设置环境变量-1"><span class="prefix"></span><span class="content">2.2.2 设置环境变量</span><span class="suffix"></span></h4>
<p>使用<code>pwd</code>指令，获取当前的路径，如下图所示，复制该地址。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/fba05a18a65f08d0fc40b224197f318.png" alt="fba05a18a65f08d0fc40b224197f318"></p>
<p>检查个人路径下是否有.bash_profile文件：</p>
<pre><code>ls ~/.bash_profile
</code></pre>
<p>如果已经有了，可以不执行以下命令。如果没有，执行以下命令创建<code>~/.bash_profile</code>文件：</p>
<pre><code>touch ~/.bash_profile
</code></pre>
<p>如下图：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/ca39d6086689d1d76e4c57d43873143.jpg" alt="ca39d6086689d1d76e4c57d43873143"></p>
<p>使用<code>open ~/.bash_profile</code>打开<code>~/.bash_profile</code>，并写入：</p>
<pre><code>export ADB_HOME=/Applications/Unity/Hub/Editor/2022.3.17f1c1/Editor/PlaybackEngines/AndroidPlayer/SDK/platform-tools/
export PATH=$ADB_HOME:$PATH
</code></pre>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/783a12bcb6982e4d65e4f7845246cee.jpg" alt="783a12bcb6982e4d65e4f7845246cee"></p>
<p>保存并退出编辑。</p>
<p>通过<code>source ~/.bash_profile</code>将系统变量通知到系统，可以通过查看<code>PATH</code>变量查看是否成功配置。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/d314e9ad538e1a4545d76c09bcda80b.jpg" alt="d314e9ad538e1a4545d76c09bcda80b"></p>
<h4 id="测试adb-环境-1"><span class="prefix"></span><span class="content">2.2.3 测试ADB 环境</span><span class="suffix"></span></h4>
<p>在控制台上，使用<code>adb --version</code> 指令，如果成功配置将在控制台上显示ADB 的相关信息。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/71ed9078c60ef43e3492e2de787ca7b.jpg" alt="71ed9078c60ef43e3492e2de787ca7b"></p>
<h2 id="adb-常用命令"><span class="prefix"></span><span class="content">3 ADB 常用命令</span><span class="suffix"></span></h2>
<h3 id="设备连接及查询"><span class="prefix"></span><span class="content">2.1 设备连接及查询</span><span class="suffix"></span></h3>
<p>设备在开启开发者模式后，开发者即可使用ADB 工具进行应用调试。</p>
<pre><code># 查询当前连接的设备列表指令
adb devices

# Wifi-ADB 链接指令，其中xxx.xxx.xxx.xxx指代和PC 同一局域网内的设备的IP 地址。
adb connect xxx.xxx.xxx.xxx

# 进入设备控制台指令
adb shell
</code></pre>
<h3 id="apk-安装与卸载"><span class="prefix"></span><span class="content">2.2 APK 安装与卸载</span><span class="suffix"></span></h3>
<pre><code># 安装apk,其中/xxx/xxx/xxx/xxx.apk 指代的是apk文件在PC上存储的绝对路径。
adb install /xxx/xxx/xxx/xxx.apk

# 卸载apk，其中xxx.xxx.xxx.xxx 指代的是应用的包名。
adb uninstall xxx.xxx.xxx.xxx
</code></pre>
<h3 id="推送和拉取内容"><span class="prefix"></span><span class="content">2.3 推送和拉取内容</span><span class="suffix"></span></h3>
<pre><code># 将内容（./abc）推送到/sdcard/xxxx/目录下
adb push ./abc /sdcard/xxxx/

# 从内容（/sdcard/xxxx/abc）从设备中拉取到PC当前目录
adb pull /sdcard/xxxx/adb
</code></pre>
<h3 id="查看logcat"><span class="prefix"></span><span class="content">2.4 查看Logcat</span><span class="suffix"></span></h3>
<pre><code># 在设备的控制台查看
adb shell
logcat

# 在设备的控制台将Logcat 保存到/sdcard/log.txt
adb shell
logcat &gt; /sdcard/log.txt

# 在PC 端直接保存到当前目录下
adb shell logcat &gt; log.txt
</code></pre>
</div><script>var markdown = "# 硬件环境

为了顺利接入UXR3.0 SDK，硬件环境要求如下：

- 1）**可进行Unity开发的PC设备**：支持用于Unity开发的Mac或Windows PC设备。
- 2）**空间计算设备**：配备Rokid Station Pro/Rokid Station2设备。
- 3）**眼镜设备**：配备Rokid Max Pro/Rokid Max/Rokid Max2眼镜。

# 软件环境

作为专为Unity开发者打造的高级开发工具包，Rokid Unity OpenXR Plugin要求开发者具备完整的Unity开发环境以及对应的Android Build Support（包括Android SDK、NDK工具链和OpenJDK）。具体版本要求如下：

- 1）**Unity开发环境**：使用Unity 2022 LTS版本。
- 2）**Android Build Support环境**：
  - Android SDK
  - NDK Tools
  - OpenJDK

- 3）**移动平台支持**：Android Platform号码应为28至34。
- 4）**操作系统要求**：YodaOS系统版本不低于**v3.30.003-20250120-800201**。


# 基础环境搭建示例

本节内容，将为开发者介绍如何构建Unity-Android 开发环境，以及配置Android ADB 环境和使用“SCRCPY”进行投屏。

示例环境：

- Windows11/macOS Sonoma 14.5

*Tips：以下内容将主要以Windows 环境为主。针对一些相对差异较大的内容会提供Windows/macOS 双版本介绍。*

## 1 Unity 安装

### 1.1 Unity Hub 安装

使用Unity Hub 可管理Unity编辑器版本、创建并访问多个项目。

访问：[Unity官方下载](https://unity.cn/releases)

![image-20240729143637274]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729143637274.png)

*Tips：如果未注册成为Unity 开发者，这里将需要先行注册成为开发者，注册过程根据Unity 提示完成即可。*

点击下载Unity Hub，在弹出的版本选择中根据自己的系统版本选择下载。

![image-20240729144211902]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729144211902.png)

打开下载的UnityHubSetup，选择安装。过程中只需要使用Unity 的默认配置即可（推荐使用默认配置）。

### 1.2 安装有Android Support 的Unity

访问：[Unity官方下载](https://unity.cn/releases)

在Unity 版本部分，选择长期支持版本，选择适合自己的长期支持版本。（当前UXR3.0 SDK 支持使用Unity2022 LTS 版本。），选择从Unity Hub 下载。

![image-20240729153127104]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153127104.png)

在弹出的“要打开Unity Hub 吗？”的对话框中选择“打开Unity Hub”。网页将自动协助打开Unity Hub。

![image-20240729153203130]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153203130.png)

*Tips：受限于网络条件和性能打开过程会有些延时，耐心等待即可。*

![image-20240729153933591]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153933591.png)

*这里以Unity 2022.3.34f1c1 版本为例*

在打开的Install Unity xxxx.x.xxxxxx ```LTS``` 窗口，选择Android Build Support（这里要做完全安装）。

选择Continue，并在弹出的Android SDK and NDK License Terms from Google 窗口，勾选“I have read and agree with the above terms and conditions”，并选择Install 开始下载和安装。

![image-20240729154150467]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729154150467.png)

可以在Unity Hub 中点击DOWNLOADS 查看下载和安装进度。

![image-20240729154557536]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729154557536.png)

*Tips：如果出现部分内容下载失败或者更新终端，点击刷新按钮，一定“不要”直接点击退出、删除。*

![image-20240729155906658]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729155906658.png)

后续的操作只需要按照提示操作即可。包括Dev Tools 的安装、Android SDK 的安装和Unity Editor 的安装。*推荐使用默认安装，避免一些莫名的错误和问题。*

## 2 Android ADB（Android-Debug-Bridge）配置

### 2.1 Windows 环境下配置

*当前章节如果已经安装配置了Android Studio 的话，可以略过，这里以只安装了Unity-Android 环境为例。*

#### 2.1.1 找到adb.exe

打开Unity Hub，找到Installs，并找到包含Android 标签的Unity 版本（常用版本）。复制安装路径，例如图片中的：```D:\Unity\2022.3.34f1c1\Editor\```

![image-20240730154218834]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154218834.png)

打开这个路径，可以在cmd 中使用：```start D:\Unity\2022.3.34f1c1\Editor\ ```或者在文件资料管理器的地址上填入该地址。打开Unity 安装路径。

![image-20240730154647848]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154647848.png)

依次打开Data-->PlaybackEngines-->AndroidPlayer-->SDK-->platform-tools 目录。

![image-20240730154925074]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730154925074.png)

点击地址栏，并复制该地址。例如我这里的是：```D:\Unity\2022.3.34f1c1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK\platform-tools```

![image-20240730155303761]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730155303761.png)

#### 2.1.2 设置环境变量

右键点击此电脑，选择属性，打开系统信息页面。

![image-20240730155907219]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730155907219.png)

在系统信息界面

![image-20240730160301900]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240730160301900.png)

点击环境变量，在弹出的环境变量窗口，找到系统变量部分的```Path```条目，选择编辑。

![image-20240731110941638]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240731110941638.png)



在弹出的编辑环境变量窗口，点击新建，并将复制的地址```D:\Unity\2022.3.34f1c1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK\platform-tools```粘贴过来，**并在地址的末尾添加"\\"**。

![image-20240805101826381]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240805101826381.png)

最后，依次点击确定保存所有修改。直到所有打开的窗口都关闭。

#### 2.1.3 测试ADB 环境

打开CMD/PowerShell，并输入```adb --version```，查询ADB 的版本以验证是否已经完成了环境的配置。

*Tips：Windows 环境变量配置完成后，需要重新打开命令行工具。*

![image-20240805111700804]( https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240805111700804.png)

### 2.2 macOS 环境下配置

#### 2.2.1 找到adb

打开Unity Hub，找到Installs，并找到包含Android 标签的Unity 版本（常用版本）。复制安装路径，例如图片中的：```/Application/Unity/Hub/Editor/2022.3.17f1c1/Editor/```

![2ed841aa01fd86f67ea195feca96edc](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/2ed841aa01fd86f67ea195feca96edc.png)

打开苹果自带的命令行ZSH。并切换到该安装路径。在该路径下，打开```PlaybackEnignes/AndroidPlayer/SDK/platform-tools/```目录。使用```ls```命令，在当前目录下有一个```adb```工具，出现该工具即说明已经找到了adb路径。

![673707fe893fb485af05399993f7fe2](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/673707fe893fb485af05399993f7fe2.png)

#### 2.2.2 设置环境变量

使用```pwd```指令，获取当前的路径，如下图所示，复制该地址。

![fba05a18a65f08d0fc40b224197f318](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/fba05a18a65f08d0fc40b224197f318.png)

检查个人路径下是否有.bash_profile文件：

```
ls ~/.bash_profile
```

如果已经有了，可以不执行以下命令。如果没有，执行以下命令创建```~/.bash_profile```文件：

```
touch ~/.bash_profile
```

如下图：

![ca39d6086689d1d76e4c57d43873143](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/ca39d6086689d1d76e4c57d43873143.jpg)

使用```open ~/.bash_profile```打开```~/.bash_profile```，并写入：

```
export ADB_HOME=/Applications/Unity/Hub/Editor/2022.3.17f1c1/Editor/PlaybackEngines/AndroidPlayer/SDK/platform-tools/
export PATH=$ADB_HOME:$PATH
```

![783a12bcb6982e4d65e4f7845246cee](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/783a12bcb6982e4d65e4f7845246cee.jpg)

保存并退出编辑。

通过```source ~/.bash_profile```将系统变量通知到系统，可以通过查看```PATH```变量查看是否成功配置。

![d314e9ad538e1a4545d76c09bcda80b](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/d314e9ad538e1a4545d76c09bcda80b.jpg)

#### 2.2.3 测试ADB 环境

在控制台上，使用```adb --version``` 指令，如果成功配置将在控制台上显示ADB 的相关信息。

![71ed9078c60ef43e3492e2de787ca7b](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/71ed9078c60ef43e3492e2de787ca7b.jpg)

## 3 ADB 常用命令

### 2.1 设备连接及查询

设备在开启开发者模式后，开发者即可使用ADB 工具进行应用调试。

```
# 查询当前连接的设备列表指令
adb devices

# Wifi-ADB 链接指令，其中xxx.xxx.xxx.xxx指代和PC 同一局域网内的设备的IP 地址。
adb connect xxx.xxx.xxx.xxx

# 进入设备控制台指令
adb shell
```

### 2.2 APK 安装与卸载

```
# 安装apk,其中/xxx/xxx/xxx/xxx.apk 指代的是apk文件在PC上存储的绝对路径。
adb install /xxx/xxx/xxx/xxx.apk

# 卸载apk，其中xxx.xxx.xxx.xxx 指代的是应用的包名。
adb uninstall xxx.xxx.xxx.xxx
```

### 2.3 推送和拉取内容

```
# 将内容（./abc）推送到/sdcard/xxxx/目录下
adb push ./abc /sdcard/xxxx/

# 从内容（/sdcard/xxxx/abc）从设备中拉取到PC当前目录
adb pull /sdcard/xxxx/adb
```

### 2.4 查看Logcat

```
# 在设备的控制台查看
adb shell
logcat

# 在设备的控制台将Logcat 保存到/sdcard/log.txt
adb shell
logcat > /sdcard/log.txt

# 在PC 端直接保存到当前目录下
adb shell logcat > log.txt
```

";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729143637274.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729144211902.png
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.4.9/%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83/image-20240729153127104.png

---

## 接入指南
**Document ID:** 965ccb56e0284976ab0c701346f5833e | **Tags:** NPM,Unity配置

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><p>本章节介绍从npm上获取SDK的方法，以及开发前的Unity配置说明，是开发前最后的准备工作。</p>
<p><strong>请确保已按照《开发环境搭建》章节要求完成了环境搭建。</strong></p>
<h1 id="sdk-导入">SDK 导入</h1>
<p>Rokid Unity OpenXR Plugin使用 <a href="https://docs.unity.cn/cn/current/Manual/Packages.html">Unity Package Manager</a>进行SDK 包管理。</p>
<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/UXR3Input.mp4">
</iframe>
<h2 id="1-配置npm">1 配置NPM</h2>
<h3 id="11-切换发布平台到android">1.1 切换发布平台到Android</h3>
<p>使用UXR3.0 SDK 开发的App 需要运行在Android/YodaOS-Master 系统平台上，因此需要将发布平台切换为 Android。</p>
<p>可以通过以下步骤完成：</p>
<p><strong><em>注意：为确保项目正常，在创建工程时，包括项目存储路径、项目名称等，不可使用中文、特殊字符、空格</em></strong>。</p>
<ul>
<li>1、新建项目</li>
<li>2、项目构建时可以选择使用【3D(Build-in Render Pipeline)】或【Universal 3D】</li>
<li>3、项目构建完成后打开项目【Build Settings】窗口</li>
<li>4、将Platform 选择为<strong>Android</strong>，并点击<strong>Switch Platform</strong> 按钮。</li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/change_platform.png"/></p>
<h3 id="12-配置package-manager">1.2 配置Package Manager</h3>
<p>配置Unity 的 Package Manager 以从Rokid 的私有仓库获取包。</p>
<ul>
<li>
<p>1、打开【Project Settings】窗口，找到<strong>Package Manager</strong>。</p>
</li>
<li>2、填写<strong>Scoped Registries</strong>
<ul>
<li>name：任意英文字段即可</li>
<li>URL：<code>https://npm.rokid.com/</code></li>
<li>Scope(s)：<code>com.rokid</code></li>
</ul>
</li>
<li>
<p>3、配置完成后，点击<strong>Save</strong> 保存设置</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/package_manager.png"/></p>
</li>
</ul>
<h2 id="2-安装sdk">2 安装SDK</h2>
<p>开发者可以通过以下方式安装SDK：</p>
<h3 id="21-使用包名进行安装">2.1 使用包名进行安装</h3>
<p>Rokid Unity OpenXR Plugin 的包名为：<code>com.rokid.xr.unity</code></p>
<ul>
<li>1、打开【Package Manager】窗口（Windows-&gt;Package Manager）</li>
<li>2、点击加号按钮，并选择 <strong>Add package by name</strong></li>
</ul>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/addpackagebyname.png" width="100%"/></p>
<ul>
<li>
<p>3、在弹出的输入框中：</p>
<ul>
<li>
<p>输入包名：<code>com.rokid.xr.unity</code></p>
</li>
<li>
<p>输入版本号：3.0.3（不输入版本号默认会安装最新版本）</p>
</li>
<li>
<p>完成后，点击<strong>Add</strong></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/sdkpackagename.png"/></p>
</li>
</ul>
</li>
</ul>
<p>完成以上步骤后，<strong>UPM</strong> 会进行SDK 安装。</p>
<h2 id="3-配置unity-input-system">3 配置Unity Input System</h2>
<p>由于SDK 中默认配置了[New Input System]，在SDK 首次安装成功后会出现以下对话框：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/237inputrequest.jpg"/></p>
<p>直接点击<strong>Yes</strong> 即可。项目会自动关闭并重启。</p>
<h1 id="配置项目">配置项目</h1>
<h2 id="1-自动配置">1 自动配置</h2>
<p><strong><em>项目首次导入SDK，并自动重启后</em></strong></p>
<p>正常情况下会直接弹出 【Rokid OpenXR | Environment Fix】 窗口。</p>
<p>如果未自动弹出，可以在工具栏找到 【Rokid】 标签，并通过点击Rokid–&gt; Env –&gt; Project Enviroment Fix 手动打开【Rokid OpenXR | Environment Fix】窗口。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrFixmenu.jpg"/></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrFix.jpg"/></p>
<p>点击<strong>Accept All</strong> 完成自动配置。</p>
<h2 id="2-配置xr-plugin">2 配置XR-Plugin</h2>
<p>重新打开 【Project Settings】 窗口，找到 <strong>XR Plug-in Management</strong> 配置项，在<strong>Android</strong>标签下选中：</p>
<ul>
<li>
<p>Initialize XR on Startup</p>
</li>
<li>
<p>OpenXR</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/openxrplugin1.png" width="100%"/></p>
</li>
</ul>
<p><strong>Tips：如果未展示该选项或该选项不可选中，注意查看是否已经完成 OpenXR Plugin 导入。</strong></p>
<h2 id="3-openxr-设置">3 OpenXR 设置</h2>
<p>选中<strong>XR Plugin-In Management</strong> 的<strong>OpenXR</strong> 子项，按照以下步骤进行OpenXR 相关配置：</p>
<h3 id="31-配置enabled-interaction-profiles">3.1 配置Enabled Interaction Profiles</h3>
<p>在Enabled Interaction Profiles 中添加：</p>
<ul>
<li>Rokid Controller Profile</li>
<li>Rokid HandTracking Profile</li>
</ul>
<h3 id="31-配置openxr-feature-groups">3.1 配置OpenXR Feature Groups</h3>
<p>OpenXR Feature Groups中勾选：</p>
<ul>
<li>Hand Tracking Subsystem</li>
<li>Rokid ARFoundation Support</li>
<li>Rokid Hand Tracking Aim</li>
<li>Rokid Openxr Support</li>
</ul>
<p>配置完成后，如下图：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrselectfix.png" width="100%"/></p>
<h2 id="4-project-validation">4 Project Validation</h2>
<p>选中<strong>XR Plugin-In Management</strong> 的<strong>Project Validation</strong> 子项。</p>
<p>如果有需要修复的内容，选择<strong>Fix All</strong>。</p>
<p>***如果发现点击Fix 始终无法完全Fix，则建议耐心等待（很大可能是Unity 正在配置中）***。</p>
<p>最终结果如下图：</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/project_validation.png" width="100%"/></p>
<p>至此，UXR3.0 SDK 配置完成，开发者可以开始功能开发。</p></div><script>var markdown ="本章节介绍从npm上获取SDK的方法，以及开发前的Unity配置说明，是开发前最后的准备工作。

**请确保已按照《开发环境搭建》章节要求完成了环境搭建。**

# SDK 导入

Rokid Unity OpenXR Plugin使用 [Unity Package Manager](https://docs.unity.cn/cn/current/Manual/Packages.html)进行SDK 包管理。

<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/UXR3Input.mp4">
</iframe>

## 1 配置NPM

### 1.1 切换发布平台到Android

使用UXR3.0 SDK 开发的App 需要运行在Android/YodaOS-Master 系统平台上，因此需要将发布平台切换为 Android。

可以通过以下步骤完成：

***注意：为确保项目正常，在创建工程时，包括项目存储路径、项目名称等，不可使用中文、特殊字符、空格***。

- 1、新建项目
- 2、项目构建时可以选择使用【3D(Build-in Render Pipeline)】或【Universal 3D】
- 3、项目构建完成后打开项目【Build Settings】窗口
- 4、将Platform 选择为**Android**，并点击**Switch Platform** 按钮。

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/change_platform.png"/>



### 1.2 配置Package Manager

配置Unity 的 Package Manager 以从Rokid 的私有仓库获取包。

- 1、打开【Project Settings】窗口，找到**Package Manager**。

- 2、填写**Scoped Registries**
  - name：任意英文字段即可
  - URL：```https://npm.rokid.com/```
  - Scope(s)：```com.rokid```


- 3、配置完成后，点击**Save** 保存设置

  <img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/package_manager.png"/>



## 2 安装SDK

开发者可以通过以下方式安装SDK：

### 2.1 使用包名进行安装

Rokid Unity OpenXR Plugin 的包名为：`com.rokid.xr.unity`

- 1、打开【Package Manager】窗口（Windows->Package Manager）
- 2、点击加号按钮，并选择 **Add package by name**

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/addpackagebyname.png" width="100%"/>

- 3、在弹出的输入框中：

  - 输入包名：```com.rokid.xr.unity```

  - 输入版本号：3.0.3（不输入版本号默认会安装最新版本）

  - 完成后，点击**Add**

    <img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/sdkpackagename.png"/>

完成以上步骤后，**UPM** 会进行SDK 安装。

## 3 配置Unity Input System

由于SDK 中默认配置了[New Input System]，在SDK 首次安装成功后会出现以下对话框：

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/237inputrequest.jpg"/>

直接点击**Yes** 即可。项目会自动关闭并重启。

# 配置项目

## 1 自动配置

***项目首次导入SDK，并自动重启后***

正常情况下会直接弹出 【Rokid OpenXR | Environment Fix】 窗口。

如果未自动弹出，可以在工具栏找到 【Rokid】 标签，并通过点击Rokid–> Env –> Project Enviroment Fix 手动打开【Rokid OpenXR | Environment Fix】窗口。

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrFixmenu.jpg"/>

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrFix.jpg"/>

点击**Accept All** 完成自动配置。

## 2 配置XR-Plugin

重新打开 【Project Settings】 窗口，找到 **XR Plug-in Management** 配置项，在**Android**标签下选中：

- Initialize XR on Startup 

- OpenXR

  <img src="https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/openxrplugin1.png" width="100%"/>

**Tips：如果未展示该选项或该选项不可选中，注意查看是否已经完成 OpenXR Plugin 导入。**

## 3 OpenXR 设置


选中**XR Plugin-In Management** 的**OpenXR** 子项，按照以下步骤进行OpenXR 相关配置：

### 3.1 配置Enabled Interaction Profiles

在Enabled Interaction Profiles 中添加：

- Rokid Controller Profile
- Rokid HandTracking Profile

### 3.1 配置OpenXR Feature Groups

OpenXR Feature Groups中勾选：

- Hand Tracking Subsystem
- Rokid ARFoundation Support
- Rokid Hand Tracking Aim
- Rokid Openxr Support

配置完成后，如下图：

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/openxrselectfix.png" width="100%"/>



## 4 Project Validation

选中**XR Plugin-In Management** 的**Project Validation** 子项。

如果有需要修复的内容，选择**Fix All**。

***如果发现点击Fix 始终无法完全Fix，则建议耐心等待（很大可能是Unity 正在配置中）***。

最终结果如下图：

<img src="https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/project_validation.png" width="100%"/>

至此，UXR3.0 SDK 配置完成，开发者可以开始功能开发。 ";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/change_platform.png
- https://ota.rokidcdn.com/toB/Document/OpenXR/1.0.4/images/package_manager.png
- https://ota.rokidcdn.com/toB/Document/OpenXR/3.0.3/addpackagebyname.png

---

## 快速开始
**Document ID:** e89ba80360a94ef09f0647b6e9e87b35 | **Tags:** 快速开始，示例

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css"><div class="stackedit__html" style="font-size: 17px;"><p>本章节默认用户已经完成《开发环境搭建》、《接入指南》中提到的所有内容。</p>
<h1 id="1-快速构建">1 快速构建</h1>
<p>开发者可以通过本章了解如何使用Rokid UXR3.0 SDK 快速构建一个空间应用。</p>
<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/UXR3FirstStart.mp4"></iframe>
<h2 id="11-创建打开samplescene">1.1 创建/打开SampleScene</h2>
<p>在Assets 的Scenes 目录下创建一个SampleScene（新建的Unity 工程默认就有一个SampleScene）。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237new.jpg" alt="New Scene" /></p>
<h2 id="12-替换main-camera">1.2 替换Main Camera</h2>
<p>使用SDK 提供的<strong>RKCameraRig</strong> 预制体替换SampleScene 的<strong>Main Camera</strong>。</p>
<p>首先找到<strong>RKCameraRig</strong> 预制体，在【Project 】窗口的查询<code>rkcamerarig</code>，并选择All/In Packages 选项。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237findcamera.jpg" alt="Find RKCameraRig" /></p>
<p>找到<strong>RKCameraRig</strong> 预制体后，将<strong>RKCameraRig</strong> 预制体拖入SampleScene 中，并将原Main Camera 删除。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237inputcamerarig.jpg" alt="Result" /></p>
<h2 id="13-创建cube">1.3 创建Cube</h2>
<p>这里以创建一个Cube 为例。</p>
<p>在SampleScene 中创建一个<strong>Cube</strong>，并将其Scale 设置为{0.5,0.5,0.5}，并将其Transform的Z 设置为5。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/cubeset.png" alt="Cube Set" /></p>
<h2 id="14-打包应用">1.4 打包应用</h2>
<p>将SampleScene 进行打包既完成了第一个XR 应用的构建。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237newBuild.jpg" alt="Build Settings" /></p>
<p>安装APK到设备 上，运行成功后，就可以看到在初始化位姿正前方5米位置看到一个边长0.5米的白色立方体，可以从不同的角度（AR Studio &amp; AR Lite），也可以走近观察（AR Studio）。</p>
<p><strong>APK 安装过程可直接参考文档中的视频教程</strong></p>
<h1 id="2-打包sdk-sample">2 打包SDK Sample</h1>
<p>开发者可以通过本章了解如何使用Rokid UXR3.0 SDK 中提供的Samples。</p>
<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportSample.mp4"></iframe>
<h2 id="21-导入sample">2.1 导入Sample</h2>
<p>打开【PackageManager】窗口，搜索范围设置在Packages:In Project 找到<strong>Rokid UXR SDK</strong>，在右侧窗口中将标签切换到Samples ，点击<strong>Import</strong> 按钮进行导入。</p>
<p><strong><em>Tips：这里以Unity 2022 版本中的PackageManager 为例</em></strong></p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/importsamples.png" alt="" /></p>
<p>导入成功后，会在项目工程中添加Assets&ndash;&gt; Samples &ndash;&gt; Rokid Unity XR SDK 文件夹，该文件夹即为Sample 工程。</p>
<h2 id="2-打包sample">2 打包Sample</h2>
<p>将Assets&ndash;&gt; Samples &ndash;&gt; Rokid UXR SDK&ndash;&gt; x.x.x &ndash;&gt;UXR Sample &ndash;&gt; Scenes 目录下的所有场景拖到Build Settings 中，<em>注意在Scenes In Build 列表中的序列0的场景必须是uxr-MainScene</em>，点击<strong>Build</strong> 按钮并配置APK 名称即可完成编译。</p>
<p><img src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/allscenes.png" alt="All Scenes" /></p>
<p>打包生成的APK，安装到设备上运行，会出现以下画面</p>
<p><img width="960"  src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/main.jpg"/></p>
<p>其中：</p>
<table width="1280" >
    <thead>
        <tr>
            <th width="460">场景</th>
            <th width="820">演示功能</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Hello Rokid</td>
            <td>眼镜设备硬件信息</td>
        </tr>
        <tr>
            <td>Head Tracking</td>
            <td>空间演示场景</td>
        </tr>
        <tr>
            <td>VoiceRecognize</td>
            <td>语音指令演示场景</td>
        </tr>
        <tr>
            <td>Phone 3Dof Controller</td>
            <td>控制器射线使用演示场景</td>
        </tr>
        <tr>
            <td>CameraPreview</td>
            <td>眼镜Camera 预览画面（<strong>AR Studio场景</strong>）</td>
        </tr>
        <tr>
            <td>RKHandRay</td>
            <td>手势射线简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKHandGrab</td>
            <td>手势抓取简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKMultiInteractor</td>
            <td>多模态交互简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKSensorAPI</td>
            <td>传感器与SLAM 参数演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>PlaneTracking</td>
            <td>平面检测参考演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKTouchRay</td>
            <td>TouchPad 参考演示场景（<strong>AR Lite 场景</strong>）</td>
        </tr>
        <tr>
            <td>ImageTracking</td>
            <td>图像识别 参考演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
    </tbody>
</table>
<p><strong><em>Tips：Sample 使用过程中，注意各脚本的配置，如果发现脚本丢失需要重新搭配。</em></strong></p></div><script>var markdown ="本章节默认用户已经完成《开发环境搭建》、《接入指南》中提到的所有内容。

# 1 快速构建

开发者可以通过本章了解如何使用Rokid UXR3.0 SDK 快速构建一个空间应用。

<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/UXR3FirstStart.mp4"></iframe>

## 1.1 创建/打开SampleScene

在Assets 的Scenes 目录下创建一个SampleScene（新建的Unity 工程默认就有一个SampleScene）。

![New Scene](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237new.jpg)



## 1.2 替换Main Camera

使用SDK 提供的**RKCameraRig** 预制体替换SampleScene 的**Main Camera**。

首先找到**RKCameraRig** 预制体，在【Project 】窗口的查询```rkcamerarig```，并选择All/In Packages 选项。

![Find RKCameraRig](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237findcamera.jpg)



找到**RKCameraRig** 预制体后，将**RKCameraRig** 预制体拖入SampleScene 中，并将原Main Camera 删除。

![Result](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237inputcamerarig.jpg)



## 1.3 创建Cube

这里以创建一个Cube 为例。

在SampleScene 中创建一个**Cube**，并将其Scale 设置为{0.5,0.5,0.5}，并将其Transform的Z 设置为5。

![Cube Set](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/cubeset.png)



## 1.4 打包应用

将SampleScene 进行打包既完成了第一个XR 应用的构建。

![Build Settings](https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237newBuild.jpg)



安装APK到设备 上，运行成功后，就可以看到在初始化位姿正前方5米位置看到一个边长0.5米的白色立方体，可以从不同的角度（AR Studio & AR Lite），也可以走近观察（AR Studio）。

**APK 安装过程可直接参考文档中的视频教程**

# 2 打包SDK Sample

开发者可以通过本章了解如何使用Rokid UXR3.0 SDK 中提供的Samples。

<iframe width="910" height="602" src="https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/ExportSample.mp4"></iframe>

## 2.1 导入Sample

打开【PackageManager】窗口，搜索范围设置在Packages:In Project 找到**Rokid UXR SDK**，在右侧窗口中将标签切换到Samples ，点击**Import** 按钮进行导入。

***Tips：这里以Unity 2022 版本中的PackageManager 为例***

![](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/importsamples.png)



导入成功后，会在项目工程中添加Assets--> Samples --> Rokid Unity XR SDK 文件夹，该文件夹即为Sample 工程。



## 2 打包Sample

将Assets--> Samples --> Rokid UXR SDK--> x.x.x -->UXR Sample --> Scenes 目录下的所有场景拖到Build Settings 中，*注意在Scenes In Build 列表中的序列0的场景必须是uxr-MainScene*，点击**Build** 按钮并配置APK 名称即可完成编译。

![All Scenes](https://ota.rokidcdn.com/toB/Document/UXR3.0/3.0.3/allscenes.png)



打包生成的APK，安装到设备上运行，会出现以下画面

<img width="960"  src="https://ota.rokidcdn.com/toB/Document/UXR2.0/253/main.jpg"/>



其中：

<table width="1280" >
    <thead>
        <tr>
            <th width="460">场景</th>
            <th width="820">演示功能</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Hello Rokid</td>
            <td>眼镜设备硬件信息</td>
        </tr>
        <tr>
            <td>Head Tracking</td>
            <td>空间演示场景</td>
        </tr>
        <tr>
            <td>VoiceRecognize</td>
            <td>语音指令演示场景</td>
        </tr>
        <tr>
            <td>Phone 3Dof Controller</td>
            <td>控制器射线使用演示场景</td>
        </tr>
        <tr>
            <td>CameraPreview</td>
            <td>眼镜Camera 预览画面（<strong>AR Studio场景</strong>）</td>
        </tr>
        <tr>
            <td>RKHandRay</td>
            <td>手势射线简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKHandGrab</td>
            <td>手势抓取简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKMultiInteractor</td>
            <td>多模态交互简单演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKSensorAPI</td>
            <td>传感器与SLAM 参数演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>PlaneTracking</td>
            <td>平面检测参考演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
        <tr>
            <td>RKTouchRay</td>
            <td>TouchPad 参考演示场景（<strong>AR Lite 场景</strong>）</td>
        </tr>
        <tr>
            <td>ImageTracking</td>
            <td>图像识别 参考演示场景（<strong>AR Studio 场景</strong>）</td>
        </tr>
    </tbody>
</table>





***Tips：Sample 使用过程中，注意各脚本的配置，如果发现脚本丢失需要重新搭配。***";</script>

**Images:**
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237new.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237findcamera.jpg
- https://ota.rokidcdn.com/toB/Document/UXR2.0/2.3.7/237inputcamerarig.jpg

---

## 版本历史
**Document ID:** dbbef7442b8243ae99a4708f230fb467 | **Tags:** 

<link rel="stylesheet" href="https://custom.rokid.com/prod/rokid_web/editor/style.css" /><div class="stackedit__html" style="font-size: 17px;"><h1 id="v3.0.3"><span class="prefix"></span><span class="content">V3.0.3</span><span class="suffix"></span></h1>
<p>1、UXR3.0 SDK 首版发布，全面接入OpenXR<br>
2、在UXR2.0 SDK 基础上增加图像识别与追踪功能</p>
</div><script>var markdown = "# V3.0.3
1、UXR3.0 SDK 首版发布，全面接入OpenXR
2、在UXR2.0 SDK 基础上增加图像识别与追踪功能

";</script>

---

