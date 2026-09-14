/* Mobile-Navigation: Burger-Menü öffnen/schließen. Auf allen Seiten eingebunden. */
(function(){
  var nav = document.querySelector('nav');
  var toggle = nav && nav.querySelector('.nav-toggle');
  if(!nav || !toggle) return;
  function close(){ nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }
  function open(){ nav.classList.add('open'); toggle.setAttribute('aria-expanded','true'); }
  toggle.addEventListener('click', function(e){
    e.stopPropagation();
    if(nav.classList.contains('open')){ close(); } else { open(); }
  });
  nav.querySelectorAll('ul a').forEach(function(a){ a.addEventListener('click', close); });
  document.addEventListener('click', function(e){
    if(nav.classList.contains('open') && !nav.contains(e.target)){ close(); }
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ close(); } });
})();
