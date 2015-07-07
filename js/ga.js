  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

if (window.location.host != 'localhost') {
  ga('create', 'UA-54497476-7', 'auto');
  ga('send', 'pageview');

  // Track basic JavaScript errors
  window.addEventListener('error', function(e) {
      _gaq.push([
          '_trackEvent',
          'JavaScript Error',
          e.message,
          e.filename + ':  ' + e.lineno,
          true
      ]);
  });

  // Track AJAX errors (jQuery API)
  $(document).ajaxError(function(e, request, settings) {
      _gaq.push([
          '_trackEvent',
          'Ajax error',
          settings.url,
          e.result,
          true
      ]);
  });

}
