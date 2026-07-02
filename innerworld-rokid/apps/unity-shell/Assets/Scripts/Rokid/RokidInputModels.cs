using System;
using UnityEngine;

namespace InnerWorld.Rokid
{
    public enum RokidConnectionStatus
    {
        Disconnected,
        Connecting,
        Connected,
        OfflineFallback,
        Error
    }

    public enum RokidInputCommand
    {
        None,
        Confirm,
        Back
    }

    [Flags]
    public enum RokidInputButtons
    {
        None = 0,
        GazeSelect = 1,
        Confirm = 2,
        Back = 4
    }

    public enum RokidOverlayKind
    {
        None,
        Reticle,
        AnchorHint,
        VoiceCaption,
        Status
    }

    [Serializable]
    public struct RokidConnectionInfo
    {
        public RokidConnectionInfo(string baseUrl, string deviceProfile, RokidConnectionStatus status, string message)
        {
            BaseUrl = Clean(baseUrl);
            DeviceProfile = Clean(deviceProfile);
            Status = status;
            Message = Clean(message);
        }

        public string BaseUrl { get; private set; }

        public string DeviceProfile { get; private set; }

        public RokidConnectionStatus Status { get; private set; }

        public string Message { get; private set; }

        public bool IsConnected
        {
            get { return Status == RokidConnectionStatus.Connected; }
        }

        public static RokidConnectionInfo Disconnected(string baseUrl)
        {
            return new RokidConnectionInfo(baseUrl, "rokid-ar", RokidConnectionStatus.Disconnected, string.Empty);
        }

        public RokidConnectionInfo WithStatus(RokidConnectionStatus status, string message)
        {
            return new RokidConnectionInfo(BaseUrl, DeviceProfile, status, message);
        }

        public RokidConnectionInfo WithBaseUrl(string baseUrl)
        {
            return new RokidConnectionInfo(baseUrl, DeviceProfile, Status, Message);
        }

