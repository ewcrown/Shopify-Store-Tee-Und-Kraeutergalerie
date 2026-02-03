if (typeof CartProgressGoals !== 'function') {

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || '{{amount}}';

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number === null) return '0';
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsAmount = parts[1] ? decimal + parts[1] : '';
      return dollarsAmount + centsAmount;
    }

    var match = formatString.match(placeholderRegex);
    if (match) {
      switch (match[1]) {
        case 'amount': value = formatWithDelimiters(cents, 2); break;
        case 'amount_no_decimals': value = formatWithDelimiters(cents, 0); break;
        case 'amount_with_comma_separator': value = formatWithDelimiters(cents, 2, '.', ','); break;
        case 'amount_no_decimals_with_comma_separator': value = formatWithDelimiters(cents, 0, '.', ','); break;
        case 'amount_no_decimals_with_space_separator': value = formatWithDelimiters(cents, 0, ' '); break;
        case 'amount_with_apostrophe_separator': value = formatWithDelimiters(cents, 2, "'"); break;
        default: value = formatWithDelimiters(cents, 2);
      }
      return formatString.replace(placeholderRegex, value);
    }
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  }

  class CartProgressGoals extends HTMLElement {
    constructor() {
      super();
      this.init();
    }

    init() {
      var cartTotal = parseInt(this.getAttribute('data-cart-total'), 10) || 0;
      var shippingGoal = parseInt(this.getAttribute('data-shipping-goal'), 10) || 0;
      var giftGoal = parseInt(this.getAttribute('data-gift-goal'), 10) || 0;
      var maxGoal = parseInt(this.getAttribute('data-max-goal'), 10) || Math.max(shippingGoal, giftGoal, 1);
      var moneyFormat = (window.KROWN && window.KROWN.settings && window.KROWN.settings.shop_money_format) || '{{amount}}';

      var textEl = this.querySelector('[data-js-cart-progress-text]');
      var fillEl = this.querySelector('[data-js-cart-progress-fill]');
      var labelsEl = this.querySelector('[data-js-cart-progress-labels]');
      var markerShipping = this.querySelector('[data-js-marker-shipping]');
      var markerGift = this.querySelector('[data-js-marker-gift]');

      var progressPct = Math.min(100, Math.round((cartTotal / maxGoal) * 100));
      if (fillEl) fillEl.style.width = progressPct + '%';

      var fmt = function(c) { return formatMoney(c, moneyFormat); };

      var parts = [];
      if (textEl) {
        var textProgress = (this.getAttribute('data-text-progress') || '%current% von %goal%')
          .replace('%current%', fmt(cartTotal))
          .replace('%goal%', fmt(maxGoal));
        textEl.textContent = textProgress;
      }

      if (labelsEl && (shippingGoal > 0 || giftGoal > 0)) {
        var labels = [];
        if (shippingGoal > 0) {
          var shippingReached = cartTotal >= shippingGoal;
          labels.push(shippingReached ? (this.getAttribute('data-text-shipping-done') || '✓ Kostenloser Versand') : (this.getAttribute('data-text-shipping-remaining') || 'Noch %amount% bis kostenloser Versand').replace('%amount%', fmt(shippingGoal - cartTotal)));
        }
        if (giftGoal > 0) {
          var giftReached = cartTotal >= giftGoal;
          labels.push(giftReached ? (this.getAttribute('data-text-gift-done') || '✓ Gratisgeschenk') : (this.getAttribute('data-text-gift-remaining') || 'Noch %amount% bis Gratisgeschenk').replace('%amount%', fmt(giftGoal - cartTotal)));
        }
        labelsEl.innerHTML = labels.map(function(l) {
          return '<span class="cart-progress-goals__label">' + l + '</span>';
        }).join(' • ');
      }

      if (markerShipping && shippingGoal > 0 && maxGoal > 0) {
        markerShipping.style.left = Math.min(100, (shippingGoal / maxGoal) * 100) + '%';
      }
      if (markerGift && giftGoal > 0 && maxGoal > 0 && giftGoal !== shippingGoal) {
        markerGift.style.left = Math.min(100, (giftGoal / maxGoal) * 100) + '%';
      }
    }
  }

  if (typeof customElements.get('cart-progress-goals') === 'undefined') {
    customElements.define('cart-progress-goals', CartProgressGoals);
  }
}
