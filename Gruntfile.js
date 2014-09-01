module.exports = function(grunt) {

    /* 
     * load all grunt tasks, instead of loading each one like this:
     * grunt.loadNpmTasks('grunt-concurrent'); ...
     * This reads the file package.json
     * More info here: https://github.com/sindresorhus/load-grunt-tasks
     */
    require('load-grunt-tasks')(grunt);

    /* 
     * -----------------------------
     * Tasks:
     */

    //default task: grunt
    grunt.registerTask('default', [
        'build' //by default, just build
    ]);

    //developer task: grunt dev
    grunt.registerTask('dev', [

        'clean:dist', //clean dist folder
        'copy', //copy js and template files
        // 'requirejs:dev', //concatenate all in one file
        'sass:dev', //compile scss
        'examples', //build examples
        'connect', //run locally
        'watch' //watch for code changes

    ]);

    //developer task: grunt dev
    grunt.registerTask('build', [

        'clean:dist', //clean dist folder
        'copy', //copy js and template files
        // 'requirejs:dist', //use requirejs for amd module
        'sass:dist', //compile scss
        'examples', //build examples
        'requirejs:js'

    ]);

    //default task with connect
    grunt.registerTask('serve', [
        'default', //default build
        'connect', //run locally
        'watch' //watch for code changes
    ]);

    /* 
     * -----------------------------
     * Configuration:
     */

    grunt.initConfig({

        // Clean dist folder to have a clean start
        clean: {
            dist: ["dist"]
        },

        // Copy all js and template files to dist folder
        copy: {
            scripts: {
                cwd: 'src',
                src: ['**/*.js'],
                dest: 'dist',
                expand: true
            },
            templates: {
                cwd: 'src',
                src: ['assets/imgs/**', '**/*.html'],
                dest: 'dist',
                expand: true
            }
        },

        // Uglifying JS files
        uglify: {
            files: {
                cwd: 'src/', // base path
                src: '**/*.js', // source files mask
                dest: 'dist', // destination folder
                expand: true, // allow dynamic building
                mangle: false, // disallow change in names
                flatten: false // remove all unnecessary nesting
            }
        },

        // Compile SCSS files into CSS (dev mode is not compressed)
        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'dist/vizabi.css': 'src/assets/style/vizabi.scss',
                }
            },
            dev: {
                options: {
                    style: 'expanded'
                },
                files: {
                    'dist/vizabi.css': 'src/assets/style/vizabi.scss',
                }
            }
        },

        // Make sure necessary files are built when changes are made
        watch: {
            styles: {
                files: ['src/**/*.scss'],
                tasks: ['sass:dev']
            },
            scripts: {
                files: ['src/**/*.js'],
                tasks: ['copy:scripts']
            },
            templates: {
                files: ['src/**/*.html'],
                tasks: ['copy:templates']
            },
            examples: {
                files: ['examples/**/*.html', '!examples/index.html'],
                tasks: ['examples']
            },
            options: {
                livereload: {
                    port: '<%= connect.options.livereload %>'
                }
            }


        },

        connect: {
            options: {
                port: 9000,
                livereload: 35729,
                // change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    open: 'http://<%= connect.options.hostname %>:<%= connect.options.port %>/examples/'
                }
            }
        },

        requirejs: {
            // Options: https://github.com/jrburke/r.js/blob/master/build/example.build.js
            dist: {
                options: {
                    baseUrl: "src/",
                    mainConfigFile: "src/config.js",
                    out: "dist/vizabi.js",
                    optimize: "uglify",
                    generateSourceMaps: false,
                }
            },
            dev: {
                options: {
                    baseUrl: "src/",
                    mainConfigFile: "src/config.js",
                    out: "dist/vizabi.js",
                    optimize: "none",
                    generateSourceMaps: true
                }
            },
            js: {
                options: {
                    'baseUrl': '',
                    'mainConfigFile': 'src/re-config.js',
                    'include': ['src/vizabi'],
                    'out': 'build/vizabi-cleaned/exampleLib.js',
                    'onModuleBundleComplete': function(data) {
                        var fs = require('fs'),
                            amdclean = require('amdclean'),
                            outputFile = data.path;

                        fs.writeFileSync(outputFile, amdclean.clean({
                            'filePath': outputFile,
                            'globalModules': ['src/vizabi'],
                            'wrap': {
                                'start': '(function(){\n',
                                'end': '\n}());}'
                            }
                        }));
                    },
                    optimize: 'none'
                }
            }
        }
    });

    /*
     * ---------
     * Building custom example index
     */

    grunt.registerTask('examples', 'Writes example.html', function() {

        var examples_folder = 'examples/',
            examples_index = examples_folder + 'index.html',
            contents = "<h1>Vizabi Examples:</h1>",
            current_dir;

        grunt.file.recurse(examples_folder, function(abs, root, dir, file) {
            if (typeof dir !== 'undefined' && file.indexOf('.html') !== -1) {
                if (current_dir !== dir) {
                    current_dir = dir;
                    contents += "<h2>" + dir + "</h2>";
                }
                var link = dir + '/' + file;
                var example = "<p><a href='" + link + "'>" + file + "</a></p>";
                contents += example;
            }
        });
        grunt.file.write(examples_index, contents);
        grunt.log.writeln("Wrote examples index.");
    });


}