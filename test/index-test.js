'use strict';

require( 'should' );

describe( 'index.js test', function () {

	describe( 'with correct config object', function () {

		var indexFile;
		var config = {
			'server' : {
				'host' : 'http://localhost',
				'port' : 4000
			},

			// This are custom headers
			'headers' : {
				'Content-Type'    : 'application/json; charset=utf-8',
				'X-Engine-Id'     : 'xxxx-xxxx-xxxx-xxxx',
				'X-Engine-Secret' : 'XXXX-XXXX-XXXXXXXXXX-XXXX-XXXX'
			},
			// Target folder
			'targetFolder' : '/benchmark/**/*.js'
		};

		before( function () {
			indexFile = require( '../lib/index' )( config );
		} );

		it( 'should return correct properties', function () {
			indexFile.should.have.property( 'exec' );
			( typeof indexFile.exec ).should.be.equal( 'function' );
		} );
	} );
} );
