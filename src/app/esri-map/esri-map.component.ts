import { prepareSyntheticListenerFunctionName } from '@angular/compiler/src/render3/util';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";

import { ISnapShotRecord } from '../Interfaces/ISnapShotRecord';

import { loadModules } from "esri-loader";
import esri = __esri; // Esri TypeScript Types
import { Guid } from 'typescript-guid';

// import { stringify } from 'querystring';
// import { filter } from 'esri/core/promiseUtils';
// import { Server } from 'http';

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})


export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  // The <div> where we will place the map
  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;
  @ViewChild("timeSliderDiv", { static: true }) private timeSliderDivEl: ElementRef;

  private _map: esri.Map;
  private _zoom = 1;
  private _center: Array<number> = [0.0, 0.0];
  private _basemap = "streets";
  private _loaded = false;
  private _view: esri.MapView = null;
  private _featLayer: esri.FeatureLayer = null;
  private _featLayerView: any; //esri.FeatureLayerView;
  public featuresOnMap: number = 0;

  get mapLoaded(): boolean { return this._loaded; }

  @Input()
  set zoom(zoom: number) { this._zoom = zoom; }
  get zoom(): number { return this._zoom; }

  @Input()
  set center(center: Array<number>) { this._center = center; }
  get center(): Array<number> { return this._center; }

  @Input()
  set basemap(basemap: string) { this._basemap = basemap; }
  get basemap(): string { return this._basemap; }

  constructor() {}

  async initializeMap() {
    try {
      // Load the modules for the ArcGIS API for JavaScript
      const [EsriMap, EsriMapView, FeatureLayer, KmlLayer, CSVLayer, FeatureFilter, TimeSlider] = await loadModules([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/layers/KMLLayer",
        "esri/layers/CSVLayer",
        "esri/views/layers/support/FeatureFilter",
        "esri/widgets/TimeSlider"
      ]);

      this._map = new EsriMap({ basemap: this._basemap } as esri.MapProperties);
      Promise.all(
        [
          '/resources/N6NJ.json',
          '/resources/N215LP-2.json',
          '/resources/N298MC-2.json',
          '/resources/N528SV.json',
          '/resources/N580C.json',
          '/resources/N681MA.json',
          '/resources/N682MA.json',
          '/resources/N872SP.json',
          '/resources/N1724U.json',
          '/resources/N3576M.json',
          '/resources/N9280A-2.json'
        ].map(url => fetch(url)
          .then(data => data.json())
          .then(data => (data as Array<ISnapShotRecord>))
          .then(data => data.map(d => {
            // Create latitude & longitude from our COORD field
            d.flightNum = url,
            d.latitude = d.coord[0];
            d.longitude = d.coord[1];
            return d;
          }))
          .catch(reason => {
            console.log('Failed Fetch or Formatting', reason);
            return new Array<ISnapShotRecord>();
          })
        )
      )
      .then(results => results.reduce((t: Array<ISnapShotRecord>, n: Array<ISnapShotRecord>) => {
        return [].concat.apply(t, n) as Array<ISnapShotRecord>;
      }, []))
      .then(data => data.map((d: ISnapShotRecord) => {
        // Create geometry for the items in our list
        return {
          geometry: { type: "point", x: d.latitude, y: d.longitude },
          symbol: { type: "simple-marker", color: [226, 119, 40] },
          attributes: {
            ObjectID: Guid.create().toString(),
            title: d.timestamp.toString(),
            latitude: String(d.latitude),
            longitude: String(d.longitude),
            gs: d.gs,
            alt: d.alt,
            type: d.type,
            timestamp: d.timestamp * 1000,
            flightNum: d.flightNum.split('/').pop().replace(/.json/, '')
          }
        }
      }))
      .then(data => data.sort((a, b) => a.attributes.timestamp - b.attributes.timestamp))
      .then(data => {
        console.log('Objects to map: ', data);

        this._featLayer = new FeatureLayer({
          title: 'Flight Layer',
          refreshInterval: 5,
          source: data,
          fields: [
            { name: "ObjectID", alias: "ObjectID", type: "oid" },
            { name: "title", alias: "title", type: "string" },
            { name: "latitude", alias: "Latitude", type: "string" },
            { name: "longitude", alias: "Longitude", type: "string" },
            { name: "timestamp", alias: "timeStamp", type: "date" },
            { name: "gs", alias: "gs", type: "integer" },
            { name: "alt", alias: "alt", type: "integer" },
            { name: "type", alias: "type", type: "string" },
            { name: "flightNum", alias: "flightNum", type: "string" }
          ],
          renderer: {
            type: "simple",  // autocasts as new SimpleRenderer()
            symbol: {
              type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
              size: 8,
              color: "black",
              outline: {  // autocasts as new SimpleLineSymbol()
                width: 0.5,
                color: "white"
              }
            }
          },
          popupTemplate: {
            title: "{flightNum} {timestamp}",
            content: [{
              type: "fields",
              fieldInfos: [
                { fieldName: "Latitude", label: "Latitude", visible: true },
                { fieldName: "Longitude", label: "Longitude", visible: true },
                { fieldName: "timestamp", label: "timestamp", visible: true },
                { fieldName: "gs", label: "gs", visible: true },
                { fieldName: "alt", label: "alt", visible: true },
                { fieldName: "type", label: "type", visible: true }
              ]
            }],
            fieldInfos: [
              { fieldName: "time", format: { dateFormat: "short-date-short-time" } }
            ]
          },
          timeExtent: {
            start: new Date(data[0].attributes.timestamp),
            end: new Date(data[data.length - 1].attributes.timestamp)
          },
          useViewTime: true,
          timeInfo: {
            startField: "timeStamp"
          }
        });
        this._map.add(this._featLayer);

        console.log('Feat Layer: ', this._featLayer);
      });


      // Initialize the MapView
      this._view = new EsriMapView({
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map: this._map
      });

      await this._view.when();
      // Build the time slider
      new TimeSlider({
        container: this.timeSliderDivEl.nativeElement,
        view: this._view,
        mode: "time-window",
        loop: true,
        playRate: 250,
        fullTimeExtent: this._featLayer.timeExtent,
        stops: {
          interval: {
            value: 30,
            unit: "seconds"
          }
        }
      });

      return this._view;
    } catch (error) {
      console.log("EsriLoader: ", error);
    }
  }

  filterByText(selectedText: string): void {
  }

  filterByCats(selectedCats: Array<any>): void {
  }

  ngOnInit() {
    this.initializeMap().then(mapView => {
      mapView.whenLayerView(this._featLayer)
      .then(layerView => {
        this._featLayerView = layerView;
        //layerView.watch("updating", (val) => {
        //  console.log(this._view);
        //});
      });

      this._loaded = this._view.ready;
      this.mapLoadedEvent.emit(true);
    });
  }

  ngOnDestroy() {
    if (this._view) {
      // destroy the map view
      this._view.container = null;
    }
  }
}
