define([
    'components/_gapminder/buttonlist/dialogs/dialog',
    'lodash',
    'jquery'
], function(Dialog, _, $) {

    var SelectDialog = Dialog.extend({
        /**
         * Initializes the dialog component
         * @param config component configuration
         * @param context component context (parent)
         */
        init: function(config, parent) {
            this.name = 'select';
            this.template_data = {
                options: []
            };
            this.model_expects = ['state', 'data'];
            
            this._super(config, parent);


            //add corresponding component
            this.components.push({
                component: '_examples/text-display',
                placeholder: '.vzb-select-display',
                model: ['state.entities', 'state.row']
            },
            {
                component: '_examples/dropdown',
                placeholder: '.vzb-dropdown-dim-display',
                model: ['state.entities', 'state.row'],
                item: {name: 'filter', id: 'filter'}
            },
            {
                component: '_examples/dropdown',
                placeholder: '.vzb-dropdown-filter-display',
                model: ['state.entities', 'state.row'],
                item: {name: 'dimention', id: 'dim'}
            });

        },


        domReady: function() {
            this.selector = this.element.select("vzb-entity-picker");
            this._super();
        },

        //TODO: check why update is being called multiple times
        modelReady: function() {
            var _this = this,
                data = _.uniq(this.model.state.row.label.getItems(), 'geo'),
                entities = this.model.state.entities.select;

            var list = this.element.select('.vzb-select-list')
                .select('ul');

            var labels = list.selectAll('li')
                .data(data)
                .enter()
                .append('li')
                .append('label')
                .on('click', function(d, i) {
                    _this.model.state.entities.selectEntity(d);
                })
                .on('mouseover', function(d, i) {
                    _this.model.state.entities.hoverEntity(d);
                })
                .on('mouseout', function(d, i) {
                    _this.model.state.entities.hoverEntity(d);
                });


            labels.append('input')
                .attr('type', 'checkbox')
                .attr('value', function(d)  {
                    return d.geo;
                })
                .attr('name', function(d) {
                    return d.value;
                })
                .attr('data', function(d) {
                    return d.value;
                });

            labels.append('span').text(function(d) {
                return d.value;
            });

            this._super();
        }

    });

    return SelectDialog;
});