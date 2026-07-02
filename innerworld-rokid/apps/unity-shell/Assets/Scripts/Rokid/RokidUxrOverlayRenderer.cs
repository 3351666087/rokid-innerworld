#if ROKID_UXR
namespace InnerWorld.Rokid
{
    public sealed class RokidUxrOverlayRenderer : IRokidOverlayRenderer
    {
        public const string AdapterName = "rokid-uxr-overlay-stub";

        private readonly FallbackRokidOverlayRenderer fallbackRenderer;

        public RokidUxrOverlayRenderer()
        {
            fallbackRenderer = new FallbackRokidOverlayRenderer();
        }

        public string RendererName
        {
            get { return AdapterName; }
        }

        public bool IsVisible
        {
            get { return fallbackRenderer.IsVisible; }
        }

        public RokidOverlayFrame LastFrame
        {
            get { return fallbackRenderer.LastFrame; }
        }

        public void SetVisible(bool isVisible)
        {
            fallbackRenderer.SetVisible(isVisible);
        }

        public void Render(RokidOverlayFrame frame)
        {
            fallbackRenderer.Render(frame);
        }

        public void Clear()
        {
            fallbackRenderer.Clear();
        }
    }
}
#endif
