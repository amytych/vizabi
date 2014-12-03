define([
    'd3',
    'lodash',
    'models/hook'
], function(d3, _, Hook) {

    var Color = Hook.extend({

        /**
         * Initializes the color hook
         * @param {Object} values The initial values of this model
         * @param parent A reference to the parent model
         * @param {Object} bind Initial events to bind
         */
        init: function(values, parent, bind) {

            values = _.extend({
                use: "value",
                value: undefined
            }, values);
            this._super(values, parent, bind);
        },

        /**
         * Validates a color hook
         */
        validate: function(silent) {

            //this domain must exist
            if (this.use !== "value" && !this.domain) {
                 this.set("domain", ["#CCCCCC", "#000000"], silent, true);
            } else if (this.use === "value") {
                this.set("value", d3.rgb(this.value).toString(), silent, true);
            }
        },

        /**
         * Maps value for this hook
         * @param value Original value
         * @returns {String} color
         */
        mapValue: function(value) {

            var color;
            switch (this.use) {
                case "indicator":
                    color = this._getColorLinear(value);
                    break;
                case "property":
                    color = this._getColorOrdinal(value);
                    break;
                case "value":
                default:
                    color = value;
                    break;
            }
            return color;
        },

        /**
         * Gets value of color with linear interpolation
         * @returns {String} color
         */
        _getColorLinear: function(value) {

            var limits = this.getLimits(this.value),
                min = parseFloat(limits.min),
                max = parseFloat(limits.max),
                step = ((max-min) / (this.domain.length - 1));

            //todo: clean this perturbation up (hotfix)
            max = max + max / 10000;

            var domain = d3.range(min, max, step);

            var s = d3.scale.linear()
                .domain(domain)
                .range(this.domain)
                .interpolate(d3.interpolateRgb);

            return s(value);

        },

        /**
         * Gets value of color with discrete values
         * @returns {String} color
         */
        _getColorOrdinal: function(value) {

            var possible = this.getUnique(this.value);

            var s = d3.scale.ordinal()
                .domain(possible)
                .range(this.domain);

            return s(value);
        }

    });

    return Color;
});