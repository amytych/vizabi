define([
    'base/class',
    'jquery',
    'lodash'
], function(Class, $, _) {

    var dataManager = Class.extend({

        /**
         * Initializes the data manager.
         */
        init: function() {
            this._data = {};
        },

        /**
         * Loads resource from reader or cache
         * @param {Array} query Array with queries to be loaded
         * @param {String} language Language
         * @param {Object} reader Which reader to use. E.g.: "local-json"
         * @param {String} path Where data is located
         */
        load: function(query, language, reader, evts) {

            var _this = this,
                defer = $.Deferred(),
                promises = [],
                cached = this.isCached(query, language, reader),
                loaded = false,
                promise;

            //if result is cached, dont load anything
            if (cached) {
                promise = true;
            } else {

                if(evts && _.isFunction(evts["load_start"])) {
                    evts["load_start"]();
                }

                promise = this.loadFromReader(query, language, reader).then(function(queryId) {
                    loaded = true;
                    cached = queryId;
                });
            }
            promises.push(promise);
            $.when.apply(null, promises).then(
                // Great success! :D
                function() {
                    //not loading anymore
                    if(loaded && evts && _.isFunction(evts["load_end"])) {
                        evts["load_end"]();
                    }
                    //pass the data forward
                    defer.resolve(_this.get(cached));
                },
                // Unfortunate error
                function() {
                    defer.resolve('error');
                });

            return defer;
        },

        /**
         * Loads resource from reader
         * @param {Array} query Array with queries to be loaded
         * @param {String} lang Language
         * @param {Object} reader Which reader to use. E.g.: "local-json"
         * @param {String} path Where data is located
         */
        loadFromReader: function(query, lang, reader) {
            var _this = this,
                defer = $.Deferred(),
                reader_name = reader.reader;
            require(["readers/" + reader_name], function(Reader) {
                var r = new Reader(reader);
                r.read(query, lang).then(function() {
                    var queryId = _this._idQuery(query, lang, reader);
                    _this._data[queryId] = r.getData();
                    defer.resolve(queryId);
                });
            });
            return defer;
        },

        /**
         * Gets all items
         * @param queryId query identifier
         * @returns {Array} items
         */
        get: function(queryId) {
            if (queryId) {
                return this._data[queryId];
            }
            return this._data;
        },

        /**
         * Checks whether it's already cached
         * @returns {Boolean}
         */
        isCached: function(query, language, reader) {
            //encode in one string
            var query = this._idQuery(query, language, reader);
            //simply check if we have this in internal data
            if(_.keys(this._data).indexOf(query) !== -1) {
                return query;
            }
            return false;
        },

        /**
         * Encodes query into a string
         */
        _idQuery: function(query, language, reader) {
            return JSON.stringify(query) + language + JSON.stringify(reader);
        },

        /**
         * Clears all data and querying
         */
        clear: function() {
            this._data = {};
        }
    });

    return dataManager;
});