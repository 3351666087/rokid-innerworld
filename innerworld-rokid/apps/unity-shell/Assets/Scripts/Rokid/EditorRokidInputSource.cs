using System.Collections.Generic;
using UnityEngine;

namespace InnerWorld.Rokid
{
    public sealed class EditorRokidInputSource : IRokidInputSource
    {
        private readonly Queue<RokidVoiceText> voiceQueue = new Queue<RokidVoiceText>();
        private readonly RokidDeviceSimulatorState state;
        private float elapsedSeconds;

        public EditorRokidInputSource()
            : this(new RokidDeviceSimulatorState())
        {
        }

        public EditorRokidInputSource(RokidDeviceSimulatorState state)
        {
            this.state = state ?? new RokidDeviceSimulatorState();
        }

        public string SourceName
        {
            get { return "editor-rokid-simulator"; }
        }

        public bool IsAvailable
        {
            get { return true; }
        }

        public bool IsPoseValid
        {
            get { return true; }
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

        public RokidDeviceSimulatorState State
        {
            get { return state; }
        }

        public void SetBaseUrl(string baseUrl)
        {
            state.SetBaseUrl(baseUrl);
        }

        public void SetConnection(RokidConnectionStatus status, string message)
        {
            state.SetConnection(status, message);
        }

        public void SetAnchorTarget(string anchorId, string label)
        {
            state.SetAnchorTarget(anchorId, label);
        }

        public void SetAnchorTarget(string anchorId, string label, Vector3 worldPosition)
        {
            state.SetAnchorTarget(anchorId, label, worldPosition);
        }

        public void EnqueueVoiceText(string text)
        {
            EnqueueVoiceText(text, "zh-CN", 1f, true);
        }

        public void EnqueueVoiceText(string text, string locale, float confidence, bool isFinal)
        {
            voiceQueue.Enqueue(new RokidVoiceText(text, locale, confidence, isFinal));
        }

        public void Tick(float deltaTimeSeconds)
        {
            float safeDeltaTime = Mathf.Max(0f, deltaTimeSeconds);
            elapsedSeconds += safeDeltaTime;
            state.BeginFrame();
            UpdatePoseFromUnityCamera();
            UpdateKeyboardButtons();

            if (voiceQueue.Count > 0)
            {
                RokidVoiceText voiceText = voiceQueue.Dequeue();
                state.SetVoiceText(voiceText.Text, voiceText.Locale, voiceText.Confidence, voiceText.IsFinal);
            }

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
            return true;
        }

        public bool TryGetGaze(out RokidGazeState gaze)
        {
            gaze = state.Gaze;
            return true;
        }

        private void UpdatePoseFromUnityCamera()
        {
            Camera camera = Camera.main;
            if (camera == null)
            {
                return;
            }

            Transform cameraTransform = camera.transform;
            RokidPose pose = new RokidPose(cameraTransform.position, cameraTransform.rotation);
            state.SetGaze(RokidGazeState.FromPose(pose, Input.GetMouseButton(0)));
        }

        private void UpdateKeyboardButtons()
        {
            bool gazeHeld = Input.GetMouseButton(0);
            state.SetButtonHeld(RokidInputButtons.GazeSelect, gazeHeld);

            if (Input.GetMouseButtonDown(0))
            {
                state.Press(RokidInputButtons.GazeSelect);
            }

            bool confirmHeld = Input.GetKey(KeyCode.Return) || Input.GetKey(KeyCode.Space);
            state.SetButtonHeld(RokidInputButtons.Confirm, confirmHeld);

            if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.Space))
            {
                state.Press(RokidInputButtons.Confirm);
            }

            bool backHeld = Input.GetKey(KeyCode.Escape) || Input.GetKey(KeyCode.Backspace);
            state.SetButtonHeld(RokidInputButtons.Back, backHeld);

            if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.Backspace))
            {
                state.Press(RokidInputButtons.Back);
            }
        }
    }
}
