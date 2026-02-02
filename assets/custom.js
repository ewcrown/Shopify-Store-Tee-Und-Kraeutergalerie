/**
 * Custom free-product offer: automatically add free product when cart total
 * >= minimum (custom_integer in €). Uses KROWN.settings.custom.
 */
(function () {
  'use strict';

  const CART_JSON = '/cart.js';
  const OFFER_ID = 'custom-free-product-offer';
  var autoAddInProgress = false;
  var autoRemoveInProgress = false;

  function getConfig() {
    return window.KROWN && window.KROWN.settings && window.KROWN.settings.custom;
  }

  function isConfigured(config) {
    return config &&
      config.free_product_id &&
      config.free_product_variant_id;
  }

  function fetchCart() {
    return fetch(CART_JSON).then(function (r) { return r.json(); });
  }

  function freeInCart(cart, freeId) {
    return cart.items && cart.items.some(function (item) {
      return String(item.product_id) === String(freeId);
    });
  }

  function getFreeProductLineItem(cart, freeId) {
    if (!cart.items) return null;
    for (var i = 0; i < cart.items.length; i++) {
      if (String(cart.items[i].product_id) === String(freeId)) {
        return cart.items[i];
      }
    }
    return null;
  }

  /** Cart total in cents must be >= minimum (config.integer in €, so * 100). */
  function cartTotalMeetsMinimum(cart, minEuro) {
    var minCents = (parseInt(minEuro, 10) || 0) * 100;
    return cart.total_price >= minCents;
  }

  function updateOfferUi(show, config) {
    const el = document.getElementById(OFFER_ID);
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
  }

  function addFreeProduct(variantId) {
    const id = parseInt(String(variantId), 10);
    if (!id) return Promise.reject(new Error('Invalid variant id'));
    const addUrl = (window.KROWN && window.KROWN.settings && window.KROWN.settings.routes && window.KROWN.settings.routes.cart_add_url) || '/cart/add';
    const body = JSON.stringify({
      items: [{ id: id, quantity: 1 }]
    });

    return fetch(addUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body
    }).then(function (r) { return r.json(); });
  }

  function removeFreeProduct(cart, freeProductId) {
    var lineItem = getFreeProductLineItem(cart, freeProductId);
    if (!lineItem || !lineItem.key) return Promise.reject(new Error('Free product not in cart'));
    var changeUrl = (window.KROWN && window.KROWN.settings && window.KROWN.settings.routes && window.KROWN.settings.routes.cart_change_url) || '/cart/change';
    var body = JSON.stringify({ id: lineItem.key, quantity: 0 });
    return fetch(changeUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body
    }).then(function (r) { return r.json(); });
  }

  function refreshCart() {
    if (typeof window.refreshCart === 'function') {
      window.refreshCart();
    }
  }

  function run() {
    const config = getConfig();
    if (!isConfigured(config)) return;
    if (autoAddInProgress || autoRemoveInProgress) return;

    fetchCart().then(function (cart) {
      const hasFree = freeInCart(cart, config.free_product_id);
      const meetsMinimum = cartTotalMeetsMinimum(cart, config.integer);
      const show = meetsMinimum && !hasFree;

      if (meetsMinimum && !hasFree) {
        autoAddInProgress = true;
        addFreeProduct(config.free_product_variant_id).then(function (res) {
          if (res.status && (res.status === 422 || res.message)) {
            autoAddInProgress = false;
            updateOfferUi(true, config);
            return;
          }
          refreshCart();
          setTimeout(function () {
            autoAddInProgress = false;
            run();
          }, 600);
        }).catch(function () {
          autoAddInProgress = false;
          updateOfferUi(true, config);
        });
      } else if (!meetsMinimum && hasFree) {
        autoRemoveInProgress = true;
        removeFreeProduct(cart, config.free_product_id).then(function (res) {
          if (res.status && (res.status === 422 || res.message)) {
            autoRemoveInProgress = false;
            return;
          }
          refreshCart();
          setTimeout(function () {
            autoRemoveInProgress = false;
            run();
          }, 600);
        }).catch(function () {
          autoRemoveInProgress = false;
        });
      } else {
        updateOfferUi(show, config);
      }
    }).catch(function () {
      updateOfferUi(false);
    });
  }

  function onAddFreeClick(e) {
    const btn = e.target.closest('[data-js-add-free-product]');
    if (!btn) return;

    const offer = document.getElementById(OFFER_ID);
    if (!offer) return;

    const variantId = offer.getAttribute('data-free-variant-id');
    if (!variantId) return;

    const config = getConfig();
    if (!config || !config.free_product_variant_id) return;

    btn.disabled = true;
    btn.textContent = '…';

    addFreeProduct(variantId).then(function (res) {
      if (res.status && (res.status === 422 || res.message)) {
        btn.disabled = false;
        btn.textContent = 'Kostenlos hinzufügen';
        if (typeof alert !== 'undefined') alert(res.description || res.message);
        return;
      }
      refreshCart();
      setTimeout(run, 600);
      btn.disabled = false;
      btn.textContent = 'Kostenlos hinzufügen';
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Kostenlos hinzufügen';
    });
  }

  function bind() {
    document.removeEventListener('click', onAddFreeClick);
    document.addEventListener('click', onAddFreeClick);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function observeCartForm() {
    var form = document.getElementById('AjaxCartForm');
    if (!form || form._customFreeOfferObserved) return;
    form._customFreeOfferObserved = true;
    var runDebounced = debounce(run, 150);
    var observer = new MutationObserver(function () {
      runDebounced();
    });
    observer.observe(form, { childList: true, subtree: true });
  }

  function init() {
    bind();
    run();
    observeCartForm();

    var form = document.getElementById('AjaxCartForm');
    if (form) {
      form.addEventListener('cart-updated', run);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
