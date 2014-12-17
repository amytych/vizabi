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
            var select_array = this.select,
            index_of_element = select_array.indexOf(d.geo);

            if (index_of_element >= 0) {
                select_array.splice(index_of_element, 1);
            } else {
                select_array.push(d.geo);
            }
            this.set("select", select_array);
        },

        hoverEntity: function(d) {
            var hover_array = this.hover,
            index_of_element = hover_array.indexOf(d.geo);

            if (index_of_element >= 0) {
                hover_array.splice(index_of_element, 1);
            } else {
                hover_array.push(d.geo);
            }
            this.set("hover", hover_array);
        },

        isSelected: function(d) {
            var select_array = this.select;
            if (_.indexOf(select_array, d.value) !== -1) {
                return true;
            } else {
                return false;
            }
        }

    });

    return Entity;
});