define([
    'd3',
    'lodash',
    'base/utils',
    'base/component'
], function(d3, _, utils, Component) {

    var DropDown = Component.extend({

        init: function(options, context) {
            this.name = "dropdown";
            this.template = "components/_examples/dropdown/dropdown";
            this.item = options.item;

            this.model_expects = ['entities', 'row'];


            this._super(options, context);
        },

        domReady: function() {
            this.span = this.element.select('span');
            this._super(); 
        },

        modelReady: function(evt) {
            var _this = this,
                entities = this.model.entities.select,
                data = _.uniq(this.model.row.label.getItems(), 'geo'),
                hover = this.model.entities.hover;

            this.span.html(this.item.name);

        }


    });

    return DropDown;

});