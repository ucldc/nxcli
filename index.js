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

  // set up nuxeo client
  var client = new nuxeo.Client(
    require('rc')('nx', {}, args)
  );

  /*
   * upload a named file to a directory or full path on nuxeo
   */
  if (args.subcommand_name === 'upfile') {
    var source = args.source_file[0];
    var stats = fs.statSync(source);
    var file = rest.file(source, null, stats.size, null, null);
    /* upfile -dir UPLOAD_FOLDER
       one of two mutually exclusive options  */
    if (args.upload_folder) {
      var check_url = 'path' + args.upload_folder;
      // upload directory must exist
      client.request(check_url).get(function(error, remote) {
        if (error) { throw error; }
        // upload directory must be Folderish
        if (remote.facets.indexOf('Folderish') >= 0){
          var check2_url = 'path' + args.upload_folder.replace(/\/$/, "") + '/' + file.filename;
          // does the file already exist on nuxeo?
          client.request(check2_url).get(function(error, remote) {
            if (error) {
              if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
                // does not exist; upload away
                fileToDirectory(client, source, file, args.upload_folder);
              } else {
                console.log(error);
                throw error;
              }
            } else { // file is on the server
              if (args.force) {
                fileToDirectory(client, source, file, args.upload_folder);
              } else {
                console.log('file ' + check2_url  + ' exists on nuxeo; use `-f` to force');
              }
            }
          });
        } else { // not Folderish
          throw new Error('destination ' + check_url + ' is not Folderish');
        } 
      });
    /* upfile -doc UPLOAD_DOCUMENT
    */
    } else if(args.upload_document) {
      var check_url = 'path' + args.upload_document;
      var upload_folder = path.dirname(args.upload_document);
      // change the filename
      file.filename = path.basename(args.upload_document);
      client.request(check_url).get(function(error, remote) {
        if (error) {
          if (error.code === 'org.nuxeo.ecm.core.model.NoSuchDocumentException') {
            // does not exist; upload away
            fileToDirectory(client, source, file, upload_folder);
          } else {
            console.log(error);
            throw error;
          }
        } else { // file is on the server
          if (args.force) {
            fileToDirectory(client, source, file, upload_folder);
          } else {
            console.log('file ' + check_url  + ' exists on nuxeo; use `-f` to force');
          }
        }
      });
    }
  } // upfile subcommand
} // main

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
      } else {
        console.log('upload', data);
      }
    });
  });
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
