 /*
    Monarch WebApp

    This file is primarily about declaring http routes and handlers for the
    Monarch web application.


    Migrating from RingoJS/Stick to NodeJS/HapiJS

        The original Monarch web application was written assuming a RingoJS
        execution environment, with the use of the Stick module to handle URL
        routing. Most of the routes defined here have been converted from
        their original RingoJS/Stick format into a format that also works with
        NodeJS/HapiJS. These converted route definitions use a set of wrapper
        functions in webenv.js to detect whether the runtime environment
        (Ringo vs Node) and to use the appropriate environment-specific route
        definition.

        To ensure that the source code continues to work with both platforms,
        please use the wrapper functions in serverenv.js and webenv.js.


    Example dual-mode handler:
        //
        // Notice we are declaring both a stick-compatible path (/page/:page)
        // and a Hapi-compatible path (/page/{page}). In addition, we provide
        // an array of parameter names that will be used to extract values from
        // the request and apply them as arguments to the handler function.
        //
        web.wrapRouteGet(app, '/page/:page', '/page/{page}', ['page'],
            function(request, page) {
                var info = newInfo();
                addCoreRenderers(info);

                if ((page !== 'software')){
                    info.pup_tent_css_libraries.push("/tour.css");
                } else {
                    info.pup_tent_css_libraries.push("/monarch-example.css");
                }

                var output = pup_tent.render(page+'.mustache',info);
                return web.wrapHTML(output);
            }
        );

 */

//
//  The 'useBundle' flag below enables Monarch in bundle mode where
//  JS and CSS resources are bundled using webpack.
//  The current default for production should be 'true'
//
var env = require('serverenv.js');
var web = require('web/webenv.js');
var fs = require('fs');
var Mustache = require('mustache');
var bbop = require('../api.js').bbop;
var MonarchCommon = require('../../../js/monarch-common.js');
var phenoPacketBuilder = require('../phenopacket-builder.js');

var useBundle = env.getEnv().USE_BUNDLE;
if (useBundle && useBundle === '0') {
    console.log('#USE_BUNDLE disabled');
    useBundle = false;
}
else {
    console.log('#USE_BUNDLE enabled');
    useBundle = true;
}

var useWebpack = env.getEnv().USE_WEBPACK;
if (useWebpack && useWebpack === '1') {
    console.log('#USE_WEBPACK enabled');
    useWebpack = true;
}
else {
    useWebpack = false;
}

var usePuptentNoCache = env.getEnv().USE_PUPTENT_NOCACHE;
if (usePuptentNoCache && usePuptentNoCache === '1') {
    console.log('#USE_PUPTENT_NOCACHE enabled');
    usePuptentNoCache = true;
}
else {
    usePuptentNoCache = false;
}


// Use bbop-response-golr to handle JSON - Zhou
var bbop_response_golr = require('bbop-response-golr');


//
// newInfo() creates a new info object for use with pup-tent
// newInfo(someInfo) will extend someInfo with any necessary defaults
//
function newInfo(extendThisInfo) {
    var result = extendThisInfo || {};
    result.useBundle = useBundle;
    result.useWebpack = useWebpack;
    result.bundleJS = [];
    result.bundleCSS = [];

    if (useBundle) {
        var assetMapJSON = fs.readFileSync('webpack-assets.json');

        if (assetMapJSON) {
            var assetMap = JSON.parse(assetMapJSON);
            result.bundleJS.push(assetMap.app.js);
            if (!useWebpack) {
                result.bundleCSS.push(assetMap.app.css);
            }
        }
        else {
            console.log('webapp.js error loading webpack-assets.json');
            throw new Error('webapp.js error loading webpack-assets.json');
        }
    }

    result.monarch_launchable = [];
    return result;
}


// A prior version of Monarch used RingoJS' load() to inline the definitions
// into this namespace. These var definitions are here to avoid a mass of git diffs
// that would be caused by replacing every occurrence of genHRef with widgets.genHRef.
//
var widgets = require('./widgets.js');
var     genObjectHref = widgets.genObjectHref;
var     genURL = widgets.genURL;
var     genExternalHref = widgets.genExternalHref;
var     genOverviewOfGenotype = widgets.genOverviewOfGenotype;
//var     genTableOfSearchResults = widgets.genTableOfSearchResults;
var     genTableOfAnalysisSearchResults = widgets.genTableOfAnalysisSearchResults;
var     genTableOfAnnotateTextResults = widgets.genTableOfAnnotateTextResults;
var     genTableOfDataSources = widgets.genTableOfDataSources;
var     genTableOfDiseaseAlleleAssociations = widgets.genTableOfDiseaseAlleleAssociations;
var     genTableOfDiseaseGeneAssociations = widgets.genTableOfDiseaseGeneAssociations;
var     genTableOfDiseaseModelAssociations = widgets.genTableOfDiseaseModelAssociations;
var     genTableOfDiseasePathwayAssociations = widgets.genTableOfDiseasePathwayAssociations;
var     genTableOfDiseasePhenotypeAssociations = widgets.genTableOfDiseasePhenotypeAssociations;
var     genTableOfGeneAlleleAssociations = widgets.genTableOfGeneAlleleAssociations;
var     genTableOfGeneDiseaseAssociations = widgets.genTableOfGeneDiseaseAssociations;
var     genTableOfGeneGenotypeAssociations = widgets.genTableOfGeneGenotypeAssociations;
var     genTableOfGeneInteractionAssociations = widgets.genTableOfGeneInteractionAssociations;
var     genTableOfGeneOrthologAssociations = widgets.genTableOfGeneOrthologAssociations;
var     genTableOfGenePathwayAssociations = widgets.genTableOfGenePathwayAssociations;
var     genTableOfGenePhenotypeAssociations = widgets.genTableOfGenePhenotypeAssociations;
var     genTableOfGeneXRefs = widgets.genTableOfGeneXRefs;
var     genTableOfGenotypePhenotypeAssociations = widgets.genTableOfGenotypePhenotypeAssociations;
var     genTableOfGenoVariantAssociations = widgets.genTableOfGenoVariantAssociations;
var     genTableOfLiterature = widgets.genTableOfLiterature;
var     genTableOfLiteratureGenes = widgets.genTableOfLiteratureGenes;
var     genTableOfSimilarDiseases = widgets.genTableOfSimilarDiseases;
var     genTableOfSimilarModels = widgets.genTableOfSimilarModels;
var     genTableOfSimilarPapers = widgets.genTableOfSimilarPapers;
var     makeExternalURL = widgets.makeExternalURL;

if (env.isRingoJS()) {
  var stick = require('stick');
  var response = require('ringo/jsgi/response');
  var httpclient = require('ringo/httpclient');
  var http = require('ringo/utils/http');
  var strings = require('ringo/utils/strings');
}
else {
  var AsyncRequest = require('request').defaults({
                                          forever: true
                                        });

  var WaitFor = require('wait.for');
}

var pup_tent_loader = require('pup-tent');
var reporter = require('pup-analytics')();

var pup_tent_dirs = [
                    'js',
                    'css',
                    'templates',
                    'templates/labs',
                    'templates/legacy',
                    'templates/page',
                    'widgets/dove',
                    'widgets/dove/js',
                    'widgets/dove/css',
                    'node_modules/bbop',
                    'node_modules/jquery/dist',
                    'node_modules/jquery-ui',
                    'node_modules/jquery-ui/themes/base',
                    'node_modules/requirejs',
                    'node_modules/underscore',
                    'node_modules/bootstrap/dist/css',
                    'node_modules/bootstrap/dist/js',
                    'node_modules/bootstrap/dist/fonts',
                    'node_modules/d3',
                    'node_modules/font-awesome/css',
                    'node_modules/font-awesome/fonts',
                    'node_modules/phenogrid/dist', // dist contains phenogrid-bundle.js and phenogrid-bundle.css
                    'node_modules/phenogrid/config', // config contains phenogrid_config.js
                    'widgets/keggerator/js',
                    'widgets/class-enrichment',
                    'conf', // get access to conf/golr-conf.json
                    'widgets/dove/js/model',
                    'widgets/dove/js/chart',
                    'widgets/dove/js/builder',
                    'js/lib/monarch',
                    'js/lib/monarch/widget',
                    'js/lib/monarch/widget/display'
                    ];

var pup_tent = pup_tent_loader(pup_tent_dirs);

var app;

if (env.isRingoJS()) {
    app = exports.app = new stick.Application();
    app.configure('route');
    app.configure('params');
    app.configure('static');
    app.configure(require('web/sanitize'));
    app.configure(require('web/cors-middleware.js'));

    var http = require("ringo/utils/http");
    var isFileUpload = http.isFileUpload;
    var TempFileFactory = http.TempFileFactory;
    var mergeParameter = http.mergeParameter;
    var BufferFactory = http.BufferFactory;
    var getMimeParameter = http.getMimeParameter;
    var Headers = http.Headers;

    /* Here we are overriding the upload function from stick's upload.js module
     * The stick module is hardcoded to use a BufferFactory for uploads, resulting
     * in large files causing memory issues.  Here we override the function using
     * a TempFileFactory from ringo/utils/http.js.  This streams the data into a
     * temp file using the servers default tmp directory.
     *
     * We also set a limit of 50 mb by checking the content-length in
     * HTTP Header and override the parseFileUpload function to support a
     * streaming limit as well.
     */

    // Custom upload function to upload files to tmp file
    // Set upload limit to <50 MB using content-length from HTTP Header
    // Set streaming limit to <60 MB in case the content-length is incorrect
    app.configure(function upload(next, app) {

        app.upload = {
            impl: TempFileFactory
        };

        return function upload(req) {

            var postParams, desc = Object.getOwnPropertyDescriptor(req, "postParams");

            /**
             * An object containing the parsed HTTP POST parameters sent with this request.
             * @name request.postParams
             */
            Object.defineProperty(req, "postParams", {
                get: function() {
                    if (!postParams) {
                        var contentType = req.env.servletRequest.getContentType();
                        if (req.headers['content-length'] > 50000000){
                            postParams = {};
                            postParams.file_exceeds = req.headers['content-length'];
                        } else if ((req.method === "POST" || req.method === "PUT")
                                && isFileUpload(contentType)) {
                            postParams = {};
                            var encoding = req.env.servletRequest.getCharacterEncoding();
                            var byte_limit = 60000000;
                            parseFileUploadWithLimit(this, postParams, encoding, TempFileFactory, byte_limit);
                        } else if (desc) {
                            postParams = desc.get ? desc.get.apply(req) : desc.value;
                        }
                    }
                    return postParams;
                }, configurable: true
            });

            return next(req);
        };
    });
}
else {
    var Hapi = require('hapi');
    var http = require('http');
    var Inert = require('inert');

    // Create a server with a host and port
    // From http://hapijs.com/api
    //      address - sets the host name or IP address the connection will listen on.
    //      If not configured, defaults to host if present, otherwise to all available
    //      network interfaces (i.e. '0.0.0.0'). Set to 127.0.0.1 or localhost to
    //      restrict connection to only those coming from the same machine.
    //

    // To Test CORS:
    /*
curl -v --X OPTIONS  http://localhost:8080/page/about -H 'Origin: http://localhost:8080' -H 'Access-Control-Request-Headers: Origin, Accept, Content-Type' -H 'Access-Control-Request-Method: GET'>/dev/null
curl -v --X OPTIONS  http://localhost:8080/page/about -H 'Origin: http://example.com' -H 'Access-Control-Request-Headers: Origin, Accept, Content-Type' -H 'Access-Control-Request-Method: GET'>/dev/null
*/


    app = new Hapi.Server();
    app.connection({
        host: '0.0.0.0',
        port: global.defaultPort || 8080,
        routes: {
            cors: true,
            timeout: {  // Disable timeouts. Otherwise, long/slow /compare routes fail
                server: false,
                socket: false }
        }
    });
    app.register(Inert, function () {});
}


//app.static("docs", "index.html", "/docs");

var preloadCSSLibs = [];
var preloadJSLibs = [];

if (useBundle) {
    // pass
}
else {
    preloadCSSLibs = [
        '/font-awesome.min.css',
        '/bootstrap.min.css',
        // '/bootstrap-theme.css',
        '/jquery-ui.css',
        '/monarch-common.css',
        '/monarch-specific.css'
        ];
    preloadJSLibs = [
        '/underscore-min.js'
        ];
}

pup_tent.set_common('css_libs', preloadCSSLibs);
pup_tent.set_common('js_libs', preloadJSLibs);

// The kinds of types that we're likely to see.
var js_re = /\.js$/;
var css_re = /\.css$/;
var css_map_re = /\.css\.map$/;
var json_re = /\.json$/;
var yaml_re = /\.yaml$/;
var html_re = /\.html$/;
var png_re = /\.png$/;
var svg_re = /\.svg$/;
var woff_re = /\.woff$/;
var woff2_re = /\.woff2$/;
var ttf_re = /\.ttf$/;
var mustache_re = /\.mustache$/;

// Add routes for all static cache items at top-level.
pup_tent.cached_list('flat').forEach(
  function(thing) {
    // This will skip cached templates and other files not intended to be
    // sent to the client
    var route_exclusion_re = /\.mustache$|\.json$|\.yaml$|\.sh$/;   // |\.html$/;
    var fileInfo = web.getFileInfo(thing);
    var ctype = fileInfo.mimeType;
    // console.log('STATIC ROUTES: ', thing, ctype);
    if( ctype !== null && !route_exclusion_re.test(thing)) {
        if (env.isRingoJS()) {
            app.get('/' + thing,
                function(req, repl) {
                    return {
                        body: [pup_tent.get(thing)],
                        headers: {'Content-Type': ctype},
                        status: 200
                    };
                });
        }
        else {
          app.route({
            method: 'GET',
            path: '/' + thing,
            handler:
              function (request, reply) {
                var body = pup_tent.get(thing);
                var getResponse = reply(body);
                getResponse.type(ctype);
                // var encoding = fileInfo.encoding;
                // getResponse.encoding(encoding);
                // console.log('### pup_tent.get(', thing, ') ctype:', ctype, ' typeof:', typeof thing, ' enc:', encoding, ' length:', body.length);
              }
          });
        }
    }
    else {
        // console.log('SKIP STATIC ROUTES: ', thing, ctype);
    }
  });


//
// The buildEngine helper function allows us to defer the construction
// of the bbop and MonarchAPI objects until we know the proper configs, which
// are set via app.configServer.
//
function buildEngine(defaultConfig, golrConfig) {
    bbop.monarch.defaultConfig = defaultConfig;
    bbop.monarch.golrConfig = golrConfig;
    var engine = new bbop.monarch.Engine();

    // When not in production, re-read files from disk--makes development
    // easier.
    if (!engine.isProduction() || usePuptentNoCache){
        pup_tent.use_cache_p(false);
    }

    // note: this should probably move to it's own OO module
    engine.cache = {
    fetch: function(tbl, key, val) {
        var result = null;
        var path = "./cache/"+tbl+"/key-"+key+".json";
        if (env.fs_existsSync(path)) {
            // console.log('###CACHE HIT :', key);
            result = env.readJSON(path);
        }
        else {
            // console.log('###CACHE MISS:', key);
        }
        return result;
    },
    store: function(tbl, key, val) {
        var path = "./cache/"+tbl+"/key-"+key+".json";
        // console.log('###CACHE SAVE:', key);
        env.fs_writeFileSync(path, JSON.stringify(val));
    },
    clear: function(match) {
        var files = env.fs_listTreeSync("cache");
        for (var i=0; i<files.length; i++) {
            var file = files[i];
            console.log("T:"+file);
            if (file.indexOf("key-") > 0 &&
                file.indexOf(".json") > 0) {
                if (match != null && file.indexOf(match) == -1) {
                    // does not match specified key
                }
                else {
                    console.log("CLEARING: " + file);
                    env.fs_unlinkSync("./cache/" + file);
                }
            }
        }
    },
    sizeInfo: function() {
        if (env.isRingoJS()) {
            var subprocess = require("ringo/subprocess");
            console.log("Getting sizeInfo for "+this.cacheDirs());
            var info =
                this.cacheDirs().map(function(dir) {
                    return { id : dir,
                             entries : env.fs_listTreeSync("cache/"+dir).filter(function(f){ return f.indexOf(".json") > 0}).length,
                             sizeOnfo : subprocess.command("du -sh cache/"+dir)
                           };
                });
        }
        else {
            var info =
                this.cacheDirs().map(function(dir) {
                    return { id : dir,
                             entries : env.fs_listTreeSync("cache/"+dir).filter(function(f){ return f.indexOf(".json") > 0}).length,
                             sizeOnfo : ""
                           };
                });
        }
        return info;
    },
    cacheDirs: function() {
        if (env.isRingoJS()) {
            return fs.listDirectoryTree("cache").filter(function(f){ return f.length > 0 });
            //return env.fs_listTreeSync("cache").filter(function(f){ return fs.isDirectory(f)});
        }
        else {
            console.log('cache.cacheDirs not supported for NodeJS yet. No equivalent to fs.listDirectoryTree');
        }
    },
    contents: function() {
        return env.fs_listTreeSync("cache").filter(function(f){ return f.indexOf(".json") > 0});
    }
    };

    return engine;
}


// Declare 'engine' into scope now, give it a value later via buildEngine

var engine;

function staticTemplate(t) {
    var info = newInfo();
    addCoreRenderers(info);
    var output = pup_tent.render(t+'.mustache',info);
    return output;
}

function prepLandingPage() {
  // Rendering.
  var info = newInfo();
  var defaults = {
      monarch_nav_search_p: true,
      monarch_extra_footer_p: false,
      monarch_footer_fade_p: false
  };
  addCoreRenderers(info, null, null, defaults);
  info.pup_tent_css_libraries.push("/monarch-landing.css");
  return info;
}

function loadBlogData(category, lim) {
  // Get blog data and render with vars.
  var blog_res = _get_blog_data(category);
  if (blog_res && blog_res.length > lim ) {
    blog_res = blog_res.slice(0, lim);
  }
  return blog_res;
}


function expandTemplate(tmplName, tmplInfo) {
    var result = pup_tent.apply( 'templates/' +  tmplName + '.mustache', tmplInfo);
    // console.log('========= EXPAND ' + tmplName + ' Length:' + result.length + ' =========');
    // console.log(result);
    // console.log('======================================================================');
    return result;
}


