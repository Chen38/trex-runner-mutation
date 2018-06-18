const gulp = require('gulp');
const pump = require('pump');
const $ = require('gulp-load-plugins')();
const bs = require('browser-sync');
const sort = require('sort-stream');

gulp.task('refresh', () => {
  bs.init({
    files: [ './index.html', './js/*.js', './css/*.css' ],
    server: {
      baseDir: ['./']
    },
    notify: false,
    open: false,
    port: 2374
  });
});

gulp.task('devInject', () => {
  let target = gulp.src('./index.html');
  let sources = gulp.src(['./css/*.css', './js/*.js'], {read: false});

  let sortStream = sources.pipe(sort((a, b) => {
    return 1;
  }));

  target.pipe($.inject(sortStream, {relative: true}))
        .pipe(gulp.dest('./'));
});

gulp.task('dev', ['refresh', 'devInject']);

gulp.task('concatCSS', () => {
  gulp.src('./css/*.css')
      .pipe($.concat('runner.css'))
      .pipe($.cleancss())
      .pipe(gulp.dest('./dist'));
});

gulp.task('concatJS', () => {
  let sources = gulp.src('./js/*.js');
  let sortStream = sources.pipe(sort((a, b) => {
    return 1;
  }));

  pump([
    sortStream,
    $.concat('runner.js'),
    $.uglify().on('error', (err) => {
      console.log(err);
    }),
    gulp.dest('./dist')
  ]);
});

gulp.task('build', ['concatCSS', 'concatJS']);

gulp.task('buildInject', () => {
  gulp.src('./index.html')
      .pipe($.inject(gulp.src(['./dist/*.css', './dist/*.js'], {read: false}), {
        relative: true,
        ignorePath: 'dist',
        addRootSlash: false
      }))
      .pipe(gulp.dest('./dist'))
});
