/* Startseite: Hero-Bildwechsel und Kontaktformular (Netlify Forms). */
// Horizontaler Wisch-Übergang im Hero: das neue Bild schiebt sich
// von rechts über das aktuelle. Zwei Ebenen wechseln sich als
// "eingeblendet" (vorne, sichtbar) und "wartend" (rechts außerhalb) ab.
(function(){
  const images = ['assets/img/kueche_clouth.jpg', 'assets/img/wohnen_schoser.jpg', 'assets/img/wohnen_schoser_regal.jpg'];
  const slideEls = [document.getElementById('heroA'), document.getElementById('heroB')];
  const zoomEls = slideEls.map(el => el.querySelector('.zoom-layer'));
  let idx = 0;
  let front = 0; // Index (0/1) der Ebene, die gerade sichtbar/vorne ist

  function setImage(layerIndex, imageIndex){
    zoomEls[layerIndex].style.backgroundImage = `url(${images[imageIndex]})`;
  }
  // Startet den Zoom-Effekt exakt in dem Moment, in dem ein Bild sichtbar wird
  // (nicht schon während es rechts außerhalb wartet - sonst ist der Zoom
  // beim Einschieben bereits abgelaufen).
  function restartZoom(layerIndex){
    zoomEls[layerIndex].style.animation = 'none';
    void zoomEls[layerIndex].offsetWidth;
    zoomEls[layerIndex].style.animation = '';
  }

  // Start: Ebene 0 sichtbar mit Bild 0, Ebene 1 wartet rechts mit Bild 1
  // Erstes Bild steht beim Laden sofort - ohne Einschieben. Der Wischeffekt beginnt erst beim Wechsel.
  slideEls.forEach(el => { el.style.transition = 'none'; });
  setImage(0, 0);
  restartZoom(0);
  slideEls[0].style.transform = 'translateX(0)';
  slideEls[0].style.zIndex = 1;
  setImage(1, 1 % images.length);
  slideEls[1].style.transform = 'translateX(100%)';
  slideEls[1].style.zIndex = 2;
  void slideEls[0].offsetWidth;
  slideEls.forEach(el => { el.style.transition = ''; });

  function tick(){
    const back = front === 0 ? 1 : 0; // die wartende Ebene wird zur einschiebenden
    idx = (idx + 1) % images.length;

    restartZoom(back); // Zoom startet jetzt, im Moment des Einschiebens
    slideEls[back].style.zIndex = 2;      // schiebt sich über die aktuelle
    slideEls[front].style.zIndex = 1;
    slideEls[back].style.transform = 'translateX(0)'; // Wisch-Bewegung ins Bild

    setTimeout(() => {
      // die jetzt verdeckte, alte Ebene lautlos rechts außen parken
      // und mit dem übernächsten Bild bestücken (Zoom erst beim nächsten Einsatz starten)
      slideEls[front].style.transition = 'none';
      slideEls[front].style.transform = 'translateX(100%)';
      void slideEls[front].offsetWidth;
      slideEls[front].style.transition = '';
      const nextIdx = (idx + 1) % images.length;
      setImage(front, nextIdx);
      front = back;
    }, 2500);
  }
  setInterval(tick, 9000);
})();


/* Kontaktformular: sendet an Netlify Forms (data-netlify="true").
   Dafür muss in Netlify unter „Forms" die Formularerfassung aktiviert sein. */
(function(){
  const form = document.getElementById('wyenContactForm');
  if(!form) return;
  const wrap = document.getElementById('kontaktForm');
  const status = document.getElementById('kfStatus');
  function encode(data){
    return Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(form.querySelector('#kf-website').value){ return; } // Honeypot ausgelöst
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode(payload)
    }).then(() => {
      status.textContent = 'Danke für Ihre Nachricht! Ich melde mich so schnell wie möglich bei Ihnen zurück.';
      status.classList.add('is-success');
      wrap.classList.add('is-sent');
    }).catch(() => {
      status.textContent = 'Leider konnte Ihre Nachricht nicht gesendet werden. Bitte schreiben Sie mir direkt an interior@wyen.net.';
      status.style.display = 'block';
      status.style.background = 'rgba(200,60,40,0.08)';
      status.style.color = '#8a2b1c';
      status.style.border = '1px solid rgba(200,60,40,0.25)';
    });
  });
})();
