//FIXME: refactor hardcoded dates
//FIXME: remove date formatting from here

define([
    'lodash',
    'd3',
    'base/tool'
], function(_, d3, Tool) {

    var bubbleChart = Tool.extend({
        /**
         * Initialized the tool
         * @param config tool configurations, such as placeholder div
         * @param options tool options, such as state, data, etc
         */
        init: function(config, options) {

            this.name = 'bubble-chart';
            this.template = "tools/_examples/bubble-chart/bubble-chart";

            //instantiating components
            this.components = [{
                component: '_gapminder/header',
                placeholder: '.vzb-tool-title'
            }, {
                component: '_examples/bubble-chart',
                placeholder: '.vzb-tool-viz', //div to render
                model: ["state.show", "data", "state.time"]
            }, {
                component: '_gapminder/timeslider',
                placeholder: '.vzb-tool-timeslider', //div to render
                model: ["state.time"]
            }, {
                component: '_gapminder/buttonlist',
                placeholder: '.vzb-tool-buttonlist'
            }];

            this._super(config, options);

        },

        /**
         * Validating the tool model
         * @param model the current tool model to be validated
         */
        //FIXME: why is toolModelValidation called on every time step? see issue #37
        toolModelValidation: function(model) {

            var state = model.state;
            var data = model.data;

            //don't validate anything if data hasn't been loaded
            if(!data.getItems() || data.getItems().length < 1) return;

            //TODO: it should be called only once and after changing state.show 
            if(!state.show.dataIsProcessed){
                
                // clamp time scale if it exceeds the boundaries of data
                var dateMin = data.getLimits('time').min,
                    dateMax = data.getLimits('time').max;

                if (state.time.start < dateMin) {
                    state.time.start = dateMin;
                }
                if (state.time.end > dateMax) {
                    state.time.end = dateMax;
                }

                var indicator = model.state.show.indicator;
                var items = data.getItems().filter(function(d){
                    return state.show.geo_category.indexOf(d["geo.category"][0]) >= 0;
                    });
                
                // save max and min values to the model (each is a vector for all indicators)
                var minValue = indicator.map(function(ind) {
                    return d3.min(items, function(d) {return +d[ind];});
                });
                var maxValue = indicator.map(function(ind) {
                    return d3.max(items, function(d) {return +d[ind];});
                });
                data.setItems("minValue", minValue);
                data.setItems("maxValue", maxValue);
            
                // group data points by geo.name
                var nested = d3.nest()
                    .key(function(d){return d["geo.name"]})
                    .rollup(function(leaves){
                        var collect = [];
                        var times = _.uniq(leaves.map(function(d){return d.time})).sort(d3.ascending);
                          
                        //merge different indicators with the same time points
                        //this will not be needed when i will 
                        //TODO: connect new data format
                        times.forEach(function(t){
                            var merged = {};
                            merged.name = leaves[0]["geo.name"]; 
                            merged.category = leaves[0]["geo.category"][0];
                            merged.region = merged.name.split("-")[0]; 
                            merged.time = d3.time.format(state.time.format).parse(t); 

                            // this sodomy will go away witht the proper input
                            leaves.filter(function(l){return l.time == t})
                                .forEach(function(dd){
                                    indicator.forEach(function(ind) { 
                                        if(dd[ind])merged[ind] = +dd[ind];
                                    });
                                });
                            
                            collect.push(merged);
                        
                        });
                        
                        //sometimes certain indicator values are missing 
                        //from the data points. here we fill them in
                        return data.fillGaps(collect,indicator);
                    })
                    .entries(items);
                                
                nested.forEach(function(d){d.region = d.values[0].region;});

                // save the nested data to the model
                data.setItems("nested", nested);
                
                // this flag should be reset together with changing state.show 
                state.show.dataIsProcessed = true;
            }
            
            
            
            
        },

        /**
         * Returns the query (or queries) to be performed by this tool
         * @param model the tool model will be received
         */
        getQuery: function(model) {
            var state = model.state;
            // FIXME why not using same as imput format here?
            var time_start = d3.time.format(state.time.format)(state.time.start);
            var time_end = d3.time.format(state.time.format)(state.time.end);
            
            return [{
                "from": "data",
                
                //FIXME not sure if we need union here. barchart doesn't have it
                "select": _.union(["geo", "geo.name", "time", "geo.region", state.show.indicator]),
                "where": {
                    "geo": state.show.geo,
                    
                    //FIXME: if we select geo_category here wi are not able 
                    //to switch it later using options dropdown
                    "geo.category": "*",//state.show.geo_category,
                    
                    //FIXME: suggest transition to the below format
                    // why would you compile it to a string and then parce back?
                    //"timeFormat": state.time.format,
                    "time": "*" [time_start + "-" + time_end]
                    //"time": [state.time.start, state.time.end]
                }
            }];
        }
    });

    return bubbleChart;
});
