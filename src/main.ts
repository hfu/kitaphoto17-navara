import ThreeView, { TERRARIUM_ELEVATION_DECODER } from "@navaramap/three";
import { Vector3 } from "three";

const container = document.getElementById("app");
if (!container) {
  throw new Error("#app container not found");
}

const view = new ThreeView({ container });
await view.init();

// Default center: Hokkaido-Komagatake volcano, a good showcase for the
// Mapterhorn terrain layer below. Overridden by the URL hash if present.
const DEFAULT_CAMERA = {
  lng: 140.6772,
  lat: 42.0631,
  height: 8_000,
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

// Mapterhorn (Terrarium-encoded, tileSize 512) elevation, cropped to Japan.
// https://mapterhorn.com — kitaphoto17 above drapes onto this automatically.
//
// Terrain meshing needs Navara's wasm worker pool, which in turn needs
// SharedArrayBuffer (i.e. `crossOriginIsolated`, which requires
// Cross-Origin-Opener-Policy / -Embedder-Policy response headers). GitHub
// Pages cannot send custom headers, so the worker pool never starts there
// and the terrain path hits an unhandled wasm trap (`RuntimeError:
// unreachable`) instead of falling back gracefully — confirmed by
// reproducing the same crash against a local static server that serves the
// correct `application/wasm` MIME type but no COOP/COEP (see DECISIONS.md
// D8). Feature-detect and skip terrain there rather than ship a crashing
// page; kitaphoto17 still renders as a flat raster basemap.
if (window.crossOriginIsolated) {
  const mapterhorn = view.addSource({
    type: "raster-dem",
    url: "https://stars.optgeo.org/mapterhorn-japan-bridge/{z}/{x}/{y}",
    elevationDecoder: TERRARIUM_ELEVATION_DECODER(),
    tileSize: 512,
    minZoom: 0,
    maxZoom: 16,
  });

  view.addLayer({
    type: "terrain",
    source: mapterhorn,
  });

  view.attribution?.add([
    {
      attribution: "Mapterhorn terrain",
      attributionUrl: "https://mapterhorn.com/attribution",
    },
  ]);
} else {
  console.warn(
    "Terrain disabled: crossOriginIsolated is false (no COOP/COEP headers), " +
      "so Navara's wasm worker pool can't start. Showing kitaphoto17 as a " +
      "flat basemap instead. See DECISIONS.md D8.",
  );
}

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
