using System;
using System.Collections.Generic;
using System.Reflection;

namespace InnerWorld.Rokid
{
    public enum RokidSdkBindingStage
    {
        FallbackOnly,
        BoundaryCompiled,
        PackageDetected,
        LiveBindingReady
    }

    [Serializable]
    public sealed class RokidSdkBindingReport
    {
        public const string Schema = "innerworld-rokid-sdk-binding/v1";

        public RokidSdkBindingReport(
            string defineSymbol,
            bool boundaryCompiled,
            bool packageDetected,
            bool inputBindingReady,
            bool overlayBindingReady,
            RokidSdkBindingStage stage,
            string[] candidateAssemblies,
            string[] candidateTypes,
            string message)
        {
            DefineSymbol = Clean(defineSymbol);
            BoundaryCompiled = boundaryCompiled;
            PackageDetected = packageDetected;
            InputBindingReady = inputBindingReady;
            OverlayBindingReady = overlayBindingReady;
            LiveBindingReady = inputBindingReady && overlayBindingReady;
            Stage = LiveBindingReady ? RokidSdkBindingStage.LiveBindingReady : stage;
            CandidateAssemblies = candidateAssemblies ?? new string[0];
            CandidateTypes = candidateTypes ?? new string[0];
            Message = Clean(message);
        }

        public string SchemaId
        {
            get { return Schema; }
        }

        public string DefineSymbol { get; private set; }

        public bool BoundaryCompiled { get; private set; }

        public bool PackageDetected { get; private set; }

        public bool InputBindingReady { get; private set; }

        public bool OverlayBindingReady { get; private set; }

        public bool LiveBindingReady { get; private set; }

        public RokidSdkBindingStage Stage { get; private set; }

        public string[] CandidateAssemblies { get; private set; }

        public string[] CandidateTypes { get; private set; }

        public string Message { get; private set; }

        public RokidSdkBindingReport WithLiveBinding(bool inputBindingReady, bool overlayBindingReady, string message)
        {
            return new RokidSdkBindingReport(
                DefineSymbol,
                BoundaryCompiled,
                PackageDetected,
                inputBindingReady,
                overlayBindingReady,
                inputBindingReady && overlayBindingReady ? RokidSdkBindingStage.LiveBindingReady : Stage,
                CandidateAssemblies,
                CandidateTypes,
                message);
        }

        public static RokidSdkBindingReport Fallback(string message)
        {
            return new RokidSdkBindingReport(
                RokidUxrBoundary.DefineSymbol,
                false,
                false,
                false,
                false,
                RokidSdkBindingStage.FallbackOnly,
                new string[0],
                new string[0],
                message);
        }

        private static string Clean(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.Trim();
        }
    }

    public static class RokidSdkBindingProbe
    {
        private const int MaxProbeItems = 12;

        public static RokidSdkBindingReport Detect()
        {
            bool boundaryCompiled = RokidUxrBoundary.IsCompiled;
            List<string> assemblies = new List<string>();
            List<string> types = new List<string>();
            ScanLoadedAssemblies(assemblies, types);

            bool packageDetected = assemblies.Count > 0 || types.Count > 0;
            RokidSdkBindingStage stage = RokidSdkBindingStage.FallbackOnly;
            string message = "ROKID_UXR boundary is absent; using editor fallback.";

            if (boundaryCompiled && packageDetected)
            {
                stage = RokidSdkBindingStage.PackageDetected;
                message = "ROKID_UXR boundary compiled and candidate Rokid SDK assemblies were detected; live adapter binding still needs proof.";
            }
            else if (boundaryCompiled)
            {
                stage = RokidSdkBindingStage.BoundaryCompiled;
                message = "ROKID_UXR boundary compiled, but no vendor SDK assembly/type is detected yet.";
            }
            else if (packageDetected)
            {
                message = "Candidate Rokid SDK assembly/type detected, but ROKID_UXR define is not enabled.";
            }

            return new RokidSdkBindingReport(
                RokidUxrBoundary.DefineSymbol,
                boundaryCompiled,
                packageDetected,
                false,
                false,
                stage,
                assemblies.ToArray(),
                types.ToArray(),
                message);
        }

        private static void ScanLoadedAssemblies(List<string> assemblies, List<string> types)
        {
            Assembly[] loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int index = 0; index < loadedAssemblies.Length; index++)
            {
                Assembly assembly = loadedAssemblies[index];
                string assemblyName = assembly.GetName().Name;
                if (IsCandidateName(assemblyName))
                {
                    AddUnique(assemblies, assemblyName);
                }

                if (types.Count < MaxProbeItems)
                {
                    ScanAssemblyTypes(assembly, types);
                }
            }
        }

        private static void ScanAssemblyTypes(Assembly assembly, List<string> types)
        {
            Type[] assemblyTypes;
            try
            {
                assemblyTypes = assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException error)
            {
                assemblyTypes = error.Types;
            }
            catch
            {
                return;
            }

            if (assemblyTypes == null)
            {
                return;
            }

            for (int index = 0; index < assemblyTypes.Length && types.Count < MaxProbeItems; index++)
            {
                Type type = assemblyTypes[index];
                if (type == null || string.IsNullOrEmpty(type.FullName))
                {
                    continue;
                }

                if (type.FullName.StartsWith("InnerWorld.", StringComparison.Ordinal))
                {
                    continue;
                }

                if (IsCandidateName(type.FullName))
                {
                    AddUnique(types, type.FullName);
                }
            }
        }

        private static bool IsCandidateName(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return false;
            }

            string lower = value.ToLowerInvariant();
            return lower.Contains("rokid") || lower.Contains("uxr");
        }

        private static void AddUnique(List<string> values, string value)
        {
            if (values.Count >= MaxProbeItems || string.IsNullOrEmpty(value))
            {
                return;
            }

            if (!values.Contains(value))
            {
                values.Add(value);
            }
        }
    }
}
