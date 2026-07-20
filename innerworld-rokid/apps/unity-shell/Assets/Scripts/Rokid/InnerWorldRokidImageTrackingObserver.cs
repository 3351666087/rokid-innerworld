#if ROKID_UXR
using System.Globalization;
using Rokid.UXR.Module;
using UnityEngine;

namespace InnerWorld.Rokid
{
    public sealed class InnerWorldRokidImageTrackingObserver : MonoBehaviour
    {
        public InnerWorldDemoController controller;

        private void Awake()
        {
            if (controller == null)
            {
                controller = FindObjectOfType<InnerWorldDemoController>();
            }
        }

        private void OnEnable()
        {
            ARTrackedImageManager.OnTrackedImageAdded += OnTrackedImageAdded;
            ARTrackedImageManager.OnTrackedImageUpdated += OnTrackedImageUpdated;
        }

        private void OnDisable()
        {
            ARTrackedImageManager.OnTrackedImageAdded -= OnTrackedImageAdded;
            ARTrackedImageManager.OnTrackedImageUpdated -= OnTrackedImageUpdated;
        }

        private void OnTrackedImageAdded(ARTrackedImage trackedImage)
        {
            Submit(trackedImage, "added");
        }

        private void OnTrackedImageUpdated(ARTrackedImage trackedImage)
        {
            Submit(trackedImage, "updated");
        }

        private void Submit(ARTrackedImage trackedImage, string eventType)
        {
            if (controller == null)
            {
                controller = FindObjectOfType<InnerWorldDemoController>();
            }
            if (controller == null || trackedImage == null)
            {
                return;
            }

            Debug.Log("IW_TARGET_EVENT event=" + CleanEventType(eventType)
                + " image_index=" + trackedImage.index
                + " size_m=" + MeterLabel(trackedImage.size.x) + "x" + MeterLabel(trackedImage.size.y)
                + " pose_position_m=" + MeterLabel(trackedImage.pose.position.x)
                + "," + MeterLabel(trackedImage.pose.position.y)
                + "," + MeterLabel(trackedImage.pose.position.z));

            controller.SubmitRokidTrackedImageObservation(
                trackedImage.index,
                trackedImage.pose,
                trackedImage.size,
                eventType);
        }

        private static string MeterLabel(float value)
        {
            return value.ToString("0.000", CultureInfo.InvariantCulture);
        }

        private static string CleanEventType(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? "event" : value.Trim();
        }
    }
}
#endif
