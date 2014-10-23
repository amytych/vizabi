//Bubble Map
define([
    'jquery',
    'd3',
    'underscore',
    'base/component'
], function($, d3, _, Component) {

    var $mapHolder, mapHolderWidth, mapHolderHeight,
        map, overlay, layer, projection, marker, markerEnter, data, displayData, padding = 12, radius = 5.5, stroke = 1.5;

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
            var _this = this;

            year = this.model.getState('time');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == year); });

            $mapHolder = $('#bubble-map-holder');
            mapHolderWidth = $mapHolder.width();
            mapHolderHeight = $mapHolder.height();

            // Create the Google Map…
            map = new google.maps.Map(d3.select("#bubble-map-holder").node(), {
              zoom: 5,
              center: new google.maps.LatLng(displayData[0].lat, displayData[0].lon),
              mapTypeId: google.maps.MapTypeId.TERRAIN
            });

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
                        .data(displayData, function (d) { return d.geo; })
                        .each(function (d) {
                            return _this.transform.call(this, d);
                        }) // update existing markers
                        .enter().append("svg:svg")
                        .each(function (d) {
                            return _this.transform.call(this, d);
                        })
                        .on('mouseenter', function (d) {
                            _this.addHighlight.call(this, d);
                            _this.displayTooltip.call(this, d);
                        })
                        .on('mouseleave', function (d) {
                            _this.removeHighlight.call(this, d);
                            _this.hideTooltip.call(this, d);
                        })
                        .attr("class", "marker");

                // Add a circle.
                marker.append("svg:circle")
                    .attr("r", function (d) {
                        return radius;
                    })
                    .attr("cx", padding)
                    .attr("cy", padding)
                    .attr("id", function (d) { return d.geo; });
                };
            };

            // Bind our overlay to the map…
            overlay.setMap(map);

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

            layer = d3.select('.bubble');

            marker = layer.selectAll(".marker")
                .data(displayData, function (d) { return d.geo; });

            markerEnter = marker
                .enter().append("svg:svg")
                .each(function (d) {
                    return _this.transform.call(this, d);
                })
                .on('mouseenter', function (d) {
                    _this.addHighlight.call(this, d);
                    _this.displayTooltip.call(this, d);
                })
                .on('mouseleave', function (d) {
                    _this.removeHighlight.call(this, d);
                    _this.hideTooltip.call(this, d);
                })
                .attr("class", "marker");

            // Add a circle.
            markerEnter.append("svg:circle")
                .attr("r", radius)
                .attr("cx", padding)
                .attr("cy", padding)
                .attr("id", function (d) { return d.geo; });

            marker.exit().remove();

            marker
                .each(function (d) {
                    return _this.transform.call(this, d);
                });

            // Add a circle.
            marker.select("circle")
                .attr("r", radius)
                .attr("cx", padding)
                .attr("cy", padding)
                .attr("id", function (d) { return d.geo; });
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
            d3.select(this).attr('class', 'marker hover');
        },

        displayTooltip: function (d) {
            var tooltip = layer.append('svg'), textWidth;

            tooltip.attr('class', 'tooltip');
            tooltip.append('rect');
            var text = tooltip
                .append('text')
                .attr('x', 5)
                .attr('y', 35)
                .text(d.name);

            textWidth = text[0][0].getBBox().width + 10;

            tooltip
                .style("left", 5 + "px")
                .style("top", (mapHolderHeight - 70) + "px")
                .attr('height', 40)
                .attr('width', textWidth)

            tooltip.select('rect')
                .attr('y', 20)
                .attr('width', textWidth)
                .attr('height', 20);
        },

        removeHighlight: function (d) {
            d3.select(this).attr('class', 'marker');
        },

        hideTooltip: function (d) {
            d3.select('.tooltip').remove();
        }
    });

    return BubbleMap;

});