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

        public InnerWorldMissionState()
        {
            mission_state = InnerWorldMissionStates.Entered;
            active_user = InnerWorldRuntimeConfig.DefaultActiveUser;
            current_step_index = 0;
            completed_steps = new string[0];
            steps = new InnerWorldMissionStepState[0];
            anchor_selection = InnerWorldAnchorSelection.None();
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
        }

        public void SelectAnchor(string anchorId, string label, string kind)
        {
            anchor_selection = InnerWorldAnchorSelection.Create(anchorId, label, kind, InnerWorldAnchorSelectionStates.Selected);
        }

        public void LockAnchor(string anchorId, string label, string kind)
        {
            anchor_selection = InnerWorldAnchorSelection.Create(anchorId, label, kind, InnerWorldAnchorSelectionStates.Locked);
        }

        public void ClearAnchorSelection()
        {
            anchor_selection = InnerWorldAnchorSelection.None();
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
                anchor_selection = anchor_selection != null ? anchor_selection.Clone() : InnerWorldAnchorSelection.None()
            };

            return clone;
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
