// ==UserScript==
// @name         linkedin
// @namespace    http://tampermonkey.net/
// @version      2025-10-13
// @description  simple client cache to make linkedin not freeze
// @author       You
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=linkedin.com
// @run-at       document-start
// @grant        none
// ==/UserScript==
(() => {
    const WeakRefMap = (() => {
        const _weakRefMap = new Map();
        return class WeakRefMap extends Map {
            get(key) {
                const ref = _weakRefMap.get(key);
                const value = ref?.deref?.();
                if (value === undefined) {
                    _weakRefMap.delete(key);
                }
                return value;
            }
            set(key, value) {
                _weakRefMap.set(key, new WeakRef(value));
                return this;
            }
            delete(key) {
                return _weakRefMap.delete(key);
            }
            has(key) {
                const value = _weakRefMap.get(key)?.deref?.();
                if (value === undefined) {
                    _weakRefMap.delete(key);
                    return false;
                }
                return true;
            }
        }
    })();
    let logged = false;
    let last;
    const fetchCache = new WeakRefMap();
    const _fetch = self.fetch;
    self.fetch = Object.setPrototypeOf(async function fetch(...args) {
        const url = String(args[0]?.url ?? args[0]);
        try {
            const fromCache = fetchCache.get(url);
            if (fromCache) {
                if(url != last){
                    console.log('From cache', url);
                    last = url;
                }
                const res = await fromCache;
                if (!/^[12]\d\d$/.test(response?.status)) {
                    fetchCache.delete(url);
                } else {
                    return res.clone();
                }
            }
            if (url.includes('chrome-extension://')) {
                if (!logged) {
                    console.warn('Blocking fetch of chrome-extension:// urls');
                    logged = true;
                }
                return new Response('{}', { status: 200, statusText: 'OK' });
            }
            const presponse = _fetch.apply(this, args);
            fetchCache.set(url, presponse);
            const response = (await presponse);
            if (!/^[12]\d\d$/.test(response?.status)) {
                fetchCache.delete(url);
            }
            return response.clone();
        } catch (e) {
            fetchCache.delete(url);
            return new Response(e?.stack, {
                status: 500,
                statusText: e?.message
            });
        }
    }, _fetch);
})();
