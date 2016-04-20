# wrk-node-benchmarking
Wrk node.js http benchmarking tool. A framework wrapper for wrk benchmarking. Instead if globally running it. This will be implemented in gulp task runners.

## Run
```
./node_modules/.bin/wrk <options> <url>
```

## Usage
```javascript
'use strict';
const wrkNode = require( 'wrk-node' );
const config = {
  // This required
    'server' : {
        'host' : process.env.TEST_HOST || 'http://localhost',
        'port' : process.env.TEST_PORT || 4000
    },

    // This are custom headers
    'headers' : {
        'contentType'   : 'application/json; charset=utf-8',
        'engineId'      : process.env.TEST_ENGINE_ID || 'xxxxxxxxxxxxxxxxxxxx',
        'engineSecret'  : process.env.TEST_ENGINE_SECRET || 'xxxxxxxxxxxxxxxxx',
    },

    // Target folder contains folders to be benchmarked
    'targetFolder' : '/benchmark/**/*.js',

    'getAuth' : function ( done ) {
      // add session token then call done();
    }
};

wrkNode( config ).exec( function () {
  console.log( 'Done benchmarking' );
} );
```

## Benchmark .js file configurations
```javascript
'use strict';

module.exports = {
    'request' : {
        'path'   : '/api/v1/legacy/states',
        'method' : 'GET'
    },

    'customHeaders' : {},

    'options' : {
        'duration' : '10s',
        'threads' : 3,
        'connections' : 10
    },

    'threshold' : {
        'reqRate' : {
            'min' : 20
        }
    }
};
```

## Update version
Currently this repo uses 4.0.0. This command updates your own version of wrk.
```
make install VERSION=<wrk-version>
```

## Clean up
```
make clean
```
