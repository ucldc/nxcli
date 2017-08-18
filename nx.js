#!/usr/bin/env node
'use strict';
const path = require('path');
const bluebird = require('bluebird');

/**
 * upload files to the "Files" tab
 * @param {Object} nuxeo - Nuxeo Client
 * @param {string} source - path to the local file
 * @param {Object} file - Node.js Stream
 * @param {string} destination - path on remote server
 */
const filesToExtraFiles = function filesToExtraFiles(nuxeo, source, file, destination){
  console.log(destination);
  nuxeo.batchUpload()
    .upload(file)
    .then(res => {
      return nuxeo.operation('Blob.AttachOnDocument')
        .param('document', destination)
        .param('save', true)
        .param('xpath', 'files:files')
        .input(res.blob)
        .execute({ schemas: 'files' });
    })
    .then(doc => { console.log(doc); })
    .catch(error => { console.log(error); throw error; });
};

/**
 * upload a new version of a file, updating the major version number
 * @param {Object} client - Nuxeo Client
 * @param {Object} file - Node.js Stream
 * @param {Object} remote - Nuxeo Document
 */
const forceFileToDocument = function forceFileToDocument(nuxeo,
                                                       file,
                                                       remote) {
  // const options = { 'name': file.path };
  nuxeo.operation('Document.CheckIn')
    .input(remote)
    .params({ version: 'major' })
    .execute()
    .then(doc => {
      nuxeo.batchUpload()
        .upload(file)
        .then(res => {
            return nuxeo.operation('Blob.Attach')
              .params({
                document: doc,
                save: true
              })
              .input(res.blob)
              .execute({ schemas: 'file'})
              .then(res => { console.log(res.statusText); } );
        })
        .catch(error => {console.log(error); throw error; });
    }).catch(function(error) { console.log(error); throw error; });
};

/**
 * create a new document at a specific path
 * @param {Object} nuxeo - Nuxeo Client
 * @param {string} source - path to the local file
 * @param {Object} file - Node.js Stream
 * @param {string} upload_folder - path on remote server
 */
const fileToDirectory = function fileToDirectory(nuxeo, source, file, upload_folder){
  nuxeo.batchUpload()
    .upload(file)
    .then(function(res) {
      return nuxeo.operation('FileManager.Import')
        .context({ currentDocument: upload_folder })
        .input(res.blob)
        .execute({
          schemas: ['file'],
          path: path.basename(source)
        });
    })
    .then(function(doc) {
      console.log(doc.properties['file:content']);
    })
    .catch(function(error) {
      console.log(error);
      throw error;
    });
};

const uploadExtraFiles = function uploadExtraFiles(nuxeo, args, source, file) {
  filesToExtraFiles(nuxeo, source, file, args.destination_document[0]);
};

/**
 * wrapper for uploading file to a Folder
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 * @param {string} source - path to the local file
 * @param {Object} file - Node.js Stream
 */
const uploadFileToFolder = function uploadFileToFolder(client, args, source, file){

  // upload directory must exist
  const check_url = 'path' + args.upload_folder;
  client.request(check_url).get().then(function(remote) {

    // upload directory must be Folderish
    if (remote.facets.indexOf('Folderish') >= 0){

      // does the file already exist on nuxeo?
      const check2_url = 'path' + args.upload_folder.replace(/\/$/, '') + '/' + file.name;
      client.request(check2_url)
        .get()
        .then(function(inner){
          // file is on the server
          if (args.force) {
            return forceFileToDocument(client, file, inner);
          } else {
            console.log('file ' + check2_url  + ' exists on nuxeo; use `-f` to force');
          }
        })
        .catch(function(error) {
          if (error.response.status === 404) {
            // does not exist yet; upload away
            return fileToDirectory(client, source, file, args.upload_folder);
          }
        });
    }
    // not Folderish
    else { throw new Error('destination ' + check_url + ' is not Folderish'); } 
  }).catch(function(error) {
    if (error.response.status === 404) {
      console.log('`' + check_url + '` not found');
    } else {
      throw error;
    }
  });
};


/**
 * wrapper for uploading file to specific document path name
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 * @param {string} source - path to the local file
 * @param {Object} file - Node.js stream
 */
const uploadFileToFile = function uploadFileToFile(client, args, source, file){

  const upload_folder = path.dirname(args.upload_document);
  // change the file.filename to rename file on the move
  file.filename = path.basename(args.upload_document);

  // does the file already exist on nuxeo?
  const check_url = 'path' + args.upload_document;
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
        forceFileToDocument(client, file, remote);
      } else {
        console.log('file ' + check_url  + ' exists on nuxeo; use `-f` to force');
      }
    }
  });
};


