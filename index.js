#!/usr/bin/env node
'use strict';

var fs = require('fs');
var nuxeo = require('nuxeo');

function main() {
  var ArgumentParser = require('argparse').ArgumentParser;
  var parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'nuxeo command line helper',
  });

  var subparsers = parser.addSubparsers({
    title:'subcommands',
    dest:"subcommand_name"
  });

  var up = subparsers.addParser('up', {
    addHelp: true,
    help: 'upload files to nuxeo'
  });

  up.addArgument( [ '-f', '--force' ], {
    action: 'storeTrue',
    help: 're-upload even if file is already on nuxeo (otherwise skip)'
  });

  up.addArgument( [ 'source_file' ], { nargs: '+' });
  up.addArgument( [ 'dest_file' ], { nargs: '1' });

  var args = parser.parseArgs();

  if (args.subcommand_name === 'up') {
    var dest = args.dest_file[0];
    // does `dest` exist on nuxeo?
    // is `dest` Folderish in nuxeo?
    var uploads = args.source_file.map(function(source){
      // check if source is a file, or a directory
      if (fs.lstatSync(source).isDirectory()) {
        console.warn(source + ' is a directory, skipping');
      } else {
        return([source, dest]);
      }
    });
    console.dir(uploads);
   }
}

if (require.main === module) {
  main();
}

/* Copyright © 2015, Regents of the University of California

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

 * Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in
   the documentation and/or other materials provided with the
   distribution.
 * Neither the name of the University of California nor the names
   of its contributors may be used to endorse or promote products
   derived from this software without specific prior written
   permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

*/
