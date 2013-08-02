Prototype.Deferred = function (func) {
    var tuples = [
            // action, add listener, listener list, final state
            ["resolve", "done", new Prototype.Callbacks({once: true, memory: true}), "resolved"],
            ["reject", "fail", new Prototype.Callbacks({once: true, memory: true}), "rejected"],
            ["notify", "progress", new Prototype.Callbacks({memory: true})]
        ],
        state = "pending",
        promise = {
            state: function () {
                return state;
            },
            always: function () {
                var args = $A(arguments);
                deferred.done(args).fail(args);
                return this;
            },
            then: function (fnDone, fnFail, fnProgress) {
                var fns = [fnDone, fnFail, fnProgress];
                return Prototype.Deferred(function (newDefer) {
                    tuples.each(function (tuple, i) {
                        var action = tuple[0], fn = Object.isFunction(fns[i]) && fns[i];
                        // deferred[ done | fail | progress ] for forwarding actions to newDefer
                        deferred[tuple[1]](function () {
                            var returned = fn && fn.apply(this, arguments);
                            if (returned && Object.isFunction(returned.promise)) {
                                returned.promise()
                                    .done(newDefer.resolve)
                                    .fail(newDefer.reject)
                                    .progress(newDefer.notify);
                            } else {
                                newDefer[action + "With"](this === promise ? newDefer.promise() : this,
                                    fn ? [returned] : arguments);
                            }
                        });
                    });
                    fns = null;
                }).promise();
            },
            // Get a promise for this deferred
            // If obj is provided, the promise aspect is added to the object
            promise: function (obj) {
                return obj == null ? promise : Object.extend(obj, promise);
            }
        },
        deferred = {};

    // Add list-specific methods
    tuples.each(function (tuple, i) {
        var list = tuple[2], stateString = tuple[3];

        // promise[ done | fail | progress ] = list.add
        promise[tuple[1]] = function () {
            //list.add($A(arguments));
            list.add.apply(list, arguments);
            return this;
        };

        // Handle state
        if (stateString) {
            list.add(function () {
                // state = [ resolved | rejected ]
                state = stateString;
                // [ reject_list | resolve_list ].disable; progress_list.lock
            }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
        }

        // deferred[ resolve | reject | notify ]
        deferred[tuple[0] + "With"] = list.fireWith;
        deferred[tuple[0]] = function () {
            deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
            return this;
        };
    });

    // Make the deferred a promise
    promise.promise(deferred);

    // Call given func if any
    if (func) {
        func.call(deferred, deferred);
    }

    // All done!
    return deferred;
};

// Deferred helper
Prototype.when = function (subordinate /* , ..., subordinateN */) {
    var i = 0,
        resolveValues = $A(arguments),
        length = resolveValues.length,

    // the count of uncompleted subordinates
        remaining = length !== 1 || (subordinate && Object.isFunction(subordinate.promise)) ? length : 0,

    // the master Deferred. If resolveValues consist of only a single Deferred, just use that.
        deferred = remaining === 1 ? subordinate : Prototype.Deferred(),

    // Update function for both resolve and progress values
        updateFunc = function (i, contexts, values) {
            return function (value) {
                contexts[i] = this;
                values[i] = arguments.length > 1 ? $A(arguments) : value;
                if (values === progressValues) {
                    deferred.notifyWith(contexts, values);
                } else if (!(--remaining)) {
                    deferred.resolveWith(contexts, values);
                }
            };
        },

        progressValues, progressContexts, resolveContexts;

    // add listeners to Deferred subordinates; treat others as resolved
    if (length > 1) {
        progressValues = new Array(length);
        progressContexts = new Array(length);
        resolveContexts = new Array(length);
        for (; i < length; i++) {
            if (resolveValues[i] && Object.isFunction(resolveValues[i].promise)) {
                resolveValues[i].promise()
                    .done(updateFunc(i, resolveContexts, resolveValues))
                    .fail(deferred.reject)
                    .progress(updateFunc(i, progressContexts, progressValues));
            } else {
                --remaining;
            }
        }
    }

    // if we're not waiting on anything, resolve the master
    if (!remaining) {
        deferred.resolveWith(resolveContexts, resolveValues);
    }

    return deferred.promise();
};
