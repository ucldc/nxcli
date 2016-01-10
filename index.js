#!/usr/bin/env node
'use strict';
var fs = require('fs');
var rest = require('nuxeo/node_modules/restler');
var nuxeo = require('nuxeo');
var path = require('path');
var http = require('http');
var url = require('url');
var ini = require('ini');
var osHomedir = require('os-homedir');
var winston = require('winston');
var _ = require('lodash');
var Promise = require('bluebird');

/**
 * Main function called by command line
 */
function main() {
  // parse subcommand and command line arguments
  var args = require('./arguments.js').getArgs();

  // set up logging
  winston.level = args.loglevel ? args.loglevel.toLowerCase() : 'error';

  // set up nuxeo client (with nxrc file, if present)
  var config_file = args.config || osHomedir() + '/.pynuxrc';
  var config_parsed = ini.parse(fs.readFileSync(config_file, 'utf-8'));
  var client_conf = config_parsed.rest_api;
  var auth_method = config_parsed.nuxeo_account.method || 'basic';
  // support either auth method
  if (auth_method == 'basic') {
    client_conf['auth'] = {
      method: 'basic',
      username: config_parsed.nuxeo_account.user,
      password: config_parsed.nuxeo_account.password,
    };
  } else if (auth_method == 'token') {
    client_conf['auth'] = { method: 'token' };
    client_conf['headers'] = {
      'X-Authentication-Token': config_parsed.nuxeo_account['X-Authentication-Token']
    };
  } else {
    throw new Error('invalid auth specified in conf');
  }
  winston.debug(config_parsed);
  var client = new nuxeo.Client(client_conf, args);


  /** upfile - upload file to document or folder */
  if (args.subcommand_name === 'upfile') {
    var source = args.source_file[0];
    var stats = fs.statSync(source);
    var file = rest.file(source, null, stats.size, null, null);
    // uploading to a folder
    if (args.upload_folder) {
      uploadFileToFolder(client, args, source, file);
    }
    // uploading to specific document name
    else if(args.upload_document) {
      uploadFileToFile(client, args, source, file);
    }
  }

  /** mkdoc - create document  */
  else if (args.subcommand_name === 'mkdoc') {
    if (args.parents) {
      makeParents(client, args.path[0], args.type, args.force);
    } else {
      makeDocument(client, args.path[0], args.type, args.force).then(function(res) {
        console.log(res);
      }).catch(function(error) {
        console.log(error, args.path[0]);
      });
    }
  }

  /** ls - list nuxeo path  */
  else if (args.subcommand_name === 'ls') {
    lsPath(client, args.path[0]);
  }

  /** ls - list nuxeo path  */
  else if (args.subcommand_name === 'q') {
    nxql(client, args.query[0]);
  }

  // should not be possible
  else {
    throw new Error(args.subcommand_name + ' not implimented'); 
  }
}

/**
 * wrapper for uploading file to a Folder
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 * @param {string} source - path to the local file
 * @file {Object} file - restler.file object
 */
var uploadFileToFolder = function uploadFileToFolder(client, args, source, file){

  // upload directory must exist
  var check_url = 'path' + args.upload_folder;
  client.request(check_url).get(function(error, remote) {
    if (error) { throw error; }

    // upload directory must be Folderish
    if (remote.facets.indexOf('Folderish') >= 0){

      // does the file already exist on nuxeo?
      var check2_url = 'path' + args.upload_folder.replace(/\/$/, "") + '/' + file.filename;
      client.request(check2_url).get(function(error, remote) {
        if (error) {
          if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
            // does not exist yet; upload away
            fileToDirectory(client, source, file, args.upload_folder);
          } else {
            console.log(error);
            throw error;
          }
        }
        // file is on the server
        else { 
          if (args.force) {
            fileToDirectory(client, source, file, args.upload_folder);
          } else {
            console.log('file ' + check2_url  + ' exists on nuxeo; use `-f` to force');
          }
        }
      });
    }
    // not Folderish
    else { throw new Error('destination ' + check_url + ' is not Folderish'); } 
  });
};


/**
 * wrapper for uploading file to specific document path name
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 * @param {string} source - path to the local file
 * @file {Object} file - restler.file object  / file.filename will be the upload name
 */
