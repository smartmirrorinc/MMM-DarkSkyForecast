Module.register("MMM-DarkSkyForecast", {

  defaults: {
    apikey: "",
    latitude: "51.490230",
    longitude: "-0.258810",
    updateInterval: 10 * 60 * 1000, //5 minutes
    units: "ca",
    showCurrentConditions: true,
    showExtraCurrentConditions: true,
    showSummary: true,
    showHourlyForecast: true,
    hourlyForecastInterval: 3,
    maxHourliesToShow: 3,
    showDailyForecast: true,
    maxDailiesToShow: 3,
    showPrecipitation: true,
    concise: true,
    showWind: true,
    language: config.language,
    iconset: "1c",
    useAnimatedIcons: true,
    colored: true,
    layout: "tiled",
    showInlineIcons: true,
    mainIconSize: 100,
    forecastIconSize: 70,
    updateFadeSpeed: 500,
    label_maximum: "max",
    label_high: "H",
    label_low: "L",
    label_timeFormat: "h a",
    label_days: ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"],
    label_ordinals: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
  },

  getScripts: function() {
    return ["moment.js", this.file("skycons.js")];
  },

  getStyles: function () {
    return ["MMM-DarkSkyForecast.css"];
  },

  start: function() {

    Log.info("Starting module: " + this.name);

    this.loading = true;
    this.weatherData = null;
    this.iconCache = [];
    this.iconIdCounter = 0;

    if (this.config.useAnimatedIcons) {
      this.skycons = new Skycons({
        "monochrome": false,
        "colors" : {
          "main" : "#FFFFFF",
          "moon" : this.config.colored ? "#FFFDC2" : "#FFFFFF", 
          "fog" : "#FFFFFF",
          "fogbank" : "#FFFFFF",
          "cloud" : this.config.colored ? "#BEBEBE" : "#999999",
          "snow" : "#FFFFFF",
          "leaf" : this.config.colored ? "#98D24D" : "#FFFFFF",
          "rain" : this.config.colored ? "#7CD5FF" : "#FFFFFF",
          "sun" : this.config.colored ? "#FFD550" : "#FFFFFF"
        }
      });
    }


    //force icon set to mono version whern config.coloured = false
    if (this.config.colored == false) {
      this.config.iconset = this.config.iconset.replace("c","m");      
    }

    //start data poll
    this.getData();
    var self = this;

    setInterval(function() {
      self.getData();
    }, this.config.updateInterval);

  },

  getData: function() {
    this.sendSocketNotification("DARK_SKY_FORECAST_GET", {
      apikey: this.config.apikey,
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      units: this.config.units,
      language: this.config.language,
      instanceId: this.identifier
    });

  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == "DARK_SKY_FORECAST_DATA" && payload.instanceId == this.identifier) {

      //render weather data
      this.weatherData = payload;
      this.loading = false;
      this.updateDom(this.config.updateFadeSpeed);

      //start icon playback
      if (this.config.useAnimatedIcons) {
        var self = this;
        setTimeout(function() {
          self.playIcons(self);
        }, this.config.updateFadeSpeed);
      } 

    }
  },

  getDom: function() {

    var wrapper = document.createElement("div");
    wrapper.className = "wrapper " + this.config.layout + 
      " icon-set-" + this.config.iconset +
      (this.config.colored ? " colored" : "") +
      (this.config.showInlineIcons ? " inline-icons" : "");
    
    if (this.loading) {
      var loading = document.createElement("div");
      loading.innerHTML = this.translate("LOADING");
      loading.className = "dimmed light small";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (this.config.useAnimatedIcons) {
      this.clearIcons();
    }

    //current conditions
    if (this.config.showCurrentConditions) {

      var currentConditionsWrapper = document.createElement("div");
      currentConditionsWrapper.classList.add("current-conditions-wrapper");

      var currentConditionsIcon;

      if (this.config.useAnimatedIcons) {
        currentConditionsIcon = this.addIcon(this.weatherData.currently.icon, this.config.mainIconSize);
      } else {
        currentConditionsIcon = document.createElement("img");
        currentConditionsIcon.src = this.generateIconSrc(this.weatherData.currently.icon);
      }

      currentConditionsIcon.className = "current icon current";
      currentConditionsWrapper.appendChild(currentConditionsIcon);

      var currentTemp = document.createElement("span");
      currentTemp.className = "current temperature bright large light";
      currentTemp.innerHTML = Math.round(this.weatherData.currently.temperature) + "°";
      currentConditionsWrapper.appendChild(currentTemp);


      wrapper.appendChild(currentConditionsWrapper);
    }

    //extra current conditions
    if (this.config.showExtraCurrentConditions) {
      var extraCurrentConditionsWrapper = document.createElement("div");
      extraCurrentConditionsWrapper.className = "extra-current-conditions-wrapper small bright";

      //high/low temps
      var cTempContainer = document.createElement("span");
      cTempContainer.className = "today temperature-container";

      //high temperature
      var cHiTemp = document.createElement("span");
      cHiTemp.className = "today high-temperature";
      cHiTemp.innerHTML = (!this.config.concise ? this.config.label_high + " " : "") + Math.round(this.weatherData.daily.data[0].temperatureMax) + "°";
      cTempContainer.appendChild(cHiTemp);

      var cTempSeparator = document.createElement("span");
      cTempSeparator.className = "today temperature-separator dimmed";
      cTempSeparator.innerHTML = " / ";
      cTempContainer.appendChild(cTempSeparator);

      //low temperature
      var cLoTemp = document.createElement("span");
      cLoTemp.className = "today low-temperature";
      cLoTemp.innerHTML = (!this.config.concise ? this.config.label_low + " " : "") + Math.round(this.weatherData.daily.data[0].temperatureMin) + "°";
      cTempContainer.appendChild(cLoTemp);

      extraCurrentConditionsWrapper.appendChild(cTempContainer);


      //precipitation
      if (this.config.showPrecipitation) {        
        var cPrecipitationContainer = document.createElement("span");
        cPrecipitationContainer.className = "current precipitation";

        //inline icon
        if (this.config.showInlineIcons) {
          var cUmbrellaIcon = document.createElement("img");
          cUmbrellaIcon.className = "icon inline umbrella";
          cUmbrellaIcon.src = this.generateIconSrc("i-rain");
          cPrecipitationContainer.appendChild(cUmbrellaIcon);          
        } 

        //P.O.P.
        var cPOP = document.createElement("span");
        cPOP.className = "current pop";
        cPOP.innerHTML = Math.round(this.weatherData.currently.precipProbability * 100) + "%";
        cPrecipitationContainer.appendChild(cPOP);

        //accumulation
        if (!this.config.concise && this.weatherData.currently.precipProbability > 0) {          
          var cAccumulation = document.createElement("span");
          cAccumulation.className = "current accumulation";
          cAccumulation.innerHTML = " (" + (this.weatherData.currently.precipAccumulation ? Math.round(this.weatherData.currently.precipAccumulation) + " " + this.getUnit("accumulationSnow") : (Math.round(this.weatherData.currently.precipIntensity * 10) / 10) + " " + this.getUnit("accumulationRain") ) + ")";
          cPrecipitationContainer.appendChild(cAccumulation);
        }

        extraCurrentConditionsWrapper.appendChild(cPrecipitationContainer);
      }

      //wind
      if (this.config.showWind) {        
        var cWindContainer = document.createElement("span");
        cWindContainer.className = "current wind";

        //inline icon
        if (this.config.showInlineIcons) {
          var cWindIcon = document.createElement("img");
          cWindIcon.className = "icon inline wind-icon";
          cWindIcon.src = this.generateIconSrc("i-wind");
          cWindContainer.appendChild(cWindIcon);          
        } 

        //wind speed
        var cWind = document.createElement("span");
        cWind.className = "current wind-speed";
        cWind.innerHTML = Math.round(this.weatherData.currently.windSpeed) + " " + this.getUnit("windSpeed") + (!this.config.concise ? " " + this.getOrdinal(this.weatherData.currently.windBearing) : "");
        cWindContainer.appendChild(cWind);

        //wind gusts
        if (!this.config.concise && this.weatherData.currently.windGust) {          
          var cWindGusts = document.createElement("span");
          cWindGusts.className = "current wind-gusts";
          cWindGusts.innerHTML = " (" + this.config.label_maximum + " " + Math.round(this.weatherData.currently.windGust) + " " + this.getUnit("windSpeed") + ")";
          cWindContainer.appendChild(cWindGusts);
        }

        extraCurrentConditionsWrapper.appendChild(cWindContainer);
      }


      wrapper.appendChild(extraCurrentConditionsWrapper);

    }

    //summary
    if (this.config.showSummary) {

      var summaryWrapper = document.createElement("div");
      summaryWrapper.className = "summary-wrapper small";

      var summary = document.createElement("div");
      summary.classList.add("summary");

      if (this.config.concise) {
        summary.innerHTML = this.weatherData.hourly.summary;
      } else {
        summary.innerHTML = this.weatherData.minutely.summary + " " +
          this.weatherData.hourly.summary + " " +
          this.weatherData.daily.summary;     
      }

      summaryWrapper.appendChild(summary);

      wrapper.append(summaryWrapper);


    }

    //hourly forecast
    if (this.config.showHourlyForecast) {

      var hourlyWrapper = document.createElement("div");
      hourlyWrapper.className = "hourly forecast-container";

      var displayCounter = 0;
      var currentIndex = this.config.hourlyForecastInterval;
      while (displayCounter < this.config.maxHourliesToShow) {
        if (this.weatherData.hourly.data[currentIndex] == null) {
          break;
        } 
        var h = this.weatherData.hourly.data[currentIndex];

        var hItem = document.createElement("div");
        hItem.className = "hourly forecast-item";

        //time (e.g.: 5 pm)
        var hItemTime = document.createElement("span");
        hItemTime.className = "hourly time small bright";
        hItemTime.innerHTML = moment(h.time * 1000).format(this.config.label_timeFormat);
        hItem.appendChild(hItemTime);

        //icon
        var hItemIcon;
        if (this.config.useAnimatedIcons) {
          hItemIcon = this.addIcon(h.icon, this.config.forecastIconSize);
        } else {
          hItemIcon = document.createElement("img");
          hItemIcon.src = this.generateIconSrc(h.icon);
        }    
        hItemIcon.className = "hourly icon forecast";
        hItem.appendChild(hItemIcon);

        //temperature
        var hItemTemp = document.createElement("span");
        hItemTemp.className = "hourly temperature small";
        hItemTemp.innerHTML = Math.round(h.temperature) + "°";
        hItem.appendChild(hItemTemp);


        //precipitation
        if (this.config.showPrecipitation) {        
          var precipitationContainer = document.createElement("span");
          precipitationContainer.className = "hourly precipitation-container small";

          //inline icon
          if (this.config.showInlineIcons) {
            var hUmbrellaIcon = document.createElement("img");
            hUmbrellaIcon.className = "icon inline umbrella";
            hUmbrellaIcon.src = this.generateIconSrc("i-rain");
            precipitationContainer.appendChild(hUmbrellaIcon);          
          } 

          //P.O.P.
          var hItemPOP = document.createElement("span");
          hItemPOP.className = "hourly-pop";
          hItemPOP.innerHTML = Math.round(h.precipProbability * 100) + "%";
          precipitationContainer.appendChild(hItemPOP);

          //accumulation
          if (!this.config.concise && h.precipProbability > 0) {          
            var hItemAccumulation = document.createElement("span");
            hItemAccumulation.className = "hourly accumulation";
            hItemAccumulation.innerHTML = " (" + (h.precipAccumulation ? Math.round(h.precipAccumulation) + " " + this.getUnit("accumulationSnow") : (Math.round(h.precipIntensity * 10) / 10) + " " + this.getUnit("accumulationRain") ) + ")";
            precipitationContainer.appendChild(hItemAccumulation);
          }

          hItem.appendChild(precipitationContainer);
        }

        //wind
        if (this.config.showWind) {        
          var windContainer = document.createElement("span");
          windContainer.className = "hourly wind-container small";

          //inline icon
          if (this.config.showInlineIcons) {
            var hWindIcon = document.createElement("img");
            hWindIcon.className = "icon inline wind-icon";
            hWindIcon.src = this.generateIconSrc("i-wind");
            windContainer.appendChild(hWindIcon);          
          } 

          //wind speed
          var hItemWind = document.createElement("span");
          hItemWind.className = "hourly wind-speed";
          hItemWind.innerHTML = Math.round(h.windSpeed) + " " + this.getUnit("windSpeed") + (!this.config.concise ? " " + this.getOrdinal(h.windBearing) : "");
          windContainer.appendChild(hItemWind);

          //wind gusts
          if (!this.config.concise && h.windGust) {          
            var hItemWindGusts = document.createElement("span");
            hItemWindGusts.className = "hourly wind-gusts";
            hItemWindGusts.innerHTML = " (" + this.config.label_maximum + " " + Math.round(h.windGust) + " " + this.getUnit("windSpeed") + ")";
            windContainer.appendChild(hItemWindGusts);
          }

          hItem.appendChild(windContainer);
        }


        hourlyWrapper.appendChild(hItem);

        currentIndex += this.config.hourlyForecastInterval;
        displayCounter++;

      }

      wrapper.append(hourlyWrapper);
    }

    //daily forecast
    if (this.config.showDailyForecast) {
      var dailylyWrapper = document.createElement("div");
      dailylyWrapper.className = "daily forecast-container";

      for (var i = 1; i <= this.config.maxDailiesToShow; i++) {
        if (this.weatherData.daily.data[i] == null) {
          break;
        }

        var d = this.weatherData.daily.data[i];
        var dItem = document.createElement("div");
        dItem.className = "daily forecast-item";

        //day name
        var dDay = document.createElement("span");
        dDay.className = "daily day-name bright small";
        dDay.innerHTML = this.config.label_days[moment(d.time * 1000).format("d")];
        dItem.appendChild(dDay);

        //icon
        var dItemIcon;
        if (this.config.useAnimatedIcons) {
          dItemIcon = this.addIcon(d.icon, this.config.forecastIconSize);
        } else {
          dItemIcon = document.createElement("img");
          dItemIcon.src = this.generateIconSrc(d.icon);
        }    
        dItemIcon.className = "daily icon forecast";
        dItem.appendChild(dItemIcon);

        //temperature
        var dTempContainer = document.createElement("span");
        dTempContainer.className = "daily temperature-container small";

        //high temperature
        var dHiTemp = document.createElement("span");
        dHiTemp.className = "daily high-temperature";
        dHiTemp.innerHTML = (!this.config.concise ? this.config.label_high + " " : "") + Math.round(d.temperatureMax) + "°";
        dTempContainer.appendChild(dHiTemp);

        var dTempSeparator = document.createElement("span");
        dTempSeparator.className = "daily temperature-separator dimmed";
        dTempSeparator.innerHTML = " / ";
        dTempContainer.appendChild(dTempSeparator);

        //low temperature
        var dLoTemp = document.createElement("span");
        dLoTemp.className = "daily low-temperature";
        dLoTemp.innerHTML = (!this.config.concise ? this.config.label_low + " " : "") + Math.round(d.temperatureMin) + "°";
        dTempContainer.appendChild(dLoTemp);

        dItem.appendChild(dTempContainer);


        //precipitation
        if (this.config.showPrecipitation) {
          var dPrecipContainer = document.createElement("span");
          dPrecipContainer.className = "daily precipitation-container small";

          //inline icon
          if (this.config.showInlineIcons) {
            var dUmbrellaIcon = document.createElement("img");
            dUmbrellaIcon.className = "icon inline umbrella";
            dUmbrellaIcon.src = this.generateIconSrc("i-rain");
            dPrecipContainer.appendChild(dUmbrellaIcon);          
          } 

          //POP
          var dPOP = document.createElement("span");
          dPOP.className = "daily pop";
          dPOP.innerHTML = Math.round(d.precipProbability * 100) + "%";
          dPrecipContainer.appendChild(dPOP);

          //accumulation
          if (!this.config.concise && d.precipProbability > 0) {
            var dItemAccumulation = document.createElement("span");
            dItemAccumulation.className = "daily accumulation";
            dItemAccumulation.innerHTML = " (" + (d.precipAccumulation ? Math.round(d.precipAccumulation) + " " + this.getUnit("accumulationSnow") : (Math.round(d.precipIntensityMax * 10) / 10) + " " + this.getUnit("accumulationRain") ) + ")";
              dPrecipContainer.appendChild(dItemAccumulation);
          }

          dItem.appendChild(dPrecipContainer);          
        }

        //wind
        if (this.config.showWind) {
          var dWindContainer = document.createElement("span");
          dWindContainer.className = "daily wind-container small";

          //inline icon
          if (this.config.showInlineIcons) {
            var DWindIcon = document.createElement("img");
            DWindIcon.className = "icon inline wind-icon";
            DWindIcon.src = this.generateIconSrc("i-wind");
            dWindContainer.appendChild(DWindIcon);          
          } 

          //wind speed
          var dWindSpeed = document.createElement("span");
          dWindSpeed.className = "daily wind-speed";
          dWindSpeed.innerHTML = Math.round(d.windSpeed) + " " + this.getUnit("windSpeed") + (!this.config.concise ? " " + this.getOrdinal(d.windBearing) : "");
          dWindContainer.appendChild(dWindSpeed);

          //wind gust
          if (!this.config.concise && d.windGust) {
            var dWindGust = document.createElement("span");
            dWindGust.className = "daily wind-gusts";
            dWindGust.innerHTML = " (" + this.config.label_maximum + " " + Math.round(d.windGust) + " " + this.getUnit("windSpeed") + ")";
            dWindContainer.appendChild(dWindGust);
          } 

          dItem.appendChild(dWindContainer);
        }

        dailylyWrapper.appendChild(dItem);

      }

      wrapper.appendChild(dailylyWrapper);
    }


    return wrapper;


  },

  getUnit(metric) {
    return this.units[metric][this.weatherData.flags.units];
  },

  getOrdinal(bearing) {
    return this.config.label_ordinals[Math.round(bearing * 16 / 360) % 16];
  },

  units: {
    accumulationRain: {
      si: "mm",
      ca: "mm",
      uk2: "mm",
      us: "in"
    },
    accumulationSnow: {
      si: "cm",
      ca: "cm",
      uk2: "cm",
      us: "in"
    },
    windSpeed: {
      si: "m/s",
      ca: "km/h",
      uk2: "mph",
      us: "mph"
    }
  },

  iconsets: {
    "1m": {path:"1m", format:"svg"},
    "1c": {path:"1c", format:"svg"},
    "2m": {path:"2m", format:"svg"},
    "2c": {path:"2c", format:"svg"},
    "3m": {path:"3m", format:"svg"},
    "3c": {path:"3c", format:"svg"},
    "4m": {path:"4m", format:"svg"},
    "4c": {path:"4c", format:"svg"},
    "5m": {path:"5m", format:"svg"},
    "5c": {path:"5c", format:"svg"},
  },

  generateIconSrc: function(icon) {
    return this.file("icons/" + this.iconsets[this.config.iconset].path + "/" +
        icon + "." + this.iconsets[this.config.iconset].format);

  },

  clearIcons: function() {
    this.skycons.pause();
    this.iconCache.forEach(function(icon) {
      this.skycons.remove(icon.id);
    });
    this.iconCache = [];
    this.iconIdCounter = 0;
  },

  addIcon: function(icon, size) {

    //id to use for the canvas element
    var iconId = "skycon_" + this.iconIdCounter;

    //add id and icon name to cache
    this.iconCache.push({
      "id" : iconId,
      "icon" : icon
    });

    //build canvas elemenet
    var iconElem = document.createElement("canvas");
    iconElem.id = iconId;
    iconElem.width = size;
    iconElem.height = size;        
    this.iconIdCounter++; 

    return iconElem;
  },

  playIcons: function(inst) {
    /*
      name is a bit misleading. We needed to wait until
      the canvas elements got added to the Dom, which doesn't
      happen until after getDom finishes executing.
    */
    inst.iconCache.forEach(function(icon) {
      inst.skycons.add(icon.id, icon.icon);
    });
    inst.skycons.play();

  }


});