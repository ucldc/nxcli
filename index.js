#!/usr/bin/env node
'use strict';
const fs = require('fs');
const Nuxeo = require('nuxeo');
const path = require('path');
const ini = require('ini');
const osHomedir = require('os-homedir');
const winston = require('winston');
const nx = require('./nx.js');
const mime = require('mime');

function filenameToNuxeoBlob(filename) {
  const content = fs.createReadStream(filename);
  const size = fs.statSync(filename).size;
  const name = path.basename(content.path);
  const mimeType = mime.lookup(filename);   // <-- does not use file magic

  return new Nuxeo.Blob({
    name: name,
    content: content,
    size: size,
    mimeType: mimeType
  });

}

/**
 * Main function called by command line
 */
function main() {
  // parse subcommand and command line arguments
  const args = require('./arguments.js').getArgs();

  // set up logging
  winston.level = args.loglevel ? args.loglevel.toLowerCase() : 'error';

  // set up nuxeo client (with nxrc file, if present)
  const config_file = args.config || osHomedir() + '/.pynuxrc';
  const config_parsed = ini.parse(fs.readFileSync(config_file, 'utf-8'));
  const client_conf = config_parsed.rest_api;
  const auth_method = config_parsed.nuxeo_account.method || 'basic';
  // support either auth method
  if (auth_method === 'basic') {
    client_conf.auth = {
      method: 'basic',
      username: config_parsed.nuxeo_account.user,
      password: config_parsed.nuxeo_account.password,
    };
  } else if (auth_method === 'token') {
    client_conf.auth = {
      method: 'token',
      token: config_parsed.nuxeo_account['X-Authentication-Token'],
    };
    client_conf.headers = {
      timeout: 6995000
    };
  } else {
    throw new Error('invalid auth specified in conf');
  }
  winston.debug(config_parsed);
  const client = new Nuxeo(client_conf, args);

  /** upfile - upload file to document or folder */
  if (args.subcommand_name === 'upfile') {
    const source = args.source_file[0];
    const file = filenameToNuxeoBlob(source);

    // uploading to a folder
    if (args.upload_folder) {
      nx.uploadFileToFolder(client, args, source, file);
    }
    // uploading to specific document name
    else if(args.upload_document) {
      nx.uploadFileToFile(client, args, source, file);
    }
  }

  /** extrafile **/
  else if (args.subcommand_name === 'extrafile') {
    const esource = args.source_file[0];
    const efile = filenameToNuxeoBlob(esource);
    nx.uploadExtraFiles(client, args, esource, efile);
  }

  /** mkdoc - create document  */
  else if (args.subcommand_name === 'mkdoc') {
    if (args.parents) {
      nx.makeParents(client, args.path[0], args.type, args.force);
    } else {
      nx.makeDocument(client, args.path[0], args.type, args.force).then(function(res) {
        console.log(res);
      }).catch(function(error) {
        console.log(error, args.path[0]);
      });
    }
  }

  /** ls - list nuxeo path  */
  else if (args.subcommand_name === 'ls') {
    nx.lsPath(client, args.path[0]);
  }

  /** q - nxql query  */
  else if (args.subcommand_name === 'q') {
    nx.nxql(client, args.query[0]);
  }

  /** mv - move nuxeo document */
  else if (args.subcommand_name === 'mvdoc') {
    nx.mv_to_folder(client, args.source_document[0], args.destination_document[0]);
  }

  // should not be possible
  else {
    throw new Error(args.subcommand_name + ' not implimented'); 
  }
}

/**  copy python's main idiom for command line programs */
if (require.main === module) { main(); }

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
