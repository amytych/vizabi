define([
    'jquery',
    'base/component',
    'jqueryui_autocomplete'
], function($, Component) {

    var $filterInput;

    var Filter = Component.extend({
        init: function(context, options) {
            this.name = 'filter';
            this.template = 'components/_gapminder/' + this.name + '/' + this.name;
            this.tool = context;
            this._super(context, options);
        },

        postRender: function() {
            var _this = this;

            $filterInput = $('#filter');


            $filterInput.autocomplete({
                minLength: 2,
                change: function (event, ui) {
                    console.log(ui);
                },
                focus: function(event, ui) {
                    event.preventDefault();
                    $(this).val(ui.item.label);
                },
                select: function( event, ui ) {
                    event.preventDefault();
                    $(this).val('');
                    _this.events.trigger('item:filtered', ui.item.value);
                    selected = ui.item.value;
                }
            });

            this.update();
        },

        update: function() {
            var data = this.model.getData()[0],
            year = this.model.getState("time"),
            currentYearData = data.filter(function(row) { return (row.time == year); }),
            source = _.map(currentYearData, function (country) { return {value: country.geo, label: country['geo.name']}; });

            $filterInput.autocomplete('option', 'source', source);

            this.resize();
        },

        resize: function() {
        },

    });

    return Filter;
});