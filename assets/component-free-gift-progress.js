if (typeof FreeGiftProgress !== 'function') {

  function formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || '{{amount}}';

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number === null) return 0;
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsAmount = parts[1] ? decimal + parts[1] : '';
      return dollarsAmount + centsAmount;
    }

    var match = formatString.match(placeholderRegex);
    if (match) {
      switch (match[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = formatWithDelimiters(cents, 0, ' ');
          break;
        case 'amount_with_apostrophe_separator':
          value = formatWithDelimiters(cents, 2, "'");
          break;
        default:
          value = formatWithDelimiters(cents, 2);
      }
      return formatString.replace(placeholderRegex, value);
    }
    return String(cents / 100);
  }

  class FreeGiftProgress extends HTMLElement {
    constructor() {
      super();
      this.init();
    }

    init() {
      var goalCents = parseInt(this.getAttribute('data-goal'), 10) || 0;
      var cartTotal = parseInt(this.getAttribute('data-cart-total'), 10) || 0;
      var moneyFormat = (window.KROWN && window.KROWN.settings && window.KROWN.settings.shop_money_format) || '{{amount}}';

      if (goalCents <= 0) {
        this.style.display = 'none';
        return;
      }

      var textEl = this.querySelector('[data-js-free-gift-text]');
      var barEl = this.querySelector('[data-js-free-gift-slider]');

      var remaining = goalCents - cartTotal;
      var progressPct;

      if (remaining <= 0) {
        progressPct = 100;
        if (textEl) textEl.textContent = this.getAttribute('data-text-qualified') || 'Sie haben sich ein Gratisgeschenk verdient!';
      } else {
        progressPct = Math.min(100, Math.round((cartTotal / goalCents) * 100));
        var formattedRemaining = formatMoney(remaining, moneyFormat);
        if (!formattedRemaining && formattedRemaining !== 0) {
          formattedRemaining = (remaining / 100).toFixed(2).replace('.', ',') + ' €';
        }
        var textTemplate = this.getAttribute('data-text-remaining') || 'Noch %amount% bis zu Ihrem Gratisgeschenk';
        if (textEl) textEl.textContent = textTemplate.replace(/%amount%/g, formattedRemaining);
      }

      if (barEl) barEl.style.width = progressPct + '%';
    }
  }

  if (typeof customElements.get('free-gift-progress') === 'undefined') {
    customElements.define('free-gift-progress', FreeGiftProgress);
  }
}
