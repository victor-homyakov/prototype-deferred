TestCase('callbacks', (function () {

    var testCase = {
        'test Callbacks(options) - options are copied': function () {
            expectAsserts(1);

            var options = {
                    "unique": true
                },
                cb = new Prototype.Callbacks(options),
                count = 0,
                fn = function () {
                    count++;
                    assertEquals("called once", 1, count);
                };

            options["unique"] = false;
            cb.add(fn, fn);
            cb.fire();
        },

        'test Callbacks.fireWith - arguments are copied': function () {
            expectAsserts(1);

            var cb = new Prototype.Callbacks({memory: true}),
                args = ["hello"];

            cb.fireWith(null, args);
            args[0] = "world";

            cb.add(function (hello) {
                assertSame("arguments are copied internally", "hello", hello);
            });
        },

        'test Callbacks.remove - should remove all instances': function () {
            expectAsserts(1);

            var cb = new Prototype.Callbacks();

            function fn() {
                fail("function wasn't removed");
            }

            cb.add(fn, fn,function () {
                assertTrue("end of test", true);
            }).remove(fn).fire();
        },

        'test Callbacks.has': function () {
            expectAsserts(13);

            var cb = new Prototype.Callbacks();

            function getA() {
                return "A";
            }

            function getB() {
                return "B";
            }

            function getC() {
                return "C";
            }

            cb.add(getA, getB, getC);
            assertTrue("No arguments to .has() returns whether callback function(s) are attached or not", cb.has());
            assertTrue("Check if a specific callback function is in the Callbacks list", cb.has(getA));

            cb.remove(getB);
            assertFalse("Remove a specific callback function and make sure its no longer there", cb.has(getB));
            assertTrue("Remove a specific callback function and make sure other callback function is still there",
                cb.has(getA));

            cb.empty();
            assertFalse("Empty list and make sure there are no callback function(s)", cb.has());
            assertFalse("Check for a specific function in an empty() list", cb.has(getA));

            cb.add(getA, getB,function () {
                assertTrue("Check if list has callback function(s) from within a callback function", cb.has());
                assertTrue("Check if list has a specific callback from within a callback function", cb.has(getA));
            }).fire();

            assertTrue("Callbacks list has callback function(s) after firing", cb.has());

            cb.disable();
            assertFalse("disabled() list has no callback functions (returns false)", cb.has());
            assertFalse("Check for a specific function in a disabled() list", cb.has(getA));

            cb = new Prototype.Callbacks({unique: true});
            cb.add(getA);
            cb.add(getA);
            assertTrue("Check if unique list has callback function(s) attached", cb.has());
            cb.lock();
            assertFalse("locked() list is empty and returns false", cb.has());
        },

        'test Callbacks - adding a string doesn\'t cause a stack overflow': function () {
            expectAsserts(1);
            assertNoException("no stack overflow", function () {
                new Prototype.Callbacks().add("hello world");
            });
        }
    };


    var output,
        addToOutput = function (string) {
            return function () {
                output += string;
            };
        },
        outputA = addToOutput("A"),
        outputB = addToOutput("B"),
        outputC = addToOutput("C"),
        tests = {
            "": "XABC   X     XABCABCC  X  XBB X   XABA  X   XX",
            "once": "XABC   X     X         X  X   X   XABA  X   XX",
            "memory": "XABC   XABC  XABCABCCC XA XBB XB  XABA  XC  XX",
            "unique": "XABC   X     XABCA     X  XBB X   XAB   X   X",
            "stopOnFalse": "XABC   X     XABCABCC  X  XBB X   XA    X   XX",
            "once memory": "XABC   XABC  X         XA X   XA  XABA  XC  XX",
            "once unique": "XABC   X     X         X  X   X   XAB   X   X",
            "once stopOnFalse": "XABC   X     X         X  X   X   XA    X   XX",
            "memory unique": "XABC   XA    XABCA     XA XBB XB  XAB   XC  X",
            "memory stopOnFalse": "XABC   XABC  XABCABCCC XA XBB XB  XA    X   XX",
            "unique stopOnFalse": "XABC   X     XABCA     X  XBB X   XA    X   X"
        },
        filters = {
            "no filter": undefined,
            "filter": function (fn) {
                return function () {
                    return fn.apply(this, arguments);
                };
            }
        };

    function showFlags(flags) {
        if (typeof flags === "string") {
            return "'" + flags + "'";
        }
        var output = [], key;
        for (key in flags) {
            output.push("'" + key + "': " + flags[key]);
        }
        return "{ " + output.join(", ") + " }";
    }

    $H(tests).each(function (entry) {
        var strFlags = entry.key, resultString = entry.value;

        var objectFlags = {};
        strFlags.split(" ").each(function (flag) {
            if (flag.length) {
                objectFlags[flag] = true;
            }
        });

        $H(filters).each(function (filter) {

            var generateTest = function (flagsTypes, flags) {

                var testName = 'test Callbacks(' + showFlags(flags) + ') - ' + filter.key;
                testCase[testName] = function () {

                    expectAsserts(21);

                    var cblist,
                        results = resultString.split(/\s+/);

                    // Basic binding and firing
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function (str) {
                        output += str;
                    });
                    cblist.fire("A");
                    assertSame("Basic binding and firing", "XA", output);
                    assertTrue(".fired detects firing", cblist.fired);
                    output = "X";
                    cblist.disable();
                    cblist.add(function (str) {
                        output += str;
                    });
                    assertSame("Adding a callback after disabling", "X", output);
                    cblist.fire("A");
                    assertSame("Firing after disabling", "X", output);

                    // #13517 - Emptying while firing
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(cblist.empty);
                    cblist.add(function () {
                        fail("not emptied");
                    });
                    cblist.fire();

                    // Disabling while firing
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(cblist.disable);
                    cblist.add(function () {
                        fail("not disabled");
                    });
                    cblist.fire();

                    // Basic binding and firing (context, arguments)
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function () {
                        assertEquals("Basic binding and firing (context)", window, this);
                        output += Array.prototype.join.call(arguments, "");
                    });
                    cblist.fireWith(window, [ "A", "B" ]);
                    assertSame("Basic binding and firing (arguments)", "XAB", output);

                    // fireWith with no arguments
                    output = "";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function () {
                        assertEquals("fireWith with no arguments (context is window)", window, this);
                        assertSame("fireWith with no arguments (no arguments)", arguments.length, 0);
                    });
                    cblist.fireWith();

                    // Basic binding, removing and firing
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(outputA, outputB, outputC);
                    cblist.remove(outputB, outputC);
                    cblist.fire();
                    assertSame("Basic binding, removing and firing", "XA", output);

                    // Empty
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(outputA);
                    cblist.add(outputB);
                    cblist.add(outputC);
                    cblist.empty();
                    cblist.fire();
                    assertSame("Empty", "X", output);

                    // Locking
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function (str) {
                        output += str;
                    });
                    cblist.lock();
                    cblist.add(function (str) {
                        output += str;
                    });
                    cblist.fire("A");
                    cblist.add(function (str) {
                        output += str;
                    });
                    assertSame("Lock early", "X", output);

                    // Ordering
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function () {
                        cblist.add(outputC);
                        outputA();
                    }, outputB);
                    cblist.fire();
                    assertSame("Proper ordering", output, results.shift());

                    // Add and fire again
                    output = "X";
                    cblist.add(function () {
                        cblist.add(outputC);
                        outputA();
                    }, outputB);
                    assertSame("Add after fire", output, results.shift());

                    output = "X";
                    cblist.fire();
                    assertSame("Fire again", output, results.shift());

                    // Multiple fire
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(function (str) {
                        output += str;
                    });
                    cblist.fire("A");
                    assertSame("Multiple fire (first fire)", "XA", output);
                    output = "X";
                    cblist.add(function (str) {
                        output += str;
                    });
                    assertSame("Multiple fire (first new callback)", results.shift(), output);
                    output = "X";
                    cblist.fire("B");
                    assertSame("Multiple fire (second fire)", results.shift(), output);
                    output = "X";
                    cblist.add(function (str) {
                        output += str;
                    });
                    assertSame("Multiple fire (second new callback)", results.shift(), output);

                    // Return false
                    output = "X";
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(outputA, function () {
                        return false;
                    }, outputB);
                    cblist.add(outputA);
                    cblist.fire();
                    assertSame("Callback returning false", results.shift(), output);

                    // Add another callback (to control lists with memory do not fire anymore)
                    output = "X";
                    cblist.add(outputC);
                    assertSame("Adding a callback after one returned false", results.shift(), output);

                    // Callbacks are not iterated
                    output = "";
                    function handler() {
                        output += "X";
                    }

                    handler.method = function () {
                        output += "!";
                    };
                    cblist = new Prototype.Callbacks(flags);
                    cblist.add(handler);
                    cblist.add(handler);
                    cblist.fire();
                    assertSame("No callback iteration", results.shift(), output);
                };
            };

            //generateTest("string", strFlags);
            generateTest("object", objectFlags);
        });

    });


    return testCase;
}()));
