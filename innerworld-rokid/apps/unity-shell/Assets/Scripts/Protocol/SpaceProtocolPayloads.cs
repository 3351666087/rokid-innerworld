using System;

namespace InnerWorld.Rokid.Protocol
{
    [Serializable]
    public sealed class InteractionRequest
    {
        public string source;
        public string user_id;
        public string step_id;
        public string mission_state;
    }

    [Serializable]
    public sealed class InteractionResponse
    {
        public bool ok;
        public RuntimeStateResponse state;
    }

    [Serializable]
    public sealed class AiHudRequest
    {
        public string anchor_id;
        public string user_action;
        public string mission_state;
        public string write_back_text;
    }

    [Serializable]
    public sealed class AiHudResponse
    {
        public string mission_state;
        public string display_text;
        public string hint_level;
        public ServiceActionReference service_action;
        public WriteBackReview write_back_review;
    }

    [Serializable]
    public sealed class ServiceActionReference
    {
        public string action_id;
        public string label;
    }

    [Serializable]
    public sealed class WriteBackReview
    {
        public string status;
        public string tag;
        public string summary;
        public string visibility;
    }

    [Serializable]
    public sealed class ServiceActionRequest
    {
        public string source;
        public string user_id;
        public string action_id;
        public string label;
    }

    [Serializable]
    public sealed class ServiceActionResponse
    {
        public bool ok;
        public ServiceActionRequest action;
        public RuntimeStateResponse state;
    }

    [Serializable]
    public sealed class WriteBackRequest
    {
        public string user_id;
        public string anchor_id;
        public string title;
        public string text;
    }

    [Serializable]
    public sealed class WriteBackResponse
    {
        public bool ok;
        public SpaceBeacon beacon;
        public RuntimeStateResponse state;
    }
}
