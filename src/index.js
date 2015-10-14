!function (UglifyJS, path, util, extend) {
    'use strict';

    var number = util.number,
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
                var sourceMap,
                    uglified;

                if (perFileArgs.map) {
                    sourceMap = UglifyJS.SourceMap(extend({}, perFileArgs.map, { file: filename }));
                    perFileArgs = extend(true, {}, perFileArgs, { output: { source_map: sourceMap } });

                    delete perFileArgs.map;
                }

                try {
                    uglified = UglifyJS.minify(removeDebugCode(original.toString()), extend({ fromString: true }, perFileArgs));
                } catch (ex) {
                    that.log('Failed to uglify ' + filename + ' due to ' + ex.message);
                    throw ex;
                }

                minified = outputs[filename] = uglified.code;

                if (sourceMap) {
                    outputs[filename + '.map'] = sourceMap.toString();
                }
            } else {
                outputs[filename] = original;

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
}(
    require('uglify-js'),
    require('path'),
    require('publishjs').util,
    require('node.extend')
);