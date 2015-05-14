'use strict';


exports.parser = function argparse() {
  var ArgumentParser = require('argparse').ArgumentParser;
  var parser = new ArgumentParser({
    version: '0.1.0',
    addHelp: true,
    description: 'nuxeo command line helper',
  });

  // --config for rc files
  parser.addArgument( ['--config'], {
    action: 'store', addHelp: true,
    help: 'json or ini format rc file'
  });

  var subparsers = parser.addSubparsers({
    title:'subcommands',
    dest:"subcommand_name"
  });

  // nx upfile 
  var up = subparsers.addParser('upfile', {
    addHelp: true,
    help: 'upload files to nuxeo'
  });
  up.addArgument( [ 'source_file' ], { nargs: '1' });
  var up_dest = up.addMutuallyExclusiveGroup('upDest', {
    addHelp: true,
    help: 'destination on nuxeo'
  });
  up_dest.addArgument([ '-dir', '--upload_folder' ], { action: 'store' });
  up_dest.addArgument([ '-doc', '--upload_document' ], { action: 'store' });

  up.addArgument( [ '-f', '--force' ], {
    action: 'storeTrue',
    help: 're-upload even if file is already on nuxeo (otherwise skip)'
  });

  return parser;

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
