//Bubble Map
define([
    'd3',
    'lodash',
    'topojson',
    'base/component'
], function(d3, _, topojson, Component) {
    'use strict';

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

            // Some initial settings
            this.hovered      = undefined;
            this.mapScale     = 1;
            this.bubbleStroke = 1.5;

            // TODO: This is not ideal, but it's currently the only way to
            // make sure that data processing is done after new data was loaded.
            // Previously it was called in toolModelValidation method, but there
            // the proper data set was not guaranteed.
            this.model.data.on('load_end', this.processNestedData.bind(this));
        },

        /*
         * POSTRENDER:
         * Executed after template is loaded
         * Ideally, it contains instantiations related to template
         */
        postRender: function() {
            // Needed for change of the rendering mode
            this.currentRender = this.model.show.render;

            // Cache needed DOM nodes
            this.mapHolder   = this.element.select('#vzb-bm-holder');
            this.infoDisplay = this.element.select('#vzb-bm-info-text');
            this.tooltip     = this.element.select('#vzb-bm-tooltip');

            this.initializeMap();
        },

        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var model            = this.model,
                show             = model.show,
                radiusScaleRange = this.getRadiusScaleRange(),
                colorScaleRange  = ['#7fb5f5', '#d70927'],
                scale, extremes;

            // If render type has changed, the map have to be initialized again
            if (this.currentRender !== show.render) {
                this.currentRender = show.render;
                this.destroyMap();
                this.initializeMap();
                return;
            }

            // Gather the data
            this.nestedData  = model.data.nested;
            model.data.interpolate(this.nestedData, model.time.value, show.indicator);

            // Construct the scales
            scale            = show.scale;
            extremes         = this.getExtremes();
            this.radiusScale = d3.scale[scale]().domain(extremes).range(radiusScaleRange);
            this.colorScale  = d3.scale.linear().domain(extremes).range(colorScaleRange);

            // Gather other useful pieces
            this.unit        = show.unit;
            this.precision   = _.isUndefined(show.precision) ? 2 : show.precision;

            // Draw shapes and markers on the map
            this.drawShapes();
            this.drawBubbles();
        },

        /*
         * RESIZE:
         * Executed whenever the container is resized
         * Ideally, it contains only operations related to size
         */
        resize: function() {
            if (!this.renderOnline()) {
                this.svg
                    .attr('width', this.mapHolder.node().offsetWidth)
                    .attr('height', this.mapHolder.node().offsetHeight);
            }
        },


        /**
         * Initialize proper map, google or d3 version
         * @return {Void}
         */
        initializeMap: function () {
            if (this.renderOnline()) {
                this.initializeGMap();
            } else {
                this.initializeD3Map();
            }
        },


        /**
         * Destroy the map, google or d3 version
         * @return {Void}
         */
        destroyMap: function () {
            if (this.renderOnline()) {
                this.destroyD3Map();
            } else {
                this.destroyGMap();
            }
        },


        /**
         * Initialize google map and it's overlay, create projection method
         * @return {Void}
         */
        initializeGMap: function () {
            var _this = this;

            this.map = new google.maps.Map(this.mapHolder.node(), {
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                mapTypeControl: false,
                streetViewControl: false
            });

            this.initializeGMapOverlay();
            this.fitGMapBounds();

            this.mapHolder.on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            this.projection = function (coords) {
                var dist;

                coords = new google.maps.LatLng(coords[1], coords[0]);
                coords = _this.gmProjection.fromLatLngToDivPixel(coords);

                if (typeof _this.prevX != 'undefined') {
                    // Check for a gigantic jump to prevent wrapping around the world
                    dist = coords.x - _this.prevX;
                    if (Math.abs(dist) > (_this.worldwidth * 0.9)) {
                        coords.x += dist > 0 ? -_this.worldwidth : _this.worldwidth;
                    }
                }
                _this.prevX = coords.x;
                return [coords.x + 4000, coords.y + 4000];
            };
            this.path = d3.geo.path().projection(this.projection);
        },


        /**
         * Fit map bounds to accomodate nestedData
         * @return {Void}
         */
        fitGMapBounds: function () {
            this.map.fitBounds(
                this.getMapBounds(
                    this.model.data.interpolate(
                        this.model.data.nested,
                        this.model.time.value,
                        this.model.show.indicator
            )));
        },


        /**
         * Destroy and clean up after the google map
         * @return {Void}
         */
        destroyGMap: function () {
            this.map = null;
            this.mapHolder
                .on('mousemove.mapMouseMove', null)
                .attr('style', '')
                .selectAll('*')
                .remove();
        },


        /**
         * Initialize google map overlay to draw the markers and shapes on it
         * This overlay also provides appropriate projection
         * @return {Void}
         */
        initializeGMapOverlay: function () {
            var _this = this,
                gmOverlay = new google.maps.OverlayView();

            gmOverlay.onAdd = function () {
                _this.svgLayer = d3.select(this.getPanes().overlayMouseTarget)
                    .append('svg:svg')
                    .attr('class', 'vzb-bm-svg-layer');

                gmOverlay.draw = function () {
                    _this.gmProjection = this.getProjection();
                    _this.worldwidth = _this.gmProjection.getWorldWidth();

                    _this.drawShapes();
                    _this.drawBubbles();
                };
            };

            gmOverlay.setMap(this.map);
        },


        /**
         * Initialize d3 map, set projection, path and zooming functions
         * Create svg for the map and layer for the markers and shapes
         * @return {Void}
         */
        initializeD3Map: function () {
            this.mapWidth = this.mapHolder.node().offsetWidth;
            this.mapHeight = this.mapHolder.node().offsetHeight;

            this.projection = d3.geo.mercator()
                .scale((this.mapWidth - 1) / 2 / Math.PI)
                .translate([this.mapWidth / 2, this.mapHeight / 2]);

            this.path = d3.geo.path()
                .projection(this.projection);

            this.zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(1)
                .scaleExtent([1, 400])
                .on('zoom', this.d3MapZoomHandler.bind(this));

            this.svg = this.mapHolder.append('svg')
                .attr('width', this.mapWidth)
                .attr('height', this.mapHeight)
                .on('mousemove.mapMouseMove', this.mapMousemoveHandler.bind(this));

            this.svgLayer = this.svg.append('g');

            this.drawWorld();
            this.setupZoomButtons();

            this.svg
                .call(this.zoom)
                .call(this.zoom.event);

            this.update();
        },


        /**
         * Destroy the d3 map and clean up after it
         * @return {[type]} [description]
         */
        destroyD3Map: function () {
            this.element.selectAll('.vzb-bm-zoom').on('click.zoomClick', null);
            this.svg.on('mousemove.mapMouseMove', null);
            this.svg = null;
            this.mapHolder.selectAll('*').remove();
            this.mapScale = 1;
        },


        /**
         * Draw a simple map of the world in d3
         * @return {Void}
         */
        drawWorld: function () {
            var worldData = this.getWorldGeoData(),
                shapeData = this.getShapeGeoData(),
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

            // draw the (hidden) combined area of all shapes…
            combinedArea = this.svgLayer.append('path')
                .datum(topojson.merge(shapeData, shapeData.objects.shapes.geometries))
                .attr('class', 'vzb-bm-area')
                .attr('d', this.path);

            // …zoom to it all…
            this.zoomTo(combinedArea.data()[0]);

            // …and remove it
            combinedArea.remove();
        },


        /**
         * Draw bubbles on the map, google map or offline map
         * @return {Void}
         */
        drawBubbles: function () {
            var _this = this,
                bubble, cx, cy;

            // Sometimes it may be called before google map is initialized with projection
            // Prevent drawing shapes in that case
            if (this.renderOnline() && !this.gmProjection) {
                return;
            }

            bubble = this.svgLayer.selectAll('.vzb-bm-bubble')
                .data(this.bubblesVisible() ? this.nestedData : [], function (d) { return _this.getSlugKey(d.key); });

            // Create new bubble
            bubble
                .enter().append('svg:circle')
                .attr('class', 'vzb-bm-bubble')
                .attr('data-name', function (d) { return _this.getSlugKey(d.key); })
                .attr('fill', this.getColor.bind(this))
                .attr('r', this.getRadius.bind(this));


            // Remove bubbles that are no longer in the data
            bubble.exit().remove();

            // Update exisitin bubbles
            bubble
                .each(function (d) { return _this.positionBubbles.call(this, d, _this); })
                .style('stroke-width', this.bubbleStroke / this.mapScale)
                .transition()
                .duration(150)
                .attr('fill', this.getColor.bind(this))
                .attr('r', this.getRadius.bind(this));

            d3.timer.flush();
        },


        /**
         * Position each bubble on the map, using appropriate projection
         * @param  {node} d d3 node
         * @param  {Object} mapComponent map component, provides projection
         * @return {d3 selection} positioned d3 selection
         */
        positionBubbles: function (d, mapComponent) {
            var pos = mapComponent.projection([d.lng, d.lat]);

            return d3.select(this)
                .attr('cx', pos[0])
                .attr('cy', pos[1]);
        },


        /**
         * Draw shapes on the map, google map or offline map
         * @return {Void}
         */
        drawShapes: function () {
            var _this     = this,
                shapes = [],
                shape;

            // Sometimes it may be called before google map is initialized with projection
            // Prevent drawing shapes in that case
            if (this.renderOnline() && !this.gmProjection) {
               return; 
            }

            if (this.shapesVisible()) {
                shapes = this.getShapeGeoData();
                shapes = topojson.feature(shapes, shapes.objects.shapes).features;
                // Filter shapes based on currentData
                shapes = _.filter(shapes, function (shape) { return _this.findD(shape.properties.name); });
            }

            shape = this.svgLayer.selectAll('.vzb-bm-shape')
                .data(shapes, function (d) { return 'vzb-bm-shape-' + _this.getSlugKey(d.properties.name); });

            // Create new shapes
            shape
                .enter().insert('svg:path', '.vzb-bm-bubble')
                .attr('class', 'vzb-bm-shape')
                .attr('data-name', function (d) { return _this.getSlugKey(d.properties.name); });

            // Remove shapes that are no longer in the data
            shape.exit().remove();

            // Update exisiting shapes
            shape
                .attr('d', this.path)
                .attr('fill', function (d) {
                    var d = _this.findD(d.properties.name);
                    return d ? _this.getColor(d) : 'transparent';
                });
        },


        /**
         * Show the name of the feature in the tooltip
         * @param  {Datum} d Node with the name
         * @return {Void}
         */
        showTooltip: function (d) {
            var host  = (this.svg || this.mapHolder).node(),
                mouse = d3.mouse(host).map( function(d) { return parseInt(d); } );

            this.tooltip
                .classed('vzb-hidden', false)
                .html(d.key || d.properties.name);

            // Position the tooltip at the top center of the cursor
            mouse[0] -= this.tooltip.node().offsetWidth / 2;
            mouse[1] -= this.tooltip.node().offsetHeight + 10;

            this.tooltip.style({'left': mouse[0] + 'px', 'top': mouse[1] + 'px'});
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
            d = d.key ? d : this.findD(d.properties.name);
            this.infoDisplay.text((+this.getValue(d) / this.unit).toFixed(this.precision));
        },


        /**
         * Reset info box
         * @return {Void}
         */
        hideInfo: function () {
            this.infoDisplay.text('');
        },


        /**
         * Get data for the shapes lat lng
         * @return {Object} object with shape lat&lng coordinates
         */
        getShapeLatLngData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return _.isArray(d) && d[0].lat && d[0].lng;
            });
        },


        /**
         * Get data for the shapes coordinates
         * @return {Object} topoJSON with coordinates
         */
        getShapeGeoData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return d.objects && d.objects.shapes;
            });
        },


        /**
         * Get data for the world coordinates
         * @return {Object} topoJSON with the world coordinates
         */
        getWorldGeoData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return d.objects && d.objects.countries;
            });
        },


        /**
         * Get data items from the model
         * TODO: Maybe there is a better way of finding proper
         * data set when there are more than one
         * @return {Array} Array with the data
         */
        getData: function () {
            return _.find(this.model.data.getItems(), function (d) {
                return _.isArray(d) && d[0].time;
            });
        },


        /**
         * Get min and max values for the data set
         * @return {Array} with min and max
         */
        getExtremes: function () {
            return [
                d3.min(this.nestedData, this.getValue.bind(this)),
                d3.max(this.nestedData, this.getValue.bind(this))
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
                scale     = .9 / Math.max(dx / this.mapWidth, dy / this.mapHeight),
                translate = [this.mapWidth / 2 - scale * x, this.mapHeight / 2 - scale * y];

            this.svg.transition()
                .duration(animate ? 750 : 0)
                .call(this.zoom.translate(translate).scale(scale).event);
        },


        /**
         * Zoom handler for map created with D3
         * @return {Void}
         */
        d3MapZoomHandler: function() {
            this.mapScale = d3.event.scale;

            this.svgLayer
                .style('stroke-width', .5 / this.mapScale + 'px')
                .attr('transform', 'translate(' + d3.event.translate + ')scale(' + this.mapScale + ')')
            .selectAll('circle')
                .attr('r', this.getRadius.bind(this))
                .style('stroke-width', this.bubbleStroke / this.mapScale);
        },


        /**
         * Add zoom buttons and attach zoom handler to them
         * @return {Void}
         */
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

            this.element.selectAll('.vzb-bm-zoom').on('click.zoomClick', this.clickZoomHandler.bind(this));
        },


        /**
         * Click zoom handler for the d3 map buttons
         * @return {Void}
         */
        clickZoomHandler: function () {
            var zoom     = this.zoom,
                scale    = zoom.scale(),
                factor   = d3.event.target.id === 'vzb-bm-zoom-in' ? 1.2 : 0.8,
                newScale = scale * factor,
                extent   = zoom.scaleExtent(),
                center, translate, newTranslate;

            if (extent[0] <= newScale && newScale <= extent[1]) {
                translate = zoom.translate();
                center = [this.mapWidth / 2, this.mapHeight / 2];
                newTranslate = [
                    center[0] + (translate[0] - center[0]) / scale * newScale,
                    center[1] + (translate[1] - center[1]) / scale * newScale
                ];

                zoom
                    .scale(newScale)
                    .translate(newTranslate)
                    .event(this.svg.transition().duration(350));
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


        /**
         * Checks if bubbles should be renderd on the map
         * @return {Boolean}
         */
        bubblesVisible: function () {
            return this.model.show.visuals.indexOf('bubble') > -1;
        },


        /**
         * Checks if shapes should be renderd on the map
         * @return {Boolean}
         */
        shapesVisible: function () {
            return this.model.show.visuals.indexOf('shape') > -1;
        },


        /**
         * Checks if map should be rendered using google map
         * @return {Boolean}
         */
        renderOnline: function () {
            return typeof google !== 'undefined' && this.model.show.render === 'online';
        },


        /**
         * Find the node in waffle data (nestedData)
         * TODO: Probably won't be needed in the final data set
         * @param  {String} name name of the node to find
         * @return {Object} found data node or undefined
         */
        findD: function (name) {
            return _.find(this.nestedData, {key: name});
        },


        /**
         * Generate simple slug to be used in dom attributes
         * @param  {String} key String to slugify
         * @return {String} Slugified string
         */
        getSlugKey: function (key) {
            return key.toLowerCase().replace(/([\s\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"-");
        },


        /**
         * Get the vaule for the indicator
         * TODO: Defaults to one when NaN is returned by interpolator
         * currently that's a too common case, interpolator needs more work
         * @param  {Object} d Data object for which to obtain the value
         * @return {Number} Found value
         */
        getValue: function (d) {
            return d.now[this.model.show.indicator[0]] || 1;
        },


        /**
         * Calculate proper radius scale
         * @param  {Object} d Data node for which to calculate the scale
         * @return {Number} Calculated scale
         */
        getRadius: function (d) {
            return this.radiusScale(this.getValue(d)) / this.mapScale;
        },


        /**
         * Calculate proper color scale
         * @param  {Object} d Data node for which to calculate the scale
         * @return {String} Calculated scale
         */
        getColor: function (d) {
            return this.colorScale(this.getValue(d));
        },


        /**
         * Transform data set, gathering all values on nodes
         * This format is required for interpolator
         * TODO: That may not be the best place for this method,
         * maybe it should reside on the Tool level, but currently
         * it's the only place that always guarantees proper data set
         * @return {Void} It produces a side effect, adding 'nested' property to this.model.data
         */
        processNestedData: function () {
            var model     = this.model,
                data      = model.data,
                indicator = model.show.indicator,
                items     = this.getData(),
                latlngs   = this.getShapeLatLngData(),
                dateMin, dateMax,
                minValue, maxValue, nested;

            // Do nothing, if the data is processed already
            if (model.show.dataIsProcessed) {
                return;
            }

            // save max and min values to the model (each is a vector for all indicators)
            minValue = indicator.map(function(ind) {
             return d3.min(items, function(d) {return +d[ind];});
            });
            maxValue = indicator.map(function(ind) {
             return d3.max(items, function(d) {return +d[ind];});
            });
            data.setItems("minValue", minValue);
            data.setItems("maxValue", maxValue);

            dateMin = data.getLimits('time').min;
            dateMax = data.getLimits('time').max;

            if (model.time.start < dateMin) {
                model.time.start = dateMin;
            }
            if (model.time.end > dateMax) {
                model.time.end = dateMax;
            }

            // group data points by geo.name
            nested = d3.nest()
                .key(function (d) {return d["adm1.name"] || d["geo.name"]})
                .rollup(function (leaves) {
                    var collect = [];
                    var times = _.uniq(leaves.map(function (d) { return d.time; })).sort(d3.ascending);

                    //merge different indicators with the same time points
                    //this will not be needed when i will 
                    //TODO: connect new data format
                    times.forEach(function(t){
                        var merged = {};
                        merged.name = leaves[0]["adm1.name"] || leaves[0]["geo.name"]; 
                        merged.category = (leaves[0]["geo.category"]) ? leaves[0]["geo.category"][0] : 'county';
                        // merged.region = merged.name.split("-")[0]; 
                        // merged.region = merged['adm1.name']; 
                        merged.time = d3.time.format(model.time.format).parse(t); 

                        // this sodomy will go away witht the proper input
                        leaves
                            .filter(function (l) { return l.time == t; })
                            .forEach(function (dd) {
                                indicator.forEach(function (ind) {
                                    if (dd[ind]) merged[ind] = +dd[ind];
                                });
                            });

                        collect.push(merged);
                    });

                    //sometimes certain indicator values are missing 
                    //from the data points. here we fill them in
                    return data.fillGaps(collect, indicator);
                })
                .entries(items);

            nested.forEach(function (d) {
                var latlng;
                // d.region = d.values[0]['country.name'] || d.values[0]['geo.category'];
                // find the lat and lng for this node
                latlng = _.find(latlngs, function (l) { return l.name === d.key; });
                if (latlng) {
                    d.lat = latlng.lat;
                    d.lng = latlng.lng;
                }
            });

            // Filter data set eliminating entries without lat lng
            // TODO: Hopefuly won't be needed with proper data set
            nested = _.filter(nested, function (el) { return el.lat && el.lng; });

            // save the nested data to the model
            data.setItems("nested", nested);

            // this flag should be reset together with changing model.show 
            model.show.dataIsProcessed = true;
        }
    });

    return Map;

});
