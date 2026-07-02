namespace InnerWorld.Rokid
{
    public interface IRokidPoseProvider
    {
        bool IsPoseValid { get; }

        RokidPose HeadPose { get; }

        RokidGazeState Gaze { get; }

        bool TryGetHeadPose(out RokidPose pose);

        bool TryGetGaze(out RokidGazeState gaze);
    }

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
