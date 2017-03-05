(function() {
  var browserify, fs, glob, gulp, source;

  gulp = require('gulp');

  browserify = require('browserify');

  source = require('vinyl-source-stream');

  glob = require('glob');

  fs = require('fs');

  gulp.task('plugin', function() {
    return glob("plugin/src/*.js", function(err, files) {
      var tasks;
      if (err) {
        done(err);
      }
      return tasks = files.map(function(entry) {
        var path;
        path = entry.replace("plugin/src", "plugin/built");
        console.log(path);
        return browserify({
          entries: [entry]
        }).bundle().on('error', function(e) {
          console.log(e.toString());
          return console.log(e.stack);
        }).pipe(source(path)).pipe(gulp.dest(''));
      });
    });
  });

  gulp.task('watch', function() {
    return gulp.watch('plugin/src/*.js', ['plugin']);
  });

}).call(this);
