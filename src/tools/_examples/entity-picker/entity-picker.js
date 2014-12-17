define([
    'lodash',
    'd3',
    'base/tool'
], function(_, d3, Tool) {

    var EntityPicker = Tool.extend({

        init: function(config, options) {

            this.name = 'entity-picker';
            this.template = "tools/_examples/entity-picker/entity-picker";

            this.components = [{
                component: '_gapminder/buttonlist',
                placeholder: '.vzb-tool-buttonlist',
                model: ['state', 'data', 'language'],
                buttons: ['select']
            }, {
                component: '_examples/entity-display',
                placeholder: '.vzb-tool-entity-display',
                model: ['state.entities', 'state.row']
            }];

            this._super(config, options);

        },

        toolModelValidation: function(model) {
            var time = model.state.time,
                markers = model.state.row.label;

            //don't validate anything if data hasn't been loaded
            if (!markers.getItems() || markers.getItems().length < 1) {
                return;
            }

            var dateMin = markers.getLimits('time').min,
                dateMax = markers.getLimits('time').max;

            if (time.start < dateMin) {
                time.start = dateMin;
            }
            if (time.end > dateMax) {
                time.end = dateMax;
            }
        }

    });

    return EntityPicker;
});