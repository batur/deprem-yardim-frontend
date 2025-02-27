import Map from "@/components/UI/Map/Map";
import { MarkerData } from "@/mocks/types";
import { useMapActions, useDevice, useMarkerData } from "@/stores/mapStore";
import { HeatmapLayerFactory } from "@vgrid/react-leaflet-heatmap-layer";
import { latLng, latLngBounds } from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import React, {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  MouseEvent,
} from "react";
import { Marker, MarkerProps, TileLayer, useMapEvents } from "react-leaflet";
import ResetViewControl from "@20tab/react-leaflet-resetview";
import {
  DEFAULT_CENTER,
  DEFAULT_IMPORTANCY,
  DEFAULT_MIN_ZOOM_DESKTOP,
  DEFAULT_MIN_ZOOM_MOBILE,
  DEFAULT_ZOOM,
  DEFAULT_ZOOM_MOBILE,
} from "./utils";
import { useMapClickHandlers } from "@/hooks/useMapClickHandlers";

type Point = [number, number, number];

const HeatmapLayer = React.memo(HeatmapLayerFactory<Point>());

const MarkerClusterGroup = dynamic(() => import("./MarkerClusterGroup"), {
  ssr: false,
});

const MapLegend = dynamic(() => import("./MapLegend"), {
  ssr: false,
});

// const ImpactedCities = dynamic(() => import("./ImpactedCities"), {
//   ssr: false,
// });

type ExtendedMarkerProps = MarkerProps & {
  markerData: MarkerData;
};

function ExtendedMarker({ ...props }: ExtendedMarkerProps) {
  return <Marker {...props} />;
}

const MapEvents = () => {
  const mapZoomLevelRef = useRef(0);
  const { setCoordinates, setPopUpData } = useMapActions();

  const map = useMapEvents({
    moveend: () => setCoordinates(map.getBounds()),
    zoomend: () => {
      setCoordinates(map.getBounds());

      const isZoomOut = mapZoomLevelRef.current > map.getZoom();
      if (isZoomOut) {
        setPopUpData(null);
      }
    },
    zoomstart: () => {
      mapZoomLevelRef.current = map.getZoom();
    },
  });

  return null;
};

const corners = {
  southWest: latLng(33.9825, 25.20902),
  northEast: latLng(43.32683, 46.7742),
};

const bounds = latLngBounds(corners.southWest, corners.northEast);

function LeafletMap() {
  const data = useMarkerData();
  const points: Point[] = useMemo(
    () =>
      data.map((marker: MarkerData) => [
        marker.geometry.location.lat,
        marker.geometry.location.lng,
        DEFAULT_IMPORTANCY,
      ]),
    [data]
  );

  const longitudeExtractor = useCallback((p: Point) => p[1], []);
  const latitudeExtractor = useCallback((p: Point) => p[0], []);
  const intensityExtractor = useCallback((p: Point) => p[2], []);
  const device = useDevice();

  const { handleClusterClick, handleMarkerClick } = useMapClickHandlers();

  return (
    <>
      <MapLegend />

      <Map
        center={DEFAULT_CENTER}
        zoom={device === "desktop" ? DEFAULT_ZOOM : DEFAULT_ZOOM_MOBILE}
        minZoom={
          device === "desktop"
            ? DEFAULT_MIN_ZOOM_DESKTOP
            : DEFAULT_MIN_ZOOM_MOBILE
        }
        zoomDelta={0.5}
        preferCanvas
        maxBounds={bounds}
        maxBoundsViscosity={1}
      >
        <ResetViewControl title="Sıfırla" icon="url(/icons/circular.png)" />
        <MapEvents />
        {/* <ImpactedCities /> */}
        <HeatmapLayer
          fitBoundsOnLoad
          fitBoundsOnUpdate
          radius={15}
          points={points}
          longitudeExtractor={longitudeExtractor}
          latitudeExtractor={latitudeExtractor}
          intensityExtractor={intensityExtractor}
        />
        <TileLayer
          url={`https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&apistyle=s.e%3Al.i%7Cp.v%3Aoff%2Cs.t%3A3%7Cs.e%3Ag%7C`}
        />
        {/* @ts-expect-error */}
        <MarkerClusterGroup onClick={handleClusterClick}>
          {data.map((marker: MarkerData) => (
            <Fragment key={marker.place_id}>
              <ExtendedMarker
                key={marker.place_id}
                position={[
                  marker.geometry.location.lat,
                  marker.geometry.location.lng,
                ]}
                eventHandlers={{
                  click: (e) => {
                    handleMarkerClick(e as any as MouseEvent, marker);
                  },
                }}
                markerData={marker}
              />
            </Fragment>
          ))}
        </MarkerClusterGroup>
      </Map>
    </>
  );
}

export default React.memo(LeafletMap);
