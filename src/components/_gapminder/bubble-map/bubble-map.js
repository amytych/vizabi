//Bubble Map
define([
    'jquery',
    'd3',
    'topojson',
    'lodash',
    'base/component'
], function($, d3, topojson, _, Component) {

    var width, height,
        $mapHolder, $infoDisplayCounter,
        projection, zoom, path, svg, g, overlay, tooltip,
        gmBubbleLayer, bubble, bubbleEnter,
        geoJSONData, districts, gmDistrictSVG, gmDistrictLayer, gmDistrict,
        d3MapInitialized,
        gmInitialized, gmOverlayInitialized, gmDistrictsInitialized, gmBubblesInitialized,
        data, currentData, indicator, time, radiusScale, colorScale, visuals, geoJSONPath, currentRender,
        radiusScaleRange = [3, 15], colorScaleRange = ['#7fb5f5', '#d70927'], bubbleStrokeWidth = 1.5;


    // Some handy helpers and getters

    // Find the node in waffle data (currentData)
    // based on the name of feature property from geoJSON
    function _findD (name) {
        return _.find(currentData, function (elem) { return name == elem.name; });
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

    function _renderOffline () {
        return typeof google === 'undefined' || renderType === 'offline';
    }

    // Turn the overlay projection into a d3 projection
    function _gmProjection (coordinates) {
        var googleCoordinates = new google.maps.LatLng(coordinates[1], coordinates[0]),
            pixelCoordinates = projection.fromLatLngToDivPixel(googleCoordinates);
        return [pixelCoordinates.x + 4000, pixelCoordinates.y + 4000];
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
            var _this = this,
                min, max;

            geoJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';
            geoJSONPath += '/data-waffles/bubble-map/en/topo_json_features.json';

            time        = this.model.time.value;
            indicator   = this.model.show.indicator;
            visuals     = this.model.show.visuals;
            panValue    = this.model.show.pan || [-8.3, 9];
            zoomValue   = this.model.show.zoom || 1;
            renderType  = this.model.show.render || 'online';
            data        = _.cloneDeep(this.model.data.getItems());
            currentData = data.filter(function(row) { return (row.time == time); });
            min         = d3.min(data, function(d) { return _getValue(d); });
            max         = d3.max(data, function(d) { return _getValue(d); });
            radiusScale = d3.scale.linear().domain([min, max]).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain([min, max]).range(colorScaleRange);

            // Needed for simple change of the rendering mode
            // it's just for the testing phase, to be removed in the final code
            currentRender = renderType;

            $mapHolder = $('#vzb-bm-holder');
            $infoDisplayCounter = $('#vzb-bm-info-counter');
            tooltip = d3.select('#vzb-bm-tooltip');

            width = $mapHolder.width();
            height = $mapHolder.height();

            if (_renderOffline()) {
                this.initializeD3Map();
            } else {
                this.initializeGMap();
            }
        },

        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var _this = this;

            time        = this.model.time.value;
            indicator   = this.model.show.indicator;
            visuals     = this.model.show.visuals;
            panValue    = this.model.show.pan || [-8.3, 9];
            zoomValue   = this.model.show.zoom || 1;
            renderType  = this.model.show.render || 'online';
            data        = _.cloneDeep(this.model.data.getItems());
            currentData = data.filter(function(row) { return (row.time == time); });
            min         = d3.min(data, function(d) { return _getValue(d); });
            max         = d3.max(data, function(d) { return _getValue(d); });
            radiusScale = d3.scale.linear().domain([min, max]).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain([min, max]).range(colorScaleRange);

            // If render type has changed, the map have to be initialized again
            // simply reload the page to take care of that
            // it's just for the testing phase, to be removed in the final code
            if (currentRender !== renderType) window.location.reload();

            if (_renderOffline()) {
                this.updateD3Map();
            } else {
                this.updateGMap();
            }
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            var _this = this,
                layout = this.getLayoutProfile(), s = 2200, t = [-2280, -3286];

            width = $mapHolder.width();
            height = $mapHolder.height();


            if (_renderOffline()) {
                svg.attr('width', width).attr('height', height);
                overlay.attr('width', width).attr('height', height);
            } else {
                // if (gmDistrictSVG) {
                //     gmDistrictSVG.attr('width', width).attr('height', height);
                // }
            }
        },

        initializeGMap: function () {
            var _this = this;

            // Create the Google Map…
            map = new google.maps.Map($mapHolder[0], {
                zoom: 6,
                center: _this.getMapCenter(currentData),
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                mapTypeControl: false,
                streetViewControl: false
            });

            gmInitialized = true;

            _this.update();
        },

        initializeGMapOverlay: function () {
            var _this = this;

            overlay = new google.maps.OverlayView();

            overlay.onAdd = function () {
                // Geo Shapes
                gmDistrictLayer = d3.select(this.getPanes().overlayMouseTarget).append('div')
                    .attr('class', 'vzb-bm-geoshape-overlay');
                gmDistrictSVG = gmDistrictLayer.append('svg:svg');

                // Bubbles
                gmBubbleLayer = d3.select(this.getPanes().overlayMouseTarget).append('div')
                    .attr('class', 'vzb-bm-bubble-overlay');

                overlay.draw = function () {
                    projection = this.getProjection();

                    if (_shapesVisible()) {
                        // Make sure that district JSON is loaded
                        if (!gmDistrictsInitialized) {
                            d3.json(geoJSONPath, _this.geoJSONCallback.bind(_this));
                        } else {
                            _this.drawGMapDistricts();
                        }
                    }

                    if (_bubblesVisible()) {
                        _this.drawGMapBubbles();
                        gmBubblesInitialized = true;
                    }
                };
            };

            overlay.setMap(map);

            gmOverlayInitialized = true;
        },

        updateGMap: function () {
            var _this = this;

            // Initialize google map overlay, when update() is called first time
            if (!gmOverlayInitialized) {
                _this.initializeGMapOverlay();
            }

            // gmDistrictLayer is assigned upon initialization, this.drawGMapDistricts() is also called then
            // no need to do it twice
            if (gmDistrictLayer) {
                // Make sure that district JSON is loaded
                if (!gmDistrictsInitialized) {
                    d3.json(geoJSONPath, _this.geoJSONCallback.bind(_this));
                } else {
                    _this.drawGMapDistricts();
                }
            }

            // gmBubbleLayer is assigned upon initialization, this.drawGMapBubbles() is also called then
            // no need to do it twice
            if (gmBubbleLayer) {
                _this.drawGMapBubbles();
            }
        },

        drawGMapBubbles: function () {
            var _this = this;

            bubble = gmBubbleLayer.selectAll('.vzb-bm-bubble-holder')
                .data(_bubblesVisible() ? currentData : [], function (d) { return d.geo; });

            // Create new bubbles
            bubbleEnter = bubble
                .enter().append('svg:svg')
                .attr('class', 'vzb-bm-bubble-holder');

            // Add a circle.
            bubbleEnter
                .append('svg:circle')
                .attr('class', 'vzb-bm-bubble')
                .on('mouseenter', function (d) {
                    _this.showData(d);
                    _this.addHighlight.call(this, d);
                })
                .on('mousemove', function (d) {
                    _this.showTooltip(d);
                })
                .on('mouseleave', function (d) {
                    _this.hideData();
                    _this.removeHighlight.call(this);
                    _this.hideTooltip();
                })
                .attr('r', function (d) { return _getRadiusScale(d); });

            // Remove bubbles that are no longer in the data
            bubble.exit().remove();

            // Update existing bubbles
            bubble.each(function (d) { return _this.transform.call(this, d); });

            bubble.select('circle')
                .attr('cx', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('cy', function (d) { return _getRadiusScale(d) + bubbleStrokeWidth; })
                .attr('id', function (d) { return d.geo; })
                .attr('fill', function (d) { return _getColorScale(d); })
                .transition()
                .duration(150)
                .attr('r', function (d) { return _getRadiusScale(d); });
        },

        /**
         * Draw districts on the google map
         * @return {Void}
         */
        drawGMapDistricts: function () {
            var _this = this,
                districts = [],
                path = d3.geo.path().projection(_gmProjection);

            if (_shapesVisible()) {
                districts = topojson.feature(geoJSONData, geoJSONData.objects.districts).features;
                // Filter districts based on currentData
                districts = _.filter(districts, function (district) { return _findD(district.properties.name); });
            }

            gmDistrict = gmDistrictSVG.selectAll('.vzb-bm-district')
                .data(districts, function (d) { return 'vzb-bm-district-' + d.properties.name; });

            // Create new districts
            gmDistrict
                .enter().append('svg:path')
                .attr('class', 'vzb-bm-district')
                .on('mouseenter', function (d) {
                    var d = _findD(d.properties.name);
                    if (d) {
                        _this.showData(d);
                    }
                })
                .on('mousemove', function (d) {
                    var d = _findD(d.properties.name);
                    if (d) {
                        _this.showTooltip(d);
                    }
                })
                .on('mouseleave', function (d) {
                    _this.hideData();
                    _this.hideTooltip();
                });

            // Remove districts that are no longer in the data
            gmDistrict.exit().remove();

            // Update exisiting districts
            gmDistrict
                .attr('d', path)
                .attr('fill', function (d) {
                    var d = _findD(d.properties.name),
                    color = d ? _getColorScale(d) : 'transparent';
                    return color;
                });
        },

        /**
         * Build the d3 world map and draw the districts
         * @return {Void}
         */
        initializeD3Map: function () {
            var _this = this,
                worldJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';

            worldJSONPath += '/data-waffles/bubble-map/en/world.json';

            projection = d3.geo.mercator()
                .scale((width - 1) / 2 / Math.PI)
                .translate([width / 2, height / 2]);

            zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(zoomValue)
                .scaleExtent([1, 400])
                .on('zoom', _this.zoomHandler);

            path = d3.geo.path()
                .projection(projection);

            svg = d3.select('#vzb-bm-holder').append('svg')
                .attr('width', width)
                .attr('height', height);

            overlay = svg.append('rect')
                  .attr('class', 'vzb-bm-background')
                  .attr('width', width)
                  .attr('height', height)
                  .on('click', _this.reset);

            g = svg.append('g');

            svg.call(zoom);

            // First, create the world
            d3.json(worldJSONPath, function(error, world) {
                if (error) return console.log(error);

                // Now, load the districts
                d3.json(geoJSONPath, function(error, geo) {
                    if (error) return console.log(error);

                    // Cache it for later use
                    geoJSONData = geo;

                    // Put all the countries on the map,
                    _this.drawD3World(world);

                    // Put all the districts on the map
                    _this.drawD3Districts(geo);

                    d3MapInitialized = true;

                    _this.update();
                });
            });

            _this.initializeZoomButtons();
        },

        /**
         * Update districts and bubbles on the map, and scale everyting accordingly
         * @return {Void}
         */
        updateD3Map: function () {
            if (d3MapInitialized) {
                // Udpdate the disctirct colors
                g.selectAll('.vzb-bm-district')
                    .data(districts, function (d) {return d.properties.name; })
                    .style('fill', function(d, i) {
                        var node = _findD(d.properties.name);
                        return node ? _getColorScale(node) : '#fff';
                    });

                // Update bubbles
                this.drawD3Bubbles();

                // Update scaling
                svg.call(zoom.event);
            }
        },

        /**
         * Create simple map of the world in d3
         * @param  {Object} world geoJSON data for the world
         * @return {Void}
         */
        drawD3World: function (world) {
            // Draw land
            g.append('path')
                .datum(topojson.merge(world, world.objects.countries.geometries))
                .attr('class', 'vzb-bm-land')
                .attr('d', path);

            // Draw countries borders
            g.append('path')
                .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                .attr('class', 'vzb-bm-boundary')
                .attr('d', path);
        },

        /**
         * Draw d3 bubbles on the map
         * @return {Void}
         */
        drawD3Bubbles: function () {
            var _this = this;

            bubble = g.selectAll('.vzb-bm-bubble')
                .data(_bubblesVisible() ? currentData : [], function (d) {return d.geo; });

            bubble
                .enter().append('circle')
                .attr('class', 'vzb-bm-bubble')
                .attr('cx', function(d) { return projection([d.lon, d.lat])[0]; })
                .attr('cy', function(d) { return projection([d.lon, d.lat])[1]; })
                .on('mouseenter', function (d) {
                    _this.showData(d);
                    _this.addHighlight.call(this, d);
                })
                .on('mousemove', function (d) {
                    _this.showTooltip(d);
                })
                .on('mouseleave', function (d) {
                    _this.hideData();
                    _this.removeHighlight.call(this);
                    _this.hideTooltip();
                });

            bubble.exit().remove();

            bubble
                .attr('fill', function (d) {return _getColorScale(d); })
                .attr('r', function (d) { return _getRadiusScale(d); });
        },

        /**
         * Draw d3 districts on the map
         * @param  {Object} geo geoJSON data
         * @return {Void}
         */
        drawD3Districts: function (geo) {
            var _this = this;

            districts = topojson.feature(geo, geo.objects.districts).features;

            // draw the (hidden) combined area of all districts…
            g.append('path')
                .datum(topojson.merge(geo, geo.objects.districts.geometries))
                .attr('class', 'vzb-bm-area')
                .attr('d', path);

            // and zoom to it all
            _this.zoomTo(d3.select('.vzb-bm-area').data()[0]);

            g.selectAll('.vzb-bm-district')
                .data(districts, function (d) { return d.properties.name; })
            .enter().append('path')
                .attr('class', 'vzb-bm-district')
                .attr('d', path)
                .style('fill', function(d, i) {
                    var node = _findD(d.properties.name),
                        color = node ? _getColorScale(node) : '#fff';
                    return color;
                })
                .on('mouseenter', function (d) {
                    var d = _findD(d.properties.name);

                    if (d) {
                        _this.showData(d);
                        // _this.addHighlight.call(this);
                    }
                })
                .on('mousemove', function (d) {
                    var d = _findD(d.properties.name);
                    if (d) {
                        _this.showTooltip(d);
                    }
                })
                .on('mouseleave', function (d) {
                    _this.hideData();
                    _this.hideTooltip();
                    // _this.removeHighlight.call(this);
                });
        },

        /**
         * Callback for loading geoJSON data
         * @param  {Object} error
         * @param  {Object} geo   GeoJSON data
         * @return {Void}
         */
        geoJSONCallback: function (error, geo) {
            if (error) return console.log(error);

            // Cache it for later use
            geoJSONData = geo;

            this.drawGMapDistricts();

            gmDistrictsInitialized = true;
        },

        /**
         * Show the name of the feature in the tooltip
         * @param  {Datum} d Node with the name
         * @return {Void}
         */
        showTooltip: function (d) {
            var host = svg ? svg.node() : $mapHolder[0],
                mouse = d3.mouse(host).map( function(d) { return parseInt(d); } );

            tooltip
                .classed('vzb-hidden', false)
                .attr('style', 'left:' + (mouse[0] + 10)+'px; top:' + (mouse[1] + 10) + 'px')
                .html(d.name || d.properties.name);
        },

        /**
         * Hide the tooltip with the name
         * @return {Void}
         */
        hideTooltip: function () {
            tooltip.classed('vzb-hidden', true);
        },

        /**
         * Highlight the element
         * @return {Void}
         */
        addHighlight: function (d) {
            d3.select(this).classed('vzb-bm-hover', true);
        },

        /**
         * Remove highlight from the element
         * @return {Void}
         */
        removeHighlight: function () {
            d3.select(this).classed('vzb-bm-hover', false);
        },

        /**
         * Update info box
         * @param  {Datum} d node with the data
         * @return {Void}
         */
        showData: function (d) {
            $infoDisplayCounter.text(_getValue(d));
        },

        /**
         * Reset info box
         * @return {Void}
         */
        hideData: function () {
            $infoDisplayCounter.text('');
        },

        /**
         * Returns Bounds for currentDisplay data
         * @param  {Array} locations currentDisplay data
         * @return {google.maps.LatLngBounds}
         */
        getMapBounds: function (locations) {
            var bounds = new google.maps.LatLngBounds();
            _.each(locations, function (location) { bounds.extend( new google.maps.LatLng(location.lat, location.lon) ); });
            return bounds;
        },

        /**
         * Returns LatLng center for currentDisplay data
         * @param  {Array} locations currentDisplay data
         * @return {google.maps.LatLng}
         */
        getMapCenter: function (locations) {
            var bounds = this.getMapBounds(locations);
            return bounds.getCenter();
        },

        /**
         * Zooms D3 map to fit area of the provided feature
         * @param  {Datum} d feature
         * @param  {Boolean} animate wheter zooming should be animated
         * @return {Void}
         */
        zoomTo: function (d, animate) {
            var bounds = path.bounds(d),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = .9 / Math.max(dx / width, dy / height),
                translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition()
                .duration(animate ? 750 : 0)
                .call(zoom.translate(translate).scale(scale).event);
        },

        /**
         * Zoom handler for map created with D3
         * @return {Void}
         */
        zoomHandler: function() {
            var scale = d3.event.scale;

            g.selectAll('.vzb-bm-bubble')
                .attr('r', function (d) { return _getRadiusScale(d) / scale; })
                .style('stroke-width', function (d) { return 1.5 / scale; })
            g.style('stroke-width', .5 / scale + 'px');
            g.attr('transform', 'translate(' + d3.event.translate + ')scale(' + scale + ')');
        },

        /**
         * Puts bubbles on the google maps and sizes them accordingly
         * @param  {Datum} d feature
         * @return {d3 Selection} transformed d3 selection
         */
        transform: function (d) {
             var pos = new google.maps.LatLng(d.lat, d.lon);
             pos = projection.fromLatLngToDivPixel(pos);

             return d3.select(this)
                 .attr('width', function (d) { return (_getRadiusScale(d) + bubbleStrokeWidth) * 2; })
                 .attr('height', function (d) { return (_getRadiusScale(d) + bubbleStrokeWidth) * 2; })
                 .style('left', function (d) { return (pos.x - _getRadiusScale(d) + bubbleStrokeWidth * 2) + 'px'; })
                 .style('top', function (d) { return (pos.y - _getRadiusScale(d) + bubbleStrokeWidth * 2) + 'px'; });
        },

        initializeZoomButtons: function () {
            var _this = this,
                $zoomIn = $('#vzb-bm-zoom-in'),
                $zoomOut = $('#vzb-bm-zoom-out');

                $zoomIn.on('click', _this.clickZoomHandler);
                $zoomOut.on('click', _this.clickZoomHandler);
        },

        clickZoomHandler: function (event) {
            event.preventDefault();
            var factor = this.id === 'vzb-bm-zoom-in' ? 1.4 : 0.6,
                scale = zoom.scale(),
                newScale = scale * factor,
                extent = zoom.scaleExtent(),
                center, translate, newTranslate;

            if (extent[0] <= newScale && newScale <= extent[1]) {
                translate = zoom.translate();
                center = [width / 2, height / 2];
                newTranslate = [
                    center[0] + (translate[0] - center[0]) / scale * newScale,
                    center[1] + (translate[1] - center[1]) / scale * newScale
                ];

                zoom
                    .scale(newScale)
                    .translate(newTranslate)
                    .event(svg.transition().duration(350));
            }
        }
    });

    return BubbleMap;

});