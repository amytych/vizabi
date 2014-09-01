require(["base/core"], function(Core) {

    var Vizabi = function(name, container, options) {
        var _this = this,
            core;

        core = new Core();

        //start core
        var promise = core.start(name,
            container,
            options);

        //tell external page that vizabi is ready
        promise.then(
            function() {
                if (typeof options.ready === "function") {
                    options.ready();
                }
            },
            //or tell external page that there's an error

            function(err) {
                if (typeof options.ready === "function") {
                    options.ready(err);
                }
            }
        );

        //placeholder identifies the tool
        this.setOptions = function(placeholder, opts) {
            if (core) core.setOptions(placeholder, opts);
        };
    };

    return Vizabi;
});