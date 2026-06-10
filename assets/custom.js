/**
 * Custom free-product offer: show 3 free product choices when cart total
 * >= minimum (custom_integer in €). User chooses which one to add.
 * When cart drops below minimum, free gift is auto-removed.
 */
(function () {
  'use strict';

  const CART_JSON = '/cart.js';
  const OFFER_ID = 'custom-free-product-offer';
  var autoRemoveInProgress = false;

  function getConfig() {
    return window.KROWN && window.KROWN.settings && window.KROWN.settings.custom;
  }

  function isConfigured(config) {
    return config &&
      config.free_products &&
      Array.isArray(config.free_products) &&
      config.free_products.length > 0;
  }

  function fetchCart() {
    return fetch(CART_JSON).then(function (r) { return r.json(); });
  }

  function getFreeVariantIds(config) {
    if (!config || !config.free_products) return [];
    return config.free_products
      .map(function (p) { return String(p.variant_id); })
      .filter(function (id) { return id && id !== 'undefined'; });
  }

  function hasAnyFreeVariantInCart(cart, freeVariantIds) {
    if (!cart.items || !freeVariantIds || freeVariantIds.length === 0) return false;
    return cart.items.some(function (item) {
      return freeVariantIds.indexOf(String(item.variant_id)) !== -1;
    });
  }

  function getFreeVariantLineItemInCart(cart, freeVariantIds) {
    if (!cart.items || !freeVariantIds) return null;
    for (var i = 0; i < cart.items.length; i++) {
      if (freeVariantIds.indexOf(String(cart.items[i].variant_id)) !== -1) {
        return cart.items[i];
      }
    }
    return null;
  }

  function cartTotalMeetsMinimum(cart, minEuro) {
    var minCents = (parseInt(minEuro, 10) || 0) * 100;
    return cart.total_price >= minCents;
  }


  function updateOfferUi(show, config) {
    var el = document.getElementById(OFFER_ID);
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
  }

  function addFreeProduct(variantId) {
    var id = parseInt(String(variantId), 10);
    if (!id) return Promise.reject(new Error('Invalid variant id'));
    var addUrl = (window.KROWN && window.KROWN.settings && window.KROWN.settings.routes && window.KROWN.settings.routes.cart_add_url) || '/cart/add';
    var body = JSON.stringify({
      items: [{ id: id, quantity: 1 }]
    });
    return fetch(addUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body
    }).then(function (r) { return r.json(); });
  }

  function removeFreeProduct(cart, freeVariantIds) {
    var lineItem = getFreeVariantLineItemInCart(cart, freeVariantIds);
    if (!lineItem || !lineItem.key) return Promise.reject(new Error('Free variant not in cart'));
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
    var config = getConfig();
    if (!isConfigured(config)) return;
    if (autoRemoveInProgress) return;

    var freeVariantIds = getFreeVariantIds(config);

    fetchCart().then(function (cart) {
      var hasFreeVariant = hasAnyFreeVariantInCart(cart, freeVariantIds);
      var meetsMinimum = cartTotalMeetsMinimum(cart, config.integer);
      var show = meetsMinimum && !hasFreeVariant;

      if (!meetsMinimum && hasFreeVariant) {
        autoRemoveInProgress = true;
        removeFreeProduct(cart, freeVariantIds).then(function (res) {
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
    var btn = e.target.closest('[data-js-add-free-product]');
    if (!btn) return;

    var variantId = btn.getAttribute('data-free-variant-id');
    if (!variantId) return;

    var config = getConfig();
    if (!config) return;

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
