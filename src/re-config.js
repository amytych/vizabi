require.config({
    lib_folder: "../lib/",
    baseUrl: "../../dist/",

    paths: {
        base: 'base',
        tools: 'tools',
        components: 'components',
        readers: 'data-reader',

        d3: lib_folder + '/d3/d3',
        jquery: lib_folder + '/jquery/dist/jquery',
        underscore: lib_folder + '/underscore/underscore',

        jed: lib_folder + '/jed/jed',
        sprintf: lib_folder + '/sprintf/src/sprintf',
        i18n: lib_folder + '/i18n-js/i18n',

        text: lib_folder + '/requirejs-text/text',
        smartpicker: lib_folder + '/smart-picker/dist/smart-picker',

        //TODO: Move this to timeslider2 (component-specific)
        //https://github.com/jrburke/r.js/blob/master/build/example.build.js#L35
        jqueryui_slider: lib_folder + '/jqueryui/ui/minified/jquery.ui.slider.min',
        jqueryui_core: lib_folder + '/jqueryui/ui/minified/jquery.ui.core.min',
        jqueryui_mouse: lib_folder + '/jqueryui/ui/minified/jquery.ui.mouse.min',
        jqueryui_widget: lib_folder + '/jqueryui/ui/minified/jquery.ui.widget.min'
    },

    shim: {
        d3: {
            exports: 'd3'
        },
        i18n: {
            deps: ['jed', 'sprintf', 'jquery'],
            exports: 'i18n'
        },
        smartpicker: {
            deps: ['underscore', 'jquery'],
            exports: 'smartpicker'
        },
        jqueryui_core: {
            deps: ['jquery']
        },
        jqueryui_widget: {
            deps: ['jquery']
        },
        jqueryui_mouse: {
            deps: ['jqueryui_widget']
        },
        jqueryui_slider: {
            deps: ['jquery',
                'jqueryui_core',
                'jqueryui_mouse',
                'jqueryui_widget'
            ]
        }
    }
});