/**
 * parse a path string into an array of parents
 */
const parsePath = function parsePath(docpath){
  // clean up string and split into an array
  docpath = docpath.replace(/^\//,'').replace(/\/$/,'').split('/');
  // reduce the array into an array of parent paths
  return docpath.reduce(function(result, n, z) {
    // want to reduce to an array, it starts as a String
    if (result.constructor === String) {
      result = [ '/' + result ];
    }
    result.push(result[z - 1] + '/' + n);
    return result;
  });
};

/**
 * create a new document at a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} params - parameters to pass to {@code Document.Create}
 */
const createDocument = function createDocument(client, params, input){
  return new Promise(function(resolve, reject){
    client.operation('Document.Create')
          .params(params)
          .input(input)
          .execute()
          .then(function(data) {
            resolve(data);
          })
          .catch(function(error) { reject(error); });
  });
};

const formatDocumentEntityType = function formatDocumentEntityType(json) {
  console.log(json.uid + '\t' + json.type + '\t' + json.path );
};

/**
 * create a new document at a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 */
const makeDocument = function makeDocument(nuxeo, pathin, type, force, parents){
  // check if the document exists
  const check_url = 'path' + pathin;
  const input =  path.dirname(pathin);
  const params = {
    type: type,
    name: path.basename(pathin),
    properties: {
      'dc:title': path.basename(pathin),
    }
  };

  const request = nuxeo.request(check_url);

  return request.get().then(function() {
    // Folder is alread on the server
    if (force) {
      return createDocument(nuxeo, params, input);
    } else if (! parents){
      console.log(pathin + ' exists on nuxeo; use `-f` to force');
    }
  }).catch(function(error) {
    if (error.response.status === 404) {
      // does not exist yet; create it
      return createDocument(nuxeo, params, input);
    } else {
      console.log(error);
      throw error;
    }
  });
};

/**
 * create parent directories
 */
const makeParents = function makeParents(client, docpath, type, force){
  // https://github.com/petkaantonov/bluebird/issues/134
  bluebird.reduce(parsePath(docpath), function(memo, item) {
    return makeDocument(client, item, type, force, true).then(function(res) {
      if (res) { console.log(res); }
    }).catch(function(error) {
      console.log(error, docpath);
    });
  }, 0);
};


/**
 * list a specific path
 * @param {Object} client - Nuxeo Client
 * @param {Object} args - parsed dict of command line arguments
 */
const lsPath = function lsPath(nuxeo, path){
  // check path specific path
  const check_url = 'path' + path;
  nuxeo.request(check_url)
    .get()
    .then(function(remote) {
      formatDocumentEntityType(remote);
    })
    .catch(function(error){
      console.log(error); throw error;
    });

  // check the path for childern
  const url = check_url.replace(/\/$/, '') + '/@children';
  nuxeo.request(url)
    .get()
    .then(function(remote) {
      remote.entries.forEach(function(entry){
        formatDocumentEntityType(entry);
      });
    })
    .catch(function(error){
      console.log(error); throw error;
    });
};

const nxql = function nxql(nuxeo, query){
  nuxeo.request()
        .path('query')
        .queryParams({'query': query})
        .get()
        .then(function(remote) {
          remote.entries.forEach(function(entry){
            formatDocumentEntityType(entry);
          });
        })
        .catch(function(error){
          console.log(error); throw error;
        });
};

const mv_to_folder = function mv_to_folder(client, from, to){
  client.document(from)
    .fetch(function(error, doc) {
      if (error) { console.log(error); throw error; }
      doc.move({
        target: to
      }, function(error, doc) {
        console.log('Successfully moved ' + doc.title + ', updated path: ' + doc.path);
      });
  });
};

module.exports = {
  uploadExtraFiles: uploadExtraFiles,
  uploadFileToFolder: uploadFileToFolder,
  uploadFileToFile: uploadFileToFile,
  parsePath: parsePath,
  makeParents: makeParents,
  makeDocument: makeDocument,
  lsPath: lsPath,
  nxql: nxql,
  mv_to_folder: mv_to_folder,
  formatDocumentEntityType: formatDocumentEntityType,
  fileToDirectory: fileToDirectory,
  filesToExtraFiles: filesToExtraFiles,
  createDocument: createDocument
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
