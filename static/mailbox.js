/*
 * Voicemail player
 */
var mailbox = (function() {
    // create an object representing the mailbox DOM
    function createMailbox(selector) {
        var rootElement = document.querySelector(selector);
        var stateElement = rootElement.querySelector('.mailbox-state');
        var positionElement = rootElement.querySelector('.mailbox-position');
        var durationElement = rootElement.querySelector('.mailbox-duration');
        var messageElements = Array.prototype.slice.call(
            rootElement.querySelectorAll('.mailbox-message'));

        // format a second duration to m:ss
        function formatDuration(duration) {
            duration = Math.round(duration);
            var minutes = Math.floor(duration / 60);
            var seconds = duration % 60;
            return minutes + ':' + seconds.toString().padStart(2, '0');
        }

        // set state class of state element
        function setState(state) {
            stateElement.classList.remove('loading');
            stateElement.classList.remove('playing');
            stateElement.classList.remove('paused');
            stateElement.classList.remove('error');
            stateElement.classList.add(state);
        }

        // find elements
        var mailbox = {
            seekElement: rootElement.querySelector('.mailbox-seek'),
            prevElement: rootElement.querySelector('.mailbox-prev'),
            stopElement: rootElement.querySelector('.mailbox-stop'),
            playElement: rootElement.querySelector('.mailbox-play'),
            nextElement: rootElement.querySelector('.mailbox-next'),
            muteElement: rootElement.querySelector('.mailbox-mute'),
            volumeElement: rootElement.querySelector('.mailbox-volume'),
        };

        // set and get position timestamp
        mailbox.position = function(value) {
            if (value !== undefined) {
                mailbox.seekElement.value = value;
                positionElement.innerText = formatDuration(value);
            }
            return mailbox.seekElement.value;
        };

        // set and get position timestamp
        mailbox.duration = function(value) {
            if (value !== undefined) {
                mailbox.seekElement.max = value;
                durationElement.innerText = formatDuration(value);
            }
            return mailbox.seekElement.max;
        };

        // set displayed state to playing
        mailbox.play = function() {
            mailbox.stopElement.disabled = false;
            mailbox.playElement.classList.add('playing');
            setState('playing');
        };

        // set displayed state to paused
        mailbox.pause = function() {
            // retain error indicator if paused
            if (!stateElement.classList.contains('error')) {
                mailbox.playElement.classList.remove('playing');
                setState('paused');
            }
        };

        // stop
        mailbox.stop = function(enabled) {
            mailbox.pause();
            mailbox.position(0);
            mailbox.stopElement.disabled = true;
        };

        // mute
        mailbox.mute = function() {
            mailbox.muteElement.classList.add('muted');
        };

        // unmute
        mailbox.unmute = function() {
            mailbox.muteElement.classList.remove('muted');
        };

        // show loading indicator
        mailbox.loading = function() {
            setState('loading');
        };

        // reset seek bar and show error indicator
        mailbox.error = function() {
            mailbox.stop();
            setState('error');
        };

        // set and get volume
        mailbox.volume = function(value) {
            if (value !== undefined) {
                mailbox.volumeElement.value = value *  mailbox.volumeElement.max;
            }
            return mailbox.volumeElement.value / mailbox.volumeElement.max;
        };

        // enable or disable controls
        mailbox.enable = function(enabled) {
            mailbox.seekElement.disabled = !enabled;
            mailbox.prevElement.disabled = !enabled;
            mailbox.stopElement.disabled = !enabled;
            mailbox.playElement.disabled = !enabled;
            mailbox.nextElement.disabled = !enabled;
            mailbox.muteElement.disabled = !enabled;
            mailbox.volumeElement.disabled = !enabled;
        };

        // extract fields from message elements
        var prevMessage = null;
        mailbox.messages = messageElements.map(function(element) {
            var message = {
                // links to list members
                prev: prevMessage,
                next: null,

                element: element,
                audioUrl: element.getAttribute('data-audio'),
                date: element.querySelector('.mailbox-message-date').innerText,
                memo: element.querySelector('.mailbox-message-memo').innerText,

                // mark selected
                select: function() {
                    element.classList.add('selected');
                },
                // unmark selected
                deselect: function() {
                    element.classList.remove('selected');
                },
            };
            // forward link previous message
            if (message.prev !== null) {
                message.prev.next = message;
            }
            prevMessage = message;
            return message;
        });

        // set default state
        mailbox.stop();
        mailbox.enable(false);

        return mailbox;
    }

    return {
        /*
         */
        init: function(selector) {
            var mailbox = createMailbox(selector);
            var audio = new Audio();
            var selectedMessage = null;
            var muted = false;
            var volume = 1.0;

            // load audio from URL
            function loadAudio(url) {
                audio.src = url;
                audio.load();
            }

            // start audio playback
            function playAudio() {
                var promise = audio.play();

                // ignore errors caused by calling pause() on a non-playing Audio
                if (promise !== undefined) {
                    promise.catch(function(error) {});
                }
            }

            // stop audio playback and seek to beginning
            function stopAudio() {
                audio.pause();
                audio.currentTime = 0.0;
            }

            // mark message as selected
            function selectMessage(message) {
                // deselect previous selection
                if (selectedMessage !== null) {
                    selectedMessage.deselect();
                }

                // mark new selection
                message.select();
                selectedMessage = message;

                // update controls
                mailbox.prevElement.disabled = (message.prev === null);
                mailbox.nextElement.disabled = (message.next === null);
                mailbox.position(0);
            }

            // play a message and mark as selected
            function playMessage(message) {
                selectMessage(message);
                loadAudio(message.audioUrl);
                playAudio();
            }

            // update elements to reflect playback state
            audio.addEventListener('playing', mailbox.play, true);
            audio.addEventListener('pause', mailbox.pause, true);
            audio.addEventListener('ended', mailbox.pause, true);

            // update seek slider to reflect playback position
            audio.addEventListener('loadedmetadata', function(event) {
                mailbox.duration(audio.duration);
            });
            audio.addEventListener('timeupdate', function(event) {
                mailbox.position(audio.currentTime);
            });

            // show state indicator when loading or on error
            audio.addEventListener('waiting', mailbox.loading, true);
            audio.addEventListener('stalled', mailbox.loading, true);
            audio.addEventListener('error', mailbox.error, true);

            // seek to slider value when changed
            mailbox.seekElement.addEventListener('input', function(event) {
                audio.currentTime = mailbox.position();
            });

            // play previous message
            mailbox.prevElement.addEventListener('click', function(event) {
                if (selectedMessage !== null && selectedMessage.prev !== null) {
                    playMessage(selectedMessage.prev);
                }
            });

            // stop playback
            mailbox.stopElement.addEventListener('click', function(event) {
                stopAudio();
                mailbox.stop();
            });

            // toggle playback
            mailbox.playElement.addEventListener('click', function(event) {
                if (selectedMessage !== null) {
                    // reload audio if there was an error
                    if (audio.error) {
                        loadAudio(selectedMessage.audioUrl);
                        playAudio();
                    }

                    // resume
                    else if (audio.paused) {
                        playAudio();

                    // pause
                    } else {
                        audio.pause();
                    }
                }
            });

            // play next message
            mailbox.nextElement.addEventListener('click', function(event) {
                if (selectedMessage !== null && selectedMessage.next !== null) {
                    playMessage(selectedMessage.next);
                }
            });

            // toggle mute
            mailbox.muteElement.addEventListener('click', function(event) {
                // unmute
                if (muted) {
                    muted = false;
                    audio.volume = volume;
                    mailbox.unmute();

                // mute
                } else {
                    muted = true;
                    audio.volume = 0.0;
                    mailbox.mute();
                }
            });

            // set volume on slider change
            mailbox.volumeElement.addEventListener('input', function(event) {
                volume = mailbox.volume();
                if (!muted) {
                    audio.volume = volume;
                }
            });

            // play voicemail when clicked
            mailbox.messages.forEach(function(message) {
                message.element.addEventListener('click', function(event) {
                    playMessage(message);
                });
            });

            // select first message if there is one
            if (mailbox.messages.length > 0) {
                mailbox.volume(volume);
                audio.volume = volume;
                mailbox.enable(true);

                var firstMessage = mailbox.messages[0];
                selectMessage(firstMessage);
                loadAudio(firstMessage.audioUrl);
            }
        }
    };
})();
