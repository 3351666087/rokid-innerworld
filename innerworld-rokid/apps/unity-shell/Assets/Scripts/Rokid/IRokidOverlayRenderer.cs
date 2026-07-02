namespace InnerWorld.Rokid
{
    public interface IRokidOverlayRenderer
    {
        string RendererName { get; }

        bool IsVisible { get; }

        RokidOverlayFrame LastFrame { get; }

        void SetVisible(bool isVisible);

        void Render(RokidOverlayFrame frame);

        void Clear();
    }
}
