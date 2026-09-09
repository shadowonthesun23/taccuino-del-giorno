export interface MuseumCameraPose {
  scale: number;
  x: number;
  y: number;
}

export const RESTING_MUSEUM_CAMERA: MuseumCameraPose = { scale: 1, x: 0, y: 0 };

/** One camera for the complete room. Never transform the painting independently. */
export function getMuseumCameraPose(
  width: number,
  height: number,
  frame: { x: number; y: number; width: number; height: number },
): MuseumCameraPose {
  if (![width, height, frame.width, frame.height].every(value => Number.isFinite(value) && value > 0)) {
    return RESTING_MUSEUM_CAMERA;
  }
  // Bring the visitor to a genuine detail-viewing distance while keeping the
  // frame attached to the same room camera. Portrait screens need a stronger
  // minimum because the resting artwork already nearly fills their width.
  const scale = Math.max(2, Math.min(3.2, width * 1.55 / frame.width, height * 1.42 / frame.height));
  return clampMuseumCamera({
    scale,
    x: width / 2 - (frame.x + frame.width / 2) * scale,
    y: height * 0.44 - (frame.y + frame.height / 2) * scale,
  }, width, height);
}

/** Do not expose an empty strip beyond the photographed room when looking around. */
export function clampMuseumCamera(pose: MuseumCameraPose, width: number, height: number): MuseumCameraPose {
  return {
    scale: pose.scale,
    x: Math.min(0, Math.max(width * (1 - pose.scale), pose.x)),
    y: Math.min(0, Math.max(height * (1 - pose.scale), pose.y)),
  };
}

export function museumCameraTransform(pose: MuseumCameraPose): string {
  return `translate3d(${pose.x}px, ${pose.y}px, 0) scale(${pose.scale})`;
}
