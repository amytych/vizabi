//Indicator Display
define([
    'd3',
    'lodash',
    'base/utils',
    'base/component'
], function(d3, _, utils, Component) {

    var TextDisplay = Component.extend({

        init: function(options, context) {
            this.name = "text-display";
            this.template = "components/_examples/text-display/text-display";

            this.model_expects = ['entities', 'row'];

            this._super(options, context);
        },


        modelReady: function() {
            var _this = this,
                entities = this.model.entities.select,
                data = _.uniq(this.model.row.label.getItems(), 'geo'),
                hover = this.model.entities.hover;

            var label = _this.element.select('.vzb-selected-entities'),
                input = label.select('input'),
                span = label.selectAll('span');
            
            label.selectAll("div").remove();

            label.selectAll("div")
                .data(entities)
                .enter()
                .append("div")
                .attr('class','vzb-text-item')
                .text(function(d) {
                    // find the name of selected entities in data
                    return _.find(data, {
                        'geo': d
                    }).value;
                })
                .style('color', function(d) {
                    return hover.indexOf(d) >= 0 ? '#F77481' : 'white';
                })
                .sort();
        }


    });

    return TextDisplay;

});