import ThreeView, { Color } from "@navaramap/three";
import { DefaultPlugin } from "@navaramap/three-default-plugin";
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

const view = new ThreeView({ container, shadow: true });
const defaultPlugin = new DefaultPlugin();
view.addPlugin(defaultPlugin);
await view.init();
defaultPlugin.addDefaultPhotorealScene();

type CameraPose = {
  lng: number;
  lat: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
};

// Three PLATEAU cities (see below), each with a camera pose tuned by hfu on
// plateau-mago-implicit's own CesiumJS viewer — reused here verbatim so the
// two projects agree on "what this city looks like".
const CITIES: { name: string; tileset: string; camera: CameraPose }[] = [
  {
    name: "札幌",
    tileset:
      "https://depot.optgeo.org/plateau-mago-implicit/sapporo/explicit/full/latest/tileset.json",
    camera: {
      lng: 141.35522,
      lat: 43.047766,
      height: 478,
      heading: 348.9,
      pitch: -22.3,
      roll: 360.0,
    },
  },
  {
    name: "室蘭",
    tileset:
      "https://depot.optgeo.org/plateau-mago-implicit/muroran/explicit/full/latest/tileset.json",
    camera: {
      lng: 141.051824,
      lat: 42.367087,
      height: 759,
      heading: 233.2,
      pitch: -17.2,
      roll: 360.0,
    },
  },
  {
    name: "更別",
    tileset:
      "https://depot.optgeo.org/plateau-mago-implicit/sarabetsu/explicit/full/latest/tileset.json",
    camera: {
      lng: 143.195052,
      lat: 42.645487,
      height: 250,
      heading: 285.3,
      pitch: -15.2,
      roll: 0.0,
    },
  },
];

// Default center: Sapporo's tuned pose, unless the URL hash overrides it.
view.setCamera(readCameraFromHash() ?? CITIES[0].camera);

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

// Cesium quantized-mesh terrain via Re:Earth's own terrain server — the
// same endpoint and source type as Navara's own official
// examples/terrain/quantized-mesh example. Chosen over raster-dem
// (Mapterhorn/Terrarium PNG) specifically because raster-dem's
// heightmap-to-mesh code path renders needle-like spike artifacts on
// Brave (reproduced on Navara's own official raster-dem example too),
// while the same Brave test against the official quantized-mesh example
// showed no artifacts at all, close-up or wide. See DECISIONS.md D12/D16.
const terrain = view.addSource({
  type: "quantized-mesh",
  url: "https://terrain.reearth.land/cesium-mesh/ellipsoid/{z}/{x}/{y}.terrain",
  maxZoom: 18,
  requestVertexNormals: true,
});

view.addLayer({ type: "terrain", source: terrain });

view.attribution?.add([
  {
    attribution: "Re:Earth Terrain",
    attributionUrl: "https://terrain.reearth.land/",
  },
]);

// PLATEAU building models (Project PLATEAU's 3D city models, converted to
// explicit-tiling 3D Tiles by the plateau-mago-implicit project; see
// DECISIONS.md D10/D16/D17 for why explicit rather than implicit tiling).
// Navara's `3d-tiles` source/layer handles this natively (glTF/GLB) — no
// CesiumJS needed. All three cities are added up front; the camera-switch
// buttons below just fly between them; each engine's own frustum/LOD
// culling keeps far-away cities' tiles from being fetched until visible.
// Gold "just loaded" flash, matching plateau-mago-implicit's own CesiumJS
// viewer: newly-loaded building tiles briefly glow gold, then fade to their
// normal color. Built on Navara's FeatureEvaluator (per-feature `evaluate()`
// styling driven by a layer's featureCreated/featureUpdated events), keyed
// by each feature's own load time so tiles loading at different moments
// fade independently.
const GOLD: [number, number, number] = [0xff, 0xd7, 0x00];
const WHITE: [number, number, number] = [0xff, 0xff, 0xff];
const FADE_MS = 1500;

function lerpHex(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): number {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return (r << 16) | (g << 8) | b;
}

