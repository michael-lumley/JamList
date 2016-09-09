gulp = require('gulp')
source = require('vinyl-source-stream')
rename = require('gulp-rename')
browserify = require('browserify')
glob = require('glob')
es = require('event-stream')
polybuild = require('polybuild')
coffee = require('gulp-coffee')

gulp.task('devBuild', (done)->
  gulp.watch("client/src/deps.html", (e)=>
    gulp.src(e.path)
      .pipe(polybuild())
      .pipe(gulp.dest('client/src'))
  )

  gulp.watch("client/src/coffee/*.coffee", (e)=>
    return browserify(e.path)
      .bundle()
      .pipe(source(e.path))
      .pipe(rename((path)->
        path.dirname = "/"
        path.extname = ".js"
      ))
      .pipe(gulp.dest('client/src/js'))
  )

  gulp.watch("client/src/app.coffee", (e)=>
    return browserify(e.path)
      .bundle()
      .pipe(source(e.path))
      .pipe(rename((path)->
        path.dirname = "/"
        path.extname = ".js"
      ))
      .pipe(gulp.dest('client/src'))
  )

  gulp.watch("common/models/*.coffee", (e)=>
    gulp.src('common/models/*.coffee')
      .pipe(coffee({bare: true}))
      .pipe(gulp.dest('common/models'))
  )

  gulp.watch("client/src/elements/**/*.coffee", (e)=>
    console.log e.path
    return browserify(e.path)
      .bundle()
      .pipe(source(e.path))
      .pipe(rename((path)->
        console.log path
        path.dirname += ""
        path.extname = ".js"
      ))
      .pipe(gulp.dest(""))
  )
)

gulp.task('export', (done)->
  #Export Manifest
  #Compile JS
  #Compile app
)

gulp.task('browserify', (done)->
  glob("client/src/coffee/*.coffee", (err, files)->
    if err then done err
    tasks = files.map((entry)->
      return browserify({entries: [entry]})
        .bundle()
        .pipe(source(entry))
        .pipe(rename((path)->
          path.dirname = "/"
          path.extname = ".bundle.js"
        ))
        .pipe(gulp.dest('client/src/built'))
    )
    es.merge(tasks).on('end', done)
  )
)

gulp.task('polybuild', (done)->
  gulp.src("client/src/elements/*/*.html")
    .pipe(polybuild())
    .pipe(gulp.dest('client/src/built/elements'))
)

gulp.task('watch', ()->
  gulp.watch('client/src/**/*.coffee', ['uncoffee']);
)
