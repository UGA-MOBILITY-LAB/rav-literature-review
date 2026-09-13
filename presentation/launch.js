(function () {
  'use strict';
  var button = document.getElementById('presentation-open');
  if (new URLSearchParams(location.search).get('presentation') === 'embedded') {
    button.hidden = true; button.style.display = "none";
    return;
  }
  var dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Guided presentation');
  dialog.style.cssText = 'padding:0;border:0;max-width:none;max-height:none;width:100vw;height:100dvh;background:white;overflow:hidden;';
  var frame = document.createElement('iframe');
  frame.title = 'Review and progressive explanation';
  frame.allow = 'fullscreen';
  frame.style.cssText = 'display:block;width:100%;height:100%;border:0;';
  dialog.appendChild(frame);
  document.body.appendChild(dialog);
  window.RAVClosePresentation = function () { dialog.close(); };
  var savedOverflow;
  button.addEventListener('click', function () {
    if (!frame.src) frame.src = 'presentation/index.html?v=20260913k';
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
  });
  dialog.addEventListener('close', function () {
    document.documentElement.style.overflow = savedOverflow || '';
    button.focus();
  });
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === 'rav-exit-presentation') dialog.close();
  });
})();
