'use strict';

require( 'should' );

describe( 'benchark class', function () {

	describe( 'properties', function () {
		var bm;
		var Benchmark;
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
			'targetFolder' : '/test/data/**/*.js'
		};

		before( function ( done ) {
			Benchmark = require( '../lib/benchmarker' );
			bm = new Benchmark( config );
			done();
		} );

		it( 'should have correct attributes', function () {
			// code
			bm.should.have.property( 'config' );
			( typeof bm.config ).should.equal( 'object' );
			bm.should.have.property( 'table' );
			( typeof bm.table ).should.equal( 'object' );
			bm.should.have.property( 'host' );
			( typeof bm.host ).should.equal( 'string' );
			bm.should.have.property( 'reqPath' );
			( typeof bm.reqPath ).should.equal( 'string' );
			bm.should.have.property( 'reqTpl' );
			( typeof bm.reqTpl ).should.equal( 'string' );
			bm.should.have.property( 'benchmarkObj' );
			( typeof bm.benchmarkObj ).should.equal( 'object' );
			bm.should.have.property( 'wrk' );
			( typeof bm.wrk ).should.equal( 'string' );
		} );

		it( 'should have correct methods', function () {
			// code
			bm.should.have.property( 'exec' );
			( typeof bm.exec ).should.equal( 'function' );
			bm.should.have.property( 'getFiles' );
			( typeof bm.getFiles ).should.equal( 'function' );
			bm.should.have.property( 'replaceAttr' );
			( typeof bm.replaceAttr ).should.equal( 'function' );
			bm.should.have.property( 'readFiles' );
			( typeof bm.readFiles ).should.equal( 'function' );
			bm.should.have.property( 'writeFile' );
			( typeof bm.writeFile ).should.equal( 'function' );
			bm.should.have.property( 'execWrk' );
			( typeof bm.execWrk ).should.equal( 'function' );
			bm.should.have.property( 'showTable' );
			( typeof bm.showTable ).should.equal( 'function' );
			bm.should.have.property( 'execBenchmark' );
			( typeof bm.execBenchmark ).should.equal( 'function' );
		} );
	} );
} );
