(function () {
  const typingSound = document.getElementById("typing-sound");
  const deliveredSound = document.getElementById("delivered-sound");
  const openSound = document.getElementById("open-sound");
  const closeSound = document.getElementById("close-sound");

  function play(sound) {
    if (!sound) return;
    if (sound.readyState >= 2) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  window.ChatSounds = {
    typing: () => play(typingSound),
    delivered: () => play(deliveredSound),
    open: () => play(openSound),
    close: () => play(closeSound)
  };
})();
