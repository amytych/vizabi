//Bubble Map
define([
    'base/tool'
], function(Tool) {

    var Map = Tool.extend({
        init: function(config, options) {

            this.name = 'map';
            this.template = "tools/_gapminder/map/map";

            //add components
            this.components = [{
                component: '_gapminder/map',
                placeholder: '.vzb-tool-viz',
                model: ['data.path', 'state.show', 'data', 'state.time', 'state.bubble']
            }, {
                component: '_gapminder/header',
                placeholder: '.vzb-tool-title'
            }, {
                component: '_gapminder/timeslider',
                placeholder: '.vzb-tool-timeslider',
                model: ['state.time']
            }, {
                 component: '_gapminder/buttonlist',
                 placeholder: '.vzb-tool-buttonlist',
                 model: ['state', 'data', 'language', 'state.bubble'],
                 buttons: ['size']
            }];

            this._super(config, options);
        },

        //TODO: Check mapping options

        getQuery: function(model) {
            var state = model.state;

            //build query with state info
            var query = [{
                    select: [
                        'geo',
                        'time',
                        'geo.name',
                        'geo.category',
                        state.show.indicator
                    ],
                    where: {
                        geo: state.show.geo,
                        'geo.category': state.show['geo.category'],
                        time: state.time.timeRange
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }, {
                    select: [
                        'topo'
                    ],
                    where: {
                        'geo': '*',
                        'geo.category': '*',
                        'time': '*'
                    }
                }];

            return query;
        },

        /**
         * Validating the tool model
         * @param model the current tool model to be validated
         */
        //FIXME: why is toolModelValidation called on every time step? see issue #37
        toolModelValidation: function(model) {

            var state = model.state;
            var data = model.data;

            // TODO: Maybe there can be better way of finding proper data set,
            // when there are multiple data sets
            var items = _.find(data.getItems(), function (d) {
                return _.isArray(d) && d[0].time;
            });

            if (!items || !items.length) {
                return;
            }
 
            // clamp time scale if it exceeds the boundaries of data
            var dateMin = data.getLimits('time').min,
                dateMax = data.getLimits('time').max;

            if (state.time.start < dateMin) {
                state.time.start = dateMin;
            }
            if (state.time.end > dateMax) {
                state.time.end = dateMax;
            }
           // //TODO: it should be called only once and after changing state.show 
           //  if(!state.show.dataIsProcessed || data.path !== data.currentPath){
           //      console.log(data.path);
                

           //      var indicator = state.show.indicator;
           //      // var items = data.getItems().filter(function(d){
           //      //     return state.show.geo_category.indexOf(d["geo.category"][0]) >= 0;
           //      //     });
                
           //      // save max and min values to the model (each is a vector for all indicators)
           //      var minValue = indicator.map(function(ind) {
           //          return d3.min(items, function(d) {return +d[ind];});
           //      });
           //      var maxValue = indicator.map(function(ind) {
           //          return d3.max(items, function(d) {return +d[ind];});
           //      });
           //      data.setItems("minValue", minValue);
           //      data.setItems("maxValue", maxValue);

           //      // group data points by geo.name
           //      var nested = d3.nest()
           //          .key(function(d){return d["adm1.name"] || d["geo.name"]})
           //          .rollup(function(leaves){
           //              var collect = [];
           //              var times = _.uniq(leaves.map(function(d){return d.time})).sort(d3.ascending);

           //              //merge different indicators with the same time points
           //              //this will not be needed when i will 
           //              //TODO: connect new data format
           //              times.forEach(function(t){
           //                  var merged = {};
           //                  merged.name = leaves[0]["adm1.name"] || leaves[0]["geo.name"]; 
           //                  merged.category = (leaves[0]["geo.category"]) ? leaves[0]["geo.category"][0] : 'county';
           //                  // merged.region = merged.name.split("-")[0]; 
           //                  // merged.region = merged['adm1.name']; 
           //                  merged.time = d3.time.format(state.time.format).parse(t); 

           //                  // this sodomy will go away witht the proper input
           //                  leaves.filter(function(l){return l.time == t})
           //                      .forEach(function(dd){
           //                          indicator.forEach(function(ind) { 
           //                              if(dd[ind])merged[ind] = +dd[ind];
           //                          });
           //                      });
                            
           //                  collect.push(merged);
           //              });

           //              //sometimes certain indicator values are missing 
           //              //from the data points. here we fill them in
           //              return data.fillGaps(collect, indicator);
           //          })
           //          .entries(items);

           //      nested.forEach(function (d) {
           //          var latlng;
           //          // d.region = d.values[0]['country.name'] || d.values[0]['geo.category'];
           //          // find the lat and lng for this node
           //          latlng = _.find(latlngs, function (l) { return l.name === d.key; });
           //          if (latlng) {
           //              d.lat = latlng.lat;
           //              d.lng = latlng.lng;
           //          }
           //      });

           //      // Filter data set eliminating entries without lat lng
           //      // TODO: Hopefuly won't be needed with proper data set
           //      nested = _.filter(nested, function (el) { return el.lat && el.lng; });

           //      // save the nested data to the model
           //      data.setItems("nested", nested);

           //      // this flag should be reset together with changing state.show 
           //      state.show.dataIsProcessed = true;
                
           //      data.setItems('currentPath', data.path);
            // }
        },

        processNestedData: function (model) {

        }
    });

    return Map;
});