using InnerWorld.Rokid.Runtime;

namespace InnerWorld.Rokid
{
    public sealed class FallbackRokidOverlayRenderer : IRokidOverlayRenderer
    {
        public const string AdapterName = "fallback-rokid-overlay";

        private readonly string rendererName;
        private bool isVisible;
        private RokidOverlayFrame lastFrame;

        public FallbackRokidOverlayRenderer()
            : this(RokidDisplayAdapterKind.DesktopHud)
        {
        }

        public FallbackRokidOverlayRenderer(RokidDisplayAdapterKind adapterKind)
        {
            rendererName = AdapterName + "-" + adapterKind.ToString();
        }

        public string RendererName
        {
            get { return rendererName; }
        }

        public bool IsVisible
        {
            get { return isVisible; }
        }

        public RokidOverlayFrame LastFrame
        {
            get { return lastFrame; }
        }

        public void SetVisible(bool isVisible)
        {
            this.isVisible = isVisible;
        }

        public void Render(RokidOverlayFrame frame)
        {
            lastFrame = frame;
            isVisible = true;
        }

        public void Clear()
        {
            lastFrame = default(RokidOverlayFrame);
            isVisible = false;
        }
    }
}
