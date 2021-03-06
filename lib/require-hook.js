var noop = function () {};

module.exports = function requireHook (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  opts = opts || {};
  cb = cb || noop;

  var path = require('path');
  var remote = require('electron').remote;
  var Module = require('module');
  var syntaxError = require('syntax-error');
  var fs = remote.require('fs');
  var stripBOM = require('strip-bom');
  var combineSourceMap = require('combine-source-map');
  var browserResolve = require('browser-resolve');

  var entry = opts.entry;
  var basedir = opts.basedir || remote.process.cwd();

  var hasSetMain = false;
  var currentWrapFile = null;

  require.extensions['.js'] = function devtoolCompileModule (module, file) {
    // set the main module so that Node.js scripts run correctly
    if (!hasSetMain && entry && file === entry) {
      hasSetMain = true;
      process.mainModule = module;
    }

    var code = fs.readFileSync(file, 'utf8');
    try {
      currentWrapFile = file;
      module._compile(stripBOM(code), file);
      cb(null);
    } catch (err) {
      // improve Electron's error handling (i.e. SyntaxError)
      var realErr = syntaxError(code, file) || err;
      console.warn('Error compiling module: ' + file + '\n' + (realErr.annotated || realErr.message));
      console.error(err.stack);
      cb(err);
    }
  };

  // Include source maps for required modules
  var wrap = Module.wrap;
  Module.wrap = function (script) {
    var wrapScript = wrap.call(wrap, script);
    if (!currentWrapFile) return wrapScript;
    // var baseFileDir = path.dirname(entry);
    // TODO: Use path.dirname(entry) or opts.basedir ?
    var sourceFile = path.relative(basedir, currentWrapFile)
      .replace(/\\/g, '/');
    var sourceMap = combineSourceMap.create().addFile(
        { sourceFile: sourceFile, source: script },
        { line: 0 });
    return [
      combineSourceMap.removeComments(wrapScript),
      sourceMap.comment()
    ].join('\n');
  };

  // Use browser field resolution for require statements
  if (opts.browserField) {
    var nativeResolve = Module._resolveFilename;
    Module._resolveFilename = function (filename, parent) {
      try {
        // Try to use a browser resolver first...
        return browserResolve.sync(filename, {
          filename: parent.filename,
          paths: parent.paths
        });
      } catch (e) {
        // Otherwise fall back to native; e.g. for Electron requires
        return nativeResolve.call(Module, filename, parent);
      }
    };
  }
};