function attachLoadGlow(layer: ReturnType<typeof view.addLayer>) {
  const loadedAt = new Map<string, number>();

  layer.on("featureCreated", ({ evaluator }) => {
    evaluator.readFeatureProperties(({ batchId }) => {
      const key = `${evaluator.id}:${batchId}`;
      if (!loadedAt.has(key)) loadedAt.set(key, performance.now());
    });
  });

  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(({ batchId }) => {
      const key = `${evaluator.id}:${batchId}`;
      const startedAt = loadedAt.get(key);
      if (startedAt === undefined) return {};

      const t = Math.min(1, (performance.now() - startedAt) / FADE_MS);
      if (t >= 1) {
        loadedAt.delete(key);
        return { color: new Color().setHex(lerpHex(GOLD, WHITE, 1)) };
      }
      return { color: new Color().setHex(lerpHex(GOLD, WHITE, t)) };
    });
  });

  view.on("preRender", () => {
    if (loadedAt.size > 0) layer.forceUpdate();
  });
}

for (const city of CITIES) {
  const buildings = view.addSource({ type: "3d-tiles", url: city.tileset });

  const layer = view.addLayer({
    type: "3d-tiles",
    source: buildings,
    model: {
      // D13: the glTF's own baseColorFactor/COLOR_0 are correct (red and
      // light gray, verified by decoding the .glb directly), but the tiles
      // rendered solid black. Root cause: Navara's batch-color vertex
      // shader overwrites COLOR_0 with a batch RGBA texture that defaults
      // to (0,0,0,_) until a per-feature `color` update writes it; setting
      // `opacity` alone (without `color`) enables that overwrite path
      // without writing real RGB. Explicitly setting `color` (white, the
      // multiplicative identity, so it doesn't tint the real per-feature
      // colors) takes the code path that writes real RGB into that
      // texture instead. Leave `opacity` unset — its default (1.0)
      // already does what we want without retriggering the bug.
      color: new Color().setHex(0xffffff),
    },
  });

  attachLoadGlow(layer);
}

view.attribution?.add([
  {
    attribution:
      "国土交通省 Project PLATEAU の3D都市モデル(札幌市・室蘭市・更別村)を加工して作成",
    attributionUrl: "https://www.mlit.go.jp/plateau/",
    children: [
      {
        attribution:
          '3D Tiles変換: plateau-mago-implicit | <a href="https://dwg7.github.io/plateau-mago-implicit/">Same with Cesium</a>',
      },
    ],
  },
]);

// --- City switcher:札幌/室蘭/更別 --------------------------------------
// Exercises Navara's flyTo() camera-jump; each button flies to that city's
// hfu-tuned pose (see CITIES above, unified with plateau-mago-implicit's
// own viewer).
const cityBar = document.createElement("div");
cityBar.id = "city-bar";
for (const city of CITIES) {
  const button = document.createElement("button");
  button.className = "city-button";
  button.textContent = city.name;
  button.onclick = () => {
    for (const b of cityBar.children) b.classList.remove("active");
    button.classList.add("active");
    void view.flyTo(city.camera, { duration: 2000, easing: "quinticInOut" });
  };
  cityBar.appendChild(button);
}
(cityBar.firstElementChild as HTMLElement | null)?.classList.add("active");
document.body.appendChild(cityBar);

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
    // moveCameraWithDirection() moves along `dir` only forward, like
    // moveCamera()'s CameraDirection.Forward/Backward pair — a negative
    // amount is not "backward", it's a no-op. So zooming out flips the
    // direction vector instead of negating the amount.
    const rawAmount = -event.deltaY * WHEEL_ZOOM_SENSITIVITY * distance;
    const magnitude = Math.min(Math.abs(rawAmount), distance * 0.9);
    const moveDir = rawAmount >= 0 ? dir : dir.negate();

    view.moveCameraWithDirection([moveDir.x, moveDir.y, moveDir.z], magnitude);
  },
  { passive: false },
);

// --- URL hash camera sync (MapLibre's `hash: true`, done by hand) --------
// Navara has no built-in equivalent, so mirror the camera into
// `#lng/lat/height/heading/pitch` on every moveend.
function readCameraFromHash(): CameraPose | null {
  const parts = location.hash.slice(1).split("/").map(Number);
  if (parts.length !== 5 || parts.some((n) => Number.isNaN(n))) return null;
  const [lng, lat, height, heading, pitch] = parts;
  return { lng, lat, height, heading, pitch, roll: 0 };
}

view.camera.on("moveend", () => {
  const { lng, lat, height } = view.camera.positionGeographic;
  const { heading = 0, pitch = 0 } = view.camera.orientation;
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
