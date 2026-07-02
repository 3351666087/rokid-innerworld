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
}
