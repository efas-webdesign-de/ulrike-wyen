/* Gemeinsame Skripte für alle Seiten: Einblenden beim Scrollen + „mehr lesen“. */

const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in-view');
      io.unobserve(e.target);
    }
  });
}, {threshold:0.15});
document.querySelectorAll('.card, .proj-card').forEach((c,i)=>{
  if(c.closest('.rail-track')) return;   // Karten in Bahnen: die Bahn wird als Ganzes eingeblendet
  c.style.transitionDelay = (i%6*70)+'ms';
  io.observe(c);
});
document.querySelectorAll('.proj-rail').forEach(function(r){ io.observe(r); });
document.querySelectorAll('.ps-gallery').forEach(function(gallery){
  gallery.querySelectorAll('img').forEach(function(img, i){
    img.style.transitionDelay = (i*80)+'ms';   // Verzögerung je Galerie neu, nicht über die ganze Seite
    io.observe(img);
  });
});
window.wyenRevealReady = true;   // Einblenden ist eingerichtet - Sicherheitsnetz im <head> wird nicht gebraucht

/* „mehr lesen" für lange Textblöcke (.rt). Ohne JS bleibt der volle Text sichtbar. */
(function(){
  document.querySelectorAll('.rt').forEach(function(el){
    var limit = parseFloat(getComputedStyle(el).fontSize) * 5; // ~5em = Klapphöhe
    if(el.scrollHeight <= limit + 8) return; // schon kurz genug -> kein Button
    el.classList.add('is-collapsed');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rt-more';
    btn.textContent = 'mehr lesen';
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', function(){
      var collapsed = el.classList.toggle('is-collapsed');
      btn.textContent = collapsed ? 'mehr lesen' : 'weniger anzeigen';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
    el.insertAdjacentElement('afterend', btn);
  });
})();

/* Platzhalter-Knöpfe (WhatsApp / Instagram): noch ohne Ziel, kurzer Hinweis beim Klick.
   Beim Verknüpfen einfach data-soon entfernen und die echte Adresse eintragen. */
(function(){
  var hint = document.getElementById('dockHint');
  var timer;
  document.querySelectorAll('[data-soon]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      if(!hint) return;
      hint.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(function(){ hint.hidden = true; }, 3000);
    });
  });
})();

/* FAQ: Frage anklicken -> Antwort rechts im Feld (am Handy klappt sie unter der Frage auf). */
(function(){
  var list = document.querySelector('.faq-list');
  if(!list) return;
  var panelQ = document.querySelector('.faq-panel-q');
  var panelA = document.querySelector('.faq-panel-a');
  var btns = [].slice.call(list.querySelectorAll('.faq-q'));
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var offen = btn.getAttribute('aria-expanded') === 'true';
      var schmal = window.matchMedia('(max-width:820px)').matches;
      if(schmal && offen){                       // am Handy wieder zuklappen
        btn.setAttribute('aria-expanded','false');
        document.getElementById(btn.getAttribute('aria-controls')).hidden = true;
        return;
      }
      btns.forEach(function(b){
        var auf = b === btn;
        b.setAttribute('aria-expanded', auf ? 'true' : 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = !auf;
      });
      if(panelQ && panelA){
        panelQ.textContent = btn.querySelector('span').textContent;
        panelA.textContent = document.getElementById(btn.getAttribute('aria-controls')).textContent.trim();
      }
    });
  });
})();

/* Projekt-Bahnen: Pfeile links/rechts, Randverlauf nur dort, wo noch Karten folgen. */
(function(){
  document.querySelectorAll('.proj-rail').forEach(function(rail){
    var track = rail.querySelector('.rail-track');
    if(!track) return;
    function zustand(){
      var rest = track.scrollWidth - track.clientWidth;
      rail.classList.toggle('can-prev', track.scrollLeft > 8);
      rail.classList.toggle('can-next', track.scrollLeft < rest - 8);
    }
    function schritt(richtung){
      var karte = track.querySelector('.proj-card');
      var weite = karte ? karte.getBoundingClientRect().width + 28 : track.clientWidth * 0.8;
      track.scrollBy({ left: richtung * weite, behavior: 'smooth' });
    }
    rail.querySelector('.rail-nav.prev').addEventListener('click', function(){ schritt(-1); });
    rail.querySelector('.rail-nav.next').addEventListener('click', function(){ schritt(1); });
    track.addEventListener('scroll', zustand, { passive: true });
    window.addEventListener('resize', zustand);
    zustand();
  });
})();
