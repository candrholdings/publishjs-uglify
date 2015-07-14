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
                minified;

            if (extname === '.html' || extname === '.htm') {
                minified = outputs[filename] = new Buffer(processHTML(original.toString()));
            } else if (extname === '.js') {
                var sourceMap;

                if (args.map) {
                    sourceMap = UglifyJS.SourceMap(extend({}, args.map, { file: filename }));
                    args = extend(true, {}, args, { output: { source_map: sourceMap } });

                    delete args.map;
                }

                var uglified = UglifyJS.minify(original.toString(), extend({ fromString: true }, args));

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
                        return match1 + UglifyJS.minify(match2, { fromString: true }).code + match3;
                    }
                ]
            ]
        );
    }
}(
    require('uglify-js'),
    require('path'),
    require('publishjs').util,
    require('node.extend')
);