#!/usr/bin/env node
'use strict';
var fs = require('fs');
var rest = require('nuxeo/node_modules/restler');
var nuxeo = require('nuxeo');
var path = require('path');
var http = require('http');
var url = require('url');

function main() {

  // parse subcommand and command line arguments
  var args = require('./arguments.js').getArgs();

  // set up nuxeo client (with nxrc file, if present)
  var client = new nuxeo.Client(require('rc')('nx', {}, args));

  // upload a file
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

  // create a new empty document on the server
  else if (args.subcommand_name === 'mkdoc') {
    makeDocument(client, args);
  }

  // should not be possible
  else {
    throw new Error(args.subcommand_name + ' not implimented'); 
  }
}


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

var makeDocument = function makeDocument(client, args){

  // check if the document exists
  var path = args.path[0];
  var check_url = 'path' + path;
  client.request(check_url).get(function(error, remote) {
    if (error) {
      if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
        // does not exist yet; create it
        createDocument(client, {type: args.type, name: path});
      } else {
        console.log(error);
        throw error;
      }
    }
    // Folder is already on the server
    else {
      if (args.force) {
        createDocument(client, {type: args.type, name: path});
      } else {
        console.log(path + ' exists on nuxeo; use `-f` to force');
      }
    }
  });
}

// upload a file to a directory
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

// create document
var createDocument = function createDocument(client, params){
  client.operation('Document.Create')
        .params(params)
        .input('doc:/')
        .execute(function(error, folder) {
          if (error) {
            console.log('createError', error);
            throw error;
          } else {
            console.log('create', folder);
          }
        });
}

if (require.main === module) { main(); }

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
