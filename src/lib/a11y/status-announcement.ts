/** Cancel superseded messages before they enter the assistive technology's queue. */
export function scheduleStatusAnnouncement(
  publish: (message: string) => void,
  message: string,
  delayMs: number,
): () => void {
  // A separate empty update also allows a later identical result to be announced.
  publish('');
  if (!message) return () => {};

  const timer = setTimeout(() => publish(message), delayMs);
  return () => clearTimeout(timer);
}
