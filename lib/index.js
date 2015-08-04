'use strict';

var Benchmarker = require( './benchmarker' );

module.exports = function ( config ) {
	var benchmarker = new Benchmarker( config );

	return {
		'exec'   : benchmarker.exec.bind( benchmarker )
	};

};