// This function takes a json representation of some data
// (for example, a disease and various associated genes, phenotypes)
// intended to be rendered by some template (e.g. disease.mustache) and
// adds additional functions or data to be used in the template.
// The defaults arguments is used to supply initial values. For example, defaults might be:
//   var defaults = {
//       monarch_nav_search_p: false,
//       monarch_extra_footer_p: true,
//       monarch_footer_fade_p: false
//   };
//   addCoreRenderers(info, null, null, defaults);
//
function addCoreRenderers(info, type, id, defaults) {
    // Initialize info
    info = newInfo(info);

    // Standard context.
    info['@context'] = "/conf/monarch-context.json";

    // Add standard pup-tent variables.
    info.pup_tent_css_libraries = [];
    info.pup_tent_js_libraries = [];
    info.pup_tent_js_variables = [];

    // info.pup_tent_js_libraries.push("/facet-filters.js");

    //Adding some global app variables
    var golr_conf_json = env.readJSON('conf/golr-conf.json');
    info.pup_tent_js_variables.push({name:'global_app_base',
        value: engine.config.app_base});
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    info.pup_tent_js_variables.push({name:'global_scigraph_data_url',
        value: engine.config.scigraph_data_url});
    info.pup_tent_js_variables.push({name:'global_solr_url',
        value: engine.config.golr_url});
    info.pup_tent_js_variables.push({name:'global_golr_conf',
        value: golr_conf_json});

    info.monarch_nav_search_p = true;
    info.monarch_extra_footer_p = false;
    info.monarch_footer_fade_p = true;

    // Apply defaults for monarch layout controls.
    if (typeof defaults !== 'undefined') {
        if (typeof(defaults.monarch_nav_search_p) !== 'undefined') {
            info.monarch_nav_search_p = defaults.monarch_nav_search_p;
        }
        if (typeof(defaults.monarch_extra_footer_p) !== 'undefined') {
            info.monarch_extra_footer_p = defaults.monarch_extra_footer_p;
        }
        if (typeof(defaults.monarch_footer_fade_p) !== 'undefined') {
            info.monarch_footer_fade_p = defaults.monarch_footer_fade_p;
        }
    }

    // Other controls.
    info.alerts = [];
    info.scripts = [];
    info.stylesheets = [];

    if (id != null) {
        info.base_url = "/"+type+"/"+id;
        info.download = {
            "json" : genURL(type, id, 'json')
        };
        //console.log("DN:"+JSON.stringify(info.download));
    }

    // Add global CSS.
    info.css = {};
    // info.css.table = "table table-striped table-condensed";

    // Add parsed conf files from /conf if not already in.
    if( info['conf'] == null ){ info['conf'] = {}; }
    if( info['conf']['monarch-team'] == null ){
    // Read in conf/monarch-team.json.
    info['conf']['monarch-team'] =
        env.readJSON('./conf/monarch-team.json');
    }

    if (info.relationships != null) {
        var superClasses = [];
        var subClasses = [];
        var equivalentClasses = [];
        for (var k in info.relationships) {
            var rel = info.relationships[k];
            var propId = rel.property.id;
            if (propId == 'equivalentClass') {
                if (id == rel.subject.id){
                    equivalentClasses.push(rel.object);
                }
                else if (id == rel.object.id) {
                    equivalentClasses.push(rel.subject);
                }
                else {
                    console.error("Logic error: "+JSON.stringify(rel));
                }
            }
        }
        // The concept of node is taken from the OWLAPI; a node
        // is a set of classes that are mutually equivalent
        var node = equivalentClasses.map(function(c){return c.id;}).concat(id);

        for (var k in info.relationships) {
            var rel = info.relationships[k];
            var propId = rel.property.id;
            if (propId == 'subClassOf' || propId == 'BFO_0000050') {
                if (node.indexOf( rel.subject.id ) > -1){
                    if (rel.object.label) {
                        superClasses.push(rel.object);
                    }
                }
                else if (node.indexOf( rel.object.id ) > -1){
                    if (rel.subject.label) {
                        subClasses.push(rel.subject);
                    }
                }
                else {
                    // this state should be impossible when OQ bug is fixed
                    console.error("Logic error: "+rel);
                }
            }
        }
        info.superClasses = superClasses.map(function(c){return genObjectHref(type,c);});
        info.subClasses = subClasses.map(function(c){return genObjectHref(type,c);});

        var uniqueList = engine.filterPhenotypeList(equivalentClasses);
        var uniqueObjList = [];
        uniqueList.forEach (function (i) {
            var tmpObj = {};
            tmpObj['id'] = i;
            var nodes = equivalentClasses.filter(function (v) { return v.id === i});
            if (nodes.length > 0 && 'label' in nodes[0]) {
                tmpObj['label'] = nodes[0]['label']
            }
            uniqueObjList.push(tmpObj);
        });
        info.equivalentClasses = uniqueObjList.map(function(c){return genObjectHref(type,c)+" ("+c.id+")";});
    }
    info.includes = {};
    var alys_id = engine.config.analytics_id || null;

    info.includes.analytics = expandTemplate('analytics', {'analytics_id': alys_id});

    info.includes.navbar = expandTemplate('navbar', info);
    info.includes.disclaimer = expandTemplate('disclaimer-stub', info);

    info.monarch_launchable.push('navbar_search_init()');

    info.includes.footer = expandTemplate('footer', info);
    // info.includes.classificationComponent = expandTemplate('classificationComponent', info);

    info.isProduction = engine.config.type == 'production';

    var alertsConfig = env.readJSON('conf/alerts.json');
    info.alerts = info.alerts.concat(alertsConfig);
    if (!info.isProduction) {
        var prodUrlSuffix = (id == null ? "" : genURL(type, id));
        var prodUrl = "http://monarchinitiative.org" + prodUrlSuffix;
        var legacyUrl = "/legacy" + prodUrlSuffix;
        info.alerts.push("This is the beta interface. <a href='"+prodUrl+"'>View this page on the main portal</a>.");
    }
}


// adds js and other files required for phenogrid
function addPhenogridFiles(info) {
    var phenogrid_conf_json = env.readJSON('conf/phenogrid_config.json');
    info.pup_tent_js_variables.push({name:'global_phenogrid_conf',
        value: phenogrid_conf_json});
    info.pup_tent_js_libraries.push("/phenogrid_config.js");
    info.pup_tent_js_libraries.push("/phenogrid-bundle.js"); // Minified - Zhou
    info.pup_tent_css_libraries.push("/phenogrid-bundle.css"); // Minified - Zhou
}


function addPhenogridView(info, view) {
    var replacer = new RegExp('-', 'g');

    var suffix = bbop.core.uuid().replace(replacer, '');
    var viewID = "view" + suffix;

    info.pup_tent_js_variables.push({name: viewID, value: view});
    info.monarch_launchable.push(
            'loadPhenogrid(global_phenogrid_conf, ' + viewID + ')');
    return info;
}

function addPhenogridViewToAnalyze(info, view) {
    var replacer = new RegExp('-', 'g');

    var suffix = bbop.core.uuid().replace(replacer, '');
    var viewID = "view" + suffix;

    info.pup_tent_js_variables.push({name: viewID, value: view});
    info.monarch_launchable.push(
            'AnalyzeInit(global_phenogrid_conf, ' + viewID + ')');
    return info;
}

// Takes JSON and returns an HTTP response, possibly translating
// the JSON into a requested format.
// Note that HTML is handled separately.
function formattedResults(info, fmt, request) {
    if (env.isRingoJS()) {
        if (fmt == 'json') {
            var jsonResult = response.json(info);
            return jsonResult;
        }
        if (fmt == 'text') {
            return response.text(info);
        }
    }
    else {
        if (fmt == 'json') {
            return web.wrapJSON(info);
        }
        else if (fmt == 'text') {
            return web.wrapTEXT(info);
        }
    }

    if (fmt == 'jsonp') {
        // get callback name from parameters and wrap it around
        //response.
        /// consider replacing with response.jsonp once we got to
        //ringo .10
        var qs = request.queryString;
        var params = http.parseParameters(qs);
        callback = params.callback;
        var resp  = callback+"("+JSON.stringify(info)+");";
        return {
            status: 200,
            headers: {"Content-Type": "application/json"},
            body: [resp]
        };
    }
    else if (fmt == 'rdf' || fmt == 'nt') {
        // prepare  POST request to JSON-LD ==> RDF translator
        // (in future we may do this ourselves)
        var ct = 'text/plain';
        //var ct = 'application/n-triples';
        var tgt = fmt;
        if (fmt == 'rdf') {
            tgt = 'xml';
            ct = 'application/rdf+xml';
        }
        var url = "http://rdf-translator.appspot.com/convert/json-ld/"+tgt+"/content";
        var jsonStr = JSON.stringify(info);
        var rdf = httpclient.post(url, {content:jsonStr}).content;
        return {
            body: [rdf],
            headers: {'Content-Type': ct},
            status: 200
        };
    }
    else {
        return {
            body: [ "Cannot handle format/extension: "+fmt],
            status: 500
        };
    }
}


function errorResponse(errorStatus, errorMessage) {
    var info = newInfo();
    errorStatus = errorStatus || 500;
    errorMessage = errorMessage || (errorStatus + '');
    addCoreRenderers(info);
    //print(JSON.stringify(errorMessage));
    console.error("errorResponse:" + errorMessage + ' (' + errorStatus + ')');
    if (env.isRingoJS()) {
        var stm = require("ringo/logging").getScriptStack(errorMessage);
    }
    else {
        var stm = new Error().stack + '';
    }
    // console.error("Stack trace="+stm);
    //info.message = JSON.stringify(errorMessage, null, ' ');
    info.stackTrace = stm;
    info.message = errorMessage;
    info.title = (errorStatus === 404) ? 'Page Not Found' : 'Error';
    info.debug = !engine.isProduction();
    var template = (errorStatus === 404) ? 'notfound.mustache' : 'error.mustache';
    var output = pup_tent.render(template,info,'monarch_base.mustache');
    return web.wrapHTML(output, errorStatus);
}

function errorResponseWithObject(err) {
    console.log('####errorResponseWithObject:', Object.keys(err));
    return errorResponse(err.status, err.message);
}

function notFoundResponse(msg) {
    return errorResponse(404, msg);
}

////////////////////////////////////////
// CONTROLLER
//


/* Namespace: webapp
 *
 * Monarch REST URLs for retrieving web pages, JSON and HTML
 *
 * Each REST URL pattern has an undelrying implementation in <monarch.api>
 *
 */

/*
 * Method: /status
 *
 * Return the current state of webapp.js, including any interesting
 * analytics we might have collected (TODO).
 *
 * Parameters:
 *  request - the incoming request object
 *
 * Returns:
 *  JSON response
 */

function statusHandler(request) {
    var status = getStatus(request);

    var output = web.wrapJSON(status);
    return output;
}

function getStatus(request) {
    var status = {};

    if (typeof request !== 'undefined') {
        status['location'] = request.url || request.pathInfo || '???';
    }

    status['name'] = "Monarch Application";
    status['okay'] =  true;
    status['message'] =  'okay';
    status['date'] = (new Date()).toString();

    status['platform'] = env.isRingoJS() ? 'ringojs' : 'nodejs';
    status['platform_version'] = env.isRingoJS() ?
        'RingoJS Version Unavailable' :
        ('NodeJS: ' + process.version + ' HapiJS: ' + app.version);
    status['offerings'] = [
        {'name': 'api_version', 'value': engine.apiVersionInfo()},
        {'name': 'config_type', 'value': engine.config.type},
        {'name': 'good_robot_hits', 'value': reporter.report('robots.txt')}
    ];

    return status;
}

web.wrapRouteGet(app, '/status', '/status', [], statusHandler, errorResponse);

/*
 * Method: /services/status
 *
 * Return the current state of monarch services
 *
 * Parameters:
 *  request - the incoming request object
 *
 * Returns:
 *  JSON response
 */

