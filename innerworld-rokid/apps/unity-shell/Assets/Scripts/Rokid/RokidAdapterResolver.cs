using InnerWorld.Rokid.Runtime;

namespace InnerWorld.Rokid
{
    public static class RokidAdapterResolver
    {
        public static RokidAdapterResolution Resolve(RokidPresentationStrategy strategy)
        {
            return Resolve(strategy, null);
        }

        public static RokidAdapterResolution Resolve(
            RokidPresentationStrategy strategy,
            RokidDeviceSimulatorState fallbackState)
        {
            RokidInputAdapterKind inputAdapter = InputAdapterFrom(strategy);
            RokidDisplayAdapterKind displayAdapter = DisplayAdapterFrom(strategy);
            RokidSdkBindingReport sdkBinding = RokidSdkBindingProbe.Detect();

            RokidAdapterBoundaryKind inputBoundary;
            string inputName;
            string inputMessage;
            IRokidInputSource inputSource = CreateInputSourceInternal(
                inputAdapter,
                fallbackState,
                sdkBinding,
                out inputBoundary,
                out inputName,
                out inputMessage);

            RokidAdapterBoundaryKind displayBoundary;
            string displayName;
            string displayMessage;
            IRokidOverlayRenderer overlayRenderer = CreateOverlayRendererInternal(
                displayAdapter,
                out displayBoundary,
                out displayName,
                out displayMessage);

            string message = MergeMessages(inputMessage, displayMessage, strategy != null ? strategy.fallback_reason : string.Empty);
            RokidAdapterBoundaryStatus status = new RokidAdapterBoundaryStatus(
                inputAdapter,
                displayAdapter,
                inputBoundary,
                displayBoundary,
                inputName,
                displayName,
                sdkBinding,
                message);

            return new RokidAdapterResolution(inputSource, overlayRenderer, status);
        }

        public static IRokidInputSource CreateInputSource(RokidPresentationStrategy strategy)
        {
            return CreateInputSource(InputAdapterFrom(strategy));
        }

        public static IRokidInputSource CreateInputSource(RokidInputAdapterKind adapterKind)
        {
            RokidAdapterBoundaryStatus status;
            return CreateInputSource(adapterKind, null, out status);
        }

        public static IRokidInputSource CreateInputSource(
            RokidInputAdapterKind adapterKind,
            RokidDeviceSimulatorState fallbackState,
            out RokidAdapterBoundaryStatus status)
        {
            RokidAdapterBoundaryKind inputBoundary;
            string inputName;
            string message;
            IRokidInputSource inputSource = CreateInputSourceInternal(
                adapterKind,
                fallbackState,
                RokidSdkBindingProbe.Detect(),
                out inputBoundary,
                out inputName,
                out message);

            status = new RokidAdapterBoundaryStatus(
                adapterKind,
                RokidDisplayAdapterKind.None,
                inputBoundary,
                RokidAdapterBoundaryKind.None,
                inputName,
                string.Empty,
                RokidSdkBindingProbe.Detect(),
                message);
            return inputSource;
        }

        public static IRokidOverlayRenderer CreateOverlayRenderer(RokidPresentationStrategy strategy)
        {
            return CreateOverlayRenderer(DisplayAdapterFrom(strategy));
        }

        public static IRokidOverlayRenderer CreateOverlayRenderer(RokidDisplayAdapterKind adapterKind)
        {
            RokidAdapterBoundaryKind displayBoundary;
            string displayName;
            string message;
            return CreateOverlayRendererInternal(adapterKind, out displayBoundary, out displayName, out message);
        }

        private static IRokidInputSource CreateInputSourceInternal(
            RokidInputAdapterKind adapterKind,
            RokidDeviceSimulatorState fallbackState,
            RokidSdkBindingReport sdkBinding,
            out RokidAdapterBoundaryKind boundary,
            out string adapterName,
            out string message)
        {
            if (adapterKind == RokidInputAdapterKind.RokidSdk)
            {
#if ROKID_UXR
                boundary = RokidAdapterBoundaryKind.RokidUxrSdkStub;
                adapterName = RokidUxrInputSource.AdapterName;
                message = sdkBinding != null ? sdkBinding.Message : "ROKID_UXR compiled; using SDK input boundary stub.";
                return new RokidUxrInputSource(fallbackState, sdkBinding);
#else
                boundary = RokidAdapterBoundaryKind.EditorFallback;
                adapterName = EditorRokidInputSource.AdapterName;
                message = "ROKID_UXR define is absent; using editor input fallback.";
                return new EditorRokidInputSource(fallbackState);
#endif
            }

            if (adapterKind == RokidInputAdapterKind.None)
            {
                boundary = RokidAdapterBoundaryKind.None;
                adapterName = string.Empty;
                message = "Rokid input adapter disabled.";
                return null;
            }

            boundary = RokidAdapterBoundaryKind.EditorFallback;
            adapterName = EditorRokidInputSource.AdapterName;
            message = "Using editor input fallback.";
            return new EditorRokidInputSource(fallbackState);
        }

        private static IRokidOverlayRenderer CreateOverlayRendererInternal(
            RokidDisplayAdapterKind adapterKind,
            out RokidAdapterBoundaryKind boundary,
            out string adapterName,
            out string message)
        {
            if (adapterKind == RokidDisplayAdapterKind.RokidSdkOverlay)
            {
#if ROKID_UXR
                boundary = RokidAdapterBoundaryKind.RokidUxrSdkStub;
                adapterName = RokidUxrOverlayRenderer.AdapterName;
                message = "ROKID_UXR compiled; using SDK overlay boundary stub.";
                return new RokidUxrOverlayRenderer();
#else
                boundary = RokidAdapterBoundaryKind.EditorFallback;
                adapterName = FallbackRokidOverlayRenderer.AdapterName;
                message = "ROKID_UXR define is absent; using overlay fallback.";
                return new FallbackRokidOverlayRenderer(adapterKind);
#endif
            }

            if (adapterKind == RokidDisplayAdapterKind.None)
            {
                boundary = RokidAdapterBoundaryKind.None;
                adapterName = string.Empty;
                message = "Rokid overlay adapter disabled.";
                return null;
            }

            boundary = RokidAdapterBoundaryKind.EditorFallback;
            adapterName = FallbackRokidOverlayRenderer.AdapterName;
            message = "Using overlay fallback.";
            return new FallbackRokidOverlayRenderer(adapterKind);
        }

        private static RokidInputAdapterKind InputAdapterFrom(RokidPresentationStrategy strategy)
        {
            return strategy != null ? strategy.input_adapter : RokidInputAdapterKind.EditorSimulator;
        }

        private static RokidDisplayAdapterKind DisplayAdapterFrom(RokidPresentationStrategy strategy)
        {
            return strategy != null ? strategy.display_adapter : RokidDisplayAdapterKind.DesktopHud;
        }

        private static string MergeMessages(params string[] messages)
        {
            string merged = string.Empty;
            for (int index = 0; index < messages.Length; index++)
            {
                string message = Clean(messages[index]);
                if (string.IsNullOrEmpty(message))
                {
                    continue;
                }

                if (string.IsNullOrEmpty(merged))
                {
                    merged = message;
                }
                else if (!merged.Contains(message))
                {
                    merged += " " + message;
                }
            }

            return merged;
        }

        private static string Clean(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.Trim();
        }
    }
}
