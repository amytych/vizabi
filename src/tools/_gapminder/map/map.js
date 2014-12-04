//Bubble Map
define([
    'base/tool'
], function(Tool) {

    var Map = Tool.extend({
        init: function(config, options) {

            this.name = 'map';
            this.template = 'tools/_gapminder/map/map';

            //add components
            this.components = [{
                component: '_gapminder/header',
                placeholder: '.vzb-tool-title'
            }, {
                component: '_gapminder/map',
                placeholder: '.vzb-tool-viz',
                model: ['state.time', 'state.entities', 'state.marker', 'data']
            }, {
                component: '_gapminder/timeslider',
                placeholder: '.vzb-tool-timeslider',
                model: ['state.time']
            }, {
                 component: '_gapminder/buttonlist',
                 placeholder: '.vzb-tool-buttonlist',
                 model: ['state', 'data', 'language'],
                 buttons: ['size']
            }];

            this._super(config, options);
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