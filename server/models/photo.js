/*
 Copyright (c) IBM Corp. 2013,2017. All Rights Reserved.
 This project is licensed under the MIT License, full text below.

Author: Dennis W. Ashby, dennis.ashby@us.ibm.com

 --------

 MIT license

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

'use strict';

var app = require('../../server/server');

var fs = require('fs');
var path = require('path');

module.exports = function (Photo) {
  // Turn off the endpoints that we don't need

  Photo.disableRemoteMethodByName('destroyContainer');
  Photo.disableRemoteMethodByName('removeFile');

  /*
  Photo.disableRemoteMethodByName('createContainer');
  Photo.disableRemoteMethodByName('getContainer');
  Photo.disableRemoteMethodByName('download');
  Photo.disableRemoteMethodByName('getFiles');
  Photo.disableRemoteMethodByName('getFile');
  Photo.disableRemoteMethodByName('getContainers');
  */

  Photo.beforeRemote('upload', function(ctx, unused, next) {
    console.log('BeforeRemote @Upload says: I just received the files but have not written them to disk yet.');

    next();
  });

  // Do some processing on the file once we have successfully received it from the multi-part post
  Photo.afterRemote('upload', function (ctx, unused, next) {
    console.log('AfterRemote @Upload says: I have successfully written the files to disk.');

    // Get the uploaded files
    var files = ctx.result.result.files.fileUpload;

    console.log('I received the following files:');
    console.log(files);

    for (var i = 0; i < files.length; i++) {
      ctx.result.result.files.fileUpload[i].custom_response = 'This file will be automatically deleted soon.';
    }

    next();
  });

  Photo.cleanUp = function(container, time) {
    console.log('Photo.cleanUp() - Checking for files to delete...');

    var storage = Photo.app.dataSources.storage;
    var uploadsDir = storage.settings.root + '/' + container;

    var date = new Date();
    var currentTimeMilliseconds = date.getTime();
    var olderThanMilliseconds = currentTimeMilliseconds - (time * 60000);

    fs.readdir(uploadsDir, function(err, files) {
      files.forEach(function(file, index) {
        fs.stat(path.join(uploadsDir, file), function(err, stat) {
          var endTime, now;
          if (err) {
            return console.error(err);
          }

          if (file !== 'README.md') {
            var fileDate = new Date(stat.mtime);
            var fileMilliseconds = fileDate.getTime();

            if (fileMilliseconds <= olderThanMilliseconds) {
              fs.unlink(uploadsDir + '/' + file, function (err) {
                if (err) {
                  console.log(err);
                } else {
                  console.log('Photo.cleanUp() - Uploaded photo deleted successfully: ' + uploadsDir + '/' + file);
                }
              });
            }
          }
        });
      });
    });
  };
};
