import ThreeView from "@navaramap/three";

const container = document.getElementById("app");
if (!container) {
  throw new Error("#app container not found");
}

const view = new ThreeView({ container });
await view.init();

// kitaphoto17 bounds/center per its TileJSON
// (https://stars.optgeo.org/kitaphoto17): Hokkaido + Northern Territories.
view.setCamera({
  lng: 144.5,
  lat: 43.5,
  height: 900_000,
  heading: 0,
  pitch: -90,
  roll: 0,
});

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
