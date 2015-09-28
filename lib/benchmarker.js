'use strict';

var exec = require( 'child_process' ).exec;
var glob = require( 'glob' );
var path = require( 'path' );

// plug-ins for table and styling table
var color   = require( 'colors' );
var Table   = require( 'cli-table' );
var async   = require( 'async' );
var fs      = require( 'fs' );
var Promise = require( 'bluebird' );

function Benchmark ( config ) {

	this.config = config;

	this.data = [];

	this.table = new Table( {

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

		'style' : {
			'head' : [ 'white' ]
		}

	} );

	this.host = [ config.server.host, config.server.port ].join( ':' );

	// path to the LUA file that is going to be reused on every 'wrk' execution
	this.reqPath = path.join( __dirname, './request.lua' );

	// path for the request LUA template
	this.reqTpl = path.join( __dirname, './requestTpl.txt' );

	// overall status of the benchmark
	this.benchmarkObj         = {};
	this.benchmarkObj.status  = 'Success';
	this.benchmarkObj.message = '. Reached the required request/sec threshold';

	// path to the wrk bin
	this.wrk = path.join( __dirname, '../src/wrk' );
}

Benchmark.prototype.exec = function ( cb ) {
	var self = this;

	async.waterfall( [
		function ( callback ) {
			if ( self.config.getAuth && ( typeof self.config.getAuth === 'function' )  ) {
				self.config.getAuth( function () {
					callback( null, 'done' );
				} );
			} else {
				callback( null, 'done' );
			}
		} ],
		function ( err ) {
			if ( err ) {
				cb( err, null );
			} else {
				self.execBenchmark( function ( error ) {
					if ( cb && ( typeof cb ) === 'function' ) {
						cb( error, self.data );
					}
				} );
			}
		} );
};

// cycle through the directory to get the js files
Benchmark.prototype.getFiles = function ( dir ) {

	return new Promise( function ( resolve, reject ) {
		glob( process.cwd() + dir, function ( err, files ) {
			if ( err ) {
				reject( 'Error in reading the file' );
			}
			resolve( files );
		} );
	} );
};

// replace the variables in the lua template with the data obtained form request info file
Benchmark.prototype.replaceAttr = function ( strReq, reqData ) {
	var headerArr = [];
	var content;
	for ( var keys in reqData.headers ) {
		if ( reqData.headers.hasOwnProperty( keys ) ) {
			headerArr.push( 'wrk.headers["' + keys + '"] = "' + reqData.headers[ keys ] + '"' );
		}
	}
	// replace template with the correct obj key value
	content = strReq.replace( '[@path]', '"' + reqData.request.path + '"' )
					.replace( '[@requestHeaders]', headerArr.join( '\n' ) )
					.replace( '[@body]', reqData.body )
					.replace( '[@method]', '"' + reqData.request.method + '"' );
	/* eslint new-cap:0 */
	return new Promise.resolve( content );
};

 // read files obtained from getFiles fn