var uploadFileToFile = function uploadFileToFile(client, args, source, file){

  var upload_folder = path.dirname(args.upload_document);
  // change the file.filename to rename file on the move
  file.filename = path.basename(args.upload_document);

  // does the file already exist on nuxeo?
  var check_url = 'path' + args.upload_document;
  client.request(check_url).get(function(error, remote) {
    if (error) {
      if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
        // does not exist yet; upload away
        fileToDirectory(client, source, file, upload_folder);
      } else {
        console.log(error);
        throw error;
      }
    }
    // file is on the server
    else {
      if (args.force) {
        fileToDirectory(client, source, file, upload_folder);
      } else {
        console.log('file ' + check_url  + ' exists on nuxeo; use `-f` to force');
      }
    }
  });
}


/**
 * parse a path string into an array of parents
 */
var parsePath = function parsePath(docpath){
  // clean up string and split into an array
  docpath = docpath.replace(/^\//,'').replace(/\/$/,'').split('/');
  // reduce the array into an array of parent paths
  return _.reduce(docpath, function(result, n, z) {
    // want to reduce to an array, it starts as a String
    if (result.constructor === String) {
      result = [ '/' + result ];
    }
    result.push(result[z - 1] + '/' + n);
    return result;
  });
}


/**
 * create parent directories
 */
var makeParents = function makeParents(client, docpath, type, force){
  // https://github.com/petkaantonov/bluebird/issues/134
  Promise.reduce(parsePath(docpath), function(memo, item) {
    return makeDocument(client, item, type, force, true).then(function(res) {
      if (res) { console.log(res) };
    }).catch(function(error) {
      console.log(error, docpath);
    });
  }, 0);
}


/**
 * create a new document at a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 */
var makeDocument = function makeDocument(client, pathin, type, force, parents){
  // check if the document exists
  var check_url = 'path' + pathin;
  var input =  path.dirname(pathin);
  var params = {
    type: type,
    name: path.basename(pathin),
    properties: {
      "dc:title": path.basename(pathin),
    }
  };

  var request = client.request(check_url);
  Promise.promisifyAll(request);

  return request.getAsync().then(function(remote) {
    // Folder is alread on the server
    if (force) {
      return createDocument(client, params, input);
    } else if (! parents){
      console.log(pathin + ' exists on nuxeo; use `-f` to force');
    }
  }).catch(function(error) {
    if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
      // does not exist yet; create it
      return createDocument(client, params, input);
    } else {
      console.log(error);
      throw error;
    }
  });
};


/**
 * list a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 */
var lsPath = function lsPath(client, path){
  // check path specific path
  var check_url = 'path' + path;
  client.request(check_url).get(function(error, remote) {
    if (error) { console.log(error); throw error; }
    formatDocumentEntityType(remote);
  });
  // check the path for childern
  check_url = check_url.replace(/\/$/, "") + '/@children';
  client.request(check_url).get(function(error, remote) {
    if (error) { console.log(error); throw error; }
    remote.entries.forEach(function(entry){
      formatDocumentEntityType(entry);
    });
  });
}

var nxql = function nxql(client, query){
  client.request('query?query=' + encodeURIComponent(query))
        .get(function(error, remote) {
          if (error) { console.log(error); throw error; }
          remote.entries.forEach(function(entry){
            formatDocumentEntityType(entry);
          });
        });
}

var formatDocumentEntityType = function formatDocumentEntityType(json) {
  console.log(json.uid + '\t' + json.type + '\t' + json.path );
}


/**
 * create a new document at a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 * @param {string} source - path to the local file
 * @file {Object} file - restler.file object  / file.filename will be the upload name
 * @file {string} upload_folder - path on remote server
 */
var fileToDirectory = function fileToDirectory(client, source, file, upload_folder){
  var uploader = client.operation('FileManager.Import')
                       .context({ currentDocument: upload_folder })
                       .uploader();
  uploader.uploadFile(file, function(fileIndex, fileObj, timeDiff) {
    uploader.execute({
      path: path.basename(source)
    }, function (error, data) {
      if (error) {
        console.log('uploadError', error);
        throw error;
      } else {
        console.log('upload', data);
      }
    });
  });
};


/**
 * create a new document at a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} params - parameters to pass to {@code Document.Create}
 */
var createDocument = function createDocument(client, params, input){
  return new Promise(function(resolve, reject){
    client.operation('Document.Create')
          .params(params)
          .input(input)
          .execute(function(error, data, response) {
            if (error) { reject(error); }
            resolve(data);
          });
  });
};

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
