!function (UglifyJS, path, util, extend) {
  'use strict';

  const
    SOURCE_MAP_SUFFIX = '.map',
    number = util.number,
    replaceMultiple = util.regexp.replaceMultiple,
    time = util.time;

  module.exports = function (inputs, outputs, args, callback) {
    if (arguments.length === 3) {
      callback = arguments[2];
      args = null;
    }

    args || (args = {});

    var that = this;

    inputs.deleted.forEach(function (filename) {
      outputs[filename] = null;
    });

    inputs = inputs.newOrChanged;

    Object.getOwnPropertyNames(inputs).forEach(function (filename) {
      var startTime = Date.now(),
        original = inputs[filename],
        extname = (path.extname(filename) || '').toLowerCase(),
        perFileArgs = extend(true, {}, args),
        minified;

      if (extname === '.html' || extname === '.htm') {
        try {
          minified = outputs[filename] = new Buffer(processHTML(original.toString()));
        } catch (ex) {
          that.log('Failed to uglify ' + filename + ' due to ' + ex.message);
          throw ex;
        }
      } else if (extname === '.js') {
        const
          inputSourceMap = inputs[filename + SOURCE_MAP_SUFFIX],
          sourceMap =
            UglifyJS.SourceMap(
              Object.assign(
                {},
                args.map || {},
                {
                  file: filename,
                  orig: inputSourceMap ? JSON.parse(inputSourceMap.toString()) : null
                }
              )
            );

        let uglified;

        try {
          uglified = UglifyJS.minify(
            removeDebugCode(
              original.toString()
            ),
            Object.assign(
              {
                fromString: true,
                output: {
                  source_map: sourceMap
                }
              },
              args
            )
          );
        } catch (ex) {
          that.log('Failed to uglify ' + filename + ' due to ' + ex.message);
          throw ex;
        }

        minified = uglified.code;

        // Pretty print the source map
        if (args.sourceMap) {
          minified += `//# sourceMappingURL=${filename + SOURCE_MAP_SUFFIX}`;
          outputs[filename + SOURCE_MAP_SUFFIX] = JSON.stringify(JSON.parse(sourceMap.toString()), null, 2);
        }

        outputs[filename] = minified;
      } else {
        if (isSourceMap(filename)) {
          outputs[filename] = original;
        }

        return;
      }

      that.log([
        'Uglified ',
        filename,
        ', took ',
        time.humanize(Date.now() - startTime),
        ' (',
        number.bytes(original.length),
        ' -> ',
        number.bytes(minified.length),
        ', ',
        (((minified.length / original.length) - 1) * 100).toFixed(1),
        '%)'
      ].join(''));
    });

    callback(null, outputs);
  };

  function processHTML(text) {
    var pattern = /(<script [^>]*?type="text\/javascript"[^>]*>)([\s\S]*?)(<\/script>)/gmi;

    return replaceMultiple(
      text,
      [
        [
          /(<script [^>]*?type="text\/javascript"[^>]*>)([\s\S]*?)(<\/script>)/gmi,
          function (match0, match1, match2, match3, index, input) {
            return match1 + UglifyJS.minify(removeDebugCode(match2), { fromString: true }).code + match3;
          }
        ]
      ]
    ).replace(/\s*([^\n]*)[\n\r]*/gm, '$1\n').replace(/\n*$/, '');
  }

  function removeDebugCode(code) {
    var output = [],
      count = 0,
      startPattern = /\/\/\s*IF\s+DEBUG(\s|$)/,
      endPattern = /\/\/\s*END(\s+DEBUG)?(\s|$)/;

    code.split('\n').forEach(function (line) {
      var startMatch = startPattern.exec(line),
        endMatch = endPattern.exec(line);

      if (startMatch && endMatch) {
        if (startMatch.index < endMatch.index) {
          endMatch = 0;
        } else {
          startMatch = 0;
        }
      }

      if (startMatch) {
        !count && output.push(line.substr(0, startMatch.index));
        count++;
      } else if (endMatch) {
        count--;
      } else {
        !count && output.push(line + '\n');
      }
    });

    return output.join('');
  }

  function isSourceMap(fileName) {
    return fileName.toLowerCase().substr(-SOURCE_MAP_SUFFIX.length) === SOURCE_MAP_SUFFIX;
  }
}(
  require('uglify-js'),
  require('path'),
  require('publishjs').util,
  require('node.extend')
);