import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

import { AppComponent } from "./app.component";
import { EsriMapComponent } from "./esri-map/esri-map.component";
// import { EsriFilterComponent } from "./esri-map/esri-filter.component";

@NgModule({
  declarations: [AppComponent,  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
