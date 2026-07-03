#if ROKID_UXR
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

            controller.SubmitRokidTrackedImageObservation(
                trackedImage.index,
                trackedImage.pose,
                trackedImage.size,
                eventType);
        }
    }
}
#endif
