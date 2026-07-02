using System;
using InnerWorld.Rokid.Runtime;

namespace InnerWorld.Rokid
{
    public enum RokidAdapterBoundaryKind
    {
        None,
        EditorFallback,
        RokidUxrSdkStub
    }

    public static class RokidUxrBoundary
    {
        public const string DefineSymbol = "ROKID_UXR";

        public static bool IsCompiled
        {
            get
            {
#if ROKID_UXR
                return true;
#else
                return false;
#endif
            }
        }
    }

    [Serializable]
    public struct RokidAdapterBoundaryStatus
    {
        public const string RokidUxrDefineSymbol = RokidUxrBoundary.DefineSymbol;

        public RokidAdapterBoundaryStatus(
            RokidInputAdapterKind requestedInputAdapter,
            RokidDisplayAdapterKind requestedDisplayAdapter,
            RokidAdapterBoundaryKind inputBoundary,
            RokidAdapterBoundaryKind displayBoundary,
            string inputAdapterName,
            string displayAdapterName,
            RokidSdkBindingReport sdkBinding,
            string message)
        {
            RokidSdkBindingReport binding = sdkBinding ?? RokidSdkBindingProbe.Detect();
            DefineSymbol = RokidUxrBoundary.DefineSymbol;
            IsRokidUxrCompiled = RokidUxrBoundary.IsCompiled;
            RequestedInputAdapter = requestedInputAdapter;
            RequestedDisplayAdapter = requestedDisplayAdapter;
            InputBoundary = inputBoundary;
            DisplayBoundary = displayBoundary;
            InputAdapterName = Clean(inputAdapterName);
            DisplayAdapterName = Clean(displayAdapterName);
            SdkBinding = binding;
            SdkBindingStage = binding.Stage;
            IsSdkPackageDetected = binding.PackageDetected;
            IsSdkLiveBindingReady = binding.LiveBindingReady;
            Message = Clean(message);
        }

        public string DefineSymbol { get; private set; }

        public bool IsRokidUxrCompiled { get; private set; }

        public RokidInputAdapterKind RequestedInputAdapter { get; private set; }

        public RokidDisplayAdapterKind RequestedDisplayAdapter { get; private set; }

        public RokidAdapterBoundaryKind InputBoundary { get; private set; }

        public RokidAdapterBoundaryKind DisplayBoundary { get; private set; }

        public string InputAdapterName { get; private set; }

        public string DisplayAdapterName { get; private set; }

        public RokidSdkBindingReport SdkBinding { get; private set; }

        public RokidSdkBindingStage SdkBindingStage { get; private set; }

        public bool IsSdkPackageDetected { get; private set; }

        public bool IsSdkLiveBindingReady { get; private set; }

        public string Message { get; private set; }

        public bool UsesRokidUxr
        {
            get
            {
                return InputBoundary == RokidAdapterBoundaryKind.RokidUxrSdkStub
                    || DisplayBoundary == RokidAdapterBoundaryKind.RokidUxrSdkStub;
            }
        }

        public bool UsesFallback
        {
            get
            {
                return InputBoundary == RokidAdapterBoundaryKind.EditorFallback
                    || DisplayBoundary == RokidAdapterBoundaryKind.EditorFallback;
            }
        }

        private static string Clean(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.Trim();
        }
    }

    public sealed class RokidAdapterResolution
    {
        public RokidAdapterResolution(
            IRokidInputSource inputSource,
            IRokidOverlayRenderer overlayRenderer,
            RokidAdapterBoundaryStatus status)
        {
            InputSource = inputSource;
            OverlayRenderer = overlayRenderer;
            Status = status;
        }

        public IRokidInputSource InputSource { get; private set; }

        public IRokidOverlayRenderer OverlayRenderer { get; private set; }

        public RokidAdapterBoundaryStatus Status { get; private set; }

        public EditorRokidInputSource EditorInputSource
        {
            get { return InputSource as EditorRokidInputSource; }
        }
    }
}
