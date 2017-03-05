gulp = require('gulp')
browserify = require('browserify')
source = require('vinyl-source-stream')
glob = require('glob')
fs = require('fs')

gulp.task('plugin', ()->
	glob("plugin/src/*.js", (err, files)->
		done err if err

		tasks = files.map((entry)->
			path = entry.replace("plugin/src", "plugin/built")
			console.log path
			browserify({entries: [entry]})
				.bundle()
				.on('error', (e)->
					console.log e.toString()
					console.log e.stack
				)
				.pipe(source(path))
				.pipe(gulp.dest(''))
		)
	)
)

gulp.task('watch', ()->
	gulp.watch('plugin/src/*.js', ['plugin'])
)
