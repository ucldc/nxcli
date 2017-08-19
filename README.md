quick utility to upload files to Nuxeo

```
nx --help
nx upfile --help
nx mkdoc --help
nx ls --help
nx q --help
```

In the future, there may be added more `nx` commands; such as

 * `nx updir` recursivly upload directory

needs a better package name
 
------

## notes on node

 * should work the the latest stable version of node.  For example `nvm install stable` if using `nvm`.

 * `npm link .` is very helpful during development
 * `npm install https://github.com/ucldc/nxcli/archive/master.tar.gz`

 * Writing Command Line Tools with Node
01 March 2015 by Jack Franklin http://javascriptplayground.com/blog/2015/03/node-command-line-tool/
 * http://nodeca.github.io/argparse/
 * https://github.com/nuxeo/nuxeo-js-client/

## rcfile

```ini
[nuxeo_account]
method = token
user = Administrator
password = Administrator
X-Authentication-Token = xxkxkx

[rest_api]
; pynux style
base = http://localhost:8080/nuxeo/site/api/v1
; js style
baseURL = http://localhost:8080/nuxeo/
restPath = site/api/v1/
automationPath = site/api/v1/automation/
timeout = 3000

[platform_importer]
base = http://localhost:8080/nuxeo/site/fileImporter
```
