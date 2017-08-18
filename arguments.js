'use strict';
const packageJson = require('./package.json');

/* nx nuxeo command line
 * ---- command line argument parsing
 *  uses https://www.npmjs.com/package/argparse , a clone of python argparse
 *  return a dictionary/associative array of command line options
 */

exports.getArgs = function getArgs() {
  const ArgumentParser = require('argparse').ArgumentParser;
  const parser = new ArgumentParser({
    addHelp: true,
    description: packageJson.description,
    version: packageJson.version
  });

  // --config for rc files
  parser.addArgument( ['--config'], {
    action: 'store', addHelp: true,
    help: 'json or ini format rc file'
  });

  // --loglevel for winston level
  parser.addArgument( ['--loglevel'], {
    action: 'store', addHelp: true,
    help: 'log level'
  });

  const subparsers = parser.addSubparsers({
    title: 'subcommands',
    dest: 'subcommand_name'
  });

  // nx upfile 
  const upfile = subparsers.addParser('upfile', {
    addHelp: true,
    help: 'upload files to nuxeo'
  });
  upfile.addArgument( [ 'source_file' ], { nargs: '1' });
  const updest = upfile.addMutuallyExclusiveGroup('upDest', {
    addHelp: true,
    help: 'destination on nuxeo'
  });
  updest.addArgument([ '-dir', '--upload_folder' ], { action: 'store' });
  updest.addArgument([ '-doc', '--upload_document' ], { action: 'store' });
  upfile.addArgument( [ '-f', '--force' ], {
    action: 'storeTrue',
    help: 're-upload even if file is already on nuxeo (otherwise skip)'
  });

  // nx mkdoc
  const mkdoc = subparsers.addParser('mkdoc', {
    addHelp: true,
    help: 'create a (Folderish) Document in Nuxeo'
  });
  mkdoc.addArgument([ 'path' ], {
    nargs: '1',
    help: 'path to new document on nuxeo'
  });
  mkdoc.addArgument(['-t', '--type'], {
    action: 'store',
    defaultValue: 'Folder',
    help: 'Nuxeo Document Type (default: Folder)'
  });
  mkdoc.addArgument( [ '-f', '--force' ], {
    action: 'storeTrue',
    help: 'create document even if it already exists (otherwise skip)'
  });
  mkdoc.addArgument( [ '-p', '--parents' ], {
    action: 'storeTrue',
    help: 'create intermediate directories'
  });

  // nx updir

  // nx ls
  const ls = subparsers.addParser('ls', {
    addHelp: true,
    help: 'list remote path'
  });
  ls.addArgument([ 'path' ], {
    nargs: '1',
    help: 'path to list'
  });

  // nx q
  const q = subparsers.addParser(['q'], {
    addHelp: true,
    help: 'nxql query'
  });
  q.addArgument([ 'query' ], {
    nargs: '1',
    help: 'nxql query'
  });

  // nx extrafile
  const extrafile = subparsers.addParser(['extrafile'], {
    addHelp: true,
    help: 'upload extra files to `files:files`'
  });
  extrafile.addArgument( [ 'source_file' ], { nargs: '1' });
  extrafile.addArgument( [ 'destination_document' ], {
    nargs: '1',
    help: 'existing document with `files:files`'
  });

  // nx mv
  const mv = subparsers.addParser(['mvdoc'], {
    addHelp: true,
    help: 'move destination is Folderish document'
  });
  mv.addArgument( [ 'source_document' ], { nargs: '1' });
  mv.addArgument( [ 'destination_document' ], { nargs: '1' });

  const args = parser.parseArgs();

  // extra validation
  // argparse can check for a required mutually exclusive group
  if (args.subcommand_name === 'upfile' && !args.upload_document && !args.upload_folder) {
    console.log(args);
    console.log('error: nx upfile: either -dir/--upload_folder or -doc/--upload_document is required');
    process.exit(1);
  }
  return args;

};

/* Copyright © 2016, Regents of the University of California

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
