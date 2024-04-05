/*
 * Table column sorter
 */
var table = (function() {
    return {
        /*
         * Attach sort listeners to a table.
         *
         * Headers with the attribute "data-type" will have click listeners
         * attached that reorder the table rows. The value of the attribute
         * defines how the items in the column will be compared when sorting:
         *
         * - "text" sorts lexicographically
         * - "number" sorts numerically
         * - "time" sorts by child <time> element chronologically
         * - "duration" sorts by MM:SS time duration
         *
         * The header attribute "data-order" can be set to "ascending" or
         * "descending" to determine the order the rows will be sorted when the
         * column is initially clicked. This defaults to "ascending" if not set.
         *
         * If present, the table attribute "data-sorted-by" will be used to
         * determine which column the data was sorted by in the HTML.
         *
         * Parameters:
         *     selector: CSS selector that identifies the table element
         */
        init: function(selector) {
            var tableElement = document.querySelector(selector);
            var headerElements = tableElement.querySelectorAll('th');
            var tBodyElement = tableElement.tBodies[0];
            var rowElements = Array.from(tBodyElement.rows);

            // determine what column the table is sorted by
            var selectedIndex = parseInt(tableElement.getAttribute('data-sorted-by'));
            var selectedAscending = true;
            if (!Number.isNaN(selectedIndex)) {
                selectedAscending = headerElements[selectedIndex].getAttribute('data-order') !== 'descending';
            }

            // store parsed cell values in a cache to improve performance
            var cellValueCache = new WeakMap();

            // update header classes to reflect selected column and sort order
            function updateHeaders() {
                headerElements.forEach(function(headerElement) {
                    headerElement.classList.remove('selected');
                    headerElement.classList.remove('ascending');
                    headerElement.classList.remove('descending');

                    if (headerElement.cellIndex === selectedIndex) {
                        headerElement.classList.add('selected');
                        if (selectedAscending) {
                            headerElement.classList.add('ascending');
                        } else {
                            headerElement.classList.add('descending');
                        }
                    }
                });
            }

            // re-insert rowElements in the order they are sorted
            function updateRows() {
                rowElements.forEach(function(rowElement) {
                    tBodyElement.removeChild(rowElement);
                    tBodyElement.appendChild(rowElement);
                });
            }

            // get value of a table cell
            function getCellValue(columnType, cellElement) {
                // grab from cache if available
                if (cellValueCache.has(cellElement)) {
                    return cellValueCache.get(cellElement);
                }

                // cache miss -- parse cell contents
                var cellValue = cellElement.innerText;

                if (columnType === 'number') {
                    cellValue = Number.parseFloat(cellValue);

                } else if (columnType === 'time') {
                    var timeElement = cellElement.querySelector('time');
                    if (timeElement) {
                        var dateTime = timeElement.getAttribute('datetime')
                        var cellDate = new Date(dateTime);
                        cellValue = cellDate.valueOf();
                    } else {
                        cellValue = 0;
                    }

                } else if (columnType === 'duration') {
                    var durationParts = cellValue.split(':'); // MM:SS
                    if (durationParts.length === 2) {
                        var minutes = Number.parseInt(durationParts[0]);
                        var seconds = Number.parseInt(durationParts[1]);
                        cellValue = 60 * minutes + seconds;
                    } else {
                        cellValue = 0;
                    }
                }

                // cache for later
                cellValueCache.set(cellElement, cellValue);
                return cellValue;
            }

            // compare the values of 2 table cells
            function compareCells(cellType, ascending, leftCellElement, rightCellElement) {
                var compareValue = 0;

                var leftValue = getCellValue(cellType, leftCellElement);
                var rightValue = getCellValue(cellType, rightCellElement);
                if (cellType === 'text') {
                    compareValue = leftValue.localeCompare(rightValue);
                } else {
                    compareValue = leftValue - rightValue;
                }

                if (!ascending) {
                    compareValue *= -1;
                }

                return compareValue;
            }

            // sort rowElements by the specified column
            function sortRows(columnIndex) {
                // determine what parameters to sort by
                var headerElement = headerElements[columnIndex];
                var columnType = headerElement.getAttribute('data-type');
                var columnOrder = headerElement.getAttribute('data-order');
                var ascending = columnOrder !== 'descending';

                // sort list of row elements
                rowElements.sort(function(leftRowElement, rightRowElement) {
                    return compareCells(columnType, ascending,
                        leftRowElement.cells[columnIndex],
                        rightRowElement.cells[columnIndex]);
                });

                // update what column was last sorted
                selectedIndex = columnIndex;
                selectedAscending = ascending;
            }

            // sort column when header is clicked
            headerElements.forEach(function(headerElement) {
                // skip columns that aren't sortable
                if (!headerElement.hasAttribute('data-type')) {
                    return;
                }

                // sort or reverse column
                headerElement.addEventListener('click', function(event) {
                    var columnIndex = headerElement.cellIndex;
                    if (selectedIndex === columnIndex) {
                        rowElements.reverse();
                        selectedAscending = !selectedAscending;
                    } else {
                        sortRows(columnIndex);
                    }
                    updateHeaders();
                    updateRows();

                    // notify other modules the table has changed
                    tableElement.dispatchEvent(new Event('sort'));
                });
            });

            // mark column of HTML sort order
            updateHeaders();
        }
    };
})();
