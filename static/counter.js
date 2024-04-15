/*
 * Neocities view counter
 * This script requires the use of a CORS proxy to be used on Neocities pages.
 */
var counter = (function() {
    // make an async HTTP request
    function sendRequest(method, url, headers, onDone) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == request.DONE && request.status === 200) {
                onDone(request);
            }
        };
        request.open(method, url, true);
        for (var i = 0; i < headers.length; ++i) {
            var name = headers[i][0];
            var value = headers[i][1];
            if (value !== '') {
                request.setRequestHeader(name, value);
            }
        }
        request.send();
    }

    return {
        /*
         * Initialize a hit counter by fetching a the site view count from a
         * proxy of the Neocities API, rendering each digit using a callback,
         * and placing the rendered markup in a container element.
         *
         * The markup template for each digit is defined in the page as a
         * callback function. The following creates an IMG tag for each digit:
         *
         * function render(digit) {
         *     return '<img src="/' + digit + '.gif" alt="' + digit + '" />';
         * }
         *
         * The API host is a server that proxies requests to the neocities API
         * and injects CORS headers into the returned responses. The path
         * /info must supply the same format as a call to
         * https://neocities.org/api/info.
         *
         * Parameters;
         *     selector: CSS selector that identifies the container element
         *     renderFunction: function that converts a digit to an element
         *     apiUrl: URL of site API
         *     siteName: neocities site name
         */
        init: function(selector, renderFunction, apiUrl, siteName) {
            var rootElement = document.querySelector(selector);
            var infoUrl = apiUrl + '/info?sitename=' + siteName;

            // add analytics information
            var headers = [
                ['X-Document-Referrer', document.referrer]
            ];

            sendRequest('GET', infoUrl, headers, function(request) {
                var json = JSON.parse(request.responseText);
                var viewCount = json.info.views;
                var countDigits = viewCount.toString().split('');
                var digitHtml = countDigits.map(renderFunction).join('');
                rootElement.innerHTML = digitHtml;
            });
        }
    }
})();
