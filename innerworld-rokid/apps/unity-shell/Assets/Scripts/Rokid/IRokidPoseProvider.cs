using UnityEngine;

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

    public interface IRokidInputStateSink
    {
        void SetBaseUrl(string baseUrl);

        void SetConnection(RokidConnectionStatus status, string message);

        void SetGazeAnchorHit(string anchorId, string anchorLabel, Vector3 hitPoint, float hitDistanceMeters);

        void ClearAnchorTarget();
    }
}
