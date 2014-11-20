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

            //specifying subcomponents
            this.components = [];

            //contructor is the same as any component
            this._super(config, context);
        },

        /**
         * Executes after the template is loaded and rendered.
         * Ideally, it contains HTML instantiations related to template
         * At this point, this.element and this.placeholder are available as a d3 object
         */
        postRender: function() {
            var min = 2,
                max = 20;

            this.slider = this.element.select('#vzb-bs-slider')
                .attr('min', min)
                .attr('max', max)
                .on('input', this.slideHandler.bind(this));
        },

        /**
         * Executes everytime there's an update event.
         * Ideally, only operations related to changes in the model
         * At this point, this.element is available as a d3 object
         */
        update: function() {
            this.slider.node().value = +this.model.size;
        },

        /**
         * Executes everytime the container or vizabi is resized
         * Ideally,it contains only operations related to size
         */
        resize: function() {
            //E.g: var height = this.placeholder.style('height');
        },

        slideHandler: function () {
            this.model.size = +d3.event.target.value;
        }
    });

    return BubbleSize ;

});