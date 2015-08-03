'use strict';

var exec = require( 'child_process' ).exec;
var glob = require( 'glob' );
var path = require( 'path' );

// plug-ins for table and styling table
var color = require( 'colors' );
var Table = require( 'cli-table' );
var async = require( 'async' );
var fs    = require( 'fs' );

module.exports = function ( config ) {

	// instantiate and style table
	var table = new Table( {

		'head' : [ 'Path', 'Method', 'Specs', 'Latency', 'Transfer/sec', 'Req/sec', 'Threshold', 'Status' ],

		'colWidths' : [ 50, 10, 35, 15, 15, 15, 13, 18 ],

		'chars' : {
			'top'          : '═',
			'top-mid'      : '╤',
			'top-left'     : '╔',
			'top-right'    : '╗',
			'bottom'       : '═',
			'bottom-mid'   : '╧',
			'bottom-left'  : '╚',
			'bottom-right' : '╝',
			'left'         : '║',
			'left-mid'     : '╟',
			'mid'          : '─',
			'mid-mid'      : '┼',
			'right'        : '║',
			'right-mid'    : '╢',
			'middle'       : '│'
		},

		'style' : { 'head' : [ 'white' ] }

	} );

	// plugin to get files with specific pattern or extension
	function parseExec () {

		var host = [ config.server.host, config.server.port ].join( ':' );

		// path to the LUA file that is going to be reused on every 'wrk' execution
		var reqPath = path.join( __dirname, './request.lua' );

		// path for the request LUA template
		var reqTpl = path.join( __dirname, './requestTpl.txt' );

		// variable flag to indicate the last req has completed
		var fileLen;
		var reqFlag = 0;

		// overall status of the benchmark
		var benchmark     = {};
		benchmark.status  = 'Success';
		benchmark.message = '. Reached the required request/sec threshold';

		// path to the wrk bin
		var wrk = path.join( __dirname, '../src/wrk' );

		glob( process.cwd() + config.targetFolder, function ( globError, files ) {

			if ( globError ) {
				throw 'Error in reading the file';
			}

			fileLen = files.length;

			files.forEach( function ( fileDir ) {

				var luaOpt = require( fileDir );

				fs.readFile( reqTpl, 'utf8', function ( readError, data ) {

					if ( readError ) {
						throw 'Error in reading the file';
					}

					var headers           = {};
					headers.contentType   = luaOpt.customHeaders.contentType || config.headers.contentType;
					headers.engineSecret  = luaOpt.customHeaders.engineSecret || config.headers.engineSecret;
					headers.engineId      = luaOpt.customHeaders.engineId || config.headers.engineId;
					headers.authorization = luaOpt.customHeaders.authorization || config.headers.authorization;

					// replace template with the correct obj key value
					var newContent = data.replace( '[@path]', '"' + luaOpt.request.path + '"' )
										.replace( '[@contentType]', '"' + headers.contentType + '"' )
										.replace( '[@engineId]', '"' + headers.engineId + '"' )
										.replace( '[@engineSecret]', '"' + headers.engineSecret + '"' )
										.replace( '[@authorization]', '"' + config.headers.authorization + '"' )
										.replace( '[@body]', '"' + luaOpt.request.body + '"' )
										.replace( '[@method]', '"' + luaOpt.request.method + '"' );
					// delete the reusable file each time there is a new content written to it.
					fs.writeFile( reqPath, newContent, function ( writeError ) {
						if ( writeError ) {
							throw 'error in Writing file : ' + writeError;
						}
						// execute the wrk with each options as arguments
						var wrkCmd = wrk + ' -t ' + luaOpt.options.threads + ' -c ' + luaOpt.options.connections + ' -d ' + luaOpt.options.duration + ' -s ' + reqPath + ' ' + host;

						exec( wrkCmd, function ( err, stdout, stderr ) {

							if ( err ) {
								throw err;
							}

							if ( stderr ) {
								throw stderr;
							}

							var arrElem = [];
							// splits the data returned by the request
							var dataStr   = stdout.split( '\n' ).filter( Boolean );
							var dataStats = {};
							// .filter( Boolean ) removes empty string elements form the array
							var threadStats =  dataStr[ 3 ].trim().split( ' ' ).filter( Boolean );

							// assign values to the final presentation object
							dataStats.api          = luaOpt.request.path;
							dataStats.specs        = dataStr[ 1 ].trim();
							dataStats.latency      = threadStats[ 1 ];
							dataStats.reqRate      = dataStr[ 6 ].split( ':' ).pop().trim();
							dataStats.transferRate = dataStr[ 7 ].split( ':' ).pop().trim();
							dataStats.status       = color.green( 'Success' );
							dataStats.statIcon     = color.green( '✓' );

							if ( dataStr.length > 8 ) {
								dataStats.status       = color.red( 'Failed' );
								benchmark.status       = 'Failed';
								benchmark.message      = '. There are requests that did not respond to a 2xx or 3xx status';
								dataStats.statIcon     = color.red( '✗' );
								dataStats.reqRate      = dataStr[ 7 ].split( ':' ).pop().trim();
								dataStats.transferRate = dataStr[ 8 ].split( ':' ).pop().trim();
							}

							if ( parseFloat( dataStats.reqRate ) < luaOpt.threshold.reqRate.min ) {
								dataStats.status   = color.red( 'Failed' );
								benchmark.status   = 'Failed';
								dataStats.statIcon = color.red( '✗' );
								benchmark.message  = '. Should reach the request/sec minimum requirements';
							}

							// increment the flag each time a wrk process is finished
							reqFlag++;
							arrElem = [ dataStats.api, luaOpt.request.method, dataStats.specs, dataStats.latency, dataStats.transferRate, dataStats.reqRate, luaOpt.threshold.reqRate.min, dataStats.status ];
							// insert the results to the table
							table.push( arrElem );

							console.log( '\t' + dataStats.statIcon + ' ' + fileDir.split( '/' ).pop() );
							if ( reqFlag === fileLen ) {
								// show the result table
								console.log( table.toString() );
								if ( benchmark.status === 'Failed' ) {
									console.log( color.red( benchmark.status ) + benchmark.message );
									process.exit( 1 );
								} else {
									console.log( color.green( benchmark.status ) + benchmark.message );
								}
							}

						} );

					} );

				} );

			} );

		} );

	}

	return {

		'exec' : function () {

			async.waterfall( [
				function ( callback ) {
					if ( config.getAuth && ( typeof config.getAuth === 'function' )  ) {
						config.getAuth( function ( data ) {
							callback( null, 'done' );
						} );
					} else {
						callback( null, 'done' );
					}
				} ],
				function ( err, result ) {
					parseExec();
				} );
		}

	};

};
