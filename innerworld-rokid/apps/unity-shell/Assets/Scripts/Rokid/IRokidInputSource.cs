namespace InnerWorld.Rokid
{
    public interface IRokidInputSource : IRokidPoseProvider
    {
        string SourceName { get; }

        bool IsAvailable { get; }

        RokidConnectionInfo Connection { get; }

        RokidAnchorTarget AnchorTarget { get; }

        RokidInputFrame CurrentFrame { get; }

        void Tick(float deltaTimeSeconds);

        bool TryReadFrame(out RokidInputFrame frame);
    }
}