function serviceStatusHandler(request) {
    var status = {};
    var info = {};
    info = engine.getHealthCheck();

    var server_list = Object.keys(info);

    server_list.forEach(function (i) {
        if (info[i]['status'] === 'pass') {
            info[i]['status'] = '<i class="glyphicon glyphicon-ok text-success" aria-hidden="true"></i>';
        } else {
            info[i]['status'] = '<i class="glyphicon glyphicon-remove text-danger" aria-hidden="true"></i>';
        }
    });

    addCoreRenderers(info);
    info.title = 'Monarch Services';


    var output = pup_tent.render('status.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/services/status', '/services/status', [], serviceStatusHandler, errorResponse);


function pageByPageHandler(request, page) {
    var info = newInfo();
    addCoreRenderers(info);

    if (page !== 'software'){
        info.pup_tent_css_libraries.push("/tour.css");
    }

    var pageTitles = {
        about: 'About Monarch',
        releases: 'Monarch Releases',
        disclaimer: 'Monarch Disclaimer',
        team: 'Monarch Development Team',
        software: 'Monarch Software',
        services: 'Monarch Services',
        pubs: 'Monarch Publications',
        glossary: 'Monarch Glossary',
        exomes: 'Monarch Exomes',
        phenogrid: 'Monarch Phenotype Grid Widget'
    };
    var pageStyles = {
        team: '/team.css'
    };

    var style = pageStyles[page];
    if (style) {
        info.pup_tent_css_libraries.push(style);
    }
    info.title = pageTitles[page];
    if (info.title) {
        var output = pup_tent.render(page + '.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    else {
        var redirectUrl = '/about/' + page;
        return web.wrapRedirect(redirectUrl);
    }
}

web.wrapRouteGet(app, '/page/:page', '/page/{page}', ['page'], pageByPageHandler, errorResponse);


// block unwanted access
web.wrapRouteGet(app, '/robots.txt', '/robots.txt', [],
    function(request) {
        var info = newInfo();
        addCoreRenderers(info);
        reporter.hit('robots.txt');

        return web.wrapTEXT(pup_tent.apply('robots.mustache', info));
    }, errorResponse
);

function wrapContentOrError(path) {
    var result = web.wrapContent(path);
    if (!result) {
        result = errorResponse(404, 'Path not found: ' + path);
    }

    return result;
}

// anything in the docs/ directory is passed through statically

function docHandler(request, p1, p2, p3) {
    var path = './docs';
    if (p1) {
        path += '/' + p1;
    }
    if (p2) {
        path += '/' + p2;
    }
    if (p3) {
        path += '/' + p3;
    }

    var result = wrapContentOrError(path);
    return result;
}

web.wrapRouteGet(app, '/docs/:p1/:p2/:p3', '/docs/{p1}/{p2}/{p3}', ['p1', 'p2', 'p3'], docHandler, errorResponse);
web.wrapRouteGet(app, '/docs/:p1/:p2', '/docs/{p1}/{p2}', ['p1', 'p2'], docHandler, errorResponse);
web.wrapRouteGet(app, '/docs/:p1', '/docs/{p1}', ['p1'], docHandler, errorResponse);

web.wrapRouteGet(app, '/fonts/:f', '/fonts/{f}', ['f'],
    function(request, f) {
        var path = '/fonts/'+f;
        if (/^fontawesome/.test(f)) {
            path = './node_modules/font-awesome/fonts/'+f;
            // console.log('fontawesome/' + path + '/');
        }
        else if (/^glyphicons/.test(f)) {
            path = './node_modules/bootstrap/dist/fonts/'+f;
        }
        return wrapContentOrError(path);
    }, errorResponse
);

web.wrapRouteGet(app, '/image/:page', '/image/{page}', ['page'],
    function(request, page) {
        var path = './image/'+page;
        return wrapContentOrError(path);
    }, errorResponse
);

web.wrapRouteGet(app, '/image/team/:page', '/image/team/{page}', ['page'],
    function(request, page) {
        var path = './image/team/'+page;
        return wrapContentOrError(path);
    }, errorResponse
);

web.wrapRouteGet(app, '/images/:file.png', '/images/{file}.png', ['file'],
    function(request, file) {
        var path = './node_modules/jquery-ui/themes/base/images/'+file + '.png';
        // console.log('resolving jqueryui base theme image:', path);
        return wrapContentOrError(path);
    }, errorResponse
);


web.wrapRouteGet(app, '/node_modules/phenogrid/:filename', '/node_modules/phenogrid/{filename*}', ['filename'],
    function(request, filename) {
        // console.log('###PHENOGRID leakage:', filename);
        var path = './node_modules/phenogrid/'+filename;
        var faPat = /^dist\/fonts\/(fontawesome.+)$/;
        var faMatch = faPat.exec(filename);
        if (faMatch) {
            path = './node_modules/font-awesome/fonts/' + faMatch[1];
        }
        else if (filename === 'node_modules/gfm.css/gfm.css') {
            //
            // Hack because phenogrid should be using /node_modules/gfm.css instead of node_modules/gfm.css in its index.html
            //
            path = './node_modules/gfm.css/gfm.css';
        }
        return wrapContentOrError(path);
    }, errorResponse
);


// Method: search API
//
// searches over Solr
//
// Path:
//  - /search/:term?p=3&category='gene'&taxon_label='Homo sapiens'
//
// Formats:
//  - json
//
//
// Returns:
//  Highlited matches with facets and paging
web.wrapRouteGet(app, '/searchapi/:term', '/searchapi/{term}', ['term'], searchApiHandler, errorResponse);
function searchApiHandler(request, term) {
    var params = request.query;

    var rowsPerPage = 25;
    var page = 0;
    if(params.hasOwnProperty('p')) {
      page = params['p'];
      // remove page from params
      delete params['p'];
    }
    var start = page * rowsPerPage;

    // ensure that values are arrays
    Object.keys(params).forEach(function(key) {
      if (params[key].constructor !== Array) {
        params[key] = [params[key]];
      }
    });
    return formattedResults(engine.search(term, request.query, ["category", "taxon_label"], rowsPerPage, start), 'json');
}

// Method: suggest API
//
// suggest over SciGraph data graph
//
// Path:
//  - /suggest/:term
//
// Formats:
//  - json
//
//
// Returns:
//  suggestions for the input
//
// TODO Use SOLR instead of SciGraph, it makes more sense since the search results come from SOLR.
web.wrapRouteGet(app, '/suggestapi/:term', '/suggestapi/{term}', ['term'], suggestApiHandler, errorResponse);
function suggestApiHandler(request, term) {
    var suggestionArray = [];

    // Show users some suggestions if possible
    var suggestions = engine.getSciGraphSuggestions(term, 5);

    suggestions.forEach( function (suggestion) {
        var encodedSuggestion = encodeURI(suggestion);
        suggestionArray.push([suggestion, encodedSuggestion]);
    });

    return formattedResults(suggestionArray, 'json');
}



// Method: search
//
// searches over ontology terms via SciGraph
//
// Path:
//  - /search/:term
//
// Formats:
//  - html
//
//
// Returns:
//  All classes with :term as a substring

function searchHandler(request, term) {
    console.log('searchHandler: term: ', term);

    try {
        // check if a format is specified
        var match = /^.+(.json|.jsonp|.text|.rdf|.nt)$/i.exec(term);
        var fmt = null;
        if(match != null) {
            fmt = match[1].replace(".", "");
            term = term.replace(match[1], "");
        }

        var info = newInfo();
        addCoreRenderers(info, 'search', term);

        info.term = term;

        // jquery
        info.pup_tent_js_libraries.push("/jquery.min.js");

        // Add search result js file - Zhou
        info.pup_tent_js_libraries.push("/search_results.js");

        info.pup_tent_js_variables.push({name:'searchTerm', value: term});

        // Add css
        info.pup_tent_css_libraries.push("/search_results.css");

        info.pup_tent_css_libraries.push("/monarch-specific.css");

        info.title = 'Search Results: '+term;

        var output = pup_tent.render('search_results.mustache',info,'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
}

web.wrapRouteGet(app, '/search/:term', '/search/{term}', ['term'], searchHandler, errorResponse);


//list all of the sources supplying data to monarch.
function sourcesHandler(request, fmt) {
    try {
        //fetch data description json
        var sources = engine.fetchDataDescriptions();
        var info = newInfo();
        // adorn object with rendering functions
        info.sourcesTable = function() {
            return genTableOfDataSources(sources);
        };
        addCoreRenderers(info, 'sources');

        if (fmt != null) {
            return formattedResults(sources, fmt,request);
        }

        info.pup_tent_css_libraries.push("/sources.css");
        info.title = 'Data Sources';

        var output = pup_tent.render('sources.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/about/sources.:fmt?', '/about/sources.{fmt}', ['fmt'], sourcesHandler, errorResponse);
web.wrapRouteGet(app, '/about/sources', '/about/sources', [], sourcesHandler, errorResponse);

//
//  The next route handles the bundled configuration
//  This route must be AFTER the above '/sources' route so that /sources.json
//  will invoke the sourcesHandler.
//

if (useBundle && !useWebpack) {
    web.wrapRouteGet(app, '/dist/:file.:type', '/dist/{file}.{type}', ['file', 'type'],
        function(request, file, type) {
            var path = './dist/' + file + '.' + type;
            // console.log('resolving file.:type:', path);
            return wrapContentOrError(path);
        }, errorResponse
    );
}

if (useBundle && !useWebpack) {
    web.wrapRouteGet(app, '/app.bundle.js', '/app.bundle.js', [],
        function(request) {
            var path = './dist/app.bundle.js';
            return wrapContentOrError(path);
        }, errorResponse
    );

    web.wrapRouteGet(app, '/app.bundle.css', '/app.bundle.css', [],
        function(request) {
            var path = './dist/app.bundle.css';
            return wrapContentOrError(path);
        }, errorResponse
    );
}


// Method: autocomplete
//
// proxy for vocabulary services autocomplete
//
// Path:
//  - /autocomplete/:term
//  - /autocomplete/:category/:term
//
// Formats:
//  - html
//  - json
//
//
// Returns:
//  List of matching objects

function autocompleteByCategoryTermHandler(request,category,term,fmt) {
    // todo - we would like to normalize possible categories; e.g. phenotype --> Phenotype
    //var info = engine.searchSubstring(term, category);
    var info = engine.autocomplete(term, category);
    // engine.log("got autocomplete results..."+info.length);
    // if (info.length > 0) {
    //     console.log("first is: ", info[0]);
    // }
    if (fmt != null) {
        //engine.log("format is "+fmt);
        var res = formattedResults(info,fmt,request);
        return res;
    } else {
        return {
            body: [ "Cannot handle format/extension: "+fmt],
            status: 500
        };
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/autocomplete/:category/:term.:fmt?', '/autocomplete/{category}/{term}.{fmt}', ['category', 'term', 'fmt'], autocompleteByCategoryTermHandler, errorResponse);
web.wrapRouteGet(app, '/autocomplete/:category/:term', '/autocomplete/{category}/{term}', ['category', 'term'], autocompleteByCategoryTermHandler, errorResponse);


function autocompleteByTermHandler(request,term,fmt) {
    return autocompleteByCategoryTermHandler(request, null, term, fmt);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/autocomplete/:term.:fmt?', '/autocomplete/{term}.{fmt}', ['term', 'fmt'], autocompleteByTermHandler, errorResponse);
web.wrapRouteGet(app, '/autocomplete/:term', '/autocomplete/{term}', ['term'], autocompleteByTermHandler, errorResponse);



// Method: disease
//
// disease info or page.
//
// This will combine multiple sources of data combining phenotype. gene, pathway etc
// data. The aggregation makes use of the ontology; e.g. the results for DOID_14330 (Parkinson's disease) will
// include info association with PD only any subtypes
//
// Implementation:
//  - <monarch.api.fetchDiseaseInfo>
//
// Paths:
//  - /disease/  (HTML only)
//  - /disease/:id (combined info about a disease)
//  - /disease/:id/:section
//
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /disease/ (Top page)
//  - /disease/DOID_14330 (Parkinson's disease)
//  - /disease/DOID:14330 (same as above - CURIES or URI fragments may be used)
//  - /disease/DOID_14330/phenotype_associations.json (Phenotypes for Parkinson's disease, as JSON)
//
//
// Returns:
//  Disease with matching ID


function diseaseLandingHandler(request) {
    var info = prepLandingPage();
    //info.blog_results = loadBlogData('disease-news', 4);

    info.spotlight = engine.fetchSpotlight('disease');
    //info.spotlight.link = genObjectHref('disease',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('disease',info.spotlight);

    var heritability = info.spotlight.heritability;
    info.spotlight.heritability = info.spotlight.heritability.map(function(h) {return h.label}).join(", ");

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var genes = ['(none)'];
    if (info.spotlight.genes != null && info.spotlight.genes.length > 0) {
        info.spotlight.genes = _sortByLabel(info.spotlight.genes);
        genes = info.spotlight.genes.map(function(p) {return genObjectHref('gene',p);});
    }

    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    if (info.spotlight.model_count > 0){
        info.spotlight.models = "<a href=/disease/"+info.spotlight.id+"#model>"+info.spotlight.model_count+"</a>";
    } else {
        info.spotlight.models = info.spotlight.model_count;
    }

    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/disease/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    //graph
    addGolrStaticFiles(info);

    var diseaseDist = env.readJSON('./widgets/dove/stats/DO-cache.json');
    info.pup_tent_js_libraries.push('/dove.min.js');
    info.pup_tent_css_libraries.push("/dovegraph.css");

    if (!useBundle) {
        // info.pup_tent_js_libraries.push("/barchart-launcher.js");
    }
    info.pup_tent_js_libraries.push("/graph-config.js");

    info.pup_tent_js_variables.push({name:'globalDataGraph',value:diseaseDist});
    info.monarch_launchable.push('makeDiseaseLandingGraph(globalDataGraph)');

    info.title = 'Monarch Diseases';

    var output = pup_tent.render('disease_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/disease', '/disease', [], diseaseLandingHandler, errorResponse);
web.wrapRouteGet(app, '/disease/', '/disease/', [], diseaseLandingHandler, errorResponse);



// This function checks if a variable exists in the JSON blob (and is used to dynamically
// render the Mustache templates.
function checkExistence(variable) {
    if (variable != null) {
        return variable.length > 0;
    }
};

// This function returns the number of variables in the JSON blob.
// The number is returned as a label suitable for display - if the number
// is higher than the cutoff then "+" is appended
function getNumLabel(variable) {
    if (variable != null) {
        if (variable.length == 1000) {
            return "1000+";
        }
        return variable.length;
    }
};


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
// DISEASE - Sub-pages
// Example: /disease/DOID_12798/phenotype_associations.json
// Currently only works for json or rdf output
app.get('/legacy/disease/:id/:section.:fmt?', function(request, id, section, fmt) {
    var newId = engine.resolveClassId(id);
    if (newId != id) {
        engine.log("redirecting: "+id+" ==> "+newId);
        return web.wrapRedirect(genURL('disease',newId));
    }

    var info = engine.fetchDiseaseInfo(id);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    }
    else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
});
}


// Method: phenotype
//
// phenotype info or page
//
// This will combine multiple sources of data combining disease, gene, genotype, pathway etc
// data. The aggregation makes use of the ontology; e.g. the results for MP_0011475 (abnormal glycosaminoglycan level) will
// include info association directly for this term, as well as subtypes (e.g. abnormal urine glycosaminoglycan level)
//
// Implementation:
//  - <monarch.api.fetchDiseaseInfo>
//
// Paths:
//  - /phenotype/  (HTML only)
//  - /phenotype/:id (combined info about a phenotype)
//  - /phenotype/:id/:section
//
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /phenotype/ (Top page)
//  - /phenotype/MP_0011475 (abnormal glycosaminoglycan level)
//  - /phenotype/MP:0011475 (same as above - CURIES or URI fragments may be used)
//  - /phenotype/MP_0011475/disease_associations.json (Diseases with abnormal glycosaminoglycan level as JSON)
//
//
// Returns:
//  Phenotype with matching ID


function phenotypeLandingHandler(request) {
    var info = prepLandingPage();
    //info.blog_results = loadBlogData('phenotype-news', 4);

    //spotlight
    info.spotlight = engine.fetchSpotlight('phenotype');
    //info.spotlight.link = genObjectHref('phenotype',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('phenotype',info.spotlight);

    var genes = _sortByLabel(info.spotlight.genes).map(function(g) {return genObjectHref('gene',g);});
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
        diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    if (info.spotlight.model_count > 0){
        info.spotlight.models = "<a href=/phenotype/"+info.spotlight.id+"#genotypes>"+info.spotlight.model_count+"</a>";
    } else {
        info.spotlight.models = info.spotlight.model_count;
    }

    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/phenotype/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    //var pathways = info.spotlight.pathways.map(function(p) {p.label});
    //info.spotlight.pathways = pathways.slice(0,5).join(", ");
    //if (pathways.length > 5) {
    //    info.spotlight.pathways += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(pathways.length-5)+" more...]</span><span class=\"moreitems\">";
    //    info.spotlight.pathways += pathways.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    //}

    //graph

    addGolrStaticFiles(info);

    var phenoDist = env.readJSON('./widgets/dove/stats/hp-ontology-4.json');
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push('/dove.min.js');
    info.pup_tent_js_libraries.push("/graph-config.js");
    if (!useBundle) {
        // info.pup_tent_js_libraries.push("/barchart-launcher.js");
    }
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.monarch_launchable.push('makePhenotypeLandingGraph(globalDataGraph)');

    info.title = 'Monarch Phenotypes';

    var output = pup_tent.render('phenotype_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/phenotype', '/phenotype', [], phenotypeLandingHandler, errorResponse);
web.wrapRouteGet(app, '/phenotype/', '/phenotype/', [], phenotypeLandingHandler, errorResponse);


function addNonEmptyAnchors(info, inhibit_filters_kludge) {
    if (info.phenotypeNum && info.phenotypeNum > 0) {
        info.includes.phenotype_anchor = addPhenotypeAnchor(info);
        info.includes.phenotype_table = addPhenotypeTable(info);
    }
    if (info.geneNum && info.geneNum > 0) {
        info.includes.gene_anchor = addGeneAnchor(info);
        info.includes.gene_table = addGeneTable(!inhibit_filters_kludge);
    }
    if (info.genotypeNum && info.genotypeNum > 0) {
        info.includes.genotype_anchor = addGenotypeAnchor(info);
        info.includes.genotype_table = addGenotypeTable(!inhibit_filters_kludge);
    }
    if (info.variantNum && info.variantNum > 0) {
        info.includes.variant_anchor = addVariantAnchor(info);
        info.includes.variant_table = addVariantTable(!inhibit_filters_kludge);
    }
    if (info.diseaseNum && info.diseaseNum > 0) {
        info.includes.disease_anchor = addDiseaseAnchor(info);
        info.includes.disease_table = addDiseaseTable();
    }
    if (info.modelNum && info.modelNum > 0) {
        info.includes.model_anchor = addModelAnchor(info);
        info.includes.model_table = addModelTable(!inhibit_filters_kludge);
    }
    if (info.pathwayNum && info.pathwayNum > 0) {
        info.includes.pathway_anchor = addPathwayAnchor(info);
        info.includes.pathway_table = addPathwayTable();
    }
    if (info.literatureNum && info.literatureNum > 0) {
        info.includes.literature_anchor = addLiteratureAnchor(info);
        info.includes.literature_table = addLiteratureTable();
    }
    if (info.homologNum && info.homologNum > 0) {
        info.includes.homolog_anchor = addHomologAnchor(info);
        info.includes.homolog_table = addHomologTable();
    }
    if (info.orthoPhenoNum && info.orthoPhenoNum > 0) {
        info.includes.ortholog_phenotype_anchor = addOrthoPhenoAnchor(info);
        info.includes.ortholog_phenotype_table = addOrthoPhenoTable();
    }
    if (info.caseVariantNum && info.caseVariantNum > 0) {
        info.includes.variant_anchor = addCaseVariantAnchor(info);
        info.includes.variant_table = addCaseVariantTable();
    }
    if (info.interactionNum && info.interactionNum > 0) {
        // Add gene interaction table
        info.includes.interaction_anchor = addInteractionAnchor(info);
        info.includes.interaction_table = addInteractionTable();
    }
}


function modelByIdHandler(request, id, fmt) {
    try {

        //Curify ID if needed
        if (/_/.test(id) && !/\:/.test(id)){
            engine.log("ID contains underscore, replacing with : and redirecting");
            var newID = id.replace("_",":");
            return web.wrapRedirect(genURL('model',newID));
        }

        // Rendering.
        var info = newInfo();
        info = engine.fetchDataInfo(id);

        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        if (typeof info.id === 'undefined'){
            info.id = id;
        }
        if (typeof info.label === 'undefined'){
            info.label = id;
        }

        addCoreRenderers(info, 'model', id);

        addGolrStaticFiles(info);
        // info.pup_tent_css_libraries.push("/monarch-specific.css");

        //Load variables for client side tables
        var disease_filter = [
                              { field: 'object_category', value: 'disease' },
                              { field: 'subject_closure', value: id },
        ];
        addGolrTable(info, 'subject_closure', 'disease-table', disease_filter, 'model_disease', '#diseases');
        info.diseaseNum = engine.fetchAssociationCount(disease_filter, 'object');

        var phenotype_filter = [
                                { field: 'object_category', value: 'phenotype' },
                                { field: 'subject_closure', value: id },
        ];
        addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'model_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');

        var genotype_filter = [
                               { field: 'object_category', value: 'genotype' },
                               { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'genotype-table', genotype_filter, 'model_genotype', '#genotypes');
        info.genotypeNum = engine.fetchAssociationCount(genotype_filter, 'object');

        var gene_filter = [
                           { field: 'object_category', value: 'gene' },
                           { field: 'subject_closure', value: id },
        ];
        addGolrTable(info, 'subject_closure', 'gene-table', gene_filter, 'model_gene', '#genes');
        info.geneNum = engine.fetchAssociationCount(gene_filter, 'object');

        var variant_filter = [
                              { field: 'object_category', value: 'variant' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'variant-table', variant_filter, 'model_variant','#variants');
        info.variantNum = engine.fetchAssociationCount(variant_filter, 'object');

        // Phenogrid
        addPhenogridFiles(info);

        addNonEmptyAnchors(info, true);

        info.title = 'Monarch Model: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        info.xrefs = function() {
            return buildXrefsList(id, info.database_cross_reference);
        };
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }

        if (info.equivalentClasses){
            info.equal_ids  = function() {
                return info.equivalentClasses.map(function(r) { return genObjectHref('model', {id:r,label:r} ) }).join(", ");
            }
        }

        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;
        info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);

        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
            var phenogridView = "default";
            addPhenogridView(info, phenogridView);
        }

        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');

        info.node_label = 'Model';
        info.node_logo = '/image/carousel-models.png';
        var output = pup_tent.render('node.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
};

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/model/:id.:fmt?', '/model/{id}.{fmt}', ['id', 'fmt'], modelByIdHandler, errorResponse);
web.wrapRouteGet(app, '/model/:id', '/model/{id}', ['id'], modelByIdHandler, errorResponse);


function genotypeByIdHandler(request, id, fmt) {
    try {

        if (/_/.test(id) && !/\:/.test(id)){
            engine.log("ID contains underscore, replacing with : and redirecting");
            var newID = id.replace("_",":");
            return web.wrapRedirect(genURL('genotype',newID));
        }

        // Rendering.
        var info = newInfo();
        info = engine.fetchDataInfo(id);

        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        if (typeof info.id === 'undefined'){
            info.id = id;
        }
        if (typeof info.label === 'undefined'){
            info.label = id;
        }

        addCoreRenderers(info, 'genotype', id);

        addGolrStaticFiles(info);
        // info.pup_tent_css_libraries.push("/monarch-specific.css");

        //Load variables for client side tables
        var disease_filter = [
                              { field: 'object_category', value: 'disease' },
                              { field: 'subject_closure', value: id },
        ];
        addGolrTable(info, 'subject_closure', 'disease-table', disease_filter, 'genotype_disease', '#diseases');
        info.diseaseNum = engine.fetchAssociationCount(disease_filter, 'object');

        var phenotype_filter = [
                                { field: 'object_category', value: 'phenotype' },
                                { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'genotype_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');

        var gene_filter = [
                           { field: 'object_category', value: 'gene' },
                           { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'gene-table', gene_filter, 'genotype_gene', '#genes');
        info.geneNum = engine.fetchAssociationCount(gene_filter, 'object');

        var model_filter = [
                            { field: 'subject_category', value: 'model' },
                            { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'model-table', model_filter, 'model_genotype', '#models');
        info.modelNum = engine.fetchAssociationCount(model_filter, 'subject');

        var variant_filter = [
                              { field: 'subject_category', value: 'variant' },
                              { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'variant-table', variant_filter, 'variant_genotype','#variants');
        info.variantNum = engine.fetchAssociationCount(variant_filter, 'subject');

        // Phenogrid
        addPhenogridFiles(info);

        addNonEmptyAnchors(info, true);

        info.title = 'Monarch Genotype: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        info.xrefs = function() {
            return buildXrefsList(id, info.database_cross_reference);
        };
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }

        if (info.equivalentClasses){
            info.equal_ids  = function() {
                return info.equivalentClasses.map(function(r) { return genObjectHref('genotype', {id:r,label:r} ) }).join(", ");
            }
        }

        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;
        info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);

        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
            var phenogridView = "default";
            addPhenogridView(info, phenogridView);
        }

        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');

        info.node_label = 'Genotype';
        info.node_logo = '/image/carousel-genes.png';
        var output = pup_tent.render('node.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
};

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/genotype/:id.:fmt?', '/genotype/{id}.{fmt}', ['id', 'fmt'], genotypeByIdHandler, errorResponse);
web.wrapRouteGet(app, '/genotype/:id', '/genotype/{id}', ['id'], genotypeByIdHandler, errorResponse);

function caseByIdHandler(request, id, fmt) {
    try {

        // Rendering.
        var info = newInfo();
        info = engine.fetchDataInfo(id);


        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        if (typeof info.id === 'undefined'){
            info.id = id;
        }
        if (typeof info.label === 'undefined'){
            info.label = id;
        }

        addCoreRenderers(info, 'case', id);
        addGolrStaticFiles(info);

        info.hasPhenotypes = true;

        var phenotype_filter = [
                                { field: 'object_category', value: 'phenotype' },
                                { field: 'subject_category', value: 'case' },
                                { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'case_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');


        var variant_filter = [
                              { field: 'object_category', value: 'variant' },
                              { field: 'subject_category', value: 'case' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'case-variant-table', variant_filter, 'case_variant','#variants');
        info.caseVariantNum = engine.fetchAssociationCount(variant_filter, 'object');

        // Phenogrid
        addPhenogridFiles(info);
        var phenogridView = "cases"
        addPhenogridView(info, phenogridView);

        addNonEmptyAnchors(info, true);

        info.title = 'Monarch Case: '+info.label+' ('+ info.id+')';

        // Link to disclaimer
        info.hasDisclaimer = true;
        info.hasDownloads = true;

        downloadList = [
            {
                'button_class': 'btn-warning',
                'href': '/phenopacket?q=*:*&fq=subject_closure:"' + id + '"&personality=case',
                'icon': '/image/phenopackets_logo.png',
                'text': "PhenoPacket"
            },
            {
                'button_class': 'btn-success',
                'href': '/downloads/' + id + '/association/phenotype.tsv',
                'icon': '/image/carousel-phenotypes.png',
                'text': "Phenotypes"
            },
            {
                'button_class': 'btn-primary',
                'href': '/downloads/' + id + '/association/variant.tsv',
                'icon': '/image/carousel-genes.png',
                'text': "Variants"
            }
        ];

        info.includes.downloads = downloadList.map(function (val) {
            return expandTemplate('button', val);
        }).join(' ');

        if (/^MONARCH:c\d+$/.test(id)) {
            info.hasSource = true;
            info.source =
                '<a href="https://www.genome.gov/27544402/' +
                'the-undiagnosed-diseases-program/">Undiagnosed ' +
                'Diseases Program</a>';
        }

        info.primary_xref = function() {return genExternalHref('source',{id : id})};

        info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);
        info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");


        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');

        info.node_label = 'Case';
        info.node_logo = '/image/carousel-diseases.png';
        var output = pup_tent.render('node.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
};

web.wrapRouteGet(app, '/case/:id.:fmt?', '/case/{id}.{fmt}', ['id', 'fmt'], caseByIdHandler, errorResponse);
web.wrapRouteGet(app, '/case/:id', '/case/{id}', ['id'], caseByIdHandler, errorResponse);

function clusterPageHandler(request) {

    try {
        var info = newInfo();
        addCoreRenderers(info);
        info.monarch_launchable.push('loadClusterPlot()');
        var output = pup_tent.render('cluster-viz.mustache', info, 'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponseWithObject(err);
    }
};

web.wrapRouteGet(app, '/labs/cluster', '/labs/cluster', [], clusterPageHandler, errorResponse);


function genMGIXRef(id) {
    return "<a href=\"http://www.informatics.jax.org/allele/genoview/" +
            id + "\" target=\"_blank\">" + id + "</a>";
}


function geneLandingHandler(request) {
    var info = prepLandingPage();
    //info.blog_results = loadBlogData('gene-news', 4);
    info.spotlight = engine.fetchSpotlight('gene');
    //info.spotlight.link = genObjectHref('gene',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('gene',info.spotlight);

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
    diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    var pathways = info.spotlight.pathways.map(function(p) {p.label});
    info.spotlight.pathways = pathways.slice(0,5).join(", ");
    if (pathways.length > 5) {
        info.spotlight.pathways += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(pathways.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.pathways += pathways.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/gene/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    addGolrStaticFiles(info);

    var phenoDist = env.readJSON('./widgets/dove/stats/hp-ontology-4.json');
    var diseaseDist = env.readJSON('./widgets/dove/stats/DO-cache.json');
    info.pup_tent_js_libraries.push('/dove.min.js');
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/graph-config.js");
    if (!useBundle) {
        // info.pup_tent_js_libraries.push("/barchart-launcher.js");
    }
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.pup_tent_js_variables.push({name:'globalDiseaseDist',value:diseaseDist});
    info.monarch_launchable.push('makePhenotypeLandingGraph(globalDataGraph)');
    info.monarch_launchable.push('makeGeneDiseaseLandingGraph(globalDiseaseDist)');


    info.title = 'Monarch Genes';

    var output = pup_tent.render('gene_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/gene', '/gene', [], geneLandingHandler, errorResponse);
web.wrapRouteGet(app, '/gene/', '/gene/', [], geneLandingHandler, errorResponse);



function genotypeLandingHandler(request){

    var info = prepLandingPage();
    //info.blog_results = loadBlogData('model-news', 4);

    //spotlight
    info.spotlight = engine.fetchSpotlight('model');
    //info.spotlight.link = genObjectHref('model',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('model',info.spotlight);

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
    diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var genes = _sortByLabel(info.spotlight.genes).map(function(g) {return genObjectHref('gene',g);});
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/model/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    addGolrStaticFiles(info);

    //graph
    var hpStub = env.readJSON('./widgets/dove/stats/hp-ontology-4.json');
    info.pup_tent_css_libraries.push("/dovegraph.css");
    if (!useBundle) {
        // info.pup_tent_js_libraries.push("/barchart-launcher.js");
    }
    info.pup_tent_js_libraries.push('/dove.min.js');
    info.pup_tent_js_libraries.push("/graph-config.js");

    info.pup_tent_js_variables.push({name:'globalDataGraph',value:hpStub});
    info.monarch_launchable.push('makeGenotypeLandingGraph(globalDataGraph)');

    info.title = 'Monarch Genotypes';

    var output = pup_tent.render('genotype_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

function modelLandingHandler(request){

    var info = prepLandingPage();
    //info.blog_results = loadBlogData('model-news', 4);

    //spotlight
    info.spotlight = engine.fetchSpotlight('model');
    //info.spotlight.link = genObjectHref('model',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('model',info.spotlight);

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
    diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var genes = _sortByLabel(info.spotlight.genes).map(function(g) {return genObjectHref('gene',g);});
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/model/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    addGolrStaticFiles(info);

    //graph
    var diseaseDist = env.readJSON('./widgets/dove/stats/DO-cache.json');
    info.pup_tent_css_libraries.push("/dovegraph.css");
    if (!useBundle) {
        // info.pup_tent_js_libraries.push("/barchart-launcher.js");
    }
    info.pup_tent_js_libraries.push('/dove.min.js');
    info.pup_tent_js_libraries.push("/graph-config.js");

    info.pup_tent_js_variables.push({name:'globalDataGraph',value:diseaseDist});
    info.monarch_launchable.push('makeModelLandingGraph(globalDataGraph)');

    info.title = 'Monarch Models';

    var output = pup_tent.render('model_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/model', '/model', [], modelLandingHandler, errorResponse);
web.wrapRouteGet(app, '/model/', '/model/', [], modelLandingHandler, errorResponse);
web.wrapRouteGet(app, '/genotype', '/genotype', [], genotypeLandingHandler, errorResponse);
web.wrapRouteGet(app, '/genotype/', '/genotype/', [], genotypeLandingHandler, errorResponse);




//For receiving of HPO relations for Phenogrid
//Example: /neighborhood/HP_0003273/2/out/subClassOf.json

function neighborhoodByIdDepthDirectionRelationshipHandler(request, id, depth, direction, relationship, fmt) {
  var info = engine.getGraphNeighbors(id, depth, relationship, direction);

  if (fmt != null) {
      return formattedResults(info, fmt, request);
  }
  else {
      return errorResponse(500, "plain HTML does not work for page sections. Please append .json or .rdf to URL");
  }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/neighborhood/:id/:depth/:direction/:relationship.:fmt?', '/neighborhood/{id}/{depth}/{direction}/{relationship}.{fmt}', ['id', 'depth', 'direction', 'relationship', 'fmt'], neighborhoodByIdDepthDirectionRelationshipHandler, errorResponse);
web.wrapRouteGet(app, '/neighborhood/:id/:depth/:direction/:relationship', '/neighborhood/{id}/{depth}/{direction}/{relationship}', ['id', 'depth', 'direction', 'relationship'], neighborhoodByIdDepthDirectionRelationshipHandler, errorResponse);


// Method: compare
//
// phenotypic comparison between two entities
//
// Given a query id (such as a gene, genotype, disease), and one or more target identifiers, this will map
// each to it's respective phenotypes, and perform an OwlSim comparison of the query to each target.
// You are permitted to mix query and target types.  For example, your query can be a disease, and the target
// be a list of gene(s), disease(s), phenotype(s), and/or genotype(s).
// You can indicate to union the phenotypes of either the query or the target with a plus "+".  Only one
// entity may be supplied for the query, whereas multiple target entities are allowed (delimited by a comma).
//
// For details on owlsim, see http://owlsim.org
//
// Paths:
//  - /compare/  (HTML only)
//  - /compare/:id1/:id2  (JSON only)
//  - /compare/:id1/:id2,id3,...idN (JSON only)
//  - /compare/:id1+:id2/:id3,:id4,...idN (JSON only)
//  - /compare/:id1/:id2+:id3,:id4,:id5+:id6,...,:idN (JSON only)
//
// Formats:
//  - json
//
//  Examples:
//  - /compare/OMIM:143100/MGI:3664660.json
//  - /compare/OMIM:270400/NCBIGene:18595+OMIM:249000,OMIM:194050.json
//  - /compare/HP:0000707+HP:0000372/NCBIGene:18595,HP:0000707,NCBIGene:18595+HP:0000707
//
// Returns:
//  A pairwise-comparison of phenotypes belonging to the query to the target(s), together with the LCS, and their scores.
//  The data follows the same format as is used for search.  The query (including it's identifier, label, type, and
//  phenotype ids will be listed in the "a" object; the target(s) in the "b" array object.  If only one b is supplied,
//  only one element will be found in "b".
//  The resulting "combinedScore" is generated based on a perfect match of the query to itself.  Therefore, the reciprocal
//  combined score may not be the same.  QxT !== TxQ.
function compareHandler(request, x, y, fmt) {
    var xs = x.split("+");
    //first, split by comma.  then split by plus
    var ys = y.split(",");
    ys = ys.map(function(i){return i.split("+") });

    //pass the arrays
    var info = engine.compareEntities(xs,ys);

    return web.wrapJSON(info);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/compare/:x/:y.:fmt?', '/compare/{x}/{y}.{fmt}', ['x', 'y', 'fmt'], compareHandler, errorResponse);
web.wrapRouteGet(app, '/compare/:x/:y', '/compare/{x}/{y}', ['x', 'y'], compareHandler, errorResponse);



// Redirects
function referenceByIdHandler(request, id, fmt) {
    //var info = engine.fetchReferenceInfo(id);  TODO
    //return web.wrapRedirect(engine.expandIdToURL(id));
    var url = makeExternalURL(id);
    return web.wrapRedirect(url);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/reference/:id.:fmt?', '/reference/{id}.{fmt}', ['id', 'fmt'], referenceByIdHandler, errorResponse);
web.wrapRouteGet(app, '/reference/:id', '/reference/{id}', ['id'], referenceByIdHandler, errorResponse);


//Get orthologs/paralogs
function queryOrthologsByIdHandler(request, id, fmt) {
    var res;
    var idList = id.split("+");
    if (idList == '.json'){
        res = errorResponse(500, "No gene IDs entered");
    } else {
        var info = engine.fetchOrthologList(idList);
        res = web.wrapJSON(info);
    }

    return res;
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/query/orthologs/:id.:fmt?', '/query/orthologs/{id}.{fmt}', ['id', 'fmt'], queryOrthologsByIdHandler, errorResponse);
web.wrapRouteGet(app, '/query/orthologs/:id', '/query/orthologs/{id}', ['id'], queryOrthologsByIdHandler, errorResponse);



if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/legacy/variant/:id.:fmt?', function(request, id, fmt) {
    //since we don't have allele or variant pages,
    //we will redirect to the sources for now
    //var newId = engine.resolveClassId(id);
    var url;
    if (id.match(/^OMIM/)){
        url = makeExternalURL(id+"."+fmt);
    } else {
        url = makeExternalURL(id);
    }
    engine.log("redirecting: "+id+" to source at "+url);
    return web.wrapRedirect(url);
});
}


if (false) {
web.wrapRouteGet(app, '/anatomy', '/anatomy', [],
    function(request) {
        var info = prepLandingPage();
        var output = pup_tent.render('anatomy_main.mustache', info,'monarch_base.mustache');
        return web.wrapHTML(output);
    }, errorResponse);

function anatomyByIdHandler(request, id, fmt) {
    var info = engine.fetchAnatomyInfo(id);  // OQ
    if (fmt != null) {
    return formattedResults(info,fmt,request);
    }

    addCoreRenderers(info, 'anatomy', id);

    //Add pup_tent libs
    // info.pup_tent_css_libraries.push("/monarch-specific.css");

    // info.pup_tent_js_libraries.push("/stupidtable.min.js");
    // info.pup_tent_js_libraries.push("/tables.js");
    info.monarch_launchable.push('InitTables()');

    info.title = 'Monarch Anatomy: '+info.label;

    if (false) {
        // this is too slow
        info.hasDiseases = function() {return checkExistence(info.disease_associations)};
        info.hasGenotypes = function() {return checkExistence(info.genotype_associations)};

        info.diseaseNum = function() {return getNumLabel(info.disease_associations)};
        info.genotypeNum = function() {return getNumLabel(info.genotype_associations)};

        info.diseaseTable = function() {return genTableOfDiseasePhenotypeAssociations(info.disease_associations);} ;
        info.genotypeTable = function() {return genTableOfGenotypePhenotypeAssociations(info.genotype_associations);};
    }

    info.phenotypeHrefs = info.phenotypes.map(function(p) { return genObjectHref('phenotype',p) });

    // adorn object with rendering functions
    info.expressionTable = function() {return genTableOfGeneExpressionAssocations(info.gene_associations);} ;
    //info.diseaseTable = function() {return genTableOfDiseaseGeneAssociations(info.disease_associations)} ;
    //info.phenotypeTable = function() {return genTableOGenePhenotypeAssociations(info.phenotype_associations)} ;
    //info.alleleTable = function() {return genTableOfDiseaseAlleleAssociations(info.alleles)} ;

    info.node_label = 'anatomy';
    info.node_logo = '/image/logo.png';
    var output = pup_tent.render('node.mustache', info, 'monarch_base.mustache');
    return web.wrapHTML(output);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/anatomy/:id.:fmt?', '/anatomy/{id}.{fmt}', ['id', 'fmt'], anatomyByIdHandler, errorResponse);
web.wrapRouteGet(app, '/anatomy/:id', '/anatomy/{id}', ['id'], anatomyByIdHandler, errorResponse);
}

function literatureLandingHandler(request){

    var info = prepLandingPage();
    info.title = 'Monarch Literature';

    var output = pup_tent.render('literature_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/literature', '/literature', [], literatureLandingHandler, errorResponse);
web.wrapRouteGet(app, '/literature/', '/literature/', [], literatureLandingHandler, errorResponse);

function literatureByIdHandler(request, id, fmt) {
    var info;
    var regex = /^PMID:(\d+)$/;
    var regres = regex.exec(id);
    if (regres != null) {
        info = engine.fetchLiteratureInfo(regres[1]);
    }
    if (fmt != null) {
        return formattedResults(info, fmt, request);
    }
    info.id = id;

    addCoreRenderers(info, 'literature', id);
    addGolrStaticFiles(info);

    var assoc_filter = [
                        { field: 'subject_category', value: 'publication', plist : ['-'] },
                        { field: 'source', value: id}
    ];

    addGolrTable(info, 'source', 'association-table', assoc_filter, 'generic_association','#associations', false);
    info.assocNum = engine.fetchAssociationCount(assoc_filter);

    // Add gene table
    info.includes.association_anchor = addAssociationAnchor(info);
    info.includes.association_table = addAssociationTable(true);

    var literatureLauncher = 'fetchLiteratureOverview(' + regres[1] + ')';
    info.monarch_launchable.push(literatureLauncher);

    info.title = 'Monarch Literature: '+info.publicationTitle+' ('+ info.id+')';
    info.authorSpan = MonarchCommon.makeAuthorSpan(info.authorList);

    var output = pup_tent.render('literature.mustache',info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/literature/:id.:fmt?', '/literature/{id}.{fmt}', ['id', 'fmt'], literatureByIdHandler, errorResponse);
web.wrapRouteGet(app, '/literature/:id', '/literature/{id}', ['id'], literatureByIdHandler, errorResponse);


function getIdentifierList(params) {
    var input_items;
    if (params.a != null) {
        input_items = params.a;
        engine.log("Request: "+input_items);
        engine.log("Request Type: "+ typeof input_items);
    }
    else {
        input_items = params.input_items.split(/[\s,]+/);
    }
    // engine.log("|Input| = "+input_items.length);
    // engine.log("Input: "+input_items);
    return input_items;
}

function itemsToArray(input_items) {
    input_items = input_items.split(/[\s,]+/);
    // engine.log("|Input| = "+input_items.length);
    // engine.log("Input: "+input_items);
    return input_items;
}


function mapStyleToCategories(style) {
    // engine.log("Mapping "+style+" to categories");
    //TODO: use external "style" files to map the style parameter to categories
    //for now, default to HPO categories
    var categories = [];
    categories = ["HP:0000924", "HP:0000707", "HP:0000152", "HP:0001574", "HP:0000478", "HP:0001626", "HP:0001939", "HP:0000119", "HP:0001438", "HP:0003011", "HP:0002664", "HP:0001871", "HP:0002715", "HP:0000818", "HP:0002086", "HP:0000598", "HP:0003549", "HP:0001197", "HP:0001507", "HP:0000769"];
    return categories;
}

function scoreHandler(request) {
    // engine.log("Ready to score");
    // engine.log("Params:"+JSON.stringify(request.params));
    var target = null;
    var categories = web.getParam(request, 'categories') || [];
    //default to phenotips categories.
    //TODO: make monarch categories
    var style = web.getParam(request, 'style') || 'phenotips';
    categories = mapStyleToCategories(style);
    var annotation_profile = web.getParam(request, 'annotation_profile');
    annotation_profile = JSON.parse(annotation_profile);
    var myresults = engine.getInformationProfile(annotation_profile,categories);
    return web.wrapJSON(myresults);
}

web.wrapRouteGet(app, '/score', '/score', [], scoreHandler, errorResponse);
web.wrapRoutePost(app, '/score', '/score', [], scoreHandler, errorResponse);

// Also allow trailing slashes
web.wrapRouteGet(app, '/score/', '/score/', [], scoreHandler, errorResponse);
web.wrapRoutePost(app, '/score/', '/score/', [], scoreHandler, errorResponse);



function feedbackHandler(request) {
    var feedbackMetadata = web.getParam(request, 'feedback-form-metadata');
    var feedbackResponse = web.getParam(request, 'feedback-form-response');
    var path = "./feedback.txt";
    var record = {
        metadata: feedbackMetadata,
        response: feedbackResponse
    };
    env.fs_appendFileSync(path, JSON.stringify(record) + '\n');
    var myresults = {};
    return web.wrapJSON(myresults);
}

web.wrapRoutePost(app, '/feedback', '/feedback', [], feedbackHandler, errorResponse);


// Method: simsearch
//
// Performs OwlSim search over entities using a search profile of ontology classes
//
// For details on owlsim, see http://owlsim.org
//
// Implementation:
//  - <monarch.api.searchByDisease>
//  - <monarch.api.searchByPhenotypeProfile>
//
// Paths:
//  - /simsearch//disease/:id (search using the phenotypes of a disease as search profile)
//  - /simsearch/phenotype/
//
// Arguments:
//  - target_species : integer fragment of NCBI Taxon ID
//  - target_type : disease or gene
//  - limit : max results to return
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /simsearch/phenotype/?input_items=MP:0000788,MP:0000802&target_species=10090 (mouse)
//  - /simsearch/phenotype/?input_items=MP:0000788,MP:0000802&target_species=9606 (human)
//
//
// Returns:
//  List of matching entities

function simsearchDiseaseByIdHandler(request, id, fmt) {
    engine.log("'/simsearch/disease/' Params:" + JSON.stringify(request.params));
    var target = null;
    var info = {datatype: 'disease', results:[]};
    var target_species = request.params.species || '9606';
    var target_type = request.params.type || 'disease';
    var limit = request.params.cutoff || request.params.limit || 10;

    info.results = engine.searchByDisease(id,target_species,limit);
    return web.wrapJSON(info.results);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/simsearch/disease/:id.:fmt?', '/simsearch/disease/{id}.{fmt}', ['id', 'fmt'], simsearchDiseaseByIdHandler, errorResponse);
web.wrapRouteGet(app, '/simsearch/disease/:id', '/simsearch/disease/{id}', ['id'], simsearchDiseaseByIdHandler, errorResponse);


function simsearchPhenotypeByTargetTypeLimitItemsHandler(request) {
    var target_species = web.getParam(request, 'target_species');
    var target_type = web.getParam(request, 'target_type');
    var cutoff = web.getParam(request, 'cutoff');
    var limit = cutoff || web.getParam(request, 'limit') || 100;
    var input_items_a = web.getParam(request, 'a');
    var input_items = web.getParam(request, 'input_items');
    input_items = input_items_a || itemsToArray(input_items);

    var target = null;
    var info = {results:[]};
    info.results = engine.searchByPhenotypeProfile(input_items,target_species,null,limit);

    return web.wrapJSON(info.results);
}

web.wrapRouteGet(app, '/simsearch/phenotype', '/simsearch/phenotype', [], simsearchPhenotypeByTargetTypeLimitItemsHandler, errorResponse);
web.wrapRoutePost(app, '/simsearch/phenotype', '/simsearch/phenotype', [], simsearchPhenotypeByTargetTypeLimitItemsHandler, errorResponse);
web.wrapRouteGet(app, '/simsearch/phenotype/', '/simsearch/phenotype/', [], simsearchPhenotypeByTargetTypeLimitItemsHandler, errorResponse);
web.wrapRoutePost(app, '/simsearch/phenotype/', '/simsearch/phenotype/', [], simsearchPhenotypeByTargetTypeLimitItemsHandler, errorResponse);


/**
 * phenoPacketHandler
 * REST service for returning phenopackets
 *
 * request params (in requent.query
 * @param q -  query
 * @param fq - filters
 * @param personality - golr personality
 */
function phenoPacketHandler(request) {
    // Get params
    var filters = request.query.fq;
    var query = request.query.q;
    var showEmptyFields = request.query.showEmptyFields;
    // Default is *:*
    if (typeof query === 'undefined') {
        query = "*:*";
    }

    if (typeof showEmptyFields === 'undefined') {
        showEmptyFields = false;
    }

    var personality = request.query.personality;

    if (filters.constructor !== Array) {
        filters  = [request.query.fq]
    }

    // Try to determine personality from filters
    if (typeof personality === 'undefined') {
        var subject = "";
        var object = "";
        var valueRegex = /:\"(.*)\"/;
        filters.forEach( function (filter) {
            if (/subject/.test(filter)) {
                    if (/category/.test(filter)) {
                        match = valueRegex.exec(filter);
                        subject = match[1];
                    } else {
                        match = valueRegex.exec(filter);
                        subject = engine.resolveIdToType(match[1]);
                    }
            } if (/object/.test(filter)) {
                if (/category/.test(filter)) {
                    match = valueRegex.exec(filter);
                    object = match[1];
                } else {
                    match = valueRegex.exec(filter);
                    object = engine.resolveIdToType(match[1]);
                }
            }
        });
        personality = subject + "_" + object;
    }

    var limit = 1000;
    var response = engine.fetchSolrDocuments(query, filters, personality, limit);
    var phenopacket = phenoPacketBuilder.buildPhenoPacket(response, personality, showEmptyFields);

    phenopacket.params = {
            'q' : query,
            'fq' : filters,
            'personality' : personality,
            'showEmptyFields' : showEmptyFields
    };

    var status = getStatus();

    phenopacket.name = status.name;
    phenopacket.date = status.date;

    // Comment out until we keep API versions up to date
    /*var version = status.offerings.filter(
                        offering => offering.name  == 'api_version'
                            && 'value' in offering);

    if (version.length > 0) {
        phenopacket.api_version = version[0].value;
    }*/

    return web.wrapJSON(phenopacket);
}

web.wrapRouteGet(app, '/phenopacket', '/phenopacket', [], phenoPacketHandler, errorResponse);


function annotateTextHandler(request) {
    var q = env.isRingoJS() ? request.params.q : request.query.q;
    var longestOnly = env.isRingoJS() ? request.params.longestOnly : request.query.longestOnly;

    var pheno_ids = [];
    var info =
        {
            query: q,
            longestOnly: longestOnly,
            results:[],
        };

    if (q == null || q == "") {
    }
    else {
        info.results = engine.annotateText(q, {longestOnly : longestOnly});
        info.results.forEach(function(r) {
            // engine.log("RES:"+JSON.stringify(r));
            if (r.token.categories.indexOf('Phenotype') > -1) {
                pheno_ids.push(r.token.id);
            }
            if (!r.token.label && r.token.terms instanceof Array) {
                r.token.label = r.token.terms[0];
            }
            r.token.href=genObjectHref('phenotype', r.token);
        });
    }

    var markedText = info.query;
    var start = -1, end = -1;
    var currEnd = [];
    var currTerms = [];

    for (var i = info.results.length - 1; i >= 0; i -= 1) {
        var item = info.results[i];
        var token = item.token;
        if (end == -1 || end < item.end || start < item.end) {
            if (end == -1 || item.start < start) {
                start = item.start;
            }
            if (end == -1 || end < item.end) {
                end = item.end;
            }
            if (currTerms.indexOf(token.id) == -1) {
                currEnd.push(token);
                currTerms.push(token.id);
            }
        } else {
            if (end != -1) {
                var str = "<span class=\"linkedspan\">" + markedText.substring(start, end) + "<div class=\"linkedterms\">";
                currEnd = currEnd.reverse();
                for (var j = 0; j < currEnd.length; j += 1) {
                    var link = currEnd[j];
                    str += "<div class=\"linkeditem\">" + link.href + " (" + link.id + ")</div>";
                }
                str += "</div></span>";
                markedText = markedText.substring(0, start) + str + markedText.substring(end);
            }
            start = item.start;
            end = item.end;
            currEnd = [];
            currTerms = [];
            currEnd.push(token);
            currTerms.push(token.id);
        }
    };
    if (currEnd.length > 0) {
        var str = "<span class=\"linkedspan\">" + markedText.substring(start, end) + "<div class=\"linkedterms\">";
        currEnd = currEnd.reverse();
        for (var j = 0; j < currEnd.length; j += 1) {
            var link = currEnd[j];
            str += "<div class=\"linkeditem\">" + link.href + " (" + link.id + ")</div>";
        }
        str += "</div></span>";
        markedText = markedText.substring(0, start) + str + markedText.substring(end);
    };

    info.resultsTable = function() {return genTableOfAnnotateTextResults(info.results, info.query); } ;
    info.inputItems = pheno_ids.join(",");
    info.numPhenotypes = pheno_ids.length;
    info.markedText = markedText;

    addCoreRenderers(info, 'annotate');

    // info.pup_tent_css_libraries.push("/monarch-specific.css");
    info.pup_tent_css_libraries.push("/annotate.css");
    info.pup_tent_css_libraries.push("/imagehover.css");

    // info.pup_tent_js_libraries.push("/tables.js");
    // info.pup_tent_js_libraries.push("/stupidtable.min.js");
    info.monarch_launchable.push('InitTables()');

    info.title = "Annotation";
    info.hasResults = (info.results.length > 0);

    var output = pup_tent.render('annotate.mustache',info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/annotate/text', '/annotate/text', [], annotateTextHandler, errorResponse);


function annotateMinimalTextHandler(request, fmt) {
    var q = request.params.q;

    var info =
        {
            query: q,
            longestOnly: request.params.longestOnly,
            results:[],
        };

    if (q == null || q == "") {
    }
    else {
        info.results = engine.annotateText(q, {longestOnly : request.params.longestOnly}).entities;
        info.results.forEach(function(r) {
            r.entity.label = r.entity.value;
        });
    }

    info.resultsTable = function() {return genTableOfAnnotateTextResults(info.results, 'obopurl'); } ;

    addCoreRenderers(info, 'annotate');
    info.hasResults = (info.results.length > 0);

    var output = pup_tent.render('annotate_minimal.mustache',info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/annotate_minimal/text/:id.:fmt?', '/annotate_minimal/text/{id}.{fmt}', ['id', 'fmt'], annotateMinimalTextHandler, errorResponse);
web.wrapRouteGet(app, '/annotate_minimal/text/:id', '/annotate_minimal/text/{id}', ['id'], annotateMinimalTextHandler, errorResponse);


function sufficiencyBasicHandler(request, datatype, fmt) {
    var target = null;
    var info = {datatype: datatype, results:[]};
    var limit = 100;
    var input_items = getIdentifierList(request.params);
    input_items = engine.mapIdentifiersToPhenotypes( input_items );
    info.results = engine.getAnnotationSufficiencyScore(input_items);

    //info.input_items = resultObj.query_IRIs;
    info.input_items = input_items.join("\n");

    return response.json(info.results);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/sufficiency/basic/:id.:fmt?', '/sufficiency/basic/{id}.{fmt}', ['id', 'fmt'], sufficiencyBasicHandler, errorResponse);
web.wrapRouteGet(app, '/sufficiency/basic/:id', '/sufficiency/basic/{id}', ['id'], sufficiencyBasicHandler, errorResponse);


function scigraphDynamicHandler(request, id, fmt) {
    //this presently is a scigraph pass-through wrapper, and only deals with json!
    //for example: /dynamic/homologs.json?gene_id=6469&homolog_id=RO_HOM0000000
    var path = request.pathInfo;

    //replace the "/dynamic" part of the path in the query
    path = path.replace(/.*\/?dynamic/,'');
    var params = request.params;

    var scigraph_results = engine.querySciGraphDynamicServices(path,params);

    return response.json(scigraph_results);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/scigraph/dynamic*/:id.:fmt?', '/scigraph/dynamic*/{id}.{fmt}', ['id', 'fmt'], scigraphDynamicHandler, errorResponse);
web.wrapRouteGet(app, '/scigraph/dynamic*/:id', '/scigraph/dynamic*/{id}', ['id'], scigraphDynamicHandler, errorResponse);


// proxy kegg api
if (env.isRingoJS()) { /* TODO: CONVERT_TO_DUAL_MODE */
app.get('/kegg/:operation/:arg1/:arg2?/:arg3?', function(request, operation, arg1, arg2, arg3) {
    var url = 'http://rest.kegg.jp/' + operation + '/' + arg1;
    if (arg2) url = url + '/' + arg2;
    if (arg3) url = url + '/' + arg3;

    var response = httpclient.get(url, {});
    var status = response.status;
    if (status == 200) {
        return {
            body: [response.content],
            headers: {'Content-Type': 'text/plain'},
            status: 200
        };
    } else {
        return {
            body: ["{error:true}"],
            headers: {'Content-Type': 'text/plain'},
            status: status
        };
    }
});
}


function adminIntrospectHandler(request, fmt) {

    var info = engine.introspect();

    // you can have any format you like, so long as it's json
    return web.wrapJSON(info);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/admin/introspect.:fmt?', '/admin/introspect.{fmt}', ['fmt'], adminIntrospectHandler, errorResponse);
web.wrapRouteGet(app, '/admin/introspect', '/admin/introspect', [], adminIntrospectHandler, errorResponse);


web.wrapRouteGet(app, '/admin/cache/info', '/admin/cache/info', [],
    function(request, fmt) {

        var info = {
            sizeInfo : engine.cache.sizeInfo(),
            cacheDirs : engine.cache.cacheDirs(),
            contents : engine.cache.contents().length
        };

        // you can have any format you like, so long as it's json
        return web.wrapJSON(info);
    }, errorResponse);


// in theory anyone could access this and clear our cache slowing things down....
// we should make this authorized, not really a concern right now though
web.wrapRouteGet(app, '/admin/clear-cache', '/admin/clear-cache', [],
    function(request) {
        engine.cache.clear(web.getParam(request, 'match'));
        return web.wrapHTML("Cleared!");
    }, errorResponse);


// A routing page different non-production demonstrations and tests.
web.wrapRouteGet(app, '/labs', '/labs', [],
    function(request) {
        var info = newInfo();
        addCoreRenderers(info);
        info.pup_tent_css_libraries.push("/tour.css");
        info.title = 'Monarch Labs'
        var output = pup_tent.render('labs.mustache', info,
                     'monarch_base.mustache');
        return web.wrapHTML(output);
    }, errorResponse);


/* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */

if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
//A routing page different non-production demonstrations and tests.
app.get('/labs/dovegraph.:fmt?',function(request,fmt){

        var info = newInfo();
        addCoreRenderers(info);
        addGolrStaticFiles(info);

        var phenoDist = env.readJSON('./widgets/dove/stats/key-phenotype-annotation-distro.json');
        var hpStub = env.readJSON('./widgets/dove/stats/hp-ontology-4.json');

        if (fmt != null) {
            return formattedResults(info,fmt,request);
        }

        info.pup_tent_js_libraries.push("/barchart-launcher.js");
        info.pup_tent_js_libraries.push("/graph-config.js");
        info.pup_tent_js_libraries.push("/dovechart.js");
        info.pup_tent_css_libraries.push("/dovegraph.css");
        info.pup_tent_js_libraries.push("/barchart.js");
        info.pup_tent_js_libraries.push("/tree.js");
        info.pup_tent_js_libraries.push("/tree_builder.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/main.css");
        info.title = 'Monarch Labs DoveGraph';

        info.pup_tent_js_variables.push.apply(info.pup_tent_js_variables,
        [
            {name:'phenoDist',value:hpStub}
        ]);
        info.monarch_launchable.push.apply(info.monarch_launchable,
        [
            'makePhenotypeLandingGraph(phenoDist)'
        ]);

        var output = pup_tent.render('dovegraph.mustache',info,'monarch_base.mustache');
        return response.html(output);
});
}

// A routing page different non-production demonstrations and tests.
web.wrapRouteGet(app, '/labs/cy-path-demo', '/labs/cy-path-demo', [],
    function (request){
        var info = newInfo();
        addCoreRenderers(info);

        // Now add the stuff that we need to move forward.
        //info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo_data_context.js");
        info.pup_tent_js_libraries.push("/CytoDraw.js");
        info.pup_tent_js_libraries.push("/CyPathDemo.js");
        info.pup_tent_js_libraries.push("/cytoscape.min.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/tour.css");

        info.title = 'cy-path-demo';

        info.monarch_launchable.push('CyPathDemoInit()');

        var output = pup_tent.render('cy-path-demo.mustache',info,'monarch_base.mustache');
        return web.wrapHTML(output);
});

// A routing page different non-production demonstrations and tests.
web.wrapRouteGet(app, '/labs/cy-explore-demo', '/labs/cy-explore-demo', [],
            function (request){
        var info = newInfo();
        addCoreRenderers(info);

        // Now add the stuff that we need to move forward.
        info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo_data_context.js");
        info.pup_tent_js_libraries.push("/CytoDraw.js");
        info.pup_tent_js_libraries.push("/CyExploreDemo.js");
        info.pup_tent_js_libraries.push("/cytoscape.min.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/tour.css");

        info.monarch_launchable.push('CyExploreDemoInit()');

        info.title = 'cy-explore-demo';

        var output = pup_tent.render('cy-explore-demo.mustache',info,'monarch_base.mustache');
        return web.wrapHTML(output);
});


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
//Page for testing out chromosome visualization
app.get('/labs/chromosome-vis-demo',
    function(request, page){
        var info = newInfo();

        var pup_tent_test = require('pup-tent')(
                ['js','css','templates','templates/labs',
                 'templates/page',
                 'widgets/dove/js',
                 'widgets/dove/css',
                 'node_modules/phenogrid/js',
                 'node_modules/phenogrid/css',
                 'widgets/keggerator/js',
                 'widgets/class-enrichment',
                 'conf' // get access to conf/golr-conf.json
        ]);
        info.pup_tent_js_libraries = [];
        info.pup_tent_css_libraries = [];

        // Override common css and js files,
        pup_tent_test.set_common('css_libs', []);
        pup_tent_test.set_common('js_libs', []);

        info.title = 'chromosome-vis-demo';

        info.pup_tent_js_libraries.push("/jquery-1.11.0.js");
        info.pup_tent_js_libraries.push("/jsdas.min.js");
        info.pup_tent_js_libraries.push("/angular-chromosome-vis.js");

        info.pup_tent_css_libraries.push("/angular-chromosome-vis.css")

        var output = pup_tent_test.render('chromosome-vis-demo.mustache',info);
        return response.html(output);
 });
}


// Playing around with remote resource/feed reading.
// TODO: If it gets /any/ more complicated, reform into an object.
function _get_now_sec(){ return Math.round((new Date()).getTime() / 1000); }
var _blog_data_last_step = 1800; // # sec until next download; 1/2hr
var _blog_data_last_time = _get_now_sec(); // one-time init
var _blog_data_last_res = [];
/**
 * Get blog data
 * @param {String} label - An optional label restricting blog posts.
 */

function _get_blog_data(label) {

  // Only proceed if the time-since-last threshold is crossed or the
  // cached results are empty.
  var res = [];
  var now = _get_now_sec();
  if ((now - _blog_data_last_time) < _blog_data_last_step && _blog_data_last_res.length > 0 ) {
    // Used cached list
    // engine.log('blog: using cached results');
    // engine.log('blog: now:' + now + ' last:' + _blog_data_last_time + ' step:' +
    //             _blog_data_last_step + ' delta:' + (now - _blog_data_last_time));
    res = _blog_data_last_res;
  }
  else {
    engine.log('blog: get new results');

    // Grab off page.
    var base = 'http://monarch-initiative.blogspot.com';
    var catr = base + '/search/label/';
    var rsrc = base + '/feeds/posts/default?alt=rss';
    if (label != null) {
        rsrc = base + '/feeds/posts/default/-/' + label + '?alt=rss';
    }

    var rssContent = null;
    if (env.isRingoJS()) {
      try {
        var http_client = require("ringo/httpclient");
        var exchange = http_client.get(rsrc);
        if( exchange && exchange.content ){
          rssContent = exchange.content;
          // engine.log('rssContent: ' + rssContent);
        }
      }
      catch (e) {
        engine.log('blog: error: ' + e);
      }
    }
    else {
      var requestResult = WaitFor.for(AsyncRequest.get, rsrc);
      rssContent = requestResult.body + '';
    }

    if (rssContent) {
      // For E4X bug 336551.
      rssContent = rssContent.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
      // console.log('rssContent:', rssContent);

      var rss;
      if (false && env.isRingoJS()) {
        rss = new XML(rssContent);
      }
      else {
        var xml2js = require('xml2js');
        var parseString = xml2js.parseString;
        var parseOptions = {};
        parseOptions.explicitArray = false;
        parseOptions.ignoreAttrs = true;
        parseString(rssContent, parseOptions, function(err, result) {
            rss = result.rss;
        });
      }

      // console.log('parsed rss:', rss);
      // console.log('#### rss.channel:', rss.channel);
      // console.log('#### rss.channel.item:', rss.channel.item);
      if( rss && rss.channel && rss.channel.item ){
        for (var itemkey in rss.channel.item) {
          var item = rss.channel.item[itemkey];
          //engine.log('item: ' + Object.keys(item) + ' --> ' + item);

          // Date.
          var t = new Date(item.pubDate);
          var y = t.getFullYear();
          var m = t.getMonth();
          if ( m < 10 ) {
              m = '0' + m;
          }
          var d = t.getDate();

          // Categories.
          var cats = [];

          // Categories.
          var cats = [];
          if (item.category) {
            var catarray = item.category;
            if (typeof(catarray) === 'string') {
                catarray = [catarray];
            }
            for( var catindex = 0; catindex < catarray.length; ++catindex ) {
              var cat = catarray[catindex];
              cats.push({'label': cat, 'link': catr + cat});
            }
          }

          res.push({
              'title': item.title,
              'description': item.description,
              'link': item.link,
              'category': cats,
              'date': [y, m, d].join('-')
          });
        }
      }
      else {
          engine.log('blog: error fetching rss items. rssContent:', rssContent);
      }
    }
    else {
        engine.log('blog: error fetching rss content. rsrc:', rsrc);
    }

    // No matter what, even if empty, update last attempt.
    _blog_data_last_res = res;
    _blog_data_last_time = now;
  }

  return res;
}


function _sortByLabel(array) {
    if (array == null) return;
    array.sort(function(a, b){
            if (typeof a.label == 'undefined' ||
                typeof b.label == 'undefined' ){
                return 0;
            }
            var labelA=a.label.toLowerCase(), labelB=b.label.toLowerCase()
            if (labelA < labelB) //sort string ascending
              return -1
            if (labelA > labelB)
              return 1
            return 0 //default return value (no sorting)
              })
  return array;
}


// Method: /
//
// Arguments:
//  - none
//
// Returns:
//  Top level page
function homeHandler(request) {
  // Rendering.
  var info = newInfo();

  var defaults = {
      monarch_nav_search_p: true,
      monarch_extra_footer_p: true,
      monarch_footer_fade_p: false
  };

  addCoreRenderers(info, null, null, defaults);

  // Now add the stuff that we need to move forward.
  if (useBundle) {
  }
  else {
    info.pup_tent_css_libraries.push("/monarch-home.css");
    // info.pup_tent_js_libraries.push("/HomePage.js");
  }

  info.monarch_launchable.push('InitHomePage();');

  // Get blog data and render with vars.
  var blog_res = _get_blog_data();
  // Limit to X.
  var lim = 4;
  if( blog_res && blog_res.length > lim ){
      blog_res = blog_res.slice(0, lim);
  }
  info.blog_results = blog_res;
  info.title = 'Welcome to Monarch';
  info.home_page = true;

  var output = pup_tent.render('home-page.mustache', info,
       'monarch_base.mustache');
  return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/', '/', [], homeHandler, errorResponse);


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/labs/scratch-homepage', function(request, page){

    // Rendering.
    var info = newInfo();

    var defaults = {
        monarch_nav_search_p: false,
        monarch_extra_footer_p: true,
        monarch_footer_fade_p: false
    };
    addCoreRenderers(info, null, null, defaults);

    // Now add the stuff that we need to move forward.
    //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
    info.pup_tent_css_libraries.push("/monarch-home.css");
    info.pup_tent_js_libraries.push("/HomePage.js");

    //graph
    var phenoDist = env.readJSON('./widgets/dove/stats/key-phenotype-annotation-distro.json');
    info.pup_tent_js_libraries.push("/dovechart.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/barchart.js");
    info.pup_tent_js_libraries.push("/tree.js");
    info.pup_tent_js_libraries.push("/graph-config.js");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.monarch_launchable.push('makeHomePageGraph(globalDataGraph)');

    // Get blog data and render with vars.
    var blog_res = _get_blog_data();
    // Limit to X.
    var lim = 4;
    if( blog_res && blog_res.length > lim ){
        blog_res = blog_res.slice(0, lim);
    }
    info.blog_results = blog_res;
    info.title = 'Welcome to Monarch';
    info.home_page = true;
    var output = pup_tent.render('home-page-scratch.mustache', info,
                 'monarch_base.mustache');
    var res =  response.html(output);
    return res;
});
}


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/labs/blog-test', function(request, page){

    // Rendering.
    var info = newInfo();
    addCoreRenderers(info);

    // Now add the stuff that we need to move forward.
    //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
    info.pup_tent_css_libraries.push("/monarch-labs.css");
    info.pup_tent_js_libraries.push("/BlogScratch.js");

    // Get blog data and render with vars.
    var blog_res = _get_blog_data();
    // Limit to X.
    var lim = 4;
    if( blog_res && blog_res.length > lim ){
        blog_res = blog_res.slice(0, lim);
    }
    info.blog_results = blog_res;
    info.title = 'Welcome to Monarch';
    var output = pup_tent.render('blog-scratch-test.mustache', info,
                 'blog-scratch-base.mustache');
    var res =  response.html(output);
    return res;
});
}


/*
 * GOLR REFACTOR
 */

function addGolrStaticFiles(info) {
    var xrefs_conf_json = env.readJSON('conf/xrefs.json');

    if (useBundle) {
    }
    else {
      info.pup_tent_css_libraries.push("/bbop.css");
      // info.pup_tent_js_libraries.push("/golr-table.js");
    }

    info.pup_tent_js_variables.push({name:'global_xrefs_conf',
        value: xrefs_conf_json});
}

//query_field: e.g. subject_closure
function addGolrTable(info, query_field, div, filter, personality, anchor, is_static_id, or_filter) {
    var replacer = new RegExp('-', 'g');

    //There has to be a better way
    var suffix = bbop.core.uuid().replace(replacer, '');
    var field_var = "query_field_" + suffix;
    var div_var = "query_div_" + suffix;
    var filt_var = "filter_" + suffix;
    var person_var = "person_" + suffix;
    var anchor_var = "anchor_" + suffix;
    var is_static_var = "is_leaf_" + suffix;
    var or_filt_var = "or_filter_" + suffix;
    var launch = '';

    if (typeof(is_static_id) === 'undefined') {
        is_static_id = info.isLeafNode;
    }

    info.pup_tent_js_variables.push({name: field_var, value: query_field});
    info.pup_tent_js_variables.push({name: div_var, value: div});
    info.pup_tent_js_variables.push({name: person_var, value: personality});
    info.pup_tent_js_variables.push({name: anchor_var, value: anchor});
    info.pup_tent_js_variables.push({name: filt_var, value: filter});
    info.pup_tent_js_variables.push({name: is_static_var, value: is_static_id});
    info.pup_tent_js_variables.push({name: or_filt_var, value: or_filter});


    launch = 'getTableFromSolr(' + field_var + ', ' + div_var + ', ' + filt_var + ', '
                                 + person_var + ', ' + anchor_var
                                 + ', ' + is_static_var + ',' + or_filt_var + ')';
    info.monarch_launchable.push(launch);
}


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/labs/widget-scratch',
    function(request, page){

        // Rendering.
        var info = newInfo();
        addCoreRenderers(info);

        addGolrTable(info, "subject_closure", id, 'bs3results');

        // Now add the stuff that we need to move forward.
        //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/bbop.css");
        info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo2.js");
        info.pup_tent_js_libraries.push("/WidgetScratch.js");

    //
        info.title = 'Widget Tests in Monarch';
        var output = pup_tent.render('widget-scratch.mustache', info,
                     'blog-scratch-base.mustache');
        var res =  response.html(output);
        return res;
 });
}


function phenotypeByIdHandler(request, id, fmt){

    //Curify ID if needed
    if (/_/.test(id) && !/\:/.test(id)){
        engine.log("ID contains underscore, replacing with : and redirecting");
        var newID = id.replace("_",":");
        return web.wrapRedirect(genURL('phenotype',newID));
    }

    // Rendering.
    var info = newInfo(engine.fetchClassInfo(id, {level:1}));

    if (fmt != null) {
        // TODO
        return formattedResults(info, fmt, request);
    }

    addCoreRenderers(info, 'phenotype', id);
    addGolrStaticFiles(info);
    // info.pup_tent_css_libraries.push("/monarch-specific.css");

    //Load variables for client side tables
    var disease_filter = [{ field: 'subject_category', value: 'disease' },
                          { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'disease-table', disease_filter, 'disease_phenotype',"#diseases");
    info.diseaseNum = engine.fetchAssociationCount(disease_filter, 'subject');

    var gene_filter = [{ field: 'subject_category', value: 'gene' },
                       { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure','gene-table', gene_filter, 'gene_phenotype', "#genes");
    info.geneNum = engine.fetchAssociationCount(gene_filter, 'subject');

    var genotype_filter = [{ field: 'subject_category', value: 'genotype' },
                           { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'genotype-table', genotype_filter, 'genotype_phenotype',"#genotypes");
    info.genotypeNum = engine.fetchAssociationCount(genotype_filter, 'subject');

    var model_filter = [
                        { field: 'subject_category', value: 'model' },
                        { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'model-table', model_filter, 'genotype_phenotype',"#models");
    info.modelNum = engine.fetchAssociationCount(model_filter, 'subject');

    var variant_filter = [
                          { field: 'subject_category', value: 'variant' },
                          { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'variant-table', variant_filter, 'variant_phenotype',"#variants");
    info.variantNum = engine.fetchAssociationCount(variant_filter, 'subject');

    addNonEmptyAnchors(info);

    if (typeof info.synonyms != 'undefined'){
        info.aka = info.synonyms.join(", ");
    }

    if (info.equivalentClasses){
        info.equivalentClasses = info.equivalentClasses.join(", ");
    }

    info.title = 'Monarch Phenotype: '+info.label+' ('+ info.id+')';

    info.primary_xref = function() {return genExternalHref('source', {id : id})};
    info.xrefs = function() {
        return buildXrefsList(id, info.database_cross_reference);
    };
    info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

    // variables checking existence of data in sections
    info.hasDef = function() {return checkExistence(info.definitions)};
    info.hasAka = function() {return checkExistence(info.synonyms)};
    info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
    info.hasGenes = true;

    //Variables and launcher for ontology view
    info.pup_tent_js_variables.push({name:'globalID',value:id});
    info.pup_tent_js_variables.push({name:'globalLabel',value:info.label});
    info.pup_tent_js_variables.push({name:'phenotype_root',value:'UPHENO:0001001'});
    info.classificationBrowserURL = 'https://github.com/obophenotype/upheno';
    info.hasBrw = true;
    info.monarch_launchable.push("getOntologyBrowser(globalID, globalLabel, phenotype_root)");

    info.node_label = 'Phenotype';
    info.node_logo = '/image/carousel-phenotypes.png';
    var output = pup_tent.render('node.mustache', info,
                                 'monarch_base.mustache');
    return web.wrapHTML(output);
    }

web.wrapRouteGet(app, '/phenotype/:id.:fmt?', '/phenotype/{id}.{fmt}', ['id', 'fmt'], phenotypeByIdHandler, errorResponse);
web.wrapRouteGet(app, '/phenotype/:id', '/phenotype/{id}', ['id'], phenotypeByIdHandler, errorResponse);


//PHENOTYPE - Sub-pages
//Example: /phenotype/MP_0000854/phenotype_associations.json
//Currently only works for json or rdf output
function phenotypeByIdSectionHandler(request, id, section, fmt) {

    var info = newInfo(engine.fetchClassInfo(id, {level:1}));

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    }
    else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/phenotype/:id/:section.:fmt', '/phenotype/{id}/{section}.{fmt}', ['id', 'section', 'fmt'], phenotypeByIdSectionHandler, errorResponse);
web.wrapRouteGet(app, '/phenotype/:id/:section', '/phenotype/{id}/{section}', ['id', 'section'], phenotypeByIdSectionHandler, errorResponse);


function buildXrefsList(id, database_cross_reference) {
    var xrefs = [];
    if (database_cross_reference != null) {
        for (var xref_key in database_cross_reference) {
            var xref = database_cross_reference[xref_key];
            if (xref !== id) {
                xrefs.push(genExternalHref('source', {id: xref}));
            }
        }
    }
    xrefs.unshift(genExternalHref('source', {id: id}));
    var result = xrefs.join(', ');
    return result;
}


function diseaseByIdHandler(request, id, fmt) {
    // engine.log("getting /disease/:id where id="+id + " fmt=" + fmt);

    //Curify ID if needed
    if (/_/.test(id)){
        engine.log("ID contains underscore, replacing with : and redirecting");
        var newID = id.replace("_",":");
        return web.wrapRedirect(genURL('disease',newID));
    }

    // Rendering.
    var info = newInfo(engine.fetchClassInfo(id, {level:1}));

    if (fmt != null) {
        return formattedResults(info, fmt,request);
    }

    if (info.label == null || info.id == info.label){
        var redirect = redirectDiseasePage(id, info.equivalentNodes);
        if (redirect){
            return redirect;
        }
    }

    addCoreRenderers(info, 'disease', id);

    addGolrStaticFiles(info);
    // info.pup_tent_css_libraries.push("/monarch-specific.css");

    //Load variables for client side tables
    var phenotype_filter = [
                            { field: 'object_category', value: 'phenotype' },
                            { field: 'subject_category', value: 'disease' },
                            { field: 'subject_closure', value: id }
    ];
    addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'disease_phenotype','#phenotypes');
    info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');

    var gene_filter = [
                       { field: 'subject_category', value: 'gene' },
                       { field: 'object_category', value: 'disease' },
                       { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'gene-table', gene_filter, 'gene_disease','#genes');
    info.geneNum = engine.fetchAssociationCount(gene_filter, 'subject');

    var genotype_filter = [
                           { field: 'subject_category', value: 'genotype' },
                           { field: 'object_category', value: 'disease' },
                           { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'genotype-table', genotype_filter, 'genotype_disease',"#genotypes");
    info.genotypeNum = engine.fetchAssociationCount(genotype_filter, 'subject');

    var model_filter = [
                        { field: 'subject_category', value: 'model' },
                        { field: 'object_category', value: 'disease' },
                        { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'model-table', model_filter, 'model_disease','#models');
    info.modelNum = engine.fetchAssociationCount(model_filter, 'subject');

    var variant_filter = [
                          { field: 'subject_category', value: 'variant' },
                          { field: 'object_category', value: 'disease' },
                          { field: 'object_closure', value: id }
    ];
    addGolrTable(info, 'object_closure', 'variant-table', variant_filter, 'variant_disease','#variants');
    info.variantNum = engine.fetchAssociationCount(variant_filter, 'subject');

    var pathway_filter = [{ field: 'object_category', value: 'pathway' },
                          { field: 'subject_category', value: 'disease' },
                          { field: 'subject_closure', value: id }
    ];
    addGolrTable(info, 'subject_closure', 'pathway-table', pathway_filter, 'disease_pathway','#pathways');
    info.pathwayNum = engine.fetchAssociationCount(pathway_filter, 'object');

    var literature_filter = [
                             { field: 'subject_category', value: 'publication' },
                             { field: 'object_category', value: 'disease' },
                             { field: 'object_closure', value: id },
    ];
    addGolrTable(info, 'object_closure', 'literature-table', literature_filter, 'lit_disease_disp','#literature');
    info.literatureNum = engine.fetchAssociationCount(literature_filter, 'subject');

    // Phenogrid
    addPhenogridFiles(info);

    addNonEmptyAnchors(info);

    info.title = 'Monarch Disease: '+info.label+' ('+ info.id+')';

    info.primary_xref = function() {return genExternalHref('source',{id : id})};
    info.xrefs = function() {
        return buildXrefsList(id, info.database_cross_reference);
    };
    info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

    if (typeof info.synonyms != 'undefined'){
        info.aka = info.synonyms.join(", ");
    }

    info.altids = function() {
        if (info.has_alternative_id != null) {
            return info.has_alternative_id.join(", ");
        }
    }

    //info.hasHeritability = function() {return checkExistence(info.heritability)};
    //info.heritability = engine.unique(info.heritability.map(function(h) {return h.inheritance.label})).join(", ");

    // variables checking existence of data in sections
    info.hasDef = function() {return checkExistence(info.definitions)};
    info.hasComment = function() {return checkExistence(info.comment)};
    info.hasAka = function() {return checkExistence(info.synonyms)};
    info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
    info.hasPhenotypes = info.phenotypeNum;
    if (info.phenotypeNum > 10000){
        info.hasPhenotypes = false;
    }

    info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);

    //Variables and launcher for ontology view
    info.pup_tent_js_variables.push({name:'globalID',value:id});
    info.pup_tent_js_variables.push({name:'globalLabel',value:info.label});
    info.pup_tent_js_variables.push({name:'root',value:'DOID:4'});
    info.classificationBrowserURL = 'https://github.com/monarch-initiative/monarch-disease-ontology';
    info.hasBrw = true;
    info.monarch_launchable.push("getOntologyBrowser(globalID, globalLabel, root)");

    var output;
    //Launch function for annotation score
    if (info.isLeafNode){
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
    }

    if (info.hasPhenotypes){
        info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
        var phenogridView = "default";
        addPhenogridView(info, phenogridView);
    }
    info.node_label = 'Disease';
    info.node_logo = '/image/carousel-diseases.png';
    output = pup_tent.render('node.mustache', info, 'monarch_base.mustache');
    // } else {
    //     if (info.hasPhenotypes){
    //         info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
    //         info.monarch_launchable.push('loadPhenogrid()');
    //     }
    //     info.node_label = 'Disease Group';
    //     info.node_logo = '/image/carousel-diseases.png';
    //     output = pup_tent.render('node.mustache', info,
    //         'monarch_base.mustache');
    // }

    return web.wrapHTML(output);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/disease/:id.:fmt?', '/disease/{id}.{fmt}', ['id', 'fmt'], diseaseByIdHandler, errorResponse);
web.wrapRouteGet(app, '/disease/:id', '/disease/{id}', ['id'], diseaseByIdHandler, errorResponse);


//DISEASE - Sub-pages
//Example: /disease/DOID_12798/phenotype_associations.json
//Currently only works for json or rdf output

function diseaseByIdSectionHandler(request, id, section, fmt){
    var info = engine.fetchCoreDiseaseInfo(id);
    var sectionInfo =
         { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt, request);
    } else {
        return errorResponse(500, "plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/disease/:id/:section.:fmt', '/disease/{id}/{section}.{fmt}', ['id', 'section', 'fmt'], diseaseByIdSectionHandler, errorResponse);
web.wrapRouteGet(app, '/disease/:id/:section', '/disease/{id}/{section}', ['id', 'section'], diseaseByIdSectionHandler, errorResponse);


function fetchFeatureSection(request, id, section, fmt) {

    var info = engine.fetchSectionInfo(id, section);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    } else {
        return errorResponse(500, "plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
}


function geneByIdHandler(request, id, fmt) {
    try {

        //Curify ID if needed
        if (/_/.test(id)){
            engine.log("ID contains underscore, replacing with : and redirecting");
            var newID = id.replace("_",":");
            return web.wrapRedirect(genURL('gene',newID));
        }

        // Rendering.
        var info = newInfo();
        info = engine.fetchDataInfo(id);

        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        if (info.label == null || info.id == info.label){
            var redirect = redirectGenePage(id, info.equivalentNodes);
            if (redirect){
                return redirect;
            }
        }

        addCoreRenderers(info, 'gene', id);
        addGolrStaticFiles(info);

        //Load variables for client side tables
        var phenotype_filter = [
                                { field: 'object_category', value: 'phenotype' },
                                { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'gene_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');

        var disease_filter = [
                              { field: 'object_category', value: 'disease' },
                              { field: 'subject_category', value: 'gene' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'disease-table', disease_filter, 'gene_disease','#diseases');
        info.diseaseNum = engine.fetchAssociationCount(disease_filter, 'object');

        var genotype_filter = [
                               { field: 'subject_category', value: 'genotype' },
                               { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'genotype-table', genotype_filter, 'genotype_gene_on_gene_page','#genotypes');
        info.genotypeNum = engine.fetchAssociationCount(genotype_filter, 'subject');

        var model_filter = [
                            { field: 'subject_category', value: 'model' },
                            { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'model-table', model_filter, 'model_gene','#models');
        info.modelNum = engine.fetchAssociationCount(model_filter, 'subject');

        var variant_filter = [
                              { field: 'subject_category', value: 'variant' },
                              { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'variant-table', variant_filter, 'variant_gene','#variants');
        info.variantNum = engine.fetchAssociationCount(variant_filter, 'subject');

        var homolog_filter = [
                              { field: 'object_category', value: 'gene' },
                              { field: 'relation_closure', value: 'RO:HOM0000001' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'homolog-table', homolog_filter, 'gene_homolog','#homologs');
        info.homologNum = engine.fetchAssociationCount(homolog_filter, 'object');

        var pathway_filter = [
                              { field: 'object_category', value: 'pathway' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'pathway-table', pathway_filter, 'gene_pathway','#pathways');
        info.pathwayNum = engine.fetchAssociationCount(pathway_filter, 'object');

        var ortho_phenotype_filter = [
                                      { field: 'object_category', value: 'phenotype' },
                                      { field: 'subject_ortholog_closure', value: info.cliqueLeader }
        ];
        addGolrTable(info, 'subject_ortholog_closure', 'ortholog-phenotype-table', ortho_phenotype_filter,
                'gene_phenotype','#ortholog-phenotypes', false);

        info.orthoPhenoNum = engine.fetchAssociationCount(ortho_phenotype_filter, 'object');

        var interaction_filter = [
                                  { field: 'subject_category', value: 'gene' },
                                  { field: 'object_category',  value: 'gene' },
                                  { field: 'relation_closure', value: 'RO:0002434'},
                                  { field: 'subject_closure',  value: id}
        ];

        addGolrTable(info, 'subject_closure', 'interaction-table',
                interaction_filter, 'gene_interactions','#interactions', false);

        info.interactionNum = engine.fetchAssociationCount(interaction_filter, null);

        // Phenogrid
        addPhenogridFiles(info);

        // hack to inhibit species filters which isn't working on Gene page for some reason.
        addNonEmptyAnchors(info, true);

        info.title = 'Monarch Gene: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source', {id : id})};
        info.xrefs = function() {
            return buildXrefsList(id, info.database_cross_reference);
        };
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }

        if (info.equivalentClasses){
            info.equal_ids  = function() {
                return info.equivalentClasses.map(function(r) { return genObjectHref('gene', {id:r,label:r} ) }).join(", ");
            }
        }

        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;

        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
        var myGeneLauncher = 'fetchGeneDescription(globalID)';
        info.monarch_launchable.push(myGeneLauncher);

        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
            var phenogridView = "default";
            addPhenogridView(info, phenogridView);
        }

        info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);

        info.node_label = 'Gene';
        info.node_logo = '/image/carousel-genes.png';
        var output = pup_tent.render('node.mustache', info,
                 'monarch_base.mustache');
        return web.wrapHTML(output);

    } catch(err) {
        return errorResponseWithObject(err);
    }

}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/gene/:id.:fmt?', '/gene/{id}.{fmt}', ['id', 'fmt'], geneByIdHandler, errorResponse);
web.wrapRouteGet(app, '/gene/:id', '/gene/{id}', ['id'], geneByIdHandler, errorResponse);


var redirectGenePage = function(id, equivalentNodes) {
   var prefix = id.replace(/(\w+):([\w\d]+)/, "$1");
   var nodeMap = {};

   // This assumes we have one equivalent node per source
   equivalentNodes.forEach( function (i) {
      var source = i.id.replace(/(\w+):([\w\d]+)/, "$1");
      nodeMap[source] = i;
   });

   //Preference when redirecting MGI,ZFIN > NCBIGene > OMIM > ENSEMBL
   if (prefix != 'MGI' && 'MGI' in nodeMap && nodeMap['MGI'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['MGI'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['MGI'].id));

   } else if (prefix != 'ZFIN' && 'ZFIN' in nodeMap && nodeMap['ZFIN'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['ZFIN'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['ZFIN'].id));

   } else if (prefix != 'NCBIGene' && 'NCBIGene' in nodeMap && nodeMap['NCBIGene'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['NCBIGene'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['NCBIGene'].id));

   } else if (prefix != 'OMIM' && 'OMIM' in nodeMap && nodeMap['OMIM'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['OMIM'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['OMIM'].id));

   } else if (prefix != 'ENSEMBL' && 'ENSEMBL' in nodeMap && nodeMap['ENSEMBL'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['ENSEMBL'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['ENSEMBL'].id));
   }

};


var redirectDiseasePage = function(id, equivalentNodes) {
    var prefix = id.replace(/(\w+):([\w\d]+)/, "$1");
    var nodeMap = {};

    // This assumes we have one equivalent node per source
    equivalentNodes.forEach( function (i) {
       var source = i.id.replace(/(\w+):([\w\d]+)/, "$1");
       nodeMap[source] = i;
    });

    //Preference when redirecting OMIM > DOID > Orphanet > MESH
    if (prefix != 'OMIM' && 'OMIM' in nodeMap && nodeMap['OMIM'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['OMIM'].id));

    } else if (prefix != 'DOID' && 'DOID' in nodeMap && nodeMap['DOID'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['DOID'].id));

    } else if (prefix != 'Orphanet' && 'Orphanet' in nodeMap && nodeMap['Orphanet'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['Orphanet'].id));

    } else if (prefix != 'MESH' && 'MESH' in nodeMap && nodeMap['MESH'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['MESH'].id));
    }
};


//Note there is much copied from the above function, should refactor to not repeat code
function variantByIdHandler(request, id, fmt) {
    try {

        if (/_/.test(id) && !/\:/.test(id)){
            engine.log("ID contains underscore, replacing with : and redirecting");
            var newID = id.replace("_",":");
            return web.wrapRedirect(genURL('variant',newID));
        }

        // OMIM variants have a period in the ID, add back to id and
        // set format to null, TODO account for actual .json format
        if (id.match(/^OMIM/)){
            id = id + "." + fmt;
            fmt = null;
        }

        // Rendering.
        var info = newInfo();
        info = engine.fetchDataInfo(id);

        if (fmt != null) {
           return formattedResults(info, fmt,request);
        }

        addCoreRenderers(info, 'variant', id);
        addGolrStaticFiles(info);
        // info.pup_tent_css_libraries.push("/monarch-specific.css");

        //Load variables for client side tables
        var phenotype_filter = [
                                { field: 'object_category', value: 'phenotype' },
                                { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'phenotypes-table', phenotype_filter, 'variant_phenotype','#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(phenotype_filter, 'object');

        var disease_filter = [
                              { field: 'object_category', value: 'disease' },
                              { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'disease-table', disease_filter, 'variant_disease','#diseases');
        info.diseaseNum = engine.fetchAssociationCount(disease_filter, 'object');

        var gene_filter = [
                           { field: 'object_category', value: 'gene' },
                           { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'gene-table', gene_filter, 'variant_gene','#genes');
        info.geneNum = engine.fetchAssociationCount(gene_filter, 'object');

        var genotype_filter = [
                               { field: 'object_category', value: 'genotype' },
                               { field: 'subject_closure', value: id }
        ];
        addGolrTable(info, 'subject_closure', 'genotype-table', genotype_filter, 'variant_genotype','#genotypes');
        info.genotypeNum = engine.fetchAssociationCount(genotype_filter, 'object');

        var model_filter = [
                            { field: 'subject_category', value: 'model' },
                            { field: 'object_closure', value: id }
        ];
        addGolrTable(info, 'object_closure', 'model-table', model_filter, 'model_variant','#models');
        info.modelNum = engine.fetchAssociationCount(model_filter, 'subject');

        // Phenogrid
        addPhenogridFiles(info);

        addNonEmptyAnchors(info, true);

        info.title = 'Monarch Variant: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source', {id : id})};
        info.xrefs = function() {
            return buildXrefsList(id, info.database_cross_reference);
        };
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }

        if (info.equivalentClasses){
            info.equal_ids  = function() {
                return info.equivalentClasses.map(function(r) { return genObjectHref('variant', {id:r,label:r} ) }).join(", ");
            }
        }

        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        info.types = function() {
            if (info.categories != null) {
                return info.categories.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasPhenotypes = info.phenotypeNum;
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasTypes= function() {return checkExistence(info.categories)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};

        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
            var phenogridView = "default";
            addPhenogridView(info, phenogridView);
        }

        info.includes.phenogrid_anchor = expandTemplate('phenogrid-anchor', info);

        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');

        info.node_label = 'Variant';
        info.node_logo = '/image/logo.png';
        var output = pup_tent.render('node.mustache', info,
                 'monarch_base.mustache');
        return web.wrapHTML(output);

    } catch(err) {
        return errorResponseWithObject(err);
    }

}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/variant/:id.:fmt?', '/variant/{id}.{fmt}', ['id', 'fmt'], variantByIdHandler, errorResponse);
web.wrapRouteGet(app, '/variant/:id', '/variant/{id}', ['id'], variantByIdHandler, errorResponse);

//Sequence Feature - Sub-pages
//Example: /gene/NCIBGene:12166/phenotype_associations.json
//Currently only works for json or rdf output

web.wrapRouteGet(app, '/gene/:id/:section.:fmt?', '/gene/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/variant/:id/:section.:fmt?', '/variant/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/genotype/:id/:section.:fmt?', '/genotype/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/model/:id/:section.:fmt?', '/model/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/case/:id/:section.:fmt?', '/case/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);


function associationByIdHandler(request, id, fmt){

        try {

          //Curify ID if needed
            if (/_/.test(id)){
                engine.log("ID contains underscore, replacing with : and redirecting");
                var newID = id.replace("_",":");
                return web.wrapRedirect(genURL('association',newID));
            }

            // Rendering.
            var info = newInfo(engine.fetchClassInfo(id, {level:1}));

            if (fmt != null) {
                return formattedResults(info, fmt,request);
            }

            addCoreRenderers(info, 'association', id);
            addGolrStaticFiles(info);
            // info.pup_tent_css_libraries.push("/monarch-specific.css");
            info.type = "Association";

            //Load variables for client side tables
            var qual_filter = [{ field: 'qualifier', value: 'direct' },
                               { field: 'evidence_object', value: id }];
            addGolrTable(info, "evidence_object", 'associations-table', qual_filter, 'generic_association');
            info.associationNum = engine.fetchAssociationCount(qual_filter);

            var inf_filter = [{ field: 'qualifier', value: 'inferred' },
                              { field: 'evidence_object', value: id }];
            addGolrTable(info, "evidence_object", 'inferred-table', inf_filter, 'generic_association');
            info.inferredNum = engine.fetchAssociationCount(inf_filter);

            info.title = 'Monarch Association: '+info.label+' ('+ info.id+')';

            info.primary_xref = function() {return genExternalHref('source', {id : id})};
            info.xrefs = function() {
                return buildXrefsList(id, info.database_cross_reference);
            };
            info.hasXrefs = function() {return checkExistence(info.database_cross_reference) || !!info.primary_xref};

            if (typeof info.synonyms != 'undefined'){
                info.aka = info.synonyms.join(", ");
            }

            info.altids = function() {
                if (info.has_alternative_id != null) {
                    return info.has_alternative_id.join(", ");
                }
            }

            // variables checking existence of data in sections
            info.hasDef = function() {return checkExistence(info.definitions)};
            info.hasComment = function() {return checkExistence(info.comment)};
            info.hasAka = function() {return checkExistence(info.synonyms)};

            var output = pup_tent.render('associations.mustache', info,
                                         'monarch_base.mustache');
            return web.wrapHTML(output);

        } catch(err) {
            return errorResponseWithObject(err);
        }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/association/:id.:fmt?', '/association/{id}.{fmt}', ['id', 'fmt'], associationByIdHandler, errorResponse);
web.wrapRouteGet(app, '/association/:id', '/association/{id}', ['id'], associationByIdHandler, errorResponse);



function addPhenotypeAnchor(info) {
    var phenotype_anchor = {id: info.id,
                            resultNum: info.phenotypeNum,
                            type: "Phenotypes", href: "phenotypes"};

    return expandTemplate('anchor', phenotype_anchor);
}

function addPhenotypeTable(info) {
    var phenotype_table = {href: "phenotypes", div: "phenotypes-table",
                           isLeafNode: info.isLeafNode,
                           isPhenotypeTable : true};


    return expandTemplate('golr-table', phenotype_table);
}

function addDiseaseAnchor(info) {
    var disease_anchor = {id: info.id,
                          resultNum: info.diseaseNum,
                          type: "Diseases", href: "diseases"};
    return expandTemplate('anchor', disease_anchor);
}

function addDiseaseTable(with_filter) {
    var disease_table = {href: "diseases", div: "disease-table", filter: with_filter};
    return expandTemplate('golr-table', disease_table);
}

function addGeneAnchor(info) {
    var gene_anchor = {id: info.id,
                       resultNum: info.geneNum,
                       type: "Genes", href: "genes"};
    return expandTemplate('anchor', gene_anchor);
}

function addGeneTable(with_filter) {
    var gene_table = {href: "genes", div: "gene-table", filter: with_filter}
    return expandTemplate('golr-table', gene_table);
}

function addAssociationAnchor(info) {
    var assoc_anchor = {id: info.id,
                       resultNum: info.assocNum,
                       type: "Associations", href: "associations"};
    return expandTemplate('association-anchor', assoc_anchor);
}

function addAssociationTable(with_filter) {
    var gene_table = {href: "associations", div: "association-table", filter: with_filter}
    return expandTemplate('golr-table', gene_table);
}

function addModelAnchor(info) {
    var model_anchor = {id: info.id,
                        resultNum: info.modelNum,
                        type: "Models", href: "models"};
    return expandTemplate('anchor', model_anchor);
}

function addModelTable(with_filter) {
    var model_table = {href: "models", div: "model-table", filter: with_filter};
    return expandTemplate('golr-table', model_table);
}


function addVariantAnchor(info) {
    var variant_anchor = {id: info.id, type: "Variants",
                          resultNum: info.variantNum,
                          href: "variants"};
    return expandTemplate('anchor', variant_anchor);
}

function addVariantTable(with_filter) {
    var variant_table = {href: "variants", div: "variant-table", filter: with_filter};
    return expandTemplate('golr-table', variant_table);
}

function addCaseVariantAnchor(info) {
    var variant_anchor = {id: info.id, type: "Variants",
                          resultNum: info.caseVariantNum,
                          href: "variants"};
    return expandTemplate('anchor', variant_anchor);
}

function addCaseVariantTable(with_filter) {
    var variant_table = {href: "variants", div: "case-variant-table", filter: with_filter};
    return expandTemplate('golr-table', variant_table);
}

function addHomologAnchor(info) {
    var homolog_anchor = {id: info.id, type: "Homologs",
                          resultNum: info.homologNum,
                          href: "homologs"};
    return expandTemplate('anchor', homolog_anchor);
}

function addHomologTable() {
    var homologs_table = {href: "homologs", div: "homolog-table"};
    return expandTemplate('golr-table', homologs_table);
}

function addPathwayAnchor(info) {
    var pathway_anchor = {id: info.id, type: "Pathways",
                          resultNum: info.pathwayNum,
                          href: "pathways"};
    return expandTemplate('anchor', pathway_anchor);
}

function addPathwayTable() {
    var pathway_table = {href: "pathways", div: "pathway-table"};
    return expandTemplate('golr-table', pathway_table);
}

function addGenotypeAnchor(info) {
    var genotype_anchor = {id: info.id,
                            resultNum: info.genotypeNum,
                            type: "Genotypes", href: "genotypes"};
    return expandTemplate('anchor', genotype_anchor);
}

function addGenotypeTable(with_filter) {
    var genotype_table = {href: "genotypes", div: "genotype-table", filter: with_filter};
    return expandTemplate('golr-table', genotype_table);
}

function addLiteratureAnchor(info) {
    var literature_anchor = {id: info.id, type: "Literature",
                          resultNum: info.literatureNum,
                          href: "literature"};
    return expandTemplate('anchor', literature_anchor);
}

function addLiteratureTable() {
    var literature_table = {href: "literature", div: "literature-table"};
    return expandTemplate('golr-table', literature_table);
}

function addOrthoPhenoAnchor(info) {
    var ortho_pheno_anchor = {id: info.id,
                            resultNum: info.orthoPhenoNum,
                            type: "Ortholog-Phenotypes", href: "ortholog-phenotypes"};
    return expandTemplate('anchor', ortho_pheno_anchor);
}

function addOrthoPhenoTable() {
    var ortho_pheno_table = {href: "ortholog-phenotypes", div: "ortholog-phenotype-table", filter: true};
    return expandTemplate('golr-table', ortho_pheno_table);
}

function addInteractionAnchor(info) {
    var interaction_anchor = {id: info.id,
                            resultNum: info.interactionNum,
                            type: "Interactions", href: "interactions"};
    return expandTemplate('anchor', interaction_anchor);
}

function addInteractionTable() {
    var interaction_table = {href: "interactions", div: "interaction-table", filter: false};
    return expandTemplate('golr-table', interaction_table);
}


/*
 * END GOLR REFACTOR
 */


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/labs/people-scratch', function(request, page){

    // Rendering.
    var info = newInfo();
    addCoreRenderers(info);

    // Now add the stuff that we need to move forward.
    info.pup_tent_css_libraries.push("/monarch-labs.css");
    info.pup_tent_css_libraries.push("/bbop.css");
    info.pup_tent_js_libraries.push("/bbop.js");
    info.pup_tent_js_libraries.push("/amigo2.js");
    info.pup_tent_js_libraries.push("/PeopleScratch.js");
    info.monarch_launchable.push("PeopleInit()");
    info.home_page = true;
    //
    info.title = 'People Tests in Monarch';
    var output = pup_tent.render('people-scratch.mustache', info,
                 'monarch_base.mustache');
    var res =  response.html(output);
    return res;
});
}


///
/// Routes for a demonstration of JBrowse in Monarch.
///

// Deliver content from directory mapped to path.
if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
app.get('/labs/jbrowse/*', function(request){

    // Extract path from request.
    var path = request.pathInfo;
    path = path.substr('/labs/jbrowse/'.length, path.length) || '';

    // Map path onto filesystem.
    //var fs_loc = './'; // root dir
    var fs_loc = './templates/labs/jbrowse/'; // root dir
    var mapped_path = fs_loc + path;

    // Return file/content.
    //var res =  response.html('<em>' + path + ': not found</em>'); // default err
    //def ctype = _decide_content_type(path)
    //var res =  response.html('<em>' + fs.Path(mapped_path).absolute()+ ': not found</em>'); // default err
    //if( env.fs_existsSync(path) ){
    //    res = _return_mapped_content(path);
    if( env.fs_existsSync(mapped_path) ){
        var res = _return_mapped_content(mapped_path);
        return res ;
    }
    else{
        var res =  response.html('<em>' + fs.Path(mapped_path).absolute()+ ': not found</em>'); // default err
        res.status =  404 ;
        return res ;
    }
});
}


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
// Deliver content from directory mapped to path.
app.get('/labs/jbrowse-demo', function(request){

    // Rendering variables.
    var info = newInfo();
    addCoreRenderers(info);
    info.title = 'Welcome to Monarch';

    // Final render.
    var output = pup_tent.render('jbrowse.mustache', info,
                 'blog-scratch-base.mustache');
    var res =  response.html(output);
    return res;
});
}


///
/// Error handling.
///



function nopFileHandler(request) {
    var page = request.path || request.pathInfo;
    console.log('nopFileHandler invoked with: ', page);
    return web.wrapHTML('<html><body><h1>Missing file: ' + page + '</h1></body></html>', 200);
}
// web.wrapRouteGet(app, '/underscore-min.map', '/underscore-min.map', [], nopFileHandler, errorResponse);
function cssBundleFileHandler(request) {
    var page = request.path || request.pathInfo;
    console.log('cssBundleFileHandler invoked with: ', page);
    return web.wrapBinary('/* Empty CSS file */', 'text/css');
}
// web.wrapRouteGet(app, '/app.bundle.css', '/app.bundle.css', [], cssBundleFileHandler, errorResponse);

// Add an error for all of the rest.
function notFoundHandler(request) {
    var page = request.path || request.pathInfo;
    return notFoundResponse('Page Not Found: ' + page);
}
web.wrapRouteGet(app, '/*', '/{other*}', [], notFoundHandler, errorResponse);




function analyzeByDatatypePostHandler(request, datatype, fmt) {
     console.log('analyzeByDatatypePostHandler', datatype, fmt, request);
     var info = newInfo();
     //Some hardcoded things for mustache
     info.hasInputItems = false;
     info.hasResults = false;
     info.hasTable = false;
     info.datatype = datatype;
     info.isFileError = false;
     info.limit = 100;

     /* Uploads are streamed to a tmp file using the custom upload function
      * above.  This function checks the content-length and prevents the
      * tmp file from being written for files over 50 mb.  Here we check
      * this again before writing the contents to memory and returning this
      * to the client.  With either check, if the file exceeds 50 mb we
      * set doesFileExceedMax to true which is utilized by mustache to
      * display the error to the user
      */

     var user_request;

     if (typeof request.params.file_exceeds != 'undefined'){
         info.doesFileExceedMax = true;
         info.isFileError = true;
     } else if (typeof request.params.upload_file != 'undefined'){
         var fileUpload = request.params.upload_file;
         // File hit hard size limit when writing but for some reason
         // wasn't caught in the content-length
         if (request.params.hit_limit){
             env.fs_unlinkSync(fileUpload.tempfile);
             info.doesFileExceedMax = true;
             info.isFileError = true;
         } else {
             user_request = env.fs_readFileSync(fileUpload.tempfile);
             env.fs_unlinkSync(fileUpload.tempfile);
             info.hasInputItems = true;
         }
     } else if (typeof request.params.user_results != 'undefined') {
         user_request = request.params.user_results;
         info.hasInputItems = true;
     }

     //Try parsing JSON, if this fails show error to user
     if (typeof user_request != 'undefined'){
         try {
             JSON.parse(user_request);
         } catch (err) {
             info.isFileError = true;
             info.isJSONIllegal = true;
             info.hasInputItems = false;
             info.jsonError = String(err).replace(/\(.*/,'');
             user_request = '';
         }
     }

     if (datatype ==='phenotypes') {
         info.isPhenotype='True';
     }

     addCoreRenderers(info, 'analyze', datatype);

     //Add pup_tent libs
     // info.pup_tent_css_libraries.push("/monarch-specific.css");
     info.pup_tent_css_libraries.push("/imagehover.css");

     info.pup_tent_js_libraries.push("/Analyze.js");
     addPhenogridFiles(info);
     var phenogridView = "default";
     addPhenogridViewToAnalyze(info, phenogridView);
     // info.pup_tent_js_libraries.push("/stupidtable.min.js");
     // info.pup_tent_js_libraries.push("/tables.js");
    info.monarch_launchable.push('InitTables()');

     info.title = 'Monarch Analysis';

     var output = pup_tent.render('analyze.mustache',info,'monarch_base.mustache');
     return web.wrapHTML(output);
}

function analyzeByDatatypeGetHandler(request, datatype, fmt) {
    var target = web.getParam(request, 'target');
    var species = web.getParam(request, 'target_species');
    var mode = web.getParam(request, 'mode');
    var input_items = web.getParam(request, 'input_items');
    var limit = web.getParam(request, 'limit');
    var user_results = web.getParam(request, 'user_results');
    //console.log('   target, species, mode, limit, user_results, input_items: ', target, species, mode, limit, user_results, input_items);

     var tf = {};

     // deprecated: it is no longer possible to get a 'target' param from
     // the analyze form. However, we support legacy URLs for query results.
     // (mostly for test purposes)
     if (target == "" || target == "All") {
         target = null;
     }
     else {
         engine.warn("Use of target as a parameter is deprecated");
         tf.target = target;
     }

     if (species == "" || species == "All" || typeof species === 'undefined') {
         species = null;
     }
     else {
         tf.species = species;
     }

     engine.log("analyze...datatype is ..."+datatype);
     engine.log("Target="+target); // deprecated
     engine.log("Species="+species);
     engine.log("ResultFilter="+JSON.stringify(tf));
     var info =
         {
             target_filter : tf,
             datatype: datatype,
             results:[]
         };
     var limit = 100;

     if (input_items != null) {
         engine.log("input_items ..."+JSON.stringify(input_items));
         var input_items = itemsToArray(input_items);
         var splitLabels;
         //Grabs labels for IDs
         for (var spn = 0; spn < input_items.length; spn++) {
             if (input_items[spn]){
                var phenoInfo = engine.fetchClassInfo(input_items[spn],{level:0})
                 if (phenoInfo.label) {
                     if (splitLabels){
                         splitLabels += "+"+phenoInfo.label;
                     }else{
                         splitLabels = phenoInfo.label;
                     }
                 }
             }
         }
         info.splitLabels = splitLabels;
         input_items = engine.mapIdentifiersToPhenotypes( input_items ).join().split(',');
         engine.log("input items...."+JSON.stringify(input_items));
         engine.log("# of input items..."+input_items.length);


         var resultObj = engine.searchByAttributeSet(input_items, tf, limit);
         info.results = resultObj.results;
         engine.log("ResultsInput: "+info.results.length);

         //info.input_items = resultObj.query_IRIs;
         info.input_items = input_items.join(" ");
         info.hasInputItems = true;

         info.target_species=species;
     } else if (user_results) {
         info.hasInputItems = true;
     } else {
         info.hasInputItems = false;
     }
     if (fmt != null) {
         return formattedResults(info,fmt,request);
     }
     info.limit = limit;

     info.singleSpecies = true;

     if (info.target_species === null || species === null || info.target_species == "") {
         info.singleSpecies = false;
     }

     if (info.singleSpecies) {
         info.speciesHref = genExternalHref('source', engine.mapSpeciesIdentifierToTaxon(info.target_species))
     }

     if ((mode == 'compare') || (user_results)){
         info.hasTable = false;
     } else {
         info.hasTable = true;
     }

     addCoreRenderers(info, 'analyze', datatype);

     //Add pup_tent libs
     // info.pup_tent_css_libraries.push("/monarch-specific.css");
     info.pup_tent_css_libraries.push("/imagehover.css");

     info.pup_tent_js_libraries.push("/Analyze.js");

     addPhenogridFiles(info);
     var phenogridView = "default";
     addPhenogridViewToAnalyze(info, phenogridView);

     // info.pup_tent_js_libraries.push("/stupidtable.min.js");
     // info.pup_tent_js_libraries.push("/tables.js");
    info.monarch_launchable.push('InitTables()');


     info.title = 'Monarch Analysis';

     info.results = info.results.filter( function(a) { return a.combinedScore > 0; } );
     info.resultsTable = function() {
         return genTableOfAnalysisSearchResults(info.results, info.singleSpecies);
     };

     if ((mode == 'compare') || (mode == 'search')
             || (user_results)){
         info.hasResults = true;
     } else {
         info.hasResults = false;
     }

     info.downloadURL = function() {
         var inputFix = info.input_items.trim();
         var str = "/analyze/" + datatype + ".json?input_items=" + inputFix.split(" ").join("+");
         if (str.indexOf(',')){
             str = str.replace(/,/g ,'+');
         }
         str += "&limit=" + info.limit + "&target_species=";
         if (info.target_species !== null) {
             str += info.target_species;
         }
         return str;
     };

     if (datatype ==='phenotypes') {
         info.isPhenotype='True';
     }

     var output = pup_tent.render('analyze.mustache',info,'monarch_base.mustache');
     return web.wrapHTML(output);
}

//web.wrapRoutePost(app, '/analyze/:datatype.:fmt?', '/analyze/{datatype}/', ['datatype', 'fmt'], analyzeByDatatypePostHandler, errorResponse);
web.wrapRouteGet(app, '/analyze/:datatype.:fmt', '/analyze/{datatype}.{fmt}', ['datatype', 'fmt'], analyzeByDatatypeGetHandler, errorResponse);
web.wrapRouteGet(app, '/analyze/:datatype/', '/analyze/{datatype}/', ['datatype'], analyzeByDatatypeGetHandler, errorResponse);
web.wrapRouteGet(app, '/analyze/:datatype', '/analyze/{datatype}', ['datatype'], analyzeByDatatypeGetHandler, errorResponse);


if (false) { /* Disabling all /legacy/xxx and /labs/xxx endpoints that aren't dual-mode */
 app.get('/labs/classenrichment', function(request) {
     var info = newInfo();
     addCoreRenderers(info);
     info.pup_tent_css_libraries.push("http://cdn.datatables.net/1.10.6/css/jquery.dataTables.css");
     info.pup_tent_js_libraries.push("http://cdn.datatables.net/1.10.6/js/jquery.dataTables.js");
     info.pup_tent_js_libraries.push("/class-enrichment.js");
     var output = pup_tent.render('class-enrichment-demo.mustache',info,'monarch_base.mustache');
     return response.html(output);
 });
}

 /**
  * Mostly copied from parseFileUpload from ringo/http
  * See note above in upload function, we update this to implement a limit when
  * streaming user uploaded data into temp files
  *
  *
  * Parses a multipart MIME input stream.
  * Parses a multipart MIME input stream.
  * @param {Object} request the JSGI request object
  * @param {Object} params the parameter object to parse into. If not defined
  *        a new object is created and returned.
  * @param {string} encoding optional encoding to apply to non-file parameters.
  *        Defaults to "UTF-8".
  * @param {function} streamFactory factory function to create streams for mime parts
  * @param {int} limit streaming to number of bytes
  * @returns {Object} the parsed parameter object
  */
 function parseFileUploadWithLimit (request, params, encoding, streamFactory, lim) {

     // used for multipart parsing
     var HYPHEN  = "-".charCodeAt(0);
     var CR = "\r".charCodeAt(0);
     var CRLF = new ByteString("\r\n", "ASCII");
     var EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

     params = params || {};
     encoding = encoding || "UTF-8";
     streamFactory = streamFactory || BufferFactory;
     var boundary = getMimeParameter(request.headers["content-type"], "boundary");
     if (!boundary) {
         return params;
     }
     boundary = new ByteArray("--" + boundary, "ASCII");
     var input = request.input;
     var buflen = 8192;
     var refillThreshold = 1024; // minimum fill to start parsing
     var buffer = new ByteArray(buflen); // input buffer
     var data;  // data object for current mime part properties
     var stream; // stream to write current mime part to
     var eof = false;
     // the central variables for managing the buffer:
     // current position and end of read bytes
     var position = 0, limit = 0;
     var bytesStreamed = 0;

     var refill = function(waitForMore) {
         if (position > 0) {
             // "compact" buffer
             if (position < limit) {
                 buffer.copy(position, limit, buffer, 0);
                 limit -= position;
                 position = 0;
             } else {
                 position = limit = 0;
             }
         }
         // read into buffer starting at limit
         var totalRead = 0;
         do {
             var read = input.readInto(buffer, limit, buffer.length);
             if (read > -1) {
                 totalRead += read;
                 limit += read;
             } else {
                 eof = true;
             }
         } while (waitForMore && !eof && limit < buffer.length);
         return totalRead;
     };

     refill();

     while (position < limit) {
         if (!data) {
             // refill buffer if we don't have enough fresh bytes
             if (!eof && limit - position < refillThreshold) {
                 refill(true);
             }
             var boundaryPos = buffer.indexOf(boundary, position, limit);
             if (boundaryPos < 0) {
                 throw new Error("boundary not found in multipart stream");
             }
             // move position past boundary to beginning of multipart headers
             position = boundaryPos + boundary.length + CRLF.length;
             if (buffer[position - 2] == HYPHEN && buffer[position - 1] == HYPHEN) {
                 // reached final boundary
                 break;
             }
             var b = buffer.indexOf(EMPTY_LINE, position, limit);
             if (b < 0) {
                 throw new Error("could not parse headers");
             }
             data = {};
             var headers = [];
             buffer.slice(position, b).split(CRLF).forEach(function(line) {
                 line = line.decodeToString(encoding);
                 // unfold multiline headers
                 if ((strings.startsWith(line, " ") || strings.startsWith(line, "\t")) && headers.length) {
                    var tmp = arrays.peek(headers);
                    tmp += line;
                 } else {
                     headers.push(line);
                 }
             });
             for (var headerkey in headers) {
                var header = headers[headerkey];
                if (strings.startsWith(header.toLowerCase(), "content-disposition:")) {
                  data.name = getMimeParameter(header, "name");
                  data.filename = getMimeParameter(header, "filename");
                } else if (strings.startsWith(header.toLowerCase(), "content-type:")) {
                  data.contentType = header.substring(13).trim();
                }
             }
             // move position after the empty line that separates headers from body
             position = b + EMPTY_LINE.length;
             // create stream for mime part
             stream = streamFactory(data, encoding);
         }
         boundaryPos = buffer.indexOf(boundary, position, limit);
         if (boundaryPos < 0) {
             // no terminating boundary found, slurp bytes and check for
             // partial boundary at buffer end which we know starts with "\r\n--"
             // but we just check for \r to keep it simple.
             var cr = buffer.indexOf(CR, Math.max(position, limit - boundary.length - 2), limit);
             var end =  (cr < 0) ? limit : cr;
             if (typeof lim != 'undefined' && bytesStreamed > lim){
                 params.hit_limit = true;
                 stream.close();
                 if (typeof data.value === "string") {
                     mergeParameter(params, data.name, data.value);
                 } else {
                     mergeParameter(params, data.name, data);
                 }
                 data = stream = null;
                 return params;
             } else {
                 stream.write(buffer, position, end);
                 bytesStreamed += end;
                 // stream.flush();
                 position = end;
             }
             if (!eof) {
                 refill();
             }
         } else {
             if (typeof lim != 'undefined' && bytesStreamed > lim){
                 params.hit_limit = true;
                 stream.close();
                 if (typeof data.value === "string") {
                     mergeParameter(params, data.name, data.value);
                 } else {
                     mergeParameter(params, data.name, data);
                 }
                 data = stream = null;
                 return params;
             }
             // found terminating boundary, complete data and merge into parameters
             stream.write(buffer, position, boundaryPos - 2);
             stream.close();
             position = boundaryPos;
             if (typeof data.value === "string") {
                 mergeParameter(params, data.name, data.value);
             } else {
                 mergeParameter(params, data.name, data);
             }
             data = stream = null;
         }
     }
     return params;
 }


function faviconHandler(request, fmt) {
    var path = './image/favicon.ico';
    return wrapContentOrError(path);
}

web.wrapRouteGet(app, '/favicon.ico', '/favicon.ico', [], faviconHandler, errorResponse);

function resolveByIdHandler(request, id, fmt) {

    var result;

    id = engine.convertIdToCurie(id);

    if (id.indexOf(':') === -1) {
        id = ':' + id;
    }

    var type = engine.resolveIdToType(id);
    if (type) {
        result = web.wrapRedirect(genURL(type, id));
    } else {
        // engine.log('Unable to resolve id: ' + id);
        result = notFoundResponse('Unable to resolve id: ' + id);
    }

    return result;
}

//
// Same as the above resolveByIdHandler(), but only continues if the converted ID
// looks like a CURIE. This is to avoid pinging SciGraph unnecessarily when a scraper
// or client error tries to GET a path like /foo, which isn't intended to be an ID.
//
// This handler also deals with files like 'apple-touch-icon' by returning the favicon.ico
// when requested. This is to avoid useless log messages in our server. See:
//  http://stackoverflow.com/questions/5110776/apple-touch-icon-for-websites/21144916#21144916
//
// For the /resolve/ID endpoint handler (above), we can assume the user knows what they are doing and
// can pass the purported ID through to SciGraph without checking. This will eventually
// let us handle any cases where we want to have non-CURIE strings resolved via the /resolve
// endpoint (although one could argue that would be a different endpoint).
//

function rootPathHandler(request, id, fmt) {
    var result;

    if (id.indexOf('apple-touch-icon') === 0) {
        result = faviconHandler(request, id);
    }
    else {
        id = engine.convertIdToCurie(id);

        if (id.indexOf(':') === -1) {
            id = ':' + id;
            //result = notFoundResponse('No such path: ' + id);
        }
        var type = engine.resolveIdToType(id);
        if (type) {
            result = web.wrapRedirect(genURL(type, id));
        }
        else {
            // engine.log('Unable to resolve id: ' + id);
            result = notFoundResponse('Unable to resolve id: ' + id);
        }
    }

    return result;
}


// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/resolve/:id.:fmt?', '/resolve/{id}.{fmt}', ['id', 'fmt'], resolveByIdHandler, errorResponse);
web.wrapRouteGet(app, '/resolve/:id', '/resolve/{id}', ['id'], resolveByIdHandler, errorResponse);

// Duplicate the above for /{id}
web.wrapRouteGet(app, '/:id.:fmt?', '/{id}.{fmt}', ['id', 'fmt'], rootPathHandler, errorResponse);
web.wrapRouteGet(app, '/:id', '/{id}', ['id'], rootPathHandler, errorResponse);

//Dowloads Section

function downloadByIdHandler(request, id, fmt) {
    id = engine.convertIdToCurie(id);
    //We could use this for associations
    //var type = engine.resolveIdToType(id);
    if (typeof fmt === 'undefined') {
        fmt = 'tsv'; //defaults to tsv
    }

    var fileName = id.replace(":", "_") + '_all_associations.' + fmt;
    var url = engine.getGolrDownloadUrl(id, fmt);

    if (!url) {
        return notFoundResponse("Cannot find "+id);
    } else {
        var exchangeObject = engine.fetchUrlWithExchangeObject(url);
        if (fmt == 'json') {
            var response = new bbop.golr.response(JSON.parse(exchangeObject.content));
            return web.wrapFile(response.documents(), fileName);
        } else {

            return web.wrapFile(exchangeObject.content, fileName);
        }
    }
}

web.wrapRouteGet(app, '/downloads/:id.:fmt?', '/downloads/{id}.{fmt}', ['id', 'fmt'], downloadByIdHandler, errorResponse);

function downloadAssociationByIdHandler(request, id, category, fmt) {
    id = engine.convertIdToCurie(id);

    if (typeof fmt === 'undefined') {
        fmt = 'tsv'; //defaults to tsv
    }

    var fileName = id.replace(":", "_") + '_' + category + '_associations.' + fmt;
    var url = engine.getGolrDownloadUrl(id, fmt, category);

    if (!url) {
        return notFoundResponse("Cannot find "+id);
    } else {
        var exchangeObject = engine.fetchUrlWithExchangeObject(url);
        if (fmt == 'json') {
            var response = new bbop.golr.response(JSON.parse(exchangeObject.content));
            return web.wrapFile(response.documents(), fileName);
        } else {

            return web.wrapFile(exchangeObject.content, fileName);
        }
    }
}

web.wrapRouteGet(app, '/downloads/:id/association/:category.:fmt?',
        '/downloads/{id}/association/{category}.{fmt}', ['id', 'category', 'fmt'], downloadAssociationByIdHandler, errorResponse);


app.configServer = function(defaultConfig, golrConfig) {
    this.defaultConfig = defaultConfig;
    this.golrConfig = golrConfig;

    if (env.isRingoJS()) {
        module.singleton("monarchConfig",
            function() {
                return {
                        defaultConfig: defaultConfig,
                        golrConfig: golrConfig
                    };
                });
    }
};

app.startServer = function() {
    if (env.isRingoJS()) {
        var config = module.singleton("monarchConfig");
        this.defaultConfig = config.defaultConfig;
        this.golrConfig = config.golrConfig;
    }
    engine = buildEngine(this.defaultConfig, this.golrConfig);
    if (env.isRingoJS()) {
        // INITIALIZATION
        // Can set port from command line. E.g. --port 8080
        // console.log('require.main.id:', Object.keys(require.main), require.main.id, ' module.id:', Object.keys(module), module.id);
        if (!global.ringoServerInitialized) {
            global.ringoServerInitialized = true;
            var server = require('ringo/httpserver').main('web/stickloader');
            var connectors = server.getJetty().getConnectors();
            var c1 = connectors[0];
            console.log('RingoJS Server running at:', c1.getHost(), ':', c1.getPort());
            fs.writeFile('./serverStarted.dat', (new Date()).toLocaleString());
        }
    }
    else {
        var that = this;
        this.app.start(function () {
            console.log('HapiJS Server running at:', that.app.info.uri);
            fs.writeFileSync('./serverStarted.dat', (new Date()).toLocaleString());
        });
    }
};

exports.app = app;
exports.configServer = app.configServer;
exports.startServer = app.startServer;
