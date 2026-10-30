/* Einblend-Effekt nur, wenn das Skript wirklich läuft. Meldet sich site.js nicht
   innerhalb von 3 Sekunden, bleibt alles normal sichtbar - nie wieder leere Flächen. */
document.documentElement.classList.add('js');
setTimeout(function(){ if(!window.wyenRevealReady){ document.documentElement.classList.remove('js'); } }, 3000);
