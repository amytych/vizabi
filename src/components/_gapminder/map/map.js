//Bubble Map
define([
    'd3',
    'lodash',
    'topojson',
    'base/component'
], function(d3, _, topojson, Component) {

    var mapWidth,
        mapHeight,
        mapScale = 1,
        projection,
        gmProjection,
        zoom,
        svg,
        indicator,
        radiusScale,
        colorScale,
        currentRender,
        bubbleStroke = 1.5;

    // Some handy helpers and getters

    // get the vaule for the indicator
    // may also not be needed after final data set is stnadardized
    function _getValue (d) {
        return d.now[indicator[0]] || 1;
    }

    // radiusScale is always defined before calling
    function _getRadius (d) {
        return radiusScale(_getValue(d)) / mapScale;
    }

    // colorScale is always defined before calling
    function _getColor (d) {
        return colorScale(_getValue(d));
    }

    var Map = Component.extend({


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
            // Needed for change of the rendering mode
            currentRender = this.model.show.render;

            // Cache needed DOM nodes
            this.mapHolder   = this.element.select('#vzb-bm-holder');
            this.infoDisplay = this.element.select('#vzb-bm-info-text');
            this.tooltip     = this.element.select('#vzb-bm-tooltip');

            this.hovered = undefined;

            indicator   = this.model.show.indicator;
            this.interpolator = this.model.data.interpolate;
            this.nestedData   = this.model.data.nested;
            this.interpolator(this.nestedData, this.model.time.value, indicator);

            this.initializeMap();
        },

        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var radiusScaleRange = this.getRadiusScaleRange(),
                colorScaleRange  = ['#7fb5f5', '#d70927'],
                scale, extremes;

            indicator   = this.model.show.indicator;

            this.precision    = (typeof this.model.show.precision !== 'undefined') ? this.model.show.precision : 2;
            this.nestedData   = this.model.data.nested;
            this.interpolator(this.nestedData, this.model.time.value, indicator);

            scale       = this.model.show.scale;
            extremes    = this.getExtremes();
            radiusScale = d3.scale[scale]().domain(extremes).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain(extremes).range(colorScaleRange);

            // If render type has changed, the map have to be initialized again
            if (currentRender !== this.model.show.render) {
                currentRender = this.model.show.render;
                this.destroyMap();
                this.initializeMap();
                return;
            }

            this.drawDistricts();
            this.drawBubbles();
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            // Just resize the SVG map holder and the overlay
            if (!this.renderOnline()) {
                mapWidth = this.mapHolder.node().offsetWidth;
                mapHeight = this.mapHolder.node().offsetHeight;

                svg.attr('width', mapWidth).attr('height', mapHeight);
            }
        },

        initializeMap: function () {
            if (this.renderOnline()) {
                this.initializeGMap();
            } else {
                this.initializeD3Map();
            }
        },

        destroyMap: function () {
            if (this.renderOnline()) {
                this.destroyD3Map();
            } else {
                this.destroyGMap();
            }
        },

        initializeGMap: function () {
            map = new google.maps.Map(this.mapHolder.node(), {
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                mapTypeControl: false,
                streetViewControl: false
            });

            this.initializeGMapOverlay();

            // fit map bounds to accomodate currentData
            map.fitBounds(this.getMapBounds(this.nestedData));

            this.mapHolder.on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            projection = function (coords) {
                coords = new google.maps.LatLng(coords[1], coords[0]);
                coords = gmProjection.fromLatLngToDivPixel(coords);
                return [coords.x + 4000, coords.y + 4000];
            }
            this.path = d3.geo.path().projection(projection);
        },

        destroyGMap: function () {
            map = null;
            this.mapHolder
                .on('mousemove.mapMouseMove', null)
                .attr('style', '')
                .selectAll('*')
                .remove();
        },

        initializeGMapOverlay: function () {
            var _this = this,
                gmOverlay = new google.maps.OverlayView();

            gmOverlay.onAdd = function () {
                _this.svgLayer = d3.select(this.getPanes().overlayMouseTarget)
                    .append('svg:svg')
                    .attr('class', 'vzb-bm-svg-layer');

                gmOverlay.draw = function () {
                    gmProjection = this.getProjection();
                    _this.drawDistricts();
                    _this.drawBubbles();
                };
            };

            gmOverlay.setMap(map);
        },

        /**
         * Build the d3 world map and draw the districts
         * @return {Void}
         */
        initializeD3Map: function () {
            mapWidth = this.mapHolder.node().offsetWidth;
            mapHeight = this.mapHolder.node().offsetHeight;

            projection = d3.geo.mercator()
                .scale((mapWidth - 1) / 2 / Math.PI)
                .translate([mapWidth / 2, mapHeight / 2]);

            this.path = d3.geo.path()
                .projection(projection);

            zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(1)
                .scaleExtent([1, 400])
                .on('zoom', this.d3MapZoomHandler.bind(this));

            svg = this.mapHolder.append('svg')
                .attr('width', mapWidth)
                .attr('height', mapHeight)
                .on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            this.svgLayer = svg.append('g');

            this.drawWorld();
            this.setupZoomButtons();

            svg
                .call(zoom)
                .call(zoom.event);

            this.update();
        },

        destroyD3Map: function () {
            // Remove event listeners
            this.element.selectAll('.vzb-bm-zoom').on('click.zoomClick', null);
            svg.on('mousemove.mapMouseMove', null);
            svg = null;
            this.mapHolder.selectAll('*').remove();
            mapScale = 1;
        },

        /**
         * Create simple map of the world in d3
         * @return {Void}
         */
        drawWorld: function () {
            var worldData = this.getWorldGeoData(),
                districtData = this.getDistrictGeoData(),
                combinedArea;

            // Draw land
            this.svgLayer.append('path')
                .datum(topojson.merge(worldData, worldData.objects.countries.geometries))
                .attr('class', 'vzb-bm-land')
                .attr('d', this.path);

            // Draw countries borders
            this.svgLayer.append('path')
                .datum(topojson.mesh(worldData, worldData.objects.countries, function(a, b) { return a !== b; }))
                .attr('class', 'vzb-bm-boundary')
                .attr('d', this.path);

            // draw the (hidden) combined area of all districts…
            combinedArea = this.svgLayer.append('path')
                .datum(topojson.merge(districtData, districtData.objects.districts.geometries))
                .attr('class', 'vzb-bm-area')
                .attr('d', this.path);

            // and zoom to it all
            this.zoomTo(combinedArea.data()[0]);
        },

        drawBubbles: function () {
            var _this = this,
                bubble, cx, cy;

            // Sometimes it may be called before google map is initialized with projection
            // Prevent drawing districts in that case
            if (this.renderOnline() && !gmProjection) {
                return;
            }

            bubble = this.svgLayer.selectAll('.vzb-bm-bubble')
                .data(this.bubblesVisible() ? this.nestedData : [], function (d) { return d.key; });

            // Create new bubble
            bubble
                .enter().append('svg:circle')
                .attr('class', 'vzb-bm-bubble')
                .attr('data-name', function (d) { return d.key.toLowerCase().split(' ').join('_'); })
                .attr('fill', _getColor)
                .attr('r', _getRadius);


            // Remove bubbles that are no longer in the data
            bubble.exit().remove();

            // Update exisitin bubbles
            bubble
                .each(this.positionBubbles)
                .style('stroke-width', bubbleStroke / mapScale)
                .transition()
                .duration(150)
                .attr('fill', _getColor)
                .attr('r', _getRadius);


            d3.timer.flush();
        },

        positionBubbles: function (d) {
            var pos = projection([d.lng, d.lat]);

            return d3.select(this)
                // .attr('cx', 4100)
                // .attr('cy', 4100);
                .attr('cx', pos[0])
                .attr('cy', pos[1]);
        },

        /**
         * Draw districts on the map, google map or offline map
         * @return {Void}
         */
        drawDistricts: function () {
            var _this     = this,
                districts = [],
                district;

            // Sometimes it may be called before google map is initialized with projection
            // Prevent drawing districts in that case
            if (this.renderOnline() && !gmProjection) {
               return; 
            }

            if (this.shapesVisible()) {
                districts = this.getDistrictGeoData();
                districts = topojson.feature(districts, districts.objects.districts).features;
                // Filter districts based on currentData
                districts = _.filter(districts, function (district) { return _this.findD(district.properties.name); });
            }

            district = this.svgLayer.selectAll('.vzb-bm-district')
                .data(districts, function (d) { return 'vzb-bm-district-' + d.properties.name.toLowerCase().split(' ').join('_'); });

            // Create new districts
            district
                .enter().insert('svg:path', '.vzb-bm-bubble')
                .attr('class', 'vzb-bm-district')
                .attr('data-name', function (d) { return d.properties.name.toLowerCase().split(' ').join('_'); });

            // Remove districts that are no longer in the data
            district.exit().remove();

            // Update exisiting districts
            district
                .attr('d', this.path)
                .attr('fill', function (d) {
                    var d = _this.findD(d.properties.name),
                    color = d ? _getColor(d) : 'transparent';
                    return color;
                });
        },

        /**
         * Show the name of the feature in the tooltip
         * @param  {Datum} d Node with the name
         * @return {Void}
         */
        showTooltip: function (d) {
            var host  = svg ? svg.node() : this.mapHolder.node(),
                mouse = d3.mouse(host).map( function(d) { return parseInt(d); } );

            this.tooltip
                .classed('vzb-hidden', false)
                .html(d.key || d.properties.name);

            // Position the tooltip at the top center of the cursor
            mouse[0] -= this.tooltip.node().offsetWidth / 2;
            mouse[1] -= this.tooltip.node().offsetHeight + 10;

            this.tooltip
                .style('left', mouse[0] + 'px')
                .style('top', mouse[1] + 'px');
        },

        /**
         * Hide the tooltip with the name
         * @return {Void}
         */
        hideTooltip: function () {
            this.tooltip.classed('vzb-hidden', true);
        },

        /**
         * Highlight the elements when moving over the svg
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
            this.element.selectAll('.vzb-bm-hover').classed('vzb-bm-hover', false);
        },

        /**
         * Update info box
         * @param  {Datum} d node with the data
         * @return {Void}
         */
        showInfo: function (d) {
            if (!d.key) {
              d = this.findD(d.properties.name);
            }
            this.infoDisplay.text(+_getValue(d).toFixed(this.precision));
        },

        /**
         * Reset info box
         * @return {Void}
         */
        hideInfo: function () {
            this.infoDisplay.text('');
        },

        /**
         * Get data for the districts coordinates
         * @return {Object} topoJSON with coordinates
         */
        getDistrictGeoData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return d.objects && d.objects.districts;
            });
        },

        /**
         * Get data for the districts lat lng
         * @return {Object} topoJSON with coordinates
         */
        getDistrictLatLngData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return _.isArray(d) && d[0].lat && d[0].lng;
            });
        },

        /**
         * Get data for the world coordinates
         * @return {Object} topoJSON with the worls coordinates
         */
        getWorldGeoData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return d.objects && d.objects.countries;
            });
        },

        /**
         * Get cloned data set from the model
         */
        getData: function () {
            return _.cloneDeep(_.find(this.model.data.getItems(), function (d) {
                return _.isArray(d) && d[0].time;
            }));
        },

        /**
         * Filter data set for current time
         */
        getCurrentData: function () {
            var format = d3.time.format('%Y-%m-%d'),
                time   = format(this.model.time.value);

            return _.filter(this.getData(), {time: time});
        },

        /**
         * Get min and max values for the data set
         */
        getExtremes: function () {
            // var data = this.getData();

            return [
                d3.min(this.nestedData, _getValue),
                d3.max(this.nestedData, _getValue)
            ];
        },

        /**
         * Returns Bounds for currentDisplay data
         * @param  {Array} locations currentDisplay data
         * @return {google.maps.LatLngBounds}
         */
        getMapBounds: function (locations) {
            var bounds = new google.maps.LatLngBounds();
            _.each(locations, function (location) { bounds.extend( new google.maps.LatLng(location.lat, location.lng) ); });
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
            var bounds    = this.path.bounds(d),
                dx        = bounds[1][0] - bounds[0][0],
                dy        = bounds[1][1] - bounds[0][1],
                x         = (bounds[0][0] + bounds[1][0]) / 2,
                y         = (bounds[0][1] + bounds[1][1]) / 2,
                scale     = .9 / Math.max(dx / mapWidth, dy / mapHeight),
                translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];

            svg.transition()
                .duration(animate ? 750 : 0)
                .call(zoom.translate(translate).scale(scale).event);
        },

        /**
         * Zoom handler for map created with D3
         * @return {Void}
         */
        d3MapZoomHandler: function() {
            mapScale = d3.event.scale;

            this.svgLayer
                .style('stroke-width', .5 / mapScale + 'px')
                .attr('transform', 'translate(' + d3.event.translate + ')scale(' + mapScale + ')')
            .selectAll('circle')
                .attr('r', _getRadius)
                .style('stroke-width', function (d) { return bubbleStroke / mapScale; });
        },

        setupZoomButtons: function () {
            this.mapHolder.append('a')
                .attr('href', '#')
                .attr('title', 'Zoom in')
                .attr('id', 'vzb-bm-zoom-in')
                .attr('class', 'vzb-bm-zoom vzb-bm-zoom-in')
                .text('+');

            this.mapHolder.append('a')
                .attr('href', '#')
                .attr('title', 'Zoom out')
                .attr('id', 'vzb-bm-zoom-out')
                .attr('class', 'vzb-bm-zoom vzb-bm-zoom-out')
                .text('–');

            this.element.selectAll('.vzb-bm-zoom').on('click.zoomClick', this.clickZoomHandler);
        },

        clickZoomHandler: function () {
            var scale    = zoom.scale(),
                factor   = this.id === 'vzb-bm-zoom-in' ? 1.2 : 0.8,
                newScale = scale * factor,
                extent   = zoom.scaleExtent(),
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
            var el   = d3.select(d3.event.target),
                d    = el.data()[0],
                name = el.attr('data-name'),
                elements;

            // Remove highlight, hide tooltip and displayed data
            // when no bubble or shape is hovered
            if (!name && this.hovered) {
                this.removeHighlight();
                this.hideTooltip();
                this.hideInfo();
                this.hovered = undefined;
                return;
            }

            if (name) {
                // Keep moving the tooltip following the cursor
                this.showTooltip(d);

                // Avoid repetitive highlighting and displaying data
                // If bubble or shape is hovered, check if it's
                // a different one than currently highlighted
                if (this.hovered !== name) {
                    // Remove highlight from previous element
                    this.removeHighlight();

                    // Find all elements on the map that need to be highlighted
                    elements = this.svgLayer.selectAll('[data-name=' + name + ']');
                    this.addHighlight(elements);
                    this.showInfo(d);
                    this.hovered = name;
                }
            }
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
        },

        // visuals are always defined before calling
        bubblesVisible: function () {
            return this.model.show.visuals.indexOf('bubble') > -1;
        },

        // visuals are always defined before calling
        shapesVisible: function () {
            return this.model.show.visuals.indexOf('shape') > -1;
        },

        renderOnline: function () {
            return typeof google !== 'undefined' && this.model.show.render === 'online';
        },

        // Find the node in waffle data (currentData)
        // based on the name of feature property from geoJSON
        // Probably won't be needed in the final data set
        findD: function (name) {
            return _.find(this.nestedData, {key: name});
        }

    });

    return Map;

});
