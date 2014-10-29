//Bubble Map
define([
    'jquery',
    'd3',
    'underscore',
    'base/component'
], function($, d3, _, Component) {

    var $infoDisplayCounter,
        map, overlay, layer, projection, bubble, bubbleEnter, visuals,
        shapesInitialized, bubblesInitialized,
        data, displayData, indicator, time, radiusScale, colorScale,
        radiusScaleRange = [3, 15], colorScaleRange = ['#7fb5f5', '#d70927'], bubbleStrokeWidth = 1.5;


    // Some handy helpers and accessors

    // Find the node in waffle data (displayData)
    // based on the name of feature property from geoJSON
    function _findD (name) {
        return _.find(displayData, function (elem) { return name == elem.name; });
    }

    function _getValue (d) {
        return d[indicator];
    }

    // radiusScale is always defined before calling
    function _getRadiusScale (d) {
        return radiusScale(_getValue(d));
    }

    // colorScale is always defined before calling
    function _getColorScale (d) {
        return colorScale(_getValue(d));
    }

    // visuals are always defined before calling
    function _bubblesVisible () {
        return visuals.indexOf('bubble') > -1;
    }

    // visuals are always defined before calling
    function _shapesVisible () {
        return visuals.indexOf('shape') > -1;
    }


    var BubbleMap = Component.extend({


        /*
         * INIT:
         * Executed once, before template loading
         */
        init: function(context, options) {
            this.name = 'bubble-map';
            this.template = 'components/_gapminder/bubble-map/bubble-map';
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

            time = this.model.getState('time');
            data = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });

            $infoDisplayCounter = $('#bubble-map-info-display-counter');

            // Create the Google Map…
            map = new google.maps.Map(document.getElementById('bubble-map-holder'), {
                zoom: 6,
                center: _this.getMapCenter(displayData),
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                mapTypeControl: false,
                streetViewControl: false
            });

            this.update();
        },


        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var min, max;

            time        = this.model.getState('time');
            indicator   = this.model.getState('indicator');
            visuals     = this.model.getState('visuals');
            data        = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });
            min         = d3.min(data, function(d) { return _getValue(d); });
            max         = d3.max(data, function(d) { return _getValue(d); });
            radiusScale = d3.scale.linear().domain([min, max]).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain([min, max]).range(colorScaleRange);

            // Load the GeoJSON, make sure it happens only once
            if (_shapesVisible() && !shapesInitialized) {
                this.initializeGeoShapes();
            }

            // Update styles for visible and hidden geo shapes
            this.styleGeoShapes();

            if (_bubblesVisible() && !bubblesInitialized) {
                this.initializeBubbles();
            }

            // layer is assigned upon initialization, this.drawBubbles() is also called then
            // no need to do it twice
            if (layer) {
                this.drawBubbles();
            }
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            var layout = this.getLayoutProfile(),
                zoom;

            switch(layout) {
                case 'small':
                    zoom = 6;
                    break;

                case 'medium':
                    zoom = 7;
                    break;

                case 'large':
                default:
                    zoom = 7;
            }
            // Center the map and set the zoom;
            map.setZoom(zoom);
            // map.setCenter(this.getMapCenter(displayData));
        },

        transform: function (d) {
            var pos = new google.maps.LatLng(d.lat, d.lon);
            pos = projection.fromLatLngToDivPixel(pos);

            return d3.select(this)
                .attr('width', function (d) { return (_getRadiusScale(d) + bubbleStrokeWidth) * 2; })
                .attr('height', function (d) { return (_getRadiusScale(d) + bubbleStrokeWidth) * 2; })
                .style('left', function (d) { return (pos.x - _getRadiusScale(d) + bubbleStrokeWidth * 2) + 'px'; })
                .style('top', function (d) { return (pos.y - _getRadiusScale(d) + bubbleStrokeWidth * 2) + 'px'; });
        },

        addHighlight: function (d) {
            var element = d3.select(this),
                circleEl = element.select('circle'),
                radius = circleEl.attr('r'),
                center = circleEl.attr('cx'),
                newRadius = radius - bubbleStrokeWidth;

            element.append('circle')
                .attr('r', newRadius > 0 ? newRadius : 0)
                .attr('cx', center)
                .attr('cy', center)
                .attr('class', 'inner inner1');

            newRadius -= 2;

            element.append('circle')
                .attr('r', newRadius > 0 ? newRadius : 0)
                .attr('cx', center)
                .attr('cy', center)
                .attr('class', 'inner');

            element.attr('class', 'bubble hover');

        },

        addTooltip: function (d) {
            var element = d3.select(this),
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
                .attr('x', bubbleStrokeWidth / 2)
                .attr('y', bubbleStrokeWidth / 2)
                .attr('width', tooltipWidth - bubbleStrokeWidth * 2)
                .attr('height', tooltipHeight - bubbleStrokeWidth * 2);

            textEl
                .attr('x', 5 + bubbleStrokeWidth)
                .attr('y', tooltipHeight - 10 - bubbleStrokeWidth);
        },

        addGeoTooltip: function (d, event) {

        },

        removeGeoTooltip: function (d) {

        },

        removeHighlight: function (d) {
            var element = d3.select(this);

            element
                .attr('class', 'bubble')
                .selectAll('.inner')
                .remove();
        },

        removeTooltip: function (d) {
            layer.select('.tooltip').remove();
        },

        // Just a mockup
        // Will do it properly when the data format will be confirmed
        displayData: function (d) {
            $infoDisplayCounter.text(_getValue(d));
        },

        hideData: function (d) {
            $infoDisplayCounter.text('');
        },

        getMapBounds: function (locations) {
            var bounds = new google.maps.LatLngBounds();
            _.each(locations, function (location) { bounds.extend( new google.maps.LatLng(location.lat, location.lon) ); });
            return bounds;
        },

        getMapCenter: function (locations) {
            var bounds = this.getMapBounds(locations);
            return bounds.getCenter();
        },

        initializeBubbles: function () {
            var _this = this;

            overlay = new google.maps.OverlayView();

            // Add the container when the overlay is added to the map.
            overlay.onAdd = function() {
                layer = d3.select(this.getPanes().overlayMouseTarget).append('div')
                    .attr('class', 'bubbles');

                // Draw each bubble as a separate SVG element.
                overlay.draw = function() {
                    projection = this.getProjection();
                    _this.drawBubbles();
                };
            };

            // Bind our overlay to the map…
            overlay.setMap(map);

            bubblesInitialized = true;
        },

        drawBubbles: function () {
            var _this = this;

            bubble = layer.selectAll('.bubble')
                .data(_bubblesVisible() ? displayData : [], function (d) {return d.geo; });

            // Create new bubbles
            bubbleEnter = bubble
                .enter().append('svg:svg')
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
                .attr('class', 'bubble');

            // Add a circle.
            bubbleEnter
                .append('svg:circle')
                .attr('cx', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('cy', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('id', function (d) { return d.geo; })
                .attr('fill', function (d) {return _getColorScale(d); })
                .attr('r', function (d) { return _getRadiusScale(d); });

            // Remove bubbles that are no longer in the data
            bubble.exit().remove();

            // Update existing bubbles
            bubble.each(function (d) { return _this.transform.call(this, d); })

            bubble.select('circle')
                .attr('cx', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('cy', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('id', function (d) { return d.geo; })
                .attr('fill', function (d) {return _getColorScale(d); })
                .transition()
                .duration(150)
                .attr('r', function (d) { return _getRadiusScale(d); });

        },

        initializeGeoShapes: function () {
            var _this = this,
                geoJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';

            map.data.loadGeoJson(geoJSONPath + '/data-waffles/bubble-map/en/geo_json_features.json');

            map.data.addListener('mouseover', function(event) {
                var d = _findD(event.feature.getProperty('name'));

                if (d) {
                    _this.displayData.call(this, d);
                    _this.addGeoTooltip.call(this, d, event);
                }

                map.data.overrideStyle(event.feature, {fillOpacity: 1});
             });

            map.data.addListener('mouseout', function(event) {
                var d = _findD(event.feature.getProperty('name'));

                if (d) {
                    _this.hideData.call(this, d);
                    _this.removeGeoTooltip.call(this, d);
                }

                map.data.revertStyle();
             });

            shapesInitialized = true;
        },

        styleGeoShapes: function () {
            if (_shapesVisible()) {
                map.data.setStyle(function(feature) {
                    var d = _findD(feature.getProperty('name')),
                        color = d ? _getColorScale(d) : 'transparent';

                    return {
                      fillColor: color,
                      fillOpacity: 0.7,
                      strokeWeight: 0.5,
                      strokeColor: '#333'
                    };
                });
            } else {
                map.data.setStyle(function(feature) {
                    return {
                      fillColor: 'transparent',
                      strokeWeight: 0,
                      strokeColor: 'transparent'
                    };
                });
            }
        }
    });

    return BubbleMap;

});