export function announceActivities(message: string) {
  const region = document.getElementById('activities-live-region');
  if (!region) return;
  region.textContent = message;
}
