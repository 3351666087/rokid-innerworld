using System;
using System.Collections.Generic;

namespace InnerWorld.Rokid.Runtime
{
    public static class InnerWorldMissionStates
    {
        public const string Entered = "entered";
        public const string Reading = "reading";
        public const string Doing = "doing";
        public const string ServiceReady = "service_ready";
        public const string Writing = "writing";
        public const string Complete = "complete";
        public const string SpatialEntry = "spatial_entry";
        public const string TargetLock = "target_lock";
        public const string Discovery = "discovery";
        public const string WritebackReady = "writeback_ready";
        public const string Unknown = "unknown";

        public static string Normalize(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return Entered;
            }

            string clean = value.Trim();
            if (string.Equals(clean, Entered, StringComparison.OrdinalIgnoreCase)) return Entered;
            if (string.Equals(clean, Reading, StringComparison.OrdinalIgnoreCase)) return Reading;
            if (string.Equals(clean, Doing, StringComparison.OrdinalIgnoreCase)) return Doing;
            if (string.Equals(clean, ServiceReady, StringComparison.OrdinalIgnoreCase)) return ServiceReady;
            if (string.Equals(clean, Writing, StringComparison.OrdinalIgnoreCase)) return Writing;
            if (string.Equals(clean, Complete, StringComparison.OrdinalIgnoreCase)) return Complete;
            if (string.Equals(clean, SpatialEntry, StringComparison.OrdinalIgnoreCase)) return SpatialEntry;
            if (string.Equals(clean, TargetLock, StringComparison.OrdinalIgnoreCase)) return TargetLock;
            if (string.Equals(clean, Discovery, StringComparison.OrdinalIgnoreCase)) return Discovery;
            if (string.Equals(clean, WritebackReady, StringComparison.OrdinalIgnoreCase)) return WritebackReady;
            return clean;
        }
    }

    public static class InnerWorldAnchorSelectionStates
    {
        public const string None = "none";
        public const string Gaze = "gaze";
        public const string Selected = "selected";
        public const string Locked = "locked";
        public const string Unavailable = "unavailable";
    }

    [Serializable]
    public sealed class InnerWorldMissionState
    {
        public string mission_id;
        public string title;
        public string mission_state;
        public string active_user;
        public int current_step_index;
        public string[] completed_steps;
        public InnerWorldMissionStepState[] steps;
        public InnerWorldAnchorSelection anchor_selection;
        public InnerWorldArShellState ar_shell;

        public InnerWorldMissionState()
        {
            mission_state = InnerWorldMissionStates.Entered;
            active_user = InnerWorldRuntimeConfig.DefaultActiveUser;
            current_step_index = 0;
            completed_steps = new string[0];
            steps = new InnerWorldMissionStepState[0];
            anchor_selection = InnerWorldAnchorSelection.None();
            ar_shell = InnerWorldArShellState.CreateDefault();
        }

        public static InnerWorldMissionState Create(string missionId, string missionTitle, InnerWorldMissionStepState[] missionSteps)
        {
            InnerWorldMissionState state = new InnerWorldMissionState
            {
                mission_id = Clean(missionId),
                title = Clean(missionTitle)
            };
            state.SetSteps(missionSteps);
            return state;
        }

        public InnerWorldMissionStepState CurrentStep
        {
            get
            {
                if (steps == null || steps.Length == 0)
                {
                    return null;
                }

                int index = ClampStepIndex(current_step_index, steps.Length);
                return steps[index];
            }
        }

        public string CurrentStepId
        {
            get
            {
                InnerWorldMissionStepState step = CurrentStep;
                return step != null ? step.step_id : string.Empty;
            }
        }

        public int CompletedStepCount
        {
            get { return completed_steps != null ? completed_steps.Length : 0; }
        }

        public bool HasSelectedAnchor
        {
            get { return anchor_selection != null && anchor_selection.HasAnchor; }
        }

        public bool OperatorSafeDeviceMode
        {
            get { return ar_shell != null && ar_shell.operator_safe_device_mode; }
        }

        public string ArShellStatusLabel
        {
            get { return ar_shell != null ? ar_shell.status_label : string.Empty; }
        }

        public float ImageTargetLockQuality
        {
            get { return ar_shell != null ? ar_shell.image_target_lock_quality : 0f; }
        }

        public bool IsComplete
        {
            get
            {
                if (string.Equals(mission_state, InnerWorldMissionStates.Complete, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (IsStepComplete("write_back"))
                {
                    return true;
                }

                return steps != null && steps.Length > 0 && CompletedStepCount >= steps.Length;
            }
        }

        public float CompletionRatio
        {
            get
            {
                if (steps == null || steps.Length == 0)
                {
                    return IsComplete ? 1f : 0f;
                }

                float ratio = (float)CompletedStepCount / steps.Length;
                if (ratio < 0f) return 0f;
                if (ratio > 1f) return 1f;
                return ratio;
            }
        }

        public void SetSteps(InnerWorldMissionStepState[] missionSteps)
        {
            steps = CopySteps(missionSteps);
            current_step_index = ClampStepIndex(current_step_index, steps.Length);
            SyncStepCompletion();
            RefreshArShellState();
        }

        public void ApplyRuntime(string state, int stepIndex, string[] completedSteps, string userId)
        {
            mission_state = InnerWorldMissionStates.Normalize(state);
            current_step_index = ClampStepIndex(stepIndex, steps != null ? steps.Length : 0);
            completed_steps = CopyStrings(completedSteps);
            if (!string.IsNullOrWhiteSpace(userId))
            {
                active_user = userId.Trim();
            }

            SyncStepCompletion();
            if (IsComplete)
            {
                mission_state = InnerWorldMissionStates.Complete;
                current_step_index = ClampStepIndex(steps != null ? steps.Length - 1 : current_step_index, steps != null ? steps.Length : 0);
            }

            RefreshArShellState();
        }

        public bool MarkStepComplete(string stepId)
        {
            string cleanStepId = Clean(stepId);
            if (cleanStepId.Length == 0 || IsStepComplete(cleanStepId))
            {
                return false;
            }

            List<string> completed = new List<string>(SafeCompletedSteps());
            completed.Add(cleanStepId);
            completed_steps = completed.ToArray();
            SyncStepCompletion();
            AdvanceToNextOpenStep();

            if (IsComplete)
            {
                mission_state = InnerWorldMissionStates.Complete;
            }
            else if (string.Equals(cleanStepId, "service_action", StringComparison.Ordinal))
            {
                mission_state = InnerWorldMissionStates.ServiceReady;
            }
            else if (string.Equals(cleanStepId, "write_back", StringComparison.Ordinal))
            {
                mission_state = InnerWorldMissionStates.Complete;
            }
            else
            {
                mission_state = InnerWorldMissionStates.Doing;
            }

            RefreshArShellState();
            return true;
        }

        public bool IsStepComplete(string stepId)
        {
            string cleanStepId = Clean(stepId);
            if (cleanStepId.Length == 0 || completed_steps == null)
            {
                return false;
            }

            for (int index = 0; index < completed_steps.Length; index++)
            {
                if (string.Equals(completed_steps[index], cleanStepId, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        public void AdvanceToNextOpenStep()
        {
            if (steps == null || steps.Length == 0)
            {
                current_step_index = 0;
                return;
            }

            for (int index = 0; index < steps.Length; index++)
            {
                if (steps[index] != null && !IsStepComplete(steps[index].step_id))
                {
                    current_step_index = index;
                    return;
                }
            }

            current_step_index = steps.Length - 1;
        }

        public void FocusAnchor(string anchorId, string label, string kind)
        {
            anchor_selection = InnerWorldAnchorSelection.Create(anchorId, label, kind, InnerWorldAnchorSelectionStates.Gaze);
            RefreshArShellState();
        }

        public void SelectAnchor(string anchorId, string label, string kind)
        {
            anchor_selection = InnerWorldAnchorSelection.Create(anchorId, label, kind, InnerWorldAnchorSelectionStates.Selected);
            RefreshArShellState();
        }

        public void LockAnchor(string anchorId, string label, string kind)
        {
            anchor_selection = InnerWorldAnchorSelection.Create(anchorId, label, kind, InnerWorldAnchorSelectionStates.Locked);
            RefreshArShellState();
        }

        public void ClearAnchorSelection()
        {
            anchor_selection = InnerWorldAnchorSelection.None();
            RefreshArShellState();
        }

        public void ApplyPresentationStrategy(RokidPresentationStrategy strategy)
        {
            EnsureArShell();
            ar_shell.ApplyPresentationStrategy(strategy);
            InnerWorldMissionStepState activeStep = CurrentStep;
            ar_shell.SetMissionProgress(
                activeStep != null ? activeStep.step_id : string.Empty,
                activeStep != null ? activeStep.label : string.Empty,
                CompletedStepCount,
                steps != null ? steps.Length : 0,
                CompletionRatio);
            ar_shell.RefreshStatusLabel();
        }

        public string[] SafeCompletedSteps()
        {
            return CopyStrings(completed_steps);
        }

        public InnerWorldMissionState Clone()
        {
            InnerWorldMissionState clone = new InnerWorldMissionState
            {
                mission_id = mission_id,
                title = title,
                mission_state = mission_state,
                active_user = active_user,
                current_step_index = current_step_index,
                completed_steps = CopyStrings(completed_steps),
                steps = CopySteps(steps),
                anchor_selection = anchor_selection != null ? anchor_selection.Clone() : InnerWorldAnchorSelection.None(),
                ar_shell = ar_shell != null ? ar_shell.Clone() : InnerWorldArShellState.CreateDefault()
            };

            return clone;
        }

        private void EnsureArShell()
        {
            if (ar_shell == null)
            {
                ar_shell = InnerWorldArShellState.CreateDefault();
            }
        }

        private void RefreshArShellState()
        {
            EnsureArShell();

            InnerWorldMissionStepState activeStep = CurrentStep;
            string activeStepId = activeStep != null ? activeStep.step_id : string.Empty;
            string activeStepLabel = activeStep != null ? activeStep.label : string.Empty;
            int anchorCount = CountAnchoredSteps();

            ar_shell.SetMissionProgress(activeStepId, activeStepLabel, CompletedStepCount, steps != null ? steps.Length : 0, CompletionRatio);
            ar_shell.SetDiscoveryLayer(
                RokidDiscoveryLayerStates.Radar,
                "Discovery/radar layer: " + anchorCount + " anchored targets in sweep",
                anchorCount);

            RefreshSpatialEntryState(activeStep);
            RefreshImageTargetState(activeStep);
            RefreshWritebackReadinessState();
            ar_shell.RefreshStatusLabel();
        }

        private void RefreshSpatialEntryState(InnerWorldMissionStepState activeStep)
        {
            if (HasSelectedAnchor)
            {
                ar_shell.SetSpatialEntry(
                    RokidSpatialEntryStates.MarkerAssisted,
                    "Spatial entry: anchored to " + AnchorDisplayLabel(anchor_selection));
                return;
            }

            if (string.Equals(mission_state, InnerWorldMissionStates.SpatialEntry, StringComparison.OrdinalIgnoreCase))
            {
                ar_shell.SetSpatialEntry(
                    RokidSpatialEntryStates.MarkerAssisted,
                    "Spatial entry: aligning exhibit wall");
                return;
            }

            if (activeStep != null && !string.IsNullOrWhiteSpace(activeStep.anchor_id))
            {
                ar_shell.SetSpatialEntry(
                    RokidSpatialEntryStates.SimulatedWall,
                    "Spatial entry: staged for anchor " + activeStep.anchor_id.Trim());
                return;
            }

            ar_shell.SetSpatialEntry(
                RokidSpatialEntryStates.SimulatedWall,
                "Spatial entry: gallery wall rehearsal");
        }

        private void RefreshImageTargetState(InnerWorldMissionStepState activeStep)
        {
            if (anchor_selection != null && anchor_selection.HasAnchor)
            {
                ar_shell.ApplyAnchorSelection(anchor_selection);
                return;
            }

            if (string.Equals(mission_state, InnerWorldMissionStates.TargetLock, StringComparison.OrdinalIgnoreCase))
            {
                ar_shell.SetImageTargetLock(
                    RokidImageTargetLockStates.Candidate,
                    "Image target lock: candidate target acquired",
                    0.72f);
                return;
            }

            if (activeStep != null && !string.IsNullOrWhiteSpace(activeStep.anchor_id))
            {
                ar_shell.SetImageTargetLock(
                    RokidImageTargetLockStates.Searching,
                    "Image target lock: scanning " + activeStep.anchor_id.Trim(),
                    0.42f);
                return;
            }

            ar_shell.SetImageTargetLock(
                RokidImageTargetLockStates.Searching,
                "Image target lock: scanning wall targets",
                0.35f);
        }

        private void RefreshWritebackReadinessState()
        {
            if (IsComplete)
            {
                ar_shell.SetWritebackReadiness(
                    RokidWritebackReadinessStates.Ready,
                    "Writeback readiness: synchronized",
                    true);
                return;
            }

            if (string.Equals(mission_state, InnerWorldMissionStates.Writing, StringComparison.OrdinalIgnoreCase)
                || string.Equals(mission_state, InnerWorldMissionStates.WritebackReady, StringComparison.OrdinalIgnoreCase)
                || string.Equals(mission_state, InnerWorldMissionStates.ServiceReady, StringComparison.OrdinalIgnoreCase)
                || IsStepComplete("service_action"))
            {
                ar_shell.SetWritebackReadiness(
                    RokidWritebackReadinessStates.OperatorReview,
                    "Writeback readiness: operator review lane armed",
                    true);
                return;
            }

            ar_shell.SetWritebackReadiness(
                RokidWritebackReadinessStates.DraftOnly,
                "Writeback readiness: draft lane guarded",
                false);
        }

        private int CountAnchoredSteps()
        {
            if (steps == null || steps.Length == 0)
            {
                return 0;
            }

            int count = 0;
            for (int index = 0; index < steps.Length; index++)
            {
                if (steps[index] != null && !string.IsNullOrWhiteSpace(steps[index].anchor_id))
                {
                    count++;
                }
            }

            return count;
        }

        private static string AnchorDisplayLabel(InnerWorldAnchorSelection selection)
        {
            if (selection == null)
            {
                return "selected target";
            }

            if (!string.IsNullOrWhiteSpace(selection.label))
            {
                return selection.label.Trim();
            }

            if (!string.IsNullOrWhiteSpace(selection.anchor_id))
            {
                return selection.anchor_id.Trim();
            }

            return "selected target";
        }

        private void SyncStepCompletion()
        {
            if (steps == null)
            {
                steps = new InnerWorldMissionStepState[0];
                return;
            }

            for (int index = 0; index < steps.Length; index++)
            {
                if (steps[index] == null)
                {
                    continue;
                }

                bool complete = IsStepComplete(steps[index].step_id);
                steps[index].completed = complete;
                steps[index].state = complete ? InnerWorldMissionStates.Complete : InnerWorldMissionStates.Doing;
            }
        }

        private static int ClampStepIndex(int index, int stepCount)
        {
            if (stepCount <= 0)
            {
                return 0;
            }

            if (index < 0) return 0;
            if (index >= stepCount) return stepCount - 1;
            return index;
        }

        private static string[] CopyStrings(string[] values)
        {
            if (values == null || values.Length == 0)
            {
                return new string[0];
            }

            List<string> clean = new List<string>();
            for (int index = 0; index < values.Length; index++)
            {
                string value = Clean(values[index]);
                if (value.Length > 0 && !Contains(clean, value))
                {
                    clean.Add(value);
                }
            }

            return clean.ToArray();
        }

        private static InnerWorldMissionStepState[] CopySteps(InnerWorldMissionStepState[] missionSteps)
        {
            if (missionSteps == null || missionSteps.Length == 0)
            {
                return new InnerWorldMissionStepState[0];
            }

            InnerWorldMissionStepState[] copy = new InnerWorldMissionStepState[missionSteps.Length];
            for (int index = 0; index < missionSteps.Length; index++)
            {
                copy[index] = missionSteps[index] != null ? missionSteps[index].Clone() : new InnerWorldMissionStepState();
            }

            return copy;
        }

        private static bool Contains(List<string> values, string value)
        {
            for (int index = 0; index < values.Count; index++)
            {
                if (string.Equals(values[index], value, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public sealed class InnerWorldArShellState
    {
        public string spatial_entry_state;
        public string spatial_entry_label;
        public string image_target_lock_state;
        public string image_target_lock_label;
        public float image_target_lock_quality;
        public string discovery_layer_state;
        public string discovery_layer_label;
        public int discovery_radar_anchor_count;
        public string writeback_readiness_state;
        public string writeback_readiness_label;
        public bool writeback_ready;
        public string device_mode_state;
        public string device_mode_label;
        public bool operator_safe_device_mode;
        public string active_step_id;
        public string active_step_label;
        public int completed_step_count;
        public int total_step_count;
        public float progress_ratio;
        public string status_label;
        public string metrics_label;
        public InnerWorldArShellMetric[] metrics;

        public static InnerWorldArShellState CreateDefault()
        {
            InnerWorldArShellState state = new InnerWorldArShellState
            {
                spatial_entry_state = RokidSpatialEntryStates.SimulatedWall,
                spatial_entry_label = "Spatial entry: gallery wall rehearsal",
                image_target_lock_state = RokidImageTargetLockStates.Searching,
                image_target_lock_label = "Image target lock: scanning wall targets",
                image_target_lock_quality = 0.35f,
                discovery_layer_state = RokidDiscoveryLayerStates.Radar,
                discovery_layer_label = "Discovery/radar layer: anchors queued",
                discovery_radar_anchor_count = 0,
                writeback_readiness_state = RokidWritebackReadinessStates.DraftOnly,
                writeback_readiness_label = "Writeback readiness: draft lane guarded",
                writeback_ready = false,
                device_mode_state = RokidDeviceSafetyModes.SimulatorSafe,
                device_mode_label = "Device mode: operator-safe simulator",
                operator_safe_device_mode = true,
                active_step_id = string.Empty,
                active_step_label = string.Empty,
                completed_step_count = 0,
                total_step_count = 0,
                progress_ratio = 0f,
                status_label = string.Empty,
                metrics_label = string.Empty,
                metrics = new InnerWorldArShellMetric[0]
            };

            state.RefreshStatusLabel();
            return state;
        }

        public void ApplyPresentationStrategy(RokidPresentationStrategy strategy)
        {
            if (strategy == null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(strategy.spatial_entry_state) || !string.IsNullOrWhiteSpace(strategy.spatial_entry_label))
            {
                SetSpatialEntry(strategy.spatial_entry_state, strategy.spatial_entry_label);
            }

            if (!string.IsNullOrWhiteSpace(strategy.image_target_lock_state) || !string.IsNullOrWhiteSpace(strategy.image_target_lock_label))
            {
                SetImageTargetLock(strategy.image_target_lock_state, strategy.image_target_lock_label, strategy.image_target_lock_quality);
            }

            if (!string.IsNullOrWhiteSpace(strategy.discovery_layer_state) || !string.IsNullOrWhiteSpace(strategy.discovery_layer_label))
            {
                SetDiscoveryLayer(strategy.discovery_layer_state, strategy.discovery_layer_label, discovery_radar_anchor_count);
            }

            if (!string.IsNullOrWhiteSpace(strategy.writeback_readiness_state) || !string.IsNullOrWhiteSpace(strategy.writeback_readiness_label))
            {
                SetWritebackReadiness(
                    strategy.writeback_readiness_state,
                    strategy.writeback_readiness_label,
                    string.Equals(strategy.writeback_readiness_state, RokidWritebackReadinessStates.Ready, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(strategy.writeback_readiness_state, RokidWritebackReadinessStates.OperatorReview, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(strategy.device_safety_mode) || !string.IsNullOrWhiteSpace(strategy.device_safety_label))
            {
                SetDeviceMode(strategy.device_safety_mode, strategy.device_safety_label, strategy.operator_safe_device_mode);
            }

            RefreshStatusLabel();
        }

        public void ApplyAnchorSelection(InnerWorldAnchorSelection selection)
        {
            if (selection == null || !selection.HasAnchor)
            {
                SetImageTargetLock(
                    RokidImageTargetLockStates.Searching,
                    "Image target lock: scanning wall targets",
                    0.35f);
                return;
            }

            string target = AnchorDisplayLabel(selection);
            if (string.Equals(selection.selection_state, InnerWorldAnchorSelectionStates.Locked, StringComparison.OrdinalIgnoreCase))
            {
                SetImageTargetLock(
                    RokidImageTargetLockStates.Locked,
                    "Image target lock: locked to " + target,
                    0.9f);
            }
            else if (string.Equals(selection.selection_state, InnerWorldAnchorSelectionStates.Selected, StringComparison.OrdinalIgnoreCase))
            {
                SetImageTargetLock(
                    RokidImageTargetLockStates.Candidate,
                    "Image target lock: candidate " + target,
                    0.72f);
            }
            else
            {
                SetImageTargetLock(
                    RokidImageTargetLockStates.Searching,
                    "Image target lock: gaze sweep over " + target,
                    0.56f);
            }
        }

        public void SetSpatialEntry(string state, string label)
        {
            spatial_entry_state = CleanOrDefault(state, RokidSpatialEntryStates.SimulatedWall);
            spatial_entry_label = CleanOrDefault(label, "Spatial entry: gallery wall rehearsal");
        }

        public void SetImageTargetLock(string state, string label, float quality)
        {
            image_target_lock_state = CleanOrDefault(state, RokidImageTargetLockStates.Searching);
            image_target_lock_label = CleanOrDefault(label, "Image target lock: scanning wall targets");
            image_target_lock_quality = Clamp01(quality);
        }

        public void SetDiscoveryLayer(string state, string label, int anchorCount)
        {
            discovery_layer_state = CleanOrDefault(state, RokidDiscoveryLayerStates.Radar);
            discovery_layer_label = CleanOrDefault(label, "Discovery/radar layer: anchors queued");
            discovery_radar_anchor_count = anchorCount < 0 ? 0 : anchorCount;
        }

        public void SetWritebackReadiness(string state, string label, bool ready)
        {
            writeback_readiness_state = CleanOrDefault(state, RokidWritebackReadinessStates.DraftOnly);
            writeback_readiness_label = CleanOrDefault(label, "Writeback readiness: draft lane guarded");
            writeback_ready = ready;
        }

        public void SetDeviceMode(string state, string label, bool operatorSafe)
        {
            device_mode_state = CleanOrDefault(state, RokidDeviceSafetyModes.SimulatorSafe);
            device_mode_label = CleanOrDefault(label, "Device mode: operator-safe simulator");
            operator_safe_device_mode = operatorSafe;
        }

        public void SetMissionProgress(string stepId, string stepLabel, int completedCount, int totalCount, float ratio)
        {
            active_step_id = Clean(stepId);
            active_step_label = Clean(stepLabel);
            completed_step_count = completedCount < 0 ? 0 : completedCount;
            total_step_count = totalCount < 0 ? 0 : totalCount;
            progress_ratio = Clamp01(ratio);
        }

        public void RefreshStatusLabel()
        {
            status_label = "AR shell | " + ShortLabel(spatial_entry_label) + " | " + ShortLabel(image_target_lock_label) + " | " + ShortLabel(writeback_readiness_label);
            metrics_label = "progress " + PercentLabel(progress_ratio)
                + " | target " + PercentLabel(image_target_lock_quality)
                + " | radar " + discovery_radar_anchor_count.ToString();
            metrics = BuildMetrics();
        }

        public InnerWorldArShellState Clone()
        {
            return new InnerWorldArShellState
            {
                spatial_entry_state = spatial_entry_state,
                spatial_entry_label = spatial_entry_label,
                image_target_lock_state = image_target_lock_state,
                image_target_lock_label = image_target_lock_label,
                image_target_lock_quality = image_target_lock_quality,
                discovery_layer_state = discovery_layer_state,
                discovery_layer_label = discovery_layer_label,
                discovery_radar_anchor_count = discovery_radar_anchor_count,
                writeback_readiness_state = writeback_readiness_state,
                writeback_readiness_label = writeback_readiness_label,
                writeback_ready = writeback_ready,
                device_mode_state = device_mode_state,
                device_mode_label = device_mode_label,
                operator_safe_device_mode = operator_safe_device_mode,
                active_step_id = active_step_id,
                active_step_label = active_step_label,
                completed_step_count = completed_step_count,
                total_step_count = total_step_count,
                progress_ratio = progress_ratio,
                status_label = status_label,
                metrics_label = metrics_label,
                metrics = CopyMetrics(metrics)
            };
        }

        private InnerWorldArShellMetric[] BuildMetrics()
        {
            return new[]
            {
                InnerWorldArShellMetric.Create("mission_progress", "Mission progress", "percent", progress_ratio, active_step_id),
                InnerWorldArShellMetric.Create("spatial_entry", "Spatial entry", "quality", SpatialEntryScore(spatial_entry_state), spatial_entry_state),
                InnerWorldArShellMetric.Create("image_target_lock", "Image target lock", "quality", image_target_lock_quality, image_target_lock_state),
                InnerWorldArShellMetric.Create("discovery_radar", "Discovery/radar layer", "anchors", discovery_radar_anchor_count, discovery_layer_state),
                InnerWorldArShellMetric.Create("writeback_readiness", "Writeback readiness", "readiness", writeback_ready ? 1f : 0.42f, writeback_readiness_state),
                InnerWorldArShellMetric.Create("operator_safety", "Operator-safe device mode", "guard", operator_safe_device_mode ? 1f : 0f, device_mode_state)
            };
        }

        private static InnerWorldArShellMetric[] CopyMetrics(InnerWorldArShellMetric[] values)
        {
            if (values == null || values.Length == 0)
            {
                return new InnerWorldArShellMetric[0];
            }

            InnerWorldArShellMetric[] copy = new InnerWorldArShellMetric[values.Length];
            for (int index = 0; index < values.Length; index++)
            {
                copy[index] = values[index] != null ? values[index].Clone() : new InnerWorldArShellMetric();
            }

            return copy;
        }

        private static float SpatialEntryScore(string state)
        {
            if (string.Equals(state, RokidSpatialEntryStates.HardwareAnchored, StringComparison.OrdinalIgnoreCase)) return 1f;
            if (string.Equals(state, RokidSpatialEntryStates.MarkerAssisted, StringComparison.OrdinalIgnoreCase)) return 0.78f;
            if (string.Equals(state, RokidSpatialEntryStates.SimulatedWall, StringComparison.OrdinalIgnoreCase)) return 0.58f;
            return 0f;
        }

        private static string AnchorDisplayLabel(InnerWorldAnchorSelection selection)
        {
            if (selection == null)
            {
                return "selected target";
            }

            if (!string.IsNullOrWhiteSpace(selection.label))
            {
                return selection.label.Trim();
            }

            if (!string.IsNullOrWhiteSpace(selection.anchor_id))
            {
                return selection.anchor_id.Trim();
            }

            return "selected target";
        }

        private static string ShortLabel(string value)
        {
            string clean = Clean(value);
            int colon = clean.IndexOf(':');
            if (colon >= 0 && colon + 1 < clean.Length)
            {
                return clean.Substring(colon + 1).Trim();
            }

            return clean;
        }

        private static float Clamp01(float value)
        {
            if (value < 0f) return 0f;
            if (value > 1f) return 1f;
            return value;
        }

        private static string PercentLabel(float value)
        {
            return ((int)(Clamp01(value) * 100f + 0.5f)).ToString() + "%";
        }

        private static string CleanOrDefault(string value, string fallback)
        {
            string clean = Clean(value);
            return clean.Length > 0 ? clean : fallback;
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public sealed class InnerWorldArShellMetric
    {
        public string metric_id;
        public string label;
        public string unit;
        public float value;
        public string state;
        public string display_value;

        public static InnerWorldArShellMetric Create(string metricId, string metricLabel, string metricUnit, float metricValue, string metricState)
        {
            string unit = Clean(metricUnit);
            bool countMetric = string.Equals(unit, "anchors", StringComparison.OrdinalIgnoreCase) || string.Equals(unit, "count", StringComparison.OrdinalIgnoreCase);
            float cleanValue = countMetric ? NonNegative(metricValue) : Clamp01(metricValue);
            return new InnerWorldArShellMetric
            {
                metric_id = Clean(metricId),
                label = Clean(metricLabel),
                unit = unit,
                value = cleanValue,
                state = Clean(metricState),
                display_value = countMetric ? ((int)(cleanValue + 0.5f)).ToString() : PercentLabel(cleanValue)
            };
        }

        public InnerWorldArShellMetric Clone()
        {
            return new InnerWorldArShellMetric
            {
                metric_id = metric_id,
                label = label,
                unit = unit,
                value = value,
                state = state,
                display_value = display_value
            };
        }

        private static float NonNegative(float value)
        {
            return value < 0f ? 0f : value;
        }

        private static float Clamp01(float value)
        {
            if (value < 0f) return 0f;
            if (value > 1f) return 1f;
            return value;
        }

        private static string PercentLabel(float value)
        {
            return ((int)(Clamp01(value) * 100f + 0.5f)).ToString() + "%";
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public sealed class InnerWorldMissionStepState
    {
        public string step_id;
        public string label;
        public string anchor_id;
        public string hint;
        public string state;
        public bool completed;

        public InnerWorldMissionStepState()
        {
            state = InnerWorldMissionStates.Doing;
        }

        public static InnerWorldMissionStepState Create(string stepId, string stepLabel, string anchorId, string stepHint)
        {
            return new InnerWorldMissionStepState
            {
                step_id = Clean(stepId),
                label = Clean(stepLabel),
                anchor_id = Clean(anchorId),
                hint = Clean(stepHint),
                state = InnerWorldMissionStates.Doing,
                completed = false
            };
        }

        public InnerWorldMissionStepState Clone()
        {
            return new InnerWorldMissionStepState
            {
                step_id = step_id,
                label = label,
                anchor_id = anchor_id,
                hint = hint,
                state = state,
                completed = completed
            };
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public sealed class InnerWorldAnchorSelection
    {
        public string anchor_id;
        public string label;
        public string kind;
        public string selection_state;
        public string selected_at;

        public bool HasAnchor
        {
            get { return !string.IsNullOrWhiteSpace(anchor_id); }
        }

        public static InnerWorldAnchorSelection None()
        {
            return new InnerWorldAnchorSelection
            {
                anchor_id = string.Empty,
                label = string.Empty,
                kind = string.Empty,
                selection_state = InnerWorldAnchorSelectionStates.None,
                selected_at = string.Empty
            };
        }

        public static InnerWorldAnchorSelection Create(string anchorId, string anchorLabel, string anchorKind, string state)
        {
            return new InnerWorldAnchorSelection
            {
                anchor_id = Clean(anchorId),
                label = Clean(anchorLabel),
                kind = Clean(anchorKind),
                selection_state = string.IsNullOrWhiteSpace(state) ? InnerWorldAnchorSelectionStates.Selected : state.Trim(),
                selected_at = DateTime.UtcNow.ToString("o")
            };
        }

        public InnerWorldAnchorSelection Clone()
        {
            return new InnerWorldAnchorSelection
            {
                anchor_id = anchor_id,
                label = label,
                kind = kind,
                selection_state = selection_state,
                selected_at = selected_at
            };
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }
}
