//Bubble Map
define([
    'jquery',
    'd3',
    'underscore',
    'base/component'
], function($, d3, _, Component) {

    var $mapHolder, $infoDisplayCounter, mapHolderWidth, mapHolderHeight,
        map, overlay, layer, projection, marker, markerEnter,
        data, displayData, indicator, time, min, max, radiusScale,
        markerWidth = 15, markerHeight = 15, markerStrokeWidth = 1.5,
        padding = markerWidth / 2, radius = markerWidth / 2 - markerStrokeWidth;

    // Once the data is in correct and finalised format
    // this wont be needed
    function getValue (d) {
        return d['cases'] || d['suspected_cases'] || d['reported_cases'] || 0;
    }

    function getScale (d) {
        return radiusScale(getValue(d));
    }

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
            var _this = this,
                mapCenter;

            time = this.model.getState('time');
            indicator = this.model.getState('indicator');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });
            min = d3.min(displayData, function(d) { return getValue(d); });
            max = d3.max(displayData, function(d) { return getValue(d); });
            radiusScale = d3.scale.linear()
                .domain([min, max])
                .range([5, 10]);


            $mapHolder = $('#bubble-map-holder');
            $infoDisplayCounter = $('#bubble-map-info-display-counter');

            mapHolderWidth = $mapHolder.width();
            mapHolderHeight = $mapHolder.height();

            mapCenter = this.getMapCenter(displayData);

            // Create the Google Map…
            map = new google.maps.Map(d3.select("#bubble-map-holder").node(), {
              zoom: 6,
              center: new google.maps.LatLng(mapCenter.lat(), mapCenter.lng()),
              mapTypeId: google.maps.MapTypeId.TERRAIN,
              mapTypeControl: false,
              streetViewControl: false
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
                            _this.displayData.call(this, d);
                            _this.addHighlight.call(this, d);
                            _this.addTooltip.call(this, d);
                        })
                        .on('mouseleave', function (d) {
                            _this.hideData.call(this, d);
                            _this.removeHighlight.call(this, d);
                            _this.removeTooltip.call(this, d);
                        })
                        .attr("class", "marker");

                    // Add a circle.
                    marker.append("svg:circle")
                        .attr("cx", function (d) { return getScale(d) + markerStrokeWidth; })
                        .attr("cy", function (d) { return getScale(d) + markerStrokeWidth; })
                        .attr("id", function (d) { return d.geo; })
                        .transition()
                        .duration(150)
                        .attr("r", function (d) { return getScale(d); });
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

            time = this.model.getState('time');
            indicator = this.model.getState('indicator');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });
            min = d3.min(displayData, function(d) { return getValue(d); });
            max = d3.max(displayData, function(d) { return getValue(d); });
            radiusScale = d3.scale.linear()
                .domain([min, max])
                .range([5, 10]);


            layer = d3.select('.bubble');

            marker = layer.selectAll(".marker")
                .data(displayData, function (d) { return d.geo; });

            markerEnter = marker
                .enter().append("svg:svg")
                .each(function (d) {
                    return _this.transform.call(this, d);
                })
                .on('mouseenter', function (d) {
                    _this.displayData.call(this, d);
                    _this.addHighlight.call(this, d);
                    _this.addTooltip.call(this, d);
                })
                .on('mouseleave', function (d) {
                    _this.hideData.call(this, d);
                    _this.removeHighlight.call(this, d);
                    _this.removeTooltip.call(this, d);
                })
                .attr("class", "marker");

            // Add a circle.
            markerEnter.append("svg:circle")
                .attr("cx", function (d) { return getScale(d) + markerStrokeWidth; })
                .attr("cy", function (d) { return getScale(d) + markerStrokeWidth; })
                .attr("id", function (d) { return d.geo; })
                .transition()
                .duration(150)
                .attr("r", function (d) { return getScale(d); });

            marker.exit().remove();

            marker
                .each(function (d) {
                    return _this.transform.call(this, d);
                });

            marker.select("circle")
                .attr("cx", function (d) { return getScale(d) + markerStrokeWidth; })
                .attr("cy", function (d) { return getScale(d) + markerStrokeWidth; })
                .attr("id", function (d) { return d.geo; })
                .transition()
                .duration(150)
                .attr("r", function (d) { return getScale(d); });
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
            var pos = new google.maps.LatLng(d.lat, d.lon),
                pos = projection.fromLatLngToDivPixel(pos);

            return d3.select(this)
                .attr("width", function (d) { return (getScale(d) + markerStrokeWidth) * 2; })
                .attr("height", function (d) { return (getScale(d) + markerStrokeWidth) * 2; })
                .style("left", function (d) { return (pos.x - getScale(d) + markerStrokeWidth * 2) + "px"; })
                .style("top", function (d) { return (pos.y - getScale(d) + markerStrokeWidth * 2) + "px"; });
        },

        addHighlight: function (d) {
            d3.select(this).attr('class', 'marker hover');
        },

        addTooltip: function (d) {
            var element = d3.select(this),
                circleEl = element.select('circle'),
                tooltipEl, backgroundEl, textEl,
                leftOffset, topOffset,
                tooltipWidth, tooltipHeight;

            // Create and append tooltip holder
            tooltipEl = layer.append('svg')
                .attr('class', 'tooltip');

            // Create and append tooltip background
            backgroundEl = tooltipEl.append('rect');

            // Create and append tooltip text
            textEl = tooltipEl.append('text')
                .text(d.name);

            // Now that all elements are in place,
            // determine width and height of the tooltip
            tooltipWidth = textEl[0][0].getBBox().width + 15;
            tooltipHeight = textEl[0][0].getBBox().height + 15;

            // Having width and height, calculate tooltip offset
            leftOffset = parseFloat(element.style('left')) - tooltipWidth / 2 + parseInt(element.attr('width'), 10) / 2;
            topOffset = parseFloat(element.style('top')) - tooltipHeight;

            // Set size and positioning for background and text
            tooltipEl
                .attr('width', tooltipWidth)
                .attr('height', tooltipHeight)
                .style('left', leftOffset + 'px')
                .style('top', topOffset + 'px');

            backgroundEl
                .attr('x', markerStrokeWidth / 2)
                .attr('y', markerStrokeWidth / 2)
                .attr('width', tooltipWidth - markerStrokeWidth * 2)
                .attr('height', tooltipHeight - markerStrokeWidth * 2);

            textEl
                .attr('x', 5 + markerStrokeWidth)
                .attr('y', tooltipHeight - 10 - markerStrokeWidth);
        },

        removeHighlight: function (d) {
            d3.select(this).attr('class', 'marker');
        },

        removeTooltip: function (d) {
            layer.select('.tooltip').remove();
        },

        // Just a mockup
        // Will do it properly when the data format will be confirmed
        displayData: function (d) {
            $infoDisplayCounter.text(d.cases || d.suspected_cases || 'No data');
        },

        hideData: function (d) {
            $infoDisplayCounter.text('');
        },

        getMapCenter: function (locations) {
            var bound = new google.maps.LatLngBounds();
            _.each(locations, function (location) { bound.extend( new google.maps.LatLng(location.lat, location.lon) ); })
            return bound.getCenter();
        }
    });

    return BubbleMap;

});