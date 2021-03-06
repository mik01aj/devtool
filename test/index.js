var spawn = require('cross-spawn-async');
var path = require('path');
var concat = require('concat-stream');

var cmd = path.resolve(__dirname, '..', 'bin', 'index.js');
var test = require('tape');

setup('process.argv', 'argv.js', JSON.stringify([
  path.resolve(__dirname, 'fixtures', 'argv.js'),
  '--foobar'
]), [ '--foobar' ]);

setup('process.cwd()', 'cwd.js', process.cwd(), [ ]);
setup('require.main', 'main.js', 'is main');
setup('browser field resolution enabled', 'browser-field.js', 'browser', [ '--browser-field' ]);
setup('browser field resolution disabled', 'browser-field.js', 'node', [ ]);
setup('index.html', 'close.js', 'beep boop\n', [
  '--console',
  '--index',
  path.resolve(__dirname, 'fixtures', 'index.html')
]);
setup('require.main from other module', 'main-other.js', 'is not main');

exitCode('exit code 0', 'exit-0.js', 0);
exitCode('exit code 1', 'exit-1.js', 1);
exitCode('quits on error', 'quit-on-error.js', 1, [ '--quit' ]);

test('console redirection', function (t) {
  t.plan(2);
  t.timeoutAfter(4000);

  var entry = [ path.resolve(__dirname, 'fixtures', 'console.js') ];
  var proc = spawn(cmd, entry.concat([ '--console' ]));
  proc.stdout.pipe(concat(function (body) {
    t.equal(body.toString(), 'beep boop\n');
  }));
  proc.stderr.pipe(concat(function (body) {
    t.equal(body.toString(), 'foobaz\n');
  }));
});

function setup (msg, inputFile, outputStr, args) {
  args = args || [];
  test(msg, function (t) {
    t.plan(1);
    t.timeoutAfter(4000);

    var entry = [ path.resolve(__dirname, 'fixtures', inputFile) ];
    var proc = spawn(cmd, entry.concat(args));
    proc.stdout.pipe(concat(function (body) {
      t.equal(body.toString(), outputStr);
    }));
  });
}

function exitCode (msg, inputFile, expectedCode, args) {
  args = args || [];
  test(msg, function (t) {
    t.plan(1);
    t.timeoutAfter(4000);

    var entry = [ path.resolve(__dirname, 'fixtures', inputFile) ];
    var proc = spawn(cmd, entry.concat(args));
    proc.on('close', function (code) {
      t.equal(code, expectedCode, 'matches exit code');
    });
  });
}
