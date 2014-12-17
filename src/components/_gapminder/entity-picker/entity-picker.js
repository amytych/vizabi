//TODO: refactor this whole thing!

define([
    'd3',
    'lodash',
    'base/utils',
    'base/component'
], function(d3, _, utils, Component) {


    var EntityPicker = Component.extend({

        init: function(config, context) {
            //set properties
            this.name = 'entity-picker';
            this.template = "components/_gapminder/" + this.name + "/" + this.name;

            this.components = [];
            //basic template data for buttons
            this.template_data = {
                buttons: []
            };

            if (config.buttons && config.buttons.length > 0) {
                //TODO: FIXME: Buttons should be a model, not config
                this._addButtons(config.buttons);
            }

            this._super(config, context);

        },
    });


    return EntityPicker;
});