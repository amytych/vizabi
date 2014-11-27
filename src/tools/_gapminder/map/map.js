//Bubble Map
define([
    'base/tool'
], function(Tool) {

    var Map = Tool.extend({
        init: function(config, options) {

            this.name = 'map';
            this.template = "tools/_gapminder/map/map";

            //add components
            this.components = [{
                component: '_gapminder/map',
                placeholder: '.vzb-tool-viz',
                model: ['data.path', 'state.show', 'data', 'state.time', 'state.bubble']
            }, {
                component: '_gapminder/header',
                placeholder: '.vzb-tool-title'
            }, {
                component: '_gapminder/timeslider',
                placeholder: '.vzb-tool-timeslider',
                model: ['state.time']
            }, {
                 component: '_gapminder/buttonlist',
                 placeholder: '.vzb-tool-buttonlist',
                 model: ['state', 'data', 'language', 'state.bubble'],
                 buttons: ['size']
            }];

            this._super(config, options);
        },

        //TODO: Check mapping options

        getQuery: function(model) {
            var state = model.state;

            //build query with state info
            var query = [{
                    select: [
                        'geo',
                        'time',
                        'geo.name',
                        'geo.category',
                        state.show.indicator
                    ],
                    where: {
                        geo: state.show.geo,
                        'geo.category': state.show['geo.category'],
                        time: state.time.timeRange
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }];

            return query;
        },

        /**
         * Validating the tool model
         * @param model the current tool model to be validated
         */
        //FIXME: why is toolModelValidation called on every time step? see issue #37
        toolModelValidation: function(model) {

        }
    });

    return Map;
});