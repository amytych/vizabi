//Bubble Map
define([
    'jquery',
    'd3',
    'topojson',
    'underscore',
    'base/component'
], function($, d3, topojson, _, Component) {

    var width, height,
        $mapHolder, $infoDisplayCounter,
        projection, zoom, path, svg, g, overlay, tooltip,
        bubbleLayer, bubble, bubbleEnter,
        shapesInitialized, bubblesInitialized,
        districts, data, displayData, indicator, time, radiusScale, colorScale, visuals, active, geoJSONPath,
        radiusScaleRange = [3, 15], colorScaleRange = ['#7fb5f5', '#d70927'], bubbleStrokeWidth = 1.5;


    // Some handy helpers and getters

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
            var _this = this,
                min, max;

            geoJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder2';
            geoJSONPath += '/data-waffles/bubble-map/en/topo_json_features.json';

            time        = this.model.getState('time');
            indicator   = this.model.getState('indicator');
            visuals     = this.model.getState('visuals');
            panValue    = this.model.getState('pan') || [-8.3, 9];
            zoomValue   = this.model.getState('zoom') || 1;
            data        = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });
            min         = d3.min(data, function(d) { return _getValue(d); });
            max         = d3.max(data, function(d) { return _getValue(d); });
            radiusScale = d3.scale.linear().domain([min, max]).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain([min, max]).range(colorScaleRange);

            $mapHolder = $('#bubble-map-holder');
            $infoDisplayCounter = $('#bubble-map-info-display-counter');
            tooltip = d3.select('.bubble-map-tooltip');

            width = $mapHolder.width();
            height = $mapHolder.height();

            if (typeof google === 'undefined') {
                this.initializeD3Map();
            } else {
                this.initializeGoogleMap();
            }
        },

        initializeGoogleMap: function () {
            console.log('dupa');
        },

        initializeD3Map: function () {
            var _this = this,
                worldJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder2';

            worldJSONPath += '/data-waffles/bubble-map/en/world.json';

            active = d3.select(null);

            projection = d3.geo.mercator()
                // .center(panValue)
                .scale((width - 1) / 2 / Math.PI)
                .translate([width / 2, height / 2]);

            zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(zoomValue)
                .scaleExtent([1, 50])
                .on('zoom', _this.zoomHandler);

            path = d3.geo.path()
                .projection(projection);

            svg = d3.select('#bubble-map-holder').append('svg')
                .attr('width', width)
                .attr('height', height);

            overlay = svg.append('rect')
                  .attr('class', 'background')
                  .attr('width', width)
                  .attr('height', height)
                  .on("click", _this.reset);

            g = svg.append('g');

            svg
                .call(zoom);
            //     .call(zoom.event);

            // console.log($(this.placeholder[0])).add;
            // this.parent.element.classed('loading', true);
            // console.log($(this.parent.element).hasClass('loading'));

            // First, create the world
            d3.json(worldJSONPath, function(error, world) {
                if (error) return console.log(error);

                // Now, load the districts
                d3.json(geoJSONPath, function(error, geo) {
                    if (error) return console.log(error);

                    // Put all the countries on the map
                    _this.drawWorld(world);

                    // Put all the districts on the map
                    _this.drawDistricts(geo);

                    _this.update();
                });
            });
        },


        /*
         * UPDATE:
         * Executed whenever data is changed
         * Ideally, it contains only operations related to data events
         */
        update: function() {
            var _this = this;

            time        = this.model.getState('time');
            indicator   = this.model.getState('indicator');
            visuals     = this.model.getState('visuals');
            panValue    = this.model.getState('pan') || [-8.3, 9];
            zoomValue   = this.model.getState('zoom') || 1;
            data        = this.model.getData()[0];
            displayData = data.filter(function(row) { return (row.time == time); });
            min         = d3.min(data, function(d) { return _getValue(d); });
            max         = d3.max(data, function(d) { return _getValue(d); });
            radiusScale = d3.scale.linear().domain([min, max]).range(radiusScaleRange);
            colorScale  = d3.scale.linear().domain([min, max]).range(colorScaleRange);

            // Udpdate the disctirct colors
            g.selectAll('.district')
                .data(districts, function (d) {return d.properties.name; })
                .style('fill', function(d, i) {
                    var node = _findD(d.properties.name);
                    return node ? _getColorScale(node) : '#fff';
                });

            // Update bubbles
            _this.drawBubbles();

            // Update scaling
            svg.call(zoom.event);
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

            // switch(layout) {
            //     case 'small':
            //         s = 2200;
            //         t = [-2280, -3286];
            //         break;

            //     case 'medium':
            //         s = 3000;
            //         t = [-2580, -3786]
            //         break;

            //     case 'large':
            //     default:
            //         s = 3500;
            //         t = [-height * 5, -width * 50];
            // }

            // projection
            //     .center([-8.3, 9])
            //     .scale(s)
            //     .translate(t)
            //     .translate([width / 1.2, height / 2]);

            // path.projection(projection);

            svg
                .attr('width', width)
                .attr('height', height);

            overlay
                  .attr('width', width)
                  .attr('height', height);

            // g.selectAll('.district')
            //     .attr('d', path);

            // g.selectAll('.bubble')
            //     .attr("cx", function(d) { return projection([d.lon, d.lat])[0]; })
            //     .attr("cy", function(d) { return projection([d.lon, d.lat])[1]; })
        },

        zoomHandler: function() {
            var scale = d3.event.scale;

            g.selectAll('.bubble').attr('r', function (d) { return _getRadiusScale(d) / scale; })
            g.style("stroke-width", .5 / scale + "px");
            g.attr('transform', 'translate(' + d3.event.translate + ')scale(' + scale + ')');
        },

        showTooltip: function (d) {
            var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

            tooltip
                .classed("hidden", false)
                .attr("style", "left:" + (mouse[0] + 10)+"px; top:" + (mouse[1] + 10) + "px")
                .html(d.name || d.properties.name);
        },

        hideTooltip: function (d) {
            tooltip.classed("hidden", true);
        },

        addHighlight: function (d) {
            var circleEl = d3.select(this),
                radius = circleEl.attr('r'),
                cx = circleEl.attr('cx'),
                cy = circleEl.attr('cy'),
                newRadius = radius - bubbleStrokeWidth;

            circleEl.attr('class', 'bubble hover');

        },

        removeHighlight: function (d) {
            var circleEl = d3.select(this);

            circleEl.attr('class', 'bubble');
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

        },

        getMapCenter: function (locations) {

        },

        initializeBubbles: function () {

        },

        drawBubbles: function () {
            var _this = this;


            bubble = g.selectAll(".bubble")
                .data(_bubblesVisible() ? displayData : [], function (d) {return d.geo; });

            if (d3.event) console.log(d3.event.scale);

            bubble
                .enter().append("circle")
                .attr('class', 'bubble')
                .attr("cx", function(d) { return projection([d.lon, d.lat])[0]; })
                .attr("cy", function(d) { return projection([d.lon, d.lat])[1]; })
                .on('mouseenter', function (d) {
                    _this.displayData.call(this, d);
                    _this.addHighlight.call(this, d);
                })
                .on('mousemove', function (d) {
                    _this.showTooltip.call(this, d);
                })
                .on('mouseleave', function (d) {
                    _this.hideData.call(this, d);
                    _this.removeHighlight.call(this, d);
                    _this.hideTooltip.call(this, d);
                });

            bubble.exit().remove();

            bubble
                .attr('fill', function (d) {return _getColorScale(d); })
                .attr('r', function (d) { return _getRadiusScale(d); });
        },

        initializeGeoShapes: function () {
            // var _this = this,
            //     worldJSONPath = location.hostname === 'localhost' ? '' : '/u/64730059/gapminder';

            // map.data.loadGeoJson(worldJSONPath + '/data-waffles/bubble-map/en/geo_json_features.json');

            // map.data.addListener('mouseover', function(event) {
            //     var d = _findD(event.feature.getProperty('name'));

            //     if (d) {
            //         _this.displayData.call(this, d);
            //         _this.addGeoTooltip.call(this, d, event);
            //     }

            //     map.data.overrideStyle(event.feature, {fillOpacity: 1});
            //  });

            // map.data.addListener('mouseout', function(event) {
            //     var d = _findD(event.feature.getProperty('name'));

            //     if (d) {
            //         _this.hideData.call(this, d);
            //         _this.removeGeoTooltip.call(this, d);
            //     }

            //     map.data.revertStyle();
            //  });

            // shapesInitialized = true;
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
        },

        drawWorld: function (world) {
            // Draw land
            g.append("path")
                .datum(topojson.merge(world, world.objects.countries.geometries))
                .attr("class", "land")
                .attr("d", path);

            // Draw countries borders
            g.append("path")
                .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                .attr("class", "boundary")
                .attr("d", path);
        },

        drawDistricts: function (geo) {
            var _this = this;

            districts = topojson.feature(geo, geo.objects.districts).features;

            // draw the (hidden) combined area of all districts…
            g.append('path')
                .datum(topojson.merge(geo, geo.objects.districts.geometries))
                .attr('class', 'area')
                .attr('d', path);

            // and zoom to it all
            _this.zoomTo(d3.select('.area').data()[0]);

            g.selectAll('.district')
                .data(districts, function (d) { return d.properties.name; })
            .enter().append('path')
                .attr('class', 'district')
                .attr('d', path)
                .style('fill', function(d, i) {
                    var node = _findD(d.properties.name),
                        color = node ? _getColorScale(node) : '#fff';
                    return color;
                })
                // .on("click", function (d) {
                //   _this.clicked.call(_this, d, this);
                // })
                .on('mouseenter', function (d) {
                    var d = _findD(d.properties.name);

                    if (d) {
                        _this.displayData.call(this, d);
                    }
                })
                .on('mousemove', function (d) {
                    var d = _findD(d.properties.name);
                    if (d) {
                        _this.showTooltip.call(this, d);
                    }
                })
                .on('mouseleave', function (d) {
                    _this.hideData.call(this, d);
                    _this.hideTooltip.call(this, d);
                });
        },

        clicked: function (d, node) {

          if (active.node() === node) return this.resetZoom();
          active.classed("active", false);
          active = d3.select(node).classed("active", true);

          this.zoomTo(d, true);
        },

        resetZoom: function () {
          active.classed("active", false);
          active = d3.select(null);

          svg.transition()
              .duration(750)
              .call(zoom.translate([0, 0]).scale(1).event);
        },

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

        }

    });

    return BubbleMap;

});