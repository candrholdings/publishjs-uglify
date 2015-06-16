!function (assert, async, linq, path) {
    'use strict';

    require('vows').describe('Integration test').addBatch({
        'When uglifying a JS file': {
            topic: function () {
                var callback = this.callback,
                    topic;

                async.parallel({
                    input: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false,
                            processors: {
                                uglify: require('../index')
                            },
                            pipes: [function (pipe, callback) {
                                pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/input'))
                                    .uglify({ map: true })
                                    .run(callback);
                            }]
                        }).build(callback);
                    },
                    baseline: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false,
                            pipes: [function (pipe, callback) {
                                pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/baseline'))
                                    .run(callback);
                            }]
                        }).build(callback);
                    }
                }, callback);
            },

            'should returns an uglified copy': function (topic) {
                var input = linq(topic.input.all).select(function (buffer) {
                        return buffer.toString().replace(/\r/g, '');
                    }).run(),
                    baseline = linq(topic.baseline.all).select(function (buffer) {
                        return buffer.toString().replace(/\r/g, '');
                    }).run();

                assert.deepEqual(input, baseline);
            }
        }
    }).export(module);
}(
    require('assert'),
    require('async'),
    require('async-linq'),
    require('path')
);