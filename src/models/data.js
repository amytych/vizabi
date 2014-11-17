define([
    'jquery',
    'lodash',
    'base/model',
    'base/data'
], function($, _, Model, DataManager) {

    var DataModel = Model.extend({

        /**
         * Initializes the data model.
         * @param {Object} values The initial values of this model
         * @param intervals A parent intervals handler (from tool)
         * @param {Object} bind Initial events to bind
         */
        init: function(values, intervals, bind) {

            values = _.extend({
                reader: "local-json",
                path: "data.json"
            }, values);

            //initial values
            this._loading = false;
            this._items = [];
            this._query = [];
            this._language = "en";
            this._dataManager = new DataManager();

            //same constructor as parent, with same arguments
            this._super(values, intervals, bind);
        },

        /**
         * Overwrites the get method in order to get items easily
         * @param pars Optional attribute
         * @returns attr value or all values if attr is undefined
         */
        get: function(pars) {
            if (pars === "items") {
                return this.getItems();
            }
            return this._super(pars);
        },

        /**
         * Gets the items
         * @returns {Array} all items in the collection
         */
        getItems: function() {
            if (this._items.length === 1) return this._items[0];
            return this._items;
        },
        
        /**
         * Sets a new collection
         * @param name - name of the property to store values in
         * @param arg - the values to store
         */
        setItems: function(name, arg) {
            this[name] = arg;
        },

        /**
         * Gets limits
         * @returns {Object} time limits
         */
        //TODO: this only works for acceptable formats for new Date()
        getLimits: function(attr) {
            if (_.isArray(this._items) && this._items.length === 1) {
                this._items = this._items[0];
            }
            if (!attr) attr = 'time'; //fallback in case no attr is provided
            var limits = {
                    min: 0,
                    max: 0
                },
                filtered = _.map(this._items, function(d) {
                    //TODO: Move this up to readers ?
                    return new Date(d[attr]);
                });
            if (filtered.length > 0) {
                limits.min = _.min(filtered);
                limits.max = _.max(filtered);
            }
            return limits;
        },

        /**
         * Loads data using data manager
         * @returns a promise that will be resolved when data is available
         */
        load: function(query, language) {
            var _this = this,
                defer = $.Deferred();

            if (!query || !language || this._loading) {
                return true;
            }

            this._loading = true;
            this.trigger("load_start");
            //when request is completed, set it
            this._dataManager.load(query,
                    language,
                    this.reader,
                    this.path)
                .done(function(data) {
                    _this._loading = false;
                    if (data === 'error') {
                        _this.trigger("load_error", query);
                    } else {
                        _this._items = _this._dataManager.get();
                        _this.trigger(["load_end", "change"]);
                        defer.resolve();
                    }
                });

            return defer;
        },
        
         
        /**
         * FILL GAPS
         * feels the gaps in data and fills them using linear interpolation
         * @param data — flat array of data objects, each object contains indicators and a property of "time"
         * @param indicators — array of strings — indicators to be interpolated independently
         * /!\ data array has to be sorted by time (ascending)
         */
        fillGaps: function(data, indicators){
            
            // 1. Let prev and next be the reference points for interpolation
            // each is a vector of length same as @indicators
            var prev = [],
                next = [],
                done = [];

            // 2. Go through all time points only once
            data.forEach(function(datum, di){
                //primitive check if input array is sorted
                if(di>0 && datum.time < data[di-1].time) console.warn("Looks like the data array is not sorted by time. Iterpolation result might be a mess");

                // 3. Now go through all indicators and fill in the missing values
                indicators.forEach(function(indicator, i){

                    //If we already have a value here, then save it to 1st reference point and move on
                    if(datum[indicator]!=null){prev[i] = datum; next[i] = null; return;}

                    //If the measurements havn't yet started or have finished — move on
                    if(prev[i]==null || done[i]) return;

                    //If we run into our 2nd reference point, then reset it: we need a new one
                    if(next[i]==datum) next[i] = null;

                    //If we got here then the value is missing and we need interpolation 
                    //if we don't have the 2nd reference point, we need to find it
                    if(next[i]==null){
                        for(var s = di; s<data.length; s++){
                            //if found the next value then save it and stop looping
                            if(data[s][indicator]!=null){
                                next[i] = data[s]; 
                                break;
                            }
                        }
                    }

                    //If 2nd ref point is still NULL then measurements have finished and we quit
                    if(next[i]==null) {done[i] = true; return;}

                    //Finally, here goes interpolation!
                    var fraction = (datum.time-prev[i].time)/(next[i].time-prev[i].time)                    
                    datum[indicator] = prev[i][indicator] + ((next[i][indicator] - prev[i][indicator]) * fraction);
                    //TODO: use utils function instead?
                    //datum[indicator] = utils.interpolate(prev[i][indicator],next[i][indicator],fraction);
                    
                    //Save this point to 1st reference point for the next value
                    prev[i] = datum;
                });
            });

            return data;
        }         
            
    });

    return DataModel;
});
