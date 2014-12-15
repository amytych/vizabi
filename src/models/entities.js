define([
    'lodash',
    'base/model'
], function(_, Model) {

    var Entity = Model.extend({

        /**
         * Initializes the entities model.
         * @param {Object} values The initial values of this model
         * @param parent A reference to the parent model
         * @param {Object} bind Initial events to bind
         */
        init: function(values, parent, bind) {

            values = _.extend({
                show: {},
                select: [],
                brush: []
            }, values);

            this._super(values, parent, bind);
        },

        /**
         * Validates the model
         * @param {boolean} silent Block triggering of events
         */
        validate: function(silent) {
            //TODO: validate if select and brush are a subset of show
        },

        /**
         * Gets the dimensions in this entities
         * @returns {Array} Array of unique values
         */
        getDimension: function() {
            return this.show.dim;
        },

        /**
         * Gets the filters in this entities
         * @returns {Array} Array of unique values
         */
        getFilters: function() {
            return this.show.filter;
        },

        selectEntity: function(d) {
            var value = d[this.getDimension()],
                select_array = this.select;
            if(this.isSelected(d)) {
                select_array = _.without(select_array, value);
            } else {
                select_array.push(value);
            }
            this.set("select", select_array);
        },

        isSelected: function(d) {
            var value = d[this.getDimension()];
            var select_array = this.select;
            if(_.indexOf(select_array, value) !== -1) {
                return true;
            } else {
                return false;
            }
        }

    });

    return Entity;
});