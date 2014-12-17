define([
    'd3',
    'lodash',
    'base/utils',
    'base/component'
], function(d3, _, utils, Component) {

    var EntityDisplay = Component.extend({

        init: function(options, context) {
            this.name = "entity-display";
            this.template = "components/_examples/entity-display/entity-display";

            this.model_expects = ['entities', 'row'];

            this._super(options, context);
        },

        modelReady: function(evt) {
            var _this = this,
                entities = this.model.entities.select,
                data = _.uniq(this.model.row.label.getItems(), 'geo'),
                hover = this.model.entities.hover;

            this.element.selectAll("p").remove();

            this.element.selectAll("p")
                .data(entities)
                .enter()
                .append("p")
                .text(function(d) {
                    // find the name of selected entities in data
                    return _.find(data, {
                        'geo': d
                    }).value;
                })
                .style('color', function(d) {
                    return hover.indexOf(d) >= 0 ? '#F77481' : '#4B98AA';
                })
                .sort();
        }


    });

    return EntityDisplay;

});