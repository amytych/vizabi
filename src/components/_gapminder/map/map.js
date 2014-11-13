//Bubble Map
define([
    'd3',
    'lodash',
    'topojson',
    'base/component'
], function(d3, _, topojson, Component) {

    var mapWidth,
        mapHeight,
        mapHolder,
        infoDisplay,
        projection,
        zoom,
        path,
        svg,
        svgLayer,
        tooltip,
        geoJSONPath,
        geoJSONData,
        worldJSONData,
        gmBubbleLayer,
        gmOverlayInitialized,
        mapInitialized,
        currentData,
        indicator,
        radiusScale,
        colorScale,
        visuals,
        currentRender,
        hovered,
        bubbleStrokeWidth = 1.5;

    // Some handy helpers and getters

    // Find the node in waffle data (currentData)
    // based on the name of feature property from geoJSON
    // Probably won't be needed in the final data set
    function _findD (name) {
        return _.find(currentData, function (elem) { return name == elem.name; });
    }

    // get the vaule for the indicator
    // may also not be needed after final data set is stnadardized
    function _getValue (d) {
        return d[indicator];
    }

    // radiusScale is always defined before calling
    function _getRadius (d) {
        return radiusScale(_getValue(d));
    }

    // colorScale is always defined before calling
    function _getColor (d) {
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

    function _renderOnline () {
        return typeof google !== 'undefined' && renderType === 'online';
    }

    // Turn the google map overlay projection into a d3 projection
    function _gmProjection (coordinates) {
        var googleCoordinates = new google.maps.LatLng(coordinates[1], coordinates[0]),
            pixelCoordinates = projection.fromLatLngToDivPixel(googleCoordinates);

        // SVG holding districts on a map is huge,
        // 8000x8000 and offseted by -4000px top and left
        // it has to be like that to accomodate high zoom levels
        // otherwise districts may be truncated when zooming
        // hence the pixel coordinates need to take this into account
        return [pixelCoordinates.x + 4000, pixelCoordinates.y + 4000];
    }


    var BubbleMap = Component.extend({


        /**
         * Initializes the bubble map
         * @param config component configuration
         * @param context component context (parent)
         */
        init: function(config, context) {
            this.name = 'map';
            this.template = 'components/_gapminder/' + this.name + '/' + this.name;
            this._super(config, context);
        },

        /*
         * POSTRENDER:
         * Executed after template is loaded
         * Ideally, it contains instantiations related to template
         */
        postRender: function() {
            // TODO: Setup appropriate json path, local or dropbox
            // obviously to be removed in final version
            geoJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';
            geoJSONPath += '/data-waffles/map/en/topo_json_features.json';

            // TODO: Needed for simple change of the rendering mode
            // it's just for the testing phase, to be removed in the final code
            renderType  = this.model.show.render || 'online';
            currentRender = renderType;

            // Cache needed DOM nodes
            mapHolder = document.getElementById('vzb-bm-holder');
            infoDisplay = d3.select('#vzb-bm-info-text');
            tooltip = d3.select('#vzb-bm-tooltip');

            this.initializeMap();
        },

        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var _this = this,
                radiusScaleRange = this.getRadiusScaleRange(),
                colorScaleRange = ['#7fb5f5', '#d70927'],
                extremes;

            indicator   = this.model.show.indicator;
            visuals     = this.model.show.visuals;
            currentData = this.getCurrentData();
            extremes    = this.getExtremes();
            radiusScale = d3.scale.linear().domain(extremes).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain(extremes).range(colorScaleRange);

            // If render type has changed, the map have to be initialized again
            renderType  = this.model.show.render || 'online';
            if (currentRender !== renderType) {
                currentRender = renderType;
                this.reinitializeMap();
                return;
            }

            this.updateMap();
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            // Just resize the SVG map holder and the overlay
            if (!_renderOnline()) {
                mapWidth = mapHolder.offsetWidth;
                mapHeight = mapHolder.offsetHeight;

                svg.attr('width', mapWidth).attr('height', mapHeight);
            }
        },

        initializeMap: function () {
            if (_renderOnline()) {
                this.initializeGMap();
            } else {
                this.initializeD3Map();
            }
        },

        updateMap: function () {
            if (_renderOnline()) {
                this.updateGMap();
            } else {
                this.updateD3Map();
            }
        },

        destroyMap: function () {
            if (_renderOnline()) {
                this.destroyD3Map();
            } else {
                this.destroyGMap();
            }
        },

        reinitializeMap: function () {
            this.destroyMap();
            this.initializeMap();
        },

        initializeGMap: function () {
            /** @constructor */
            function CoordMapType(tileSize) {
                this.tileSize = tileSize;
            }

            CoordMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
                var div = ownerDocument.createElement('div');
                div.innerHTML = coord;
                div.style.width = this.tileSize.width + 'px';
                div.style.height = this.tileSize.height + 'px';
                div.style.fontSize = '10';
                div.style.borderStyle = 'solid';
                div.style.borderWidth = '1px';
                div.style.color = '#f00';
                div.style.backgroundColor = 'rgba(255,0,0,.2)';
                return div;
            };

            map = new google.maps.Map(mapHolder, {
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                mapTypeControl: false,
                streetViewControl: false
            });

            // Insert this overlay map type as the first overlay map type at
            // position 0. Note that all overlay map types appear on top of
            // their parent base map.
            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));

            // fit map bounds to accomodate currentData
            map.fitBounds(this.getMapBounds(this.getCurrentData()));

            // attach zoom events, to display additional features
            google.maps.event.addListener(map, 'zoom_changed', this.gMapZoomHandler);

            d3.select(mapHolder).on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            this.update();
        },

        destroyGMap: function () {
            map = null;
            gmOverlayInitialized = false;
            d3.select(mapHolder)
            // .on('mousemove.mapMouseMove', null)
            .attr('style', '')
            .selectAll('*')
            .remove();
        },

        initializeGMapOverlay: function () {
            var _this = this,
                gmOverlay = new google.maps.OverlayView();

            gmOverlay.onAdd = function () {
                var panes = this.getPanes().overlayMouseTarget;

                // Geo Shapes
                svgLayer = d3.select(panes).append('svg:svg')
                    .attr('class', 'vzb-bm-geoshape-overlay');

                // Bubbles
                gmBubbleLayer = d3.select(panes).append('div')
                    .attr('class', 'vzb-bm-bubble-overlay');

                gmOverlay.draw = function () {
                    projection = this.getProjection();

                    if (_shapesVisible()) {
                        // Make sure that district JSON is loaded
                        if (!geoJSONData) {
                            d3.json(geoJSONPath, _this.geoJSONCallback.bind(_this));
                        } else {
                            _this.drawDistricts();
                        }
                    }

                    if (_bubblesVisible()) {
                        _this.drawBubbles();
                    }
                };
            };

            gmOverlay.setMap(map);
            gmOverlayInitialized = true;
        },

        updateGMap: function () {
            var _this = this;

            // Initialize google map overlay, when update() is called first time
            if (!gmOverlayInitialized) {
                _this.initializeGMapOverlay();
                return;
            }

            // svgLayer is assigned upon initialization, this.drawGMapDistricts() is also called then
            // no need to do it twice
            if (svgLayer) {
                // Make sure that district JSON is loaded
                if (!geoJSONData) {
                    d3.json(geoJSONPath, this.geoJSONCallback.bind(this));
                } else {
                    _this.drawDistricts();
                }
            }

            // gmBubbleLayer is assigned upon initialization, this.drawBubbles() is also called then
            // no need to do it twice
            if (gmBubbleLayer) {
                _this.drawBubbles();
            }
        },

        /**
         * Build the d3 world map and draw the districts
         * @return {Void}
         */
        initializeD3Map: function () {
            var _this = this,
                worldJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';

            worldJSONPath += '/data-waffles/map/en/world.json';

            mapWidth = mapHolder.offsetWidth;
            mapHeight = mapHolder.offsetHeight;

            projection = d3.geo.mercator()
                .scale((mapWidth - 1) / 2 / Math.PI)
                .translate([mapWidth / 2, mapHeight / 2]);

            zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(1)
                .scaleExtent([1, 400])
                .on('zoom', _this.d3MapZoomHandler);

            path = d3.geo.path()
                .projection(projection);

            svg = d3.select(mapHolder).append('svg')
                .attr('width', mapWidth)
                .attr('height', mapHeight)
                .on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            svgLayer = svg.append('g');

            svg.call(zoom);

            if (!worldJSONData) {
                // First, create the world
                d3.json(worldJSONPath, function(error, world) {
                    if (error) return console.error(error);
                    worldJSONData = world;
                    _this.drawD3World();
                });
            } else {
                _this.drawD3World();
            }

            if (!geoJSONData) {
                // Load the districts
                d3.json(geoJSONPath, _this.geoJSONCallback.bind(_this));
            } else {
                _this.drawDistricts();
            }

            // Add zooming functionality to buttons
            d3.selectAll('.vzb-bm-zoom').on('click.zoomClick', _this.clickZoomHandler);
            this.update();
        },

        destroyD3Map: function () {
            // Remove event listeners
            d3.selectAll('.vzb-bm-zoom').on('click.zoomClick', null);
            svg.on('mousemove.mapMouseMove', null);
            mapInitialized = false;
            d3.select(mapHolder).selectAll('*').remove();
        },

        /**
         * Update districts and bubbles on the map, and scale everyting accordingly
         * @return {Void}
         */
        updateD3Map: function () {
            if (!geoJSONData) {
                // Load the districts
                d3.json(geoJSONPath, this.geoJSONCallback.bind(this));
            } else {
                this.drawDistricts();
            }

            // Update bubbles
            this.drawBubbles();

            // Update scaling
            svg.call(zoom.event);
        },

        /**
         * Create simple map of the world in d3
         * @return {Void}
         */
        drawD3World: function () {
            var combinedArea;

            // draw the (hidden) combined area of all districts…
            combinedArea = svgLayer.insert('path', ':first-child')
                .datum(topojson.merge(geoJSONData, geoJSONData.objects.districts.geometries))
                .attr('class', 'vzb-bm-area')
                .attr('d', path);

            // and zoom to it all
            this.zoomTo(combinedArea.data()[0]);

            // Draw countries borders
            svgLayer.insert('path', ':first-child')
                .datum(topojson.mesh(worldJSONData, worldJSONData.objects.countries, function(a, b) { return a !== b; }))
                .attr('class', 'vzb-bm-boundary')
                .attr('d', path);

            // Draw land
            svgLayer.insert('path', ':first-child')
                .datum(topojson.merge(worldJSONData, worldJSONData.objects.countries.geometries))
                .attr('class', 'vzb-bm-land')
                .attr('d', path);
        },

        drawBubbles: function () {
            var _this = this,
                bubble, bubbleEnter,
                layer, wrapper, cx, cy;

            // Define differences between d3 map and google map
            if (_renderOnline()) {
                layer = gmBubbleLayer;
                wrapper = 'svg:svg';
                cx = cy = function (d) { return _getRadius(d) + bubbleStrokeWidth; }
            } else {
                layer = svgLayer;
                wrapper = 'svg:g';
                cx = function(d) { return projection([d.lon, d.lat])[0]; }
                cy = function(d) { return projection([d.lon, d.lat])[1]; }
            }

            bubble = layer.selectAll('.vzb-bm-bubble-holder')
                .data(_bubblesVisible() ? currentData : [], function (d) { return d.geo; });

            // Create new bubbles
            bubbleEnter = bubble
                .enter()
                // Google map needs svg for every bubble
                // d3 could do without it, it's just for compatibility's sake
                .append(wrapper)
                .attr('class', 'vzb-bm-bubble-holder');

            // Add a circle.
            bubbleEnter
                .append('svg:circle')
                .attr('class', 'vzb-bm-bubble')
                .attr('data-name', function (d) { return d.name.toLowerCase().split(' ').join('_'); })
                .attr('r', _getRadius);

            // Remove bubbles that are no longer in the data
            bubble.exit().remove();

            // Update existing bubbles
            if (_renderOnline()) {
                // Position and size google maps bubbles
                bubble
                  .attr('width', function (d) { return (_getRadius(d) + bubbleStrokeWidth) * 2; })
                  .attr('height', function (d) { return (_getRadius(d) + bubbleStrokeWidth) * 2; })
                  .each(_this.transform);
            }

            bubble.select('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('fill', _getColor)
                // TODO: Fix transition and zoom scaling problem for d3 bubbles
                // .transition()
                // .duration(150)
                .attr('r', _getRadius);
        },

        /**
         * Draw districts on the map, google map or offline map
         * @return {Void}
         */
        drawDistricts: function () {
            var _this = this,
                districts = [],
                district,
                // get appropriate path, if it's d3 map it was defined already
                p = _renderOnline() ? d3.geo.path().projection(_gmProjection) : path;


            if (_shapesVisible()) {
                districts = topojson.feature(geoJSONData, geoJSONData.objects.districts).features;
                // Filter districts based on currentData
                districts = _.filter(districts, function (district) { return _findD(district.properties.name); });
            }

            district = svgLayer.selectAll('.vzb-bm-district')
                .data(districts, function (d) { return 'vzb-bm-district-' + d.properties.name.toLowerCase().split(' ').join('_'); });

            // Create new districts
            district
                .enter().insert('svg:path', '.vzb-bm-bubble-holder')
                .attr('class', 'vzb-bm-district')
                .attr('data-name', function (d) { return d.properties.name.toLowerCase().split(' ').join('_'); });

            // Remove districts that are no longer in the data
            district.exit().remove();

            // Update exisiting districts
            district
                .attr('d', p)
                .attr('fill', function (d) {
                    var d = _findD(d.properties.name),
                    color = d ? _getColor(d) : 'transparent';
                    return color;
                });
        },

        /**
         * Callback for loading geoJSON data
         * @param  {Object} error
         * @param  {Object} geo   GeoJSON data
         * @return {Void}
         */
        geoJSONCallback: function (error, geo) {
            if (error) return console.error(error);

            // Cache it for later use
            geoJSONData = geo;

            this.drawDistricts();
        },

        /**
         * Show the name of the feature in the tooltip
         * @param  {Datum} d Node with the name
         * @return {Void}
         */
        showTooltip: function (d) {
            var host = svg ? svg.node() : mapHolder,
                mouse = d3.mouse(host).map( function(d) { return parseInt(d) + 10; } );

            tooltip
                .classed('vzb-hidden', false)
                .style('left', mouse[0] + 'px')
                .style('top', mouse[1] + 'px')
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
         * Highlight the elements when mobing over the svg
         * @param  {d3 selection} elements to highlight
         * @return {Void}
         */
        addHighlight: function (elements) {
            elements.classed('vzb-bm-hover', true);
        },

        /**
         * Remove highlight from the element
         * @return {Void}
         */
        removeHighlight: function () {
            d3.selectAll('.vzb-bm-hover').classed('vzb-bm-hover', false);
        },

        /**
         * Update info box
         * @param  {Datum} d node with the data
         * @return {Void}
         */
        showData: function (d) {
            if (!d.name) {
              d = _findD(d.properties.name);
            }
            infoDisplay.text(_getValue(d));
        },

        /**
         * Reset info box
         * @return {Void}
         */
        hideData: function () {
            infoDisplay.text('');
        },

        /**
         * Get cloned data set from the model
         */
        getData: function () {
            return _.cloneDeep(this.model.data.getItems());
        },

        /**
         * Filter data set for current time
         */
        getCurrentData: function () {
            var timeFormat = d3.time.format('%m/%d/%Y'),
                time = timeFormat(this.model.time.value),
                data = _.filter(this.getData(), function (row) { return timeFormat(new Date(row.time)) === time});

            return data;
        },

        /**
         * Get min and max values for the data set
         */
        getExtremes: function () {
            var data = this.getData();

            return [
                d3.min(data, _getValue),
                d3.max(data, _getValue)
            ];
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
                scale = .9 / Math.max(dx / mapWidth, dy / mapHeight),
                translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

            svg.transition()
                .duration(animate ? 750 : 0)
                .call(zoom.translate(translate).scale(scale).event);
        },

        /**
         * Zoom handler for google maps
         */
        gMapZoomHandler: function () {
            // console.log(map.getZoom());
        },

        /**
         * Zoom handler for map created with D3
         * @return {Void}
         */
        d3MapZoomHandler: function() {
            var scale = d3.event.scale;

            svgLayer.selectAll('.vzb-bm-bubble')
                .attr('r', function (d) { return _getRadius(d) / scale; })
                .style('stroke-width', function (d) { return 1.5 / scale; })
            svgLayer.style('stroke-width', .5 / scale + 'px');
            svgLayer.attr('transform', 'translate(' + d3.event.translate + ')scale(' + scale + ')');

            // console.log(scale);
        },

        clickZoomHandler: function () {
            var scale = zoom.scale(),
                factor = this.id === 'vzb-bm-zoom-in' ? 1.2 : 0.8,
                newScale = scale * factor,
                extent = zoom.scaleExtent(),
                center, translate, newTranslate;

            if (extent[0] <= newScale && newScale <= extent[1]) {
                translate = zoom.translate();
                center = [mapWidth / 2, mapHeight / 2];
                newTranslate = [
                    center[0] + (translate[0] - center[0]) / scale * newScale,
                    center[1] + (translate[1] - center[1]) / scale * newScale
                ];

                zoom
                    .scale(newScale)
                    .translate(newTranslate)
                    .event(svg.transition().duration(350));
            }

            d3.event.preventDefault();
        },

        /**
         * Mouse move handler for the map
         * @return {Void}
         */
        mapMousemoveHandler: function () {
            var el = d3.select(d3.event.target),
                d = el.data()[0],
                name = el.attr('data-name'),
                elements;

            // Avoids flickering on google maps
            // If there is no name data on the target try first child
            // (on google maps every circle has it's own svg element)
            if (!name && el.classed('vzb-bm-bubble-holder')) {
              el = el.select('circle');
              d = el.data()[0];
              name = el.attr('data-name');
            }

            // Remove highlight, hide tooltip and displayed data
            // when no bubble or shape is hovered
            if (!name && hovered) {
                this.removeHighlight();
                this.hideTooltip();
                this.hideData();
                hovered = undefined;
                return;
            }

            // Keep moving the tooltip following the cursor
            if (name) {
                this.showTooltip(d);
            }

            // Avoid repetitive highlighting and displaying data
            // If bubble or shape is hovered, check if it's
            // a different one than currently highlighted
            if (name && hovered !== name) {
                // Remove highlight from previous element
                this.removeHighlight();

                // Find all elements on the map that need to be highlighted
                elements = d3.selectAll('[data-name=' + name + ']');

                // There should always be at least one element
                // but better safe than sorry
                if (elements.length) {
                  this.addHighlight(elements);
                  this.showData(d);
                  hovered = name;
                }
            }
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
                 .style('left', function (d) { return (pos.x - _getRadius(d) + bubbleStrokeWidth * 2) + 'px'; })
                 .style('top', function (d) { return (pos.y - _getRadius(d) + bubbleStrokeWidth * 2) + 'px'; });
        },

        /**
         * Compute and return proper radius scale range
         * Min is set to 2, max can be determined by the state and is capped at 20
         * @return {Array} min and max for scale range
         */
        getRadiusScaleRange: function () {
            var min = 2,
                max = 20,
                state = this.model.bubble.size;

            max = (state < min) ? min : (state > max) ? max : state;
            return [min, max];
        }
    });

    return BubbleMap;

});
