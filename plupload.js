(function($) {

Drupal.plupload = Drupal.plupload || {};

/**
 * Attaches the Plupload behavior to each Plupload form element.
 */
Drupal.behaviors.plupload = {
  attach: function (context, settings) {
    $(".plupload-element", context).once('plupload-init', function () {
      var $this = $(this);

      // Merge the default settings and the element settings to get a full
      // settings object to pass to the Plupload library for this element.
      var id = $this.attr('id');
      var defaultSettings = settings.plupload['_default'] ? settings.plupload['_default'] : {};
      var elementSettings = (id && settings.plupload[id]) ? settings.plupload[id] : {};
      var pluploadSettings = $.extend({}, defaultSettings, elementSettings);

      // Do additional requirements testing to prevent a less than ideal runtime
      // from being used. For example, the Plupload library treats Firefox 3.5
      // as supporting HTML 5, but this is incorrect, because Firefox 3.5
      // doesn't support the 'multiple' attribute for file input controls. So,
      // if settings.plupload._requirements.html5.mozilla = '1.9.2', then we
      // remove 'html5' from pluploadSettings.runtimes if $.browser.mozilla is
      // true and if $.browser.version is less than '1.9.2'.
      if (settings.plupload['_requirements'] && pluploadSettings.runtimes) {
        var runtimes = pluploadSettings.runtimes.split(',');
        var filteredRuntimes = [];
        for (var i = 0; i < runtimes.length; i++) {
          var includeRuntime = true;
          if (settings.plupload['_requirements'][runtimes[i]]) {
            var requirements = settings.plupload['_requirements'][runtimes[i]];
            for (var browser in requirements) {
              if ($.browser[browser] && Drupal.plupload.compareVersions($.browser.version, requirements[browser]) < 0) {
                includeRuntime = false;
              }
            }
          }
          if (includeRuntime) {
            filteredRuntimes.push(runtimes[i]);
          }
        }
        pluploadSettings.runtimes = filteredRuntimes.join(',');
      }

      // Initialize Plupload for this element.
      $this.pluploadQueue(pluploadSettings);

      // Intercept the form submit to ensure all files are done uploading first.
      var $form = $this.closest('form');
      var originalFormAttributes = {
        'method': $form.attr('method'),
        'enctype': $form.attr('enctype'),
        'action': $form.attr('action'),
        'target': $form.attr('target')
      };
      $form.submit(function(e) {
        var uploader = $('.plupload-element', this).pluploadQueue();

        // Only allow the submit to proceed if there are files and they've all
        // completed uploading.

        // @todo Implement a setting for whether the field is required, rather
        //   than assuming that all are.
        // @done vingborg
        if (uploader.files.length == 0 && !pluploadSettings.required) {
          for (var attr in originalFormAttributes) {
            $form.attr(attr, originalFormAttributes[attr]);
          }
          return;
        }

        if (uploader.files.length > 0 && uploader.total.uploaded == uploader.files.length) {
          // Plupload's html4 runtime has a bug where it changes the attributes
          // of the form to handle the file upload, but then fails to change
          // them back after the upload is finished.
          for (var attr in originalFormAttributes) {
            $form.attr(attr, originalFormAttributes[attr]);
          }
          return;
        }

        // If we're here, stop the form submit, and perform logic as appropriate
        // to the current upload state.
        e.preventDefault();
        if (uploader.files.length == 0) {
          alert('You must at least upload one file.');
        }
        else if (uploader.state == plupload.STARTED) {
          alert('Your files are currently being uploaded. Please wait until they are finished before submitting this form.');
        }
        else {
          var stateChangedHandler = function() {
            if (uploader.total.uploaded == uploader.files.length) {
              // Plupload's html4 runtime has a bug where it changes the
              // attributes of the form to handle the file upload, but then
              // fails to change them back after the upload is finished.
              for (var attr in originalFormAttributes) {
                $form.attr(attr, originalFormAttributes[attr]);
              }
              uploader.unbind('StateChanged', stateChangedHandler);
              $form.submit();
            }
          };
          uploader.bind('StateChanged', stateChangedHandler);
          uploader.start();
        }
      });
    });
  }
}

/**
 * Helper function to compare version strings.
 *
 * Returns one of:
 *   - A negative integer if a < b.
 *   - A positive integer if a > b.
 *   - 0 if a == b.
 */
Drupal.plupload.compareVersions = function (a, b) {
  a = a.split('.');
  b = b.split('.');
  // Return the most significant difference, if there is one.
  for (var i=0; i < Math.min(a.length, b.length); i++) {
    var compare = parseInt(a[i]) - parseInt(b[i]);
    if (compare != 0) {
      return compare;
    }
  }
  // If the common parts of the two version strings are equal, the greater
  // version number is the one with the most sections.
  return a.length - b.length;
}

})(jQuery);
