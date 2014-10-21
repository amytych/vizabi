//Bubble Map
define([
    'jquery',
    'd3',
    'underscore',
    'base/component'
], function($, d3, _, Component) {

    var map, overlay, layer, projection, marker, data, displayData, padding = 10, radius = 4.5, stroke = 1.5;

    var BubbleMap = Component.extend({


        /*
         * INIT:
         * Executed once, before template loading
         */
        init: function(context, options) {
            this.name = 'bubble-map';
            this.template = "components/_gapminder/bubble-map/bubble-map";
            this.tool = context;

            this._super(context, options);
        },

        /*
         * POSTRENDER:
         * Executed after template is loaded
         * Ideally, it contains instantiations related to template
         */
        postRender: function() {
            year = this.model.getState('time');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == year); });

            // Create the Google Map…
            map = new google.maps.Map(d3.select("#bubble-map-holder").node(), {
              zoom: 5,
              center: new google.maps.LatLng(displayData[0].lat, displayData[0].lon),
              mapTypeId: google.maps.MapTypeId.TERRAIN
            });

            this.update();
        },


        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var _this = this;

            year = this.model.getState('time');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == year); });

            overlay = new google.maps.OverlayView();

            // Add the container when the overlay is added to the map.
            overlay.onAdd = function() {
                layer = d3.select(this.getPanes().overlayMouseTarget).append("div")
                    .attr("class", "bubble");

                // Draw each marker as a separate SVG element.
                // We could use a single SVG, but what size would it have?
                overlay.draw = function() {
                    projection = this.getProjection();

                    marker = layer.selectAll("svg")
                        .data(displayData)
                        .each(function (d) {
                            return _this.transform.call(this, d);
                        }) // update existing markers
                        .enter().append("svg:svg")
                        .each(function (d) {
                            return _this.transform.call(this, d);
                        })
                        .on('mouseover', function (d) {
                            _this.addHighlight.call(this, d);
                            _this.displayTooltip.call(this, d);
                        })
                        .on('mouseout', function (d) {
                            _this.removeHighlight.call(this, d);
                            _this.hideTooltip.call(this, d);
                        })
                        .attr("class", "marker");

                  // Add a circle.
                  marker.append("svg:circle")
                      .attr("r", radius)
                      .attr("cx", padding)
                      .attr("cy", padding);
                };
              };

              // Bind our overlay to the map…
              overlay.setMap(map);
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            //code here
        },

        transform: function (d) {
          d = new google.maps.LatLng(d.lat, d.lon);
          d = projection.fromLatLngToDivPixel(d);
          return d3.select(this)
              .attr("width", 20)
              .attr("height", 20)
              .style("left", (d.x - padding) + "px")
              .style("top", (d.y - padding) + "px");
      },

        addHighlight: function (d) {
            console.log(d.name, d['country.name'])
        },

        displayTooltip: function (d) {

        },

        removeHighlight: function (d) {
            console.clear()
        },

        hideTooltip: function (d) {

        }
    });

    return BubbleMap;

});