Benchmark.prototype.readFiles = function ( reqOptions ) {
	var self = this;
	return new Promise( function ( resolve, reject ) {

		fs.readFile( self.reqTpl, 'utf8', function ( err, tplStr ) {

			if ( err ) {
				reject( 'Error in reading the file' );
			}

			var req = {};
			req.headers = {};
			req.request = reqOptions.request;

			if ( Object.keys( reqOptions.customHeaders ).length ) {
				req.headers = reqOptions.customHeaders;
			} else {
				req.headers = self.config.headers;
			}

			if ( reqOptions.request.body ) {
				req.body = JSON.stringify( reqOptions.request.body ).replace( /"/g, '\\"' );
			} else {
				req.body = '';
			}

			var obj    = {};
			obj.tplStr = tplStr;
			obj.req    = req;

			resolve( obj );
		} );

	} );
};

// write the final content to request.lua
Benchmark.prototype.writeFile = function ( newContent ) {
	var self = this;
	// delete the reusable file each time there is a new content written to it.
	return new Promise( function ( resolve, reject ) {
		fs.writeFile( self.reqPath, newContent, function ( err ) {
			if ( err ) {
				reject( 'error in Writing file : ' + err );
			}
			// execute the wrk with each options as arguments
			resolve();
		} );
	} );

};

// executes the wrk
Benchmark.prototype.execWrk = function ( reqOptions ) {

	var wrkCmd = this.wrk + ' -t ' + reqOptions.options.threads + ' -c ' + reqOptions.options.connections + ' -d ' + reqOptions.options.duration + ' -s ' + this.reqPath + ' ' + this.host;

	return new Promise( function ( resolve, reject ) {

		exec( wrkCmd, function ( err, stdout, stderr ) {

			if ( err ) {
				reject( err );
			}

			if ( stderr ) {
				reject( err );
			}

			resolve( stdout );
		} );

	} );
};

// parses the result string returned from stdout of wrk
Benchmark.prototype.parseResult = function ( reqOptions, fileDir, stdout ) {

	var arrElem = [];
	// splits the data returned by the request
	var dataStr   = stdout.split( '\n' ).filter( Boolean );
	var dataStats = {};
	// .filter( Boolean ) removes empty string elements form the array
	var threadStats =  dataStr[ 3 ].trim().split( ' ' ).filter( Boolean );

	// assign values to the final presentation object
	dataStats.api          = reqOptions.request.path;
	dataStats.specs        = dataStr[ 1 ].trim();
	dataStats.latency      = threadStats[ 1 ];
	dataStats.reqRate      = dataStr[ 6 ].split( ':' ).pop().trim();
	dataStats.transferRate = dataStr[ 7 ].split( ':' ).pop().trim();
	dataStats.status       = color.green( 'Success' );
	dataStats.statIcon     = color.green( '✓' );

	if ( dataStr.length > 8 ) {
		dataStats.status          = color.red( 'Failed' );
		this.benchmarkObj.status  = 'Failed';
		this.benchmarkObj.message = '. There are requests that did not respond to a 2xx or 3xx status';
		dataStats.statIcon        = color.red( '✗' );
		dataStats.reqRate         = dataStr[ 7 ].split( ':' ).pop().trim();
		dataStats.transferRate    = dataStr[ 8 ].split( ':' ).pop().trim();
	}

	if ( parseFloat( dataStats.reqRate ) < reqOptions.threshold.reqRate.min ) {
		dataStats.status   = color.red( 'Failed' );
		this.benchmarkObj.status   = 'Failed';
		dataStats.statIcon = color.red( '✗' );
		this.benchmarkObj.message  = '. Should reach the request/sec minimum requirements';
	}

	arrElem = [ dataStats.api, reqOptions.request.method, dataStats.specs, dataStats.latency, dataStats.transferRate, dataStats.reqRate, reqOptions.threshold.reqRate.min, dataStats.status ];
	// insert the results to the table
	this.table.push( arrElem );

	this.data.push( {
		'Path'         : dataStats.api,
		'Method'       : reqOptions.request.method,
		'Specs'        : dataStats.specs,
		'Latency'      : dataStats.latency,
		'Transfer/sec' : dataStats.transferRate,
		'Req/sec'      : dataStats.reqRate,
		'Threshold'    : reqOptions.threshold.reqRate.min,
		'Status'       : dataStats.status
	} );

	console.log( '\t' + dataStats.statIcon + ' ' + fileDir.split( '/' ).pop() );

	/* eslint new-cap:0 */
	return new Promise.resolve();

};

// prints out the table
Benchmark.prototype.showTable = function ( fileLen, callback ) {
	// show the result table
	console.log( this.table.toString() );
	var error;
	if ( this.benchmarkObj.status === 'Failed' ) {
		console.log( color.red( this.benchmarkObj.status ) + this.benchmarkObj.message );
		error = new Error( this.benchmarkObj.message );
	} else {
		console.log( color.green( this.benchmarkObj.status ) + this.benchmarkObj.message );
	}

	if ( callback ) {
		callback( error );
	}

};

// plugin to get files with specific pattern or extension
Benchmark.prototype.execBenchmark = function ( cb ) {
	var fileLen;
	var self = this;

	this.getFiles( this.config.targetFolder )
		.then( function ( files ) {
			fileLen = files.length;
			async.eachSeries( files, function ( fileDir, callback ) {
				var reqOptions = require( fileDir );
				self.readFiles( reqOptions )
					.then( function ( obj ) {
						return self.replaceAttr( obj.tplStr, obj.req );
					} )
					.then( function ( newContent ) {
						return self.writeFile( newContent );
					}  )
					.then( function () {
						return self.execWrk( reqOptions );
					} )
					.then( function ( stdout ) {
						return self.parseResult( reqOptions, fileDir, stdout );
					} )
					.then( function () {
						callback( null );
					} )
					.catch( function ( err ) {
						throw err;
					} );
			}, function ( err ) {
				if ( err ) {
					throw err;
				}

				self.showTable( fileLen, function ( error ) {
					if ( cb && ( typeof cb ) === 'function' ) {
						cb( error );
					}
				} );
			} );
		} );
};

module.exports = Benchmark;
