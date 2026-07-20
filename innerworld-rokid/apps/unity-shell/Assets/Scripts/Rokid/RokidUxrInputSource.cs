#if ROKID_UXR
using Rokid.UXR.Module;
using UnityEngine;

namespace InnerWorld.Rokid
{
    public sealed class RokidUxrInputSource : IRokidInputSource, IRokidInputStateSink
    {
        public const string AdapterName = "rokid-uxr-rkinput-3dof";

        private readonly RokidDeviceSimulatorState state;
        private bool nativeInputTouched;
        private float elapsedSeconds;

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
            this.state = state ?? new RokidDeviceSimulatorState();
            this.state.SetConnection(
                RokidConnectionStatus.Connecting,
                bindingReport != null ? bindingReport.Message : "ROKID_UXR boundary compiled; RKCameraRig/RKInput binding initializing.");
        }

        public string SourceName
        {
            get { return AdapterName; }
        }

        public bool IsAvailable
        {
            get { return true; }
        }

        public bool IsPoseValid
        {
            get { return Camera.main != null; }
        }

        public RokidConnectionInfo Connection
        {
            get { return state.Connection; }
        }

        public RokidAnchorTarget AnchorTarget
        {
            get { return state.AnchorTarget; }
        }

        public RokidPose HeadPose
        {
            get { return state.HeadPose; }
        }

        public RokidGazeState Gaze
        {
            get { return state.Gaze; }
        }

        public RokidInputFrame CurrentFrame
        {
            get { return state.CurrentFrame; }
        }

        public bool IsSdkBindingReady
        {
            get { return RokidUxrBoundary.IsCompiled && Camera.main != null; }
        }

        public void SetBaseUrl(string baseUrl)
        {
            state.SetBaseUrl(baseUrl);
        }

        public void SetConnection(RokidConnectionStatus status, string message)
        {
            state.SetConnection(status, message);
        }

        public void SetGazeAnchorHit(string anchorId, string anchorLabel, UnityEngine.Vector3 hitPoint, float hitDistanceMeters)
        {
            state.SetGazeAnchorHit(anchorId, anchorLabel, hitPoint, hitDistanceMeters);
        }

        public void ClearAnchorTarget()
        {
            state.ClearAnchorTarget();
        }

        public void Tick(float deltaTimeSeconds)
        {
            float safeDeltaTime = Mathf.Max(0f, deltaTimeSeconds);
            elapsedSeconds += safeDeltaTime;
            state.BeginFrame();
            TouchNativeInput();
            UpdatePoseFromRokidCamera();
            UpdateRokidButtons();
            state.Snapshot(elapsedSeconds, safeDeltaTime);
        }

        public bool TryReadFrame(out RokidInputFrame frame)
        {
            frame = state.CurrentFrame;
            return true;
        }

        public bool TryGetHeadPose(out RokidPose pose)
        {
            pose = state.HeadPose;
            return IsPoseValid;
        }

        public bool TryGetGaze(out RokidGazeState gaze)
        {
            gaze = state.Gaze;
            return IsPoseValid;
        }

        private static RKNativeInput NativeInput
        {
            get { return RKNativeInput.Instance; }
        }

        private void TouchNativeInput()
        {
            if (nativeInputTouched)
            {
                return;
            }

            nativeInputTouched = true;
            RKNativeInput input = NativeInput;
            if (input != null)
            {
                input.Initialized();
            }
        }

        private void UpdatePoseFromRokidCamera()
        {
            Camera camera = Camera.main;
            if (camera == null)
            {
                return;
            }

            RokidPose pose = new RokidPose(camera.transform.position, camera.transform.rotation);
            bool selecting = IsGazeSelectHeld();
            state.SetGaze(RokidGazeState.FromPose(pose, selecting));
        }

        private void UpdateRokidButtons()
        {
            bool selectHeld = IsGazeSelectHeld();
            bool confirmHeld = IsConfirmHeld();
            bool backHeld = IsBackHeld();

            state.SetButtonHeld(RokidInputButtons.GazeSelect, selectHeld);
            state.SetButtonHeld(RokidInputButtons.Confirm, confirmHeld);
            state.SetButtonHeld(RokidInputButtons.Back, backHeld);

            if (IsGazeSelectDown())
            {
                state.Press(RokidInputButtons.GazeSelect);
            }
            if (IsConfirmDown())
            {
                state.Press(RokidInputButtons.Confirm);
            }
            if (IsBackDown())
            {
                state.Press(RokidInputButtons.Back);
            }
        }

        private static bool IsGazeSelectDown()
        {
            RKNativeInput input = NativeInput;
            return Input.GetMouseButtonDown(0)
                || (input != null && (input.GetKeyDown(RKKeyEvent.KEY_MOUSE_FIRST)
                    || input.GetStation2EventTrigger(RKStation2KeyEvent.KEY_LIGHT_SINGLE_TAP)));
        }

        private static bool IsGazeSelectHeld()
        {
            RKNativeInput input = NativeInput;
            return Input.GetMouseButton(0)
                || (input != null && input.GetKey(RKKeyEvent.KEY_MOUSE_FIRST));
        }

        private static bool IsConfirmDown()
        {
            RKNativeInput input = NativeInput;
            return Input.GetKeyDown(KeyCode.Return)
                || Input.GetKeyDown(KeyCode.Space)
                || Input.GetKeyDown(KeyCode.JoystickButton0)
                || (input != null && (input.GetKeyDown(RKKeyEvent.KEY_OK)
                    || input.GetStation2EventTrigger(RKStation2KeyEvent.KEY_LIGHT_DOUBLE_TAP)));
        }

        private static bool IsConfirmHeld()
        {
            RKNativeInput input = NativeInput;
            return Input.GetKey(KeyCode.Return)
                || Input.GetKey(KeyCode.Space)
                || Input.GetKey(KeyCode.JoystickButton0)
                || (input != null && input.GetKey(RKKeyEvent.KEY_OK));
        }

        private static bool IsBackDown()
        {
            RKNativeInput input = NativeInput;
            return Input.GetKeyDown(KeyCode.Escape)
                || Input.GetKeyDown(KeyCode.Backspace)
                || Input.GetKeyDown(KeyCode.JoystickButton1)
                || (input != null && (input.GetKeyDown(RKKeyEvent.KEY_BACK)
                    || input.GetStation2EventTrigger(RKStation2KeyEvent.KEY_LIGHT_LONG_TAP)));
        }

        private static bool IsBackHeld()
        {
            RKNativeInput input = NativeInput;
            return Input.GetKey(KeyCode.Escape)
                || Input.GetKey(KeyCode.Backspace)
                || Input.GetKey(KeyCode.JoystickButton1)
                || (input != null && input.GetKey(RKKeyEvent.KEY_BACK));
        }
    }
}
#endif
