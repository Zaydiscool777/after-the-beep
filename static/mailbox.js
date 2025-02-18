/*
 * Voicemail player
 */
var mailbox = (function() {
    // format a second duration to m:ss
    function formatDuration(duration) {
        duration = Math.floor(duration);
        var minutes = Math.floor(duration / 60);
        var seconds = duration % 60;
        return minutes + ':' + seconds.toString().padStart(2, '0');
    }

    // create an object representing the mailbox DOM
    function createMailbox(selector) {
        var rootElement = document.querySelector(selector);
        var marqueeElement = rootElement.querySelector('.mailbox-marquee');
        var stateElement = rootElement.querySelector('.mailbox-state');
        var positionElement = rootElement.querySelector('.mailbox-position');
        var durationElement = rootElement.querySelector('.mailbox-duration');
        var tableElement = rootElement.querySelector('.mailbox-table');
        var rowElements = Array.from(tableElement.tBodies[0].children);

        // set state class of state element
        function setState(state) {
            stateElement.classList.remove('loading', 'playing', 'paused', 'error');
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
            tableElement: tableElement,
            rowElements: rowElements,
            messageMap: new Map()
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
        rowElements.forEach(function(element) {
            var message = {
                element: element,
                id: element.getAttribute('data-id'),
                memo: element.querySelector('.mailbox-message-memo').innerText
            };

            // mark selected
            message.select = function(alignTop) {
                element.classList.add('selected');
                element.scrollIntoView({
                    block: alignTop ? 'start' : 'nearest',
                    inline: 'nearest'
                });
            };

            // unmark selected
            message.deselect = function() {
                element.classList.remove('selected');
            };

            // get previous message
            message.prev = function() {
                if (element.previousElementSibling !== null) {
                    return element.previousElementSibling.message || null;
                }
                return null;
            };

            // get next message
            message.next = function() {
                if (element.nextElementSibling !== null) {
                    return element.nextElementSibling.message || null;
                }
                return null;
            };

            // attach the message to the row element for handlers to use
            element.message = message;

            mailbox.messageMap.set(message.id, message);
        });

        // set default state
        mailbox.stop();
        mailbox.enable(false);

        return mailbox;
    }

    return {
        /*
         * Initialize a mailbox.
         *
         * Parameters:
         *     selector: CSS selector that identifies the mailbox element
         *     audioRoot: path where message audio files are loaded from
         *     onPlay: callback that gets fired when a message is played
         */
        init: function(selector, audioRoot, onPlay) {
            var siteTitle = document.title;
            var mailbox = createMailbox(selector);
            var audio = new Audio();
            var selectedMessage = null;
            var muted = false;
            var volume = 1.0;
            var playing = false;
            audioRoot = audioRoot.replace(/\/+$/, ''); // trim trailing slash

            // load audio from selectedMessage
            function loadAudio() {
                audio.src = audioRoot + '/' + selectedMessage.id + '.mp3';
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

            // update next and previous buttons
            function updateControls() {
                mailbox.prevElement.disabled =
                    selectedMessage === null || selectedMessage.prev() === null;
                mailbox.nextElement.disabled =
                    selectedMessage === null || selectedMessage.next() === null;
            }

            // mark message as selected
            function selectMessage(message, alignTop) {
                if (selectedMessage !== null) {
                    selectedMessage.deselect();
                }

                message.select(alignTop);
                selectedMessage = message;
                playing = false;

                updateControls();
                mailbox.position(0);
                loadAudio();

                window.location.hash = message.id;
                document.title = message.memo + ' | ' + siteTitle;
            }

            // play a message and mark as selected
            function playMessage(message) {
                selectMessage(message, false);
                playAudio();
            }

            // retrieve the message specified in the URL hash
            function getUrlMessage(hash) {
                hash = hash || window.location.hash;
                if (hash !== '') {
                    var hashId = hash.substring(1);
                    return mailbox.messageMap.get(hashId);
                }
                return null;
            }

            // update elements to reflect playback state
            audio.addEventListener('playing', function(event) {
                mailbox.play();

                // fire only on the first play after loading to prevent firing
                // when scrubbing or repeatedly playing/pausing
                if (typeof onPlay !== 'undefined' && !playing) {
                    onPlay({
                        id: selectedMessage.id,
                        memo: selectedMessage.memo
                    });
                    playing = true;
                }
            }, true);
            audio.addEventListener('pause', mailbox.pause, true);
            audio.addEventListener('ended', function(event) {
                playing = false;
                mailbox.pause();
            }, true);

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
                if (selectedMessage !== null) {
                    var prevMessage = selectedMessage.prev();
                    if (prevMessage !== null) {
                        playMessage(prevMessage);
                    }
                }
            });

            // stop playback
            mailbox.stopElement.addEventListener('click', function(event) {
                stopAudio();
                mailbox.stop();
                playing = false;
            });

            // toggle playback
            mailbox.playElement.addEventListener('click', function(event) {
                if (selectedMessage !== null) {
                    // reload audio if there was an error
                    if (audio.error) {
                        loadAudio();
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
                if (selectedMessage !== null) {
                    var nextMessage = selectedMessage.next();
                    if (nextMessage !== null) {
                        playMessage(nextMessage);
                    }
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

            // play voicemail when row is clicked
            mailbox.rowElements.forEach(function(element) {
                element.addEventListener('click', function(event) {
                    var href = event.target.getAttribute('href');

                    // play on message click
                    if (event.target.tagName !== 'A') {
                        playMessage(element.message);

                    // play referenced message for fragment links
                    } else if (href.startsWith('#')) {
                        event.preventDefault();
                        var message = getUrlMessage(href);
                        playMessage(message);
                    }
                });
            });

            // update controls when messages are sorted by table.js
            mailbox.tableElement.addEventListener('sort', function(event) {
                updateControls();
            });

            // set active message when hash changes
            window.addEventListener('hashchange', function(event) {
                // selectMessage() updates the hash which fires this event.
                // don't select a message if the one in the hash is already selected
                var hashId = window.location.hash.substring(1);
                if (hashId === selectedMessage.id) {
                    return;
                }

                var urlMessage = getUrlMessage();
                if (urlMessage !== null) {
                    stopAudio();
                    mailbox.stop();
                    selectMessage(urlMessage, false);
                }
            });

            // select initial message
            window.addEventListener('load', function(event) {
                if (mailbox.rowElements.length > 0) {
                    mailbox.volume(volume);
                    audio.volume = volume;
                    mailbox.enable(true);
                    mailbox.stop();

                    // default to first message
                    var initialMessage = getUrlMessage() || mailbox.rowElements[0].message;
                    selectMessage(initialMessage, true);
                }
            });
        }
    };
})();
