TestCase('deferred', (function () {
    var testCase = {
    };

    ["", "new "].each(function (withNew) {
        /**
         * @param {Function} [fn]
         * @returns {Prototype.Deferred}
         */
        function createDeferred(fn) {
            return withNew ? new Prototype.Deferred(fn) : Prototype.Deferred(fn);
        }

        testCase['test ' + withNew + 'Deferred().resolve()'] = function () {
            expectAsserts(3);

            createDeferred()
                .resolve()
                .done(function () {
                    assertTrue("Success on resolve", true);
                    assertSame("Deferred is resolved (state)", "resolved", this.state());
                })
                .fail(function () {
                    fail("Error on resolve");
                })
                .always(function () {
                    assertTrue("Always callback on resolve", true);
                });
        };

        testCase['test ' + withNew + 'Deferred().reject()'] = function () {
            expectAsserts(3);

            createDeferred()
                .reject()
                .done(function () {
                    fail("Success on reject");
                })
                .fail(function () {
                    assertTrue("Error on reject", true);
                    assertSame("Deferred is rejected (state)", "rejected", this.state());
                })
                .always(function () {
                    assertTrue("Always callback on reject", true);
                });
        };

        testCase['test ' + withNew + 'Deferred(callback) + resolve in callback'] = function () {
            expectAsserts(2);

            createDeferred(function (defer) {
                assertSame("Defer passed as this & first argument", defer, this);
                this.resolve("done");
            }).done(function (value) {
                    assertSame("Passed function executed", "done", value);
                });
        };

        testCase['test ' + withNew + 'Deferred() + promise'] = function () {
            expectAsserts(9);

            createDeferred(function (defer) {
                var promise = defer.promise(),
                    func = function () {
                    },
                    funcPromise = defer.promise(func);
                assertSame("Promise is always the same", promise, defer.promise());
                assertSame("Non objects get extended", func, funcPromise);
                $H(promise).each(function (prop) {
                    if (!Object.isFunction(prop.value)) {
                        fail(prop.key + " is a function (" + Object.type(prop.value) + ")");
                    }
                    //if (prop.value !== func[prop.key]) {
                    assertSame(prop.key + " is the same", prop.value, func[prop.key]);
                    //}
                });
            });
        };

        testCase['test ' + withNew + 'Deferred().state()' ] = function () {
            expectAsserts(12);
            ["resolve", "reject"].each(function (change) {
                createDeferred(function (defer) {
                    assertSame("pending after creation", "pending", defer.state());
                    var checked = 0;
                    defer.progress(function (value) {
                        assertSame("Progress: right value (" + value + ") received", checked, value);
                    });
                    for (checked = 0; checked < 3; checked++) {
                        defer.notify(checked);
                    }
                    assertSame("pending after notification", "pending", defer.state());
                    defer[change]();
                    assertNotEquals("not pending after " + change, "pending", defer.state());
                    defer.notify();
                });
            });
        };
    });

    return testCase;
}()));
