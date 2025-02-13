/**
 *
 * The build process consists of following steps:
 * 1. clean /dist folder
 * 3. copy and minimize images
 * 4. minify and copy all HTML files into $templateCache
 * 5. build index.html
 * 6. minify and copy all JS files
 * 7. copy fonts
 * 8. show build folder size
 *
 */
let templateName = "";
const gulp = require("gulp");
const browserSync = require("browser-sync");
const $ = require("gulp-load-plugins")();
const del = require("del");
const hash = require("gulp-hash-filename");
const replace = require("gulp-replace");
const merge = require("merge-stream");
let environment = "homolog";

const hasPathConfig = process.argv.find(function (arg) {
  const validArgs = [
    "-dev2",
    "-homolog",
    "-prod",
    "-staging",
    "-qa",
    "-release",
  ];

  return validArgs.indexOf(arg) > -1;
});

if (hasPathConfig) {
  environment = hasPathConfig.substring(1);
}

// optimize images
gulp.task("images", function () {
  return gulp
    .src("./images/**/*")
    .pipe($.changed("./dist/images"))
    .pipe(
      $.imagemin({
        optimizationLevel: 3,
        progressive: true,
        interlaced: true,
      })
    )
    .pipe(gulp.dest("./dist/images"));
});

// copy files without
gulp.task("copy-files", function () {
  return gulp
    .src(
      [
        "fonts/**",
        "files/**",
        "languages/**",
        "configs/**",
        "sheets/**",
        "jsons/**",
        "web.config",
      ],
      {
        base: "./",
      }
    )
    .pipe(gulp.dest("./dist"));
});

// copy config file
gulp.task("copy-config", function () {
  return gulp
    .src(["./configs/" + environment + "/config.js"])
    .pipe(gulp.dest("./app"));
});

// browser-sync task, only cares about compiled CSS
gulp.task("browser-sync", function (callback) {
  browserSync({
    server: {
      baseDir: "./",
    },
  });
  callback();
});

gulp.task("copy-fonts", function () {
  const paths = [
    {
      src: "bower_components/components-font-awesome/webfonts/**",
      dest: "./dist/webfonts",
    },
    { src: "bower_components/bootstrap/dist/fonts/**", dest: "./dist/fonts" },
    {
      src: "bower_components/simple-line-icons/fonts/**",
      dest: "./dist/fonts",
    },
    { src: "js/bryntum-scheduler/fonts/**", dest: "./dist/css/fonts" },
    { src: "styles/font/glyphicons/fonts/**", dest: "./dist/fonts" },
    { src: "styles/font/*.{ttf,woff,eof,eot,svg}", dest: "./dist/css" },
    {
      src: "views/tmpl/pages/oauth_callback.html",
      dest: "./dist/views/tmpl/pages",
    },
    { src: "styles/font/mobile-settings/fonts/**", dest: "./dist/css/fonts" },
  ];

  const tasks = paths.map(function (path) {
    return gulp.src(path.src).pipe(gulp.dest(path.dest));
  });

  return merge(tasks);
});

// start webserver
gulp.task(
  "server",
  gulp.series("copy-config", function (done) {
    return browserSync(
      {
        server: {
          baseDir: "./",
        },
      },
      done
    );
  })
);

// start webserver from dist folder to check how it will look in production
gulp.task("server-build", function (done) {
  return browserSync(
    {
      server: {
        baseDir: "./dist/",
      },
    },
    done
  );
});

// delete build folder
gulp.task("clean:build", function () {
  return del([
    "./dist/",
    // if we don't want to clean any file we can use negate pattern
    //'!dist/mobile/deploy.json'
  ]);
});

// concat files
gulp.task("concat", function () {
  return gulp
    .src("./js/*.js")
    .pipe($.concat("scripts.js"))
    .pipe(gulp.dest("./dist/"));
});

// BUGFIX: warning: possible EventEmitter memory leak detected. 11 listeners added.
require("events").EventEmitter.prototype._maxListeners = 100;

// index.html build
// script/css concatenation
gulp.task("usemin", function () {
  return (
    gulp
      .src("./index.html")
      // add templates path
      .pipe(
        $.htmlReplace({
          templates: `<script src="js/${templateName}"></script>`,
          appconfig: `<script src="js/config.js"></script>`,
        })
      )
      .pipe(
        $.usemin({
          bowercss: [$.minifyCss(), "concat", hash()],
          css: [$.minifyCss(), "concat", hash()],
          libs: [hash()],
          bowerlibs: [hash()],
          firstmainapp: [hash()],
          lastmainapp: [hash()],
          appfilters: [hash()],
          appdirectives: [hash()],
          appservices: [hash()],
          appcontrollers: [hash()],
        })
      )
      .pipe(gulp.dest("./dist/"))
  );
});

// make templateCache from all HTML files
gulp.task("templates", function () {
  return gulp
    .src([
      "./**/*.html",
      "!bower_components/**/*.*",
      "!node_modules/**/*.*",
      "!dist/**/*.*",
    ])
    .pipe(
      $.angularTemplatecache({
        module: "wiseviewApp",
      })
    )
    .pipe(replace(/\/views/g, "views"))
    .pipe(hash())
    .pipe(
      $.rename(function (path) {
        templateName = `${path.basename}${path.extname}`;
      })
    )
    .pipe(gulp.dest("dist/js"));
});

// reload all Browsers
gulp.task("bs-reload", function (callback) {
  browserSync.reload();
  callback();
});

// calculate build folder size
gulp.task("build:size", function () {
  var s = $.size();

  return gulp
    .src("./dist/**/*.*")
    .pipe(s)
    .pipe(
      $.notify({
        onLast: true,
        message: function () {
          return "Total build size " + s.prettySize;
        },
      })
    );
});

// default task to be run with `gulp` command
// this default task will run BrowserSync & then use Gulp to watch files.
// when a file is changed, an event is emitted to BrowserSync with the filepath.
gulp.task(
  "default",
  gulp.series("browser-sync", "copy-config", function (done) {
    gulp.watch(["./**/*.html"], { events: "all" }, gulp.series("bs-reload"));
    gulp.watch(
      ["app/**/*.js", "js/**/*.js"],
      { events: "all" },
      gulp.series("bs-reload")
    );
    done();
  })
);

/**
 * build task:
 * 1. clean /dist folder
 * 3. copy and minimize images
 * 4. minify and copy all HTML files into $templateCache
 * 5. build index.html
 * 6. minify and copy all JS files
 * 7. copy fonts
 * 8. show build folder size
 *
 */
gulp.task(
  "build",
  gulp.series(
    "clean:build",
    "copy-files",
    "copy-fonts",
    "images",
    "templates",
    "usemin",
    "build:size",
    (done) => done()
  )
);
