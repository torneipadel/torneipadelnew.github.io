(function () {
  if (typeof window !== "undefined" && typeof window.globalThis === "undefined") window.globalThis = window;
  if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
    Promise.prototype.finally = function (callback) {
      var Constructor = this.constructor;
      return this.then(
        function (value) { return Constructor.resolve(callback()).then(function () { return value; }); },
        function (reason) { return Constructor.resolve(callback()).then(function () { throw reason; }); }
      );
    };
  }
  if (!Array.prototype.flatMap) {
      Array.prototype.flatMap = function (callback, thisArg) {
        var result = [];
        for (var i = 0; i < this.length; i++) {
          if (i in this) {
            var part = callback.call(thisArg, this[i], i, this);
            if (Array.isArray(part)) result = result.concat(part);
            else result.push(part);
          }
        }
        return result;
      };
    }
    if (!Array.prototype.flat) {
      Array.prototype.flat = function (depth) {
        var d = depth === undefined ? 1 : Number(depth);
        var result = [];
        (function flatten(input, level) {
          for (var i = 0; i < input.length; i++) {
            if (!(i in input)) continue;
            var value = input[i];
            if (Array.isArray(value) && level > 0) flatten(value, level - 1);
            else result.push(value);
          }
        })(this, isFinite(d) ? d : 0);
        return result;
      };
    }
    if (!Object.fromEntries) {
      Object.fromEntries = function (entries) {
        var out = {};
        for (var item of entries) {
          if (item && item.length >= 2) out[item[0]] = item[1];
        }
        return out;
      };
    }
})();
