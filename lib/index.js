'use strict';

const Benchmarker = require( './benchmarker' );

module.exports = function ( config ) {
	const benchmarker = new Benchmarker( config );

	return {
		'exec' : benchmarker.exec.bind( benchmarker )
	};
};
