/**
 * Reasoning: Date bounds are optional. Empty means no filter. Values are ISO
 * date strings passed straight into searchPosts.
 */
function createDateFilter(options) {
  const root = options.root;

  root.innerHTML = "";

  const fromLabel = document.createElement("label");
  fromLabel.textContent = "From ";
  const fromInput = document.createElement("input");
  fromInput.type = "date";
  fromInput.id = "date-from";
  fromLabel.appendChild(fromInput);

  const toLabel = document.createElement("label");
  toLabel.textContent = "To ";
  const toInput = document.createElement("input");
  toInput.type = "date";
  toInput.id = "date-to";
  toLabel.appendChild(toInput);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.id = "date-clear";
  clearBtn.textContent = "Clear dates";

  root.appendChild(fromLabel);
  root.appendChild(toLabel);
  root.appendChild(clearBtn);

  clearBtn.addEventListener("click", function onClearDates() {
    fromInput.value = "";
    toInput.value = "";
  });

  function getRange() {
    const from = fromInput.value ? fromInput.value + "T00:00:00.000Z" : null;
    const to = toInput.value ? toInput.value + "T23:59:59.999Z" : null;
    return { dateFrom: from, dateTo: to };
  }

  return {
    getRange: getRange,
  };
}
