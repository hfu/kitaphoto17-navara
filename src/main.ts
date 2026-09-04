import ThreeView from "@navaramap/three";
import { Vector3 } from "three";

// A prior deploy briefly registered a coi-serviceworker (see DECISIONS.md
// D9) to unlock terrain; that attempt was reverted, but Service Workers
// persist across visits until explicitly removed. Unregister any leftover
// so returning visitors don't keep carrying it.
navigator.serviceWorker
  ?.getRegistrations()
  .then((regs) => regs.forEach((reg) => reg.unregister()));

const container = document.getElementById("app");
if (!container) {
  throw new Error("#app container not found");
}

const view = new ThreeView({ container });
await view.init();

// Default center: Sapporo. Overridden by the URL hash if present.
const DEFAULT_CAMERA = {
  lng: 141.3469,
  lat: 43.0642,
  height: 15_000,
  heading: 0,
  pitch: -45,
  roll: 0,
};

view.setCamera(readCameraFromHash() ?? DEFAULT_CAMERA);

const kitaphoto17 = view.addSource({
  type: "raster-tile",
  url: "https://stars.optgeo.org/kitaphoto17/{z}/{x}/{y}",
  minZoom: 2,
  maxZoom: 17,
});

view.addLayer({
  type: "raster",
  source: kitaphoto17,
});

view.attribution?.add([
  {
    attribution: "kitaphoto17 (Martin @ stars.optgeo.org)",
    attributionUrl: "https://github.com/optgeo/kitaphoto",
    children: [
      {
        attribution:
          "国土地理院 シームレス空中写真 (GSI seamlessphoto) CC BY 4.0",
      },
    ],
  },
]);

// --- Zoom toward the cursor instead of the screen center -----------------
// Navara's built-in scroll-wheel zoom (CameraOptions) always zooms toward
// the look-at point, not the cursor, and exposes no option to change that.
// Disable it and dolly the camera along the ray to the point under the
// cursor instead: pick the world point under the pointer, then move the
// camera toward (zoom in) or away from (zoom out) that point.
view.camera.options = { enableZoom: false };

const WHEEL_ZOOM_SENSITIVITY = 0.0015;

container.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const target =
      view.pickTerrainPosition(x, y) ?? view.pickDepthPosition(x, y);
    if (!target) return;

    const camPos = view.camera.positionECEF;
    const dir = new Vector3(
      target.x - camPos.x,
      target.y - camPos.y,
      target.z - camPos.z,
    );
    const distance = dir.length();
    if (distance < 1) return;
    dir.normalize();

    // Negative deltaY (scroll up / pinch out) zooms in, toward the target.
    const amount = -event.deltaY * WHEEL_ZOOM_SENSITIVITY * distance;
    const clamped = Math.max(-distance * 0.9, Math.min(distance * 0.9, amount));

    view.moveCameraWithDirection([dir.x, dir.y, dir.z], clamped);
  },
  { passive: false },
);

// --- URL hash camera sync (MapLibre's `hash: true`, done by hand) --------
// Navara has no built-in equivalent, so mirror the camera into
// `#lng/lat/height/heading/pitch` on every moveend.
function readCameraFromHash(): typeof DEFAULT_CAMERA | null {
  const parts = location.hash.slice(1).split("/").map(Number);
  if (parts.length !== 5 || parts.some((n) => Number.isNaN(n))) return null;
  const [lng, lat, height, heading, pitch] = parts;
  return { lng, lat, height, heading, pitch, roll: 0 };
}

view.camera.on("moveend", () => {
  const { lng, lat, height } = view.camera.positionGeographic;
  const { heading, pitch } = view.camera.orientation;
  history.replaceState(
    null,
    "",
    `#${lng.toFixed(6)}/${lat.toFixed(6)}/${height.toFixed(0)}/${heading.toFixed(1)}/${pitch.toFixed(1)}`,
  );
});

// --- Minimizable welcome panel ---------------------------------------------
const panelToggle = document.getElementById("panel-toggle");
const panel = document.getElementById("panel");
panelToggle?.addEventListener("click", () => {
  panel?.classList.toggle("collapsed");
});