        private static string Clean(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public struct RokidPose
    {
        public RokidPose(Vector3 position, Quaternion rotation)
        {
            Position = position;
            Rotation = rotation;
        }

        public Vector3 Position { get; private set; }

        public Quaternion Rotation { get; private set; }

        public Vector3 Forward
        {
            get { return Rotation * Vector3.forward; }
        }

        public static RokidPose Identity
        {
            get { return new RokidPose(Vector3.zero, Quaternion.identity); }
        }

        public Ray ToRay()
        {
            return new Ray(Position, Forward);
        }
    }

    [Serializable]
    public struct RokidAnchorTarget
    {
        public RokidAnchorTarget(string anchorId, string label, Vector3 worldPosition, bool hasWorldPosition)
        {
            AnchorId = Clean(anchorId);
            Label = Clean(label);
            WorldPosition = worldPosition;
            HasWorldPosition = hasWorldPosition;
        }

        public string AnchorId { get; private set; }

        public string Label { get; private set; }

        public Vector3 WorldPosition { get; private set; }

        public bool HasWorldPosition { get; private set; }

        public bool IsValid
        {
            get { return !string.IsNullOrEmpty(AnchorId); }
        }

        public static RokidAnchorTarget None
        {
            get { return new RokidAnchorTarget(string.Empty, string.Empty, Vector3.zero, false); }
        }

        public RokidAnchorTarget WithWorldPosition(Vector3 worldPosition)
        {
            return new RokidAnchorTarget(AnchorId, Label, worldPosition, true);
        }

        private static string Clean(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public struct RokidVoiceText
    {
        public RokidVoiceText(string text, string locale, float confidence, bool isFinal)
        {
            Text = string.IsNullOrEmpty(text) ? string.Empty : text.Trim();
            Locale = string.IsNullOrEmpty(locale) ? string.Empty : locale.Trim();
            Confidence = Mathf.Clamp01(confidence);
            IsFinal = isFinal;
        }

        public string Text { get; private set; }

        public string Locale { get; private set; }

        public float Confidence { get; private set; }

        public bool IsFinal { get; private set; }

        public bool HasText
        {
            get { return !string.IsNullOrEmpty(Text); }
        }

        public static RokidVoiceText Empty
        {
            get { return new RokidVoiceText(string.Empty, string.Empty, 0f, true); }
        }
    }

    [Serializable]
    public struct RokidGazeState
    {
        public RokidGazeState(
            RokidPose pose,
            bool isSelecting,
            string anchorId,
            string anchorLabel,
            Vector3 hitPoint,
            float hitDistanceMeters,
            bool hasAnchorHit)
        {
            Pose = pose;
            IsSelecting = isSelecting;
            AnchorId = string.IsNullOrEmpty(anchorId) ? string.Empty : anchorId.Trim();
            AnchorLabel = string.IsNullOrEmpty(anchorLabel) ? string.Empty : anchorLabel.Trim();
            HitPoint = hitPoint;
            HitDistanceMeters = Mathf.Max(0f, hitDistanceMeters);
            HasAnchorHit = hasAnchorHit && !string.IsNullOrEmpty(AnchorId);
        }

        public RokidPose Pose { get; private set; }

        public bool IsSelecting { get; private set; }

        public string AnchorId { get; private set; }

        public string AnchorLabel { get; private set; }

        public Vector3 HitPoint { get; private set; }

        public float HitDistanceMeters { get; private set; }

        public bool HasAnchorHit { get; private set; }

        public Ray Ray
        {
            get { return Pose.ToRay(); }
        }

        public static RokidGazeState FromPose(RokidPose pose, bool isSelecting)
        {
            return new RokidGazeState(pose, isSelecting, string.Empty, string.Empty, Vector3.zero, 0f, false);
        }

        public RokidGazeState WithAnchorHit(string anchorId, string anchorLabel, Vector3 hitPoint, float hitDistanceMeters)
        {
            return new RokidGazeState(Pose, IsSelecting, anchorId, anchorLabel, hitPoint, hitDistanceMeters, true);
        }

        public RokidGazeState WithSelecting(bool isSelecting)
        {
            return new RokidGazeState(Pose, isSelecting, AnchorId, AnchorLabel, HitPoint, HitDistanceMeters, HasAnchorHit);
        }
    }

    [Serializable]
    public struct RokidOverlayFrame
    {
        public RokidOverlayFrame(
            RokidOverlayKind kind,
            string statusText,
            RokidGazeState gaze,
            RokidAnchorTarget anchorTarget,
            RokidVoiceText voiceText,
            RokidConnectionInfo connection)
        {
            Kind = kind;
            StatusText = string.IsNullOrEmpty(statusText) ? string.Empty : statusText;
            Gaze = gaze;
            AnchorTarget = anchorTarget;
            VoiceText = voiceText;
            Connection = connection;
        }

        public RokidOverlayKind Kind { get; private set; }

        public string StatusText { get; private set; }

        public RokidGazeState Gaze { get; private set; }

        public RokidAnchorTarget AnchorTarget { get; private set; }

        public RokidVoiceText VoiceText { get; private set; }

        public RokidConnectionInfo Connection { get; private set; }
    }

    [Serializable]
    public struct RokidInputFrame
    {
        public RokidInputFrame(
            long sequence,
            float timestampSeconds,
            float deltaTimeSeconds,
            RokidPose headPose,
            RokidGazeState gaze,
            RokidInputButtons buttonsDown,
            RokidInputButtons buttonsHeld,
            RokidInputCommand command,
            RokidVoiceText voiceText,
            RokidAnchorTarget anchorTarget,
            RokidConnectionInfo connection)
        {
            Sequence = sequence;
            TimestampSeconds = timestampSeconds;
            DeltaTimeSeconds = deltaTimeSeconds;
            HeadPose = headPose;
            Gaze = gaze;
            ButtonsDown = buttonsDown;
            ButtonsHeld = buttonsHeld;
            Command = command;
            VoiceText = voiceText;
            AnchorTarget = anchorTarget;
            Connection = connection;
        }

        public long Sequence { get; private set; }

        public float TimestampSeconds { get; private set; }

        public float DeltaTimeSeconds { get; private set; }

        public RokidPose HeadPose { get; private set; }

        public RokidGazeState Gaze { get; private set; }

        public RokidInputButtons ButtonsDown { get; private set; }

        public RokidInputButtons ButtonsHeld { get; private set; }

        public RokidInputCommand Command { get; private set; }

        public RokidVoiceText VoiceText { get; private set; }

        public RokidAnchorTarget AnchorTarget { get; private set; }

        public RokidConnectionInfo Connection { get; private set; }

        public bool HasCommand
        {
            get { return Command != RokidInputCommand.None; }
        }

        public bool HasVoiceText
        {
            get { return VoiceText.HasText; }
        }

        public bool HasGazeSelect
        {
            get { return (ButtonsDown & RokidInputButtons.GazeSelect) == RokidInputButtons.GazeSelect; }
        }
    }
}
