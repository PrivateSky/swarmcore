var SwarmDispatcher = (function () {
    var uuid = require('uuid');
    var instance;
    var callbacks = {};

    function init() {

        return {
            subscribeToSwarmResult: function (callback) {
                var generatedId = uuid.v1();
                callbacks[generatedId] = callback;
                return generatedId;
            },
            notifySubscribers: function (id, data) {
                if (callbacks[id]) {
                    callbacks[id](data);
                    delete callbacks[id];
                }
            }
        }
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

module.exports = SwarmDispatcher.getInstance();
