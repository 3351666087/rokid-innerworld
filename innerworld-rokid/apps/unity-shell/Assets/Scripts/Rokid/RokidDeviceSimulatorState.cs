using System;
using UnityEngine;

namespace InnerWorld.Rokid
{
    [Serializable]
    public sealed class RokidDeviceSimulatorState
    {
        public const string DefaultBaseUrl = "http://localhost:5177";
        public const string DefaultDeviceProfile = "rokid-ar";

        private long sequence;
        private RokidInputButtons buttonsDown;
        private RokidInputButtons buttonsHeld;
        private RokidInputCommand command;
        private RokidInputFrame currentFrame;

        public RokidDeviceSimulatorState()
        {
            Connection = RokidConnectionInfo.Disconnected(DefaultBaseUrl);
            HeadPose = RokidPose.Identity;
            Gaze = RokidGazeState.FromPose(HeadPose, false);
            AnchorTarget = RokidAnchorTarget.None;
            VoiceText = RokidVoiceText.Empty;
            currentFrame = BuildFrame(0f, 0f);
        }

        public RokidConnectionInfo Connection { get; private set; }

        public RokidPose HeadPose { get; private set; }

        public RokidGazeState Gaze { get; private set; }

        public RokidAnchorTarget AnchorTarget { get; private set; }

        public RokidVoiceText VoiceText { get; private set; }

        public RokidInputFrame CurrentFrame
        {
            get { return currentFrame; }
        }

        public void BeginFrame()
        {
            buttonsDown = RokidInputButtons.None;
            command = RokidInputCommand.None;
            VoiceText = RokidVoiceText.Empty;
        }

        public void SetBaseUrl(string baseUrl)
        {
            Connection = Connection.WithBaseUrl(NormalizeBaseUrl(baseUrl));
        }

        public void SetConnection(RokidConnectionStatus status, string message)
        {
            Connection = Connection.WithStatus(status, message);
        }

        public void SetPose(RokidPose pose)
        {
            HeadPose = pose;
            Gaze = RokidGazeState.FromPose(pose, Gaze.IsSelecting);
        }

        public void SetPose(Vector3 position, Quaternion rotation)
        {
            SetPose(new RokidPose(position, rotation));
        }

        public void SetGaze(RokidGazeState gaze)
        {
            Gaze = gaze;
            HeadPose = gaze.Pose;
        }

        public void SetGazeAnchorHit(string anchorId, string anchorLabel, Vector3 hitPoint, float hitDistanceMeters)
        {
            Gaze = Gaze.WithAnchorHit(anchorId, anchorLabel, hitPoint, hitDistanceMeters);
            AnchorTarget = new RokidAnchorTarget(anchorId, anchorLabel, hitPoint, true);
        }

        public void ClearAnchorTarget()
        {
            AnchorTarget = RokidAnchorTarget.None;
            Gaze = RokidGazeState.FromPose(HeadPose, Gaze.IsSelecting);
        }

        public void SetAnchorTarget(string anchorId, string label)
        {
            AnchorTarget = new RokidAnchorTarget(anchorId, label, Vector3.zero, false);
        }

        public void SetAnchorTarget(string anchorId, string label, Vector3 worldPosition)
        {
            AnchorTarget = new RokidAnchorTarget(anchorId, label, worldPosition, true);
        }

        public void SetVoiceText(string text, string locale, float confidence, bool isFinal)
        {
            VoiceText = new RokidVoiceText(text, locale, confidence, isFinal);
        }

        public void SetButtonHeld(RokidInputButtons button, bool isHeld)
        {
            if (isHeld)
            {
                buttonsHeld |= button;
            }
            else
            {
                buttonsHeld &= ~button;
            }

            if ((button & RokidInputButtons.GazeSelect) == RokidInputButtons.GazeSelect)
            {
                Gaze = Gaze.WithSelecting(isHeld);
            }
        }

        public void Press(RokidInputButtons button)
        {
            buttonsDown |= button;
            SetButtonHeld(button, true);

            if ((button & RokidInputButtons.Confirm) == RokidInputButtons.Confirm)
            {
                command = RokidInputCommand.Confirm;
            }
            else if ((button & RokidInputButtons.Back) == RokidInputButtons.Back)
            {
                command = RokidInputCommand.Back;
            }
        }

        public RokidInputFrame Snapshot(float timestampSeconds, float deltaTimeSeconds)
        {
            sequence++;
            currentFrame = BuildFrame(timestampSeconds, deltaTimeSeconds);
            return currentFrame;
        }

        private RokidInputFrame BuildFrame(float timestampSeconds, float deltaTimeSeconds)
        {
            return new RokidInputFrame(
                sequence,
                timestampSeconds,
                Mathf.Max(0f, deltaTimeSeconds),
                HeadPose,
                Gaze,
                buttonsDown,
                buttonsHeld,
                command,
                VoiceText,
                AnchorTarget,
                Connection);
        }

        private static string NormalizeBaseUrl(string baseUrl)
        {
            string value = string.IsNullOrEmpty(baseUrl) ? DefaultBaseUrl : baseUrl.Trim();
            return value.TrimEnd('/');
        }
    }
}
