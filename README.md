prototype-deferred
==================

Port of Deferred and Callbacks to Prototype (http://api.jquery.com/category/deferred-object/)

Compatibility notes
-------------------
In most cases replacing `$.Callbacks()` to `new Prototype.Callbacks()` and `$.Deferred()` to `new Prototype.Deferred()`
should be enough, with few exceptions:

-   Always use keyword `new` to create new `Callbacks` object. Syntax without `new` will throw error.

        var callbacks = new Prototype.Callbacks(); // OK
        var callbacks = Prototype.Callbacks(); // wrong

- Constructor `Prototype.Callbacks()` accepts only object as options. String options are not supported.

        var cb = new Prototype.Callbacks({"unique": true}); // OK
        var cb = new Prototype.Callbacks("unique"); // wrong


- `Deferred#pipe()` was already deprecated in jQuery and was not ported. Use `Deferred#then()` instead.
