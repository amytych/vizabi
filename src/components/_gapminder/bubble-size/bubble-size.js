//BubbleSize
define([
    'd3',
    'base/component'
], function(d3, Component) {

    var BubbleSize = Component.extend({

        /**
         * Initializes the timeslider.
         * Executed once before any template is rendered.
         * @param config The options passed to the component
         * @param context The component's parent
         */
        init: function(config, context) {
            this.template = "components/_gapminder/bubble-size/bubble-size";

            this.model_expects = ["size"];

            //contructor is the same as any component
            this._super(config, context);
        },

        /**
         * Executes after the template is loaded and rendered.
         * Ideally, it contains HTML instantiations related to template
         * At this point, this.element and this.placeholder are available as a d3 object
         */
        domReady: function() {
            var value = this.model.size.max;
            indicator = this.element.select('#vzb-bs-indicator');
            slider = this.element.selectAll('#vzb-bs-slider');

            slider
                .attr('min', 0)
                .attr('max', 1)
                .attr('step', 0.01)
                .attr('value', value)
                .on('input', this.slideHandler.bind(this));
        },

        /**
         * Executes everytime there's a data event.
         * Ideally, only operations related to changes in the model
         * At this point, this.element is available as a d3 object
         */
        modelReady: function() {
            indicator.text(this.model.size.max);
        },

        /**
         * Executes everytime the container or vizabi is resized
         * Ideally,it contains only operations related to size
         */
        resize: function() {
            //E.g: var height = this.placeholder.style('height');
        },

        slideHandler: function () {
            this.model.size.max = +d3.event.target.value;
        }
    });

    return BubbleSize ;

});