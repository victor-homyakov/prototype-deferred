/**
 * A callback list.
 *
 * By default a callback list will act like an event callback list and can be "fired" multiple times.
 */
Prototype.Callbacks = Class.create({

    /**
     * Flag to know if list is currently firing.
     */
    firing: false,

    /**
     * Flag to know if list was already fired.
     */
    fired: false,

    /**
     * End of the loop when firing.
     */
    firingLength: undefined,

    /**
     * Index of currently firing callback (modified by remove if needed).
     */
    firingIndex: 0,

    /**
     * First callback to fire (used internally by add and fireWith).
     */
    firingStart: 0,

    /**
     * Last fire value (for non-forgettable lists).
     */
    memory: undefined,

    /**
     * Create a callback list.
     *
     * @param {Object} options               an option object
     * @param {Boolean} options.once         will ensure the callback list can only be fired once (like a Deferred)
     * @param {Boolean} options.memory       will keep track of previous values and will call any callback added
     *                                       after the list has been fired right away with the latest "memorized"
     *                                       values (like a Deferred)
     * @param {Boolean} options.unique       will ensure a callback can only be added once (no duplicate in the list)
     * @param {Boolean} options.stopOnFalse  interrupt callings when a callback returns false
     */
    initialize: function (options) {
        if (typeof options === 'string') {
            throw new Error('String options are not accepted, use object instead, ' +
                'e.g. new Prototype.Callbacks({unique: true}) instead of new Prototype.Callbacks("unique")');
        }
        options = Object.extend({}, options);
        this.options = options;
        // Actual callback list
        this.list = [];
        // Stack of fire calls for repeatable lists
        this.stack = !this.options.once && [];
        //this.add = this.add.bind(this);
        this.lock = this.lock.bind(this);
        this.fireWith = this.fireWith.bind(this);
    },

    /**
     * Fire callbacks.
     *
     * @param {Object} data
     * @param {Object} data.context
     * @param {Array} data.arguments
     * @private
     */
    _fire: function (data) {
        this.memory = this.options.memory && data;
        this.fired = true;
        this.firingIndex = this.firingStart || 0;
        this.firingStart = 0;
        this.firingLength = this.list.length;
        this.firing = true;
        for (; this.list && this.firingIndex < this.firingLength; this.firingIndex++) {
            var result = this.list[this.firingIndex].apply(data.context, data.arguments);
            if (result === false && this.options.stopOnFalse) {
                this.memory = undefined; // To prevent further calls using add
                break;
            }
        }
        this.firing = false;
        if (this.list) {
            if (this.stack) {
                if (this.stack.length) {
                    this._fire(this.stack.shift());
                }
            } else if (this.memory) {
                this.list = [];
            } else {
                this.disable();
            }
        }
    },

    /**
     * Add a callback or a collection of callbacks to the list.
     *
     * @returns {Prototype.Callbacks}
     */
    add: function () {
        if (this.list) {
            // First, we save the current length
            var start = this.list.length;

            $A(arguments).flatten().each(function (arg) {
                if (Object.isFunction(arg)) {
                    if (!this.options.unique || !this.has(arg)) {
                        this.list.push(arg);
                    }
                }
            }, this);

            if (this.firing) {
                // Add the callbacks to the current firing batch
                this.firingLength = this.list.length;
            } else if (this.memory) {
                // With memory, if we're not firing then we should call right away
                this.firingStart = start;
                this._fire(this.memory);
            }
        }
        return this;
    },

    /**
     * Remove a callback from the list.
     *
     * @returns {Prototype.Callbacks}
     */
    remove: function () {
        if (this.list) {
            $A(arguments).each(function (arg) {
                var index;
                while ((index = this.list.indexOf(arg)) > -1) {
                    this.list.splice(index, 1);
                    // Handle firing indexes
                    if (this.firing) {
                        if (index <= this.firingLength) {
                            this.firingLength--;
                        }
                        if (index <= this.firingIndex) {
                            this.firingIndex--;
                        }
                    }
                }
            }, this);
        }
        return this;
    },

    /**
     * Check if a given callback is in the list.
     * If no argument is given, return whether or not list has callbacks attached.
     *
     * @param {Function} [fn]
     * @returns {boolean}
     */
    has: function (fn) {
        if (!this.list) {
            return false;
        }
        return fn ? this.list.include(fn) : this.list.length > 0;
        //return fn ? !!(this.list && this.list.include(fn)) : !!(this.list && this.list.length);
    },

    /**
     * Remove all callbacks from the list.
     *
     * @returns {Prototype.Callbacks}
     */
    empty: function () {
        this.list = [];
        this.firingLength = 0;
        return this;
    },

    /**
     * Have the list do nothing anymore.
     *
     * @returns {Prototype.Callbacks}
     */
    disable: function () {
        this.list = undefined;
        this.stack = undefined;
        this.memory = undefined;
        return this;
    },

    /**
     * Is it disabled?
     *
     * @returns {boolean}
     */
    disabled: function () {
        return !this.list;
    },

    /**
     * Lock the list in its current state.
     *
     * @returns {Prototype.Callbacks}
     */
    lock: function () {
        this.stack = undefined;
        if (!this.memory) {
            this.disable();
        }
        return this;
    },

    /**
     * Is it locked?
     *
     * @returns {boolean}
     */
    locked: function () {
        return !this.stack;
    },

    /**
     * Call all callbacks with the given context and arguments.
     *
     * @param [context]
     * @param [args]
     * @returns {Prototype.Callbacks}
     */
    fireWith: function (context, args) {
        if (this.list && (!this.fired || this.stack)) {
            args = args || [];
            args = {
                context: context,
                arguments: args.slice ? args.slice() : args
            };
            if (this.firing) {
                this.stack.push(args);
            } else {
                this._fire(args);
            }
        }
        return this;
    },

    /**
     * Call all the callbacks with the given arguments.
     *
     * @returns {Prototype.Callbacks}
     */
    fire: function () {
        return this.fireWith(this, arguments);
    }
});
