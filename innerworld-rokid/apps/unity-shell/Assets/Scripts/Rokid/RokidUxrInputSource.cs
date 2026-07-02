#if ROKID_UXR
namespace InnerWorld.Rokid
{
    public sealed class RokidUxrInputSource : IRokidInputSource, IRokidInputStateSink
    {
        public const string AdapterName = "rokid-uxr-input-stub";

        private readonly EditorRokidInputSource fallbackInput;

        public RokidUxrInputSource()
            : this(null)
        {
        }

        public RokidUxrInputSource(RokidDeviceSimulatorState state)
            : this(state, null)
        {
        }

        public RokidUxrInputSource(RokidDeviceSimulatorState state, RokidSdkBindingReport bindingReport)
        {
            fallbackInput = new EditorRokidInputSource(state);
            fallbackInput.SetConnection(
                RokidConnectionStatus.Connecting,
                bindingReport != null ? bindingReport.Message : "ROKID_UXR boundary compiled; SDK input binding pending.");
        }

        public string SourceName
        {
            get { return AdapterName; }
        }

        public bool IsAvailable
        {
            get { return fallbackInput.IsAvailable; }
        }

        public bool IsPoseValid
        {
            get { return fallbackInput.IsPoseValid; }
        }

        public RokidConnectionInfo Connection
        {
            get { return fallbackInput.Connection; }
        }

        public RokidAnchorTarget AnchorTarget
        {
            get { return fallbackInput.AnchorTarget; }
        }

        public RokidPose HeadPose
        {
            get { return fallbackInput.HeadPose; }
        }

        public RokidGazeState Gaze
        {
            get { return fallbackInput.Gaze; }
        }

        public RokidInputFrame CurrentFrame
        {
            get { return fallbackInput.CurrentFrame; }
        }

        public void SetBaseUrl(string baseUrl)
        {
            fallbackInput.SetBaseUrl(baseUrl);
        }

        public void SetConnection(RokidConnectionStatus status, string message)
        {
            fallbackInput.SetConnection(status, message);
        }

        public void SetGazeAnchorHit(string anchorId, string anchorLabel, UnityEngine.Vector3 hitPoint, float hitDistanceMeters)
        {
            fallbackInput.SetGazeAnchorHit(anchorId, anchorLabel, hitPoint, hitDistanceMeters);
        }

        public void ClearAnchorTarget()
        {
            fallbackInput.ClearAnchorTarget();
        }

        public void Tick(float deltaTimeSeconds)
        {
            fallbackInput.Tick(deltaTimeSeconds);
        }

        public bool TryReadFrame(out RokidInputFrame frame)
        {
            return fallbackInput.TryReadFrame(out frame);
        }

        public bool TryGetHeadPose(out RokidPose pose)
        {
            return fallbackInput.TryGetHeadPose(out pose);
        }

        public bool TryGetGaze(out RokidGazeState gaze)
        {
            return fallbackInput.TryGetGaze(out gaze);
        }
    }
}
#endif
