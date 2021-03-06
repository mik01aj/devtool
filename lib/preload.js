(function () {
  var electron = require('electron');
  var path = require('path');
  var serialize = require('serializerr');
  var remote = electron.remote;
  var requireHook = require('./require-hook');

  var ipc = electron.ipcRenderer;
  var _process = remote.process;
  var cwd = _process.cwd();

  // setup renderer process to look a bit more like node
  process.chdir(cwd);
  process.argv = _process.argv;
  process.exit = _process.exit.bind(_process);

  // if we should pipe DevTools console back to terminal
  if (remote.getGlobal('__electronConsoleHook')) {
    require('console-redirect/process');
  }

  // in DevTools console (i.e. REPL), these will be
  // undefined to mimic Node REPL
  delete global.__dirname;
  delete global.__filename;

  // When there is an uncaught exception in the entry
  // script, we may want to quit the devtool (i.e. for CI)
  // or just print an error in DevTools console (i.e. for dev)
  var shouldQuit = remote.getGlobal('__shouldElectronQuitOnError');
  if (shouldQuit) {
    window.onerror = function (a, b, c, d, err) {
      fatalError(err);
      return true;
    };
  }

  // get an absolute path to our entry point
  var entry = remote.getGlobal('__electronEntryFile');
  if (entry) {
    entry = path.isAbsolute(entry) ? entry : path.resolve(cwd, entry);    
  }

  // hook into the internal require for a few features:
  //  - better error reporting on syntax errors and missing modules
  //  - require.main acts like node.js CLI
  //  - add source maps so the files show up in DevTools Sources
  requireHook({
    entry: entry,
    basedir: cwd,
    browserField: remote.getGlobal('__electronBrowserResolve')
  }, function (err) {
    if (err && shouldQuit) {
      fatalError(err);
    }
  });

  // boot up entry application when DOM is ready
  ipc.on('dom-ready', function () {
    if (entry) require(entry);
  });

  function fatalError (err) {
    ipc.send('error', JSON.stringify(serialize(err)));
  }
})();
